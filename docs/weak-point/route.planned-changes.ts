/**
 * NEURA PHASE 7 — Planned changes to PUT and POST /api/ai/mcqs
 * docs/weak-point/route.planned-changes.ts
 *
 * Apply to src/app/api/ai/mcqs/route.ts ONLY after Checkpoint 2 approval.
 *
 * ── POST handler (generate MCQ set): resolve and store topic_id ────────────
 *
 * Current POST handler (line 55):
 *   const { mcqSet } = await generateMcqSet(input);
 *   return NextResponse.json({ success: true, mcqSet, ... });
 *
 * Planned replacement (insert mcq_sets row and resolve topic_id at generation):
 *
 *   import { normalizeTopicSlug, isValidTopicSlug } from "@/lib/topics/taxonomy";
 *   import { createAdminClient } from "@/lib/supabase/server";
 *
 *   const { mcqSet, setId } = await generateMcqSet(input);
 *
 *   // Persist mcq_set row and resolve topic_id in one round-trip.
 *   if (isDbActive && authenticatedUser) {
 *     const adminClient = createAdminClient();
 *     if (adminClient) {
 *       const slug = normalizeTopicSlug(input.topic);
 *       let topicId: string | null = null;
 *
 *       if (isValidTopicSlug(slug)) {
 *         // Upsert the topic.
 *         await adminClient
 *           .from("topics")
 *           .insert({
 *             name: input.topic.trim().slice(0, 200),
 *             subject: (input.plan?.subject ?? "").trim().slice(0, 100),
 *             slug,
 *           })
 *           .throwOnError();                                   // ON CONFLICT DO NOTHING in DB
 *
 *         const { data: topicRow } = await adminClient
 *           .from("topics")
 *           .select("id")
 *           .eq("slug", slug)
 *           .maybeSingle();
 *
 *         topicId = topicRow?.id ?? null;
 *       }
 *
 *       // Insert the mcq_set row (stores server-held questions_json + resolved topic_id).
 *       await adminClient
 *         .from("mcq_sets")
 *         .insert({
 *           id: setId,                          // same UUID as the in-memory key
 *           user_id: authenticatedUser.id,
 *           topic: input.topic,                  // free-form preserved unchanged
 *           topic_id: topicId,                   // resolved FK (null if slug invalid)
 *           difficulty: input.difficulty,
 *           total_questions: mcqSet.totalQuestions,
 *           questions_json: [...],               // full questions with correctIndex (server only)
 *           model_used: getOpenRouterModel(),
 *         })
 *         .throwOnError();
 *     }
 *   }
 *
 *   return NextResponse.json({ success: true, mcqSet, ... });
 *
 *
 * ── PUT handler (submit answers): atomic write via record_quiz_attempt() ────
 *
 * Current persistence block (lines ~121–166):
 *   - Direct INSERT into quiz_attempts.
 *   - No question_results rows.
 *
 * Planned replacement for the "if (isDbActive && user)" block:
 *
 *   import { normalizeTopicSlug, isValidTopicSlug } from "@/lib/topics/taxonomy";
 *   import { buildQuestionResultsPayload } from "@/lib/ai/mcqs";
 *   import { createAdminClient } from "@/lib/supabase/server";
 *
 *   // scoreQuizSubmission now returns ScoredQuizResult (includes .questions).
 *   const result = scoreQuizSubmission(setId, answers);
 *
 *   if (isDbActive && user) {
 *     try {
 *       const adminClient = createAdminClient();
 *
 *       // Resolve mcq_set_id (existing UUID-check logic unchanged).
 *       let validMcqSetId: string | null = null;
 *       // ... (same as current) ...
 *
 *       // Resolve topic from server-held input (never from client body).
 *       const topicName    = (input.topic ?? "General").trim();
 *       const topicSubject = (input.plan?.subject ?? "").trim();
 *       const topicSlug    = normalizeTopicSlug(topicName);
 *
 *       const questionPayload = buildQuestionResultsPayload(
 *         result.questions,
 *         result.correct
 *       );
 *
 *       if (adminClient && isValidTopicSlug(topicSlug)) {
 *         // ── ATOMIC PATH: record_quiz_attempt() RPC ──
 *         const { data: rpcAttemptId, error: rpcError } = await adminClient.rpc(
 *           "record_quiz_attempt",
 *           {
 *             p_user_id:       user.id,
 *             p_mcq_set_id:    validMcqSetId,
 *             p_video_id:      videoId ?? null,
 *             p_topic_slug:    topicSlug,
 *             p_topic_name:    topicName,
 *             p_topic_subject: topicSubject,
 *             p_score:         result.score,
 *             p_total:         result.total,
 *             p_percentage:    result.percentage,
 *             p_answers_json:  answers,
 *             p_questions:     questionPayload,
 *           }
 *         );
 *
 *         if (rpcError) {
 *           if (rpcError.code === "42883" || rpcError.code === "PGRST202") {
 *             // ── LEGACY FALLBACK: function not yet deployed (un-migrated schema) ──
 *             console.warn(
 *               `[PUT /api/ai/mcqs] record_quiz_attempt not found (${rpcError.code}). ` +
 *               "Falling back to legacy direct insert. Apply weak-point migration."
 *             );
 *             // ... direct quiz_attempts INSERT (same as current lines 140–165) ...
 *           } else {
 *             // Any other RPC error: log server-side, still return quiz result to student.
 *             console.error("[PUT /api/ai/mcqs] record_quiz_attempt RPC error:", rpcError);
 *             recordWarning = rpcError.message;
 *           }
 *         } else {
 *           isRecorded = true;
 *           attemptId  = rpcAttemptId as string;
 *         }
 *       } else {
 *         // Admin client unavailable or slug invalid — fall back to legacy insert.
 *         // ... direct quiz_attempts INSERT ...
 *       }
 *     } catch (dbErr) {
 *       // Always log and surface as a warning, never surface to the student.
 *       recordWarning = dbErr instanceof Error ? dbErr.message : "Database error";
 *       console.warn("[PUT /api/ai/mcqs] Failed to record quiz attempt:", recordWarning);
 *     }
 *   }
 *
 *   // API response shape is UNCHANGED — clients receive the same fields.
 *   return NextResponse.json({
 *     success: true,
 *     result: {
 *       score: result.score,
 *       total: result.total,
 *       percentage: result.percentage,
 *       correct: result.correct,
 *       explanations: result.explanations,
 *       correctIndexes: result.correctIndexes,
 *       // .questions is intentionally NOT included (contains correctIndex).
 *     },
 *     recorded: isRecorded,
 *     attemptId,
 *     ...(recordWarning ? { recordWarning } : {}),
 *   });
 */
