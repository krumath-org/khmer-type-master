import { useEffect, useRef, useState } from "react";
import { ChevronUp, LogOut, UserRound } from "lucide-react";

import { Tip } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AuthUser } from "@/lib/authUser";

export type AccountMenuVariant = "sidebar" | "rail";

interface AccountMenuProps {
  /** Server-resolved account; null when signed out (only reachable in DEV under a hard gate). */
  user: AuthUser | null;
  /** KruMath sign-in URL, e.g. `/sign-in?returnUrl=%2Fkhmer-typing-master`. */
  signInHref: string;
  onSignOut: () => void | Promise<void>;
  signingOut?: boolean;
  /**
   * `sidebar` renders a full-width account row with a dropdown (expanded sidebar).
   * `rail` renders a compact icon control for the 68px collapsed rail, where a
   * 240px dropdown would be clipped by the sidebar's `overflow-hidden`.
   */
  variant?: AccountMenuVariant;
}

const RAIL_BUTTON =
  "flex size-9 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer";

/**
 * Project-level account control (spec section 12).
 *
 * Signed out: links into the existing KruMath sign-in flow (never a local form).
 * Signed in: shows the account identity with a control to Log out, which clears
 * the shared `.krumath.com` session so KruMath is signed out as well.
 */
export function AccountMenu({
  user,
  signInHref,
  onSignOut,
  signingOut = false,
  variant = "sidebar",
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const email = user?.email ?? "KruMath account";
  const initial = (user?.email?.trim()?.[0] ?? "K").toUpperCase();

  // --- Signed out ---------------------------------------------------------
  if (!user) {
    if (variant === "rail") {
      return (
        <Tip label="ចូលប្រើ" side="right">
          <a href={signInHref} className={RAIL_BUTTON} aria-label="ចូលប្រើ">
            <UserRound className="size-4" />
          </a>
        </Tip>
      );
    }

    return (
      <a
        href={signInHref}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-border/80 bg-background/80 px-2.5 py-2.5 text-sm font-semibold text-foreground transition-colors duration-150 hover:bg-secondary"
      >
        <UserRound className="size-4 text-primary" />
        <span className="km">ចូលគណនី</span>
      </a>
    );
  }

  // --- Signed in, collapsed rail: direct sign-out (no room for a dropdown) --
  if (variant === "rail") {
    return (
      <Tip label="ចាកចេញពីគណនី" side="right">
        <button
          type="button"
          onClick={() => void onSignOut()}
          disabled={signingOut}
          aria-label="ចាកចេញពីគណនី"
          className={cn(
            RAIL_BUTTON,
            "border-primary bg-primary text-sm font-bold text-primary-foreground hover:scale-105 hover:bg-primary disabled:opacity-60",
          )}
        >
          <span aria-hidden>{initial}</span>
        </button>
      </Tip>
    );
  }

  // --- Signed in, expanded sidebar ----------------------------------------
  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex w-full items-center gap-2.5 rounded-lg border border-border/80 bg-background/80 px-2.5 py-2 text-left transition-colors duration-150 hover:bg-secondary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          open && "border-primary/40 bg-secondary",
        )}
      >
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
          aria-hidden
        >
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-foreground">{email}</span>
          <span className="block text-[0.7rem] leading-snug text-muted-foreground">
            Signed in to KruMath
          </span>
        </span>
        <ChevronUp
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-150",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute bottom-[calc(100%+0.5rem)] left-0 z-50 w-full min-w-[13rem] overflow-hidden rounded-xl border border-border bg-card shadow-xl"
        >
          <div className="border-b border-border/80 px-3.5 py-2.5">
            <p className="truncate text-sm font-semibold text-foreground">{email}</p>
            <p className="km mt-0.5 text-xs leading-snug text-muted-foreground">គណនី KruMath</p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void onSignOut();
            }}
            disabled={signingOut}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
          >
            <LogOut className="size-4 text-muted-foreground" />
            <span>{signingOut ? "Signing out…" : "Log out"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
