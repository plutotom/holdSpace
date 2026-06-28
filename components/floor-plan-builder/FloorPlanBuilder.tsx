"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import {
  ImagePlus,
  Magnet,
  MousePointer2,
  SquareDashed,
  Trash2,
  TriangleAlert,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import { FloorMapCanvas } from "@/components/floor-map/FloorMapCanvas";
import {
  BuilderRoom,
  DraftRoomBox,
  EditableRoomBox,
  ResizeHandle,
} from "./EditableRoomBox";
import {
  clamp,
  clampRect,
  DEFAULT_ASPECT_RATIO,
  DEFAULT_BACKGROUND_OPACITY,
  findOverlappingPairs,
  MIN_ROOM_SIZE,
  nextDefaultRoomName,
  pointerToPercent,
  rectFromDrag,
  type PercentRect,
} from "@/lib/floor-plan/geometry";
import { cn } from "@/lib/utils";
import type { Id } from "@/convex/_generated/dataModel";

type Tool = "select" | "draw";

type DragState =
  | {
      kind: "draw";
      start: { xPercent: number; yPercent: number };
      current: { xPercent: number; yPercent: number };
    }
  | {
      kind: "move";
      roomId: Id<"rooms">;
      startPointer: { xPercent: number; yPercent: number };
      startRect: PercentRect;
    }
  | {
      kind: "resize";
      roomId: Id<"rooms">;
      handle: ResizeHandle;
      startPointer: { xPercent: number; yPercent: number };
      startRect: PercentRect;
    };

const ROOM_TYPE_LABELS = {
  individual: "Individual",
  group: "Group",
  consultation: "Consultation",
  shared: "Shared",
} as const;

const ROOM_TYPES = Object.keys(ROOM_TYPE_LABELS) as Array<
  keyof typeof ROOM_TYPE_LABELS
>;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.1;
const CANVAS_MAX_WIDTH_REM = 64;

interface FloorPlanBuilderProps {
  floorId: Id<"floors">;
  organizationId: Id<"organizations">;
}

