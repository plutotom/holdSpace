"use client";

import { cn } from "@/lib/utils";
import {
  DEFAULT_ASPECT_RATIO,
  DEFAULT_BACKGROUND_OPACITY,
  GRID_STEP,
} from "@/lib/floor-plan/geometry";

interface FloorMapCanvasProps {
  aspectRatio?: number;
  backgroundUrl?: string | null;
  backgroundOpacity?: number;
  showGrid?: boolean;
  className?: string;
  innerClassName?: string;
  canvasRef?: React.RefObject<HTMLDivElement | null>;
  onCanvasPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onCanvasPointerMove?: (event: React.PointerEvent<HTMLDivElement>) => void;
  onCanvasPointerUp?: (event: React.PointerEvent<HTMLDivElement>) => void;
  children?: React.ReactNode;
  overlay?: React.ReactNode;
}

export function FloorMapCanvas({
  aspectRatio = DEFAULT_ASPECT_RATIO,
  backgroundUrl,
  backgroundOpacity = DEFAULT_BACKGROUND_OPACITY,
  showGrid = false,
  className,
  innerClassName,
  canvasRef,
  onCanvasPointerDown,
  onCanvasPointerMove,
  onCanvasPointerUp,
  children,
  overlay,
}: FloorMapCanvasProps) {
  const paddingTop = `${(1 / aspectRatio) * 100}%`;

  return (
    <div
      className={cn(
        "relative w-full rounded-lg border border-border bg-muted/20 overflow-hidden select-none",
        className
      )}
      style={{ paddingTop }}
    >
      <div
        ref={canvasRef}
        className={cn("absolute inset-0", innerClassName)}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
      >
        {backgroundUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={backgroundUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-contain pointer-events-none"
            style={{ opacity: backgroundOpacity }}
            draggable={false}
          />
        )}

        {showGrid && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, hsl(var(--border) / 0.45) 1px, transparent 1px),
                linear-gradient(to bottom, hsl(var(--border) / 0.45) 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_STEP}% ${GRID_STEP}%`,
            }}
          />
        )}

        <div className="absolute inset-0 p-1">{children}</div>
        {overlay}
      </div>
    </div>
  );
}
