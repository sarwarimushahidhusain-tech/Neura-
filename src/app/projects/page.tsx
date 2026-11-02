"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, PlayCircle, Clock, Database, Sparkles, Video, ArrowRight } from "lucide-react";
import type { Project } from "@/types";
import { getProjects, PUBLIC_SHOWCASE_PROJECTS } from "@/lib/projects";

const CATEGORIES = ["All", "Science", "Physics", "Biology", "History", "Creative"];
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "score-desc", label: "Highest Score" },
  { value: "score-asc", label: "Lowest Score" },
];

export default function ProjectsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("newest");
  const [projectsList, setProjectsList] = useState<Project[]>(PUBLIC_SHOWCASE_PROJECTS);
  const [isLiveDb, setIsLiveDb] = useState(false);

  useEffect(() => {
    let active = true;
    getProjects().then(({ projects, isLiveDb: live }) => {
      if (active) {
        setProjectsList(projects);
        setIsLiveDb(live);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = projectsList.filter((p) => {
      const matchSearch = p.title.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "All" || p.category === category;
      return matchSearch && matchCat;
    });
    if (sort === "score-desc") list = [...list].sort((a, b) => b.score - a.score);
    if (sort === "score-asc") list = [...list].sort((a, b) => a.score - b.score);
    if (sort === "oldest") list = [...list].reverse();
    return list;
  }, [projectsList, search, category, sort]);

  // CSS placeholders for different subjects
  const renderThumbnail = (project: Project) => {
    if (project.category === "Science") {
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1F080C] to-[#0B101C] flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(239,68,68,0.2),transparent_70%)]" />
          <div className="w-24 h-24 border-2 border-red-500/30 rounded-full animate-pulse" />
          <div className="absolute w-32 h-16 bg-red-600/10 blur-xl" />
        </div>
      );
    }
    if (project.category === "Physics") {
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-[#091528] to-[#0B101C] flex items-center justify-center overflow-hidden">
          <div className="w-40 h-px bg-[#00D4E8]/40 absolute rotate-45" />
          <div className="w-40 h-px bg-[#00D4E8]/40 absolute -rotate-45" />
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full shadow-[0_0_20px_rgba(0,212,232,0.4)]" />
        </div>
      );
    }
    if (project.category === "Biology") {
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-[#061814] to-[#0B101C] flex items-center justify-center overflow-hidden">
          <div className="w-32 h-12 bg-[#00C9B7]/15 rounded-full blur-xl absolute" />
          <div className="w-20 h-20 border border-[#00C9B7]/40 rounded-full" />
        </div>
      );
    }
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-[#180C26] to-[#0B101C] flex items-center justify-center overflow-hidden">
        <div className="w-28 h-28 border border-[#9565F5]/30 rounded-full" />
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050810] text-[#F5F7FC] neura-grid pb-24">
      <div className="container mx-auto px-4 md:px-8 py-10 max-w-7xl relative z-10">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F5F7FC]">
                My Projects
              </h1>
              {isLiveDb ? (
                <Badge variant="outline" className="text-xs border-[#00D4E8]/30 bg-[#00D4E8]/5 text-[#00D4E8] gap-1.5 font-mono">
                  <Database className="w-3 h-3" />
                  <span>Supabase RLS</span>
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs border-[#1B2635] bg-[#0B101C] text-[#9AA8BC] gap-1.5 font-mono">
                  <Sparkles className="w-3 h-3 text-[#00D4E8]" />
                  <span>Showcase Gallery</span>
                </Badge>
              )}
            </div>
            <p className="text-[#9AA8BC] text-sm sm:text-base">
              Your generated visual stories, lessons, and blueprints.
            </p>
          </div>

          <Link href="/create">
            <Button className="bg-gradient-to-r from-[#00D4E8] to-[#00C9B7] hover:opacity-95 text-[#050810] font-semibold text-xs px-5 py-2.5 rounded-full shadow-[0_0_20px_rgba(0,212,232,0.35)] transition-all duration-200 gap-2 flex items-center">
              <Video className="w-3.5 h-3.5" />
              Create New Video
            </Button>
          </Link>
        </div>

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-10 p-4 bg-[#0B101C]/90 rounded-2xl border border-[#1B2635] shadow-[0_4px_30px_rgba(0,0,0,0.4)] backdrop-blur-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9AA8BC] pointer-events-none" />
            <Input
              placeholder="Search projects..."
              className="pl-10 bg-[#101625] border-[#1B2635] text-[#F5F7FC] placeholder:text-[#9AA8BC]/60 focus-visible:border-[#00D4E8] rounded-xl text-xs h-10 transition-colors"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search projects"
            />
          </div>

          <div className="flex gap-3">
            <Select value={category} onValueChange={(v) => setCategory(v || "All")}>
              <SelectTrigger
                className="w-[160px] bg-[#101625] border-[#1B2635] text-xs text-[#F5F7FC] rounded-xl h-10 focus:ring-[#00D4E8]"
                aria-label="Filter by category"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 mr-2 text-[#9AA8BC]" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0B101C] border-[#1B2635] text-[#F5F7FC] text-xs">
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="hover:bg-[#101625] focus:bg-[#101625]">
                    {c === "All" ? "All Categories" : c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(v) => setSort(v || "newest")}>
              <SelectTrigger
                className="w-[160px] bg-[#101625] border-[#1B2635] text-xs text-[#F5F7FC] rounded-xl h-10 focus:ring-[#00D4E8]"
                aria-label="Sort projects"
              >
                <Clock className="w-3.5 h-3.5 mr-2 text-[#9AA8BC]" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0B101C] border-[#1B2635] text-[#F5F7FC] text-xs">
                {SORT_OPTIONS.map(({ value, label }) => (
                  <SelectItem key={value} value={value} className="hover:bg-[#101625] focus:bg-[#101625]">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Project grid */}
        {filtered.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((project) => (
              <div
                key={project.id}
                className="rounded-2xl overflow-hidden group bg-[#0B101C] border border-[#1B2635] hover:border-[#00D4E8]/40 shadow-[0_4px_24px_rgba(0,0,0,0.5)] hover:shadow-[0_0_30px_rgba(0,212,232,0.1)] transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail Area */}
                  <div className="aspect-video relative overflow-hidden bg-[#050810]">
                    {renderThumbnail(project)}

                    <div className="absolute inset-0 bg-black/30 group-hover:bg-black/50 transition-colors duration-300" />

                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="h-12 w-12 rounded-full bg-[#00D4E8]/20 backdrop-blur-md flex items-center justify-center border border-[#00D4E8]/50 shadow-[0_0_20px_rgba(0,212,232,0.5)]">
                        <PlayCircle className="w-7 h-7 text-[#00D4E8] ml-0.5" />
                      </div>
                    </div>

                    <div className="absolute top-3 left-3 flex gap-2">
                      <span className="bg-[#050810]/80 backdrop-blur-md border border-[#1B2635] text-[#F5F7FC] text-[10px] font-mono px-2.5 py-0.5 rounded-full">
                        {project.category}
                      </span>
                      {project.jobStatus === "awaiting_video_provider" && (
                        <span className="border border-amber-500/40 text-amber-300 bg-[#050810]/80 text-[10px] font-mono px-2.5 py-0.5 rounded-full">
                          Awaiting Provider
                        </span>
                      )}
                      {project.jobStatus === "completed" && (
                        <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-mono px-2.5 py-0.5 rounded-full">
                          Ready
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-2.5 right-3">
                      <div className="flex items-center gap-1 text-[10px] font-mono bg-[#050810]/80 px-2 py-0.5 rounded border border-[#1B2635] text-[#00D4E8]">
                        <span>{project.score}</span>
                        <span className="text-[#9AA8BC]">/100</span>
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <h3 className="font-bold text-base line-clamp-1 mb-1.5 group-hover:text-[#00D4E8] transition-colors duration-200 text-[#F5F7FC]">
                      {project.title}
                    </h3>
                    <p className="text-xs text-[#9AA8BC] flex items-center gap-2 mb-4 font-mono">
                      <span>{project.date}</span>
                      <span aria-hidden>·</span>
                      <span className="text-[#9565F5]">{project.model}</span>
                    </p>
                  </div>
                </div>

                <div className="px-5 pb-5 pt-0 flex items-center justify-between border-t border-[#1B2635]/60 mt-auto">
                  <span className="text-[10px] font-mono text-[#9AA8BC] uppercase tracking-wide">
                    {project.style}
                  </span>
                  <Link
                    href="/result"
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        localStorage.setItem("neura_topic", project.title);
                        if (project.masterPrompt) {
                          localStorage.setItem("neura_master_prompt", project.masterPrompt);
                        }
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#00D4E8] hover:text-[#00C9B7] transition-colors py-1 px-2"
                  >
                    View Details <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-28 bg-[#0B101C] border border-[#1B2635] rounded-3xl shadow-sm">
            <p className="text-[#9AA8BC] mb-5 text-base">
              No projects match your criteria.
            </p>
            <Button
              variant="outline"
              className="border-[#1B2635] bg-[#101625] text-xs text-[#F5F7FC] hover:border-[#00D4E8]/40"
              onClick={() => {
                setSearch("");
                setCategory("All");
                setSort("newest");
              }}
            >
              Clear Filters
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}
