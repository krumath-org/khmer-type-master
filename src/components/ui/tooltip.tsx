"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

type TooltipContentProps = React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
  hideArrow?: boolean;
};

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  TooltipContentProps
>(
  (
    { className, sideOffset = 8, collisionPadding = 10, hideArrow = false, children, ...props },
    ref,
  ) => (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        ref={ref}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          // Box: roomier radius/padding so wrapped Khmer labels never look cramped.
          "z-50 max-w-[min(20rem,calc(100vw-2rem))] select-none rounded-xl",
          "border border-border/70 bg-popover px-3 py-1.5 text-popover-foreground",
          // Type: explicit leading overrides the global `.km` line-height (2.1)
          // that would otherwise make every tooltip look bloated.
          "text-xs font-medium leading-snug text-pretty",
          // Depth: layered shadow reads as elevated over both light and dark surfaces.
          "shadow-lg shadow-foreground/[0.08]",
          // Motion
          "origin-(--radix-tooltip-content-transform-origin) duration-150",
          "animate-in fade-in-0 zoom-in-95",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
          "data-[side=bottom]:slide-in-from-top-1.5 data-[side=left]:slide-in-from-right-1.5",
          "data-[side=right]:slide-in-from-left-1.5 data-[side=top]:slide-in-from-bottom-1.5",
          className,
        )}
        {...props}
      >
        {children}
        {!hideArrow && (
          <TooltipPrimitive.Arrow
            className="fill-popover"
            width={12}
            height={6}
            aria-hidden
          />
        )}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  ),
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * Soft pill tooltip wrapper for icon buttons and compact controls.
 *
 * Renders only the child when `label` is empty, so callers can pass an optional
 * label without branching. `sideOffset` and `className` are opt-in and only
 * forwarded when provided (keeps `exactOptionalPropertyTypes` happy).
 */
function Tip({
  label,
  children,
  side = "top",
  align = "center",
  sideOffset,
  delayDuration,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactElement;
  side?: TooltipContentProps["side"];
  align?: TooltipContentProps["align"];
  sideOffset?: number;
  delayDuration?: number;
  className?: string;
}) {
  if (!label) return children;

  return (
    <Tooltip {...(delayDuration !== undefined ? { delayDuration } : {})}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        align={align}
        {...(sideOffset !== undefined ? { sideOffset } : {})}
        className={cn("km", className)}
      >
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

export { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent, Tip };
