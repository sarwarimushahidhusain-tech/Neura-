"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, SlidersHorizontal, PlayCircle, Clock, Trophy } from "lucide-react";
import type { Project } from "@/types";

const MOCK_PROJECTS: Project[] = [
  {
    id: "p1",
    title: "How the Human Heart Pumps Blood",
    date: "Just now",
    category: "Science",
    style: "3D Cinematic",
    model: "HunyuanVideo",
    score: 91,
  },
  {
    id: "p2",
    title: "Newton's Laws of Motion",
    date: "2 days ago",
    category: "Physics",
    style: "Educational",
    model: "LTX",
    score: 88,
  },
  {
    id: "p3",
    title: "How Photosynthesis Works",
    date: "5 days ago",
    category: "Biology",
    style: "Stylized 3D",
    model: "CogVideoX",
    score: 86,
  },
];

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

  const filtered = useMemo(() => {
    let list = MOCK_PROJECTS.filter((p) => {
      const matchSearch = p.title
        .toLowerCase()
        .includes(search.toLowerCase());
      const matchCat = category === "All" || p.category === category;
      return matchSearch && matchCat;
    });
    if (sort === "score-desc") list = [...list].sort((a, b) => b.score - a.score);
    if (sort === "score-asc") list = [...list].sort((a, b) => a.score - b.score);
    if (sort === "oldest") list = [...list].reverse();
    return list;
  }, [search, category, sort]);

  // CSS placeholders for different subjects
  const renderThumbnail = (project: Project) => {
    if (project.category === "Science") {
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-red-900 to-slate-900 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.2),transparent_70%)]" />
          <div className="w-24 h-24 border-4 border-red-500/30 rounded-full animate-pulse" />
          <div className="absolute w-32 h-16 bg-red-600/20 blur-xl" />
        </div>
      );
    }
    if (project.category === "Physics") {
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-slate-900 flex items-center justify-center overflow-hidden">
          <div className="w-40 h-px bg-indigo-500/50 absolute rotate-45" />
          <div className="w-40 h-px bg-indigo-500/50 absolute -rotate-45" />
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full shadow-[0_0_20px_rgba(99,102,241,0.4)]" />
        </div>
      );
    }
    if (project.category === "Biology") {
      return (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 to-slate-900 flex items-center justify-center overflow-hidden">
          <div className="w-full h-full opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 10px 10px, rgba(16, 185, 129, 0.4) 2px, transparent 0)', backgroundSize: '20px 20px' }} />
          <div className="w-32 h-12 bg-emerald-500/20 rounded-full blur-xl absolute" />
          <div className="w-20 h-20 border-2 border-emerald-400/40 rounded-full" />
        </div>
      );
    }
    // Default creative placeholder
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 to-slate-900 flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[conic-gradient(from_90deg_at_50%_50%,rgba(168,85,247,0.2),rgba(59,130,246,0.2),rgba(168,85,247,0.2))]" />
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl bg-background">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2 text-foreground">My Projects</h1>
          <p className="text-muted-foreground text-lg">Your generated visual stories.</p>
        </div>
        <Link href="/create">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5">
            Create New Video
          </Button>
        </Link>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 p-4 bg-card rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search projects…"
            className="pl-9 bg-muted/50 border-transparent hover:bg-muted focus-visible:bg-background focus-visible:border-primary transition-all duration-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search projects"
          />
        </div>

        <div className="flex gap-3">
          <Select value={category} onValueChange={(v) => setCategory(v || "All")}>
            <SelectTrigger
              className="w-[160px] bg-muted/50 border-transparent hover:bg-muted focus:bg-background transition-all duration-200"
              aria-label="Filter by category"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c === "All" ? "All Categories" : c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => setSort(v || "newest")}>
            <SelectTrigger
              className="w-[160px] bg-muted/50 border-transparent hover:bg-muted focus:bg-background transition-all duration-200"
              aria-label="Sort projects"
            >
              <Clock className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Project grid */}
      {filtered.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((project, i) => (
            <Card
              key={project.id}
              className={`
                overflow-hidden group bg-card border-border shadow-sm
                hover:shadow-xl hover:border-primary/30
                card-lift transition-all duration-300
                animate-in fade-in slide-in-from-bottom-4
              `}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {/* Thumbnail Area */}
              <div className="aspect-video relative overflow-hidden bg-slate-900">
                {/* CSS Placeholder */}
                {renderThumbnail(project)}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors duration-300" />
                
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform scale-95 group-hover:scale-100">
                  <div className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-lg">
                    <PlayCircle className="w-8 h-8 text-white ml-1" />
                  </div>
                </div>

                <div className="absolute top-3 left-3 flex gap-2">
                  <Badge className="bg-black/60 backdrop-blur-md border-white/10 text-white text-[10px] font-medium tracking-wide">
                    {project.category}
                  </Badge>
                </div>

                <div className="absolute bottom-3 right-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono bg-black/70 px-2.5 py-1 rounded-md backdrop-blur-md border border-white/10 shadow-sm">
                    {project.score >= 90 && (
                      <Trophy className="h-3 w-3 text-yellow-400" />
                    )}
                    <span className={project.score >= 90 ? "text-white" : "text-slate-300"}>
                      {project.score}
                    </span>
                    <span className="text-slate-400">/100</span>
                  </div>
                </div>
              </div>

              <CardContent className="p-5">
                <div className="mb-4">
                  <h3 className="font-bold text-lg line-clamp-1 mb-1.5 group-hover:text-primary transition-colors duration-200 text-foreground">
                    {project.title}
                  </h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span>{project.date}</span>
                    <span aria-hidden>·</span>
                    <span className="font-medium">{project.model}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className="border-border text-muted-foreground bg-muted text-[10px] font-medium"
                  >
                    {project.style}
                  </Badge>
                  <Link href="/result">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 text-xs text-primary hover:bg-primary/10 transition-colors duration-200"
                    >
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-32 bg-card border border-border rounded-3xl shadow-sm animate-in fade-in duration-300">
          <p className="text-muted-foreground mb-6 text-lg">
            No projects match your criteria.
          </p>
          <Button
            variant="outline"
            className="border-border hover:bg-muted"
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
  );
}
