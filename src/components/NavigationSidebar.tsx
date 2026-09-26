import { useState } from "react";
import { CURRICULUM, khmerNumber, type Level, type Lesson } from "@/data/curriculum";
import { levelCompletion, type ProgressMap, lessonKey } from "@/lib/progress";
import { cn } from "@/lib/utils";
import { Tip } from "@/components/ui/tooltip";
import { AccountMenu } from "@/components/AccountMenu";
import { GITHUB_REPO_URL, krumathHomeUrl, krumathPricingUrl } from "@/lib/krumathUrls";
import type { AuthUser } from "@/lib/authUser";
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Github,
  Heart,
  Home,
  Timer,
  X,
  Keyboard,
} from "lucide-react";

interface NavigationSidebarProps {
  currentLevelId: number | null;
  currentLessonId: string | null;
  progress: ProgressMap;
  onSelectLesson: (level: Level, lesson: Lesson) => void;
  onGoHome: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  /** Signed-in KruMath account, or null (only reachable in DEV under a hard gate). */
  user: AuthUser | null;
  signInHref: string;
  onSignOut: () => void | Promise<void>;
  signingOut?: boolean;
}

const EXPANDED_WIDTH = 280;
const COLLAPSED_WIDTH = 68;

export function NavigationSidebar({
  currentLevelId,
  currentLessonId,
  progress,
  onSelectLesson,
  onGoHome,
  isCollapsed = false,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  user,
  signInHref,
  onSignOut,
  signingOut = false,
}: NavigationSidebarProps) {
  const [expandedLevels, setExpandedLevels] = useState<Record<number, boolean>>(() => {
    return currentLevelId ? { [currentLevelId]: true } : { 1: true };
  });

  const toggleLevel = (id: number) => {
    setExpandedLevels((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-card border-r border-border text-foreground select-none">
      {/* Header */}
      <div className="p-3.5 border-b border-border/80 bg-card/70 flex items-center justify-between gap-2">
        <Tip label="ទិដ្ឋភាពរួម">
          <button
            onClick={onGoHome}
            className="flex items-center gap-2.5 text-left group transition-all duration-150 rounded-lg p-1 -m-1 hover:bg-secondary/60 cursor-pointer min-w-0"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-transform duration-200 group-hover:scale-105">
              <Keyboard className="size-4.5" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-sm sm:text-base tracking-tight text-foreground truncate">
                Khmer Type Master
              </div>
              <p className="km text-xs sm:text-sm text-muted-foreground truncate">រៀនវាយអក្សរខ្មែរឱ្យជំនាញ</p>
            </div>
          </button>
        </Tip>

        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary lg:hidden cursor-pointer"
            aria-label="បិទម៉ឺនុយ"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {/* Levels list */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2 scrollbar-slim">
        {CURRICULUM.map((level) => {
          const lessonIds = level.lessons.map((l) => l.id);
          const comp = levelCompletion(progress, level.id, lessonIds);
          const isExpanded = Boolean(expandedLevels[level.id]);
          const isCurrentLevel = currentLevelId === level.id;

          return (
            <div
              key={level.id}
              className={cn(
                "rounded-xl border transition-all duration-200 overflow-hidden",
                isCurrentLevel
                  ? "border-primary/40 bg-primary-soft/20"
                  : isExpanded
                    ? "border-border bg-card"
                    : "border-transparent bg-transparent hover:bg-secondary/40 hover:border-border/50",
              )}
            >
              <button
                onClick={() => toggleLevel(level.id)}
                className={cn(
                  "w-full flex items-center justify-between p-2.5 text-left transition-colors duration-150 rounded-lg group cursor-pointer",
                  isExpanded ? "bg-secondary/30" : "hover:bg-secondary/50",
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-1.5">
                  <span
                    className={cn(
                      "km shrink-0 flex items-center justify-center size-8 rounded-lg text-sm font-bold transition-transform duration-200 group-hover:scale-105",
                      comp === 100
                        ? "bg-success/15 text-success border border-success/30"
                        : isCurrentLevel
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-foreground/80 border border-border/60",
                    )}
                  >
                    {comp === 100 ? <CheckCircle2 className="size-4.5" /> : khmerNumber(level.id)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="km text-sm font-semibold text-foreground truncate">
                        {level.badge}
                      </span>
                      {comp > 0 && (
                        <span
                          className={cn(
                            "km text-xs rounded px-1.5 py-0.5 font-semibold transition-colors",
                            comp === 100
                              ? "bg-success/15 text-success"
                              : "bg-primary/10 text-primary",
                          )}
                        >
                          {khmerNumber(comp)}%
                        </span>
                      )}
                    </div>
                    <p className="km text-xs sm:text-sm text-muted-foreground truncate leading-normal mt-0.5">
                      {level.title}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 p-1 text-muted-foreground transition-transform duration-200">
                  <ChevronDown
                    className={cn(
                      "size-4.5 transition-transform duration-200 text-muted-foreground/70 group-hover:text-foreground",
                      isExpanded ? "rotate-0" : "-rotate-90",
                    )}
                  />
                </div>
              </button>

              <div
                className={cn(
                  "grid transition-all duration-200 ease-in-out overflow-hidden",
                  isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <div className="min-h-0">
                  <div className="border-t border-border/40 px-1.5 py-1.5 space-y-1 bg-background/50">
                    {level.lessons.map((lesson, idx) => {
                      const rec = progress[lessonKey(level.id, lesson.id)];
                      const isCompleted = rec?.completed ?? false;
                      const isCurrentLesson = isCurrentLevel && currentLessonId === lesson.id;

                      return (
                        <button
                          key={lesson.id}
                          onClick={() => {
                            onSelectLesson(level, lesson);
                            if (onCloseMobile) onCloseMobile();
                          }}
                          className={cn(
                            "w-full flex items-center justify-between rounded-lg px-2.5 py-2 text-left transition-colors duration-150 cursor-pointer group",
                            isCurrentLesson
                              ? "bg-primary text-primary-foreground font-medium"
                              : isCompleted
                                ? "text-foreground hover:bg-secondary/70"
                                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
                          )}
                        >
                          <div className="flex items-center gap-2.5 min-w-0 pr-1.5">
                            <span
                              className={cn(
                                "size-2 rounded-full shrink-0 transition-transform duration-150",
                                isCurrentLesson
                                  ? "bg-primary-foreground scale-125"
                                  : isCompleted
                                    ? "bg-success"
                                    : "bg-muted-foreground/30 group-hover:bg-muted-foreground/60",
                              )}
                            />
                            <span className="km truncate text-sm">
                              {khmerNumber(idx + 1)}. {lesson.title}
                            </span>
                          </div>

                          <div className="shrink-0 flex items-center gap-1.5 text-xs">
                            {lesson.mode === "exam" && (
                              <span
                                className={cn(
                                  "flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-mono",
                                  isCurrentLesson
                                    ? "bg-white/20 text-white"
                                    : "bg-destructive/10 text-destructive",
                                )}
                              >
                                <Timer className="size-3" />
                                {lesson.timeLimit}s
                              </span>
                            )}
                            {isCompleted && rec && (
                              <span
                                className={cn(
                                  "font-mono font-medium text-xs sm:text-sm",
                                  isCurrentLesson ? "text-primary-foreground/90" : "text-success",
                                )}
                              >
                                {rec.bestWpm} WPM
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer — KruMath Home + account + optional links (spec sections 12-13) */}
      <div className="space-y-2 p-3 border-t border-border/80 bg-card/60">
        <AccountMenu
          variant="sidebar"
          user={user}
          signInHref={signInHref}
          onSignOut={onSignOut}
          signingOut={signingOut}
        />
        <a
          href={krumathHomeUrl()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/80 bg-background/80 py-2.5 text-sm font-medium km text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
        >
          <Home className="size-4" />
          <span>ទំព័រដើម</span>
        </a>
        <div className="grid grid-cols-2 gap-2">
          <a
            href={krumathPricingUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background/80 py-2 text-sm font-medium km text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
          >
            <Heart className="size-3.5 shrink-0" />
            <span>បរិច្ចាគ</span>
          </a>
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-background/80 py-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:bg-secondary hover:text-foreground"
          >
            <Github className="size-3.5 shrink-0" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </div>
  );

  const collapsedRail = (
    <div className="flex h-full w-full flex-col items-center bg-card border-r border-border text-foreground select-none py-3 gap-3">
      <Tip label="ទិដ្ឋភាពរួម" side="right">
        <button
          onClick={onGoHome}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition-transform duration-150 hover:scale-105 cursor-pointer"
          aria-label="ទិដ្ឋភាពរួម"
        >
          <Keyboard className="size-4.5" />
        </button>
      </Tip>

      <div className="w-8 h-px bg-border/80" />

      <div className="flex-1 overflow-y-auto w-full px-1.5 space-y-1.5 scrollbar-slim flex flex-col items-center">
        {CURRICULUM.map((level) => {
          const lessonIds = level.lessons.map((l) => l.id);
          const comp = levelCompletion(progress, level.id, lessonIds);
          const isCurrentLevel = currentLevelId === level.id;
          const firstLesson = level.lessons[0];

          return (
            <Tip key={level.id} label={`${level.badge}៖ ${level.title}`} side="right">
              <button
                onClick={() => {
                  if (firstLesson) onSelectLesson(level, firstLesson);
                }}
                className={cn(
                  "km relative flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold transition-all duration-150 cursor-pointer",
                  isCurrentLevel
                    ? "bg-primary text-primary-foreground shadow-sm scale-105"
                    : comp === 100
                      ? "bg-success/15 text-success border border-success/30 hover:bg-success/25"
                      : "bg-secondary text-foreground/80 border border-border/60 hover:bg-secondary/80 hover:border-border",
                )}
              >
                {comp === 100 ? <CheckCircle2 className="size-4" /> : khmerNumber(level.id)}
                {isCurrentLevel && (
                  <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-primary ring-2 ring-card" />
                )}
              </button>
            </Tip>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <Tip label="បរិច្ចាគ" side="right">
          <a
            href={krumathPricingUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="បរិច្ចាគ"
          >
            <Heart className="size-4" />
          </a>
        </Tip>
        <Tip label="GitHub / មើលកូដ" side="right">
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="GitHub"
          >
            <Github className="size-4" />
          </a>
        </Tip>
        <Tip label="ទំព័រដើម" side="right">
          <a
            href={krumathHomeUrl()}
            className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="ទំព័រដើម KruMath"
          >
            <Home className="size-4" />
          </a>
        </Tip>
        <AccountMenu
          variant="rail"
          user={user}
          signInHref={signInHref}
          onSignOut={onSignOut}
          signingOut={signingOut}
        />
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        style={{ width: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
        className="relative z-20 hidden h-full shrink-0 flex-col transition-[width] duration-300 ease-out lg:flex"
      >
        <div className="h-full w-full overflow-hidden">
          {isCollapsed ? collapsedRail : sidebarContent}
        </div>

        {/* Cute collapse / expand pill */}
        {onToggleCollapse && (
          <Tip
            label={isCollapsed ? "ពង្រីកម៉ឺនុយ" : "បង្រួមម៉ឺនុយ"}
            side="right"
          >
            <button
              type="button"
              onClick={onToggleCollapse}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 -right-3 z-40",
                "flex size-6 items-center justify-center rounded-full",
                "border border-border bg-card text-muted-foreground shadow-sm",
                "hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-md",
                "transition-all duration-200 cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              )}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? (
                <ChevronRight className="size-3.5" />
              ) : (
                <ChevronLeft className="size-3.5" />
              )}
            </button>
          </Tip>
        )}
      </aside>

      {/* Mobile Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
            onClick={onCloseMobile}
          />
          <div className="relative w-80 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
