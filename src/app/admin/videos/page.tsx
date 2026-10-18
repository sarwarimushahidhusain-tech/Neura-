"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  UploadCloud,
  Film,
  Plus,
  Trash2,
  CheckCircle,
  Shield,
  Eye,
  Edit3,
  X,
  AlertTriangle,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getStoredUser } from "@/lib/auth";
import type {
  LibraryVideo,
  LibraryVideoInput,
  SubjectCategory,
  EducationalLevel,
} from "@/types/library";

const SUBJECTS: SubjectCategory[] = [
  "Physics",
  "Biology",
  "Chemistry",
  "Astronomy",
  "Mathematics",
  "Engineering",
  "Medicine",
  "Computer Science",
  "Earth Science",
  "General Science",
];

const LEVELS: { value: EducationalLevel; label: string }[] = [
  { value: "all_levels", label: "All Levels" },
  { value: "elementary", label: "Elementary" },
  { value: "middle_school", label: "Middle School" },
  { value: "high_school", label: "High School" },
  { value: "undergraduate", label: "Undergraduate" },
];

export default function AdminVideosPage() {
  const [activeTab, setActiveTab] = useState<"list" | "upload">("list");
  const [videos, setVideos] = useState<LibraryVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth state
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState<SubjectCategory>("Physics");
  const [topic, setTopic] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [educationalLevel, setEducationalLevel] = useState<EducationalLevel>("high_school");
  const [durationSeconds, setDurationSeconds] = useState(180);
  const [published, setPublished] = useState(true);

  // File uploads
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState<string | null>(null);

  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Edit / Preview Modal state
  const [previewVideo, setPreviewVideo] = useState<LibraryVideo | null>(null);
  const [editingVideo, setEditingVideo] = useState<LibraryVideo | null>(null);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);

  // Fetch all videos (including unpublished)
  const loadVideos = useCallback(async () => {
    try {
      const res = await fetch("/api/library/videos?include_unpublished=true&limit=50");
      const data = await res.json();
      if (data.success) {
        setVideos(data.videos || []);
      } else {
        setError(data.error || "Failed to fetch library videos.");
      }
    } catch {
      setError("Network error while loading video library.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Verify Admin authorization and load videos on mount
  useEffect(() => {
    let mounted = true;

    async function initAdmin() {
      const user = getStoredUser();
      let userIsAdmin = false;

      try {
        const res = await fetch("/api/library/videos?include_unpublished=true&limit=50");
        if (res.status === 200) {
          userIsAdmin = true;
          const data = await res.json();
          if (mounted && data.success) {
            setVideos(data.videos || []);
          }
        } else if (user && (user.role === "developer" || user.email.includes("admin"))) {
          userIsAdmin = true;
          const data = await res.json().catch(() => ({}));
          if (mounted && data.videos) {
            setVideos(data.videos);
          }
        }
      } catch {
        userIsAdmin = false;
      } finally {
        if (mounted) {
          setIsAdmin(userIsAdmin);
          setCheckingAuth(false);
          setLoading(false);
        }
      }
    }

    initAdmin();
    return () => {
      mounted = false;
    };
  }, []);

  // Handle Video File Selection
  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["video/mp4", "video/webm"].includes(file.type)) {
      setFormError("Only MP4 and WebM videos are supported.");
      return;
    }

    if (file.size > 200 * 1024 * 1024) {
      setFormError("Video exceeds maximum limit of 200MB.");
      return;
    }

    setVideoFile(file);
    setFormError(null);

    // Create object URL for local preview
    const preview = URL.createObjectURL(file);
    setVideoPreviewUrl(preview);

    // Detect duration using temporary video element
    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.src = preview;
    tempVideo.onloadedmetadata = () => {
      if (tempVideo.duration && !isNaN(tempVideo.duration)) {
        setDurationSeconds(Math.round(tempVideo.duration));
      }
    };
  };

  // Handle Thumbnail File Selection
  const handleThumbSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setFormError("Thumbnail must be JPEG, PNG, or WebP.");
      return;
    }

    setThumbnailFile(file);
    setThumbnailPreviewUrl(URL.createObjectURL(file));
  };

  // Upload Video Form Submission
  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!title.trim() || title.length < 3) {
      setFormError("Please enter a valid title (minimum 3 characters).");
      return;
    }
    if (!description.trim() || description.length < 10) {
      setFormError("Please enter a detailed description (minimum 10 characters).");
      return;
    }
    if (!topic.trim()) {
      setFormError("Please enter an educational topic.");
      return;
    }
    if (!videoFile && !editingVideo) {
      setFormError("Please select an MP4 video file to upload.");
      return;
    }

    setSubmitting(true);
    setUploadProgress("Uploading media assets to secure storage...");

    try {
      let finalStoragePath = editingVideo?.storage_path || "";
      let finalVideoUrl = editingVideo?.video_url || "";
      let finalThumbnailUrl = editingVideo?.thumbnail_url || null;

      // 1. Upload video file if provided
      if (videoFile) {
        const vFormData = new FormData();
        vFormData.append("file", videoFile);
        vFormData.append("type", "video");

        const vRes = await fetch("/api/library/upload", {
          method: "POST",
          body: vFormData,
        });
        const vData = await vRes.json();
        if (!vData.success) {
          throw new Error(vData.error || "Failed to upload video file.");
        }
        finalStoragePath = vData.storagePath;
        finalVideoUrl = vData.publicUrl;
      }

      // 2. Upload thumbnail file if provided
      if (thumbnailFile) {
        setUploadProgress("Uploading thumbnail image...");
        const tFormData = new FormData();
        tFormData.append("file", thumbnailFile);
        tFormData.append("type", "thumbnail");

        const tRes = await fetch("/api/library/upload", {
          method: "POST",
          body: tFormData,
        });
        const tData = await tRes.json();
        if (tData.success) {
          finalThumbnailUrl = tData.publicUrl;
        }
      }

      // 3. Save metadata record to database
      setUploadProgress("Saving verified video metadata to library...");
      const parsedTags = tagsInput
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const payload: LibraryVideoInput = {
        title: title.trim(),
        description: description.trim(),
        subject,
        topic: topic.trim(),
        tags: parsedTags,
        thumbnail_url: finalThumbnailUrl,
        storage_path: finalStoragePath,
        video_url: finalVideoUrl,
        duration_seconds: durationSeconds,
        educational_level: educationalLevel,
        published,
      };

      let saveRes;
      if (editingVideo) {
        saveRes = await fetch(`/api/library/videos/${editingVideo.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        saveRes = await fetch("/api/library/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const saveData = await saveRes.json();
      if (!saveData.success) {
        throw new Error(saveData.error || "Failed to save video metadata.");
      }

      setFormSuccess(
        editingVideo
          ? "Video updated successfully!"
          : "Educational video uploaded and published to library!"
      );

      // Reset form
      if (!editingVideo) {
        setTitle("");
        setDescription("");
        setTopic("");
        setTagsInput("");
        setVideoFile(null);
        setVideoPreviewUrl(null);
        setThumbnailFile(null);
        setThumbnailPreviewUrl(null);
      }
      setEditingVideo(null);

      // Reload list
      loadVideos();
      setTimeout(() => {
        setActiveTab("list");
        setFormSuccess(null);
      }, 1500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  };

  // Toggle publish status
  const handleTogglePublish = async (video: LibraryVideo) => {
    try {
      const res = await fetch(`/api/library/videos/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !video.published }),
      });
      const data = await res.json();
      if (data.success) {
        setVideos((prev) =>
          prev.map((v) => (v.id === video.id ? { ...v, published: !video.published } : v))
        );
      }
    } catch {
      alert("Failed to toggle publish status.");
    }
  };

  // Delete video
  const handleDeleteVideo = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this video from the library?")) {
      return;
    }

    try {
      const res = await fetch(`/api/library/videos/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setVideos((prev) => prev.filter((v) => v.id !== id));
      } else {
        alert(data.error || "Failed to delete video.");
      }
    } catch {
      alert("Failed to delete video.");
    }
  };

  // Start editing video
  const handleStartEdit = (v: LibraryVideo) => {
    setEditingVideo(v);
    setTitle(v.title);
    setDescription(v.description);
    setSubject(v.subject);
    setTopic(v.topic);
    setTagsInput((v.tags || []).join(", "));
    setEducationalLevel(v.educational_level);
    setDurationSeconds(v.duration_seconds);
    setPublished(v.published);
    setVideoPreviewUrl(v.video_url);
    setThumbnailPreviewUrl(v.thumbnail_url);
    setActiveTab("upload");
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background text-foreground pt-28 text-center space-y-4">
        <RotateCw className="w-8 h-8 animate-spin mx-auto text-primary" />
        <p className="text-sm text-muted-foreground">Verifying administrative authorization...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background text-foreground pt-28 px-4 max-w-xl mx-auto text-center space-y-6">
        <div className="p-8 rounded-2xl border border-destructive/30 bg-destructive/10 text-destructive space-y-4">
          <Shield className="w-12 h-12 mx-auto text-destructive" />
          <h2 className="text-xl font-bold">Admin Authorization Required</h2>
          <p className="text-xs text-foreground/80 leading-relaxed">
            Only authorized administrators can upload, publish, edit, or delete library videos. Standard student accounts
            do not hold administrative access privileges.
          </p>
          <div className="pt-2">
            <Link href="/login">
              <Button variant="default" size="sm" className="text-xs bg-primary text-primary-foreground">
                Sign In with Admin Account
              </Button>
            </Link>
          </div>
        </div>
        <Link href="/library" className="text-xs text-muted-foreground hover:underline inline-block">
          ← Return to Student Library
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 pt-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold border border-primary/20">
            <Shield className="w-3.5 h-3.5" /> Administrator Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Educational Video Management
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Upload, validate, index, and publish high-definition 3D simulations for students worldwide.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={activeTab === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActiveTab("list");
              setEditingVideo(null);
            }}
            className="text-xs gap-1.5"
          >
            <Film className="w-4 h-4" /> All Videos ({videos.length})
          </Button>
          <Button
            variant={activeTab === "upload" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setActiveTab("upload");
              setEditingVideo(null);
            }}
            className="text-xs gap-1.5 bg-primary text-primary-foreground"
          >
            <Plus className="w-4 h-4" /> Upload New Video
          </Button>
        </div>
      </div>

      {/* TAB 1: LIST VIDEOS */}
      {activeTab === "list" && (
        <div className="space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-16 space-y-3">
              <RotateCw className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-xs text-muted-foreground">Loading video records...</p>
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl space-y-3">
              <Film className="w-10 h-10 mx-auto text-muted-foreground/60" />
              <p className="text-sm font-semibold">No videos in the library yet.</p>
              <Button
                size="sm"
                onClick={() => setActiveTab("upload")}
                className="text-xs bg-primary text-primary-foreground"
              >
                Upload First Educational Video
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {videos.map((v) => (
                <Card
                  key={v.id}
                  className="bg-card border-border/70 hover:border-border transition-all p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm"
                >
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-28 aspect-[16/9] relative rounded-lg overflow-hidden bg-slate-900 shrink-0">
                      {v.thumbnail_url ? (
                        <Image
                          src={v.thumbnail_url}
                          alt={v.title}
                          fill
                          sizes="112px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Film className="w-5 h-5 text-primary/50" />
                        </div>
                      )}
                      {v.duration_seconds > 0 && (
                        <span className="absolute bottom-1 right-1 text-[9px] bg-black/80 px-1 rounded font-mono text-white">
                          {Math.floor(v.duration_seconds / 60)}:{(v.duration_seconds % 60).toString().padStart(2, "0")}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">
                          {v.subject}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            v.published
                              ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10"
                              : "border-amber-500/40 text-amber-400 bg-amber-500/10"
                          }`}
                        >
                          {v.published ? "Published" : "Draft / Unpublished"}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground capitalize">
                          {v.educational_level.replace("_", " ")}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-foreground truncate">{v.title}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-1">{v.description}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPreviewVideo(v)}
                      className="text-xs border-border h-8 gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTogglePublish(v)}
                      className={`text-xs h-8 ${
                        v.published ? "text-amber-400 hover:text-amber-300" : "text-emerald-400 hover:text-emerald-300"
                      }`}
                    >
                      {v.published ? "Unpublish" : "Publish"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStartEdit(v)}
                      className="text-xs border-border h-8 gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteVideo(v.id)}
                      className="text-xs border-destructive/40 text-destructive hover:bg-destructive/10 h-8"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UPLOAD & METADATA FORM */}
      {activeTab === "upload" && (
        <Card className="bg-card border-border p-6 rounded-2xl max-w-3xl mx-auto shadow-lg">
          <CardContent className="p-0 space-y-6">
            <div className="border-b border-border/60 pb-3">
              <h2 className="text-lg font-bold text-foreground">
                {editingVideo ? "Edit Video Metadata" : "Upload Educational 3D Video"}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Ensure MP4 files are optimized with H.264 / AAC for progressive web streaming.
              </p>
            </div>

            {formError && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p>{formError}</p>
              </div>
            )}

            {formSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <p>{formSuccess}</p>
              </div>
            )}

            <form onSubmit={handleSubmitUpload} className="space-y-6">
              {/* Video File Picker */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                  Video File (MP4 or WebM — Max 200MB) *
                </label>
                <input
                  type="file"
                  ref={videoInputRef}
                  accept="video/mp4,video/webm"
                  onChange={handleVideoSelect}
                  className="hidden"
                />

                <div
                  onClick={() => videoInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-2xl p-6 text-center cursor-pointer bg-background/50 space-y-2"
                >
                  <UploadCloud className="w-8 h-8 mx-auto text-primary" />
                  <p className="text-xs font-medium text-foreground">
                    {videoFile ? videoFile.name : editingVideo ? "Change video file (optional)" : "Click to select MP4 video file"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {videoFile
                      ? `${(videoFile.size / (1024 * 1024)).toFixed(1)} MB`
                      : "Binary validation will inspect MP4 ftyp box on server."}
                  </p>
                </div>

                {videoPreviewUrl && (
                  <div className="mt-3 aspect-[16/9] max-w-md mx-auto rounded-xl overflow-hidden bg-black border border-border">
                    <video src={videoPreviewUrl} controls className="w-full h-full object-contain" />
                  </div>
                )}
              </div>

              {/* Title & Topic */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Video Title *</label>
                  <Input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Newton's Laws of Motion"
                    className="bg-background border-border text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Core Educational Topic *</label>
                  <Input
                    type="text"
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Classical Mechanics"
                    className="bg-background border-border text-xs"
                  />
                </div>
              </div>

              {/* Subject & Educational Level */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Subject *</label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value as SubjectCategory)}
                    className="w-full bg-background border border-border rounded-lg text-xs px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Educational Level *</label>
                  <select
                    value={educationalLevel}
                    onChange={(e) => setEducationalLevel(e.target.value as EducationalLevel)}
                    className="w-full bg-background border border-border rounded-lg text-xs px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {LEVELS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Educational Description *</label>
                <Textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain the simulation, principles demonstrated, and key learning concepts..."
                  className="bg-background border-border text-xs leading-relaxed"
                />
              </div>

              {/* Tags & Duration */}
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Search Tags (comma separated)</label>
                  <Input
                    type="text"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    placeholder="physics, motion, inertia, force"
                    className="bg-background border-border text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Duration (Seconds) *</label>
                  <Input
                    type="number"
                    min={0}
                    max={7200}
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(parseInt(e.target.value, 10) || 0)}
                    className="bg-background border-border text-xs"
                  />
                </div>
              </div>

              {/* Thumbnail Image */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Thumbnail Image (Optional)</label>
                <input
                  type="file"
                  ref={thumbInputRef}
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleThumbSelect}
                  className="hidden"
                />

                <div className="flex items-center gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => thumbInputRef.current?.click()}
                    className="text-xs border-border"
                  >
                    Select Thumbnail
                  </Button>
                  {thumbnailFile && (
                    <span className="text-xs text-muted-foreground">{thumbnailFile.name}</span>
                  )}
                </div>

                {thumbnailPreviewUrl && (
                  <div className="w-36 aspect-[16/9] relative rounded-lg overflow-hidden border border-border mt-2">
                    <Image
                      src={thumbnailPreviewUrl}
                      alt="Thumbnail preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
              </div>

              {/* Publish Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="publishToggle"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary w-4 h-4"
                />
                <label htmlFor="publishToggle" className="text-xs font-medium text-foreground cursor-pointer">
                  Publish immediately (available in student search library)
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setActiveTab("list");
                    setEditingVideo(null);
                  }}
                  className="text-xs border-border"
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-6 shadow-md"
                >
                  {submitting
                    ? uploadProgress || "Processing..."
                    : editingVideo
                    ? "Save Changes"
                    : "Upload & Save Video"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="text-base font-bold text-foreground truncate">{previewVideo.title}</h3>
              <button
                type="button"
                onClick={() => setPreviewVideo(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="aspect-[16/9] rounded-xl overflow-hidden bg-black border border-border">
              <video
                src={previewVideo.video_url}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>

            <div className="space-y-2 text-xs text-muted-foreground">
              <p>
                <strong className="text-foreground">Subject:</strong> {previewVideo.subject} •{" "}
                <strong className="text-foreground">Topic:</strong> {previewVideo.topic} •{" "}
                <strong className="text-foreground">Level:</strong> {previewVideo.educational_level}
              </p>
              <p className="line-clamp-2">{previewVideo.description}</p>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewVideo(null)}
                className="text-xs border-border"
              >
                Close Preview
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
