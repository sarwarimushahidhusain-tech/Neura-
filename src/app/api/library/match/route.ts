/**
 * NEURA PHASE 4 — LIBRARY MATCH API
 * POST /api/library/match
 *
 * Accepts a topic + masterPrompt, extracts keywords, and finds the best-matching
 * pre-uploaded educational video from the library (Supabase or in-memory seed).
 *
 * Response shape:
 *   { success: true, matched: true,  video: LibraryVideo, score: number }
 *   { success: true, matched: false, topAlternatives: LibraryVideo[] }
 */

import { NextRequest, NextResponse } from "next/server";
import { searchVideos, SEED_LIBRARY_VIDEOS, calculateRelevanceScore } from "@/lib/library/service";
import { LIBRARY_CONFIG } from "@/lib/library/config";

export const dynamic = "force-dynamic";

/** Minimum relevance score to consider a match "good enough" to auto-play */
const MATCH_THRESHOLD = LIBRARY_CONFIG.MATCH_THRESHOLD;

/**
 * Extract meaningful keywords from a free-form topic / master-prompt string.
 * Strips stop-words, punctuation, and short tokens.
 */
function extractKeywords(text: string): string[] {
  const STOP_WORDS = new Set([
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "shall", "can", "this", "that", "these",
    "those", "it", "its", "as", "into", "through", "over", "under", "about",
    "show", "create", "generate", "visualize", "render", "using", "within",
    "use", "make", "inside", "outside", "cinematic", "educational", "video",
    "3d", "scientific", "accurate", "realistic", "high", "quality", "style",
    "dark", "light", "smooth", "camera", "motion", "animation", "background",
    "text", "no", "without", "clear", "detail", "detailed", "fully", "very",
    "also", "well", "focus", "including", "such", "each", "while", "during",
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !STOP_WORDS.has(w))
    .slice(0, 25); // cap at 25 keywords
}

export async function POST(req: NextRequest) {
  try {
    let body: { topic?: string; masterPrompt?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid JSON body.", code: "INVALID_BODY" },
        { status: 400 }
      );
    }

    const { topic = "", masterPrompt = "" } = body;

    if (!topic && !masterPrompt) {
      return NextResponse.json(
        { success: false, error: "topic or masterPrompt is required.", code: "MISSING_QUERY" },
        { status: 400 }
      );
    }

    // Combine topic + prompt for richer keyword extraction
    const combinedText = `${topic} ${masterPrompt}`;
    const keywords = extractKeywords(combinedText);

    // Primary: try the searchVideos service (Supabase or seed fallback)
    let candidates = SEED_LIBRARY_VIDEOS.filter((v) => v.published);

    // Try Supabase-backed search if available
    try {
      const result = await searchVideos(
        { query: topic, sort: "relevance", page: 1, limit: 20 },
        false
      );
      if (result.videos && result.videos.length > 0) {
        candidates = result.videos;
      } else {
        // Fall back to all published library videos from the database before reverting to seed catalog
        const allResult = await searchVideos({ limit: 50, sort: "relevance" }, false);
        if (allResult.videos && allResult.videos.length > 0) {
          candidates = allResult.videos;
        }
      }
    } catch {
      // Fall back to in-memory seed — already set above
    }

    // Score each candidate against our extracted keywords
    const scored = candidates
      .map((video) => ({
        video,
        score: calculateRelevanceScore(video, keywords),
      }))
      .sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      return NextResponse.json({
        success: true,
        matched: false,
        topAlternatives: [],
        keywords,
      });
    }

    const best = scored[0];

    if (best.score >= MATCH_THRESHOLD) {
      return NextResponse.json({
        success: true,
        matched: true,
        video: best.video,
        score: best.score,
        keywords,
      });
    }

    // No strong match — return top 3 alternatives for "Explore Similar" UI
    const topAlternatives = scored.slice(0, 3).map((s) => s.video);

    return NextResponse.json({
      success: true,
      matched: false,
      topAlternatives,
      keywords,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Library match failed.";
    return NextResponse.json(
      { success: false, error: msg, code: "MATCH_FAILED" },
      { status: 500 }
    );
  }
}
