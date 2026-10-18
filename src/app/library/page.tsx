"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Search,
  Sparkles,
  Filter,
  Clock,
  GraduationCap,
  Play,
  RotateCcw,
  Film,
  BookOpen,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { LibraryVideo, SubjectCategory, EducationalLevel } from "@/types/library";

const SUGGESTED_TOPICS = [
  "Newton's laws of motion",
  "Solar system 3D animation",
  "Human heart blood circulation",
  "Photosynthesis",
  "Structure of an atom",
  "Electric circuits",
];

const SUBJECTS: (SubjectCategory | "All")[] = [
  "All",
  "Physics",
  "Biology",
  "Chemistry",
  "Astronomy",
  "Mathematics",
  "Engineering",
  "Medicine",
];

const LEVELS: { value: EducationalLevel | "all_levels"; label: string }[] = [
  { value: "all_levels", label: "All Levels" },
  { value: "elementary", label: "Elementary" },
  { value: "middle_school", label: "Middle School" },
  { value: "high_school", label: "High School" },
  { value: "undergraduate", label: "Undergraduate" },
];

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatLevelLabel(lvl: string): string {
  switch (lvl) {
    case "middle_school":
      return "Middle School";
    case "high_school":
      return "High School";
    case "undergraduate":
      return "Undergraduate";
    case "elementary":
      return "Elementary";
    default:
      return "All Levels";
  }
}

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const [activeSubject, setActiveSubject] = useState<SubjectCategory | "All">("All");
  const [activeLevel, setActiveLevel] = useState<EducationalLevel | "all_levels">("all_levels");
  const [activeSort, setActiveSort] = useState<"relevance" | "newest" | "duration">("relevance");
  const [page, setPage] = useState(1);

  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [, startTransition] = useTransition();

  // Fetch videos from database-backed API
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (activeSubject !== "All") params.set("subject", activeSubject);
      if (activeLevel !== "all_levels") params.set("level", activeLevel);
      params.set("sort", activeSort);
      params.set("page", page.toString());
      params.set("limit", "12");

      const res = await fetch(`/api/library/videos?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setVideos(data.videos || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      } else {
        setError(data.error || "Unable to load videos.");
      }
    } catch {
      setError("Network error while searching the video library.");
    } finally {
      setLoading(false);
    }
  }, [query, activeSubject, activeLevel, activeSort, page]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchVideos();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchVideos]);

  const handleSelectTopic = (topic: string) => {
    startTransition(() => {
      setQuery(topic);
      setPage(1);
    });
  };

  const handleResetFilters = () => {
    setQuery("");
    setActiveSubject("All");
    setActiveLevel("all_levels");
    setActiveSort("relevance");
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Hero Search Section */}
      <section className="relative pt-24 pb-14 px-4 sm:px-6 lg:px-8 border-b border-border/40 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-medium tracking-wide">
            <Film className="w-3.5 h-3.5" />
            <span>Verified Educational 3D Video Library</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">
            Search 3D Scientific Simulations
          </h1>

          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Watch pre-uploaded, high-definition 3D simulations and educational animations across science,
            medicine, and engineering — instant streaming without AI generation costs.
          </p>

          {/* Search Box */}
          <div className="relative max-w-2xl mx-auto mt-6">
            <div className="relative flex items-center">
              <Search className="absolute left-4 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search topics (e.g. Newton's laws, Human heart, Photosynthesis)..."
                className="pl-12 pr-28 py-6 rounded-2xl bg-card border-border shadow-lg focus-visible:ring-primary text-foreground text-sm sm:text-base"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-12 text-xs text-muted-foreground hover:text-foreground px-2 py-1"
                >
                  Clear
                </button>
              )}
              <Button
                type="button"
                onClick={fetchVideos}
                className="absolute right-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs sm:text-sm shadow-md"
              >
                Search
              </Button>
            </div>
          </div>

          {/* Suggested Topic Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="text-xs text-muted-foreground font-medium flex items-center gap-1 mr-1">
              <Sparkles className="w-3 h-3 text-primary" /> Popular topics:
            </span>
            {SUGGESTED_TOPICS.map((topic) => (
              <button
                key={topic}
                type="button"
                onClick={() => handleSelectTopic(topic)}
                className={`text-xs px-3 py-1 rounded-full border transition-all duration-200 ${
                  query.toLowerCase() === topic.toLowerCase()
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card/70 hover:bg-card border-border/80 text-foreground/80 hover:text-foreground hover:border-primary/40"
                }`}
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Area: Filters & Video Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Controls Bar: Subjects, Level, Sort */}
        <div className="space-y-4 pb-6">
          {/* Subject Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {SUBJECTS.map((sub) => {
              const active = activeSubject === sub;
              return (
                <button
                  key={sub}
                  type="button"
                  onClick={() => {
                    setActiveSubject(sub);
                    setPage(1);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors border ${
                    active
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>

          {/* Level and Sort Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border/40">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5" /> Filters:
              </span>

              {/* Educational Level */}
              <select
                value={activeLevel}
                onChange={(e) => {
                  setActiveLevel(e.target.value as EducationalLevel | "all_levels");
                  setPage(1);
                }}
                className="bg-card border border-border rounded-lg text-xs px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {LEVELS.map((lvl) => (
                  <option key={lvl.value} value={lvl.value}>
                    {lvl.label}
                  </option>
                ))}
              </select>

              {/* Reset filter button if any active */}
              {(query || activeSubject !== "All" || activeLevel !== "all_levels") && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset all
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground">Sort by:</span>
              <select
                value={activeSort}
                onChange={(e) => {
                  setActiveSort(e.target.value as "relevance" | "newest" | "duration");
                  setPage(1);
                }}
                className="bg-card border border-border rounded-lg text-xs px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="relevance">Most Relevant</option>
                <option value="newest">Newest Uploads</option>
                <option value="duration">Longest Duration</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Counter & Cost Disclaimer */}
        <div className="flex items-center justify-between py-2 text-xs text-muted-foreground border-b border-border/30 mb-6">
          <span>
            {loading
              ? "Searching verified educational library..."
              : `Showing ${videos.length} of ${total} verified 3D videos`}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[11px] text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            ✓ Instant streaming — No generation credits required
          </span>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-3 mb-6">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Loading Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border/50 bg-card p-4 space-y-3 animate-pulse"
              >
                <div className="aspect-[16/9] rounded-xl bg-muted" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="h-3 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && videos.length === 0 && (
          <div className="py-20 text-center max-w-md mx-auto space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center mx-auto text-muted-foreground shadow-sm">
              <Film className="w-7 h-7 text-primary/70" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              No matching videos yet. Try another topic or explore related subjects.
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              We only show actual uploaded 3D animations and simulations. Searching does not consume AI video
              generation credits.
            </p>
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={handleResetFilters}
                className="text-xs border-border bg-card hover:bg-muted"
              >
                Clear Filters & Show All
              </Button>
            </div>
          </div>
        )}

        {/* Video Cards Grid */}
        {!loading && videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
              <Card
                key={video.id}
                className="group bg-card border-border/70 hover:border-primary/50 transition-all duration-300 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 flex flex-col"
              >
                {/* Thumbnail & Badges */}
                <div className="aspect-[16/9] relative overflow-hidden bg-slate-950">
                  {video.thumbnail_url ? (
                    <Image
                      src={video.thumbnail_url}
                      alt={video.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-muted-foreground">
                      <Film className="w-10 h-10 text-primary/50" />
                    </div>
                  )}

                  {/* Play Button Overlay */}
                  <Link
                    href={`/library/${video.id}`}
                    className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center"
                    aria-label={`Watch ${video.title}`}
                  >
                    <div className="w-12 h-12 rounded-full bg-primary/90 text-primary-foreground flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Play className="w-5 h-5 ml-0.5 fill-current" />
                    </div>
                  </Link>

                  {/* Duration Badge */}
                  {video.duration_seconds > 0 && (
                    <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm text-[11px] font-mono text-white flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(video.duration_seconds)}</span>
                    </div>
                  )}

                  {/* Subject Badge */}
                  <div className="absolute top-2.5 left-2.5">
                    <Badge variant="secondary" className="text-[11px] font-semibold bg-card/90 backdrop-blur-sm">
                      {video.subject}
                    </Badge>
                  </div>
                </div>

                {/* Content */}
                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <GraduationCap className="w-3.5 h-3.5 text-primary" />
                        {formatLevelLabel(video.educational_level)}
                      </span>
                      <span>•</span>
                      <span>{video.views_count.toLocaleString()} views</span>
                    </div>

                    <h2 className="text-base font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                      <Link href={`/library/${video.id}`}>{video.title}</Link>
                    </h2>

                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {video.description}
                    </p>
                  </div>

                  {/* Tags and CTA */}
                  <div className="space-y-3 pt-1 border-t border-border/40">
                    {video.tags && video.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {video.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[10px] px-2 py-0.5 rounded bg-muted/60 text-muted-foreground"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    <Link href={`/library/${video.id}`} className="block">
                      <Button
                        variant="default"
                        size="sm"
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-xl text-xs gap-1.5 shadow-sm"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Watch Simulation
                        <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-10">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-border text-xs gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </Button>
            <span className="text-xs text-muted-foreground px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="border-border text-xs gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Educational AI Generation Callout (Separated & Explicit) */}
        <div className="mt-16 p-6 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-card flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-sm font-semibold text-foreground flex items-center justify-center sm:justify-start gap-2">
              <BookOpen className="w-4 h-4 text-primary" /> Need a topic not yet in the 3D library?
            </h4>
            <p className="text-xs text-muted-foreground">
              You can plan and generate a custom AI educational video with multi-model rendering in the Studio.
            </p>
          </div>
          <Link href="/create">
            <Button variant="outline" size="sm" className="border-primary/40 hover:bg-primary/10 text-xs shrink-0">
              Open Video Creator Studio →
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
