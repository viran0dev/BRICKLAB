export const PLATE = 0.4;
export const SPAN = 16;
export const MAX_LAYER = 48;

export type Rot = 0 | 1 | 2 | 3;
export type Family = "bricks" | "plates" | "tiles" | "rounds" | "slopes";
export type Shape = "box" | "round" | "slope";

export type Part = {
  id: string;
  name: string;
  w: number;
  l: number;
  family: Family;
  shape: Shape;
  plates: number;
  studs: boolean;
};

export type Brick = {
  id: string;
  partId: string;
  color: string;
  gx: number;
  gz: number;
  gy: number;
  rot: Rot;
};

export type Draft = Omit<Brick, "id">;

export const FAMILIES: { id: Family; label: string }[] = [
  { id: "bricks", label: "Bricks" },
  { id: "plates", label: "Plates" },
  { id: "tiles", label: "Tiles" },
  { id: "rounds", label: "Rounds" },
  { id: "slopes", label: "Slopes" },
];

function part(
  id: string,
  name: string,
  w: number,
  l: number,
  family: Family,
  shape: Shape,
  plates: number,
  studs: boolean,
): Part {
  return { id, name, w, l, family, shape, plates, studs };
}

export const PARTS: Part[] = [
  part("b-1x1", "1×1", 1, 1, "bricks", "box", 3, true),
  part("b-1x2", "1×2", 1, 2, "bricks", "box", 3, true),
  part("b-1x3", "1×3", 1, 3, "bricks", "box", 3, true),
  part("b-1x4", "1×4", 1, 4, "bricks", "box", 3, true),
  part("b-2x2", "2×2", 2, 2, "bricks", "box", 3, true),
  part("b-2x3", "2×3", 2, 3, "bricks", "box", 3, true),
  part("b-2x4", "2×4", 2, 4, "bricks", "box", 3, true),
  part("b-2x6", "2×6", 2, 6, "bricks", "box", 3, true),
  part("p-1x1", "1×1", 1, 1, "plates", "box", 1, true),
  part("p-1x2", "1×2", 1, 2, "plates", "box", 1, true),
  part("p-1x4", "1×4", 1, 4, "plates", "box", 1, true),
  part("p-2x2", "2×2", 2, 2, "plates", "box", 1, true),
  part("p-2x4", "2×4", 2, 4, "plates", "box", 1, true),
  part("p-4x4", "4×4", 4, 4, "plates", "box", 1, true),
  part("t-1x1", "1×1", 1, 1, "tiles", "box", 1, false),
  part("t-1x2", "1×2", 1, 2, "tiles", "box", 1, false),
  part("t-2x2", "2×2", 2, 2, "tiles", "box", 1, false),
  part("t-2x4", "2×4", 2, 4, "tiles", "box", 1, false),
  part("r-1x1", "Brick", 1, 1, "rounds", "round", 3, true),
  part("rp-1x1", "Plate", 1, 1, "rounds", "round", 1, true),
  part("s-1x2", "1×2", 1, 2, "slopes", "slope", 3, true),
  part("s-2x2", "2×2", 2, 2, "slopes", "slope", 3, true),
];

const BY_ID = new Map(PARTS.map((p) => [p.id, p]));

export function partById(id: string): Part {
  return BY_ID.get(id) ?? PARTS[6]!;
}

export const COLORS: { id: string; name: string; hex: string }[] = [
  { id: "red", name: "Red", hex: "#d01012" },
  { id: "orange", name: "Orange", hex: "#fe8a18" },
  { id: "yellow", name: "Yellow", hex: "#f5cd30" },
  { id: "lime", name: "Lime", hex: "#a4c81e" },
  { id: "green", name: "Green", hex: "#237841" },
  { id: "teal", name: "Teal", hex: "#0f8f78" },
  { id: "blue", name: "Blue", hex: "#0057b8" },
  { id: "azure", name: "Azure", hex: "#36a9e1" },
  { id: "purple", name: "Purple", hex: "#6c2b8a" },
  { id: "pink", name: "Pink", hex: "#f06ca8" },
  { id: "brown", name: "Brown", hex: "#6b3f22" },
  { id: "tan", name: "Tan", hex: "#e4c48a" },
  { id: "white", name: "White", hex: "#f4f4f4" },
  { id: "light", name: "Light bluish gray", hex: "#b0b8bd" },
  { id: "dark", name: "Dark bluish gray", hex: "#5b6166" },
  { id: "black", name: "Black", hex: "#1c1c1c" },
];

export const BASE_COLORS: { id: string; name: string; hex: string }[] = [
  { id: "green", name: "Green", hex: "#1d7a3a" },
  { id: "blue", name: "Blue", hex: "#1a4f86" },
  { id: "sand", name: "Sand", hex: "#c4a574" },
  { id: "gray", name: "Gray", hex: "#6d7270" },
];

