export const DEFAULT_ASPECT_RATIO = 1.5;
export const DEFAULT_BACKGROUND_OPACITY = 0.45;
export const GRID_STEP = 5;
export const MIN_ROOM_SIZE = 8;

export type PercentRect = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

export function snapPercent(value: number, step = GRID_STEP, enabled = true): number {
  if (!enabled) return Math.round(value * 10) / 10;
  return Math.round(value / step) * step;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampRect(
  rect: PercentRect,
  minSize = MIN_ROOM_SIZE,
  snap = true
): PercentRect {
  const widthPercent = Math.max(minSize, snapPercent(rect.widthPercent, GRID_STEP, snap));
  const heightPercent = Math.max(minSize, snapPercent(rect.heightPercent, GRID_STEP, snap));
  const xPercent = snapPercent(
    clamp(rect.xPercent, 0, 100 - widthPercent),
    GRID_STEP,
    snap
  );
  const yPercent = snapPercent(
    clamp(rect.yPercent, 0, 100 - heightPercent),
    GRID_STEP,
    snap
  );

  return { xPercent, yPercent, widthPercent, heightPercent };
}

export function pointerToPercent(
  clientX: number,
  clientY: number,
  canvasRect: DOMRect
): { xPercent: number; yPercent: number } {
  const xPercent = ((clientX - canvasRect.left) / canvasRect.width) * 100;
  const yPercent = ((clientY - canvasRect.top) / canvasRect.height) * 100;
  return {
    xPercent: clamp(xPercent, 0, 100),
    yPercent: clamp(yPercent, 0, 100),
  };
}

export function rectsOverlap(a: PercentRect, b: PercentRect): boolean {
  return (
    a.xPercent < b.xPercent + b.widthPercent &&
    a.xPercent + a.widthPercent > b.xPercent &&
    a.yPercent < b.yPercent + b.heightPercent &&
    a.yPercent + a.heightPercent > b.yPercent
  );
}

export function findOverlappingPairs<
  T extends PercentRect & { _id: string; name: string },
>(rooms: T[]): Array<{ a: T; b: T }> {
  const pairs: Array<{ a: T; b: T }> = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (rectsOverlap(rooms[i], rooms[j])) {
        pairs.push({ a: rooms[i], b: rooms[j] });
      }
    }
  }
  return pairs;
}

export function rectFromDrag(
  start: { xPercent: number; yPercent: number },
  end: { xPercent: number; yPercent: number },
  snap: boolean
): PercentRect {
  const raw: PercentRect = {
    xPercent: Math.min(start.xPercent, end.xPercent),
    yPercent: Math.min(start.yPercent, end.yPercent),
    widthPercent: Math.abs(end.xPercent - start.xPercent),
    heightPercent: Math.abs(end.yPercent - start.yPercent),
  };
  return clampRect(raw, MIN_ROOM_SIZE, snap);
}

export function nextDefaultRoomName(existingNames: string[]): string {
  const used = new Set(existingNames.map((n) => n.toLowerCase()));
  let i = 1;
  while (used.has(`room ${i}`)) i++;
  return `Room ${i}`;
}
