/**
 * NEURA PHASE 7 — Optional one-off backfill script
 * docs/weak-point/backfill_question_results.ts
 *
 * Run with:
 *   npx tsx --env-file=.env.local docs/weak-point/backfill_question_results.ts
 *
 * What it does:
 *   - Iterates existing quiz_attempts that have an mcq_set_id and non-empty
 *     questions_json / answers_json.
 *   - Uses the TypeScript normalizeTopicSlug() function (same as the live path)
 *     to compute the slug from the free-form mcq_set.topic string.
 *   - Upserts the topic row, then inserts question_results using the
 *     service-role client (bypasses RLS — this is intentional for a one-off
 *     admin script run by the developer).
 *   - preserves attempted_at as answered_at so timeline ordering is correct.
 *   - Skips attempts that already have question_results rows (idempotent).
 *   - Reports counts at the end: backfilled / skipped-no-topic / skipped-bad-data.
 *
 * Prerequisites:
 *   - Phase 7 migration must be applied.
 *   - SUPABASE_SERVICE_ROLE_KEY must be set in .env.local.
 *   - Never run against production.
 */

import { createClient } from "@supabase/supabase-js";
import { normalizeTopicSlug, isValidTopicSlug } from "../../src/lib/topics/taxonomy";

// ---------------------------------------------------------------------------
// Types (mirrors the DB schema)
// ---------------------------------------------------------------------------

interface McqSet {
  id: string;
  topic: string;
  questions_json: McqQuestion[];
  user_id: string;
}

interface McqQuestion {
  id: string;
  correctIndex: number;
  difficulty?: string;
  conceptRef?: string;
}

interface QuizAttempt {
  id: string;
  user_id: string;
  mcq_set_id: string;
  answers_json: { questionId: string; chosenIndex: number }[];
  attempted_at: string;
  mcq_set: McqSet;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log("=== NEURA Phase 7 — Optional Question Results Backfill ===\n");

  // Fetch all attempts that have an mcq_set_id and no existing question_results.
  const { data: attempts, error: fetchErr } = await supabase
    .from("quiz_attempts")
    .select(`
      id, user_id, mcq_set_id, answers_json, attempted_at,
      mcq_set:mcq_sets!quiz_attempts_mcq_set_id_fkey(
        id, topic, questions_json, user_id
      )
    `)
    .not("mcq_set_id", "is", null);

  if (fetchErr) {
    console.error("Failed to fetch quiz_attempts:", fetchErr.message);
    process.exit(1);
  }

  if (!attempts || attempts.length === 0) {
    console.log("No quiz_attempts found. Nothing to backfill.");
    return;
  }

  // Filter out attempts that already have question_results (idempotent).
  const { data: existingResults } = await supabase
    .from("question_results")
    .select("attempt_id");

  const alreadyBackfilled = new Set((existingResults ?? []).map((r: { attempt_id: string }) => r.attempt_id));

  let backfilled = 0;
  let skippedAlreadyDone = 0;
  let skippedBadData = 0;
  let skippedNoSlug = 0;

  for (const rawAttempt of attempts) {
    const attempt = rawAttempt as unknown as QuizAttempt;

    if (alreadyBackfilled.has(attempt.id)) {
      skippedAlreadyDone++;
      continue;
    }

    const mcqSet = attempt.mcq_set;
    if (!mcqSet || !mcqSet.topic || !Array.isArray(mcqSet.questions_json)) {
      skippedBadData++;
      console.warn(`  SKIP attempt ${attempt.id}: missing mcq_set or questions_json`);
      continue;
    }

    // Compute slug using the same TypeScript normalizer as the live path.
    const slug = normalizeTopicSlug(mcqSet.topic);
    if (!isValidTopicSlug(slug)) {
      skippedNoSlug++;
      console.warn(`  SKIP attempt ${attempt.id}: topic "${mcqSet.topic}" → invalid slug "${slug}"`);
      continue;
    }

    // Validate answers_json.
    if (!Array.isArray(attempt.answers_json) || attempt.answers_json.length === 0) {
      skippedBadData++;
      console.warn(`  SKIP attempt ${attempt.id}: empty or invalid answers_json`);
      continue;
    }

    // Upsert topic.
    await supabase
      .from("topics")
      .insert({ name: mcqSet.topic.trim().slice(0, 200), subject: "", slug })
      .throwOnError();

    const { data: topicRow, error: topicErr } = await supabase
      .from("topics")
      .select("id")
      .eq("slug", slug)
      .single();

    if (topicErr || !topicRow) {
      skippedBadData++;
      console.warn(`  SKIP attempt ${attempt.id}: could not resolve topic_id for slug "${slug}"`);
      continue;
    }

    const topicId: string = topicRow.id;

    // Build answer map keyed by questionId.
    const answerMap = new Map(
      attempt.answers_json.map((a) => [a.questionId, a.chosenIndex])
    );

    // Build question_results rows.
    const rows: {
      attempt_id: string;
      user_id: string;
      topic_id: string;
      question_index: number;
      concept_ref: string | null;
      difficulty: string | null;
      is_correct: boolean;
      answered_at: string;
    }[] = [];

    let hasMatchError = false;
    mcqSet.questions_json.forEach((q, index) => {
      const chosenIndex = answerMap.get(q.id);
      if (chosenIndex === undefined) {
        // No answer for this question — skip the question (don't fail the whole attempt).
        return;
      }
      const isCorrect = chosenIndex === q.correctIndex;
      const ALLOWED_DIFFICULTIES = ["easy", "medium", "hard"];
      const difficulty = ALLOWED_DIFFICULTIES.includes(q.difficulty ?? "")
        ? q.difficulty!
        : null;

      rows.push({
        attempt_id: attempt.id,
        user_id: attempt.user_id,
        topic_id: topicId,
        question_index: index,
        concept_ref: q.conceptRef?.trim() ?? null,
        difficulty,
        is_correct: isCorrect,
        // Preserve attempted_at as answered_at to keep timeline ordering correct.
        answered_at: attempt.attempted_at,
      });
    });

    if (hasMatchError || rows.length === 0) {
      skippedBadData++;
      console.warn(`  SKIP attempt ${attempt.id}: no matchable question rows`);
      continue;
    }

    // Insert all rows for this attempt in one batch.
    const { error: insertErr } = await supabase
      .from("question_results")
      .insert(rows)
      .select("id");

    if (insertErr) {
      skippedBadData++;
      console.warn(`  SKIP attempt ${attempt.id}: insert failed — ${insertErr.message}`);
      continue;
    }

    // Back-patch mcq_sets.topic_id if it belongs to this user and is NULL.
    await supabase
      .from("mcq_sets")
      .update({ topic_id: topicId })
      .eq("id", mcqSet.id)
      .eq("user_id", attempt.user_id)
      .is("topic_id", null);

    backfilled++;
    console.log(`  OK   attempt ${attempt.id} → ${rows.length} question_results rows (topic: "${slug}")`);
  }

  console.log(`
=== Backfill Complete ===
  Backfilled:              ${backfilled}
  Skipped (already done):  ${skippedAlreadyDone}
  Skipped (bad data):      ${skippedBadData}
  Skipped (invalid slug):  ${skippedNoSlug}
`);
}

main().catch((err) => {
  console.error("Backfill script failed:", err);
  process.exit(1);
});
