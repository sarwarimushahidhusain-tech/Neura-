/**
 * NEURA PHASE 5 — VIDEO LIBRARY SERVICE
 * Database-backed search, retrieval, relevance scoring, and administration.
 * Persistent metadata stored in Supabase `library_videos` table.
 */

import { createClient as createServerSupabase, createAdminClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  LibraryVideo,
  LibraryVideoInput,
  LibrarySearchParams,
  LibrarySearchResult,
  SubjectCategory,
} from "@/types/library";
import { validateVideoMetadata } from "./validation";

// ---------------------------------------------------------------------------
// Verified Curated Educational Metadata Catalog
// Seed records use authorized streaming endpoints: /api/library/stream?id=...
// ---------------------------------------------------------------------------
export const SEED_LIBRARY_VIDEOS: LibraryVideo[] = [
  {
    id: "e1000000-0000-0000-0000-000000000001",
    title: "Newton's Laws of Motion: Inertia, Force & Acceleration",
    description: "An immersive 3D simulation exploring Sir Isaac Newton's three fundamental laws of classical mechanics, showcasing forces, friction, and reciprocal momentum with interactive physical vectors.",
    subject: "Physics",
    topic: "Newton's Laws of Motion",
    tags: ["physics", "classical mechanics", "newton", "inertia", "force", "gravity", "vectors", "motion"],
    thumbnail_url: "https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=800&q=80",
    storage_path: "educational-videos/demo/newtons-laws-3d.mp4",
    video_url: "/api/library/stream?id=e1000000-0000-0000-0000-000000000001",
    duration_seconds: 180,
    educational_level: "high_school",
    published: true,
    views_count: 1420,
    created_by: null,
    created_at: "2026-03-01T10:00:00Z",
    updated_at: "2026-03-01T10:00:00Z",
  },
  {
    id: "e1000000-0000-0000-0000-000000000002",
    title: "Solar System 3D Animation: Planetary Orbits & Gravitation",
    description: "A scale-calibrated 3D visual journey through our solar system, demonstrating Kepler's laws of planetary motion, gravitational equilibrium, and the orbital mechanics of terrestrial and gas giant planets.",
    subject: "Astronomy",
    topic: "Solar System & Planetary Motion",
    tags: ["astronomy", "solar system", "planets", "gravity", "orbits", "kepler", "space", "sun"],
    thumbnail_url: "https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?auto=format&fit=crop&w=800&q=80",
    storage_path: "educational-videos/demo/solar-system-3d.mp4",
    video_url: "/api/library/stream?id=e1000000-0000-0000-0000-000000000002",
    duration_seconds: 240,
    educational_level: "middle_school",
    published: true,
    views_count: 2840,
    created_by: null,
    created_at: "2026-03-05T12:00:00Z",
    updated_at: "2026-03-05T12:00:00Z",
  },
  {
    id: "e1000000-0000-0000-0000-000000000003",
    title: "Human Heart Blood Circulation: Cardiac Cycle & Valves",
    description: "Step inside the 4-chambered human heart in high-fidelity 3D. Follow oxygenated and deoxygenated blood pathways through atria, ventricles, aorta, and coronary arteries with cross-sectional valve dynamics.",
    subject: "Medicine",
    topic: "Human Heart Blood Circulation",
    tags: ["biology", "medicine", "cardiology", "heart", "circulation", "anatomy", "blood", "valves"],
    thumbnail_url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=800&q=80",
    storage_path: "educational-videos/demo/human-heart-flow-3d.mp4",
    video_url: "/api/library/stream?id=e1000000-0000-0000-0000-000000000003",
    duration_seconds: 210,
    educational_level: "high_school",
    published: true,
    views_count: 3510,
    created_by: null,
    created_at: "2026-03-10T08:30:00Z",
    updated_at: "2026-03-10T08:30:00Z",
  },
  {
    id: "e1000000-0000-0000-0000-000000000004",
    title: "Photosynthesis: Light Reactions & Calvin Cycle in 3D",
    description: "Explore the inner machinery of the chloroplast. Witness chlorophyll photon absorption, photolysis of water in Photosystem II, ATP synthesis, and enzymatic carbon fixation in the stroma.",
    subject: "Biology",
    topic: "Photosynthesis & Cellular Energy",
    tags: ["biology", "photosynthesis", "chloroplast", "calvin cycle", "cell biology", "plant science"],
    thumbnail_url: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?auto=format&fit=crop&w=800&q=80",
    storage_path: "educational-videos/demo/photosynthesis-3d.mp4",
    video_url: "/api/library/stream?id=e1000000-0000-0000-0000-000000000004",
    duration_seconds: 195,
    educational_level: "undergraduate",
    published: true,
    views_count: 1890,
    created_by: null,
    created_at: "2026-03-15T14:15:00Z",
    updated_at: "2026-03-15T14:15:00Z",
  },
  {
    id: "e1000000-0000-0000-0000-000000000005",
    title: "Structure of an Atom: Quantum Orbitals & Subatomic Particles",
    description: "A microscopic 3D journey into atomic anatomy: protons, neutrons, quarks in the dense nucleus, and electron probability clouds described by quantum mechanical orbitals (s, p, d, f).",
    subject: "Chemistry",
    topic: "Structure of an Atom",
    tags: ["chemistry", "quantum mechanics", "atom", "electrons", "protons", "orbitals", "nucleus"],
    thumbnail_url: "https://images.unsplash.com/photo-1507668077129-56e32842fceb?auto=format&fit=crop&w=800&q=80",
    storage_path: "educational-videos/demo/atom-structure-3d.mp4",
    video_url: "/api/library/stream?id=e1000000-0000-0000-0000-000000000005",
    duration_seconds: 165,
    educational_level: "high_school",
    published: true,
    views_count: 2130,
    created_by: null,
    created_at: "2026-03-20T09:45:00Z",
    updated_at: "2026-03-20T09:45:00Z",
  },
  {
    id: "e1000000-0000-0000-0000-000000000006",
    title: "Electric Circuits: Voltage, Current, Resistance & Ohm's Law",
    description: "Visualizing electron flow through conductors, resistors, and capacitors in 3D. Learn how potential difference drives current, and how series vs. parallel circuits partition electric potential.",
    subject: "Physics",
    topic: "Electric Circuits & Ohm's Law",
    tags: ["physics", "circuits", "electronics", "electricity", "ohms law", "voltage", "current", "resistors"],
    thumbnail_url: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    storage_path: "educational-videos/demo/electric-circuits-3d.mp4",
    video_url: "/api/library/stream?id=e1000000-0000-0000-0000-000000000006",
    duration_seconds: 175,
    educational_level: "middle_school",
    published: true,
    views_count: 1675,
    created_by: null,
    created_at: "2026-03-25T11:20:00Z",
    updated_at: "2026-03-25T11:20:00Z",
  },
  // Sample unpublished draft video (for testing admin shielding)
  {
    id: "e1000000-0000-0000-0000-000000000099",
    title: "Quantum Entanglement & Bell State Teleportation (Draft)",
    description: "Early unreleased draft animation depicting spin-entangled photon pairs across spacetime intervals. Under pedagogical peer review.",
    subject: "Physics",
    topic: "Quantum Entanglement",
    tags: ["physics", "quantum", "entanglement", "qubits", "optics"],
    thumbnail_url: "https://images.unsplash.com/photo-1635070041078-e363dbe005cb?auto=format&fit=crop&w=800&q=80",
    storage_path: "educational-videos/demo/draft-quantum-entanglement.mp4",
    video_url: "/api/library/stream?id=e1000000-0000-0000-0000-000000000099",
    duration_seconds: 300,
    educational_level: "undergraduate",
    published: false,
    views_count: 12,
    created_by: null,
    created_at: "2026-04-01T08:00:00Z",
    updated_at: "2026-04-01T08:00:00Z",
  },
];