export const HOT_PARTS = ["b-1x1", "b-1x2", "b-1x4", "b-2x2", "b-2x4", "b-2x6", "p-2x4", "t-2x2"];

export function footprint(part: Part, rot: Rot): { fw: number; fl: number } {
  return rot % 2 === 1 ? { fw: part.l, fl: part.w } : { fw: part.w, fl: part.l };
}

export function poseOf(brick: Draft): { x: number; y: number; z: number } {
  const part = partById(brick.partId);
  const { fw, fl } = footprint(part, brick.rot);
  return {
    x: brick.gx + fw / 2,
    y: brick.gy * PLATE,
    z: brick.gz + fl / 2,
  };
}

export function snapAnchor(point: number, size: number): number {
  return Math.floor(point - size / 2 + 0.5);
}

function cellKey(x: number, z: number, y: number): string {
  return `${x},${z},${y}`;
}

export type RejectReason = "overlap" | "float" | "bounds" | "height";

export function placementValid(
  bricks: Brick[],
  draft: Draft,
  ignoreId?: string,
  floatOK = false,
): { ok: true } | { ok: false; reason: RejectReason } {
  const part = partById(draft.partId);
  const { fw, fl } = footprint(part, draft.rot);
  if (draft.gy < 0 || draft.gy + part.plates > MAX_LAYER) return { ok: false, reason: "height" };

  const occ = occupancy(bricks, ignoreId);
  let supported = draft.gy === 0 || floatOK;

  for (let ix = 0; ix < fw; ix++) {
    for (let iz = 0; iz < fl; iz++) {
      const x = draft.gx + ix;
      const z = draft.gz + iz;
      if (x < -SPAN || x > SPAN || z < -SPAN || z > SPAN) return { ok: false, reason: "bounds" };
      for (let iy = 0; iy < part.plates; iy++) {
        if (occ.has(cellKey(x, z, draft.gy + iy))) return { ok: false, reason: "overlap" };
      }
      if (!supported && occ.has(cellKey(x, z, draft.gy - 1))) supported = true;
    }
  }

  if (!supported) return { ok: false, reason: "float" };
  return { ok: true };
}

let occBricks: Brick[] | null = null;
let occIgnore: string | undefined;
let occSet: Set<string> | null = null;

function occupancy(bricks: Brick[], ignoreId?: string): Set<string> {
  if (occSet && occBricks === bricks && occIgnore === ignoreId) return occSet;
  const set = new Set<string>();
  for (const brick of bricks) {
    if (brick.id === ignoreId) continue;
    const part = partById(brick.partId);
    const { fw, fl } = footprint(part, brick.rot);
    for (let ix = 0; ix < fw; ix++) {
      for (let iz = 0; iz < fl; iz++) {
        for (let iy = 0; iy < part.plates; iy++) {
          set.add(cellKey(brick.gx + ix, brick.gz + iz, brick.gy + iy));
        }
      }
    }
  }
  occBricks = bricks;
  occIgnore = ignoreId;
  occSet = set;
  return set;
}

export function sharesCells(a: Draft, b: Draft): boolean {
  const pa = partById(a.partId);
  const pb = partById(b.partId);
  const fa = footprint(pa, a.rot);
  const fb = footprint(pb, b.rot);
  const y0 = Math.max(a.gy, b.gy);
  const y1 = Math.min(a.gy + pa.plates, b.gy + pb.plates);
  if (y1 <= y0) return false;
  const x0 = Math.max(a.gx, b.gx);
  const x1 = Math.min(a.gx + fa.fw, b.gx + fb.fw);
  const z0 = Math.max(a.gz, b.gz);
  const z1 = Math.min(a.gz + fa.fl, b.gz + fb.fl);
  return x1 > x0 && z1 > z0;
}

export function mirrorDraft(draft: Draft): Draft {
  const part = partById(draft.partId);
  const rot = ((4 - draft.rot) % 4) as Rot;
  const { fw } = footprint(part, rot);
  return { ...draft, rot, gx: -draft.gx - fw + 1 };
}

export function studCount(bricks: Brick[]): number {
  let n = 0;
  for (const brick of bricks) {
    const part = partById(brick.partId);
    if (part.studs) n += part.w * part.l;
  }
  return n;
}

export function reasonCopy(reason: RejectReason): string {
  if (reason === "overlap") return "Something is already there";
  if (reason === "float") return "It needs a stud underneath";
  if (reason === "bounds") return "That sits off the baseplate";
  return "That stack is too tall";
}

export function isRot(n: number): n is Rot {
  return n === 0 || n === 1 || n === 2 || n === 3;
}
