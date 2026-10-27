import { footprint, isRot, partById, PLATE, type Brick, type Rot } from "@/lib/bricks/parts";

export type Doc = {
  version: 1;
  bricks: Brick[];
  baseColor: string;
};

export type SlotId = "a" | "b" | "c" | "d";

export type Slot = {
  name: string;
  savedAt: number;
  doc: Doc;
};

const DOC_KEY = "bricklab.v1.doc";
const SLOT_KEY = "bricklab.v1.slots";

export const SLOT_IDS: SlotId[] = ["a", "b", "c", "d"];

export function loadDoc(): Doc | null {
  try {
    const raw = localStorage.getItem(DOC_KEY);
    if (!raw) return null;
    return parseDoc(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveDoc(doc: Doc) {
  localStorage.setItem(DOC_KEY, JSON.stringify(doc));
}

export function loadSlots(): Partial<Record<SlotId, Slot>> {
  try {
    const raw = localStorage.getItem(SLOT_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Partial<Record<SlotId, Slot>>;
    const next: Partial<Record<SlotId, Slot>> = {};
    for (const id of SLOT_IDS) {
      const slot = data[id];
      if (!slot) continue;
      const doc = parseDoc(slot.doc);
      if (!doc) continue;
      next[id] = { name: slot.name || `Build ${id.toUpperCase()}`, savedAt: slot.savedAt || 0, doc };
    }
    return next;
  } catch {
    return {};
  }
}

export function writeSlots(slots: Partial<Record<SlotId, Slot>>) {
  localStorage.setItem(SLOT_KEY, JSON.stringify(slots));
}

export function parseDoc(input: unknown): Doc | null {
  if (!input || typeof input !== "object") return null;
  const record = input as { bricks?: unknown; baseColor?: unknown };
  const bricks = normalizeBricks(record.bricks);
  if (!bricks) return null;
  const baseColor = typeof record.baseColor === "string" ? record.baseColor : "#1d7a3a";
  return { version: 1, bricks, baseColor };
}

export function normalizeBricks(input: unknown): Brick[] | null {
  if (!Array.isArray(input)) return null;
  const bricks: Brick[] = [];
  for (const item of input) {
    const brick = normalizeBrick(item);
    if (brick) bricks.push(brick);
  }
  return bricks;
}

function normalizeBrick(item: unknown): Brick | null {
  if (!item || typeof item !== "object") return null;
  const row = item as Record<string, unknown>;

  if (typeof row.partId === "string" && isFiniteNumber(row.gx) && isFiniteNumber(row.gz) && isFiniteNumber(row.gy)) {
    const rot = Number(row.rot);
    if (!isRot(rot)) return null;
    const known = partById(row.partId);
    if (known.id !== row.partId) return null;
    return {
      id: typeof row.id === "string" ? row.id : uid(),
      partId: row.partId,
      color: typeof row.color === "string" ? row.color : "#d01012",
      gx: Math.round(row.gx),
      gz: Math.round(row.gz),
      gy: Math.max(0, Math.round(row.gy)),
      rot,
    };
  }

  if (isFiniteNumber(row.width) && isFiniteNumber(row.length) && isFiniteNumber(row.x) && isFiniteNumber(row.z)) {
    const id = `b-${row.width}x${row.length}`;
    const known = partById(id);
    if (known.id !== id) return null;
    const turns = Math.round((Number(row.rotationY) || 0) / (Math.PI / 2));
    const rot = (((turns % 4) + 4) % 4) as Rot;
    const { fw, fl } = footprint(known, rot);
    const y = isFiniteNumber(row.y) ? row.y : 0;
    return {
      id: uid(),
      partId: id,
      color: typeof row.colorHex === "string" ? row.colorHex : "#d01012",
      gx: Math.round(row.x - fw / 2),
      gz: Math.round(row.z - fl / 2),
      gy: Math.max(0, Math.round(y / PLATE)),
      rot,
    };
  }

  return null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

export function uid(): string {
  return `b_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-3)}`;
}

export function downloadText(filename: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