/**
 * Calculates relevance score for ranking.
 * Exact title/topic match gets top priority, followed by word matches in title,
 * topic, tags, and description.
 */
export function calculateRelevanceScore(video: LibraryVideo, queryTerms: string[]): number {
  if (queryTerms.length === 0) return 1;

  let score = 0;
  const fullQuery = queryTerms.join(" ").toLowerCase();
  const lowerTitle = video.title.toLowerCase();
  const lowerTopic = video.topic.toLowerCase();
  const lowerDesc = video.description.toLowerCase();
  const lowerSubject = video.subject.toLowerCase();
  const lowerTags = video.tags.map((t) => t.toLowerCase());

  // 1. Exact phrase matches (highest boost)
  if (lowerTitle === fullQuery || lowerTopic === fullQuery) {
    score += 200;
  } else if (lowerTitle.includes(fullQuery) || lowerTopic.includes(fullQuery)) {
    score += 100;
  }

  // 2. Term matches across metadata fields
  for (const term of queryTerms) {
    if (term.length < 2) continue;

    if (lowerTitle.includes(term)) {
      score += 40;
    }
    if (lowerTopic.includes(term)) {
      score += 35;
    }
    if (lowerSubject.includes(term)) {
      score += 25;
    }
    if (lowerTags.some((t) => t.includes(term))) {
      score += 20;
    }
    if (lowerDesc.includes(term)) {
      score += 10;
    }
  }

  return score;
}