export function FloorPlanBuilder({ floorId, organizationId }: FloorPlanBuilderProps) {
  const floor = useQuery(api.routes.floors.get, { floorId });
  const serverRooms = useQuery(api.routes.rooms.listByFloor, { floorId });

  const createRoom = useMutation(api.routes.rooms.create);
  const updateRoom = useMutation(api.routes.rooms.update);
  const removeRoom = useMutation(api.routes.rooms.remove);
  const updateLayout = useMutation(api.routes.floors.updateLayout);
  const generateUploadUrl = useMutation(api.routes.floors.generateBackgroundUploadUrl);

  const [localRooms, setLocalRooms] = useState<BuilderRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<Id<"rooms"> | null>(null);
  const [tool, setTool] = useState<Tool>("select");
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [zoom, setZoom] = useState(1);

  const canvasRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localRoomsRef = useRef(localRooms);
  const drawEndRef = useRef<{ xPercent: number; yPercent: number } | null>(null);

  useEffect(() => {
    localRoomsRef.current = localRooms;
  }, [localRooms]);

  useEffect(() => {
    if (serverRooms) {
      setLocalRooms(serverRooms);
    }
  }, [serverRooms]);

  const overlappingPairs = useMemo(
    () => findOverlappingPairs(localRooms),
    [localRooms]
  );

  const overlappingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const { a, b } of overlappingPairs) {
      ids.add(a._id);
      ids.add(b._id);
    }
    return ids;
  }, [overlappingPairs]);

  const selectedRoom = localRooms.find((r) => r._id === selectedRoomId) ?? null;

  const setZoomClamped = useCallback((next: number | ((prev: number) => number)) => {
    setZoom((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      return Math.round(clamp(value, ZOOM_MIN, ZOOM_MAX) * 10) / 10;
    });
  }, []);

  const handleZoomWheel = useCallback(
    (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      setZoomClamped((z) => z + (event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP));
    },
    [setZoomClamped]
  );

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleZoomWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleZoomWheel);
  }, [handleZoomWheel]);

  const getCanvasRect = useCallback(() => {
    const el = canvasRef.current;
    if (!el) return null;
    return el.getBoundingClientRect();
  }, []);

  const getPointerPercent = useCallback(
    (clientX: number, clientY: number) => {
      const rect = getCanvasRect();
      if (!rect) return { xPercent: 0, yPercent: 0 };
      return pointerToPercent(clientX, clientY, rect);
    },
    [getCanvasRect]
  );

  const persistRoomRect = useCallback(
    async (roomId: Id<"rooms">, rect: PercentRect) => {
      setSaving(true);
      try {
        await updateRoom({
          roomId,
          xPercent: rect.xPercent,
          yPercent: rect.yPercent,
          widthPercent: rect.widthPercent,
          heightPercent: rect.heightPercent,
        });
      } finally {
        setSaving(false);
      }
    },
    [updateRoom]
  );

  const updateLocalRoom = useCallback((roomId: Id<"rooms">, rect: PercentRect) => {
    setLocalRooms((prev) => {
      const next = prev.map((room) => (room._id === roomId ? { ...room, ...rect } : room));
      localRoomsRef.current = next;
      return next;
    });
  }, []);

  const resizeRect = useCallback(
    (
      handle: ResizeHandle,
      startRect: PercentRect,
      startPointer: { xPercent: number; yPercent: number },
      currentPointer: { xPercent: number; yPercent: number }
    ): PercentRect => {
      const dx = currentPointer.xPercent - startPointer.xPercent;
      const dy = currentPointer.yPercent - startPointer.yPercent;
      let { xPercent, yPercent, widthPercent, heightPercent } = startRect;

      if (handle.includes("e")) widthPercent = startRect.widthPercent + dx;
      if (handle.includes("w")) {
        widthPercent = startRect.widthPercent - dx;
        xPercent = startRect.xPercent + dx;
      }
      if (handle.includes("s")) heightPercent = startRect.heightPercent + dy;
      if (handle.includes("n")) {
        heightPercent = startRect.heightPercent - dy;
        yPercent = startRect.yPercent + dy;
      }

      return clampRect({ xPercent, yPercent, widthPercent, heightPercent }, MIN_ROOM_SIZE, snapToGrid);
    },
    [snapToGrid]
  );

  const handleCanvasPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (tool !== "draw") return;
    if (event.button !== 0) return;

    const pointer = getPointerPercent(event.clientX, event.clientY);
    drawEndRef.current = pointer;
    setSelectedRoomId(null);
    setDragState({
      kind: "draw",
      start: pointer,
      current: pointer,
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  useEffect(() => {
    if (!dragState) return;

    const activeDrag = dragState;

    const onPointerMove = (event: PointerEvent) => {
      const pointer = getPointerPercent(event.clientX, event.clientY);

      if (activeDrag.kind === "draw") {
        drawEndRef.current = pointer;
        setDragState({ ...activeDrag, current: pointer });
        return;
      }

      if (activeDrag.kind === "move") {
        const dx = pointer.xPercent - activeDrag.startPointer.xPercent;
        const dy = pointer.yPercent - activeDrag.startPointer.yPercent;
        const next = clampRect(
          {
            xPercent: activeDrag.startRect.xPercent + dx,
            yPercent: activeDrag.startRect.yPercent + dy,
            widthPercent: activeDrag.startRect.widthPercent,
            heightPercent: activeDrag.startRect.heightPercent,
          },
          MIN_ROOM_SIZE,
          snapToGrid
        );
        updateLocalRoom(activeDrag.roomId, next);
        return;
      }

      if (activeDrag.kind === "resize") {
        const next = resizeRect(
          activeDrag.handle,
          activeDrag.startRect,
          activeDrag.startPointer,
          pointer
        );
        updateLocalRoom(activeDrag.roomId, next);
      }
    };

    const onPointerUp = async () => {
      setDragState(null);

      if (activeDrag.kind === "draw") {
        const end = drawEndRef.current ?? activeDrag.current;
        drawEndRef.current = null;
        const rect = rectFromDrag(activeDrag.start, end, snapToGrid);
        if (rect.widthPercent >= MIN_ROOM_SIZE && rect.heightPercent >= MIN_ROOM_SIZE) {
          setSaving(true);
          try {
            const roomId = await createRoom({
              organizationId,
              floorId,
              name: nextDefaultRoomName(localRoomsRef.current.map((r) => r.name)),
              type: "individual",
              isBookable: true,
              sortOrder: localRoomsRef.current.length,
              ...rect,
              defaultDuration: 50,
            });
            setSelectedRoomId(roomId);
          } finally {
            setSaving(false);
          }
        }
        return;
      }

      const room = localRoomsRef.current.find((r) => r._id === activeDrag.roomId);
      if (room) {
        await persistRoomRect(activeDrag.roomId, {
          xPercent: room.xPercent,
          yPercent: room.yPercent,
          widthPercent: room.widthPercent,
          heightPercent: room.heightPercent,
        });
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [
    createRoom,
    dragState,
    floorId,
    getPointerPercent,
    organizationId,
    persistRoomRect,
    resizeRect,
    snapToGrid,
    updateLocalRoom,
  ]);

  const startMove = (room: BuilderRoom, event: React.PointerEvent<HTMLDivElement>) => {
    if (tool !== "select") return;
    if (event.button !== 0) return;

    const pointer = getPointerPercent(event.clientX, event.clientY);
    setDragState({
      kind: "move",
      roomId: room._id,
      startPointer: pointer,
      startRect: {
        xPercent: room.xPercent,
        yPercent: room.yPercent,
        widthPercent: room.widthPercent,
        heightPercent: room.heightPercent,
      },
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const startResize = (
    room: BuilderRoom,
    handle: ResizeHandle,
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (tool !== "select") return;

    const pointer = getPointerPercent(event.clientX, event.clientY);
    setDragState({
      kind: "resize",
      roomId: room._id,
      handle,
      startPointer: pointer,
      startRect: {
        xPercent: room.xPercent,
        yPercent: room.yPercent,
        widthPercent: room.widthPercent,
        heightPercent: room.heightPercent,
      },
    });
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleBackgroundUpload = async (file: File) => {
    setUploading(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
      await updateLayout({
        floorId,
        backgroundStorageId: storageId,
        layoutMode: "visual",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveBackground = async () => {
    await updateLayout({ floorId, backgroundStorageId: null });
  };

  const draftRect =
    dragState?.kind === "draw"
      ? rectFromDrag(dragState.start, dragState.current, snapToGrid)
      : null;

  if (floor === undefined || serverRooms === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Loading floor plan...
      </div>
    );
  }

  if (!floor) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        Floor not found.
      </div>
    );
  }

  return (
    <div className="hidden md:flex flex-1 min-h-0">
      {/* Sidebar */}
      <aside className="w-72 border-r border-border flex flex-col bg-background shrink-0">
        <div className="p-4 border-b border-border">
          <Link
            href="/admin"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            ← Admin
          </Link>
          <h1 className="text-lg font-semibold mt-2">{floor.name}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Floor plan builder</p>
        </div>

        <div className="p-4 border-b border-border space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Selected room
          </p>
          {selectedRoom ? (
            <div className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">Name</span>
                <input
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedRoom.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setLocalRooms((prev) =>
                      prev.map((r) => (r._id === selectedRoom._id ? { ...r, name } : r))
                    );
                  }}
                  onBlur={async () => {
                    if (selectedRoom.name.trim()) {
                      await updateRoom({
                        roomId: selectedRoom._id,
                        name: selectedRoom.name.trim(),
                      });
                    }
                  }}
                />
              </label>

              <label className="block space-y-1">
                <span className="text-xs text-muted-foreground">Type</span>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedRoom.type}
                  onChange={async (e) => {
                    const type = e.target.value as BuilderRoom["type"];
                    setLocalRooms((prev) =>
                      prev.map((r) =>
                        r._id === selectedRoom._id ? { ...r, type } : r
                      )
                    );
                    await updateRoom({
                      roomId: selectedRoom._id,
                      type: type as "individual" | "group" | "consultation" | "shared",
                    });
                  }}
                >
                  {ROOM_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {ROOM_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center justify-between gap-3">
                <span className="text-sm">Bookable</span>
                <input
                  type="checkbox"
                  checked={selectedRoom.isBookable}
                  onChange={async (e) => {
                    const isBookable = e.target.checked;
                    setLocalRooms((prev) =>
                      prev.map((r) =>
                        r._id === selectedRoom._id ? { ...r, isBookable } : r
                      )
                    );
                    await updateRoom({ roomId: selectedRoom._id, isBookable });
                  }}
                />
              </label>

              <button
                onClick={async () => {
                  await removeRoom({ roomId: selectedRoom._id });
                  setSelectedRoomId(null);
                }}
                className="inline-flex items-center gap-1.5 text-xs text-destructive hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete room
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Select a room or draw a new one on the canvas.
            </p>
          )}
        </div>

        <div className="flex-1 overflow-auto p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Rooms ({localRooms.length})
          </p>
          <div className="space-y-1">
            {localRooms.map((room) => (
              <button
                key={room._id}
                onClick={() => setSelectedRoomId(room._id)}
                className={cn(
                  "w-full text-left rounded-md px-3 py-2 text-sm border transition-colors",
                  selectedRoomId === room._id
                    ? "border-primary bg-primary/5"
                    : "border-transparent hover:bg-accent",
                  overlappingIds.has(room._id) && "border-amber-400/70"
                )}
              >
                <span className="font-medium">{room.name}</span>
                <span className="block text-xs text-muted-foreground capitalize">
                  {room.type}
                  {!room.isBookable ? " · not bookable" : ""}
                </span>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Canvas area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="border-b border-border px-4 py-3 flex items-center gap-2 flex-wrap">
          <div className="flex items-center rounded-md border border-border p-0.5">
            <button
              onClick={() => setTool("select")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm",
                tool === "select" ? "bg-accent text-foreground" : "text-muted-foreground"
              )}
            >
              <MousePointer2 className="h-4 w-4" />
              Select
            </button>
            <button
              onClick={() => setTool("draw")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm",
                tool === "draw" ? "bg-accent text-foreground" : "text-muted-foreground"
              )}
            >
              <SquareDashed className="h-4 w-4" />
              Draw
            </button>
          </div>

          <button
            onClick={() => setSnapToGrid((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm",
              snapToGrid
                ? "border-primary/40 bg-primary/5 text-foreground"
                : "border-border text-muted-foreground"
            )}
          >
            <Magnet className="h-4 w-4" />
            Snap {snapToGrid ? "on" : "off"}
          </button>

          <div className="flex items-center rounded-md border border-border">
            <button
              onClick={() => setZoomClamped((z) => z - ZOOM_STEP)}
              disabled={zoom <= ZOOM_MIN}
              className="inline-flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 rounded-l-md"
              aria-label="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => setZoomClamped(1)}
              className="px-2 h-8 text-xs tabular-nums text-muted-foreground hover:text-foreground hover:bg-accent border-x border-border min-w-[3.25rem]"
              title="Reset zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={() => setZoomClamped((z) => z + ZOOM_STEP)}
              disabled={zoom >= ZOOM_MAX}
              className="inline-flex items-center justify-center h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-40 rounded-r-md"
              aria-label="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-sm hover:bg-accent disabled:opacity-50"
          >
            <ImagePlus className="h-4 w-4" />
            {uploading ? "Uploading..." : "Background"}
          </button>
          {floor.backgroundUrl && (
            <button
              onClick={handleRemoveBackground}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Remove image
            </button>
          )}

          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs text-muted-foreground">Opacity</span>
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.05}
              value={floor.backgroundOpacity ?? DEFAULT_BACKGROUND_OPACITY}
              disabled={!floor.backgroundUrl}
              onChange={async (e) => {
                const backgroundOpacity = Number(e.target.value);
                await updateLayout({ floorId, backgroundOpacity });
              }}
              className="w-24"
            />
          </div>

          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            {saving && <span>Saving...</span>}
            <Link href="/floor" className="underline hover:text-foreground">
              Preview live map
            </Link>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) await handleBackgroundUpload(file);
              e.target.value = "";
            }}
          />
        </div>

        {overlappingPairs.length > 0 && (
          <div className="mx-4 mt-3 rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-sm text-amber-900 dark:text-amber-100 flex items-start gap-2">
            <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Overlapping rooms</p>
              <p className="text-xs mt-0.5 opacity-90">
                {overlappingPairs
                  .slice(0, 3)
                  .map(({ a, b }) => `${a.name} ↔ ${b.name}`)
                  .join(", ")}
                {overlappingPairs.length > 3
                  ? ` and ${overlappingPairs.length - 3} more`
                  : ""}
                . You can save anyway — just double-check the layout.
              </p>
            </div>
          </div>
        )}

        <div ref={scrollContainerRef} className="flex-1 p-4 overflow-auto">
          <div
            className="mx-auto"
            style={{
              width: `${zoom * 100}%`,
              maxWidth: `${zoom * CANVAS_MAX_WIDTH_REM}rem`,
            }}
          >
            <FloorMapCanvas
              canvasRef={canvasRef}
              aspectRatio={floor.canvasAspectRatio ?? DEFAULT_ASPECT_RATIO}
              backgroundUrl={floor.backgroundUrl}
              backgroundOpacity={floor.backgroundOpacity ?? DEFAULT_BACKGROUND_OPACITY}
              showGrid
              onCanvasPointerDown={handleCanvasPointerDown}
            >
              {localRooms.map((room) => (
                <EditableRoomBox
                  key={room._id}
                  room={room}
                  isSelected={selectedRoomId === room._id}
                  hasOverlap={overlappingIds.has(room._id)}
                  onSelect={() => setSelectedRoomId(room._id)}
                  onPointerDownMove={(event) => startMove(room, event)}
                  onResizePointerDown={(handle, event) =>
                    startResize(room, handle, event)
                  }
                />
              ))}
              {draftRect &&
                draftRect.widthPercent >= MIN_ROOM_SIZE &&
                draftRect.heightPercent >= MIN_ROOM_SIZE && (
                  <DraftRoomBox rect={draftRect} />
                )}
            </FloorMapCanvas>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-3">
            {tool === "draw"
              ? "Click and drag on the canvas to draw a room."
              : "Drag rooms to move. Use corner handles to resize."}
            {" · "}
            Ctrl/Cmd + scroll to zoom
          </p>
        </div>
      </div>
    </div>
  );
}

export function FloorPlanBuilderMobileFallback() {
  return (
    <div className="md:hidden flex-1 flex flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm font-medium">Floor plan builder is desktop-only</p>
      <p className="text-xs text-muted-foreground">
        Open this page on a larger screen to draw and arrange rooms.
      </p>
      <Link href="/admin" className="text-sm underline text-muted-foreground">
        Back to admin
      </Link>
    </div>
  );
}
