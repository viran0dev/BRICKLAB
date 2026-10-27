import { create } from "zustand";
import { sfx } from "@/lib/bricks/audio";
import { addTrauma } from "@/lib/bricks/camera";
import { emitSpark, markBorn } from "@/lib/bricks/juice";
import {
  COLORS,
  footprint,
  mirrorDraft,
  partById,
  placementValid,
  poseOf,
  reasonCopy,
  sharesCells,
  type Brick,
  type Draft,
  type Family,
  type Rot,
} from "@/lib/bricks/parts";
import { uid, type Doc } from "@/lib/bricks/storage";

export type Mode = "build" | "paint" | "select" | "look";

type State = {
  bricks: Brick[];
  past: Brick[][];
  future: Brick[][];
  mode: Mode;
  family: Family;
  partId: string;
  color: string;
  rot: Rot;
  selectedId: string | null;
  mirror: boolean;
  floatOK: boolean;
  grid: boolean;
  sound: boolean;
  shake: boolean;
  eyedrop: boolean;
  baseColor: string;
  toast: string | null;
  booted: boolean;
  setMode: (mode: Mode) => void;
  setFamily: (family: Family) => void;
  setPart: (partId: string) => void;
  setColor: (color: string) => void;
  setRot: (rot: Rot) => void;
  rotateTool: (dir?: 1 | -1) => void;
  rotateSelected: (dir?: 1 | -1) => void;
  toggleMirror: () => void;
  toggleFloat: () => void;
  toggleGrid: () => void;
  toggleSound: () => void;
  toggleShake: () => void;
  toggleEyedrop: () => void;
  setBaseColor: (hex: string) => void;
  select: (id: string | null) => void;
  showToast: (message: string) => void;
  place: (gx: number, gz: number, gy: number) => boolean;
  paint: (id: string) => void;
  sample: (id: string) => void;
  removeSelected: () => void;
  nudgeSelected: (dx: number, dz: number, dy?: number) => void;
  duplicateSelected: () => void;
  liftSelected: () => void;
  undo: () => void;
  redo: () => void;
  clearAll: () => void;
  replaceDoc: (doc: Doc, remember: boolean) => void;
  markBooted: () => void;
  currentDoc: () => Doc;
};

let toastTimer = 0;

function withPast(state: State, bricks: Brick[], extra: Partial<State> = {}): Partial<State> {
  return {
    past: [...state.past, state.bricks].slice(-60),
    future: [],
    bricks,
    ...extra,
  };
}