/**
 * Normalizes query string safely into lowercase search tokens.
 * Strips special regex/SQL control characters.
 */
export function normalizeSearchQuery(query?: string): string[] {
  if (!query || typeof query !== "string") return [];
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1);
}

/**
 * Searches the educational video library.
 * Database-backed via Supabase when configured, with catalog fallback.
 */
export async function searchVideos(
  params: LibrarySearchParams = {},
  isAdmin = false
): Promise<LibrarySearchResult> {
  const {
    query = "",
    subject,
    level,
    sort = "relevance",
    page = 1,
    limit = 12,
    includeUnpublished = false,
  } = params;

  const canViewUnpublished = isAdmin && includeUnpublished;
  const queryTerms = normalizeSearchQuery(query);

  // 1. Query Supabase Database if configured
  if (isSupabaseConfigured()) {
    try {
      const adminClient = createAdminClient();
      const supabase = adminClient || (await createServerSupabase());
      if (supabase) {
        let queryBuilder = supabase.from("library_videos").select("*", { count: "exact" });

        // Visibility filter
        if (!canViewUnpublished) {
          queryBuilder = queryBuilder.eq("published", true);
        }

        // Subject filter
        if (subject && subject !== "All") {
          queryBuilder = queryBuilder.eq("subject", subject);
        }

        // Educational level filter
        if (level && level !== "all_levels") {
          queryBuilder = queryBuilder.eq("educational_level", level);
        }

        // Text search
        if (queryTerms.length > 0) {
          const formattedQuery = queryTerms.join(" & ");
          queryBuilder = queryBuilder.textSearch("search_vector", formattedQuery, {
            type: "websearch",
            config: "english",
          });
        }

        // Sorting
        if (sort === "newest") {
          queryBuilder = queryBuilder.order("created_at", { ascending: false });
        } else if (sort === "duration") {
          queryBuilder = queryBuilder.order("duration_seconds", { ascending: false });
        } else {
          queryBuilder = queryBuilder.order("views_count", { ascending: false });
        }

        // Pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        queryBuilder = queryBuilder.range(from, to);

        const { data, count, error } = await queryBuilder;

        if (!error && data) {
          const total = count ?? data.length;
          return {
            videos: data as LibraryVideo[],
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit) || 1,
            query,
            filters: { subject, level, sort },
          };
        }
      }
    } catch {
      // Fall through to catalog search
    }
  }

  // 2. Curated Catalog Search Fallback
  const results = SEED_LIBRARY_VIDEOS.filter((video) => {
    if (!video.published && !canViewUnpublished) {
      return false;
    }
    if (subject && subject !== "All" && video.subject !== subject) {
      return false;
    }
    if (level && level !== "all_levels" && video.educational_level !== level) {
      return false;
    }
    if (queryTerms.length > 0) {
      const score = calculateRelevanceScore(video, queryTerms);
      return score > 0;
    }
    return true;
  });

  // Relevance and Sorting
  if (sort === "relevance" && queryTerms.length > 0) {
    results.sort((a, b) => {
      const scoreA = calculateRelevanceScore(a, queryTerms);
      const scoreB = calculateRelevanceScore(b, queryTerms);
      return scoreB - scoreA;
    });
  } else if (sort === "newest") {
    results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else if (sort === "duration") {
    results.sort((a, b) => b.duration_seconds - a.duration_seconds);
  } else {
    results.sort((a, b) => b.views_count - a.views_count);
  }

  const total = results.length;
  const startIndex = (page - 1) * limit;
  const paginated = results.slice(startIndex, startIndex + limit);

  return {
    videos: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    query,
    filters: { subject, level, sort },
  };
}

