"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, PlaySquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MAX_CHARS = 1000;

const SUGGESTIONS = [
  { label: "Cinematic camera", id: "cinematic" },
  { label: "Realistic lighting", id: "lighting" },
  { label: "Scientific accuracy", id: "scientific" },
  { label: "Smooth motion", id: "motion" },
  { label: "High detail anatomy", id: "anatomy" },
  { label: "Educational clarity", id: "educational" },
];

export default function CreatePage() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("cinematic");
  const [ratio, setRatio] = useState("16:9");
  const [duration, setDuration] = useState("10");
  const [audience, setAudience] = useState("college");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeChips, setActiveChips] = useState<string[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [focusAnimStep, setFocusAnimStep] = useState(-1);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("neura_topic");
      if (saved) {
        setTimeout(() => setTopic(saved), 0);
        localStorage.removeItem("neura_topic");
      }
    }
  }, []);

  useEffect(() => {
    if (isFocused) {
      setTimeout(() => setFocusAnimStep(0), 0);
      const t1 = setTimeout(() => setFocusAnimStep(1), 600);
      const t2 = setTimeout(() => setFocusAnimStep(2), 1200);
      const t3 = setTimeout(() => setFocusAnimStep(3), 1800);
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    } else {
      setTimeout(() => setFocusAnimStep(-1), 0);
    }
  }, [isFocused]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;
    setIsGenerating(true);
    if (typeof window !== "undefined") {
      localStorage.setItem("neura_topic", topic);
    }
    setTimeout(() => {
      router.push("/generate");
    }, 1200);
  };

  const toggleChip = (id: string) => {
    setActiveChips((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const getCharColor = () => {
    const pct = topic.length / MAX_CHARS;
    if (pct > 0.9) return "text-destructive";
    if (pct > 0.75) return "text-amber-500";
    return "text-muted-foreground";
  };

  return (
    <div className="container mx-auto px-4 py-8 lg:py-12 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500 bg-background">
      
      {/* Aurora */}
      <div className="aurora-bg" />
      
      <div className="mb-10 text-center relative z-10">
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4 text-foreground">
          Create Visual Story
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
          Describe your idea in plain language. Neura will plan the scenes and generate the video.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8 relative z-10">
        {/* LEFT: FORM */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-6">
          <Card className="bg-card shadow-sm border-border">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                
                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <Label htmlFor="topic" className="text-base font-semibold text-foreground">
                      What do you want to explain?
                    </Label>
                    <span className={`text-xs font-mono transition-colors ${getCharColor()}`}>
                      {topic.length} / {MAX_CHARS}
                    </span>
                  </div>
                  
                  <div className={`relative rounded-xl border transition-all duration-300 ${isFocused ? 'border-primary ring-1 ring-primary/20 shadow-[0_0_15px_rgba(79,70,229,0.1)]' : 'border-input bg-background/50 hover:border-border/80'}`}>
                    <Textarea
                      id="topic"
                      placeholder="e.g. Explain how the human heart pumps blood through the body..."
                      className="min-h-[160px] resize-none border-0 bg-transparent text-base focus-visible:ring-0 p-5"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value.slice(0, MAX_CHARS))}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      required
                    />
                  </div>

                  {/* Suggestion Chips */}
                  <div className="pt-2">
                    <div className="text-xs text-muted-foreground mb-3 font-medium">
                      Enhance your prompt (optional)
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTIONS.map((chip) => {
                        const isActive = activeChips.includes(chip.id);
                        return (
                          <button
                            key={chip.id}
                            type="button"
                            onClick={() => toggleChip(chip.id)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 border ${
                              isActive 
                                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:bg-primary/5"
                            }`}
                          >
                            {chip.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Style</Label>
                    <Select value={style} onValueChange={(v) => setStyle(v || "cinematic")}>
                      <SelectTrigger className="bg-background/50 border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cinematic">3D Cinematic</SelectItem>
                        <SelectItem value="educational">Educational</SelectItem>
                        <SelectItem value="stylized">Stylized</SelectItem>
                        <SelectItem value="realistic">Realistic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Ratio</Label>
                    <Select value={ratio} onValueChange={(v) => setRatio(v || "16:9")}>
                      <SelectTrigger className="bg-background/50 border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="16:9">16:9 Landscape</SelectItem>
                        <SelectItem value="9:16">9:16 Portrait</SelectItem>
                        <SelectItem value="1:1">1:1 Square</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Duration</Label>
                    <Select value={duration} onValueChange={(v) => setDuration(v || "10")}>
                      <SelectTrigger className="bg-background/50 border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 seconds</SelectItem>
                        <SelectItem value="10">10 seconds</SelectItem>
                        <SelectItem value="15">15 seconds</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Audience</Label>
                    <Select value={audience} onValueChange={(v) => setAudience(v || "college")}>
                      <SelectTrigger className="bg-background/50 border-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kids">Kids</SelectItem>
                        <SelectItem value="highschool">High School</SelectItem>
                        <SelectItem value="college">College</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={!topic.trim() || isGenerating}
                  className="w-full h-14 text-base font-medium bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:-translate-y-0.5 transition-all duration-200 relative overflow-hidden"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Initializing Pipeline...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-5 w-5" />
                      Generate Video
                    </>
                  )}
                  {/* Neura Signal on Button Hover */}
                  <div className="absolute inset-0 w-full h-full opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <div className="neura-signal w-full h-full absolute top-0 left-0" />
                  </div>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: LIVE PREVIEW & PIPELINE VISUALIZATION */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
          
          {/* Active Pipeline visualization when focused */}
          <Card className={`border transition-all duration-500 overflow-hidden ${isFocused ? 'bg-primary/5 border-primary/30 shadow-[0_0_20px_rgba(79,70,229,0.1)]' : 'bg-card border-border'}`}>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${isFocused ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />
                <div className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">
                  {isFocused ? <span className="text-primary">Neura is listening</span> : "Ready"}
                </div>
              </div>
              
              <div className="space-y-4">
                {[
                  { label: "Idea", active: focusAnimStep >= 0 },
                  { label: "Scene structure", active: focusAnimStep >= 1 },
                  { label: "Visual language", active: focusAnimStep >= 2 },
                  { label: "Master Prompt", active: focusAnimStep >= 3 },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className={`w-1 h-1 rounded-full transition-all duration-500 ${step.active ? 'bg-primary scale-150' : 'bg-border'}`} />
                    <div className={`text-sm transition-colors duration-500 ${step.active ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {step.label}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Aspect Ratio Preview */}
          <Card className="bg-card border-border flex-1 flex flex-col overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border bg-background/50">
              <div className="text-xs font-semibold text-foreground uppercase tracking-widest flex items-center gap-2">
                <PlaySquare className="w-4 h-4 text-primary" />
                Generation Preview
              </div>
            </div>
            
            <CardContent className="p-6 flex-1 flex flex-col items-center justify-center bg-background/20 relative min-h-[250px]">
              
              <div 
                className="absolute neura-grid-light inset-0 opacity-40 z-0" 
                style={{
                  backgroundPosition: 'center',
                }}
              />
              
              <div className="relative z-10 w-full flex items-center justify-center h-full">
                {/* Shape that changes based on ratio */}
                <div 
                  className={`
                    border border-primary/20 bg-primary/5 rounded-lg shadow-sm
                    flex flex-col items-center justify-center gap-2
                    transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]
                    relative overflow-hidden
                  `}
                  style={{
                    width: ratio === "16:9" ? "100%" : ratio === "9:16" ? "40%" : "65%",
                    aspectRatio: ratio === "16:9" ? "16/9" : ratio === "9:16" ? "9/16" : "1/1",
                    maxWidth: "280px"
                  }}
                >
                  {/* Subtle aurora flow inside the preview box */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-primary/5 to-transparent animate-pulse opacity-50" />
                  
                  <Badge variant="outline" className="bg-background/80 backdrop-blur-sm border-border text-xs relative z-10 font-mono">
                    {ratio}
                  </Badge>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest relative z-10">
                    {style}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
          
        </div>
      </div>
    </div>
  );
}