export const useStudio = create<State>((set, get) => ({
  bricks: [],
  past: [],
  future: [],
  mode: "build",
  family: "bricks",
  partId: "b-2x4",
  color: COLORS[0]!.hex,
  rot: 0,
  selectedId: null,
  mirror: false,
  floatOK: false,
  grid: false,
  sound: true,
  shake: true,
  eyedrop: false,
  baseColor: "#1d7a3a",
  toast: null,
  booted: false,

  setMode: (mode) =>
    set({
      mode,
      eyedrop: false,
      selectedId: mode === "select" ? get().selectedId : null,
    }),
  setFamily: (family) => {
    const defaults = {
      bricks: "b-2x4",
      plates: "p-2x4",
      tiles: "t-2x2",
      rounds: "r-1x1",
      slopes: "s-1x2",
    } as const;
    const current = partById(get().partId);
    set({
      family,
      partId: current.family === family ? current.id : defaults[family],
    });
  },
  setPart: (partId) => set({ partId, family: partById(partId).family, mode: get().mode === "look" ? "build" : get().mode }),
  setColor: (color) => {
    const { selectedId, mode, bricks } = get();
    if (mode === "select" && selectedId) {
      const target = bricks.find((brick) => brick.id === selectedId);
      if (target && target.color !== color) {
        set((state) =>
          withPast(
            state,
            state.bricks.map((brick) => (brick.id === selectedId ? { ...brick, color } : brick)),
          ),
        );
        sfx.paint();
      }
    }
    set({ color });
  },
  setRot: (rot) => set({ rot }),
  rotateTool: (dir = 1) => {
    const { mode, selectedId } = get();
    if (mode === "select" && selectedId) {
      get().rotateSelected(dir);
      return;
    }
    set((state) => ({ rot: (((state.rot + dir) % 4) + 4) % 4 as Rot }));
    sfx.rotate();
  },
  toggleMirror: () => {
    const mirror = !get().mirror;
    set({ mirror });
    get().showToast(mirror ? "Mirror is on" : "Mirror is off");
  },
  toggleFloat: () => {
    const floatOK = !get().floatOK;
    set({ floatOK });
    get().showToast(floatOK ? "Floating bricks allowed" : "Bricks must sit on studs");
  },
  toggleGrid: () => set((state) => ({ grid: !state.grid })),
  toggleSound: () => set((state) => ({ sound: !state.sound })),
  toggleShake: () => set((state) => ({ shake: !state.shake })),
  toggleEyedrop: () => set((state) => ({ eyedrop: !state.eyedrop, mode: state.eyedrop ? state.mode : "select" })),
  setBaseColor: (baseColor) => set({ baseColor }),
  select: (selectedId) => set({ selectedId, mode: selectedId ? "select" : get().mode }),
  showToast: (message) => {
    set({ toast: message });
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => set({ toast: null }), 1700);
  },

  place: (gx, gz, gy) => {
    const state = get();
    const draft: Draft = {
      partId: state.partId,
      color: state.color,
      gx,
      gz,
      gy,
      rot: state.rot,
    };
    const check = placementValid(state.bricks, draft, undefined, state.floatOK);
    if (!check.ok) {
      sfx.deny();
      state.showToast(reasonCopy(check.reason));
      return false;
    }
    const brick: Brick = { ...draft, id: uid() };
    const next = [...state.bricks, brick];
    let mirrored = false;
    if (state.mirror) {
      const twin = mirrorDraft(draft);
      const twinOk = placementValid(next, twin, undefined, state.floatOK);
      if (twinOk.ok && !sharesCells(draft, twin)) {
        next.push({ ...twin, id: uid() });
        mirrored = true;
      }
    }
    set((current) => withPast(current, next));
    sfx.place();
    addTrauma(0.28);
    markBorn(brick.id);
    const pose = poseOf(brick);
    emitSpark({ x: pose.x, y: pose.y + 0.4, z: pose.z, color: brick.color });
    if (mirrored) {
      const twin = next[next.length - 1]!;
      markBorn(twin.id);
      const twinPose = poseOf(twin);
      emitSpark({ x: twinPose.x, y: twinPose.y + 0.4, z: twinPose.z, color: twin.color });
    }
    return true;
  },

  paint: (id) => {
    const state = get();
    const target = state.bricks.find((brick) => brick.id === id);
    if (!target || target.color === state.color) {
      set({ selectedId: id });
      return;
    }
    set((current) =>
      withPast(
        current,
        current.bricks.map((brick) => (brick.id === id ? { ...brick, color: current.color } : brick)),
        { selectedId: id },
      ),
    );
    sfx.paint();
  },

  sample: (id) => {
    const brick = get().bricks.find((item) => item.id === id);
    if (!brick) return;
    set({ color: brick.color, eyedrop: false, partId: brick.partId, family: partById(brick.partId).family, rot: brick.rot });
    sfx.ok();
    get().showToast("Color picked");
  },

  removeSelected: () => {
    const { selectedId, bricks } = get();
    if (!selectedId) {
      get().showToast("Select a brick first");
      return;
    }
    const target = bricks.find((brick) => brick.id === selectedId);
    set((state) => withPast(state, state.bricks.filter((brick) => brick.id !== selectedId), { selectedId: null }));
    sfx.remove();
    addTrauma(0.16);
    if (target) {
      const pose = poseOf(target);
      emitSpark({ x: pose.x, y: pose.y + 0.3, z: pose.z, color: target.color });
    }
  },

  rotateSelected: (dir = 1) => {
    const { selectedId, bricks, floatOK } = get();
    if (!selectedId) return;
    const target = bricks.find((brick) => brick.id === selectedId);
    if (!target) return;
    const rot = ((((target.rot + dir) % 4) + 4) % 4) as Rot;
    const draft: Draft = { ...target, rot };
    const check = placementValid(bricks, draft, target.id, floatOK);
    if (!check.ok) {
      sfx.deny();
      get().showToast(reasonCopy(check.reason));
      return;
    }
    set((state) =>
      withPast(
        state,
        state.bricks.map((brick) => (brick.id === selectedId ? { ...brick, rot } : brick)),
      ),
    );
    sfx.rotate();
  },

  nudgeSelected: (dx, dz, dy = 0) => {
    const { selectedId, bricks, floatOK } = get();
    if (!selectedId) return;
    const target = bricks.find((brick) => brick.id === selectedId);
    if (!target) return;
    const draft: Draft = { ...target, gx: target.gx + dx, gz: target.gz + dz, gy: target.gy + dy };
    const check = placementValid(bricks, draft, target.id, floatOK);
    if (!check.ok) {
      sfx.deny();
      return;
    }
    set((state) =>
      withPast(
        state,
        state.bricks.map((brick) => (brick.id === selectedId ? { ...brick, ...draft } : brick)),
      ),
    );
    sfx.rotate();
  },

  duplicateSelected: () => {
    const { selectedId, bricks, floatOK } = get();
    if (!selectedId) return;
    const target = bricks.find((brick) => brick.id === selectedId);
    if (!target) return;
    const part = partById(target.partId);
    const { fw, fl } = footprint(part, target.rot);
    const shifts = [
      [fw, 0],
      [0, fl],
      [-fw, 0],
      [0, -fl],
      [fw, fl],
    ];
    for (const [dx, dz] of shifts) {
      const draft: Draft = { ...target, gx: target.gx + dx!, gz: target.gz + dz! };
      if (placementValid(bricks, draft, undefined, floatOK).ok) {
        const copy: Brick = { ...draft, id: uid() };
        set((state) => withPast(state, [...state.bricks, copy], { selectedId: copy.id }));
        markBorn(copy.id);
        sfx.place();
        return;
      }
    }
    sfx.deny();
    get().showToast("No room to duplicate");
  },

  liftSelected: () => {
    const { selectedId, bricks } = get();
    if (!selectedId) return;
    const target = bricks.find((brick) => brick.id === selectedId);
    if (!target) return;
    set((state) =>
      withPast(state, state.bricks.filter((brick) => brick.id !== selectedId), {
        selectedId: null,
        mode: "build",
        partId: target.partId,
        family: partById(target.partId).family,
        color: target.color,
        rot: target.rot,
      }),
    );
    sfx.ok();
    get().showToast("Lifted — tap to set it down");
  },

  undo: () => {
    const { past, bricks, future } = get();
    if (past.length === 0) {
      get().showToast("Nothing to undo");
      return;
    }
    const prev = past[past.length - 1]!;
    set({
      past: past.slice(0, -1),
      future: [...future, bricks].slice(-60),
      bricks: prev,
      selectedId: null,
    });
    sfx.undo();
  },

  redo: () => {
    const { past, bricks, future } = get();
    if (future.length === 0) {
      get().showToast("Nothing to redo");
      return;
    }
    const next = future[future.length - 1]!;
    set({
      future: future.slice(0, -1),
      past: [...past, bricks].slice(-60),
      bricks: next,
      selectedId: null,
    });
    sfx.undo();
  },

  clearAll: () => {
    if (get().bricks.length === 0) return;
    set((state) => withPast(state, [], { selectedId: null }));
    sfx.remove();
    get().showToast("Baseplate cleared");
  },

  replaceDoc: (doc, remember) => {
    set((state) => {
      const past = remember ? [...state.past, state.bricks].slice(-60) : [];
      return {
        past,
        future: [],
        bricks: doc.bricks,
        baseColor: doc.baseColor,
        selectedId: null,
      };
    });
  },

  markBooted: () => set({ booted: true }),

  currentDoc: () => ({
    version: 1,
    bricks: get().bricks,
    baseColor: get().baseColor,
  }),
}));