/**
 * Retrieves a single video by ID.
 * Shields unpublished videos from regular users.
 */
export async function getVideoById(id: string, isAdmin = false): Promise<LibraryVideo | null> {
  if (isSupabaseConfigured()) {
    try {
      const adminClient = createAdminClient();
      const supabase = adminClient || (await createServerSupabase());
      if (supabase) {
        let q = supabase.from("library_videos").select("*").eq("id", id);
        if (!isAdmin) {
          q = q.eq("published", true);
        }
        const { data, error } = await q.maybeSingle();
        if (!error && data) {
          return data as LibraryVideo;
        }
      }
    } catch {
      // Fall through
    }
  }

  const found = SEED_LIBRARY_VIDEOS.find((v) => v.id === id);
  if (!found) return null;
  if (!found.published && !isAdmin) return null;

  return found;
}

/**
 * Returns related videos matching the same subject or topic.
 */
export async function getRelatedVideos(
  currentId: string,
  subject: SubjectCategory,
  limit = 4
): Promise<LibraryVideo[]> {
  const searchResult = await searchVideos({
    subject,
    limit: limit + 1,
    sort: "newest",
  });

  return searchResult.videos.filter((v) => v.id !== currentId).slice(0, limit);
}

/**
 * Admin action: Creates a new video record in the persistent database.
 * Fails closed if Supabase is unconfigured — never silently drops into in-memory only.
 */
export async function createLibraryVideo(
  input: LibraryVideoInput,
  userId?: string | null
): Promise<LibraryVideo> {
  const validation = validateVideoMetadata(input);
  if (!validation.isValid) {
    const msg = Object.values(validation.errors).join("; ");
    throw new Error(`Video metadata validation failed: ${msg}`);
  }

  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase database connection is unconfigured. Please configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (and SUPABASE_SERVICE_ROLE_KEY) in .env.local to persist library videos."
    );
  }

  const adminClient = createAdminClient();
  const supabase = adminClient || (await createServerSupabase());
  if (!supabase) {
    throw new Error("Database client initialization failed.");
  }

  const videoId = crypto.randomUUID();
  const authorizedPlaybackUrl = `/api/library/stream?id=${videoId}`;

  const insertPayload = {
    id: videoId,
    title: input.title.trim(),
    description: input.description.trim(),
    subject: input.subject,
    topic: input.topic.trim(),
    tags: Array.isArray(input.tags) ? input.tags.map((t) => t.trim().toLowerCase()) : [],
    thumbnail_url: input.thumbnail_url || null,
    storage_path: input.storage_path.trim(),
    video_url: authorizedPlaybackUrl,
    duration_seconds: Number(input.duration_seconds) || 0,
    educational_level: input.educational_level || "all_levels",
    published: Boolean(input.published),
    created_by: userId || null,
  };

  const { data, error } = await supabase
    .from("library_videos")
    .insert(insertPayload)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Database error inserting video record: ${error?.message || "Unknown database failure"}`);
  }

  return data as LibraryVideo;
}

/**
 * Admin action: Registers an already-uploaded Storage object as a library record.
 * Checks for an existing record by storage_path first — returns it without inserting
 * a duplicate if one already exists.  Fails closed if Supabase is unconfigured.
 *
 * The generated video_url always uses the private streaming route so the
 * bucket stays private and no public file URL is ever created.
 */
export async function registerStorageVideo(
  input: LibraryVideoInput,
  userId?: string | null
): Promise<{ video: LibraryVideo; alreadyExisted: boolean }> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase database connection is unconfigured. Please configure credentials in .env.local."
    );
  }

  const adminClient = createAdminClient();
  const supabase = adminClient || (await createServerSupabase());
  if (!supabase) {
    throw new Error("Database client initialization failed.");
  }

  const normalizedPath = input.storage_path.trim();

  // Check for duplicate by storage_path before inserting
  const { data: existing, error: lookupError } = await supabase
    .from("library_videos")
    .select("*")
    .eq("storage_path", normalizedPath)
    .maybeSingle();

  if (lookupError) {
    throw new Error(`Duplicate check failed: ${lookupError.message}`);
  }

  if (existing) {
    return { video: existing as LibraryVideo, alreadyExisted: true };
  }

  // Not a duplicate — create the record via the shared helper
  const video = await createLibraryVideo({ ...input, storage_path: normalizedPath }, userId);
  return { video, alreadyExisted: false };
}

/**
 * Admin action: Updates an existing video in the persistent database.
 * Fails closed if Supabase is unconfigured.
 */
export async function updateLibraryVideo(
  id: string,
  input: Partial<LibraryVideoInput>
): Promise<LibraryVideo | null> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase database connection is unconfigured. Please configure database credentials to update library videos."
    );
  }

  const adminClient = createAdminClient();
  const supabase = adminClient || (await createServerSupabase());
  if (!supabase) {
    throw new Error("Database client initialization failed.");
  }

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.title !== undefined) updatePayload.title = input.title.trim();
  if (input.description !== undefined) updatePayload.description = input.description.trim();
  if (input.subject !== undefined) updatePayload.subject = input.subject;
  if (input.topic !== undefined) updatePayload.topic = input.topic.trim();
  if (input.tags !== undefined) updatePayload.tags = input.tags;
  if (input.thumbnail_url !== undefined) updatePayload.thumbnail_url = input.thumbnail_url;
  if (input.storage_path !== undefined) {
    updatePayload.storage_path = input.storage_path.trim();
    updatePayload.video_url = `/api/library/stream?id=${id}`;
  }
  if (input.duration_seconds !== undefined) updatePayload.duration_seconds = Number(input.duration_seconds);
  if (input.educational_level !== undefined) updatePayload.educational_level = input.educational_level;
  if (input.published !== undefined) updatePayload.published = Boolean(input.published);

  const { data, error } = await supabase
    .from("library_videos")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw new Error(`Database error updating video: ${error.message}`);
  }

  return (data as LibraryVideo) || null;
}

/**
 * Admin action: Deletes a video from the persistent database.
 * Fails closed if Supabase is unconfigured.
 */
export async function deleteLibraryVideo(id: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase database connection is unconfigured. Please configure database credentials to delete library videos."
    );
  }

  const adminClient = createAdminClient();
  const supabase = adminClient || (await createServerSupabase());
  if (!supabase) {
    throw new Error("Database client initialization failed.");
  }

  const { error } = await supabase.from("library_videos").delete().eq("id", id);
  if (error) {
    throw new Error(`Database error deleting video: ${error.message}`);
  }

  return true;
}

/**
 * Increments the view count of a video safely.
 */
export async function incrementVideoViews(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    try {
      const adminClient = createAdminClient();
      const supabase = adminClient || (await createServerSupabase());
      if (supabase) {
        await supabase.rpc("increment_video_views", { video_id: id });
        return;
      }
    } catch {
      // Ignore RPC error if function not created yet
    }
  }

  const item = SEED_LIBRARY_VIDEOS.find((v) => v.id === id);
  if (item) {
    item.views_count += 1;
  }
}
