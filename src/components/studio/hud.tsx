import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Boxes,
  Copy,
  Download,
  FlipHorizontal2,
  Focus,
  Grid3x3,
  ImageDown,
  Keyboard,
  MousePointer2,
  Orbit,
  Paintbrush,
  Pipette,
  Redo2,
  RotateCw,
  Save,
  SlidersHorizontal,
  Trash2,
  Undo2,
  Upload,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { frameBricks, resetCamera, zoomBy } from "@/lib/bricks/camera";
import {
  BASE_COLORS,
  COLORS,
  FAMILIES,
  PARTS,
  partById,
  studCount,
} from "@/lib/bricks/parts";
import {
  downloadText,
  loadSlots,
  normalizeBricks,
  parseDoc,
  saveDoc,
  SLOT_IDS,
  writeSlots,
  type Doc,
  type Slot,
  type SlotId,
} from "@/lib/bricks/storage";
import { useStudio, type Mode } from "@/lib/bricks/store";

const MODES: { id: Mode; label: string; icon: ReactNode }[] = [
  { id: "build", label: "Build", icon: <Boxes className="size-4" /> },
  { id: "paint", label: "Paint", icon: <Paintbrush className="size-4" /> },
  { id: "select", label: "Select", icon: <MousePointer2 className="size-4" /> },
  { id: "look", label: "Look", icon: <Orbit className="size-4" /> },
];

function IconBtn({
  label,
  onClick,
  children,
  hot,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  hot?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`grid size-11 place-items-center rounded-xl transition ${hot ? "bg-amber text-ink" : "text-cream hover:bg-ink-2"}`}
    >
      {children}
    </button>
  );
}

export function StudioChrome({
  open,
  setOpen,
  started,
}: {
  open: "projects" | "help" | null;
  setOpen: (next: "projects" | "help" | null) => void;
  started: boolean;
}) {
  const bricks = useStudio((s) => s.bricks);
  const mode = useStudio((s) => s.mode);
  const family = useStudio((s) => s.family);
  const partId = useStudio((s) => s.partId);
  const color = useStudio((s) => s.color);
  const selectedId = useStudio((s) => s.selectedId);
  const toast = useStudio((s) => s.toast);
  const eyedrop = useStudio((s) => s.eyedrop);
  const mirror = useStudio((s) => s.mirror);
  const setMode = useStudio((s) => s.setMode);
  const setFamily = useStudio((s) => s.setFamily);
  const setPart = useStudio((s) => s.setPart);
  const setColor = useStudio((s) => s.setColor);
  const selected = bricks.find((brick) => brick.id === selectedId) ?? null;

  return (
    <div className="safe-pad pointer-events-none absolute inset-0 z-10 flex flex-col gap-3">
      {started ? (
      <header className="flex items-start justify-between gap-2">
        <div className="hud-panel pointer-events-auto min-w-0 rounded-2xl px-3 py-2">
          <div className="nabla text-2xl sm:text-4xl">BRICK LAB</div>
          <p className="text-xs font-semibold text-muted tabular-nums">
            {bricks.length} bricks · {studCount(bricks)} studs
          </p>
        </div>
        <div className="hud-panel pointer-events-auto flex shrink-0 items-center gap-1 rounded-2xl p-1">
          <IconBtn label="Undo" onClick={() => useStudio.getState().undo()}>
            <Undo2 className="size-5" />
          </IconBtn>
          <IconBtn label="Redo" onClick={() => useStudio.getState().redo()}>
            <Redo2 className="size-5" />
          </IconBtn>
          <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
          <span className="hidden sm:contents">
            <IconBtn label="Zoom in" onClick={() => zoomBy(0.86)}>
              <ZoomIn className="size-5" />
            </IconBtn>
            <IconBtn label="Zoom out" onClick={() => zoomBy(1.16)}>
              <ZoomOut className="size-5" />
            </IconBtn>
            <IconBtn label="Frame build" onClick={() => frameBricks(useStudio.getState().bricks)}>
              <Focus className="size-5" />
            </IconBtn>
          </span>
          <span className="mx-1 hidden h-6 w-px bg-line md:block" />
          <span className="hidden md:contents">
            <IconBtn label="Shortcuts" onClick={() => setOpen(open === "help" ? null : "help")}>
              <Keyboard className="size-5" />
            </IconBtn>
          </span>
          <IconBtn label="Projects" onClick={() => setOpen(open === "projects" ? null : "projects")} hot={open === "projects"}>
            <SlidersHorizontal className="size-5" />
          </IconBtn>
        </div>
      </header>
      ) : (
        <div />
      )}

      <div className="flex flex-1 flex-col items-center justify-end">
        {toast ? (
          <div className="hud-panel mb-3 rounded-full px-4 py-2 text-sm font-semibold text-amber">{toast}</div>
        ) : started && bricks.length === 0 ? (
          <p className="mb-3 text-sm font-medium text-muted">Tap the baseplate to set a brick down</p>
        ) : null}
      </div>

      {started ? (
      <footer className="pointer-events-auto mx-auto flex w-full max-w-3xl flex-col gap-2">
        {selected ? (
          <div className="hud-panel flex items-center gap-2 rounded-2xl p-1.5">
            <span className="hidden min-w-0 flex-1 truncate px-2 text-sm font-semibold sm:block">
              {partById(selected.partId).name} {partById(selected.partId).family}
            </span>
            <IconBtn label="Rotate brick" onClick={() => useStudio.getState().rotateSelected()}>
              <RotateCw className="size-5" />
            </IconBtn>
            <IconBtn label="Duplicate" onClick={() => useStudio.getState().duplicateSelected()}>
              <Copy className="size-5" />
            </IconBtn>
            <IconBtn label="Lift brick" onClick={() => useStudio.getState().liftSelected()}>
              <Upload className="size-5" />
            </IconBtn>
            <IconBtn label="Delete brick" onClick={() => useStudio.getState().removeSelected()}>
              <Trash2 className="size-5 text-danger" />
            </IconBtn>
          </div>
        ) : null}

        <div className="hud-panel grid grid-cols-4 gap-1 rounded-2xl p-1.5" role="tablist" aria-label="Tool">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={mode === item.id}
              onClick={() => setMode(item.id)}
              className={`flex h-11 items-center justify-center gap-1 rounded-xl px-1 text-xs font-bold transition sm:gap-1.5 sm:text-sm ${
                mode === item.id ? "bg-amber text-ink" : "text-cream hover:bg-ink-2"
              }`}
            >
              <span className="hidden sm:inline-flex">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="hud-panel flex flex-col gap-2 rounded-2xl p-2">
          <div className="scroll-thin flex items-center gap-2 overflow-x-auto">
            <IconBtn label="Eyedropper" onClick={() => useStudio.getState().toggleEyedrop()} hot={eyedrop}>
              <Pipette className="size-5" />
            </IconBtn>
            {COLORS.map((swatch) => {
              const active = swatch.hex === color;
              return (
                <button
                  key={swatch.id}
                  type="button"
                  aria-label={swatch.name}
                  title={swatch.name}
                  onClick={() => setColor(swatch.hex)}
                  className={`size-11 shrink-0 rounded-xl border-2 ${active ? "border-amber" : "border-line"}`}
                  style={{ backgroundColor: swatch.hex }}
                />
              );
            })}
          </div>
          <div className="flex gap-1 overflow-x-auto">
            {FAMILIES.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFamily(item.id)}
                className={`h-11 shrink-0 rounded-lg px-3 text-xs font-bold ${
                  family === item.id ? "bg-amber text-ink" : "text-muted hover:text-cream"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="scroll-thin flex gap-1.5 overflow-x-auto pb-0.5">
            {PARTS.filter((part) => part.family === family).map((part) => (
              <button
                key={part.id}
                type="button"
                onClick={() => setPart(part.id)}
                className={`h-11 shrink-0 rounded-xl border px-3 text-sm font-bold ${
                  partId === part.id
                    ? "border-amber bg-amber text-ink"
                    : "border-line bg-ink-2 text-cream hover:border-amber"
                }`}
              >
                {part.name}
              </button>
            ))}
            <button
              type="button"
              aria-label="Rotate piece"
              onClick={() => useStudio.getState().rotateTool()}
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line text-amber"
            >
              <RotateCw className="size-5" />
            </button>
            <button
              type="button"
              aria-pressed={mirror}
              onClick={() => useStudio.getState().toggleMirror()}
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl border ${
                mirror ? "border-amber bg-amber text-ink" : "border-line text-cream"
              }`}
            >
              <FlipHorizontal2 className="size-5" />
            </button>
          </div>
        </div>
      </footer>
      ) : null}

      {open === "projects" ? <Projects onClose={() => setOpen(null)} /> : null}
      {open === "help" ? <Help onClose={() => setOpen(null)} /> : null}
    </div>
  );
}

function Projects({ onClose }: { onClose: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [slots, setSlots] = useState<Partial<Record<SlotId, Slot>>>({});
  const [confirmClear, setConfirmClear] = useState(false);
  const baseColor = useStudio((s) => s.baseColor);
  const sound = useStudio((s) => s.sound);
  const shake = useStudio((s) => s.shake);
  const grid = useStudio((s) => s.grid);
  const floatOK = useStudio((s) => s.floatOK);
  const mirror = useStudio((s) => s.mirror);

  useEffect(() => {
    setSlots(loadSlots());
  }, []);

  const saveSlot = (id: SlotId) => {
    const doc = useStudio.getState().currentDoc();
    const next = {
      ...slots,
      [id]: { name: `Build ${id.toUpperCase()}`, savedAt: Date.now(), doc },
    };
    setSlots(next);
    writeSlots(next);
    saveDoc(doc);
    useStudio.getState().showToast(`Saved to build ${id.toUpperCase()}`);
  };

  const loadSlot = (id: SlotId) => {
    const slot = slots[id];
    if (!slot) return;
    useStudio.getState().replaceDoc(slot.doc, true);
    saveDoc(slot.doc);
    useStudio.getState().showToast(`Loaded build ${id.toUpperCase()}`);
    onClose();
  };

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const data = JSON.parse(await file.text()) as unknown;
      let doc: Doc | null = null;
      if (Array.isArray(data)) {
        const bricks = normalizeBricks(data);
        if (bricks) doc = { version: 1, bricks, baseColor: useStudio.getState().baseColor };
      } else {
        doc = parseDoc(data);
      }
      if (!doc) throw new Error("bad");
      useStudio.getState().replaceDoc(doc, true);
      saveDoc(doc);
      useStudio.getState().showToast("Project imported");
      onClose();
    } catch {
      useStudio.getState().showToast("That file isn't a Brick Lab build");
    }
  };

  return (
    <div className="pointer-events-auto fixed inset-0 z-20 flex items-end justify-center bg-ink/70 p-3 sm:items-center" role="presentation" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Projects"
        className="hud-panel sheet w-full max-w-lg overflow-y-auto rounded-3xl p-4 sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="nabla text-3xl">Projects</h2>
          <IconBtn label="Close" onClick={onClose}>
            <X className="size-5" />
          </IconBtn>
        </div>

        <p className="mb-2 text-xs font-bold tracking-widest text-muted">BASEPLATE</p>
        <div className="mb-4 flex gap-2">
          {BASE_COLORS.map((swatch) => (
            <button
              key={swatch.id}
              type="button"
              aria-label={swatch.name}
              onClick={() => useStudio.getState().setBaseColor(swatch.hex)}
              className={`size-11 rounded-xl border-2 ${baseColor === swatch.hex ? "border-amber" : "border-line"}`}
              style={{ backgroundColor: swatch.hex }}
            />
          ))}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <Toggle label="Mirror" on={mirror} onClick={() => useStudio.getState().toggleMirror()} icon={<FlipHorizontal2 className="size-4" />} />
          <Toggle label="Stud grid" on={grid} onClick={() => useStudio.getState().toggleGrid()} icon={<Grid3x3 className="size-4" />} />
          <Toggle label="Allow float" on={floatOK} onClick={() => useStudio.getState().toggleFloat()} icon={<Orbit className="size-4" />} />
          <Toggle
            label={sound ? "Sound on" : "Sound off"}
            on={sound}
            onClick={() => useStudio.getState().toggleSound()}
            icon={sound ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          />
          <Toggle label="Camera kick" on={shake} onClick={() => useStudio.getState().toggleShake()} icon={<Focus className="size-4" />} />
          <button
            type="button"
            onClick={() => {
              resetCamera();
              useStudio.getState().showToast("Camera reset");
            }}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line text-sm font-bold"
          >
            Reset view
          </button>
        </div>

        <p className="mb-2 text-xs font-bold tracking-widest text-muted">SAVED BUILDS</p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {SLOT_IDS.map((id) => {
            const slot = slots[id];
            return (
              <div key={id} className="rounded-2xl border border-line bg-ink-2 p-3">
                <p className="text-sm font-bold">Build {id.toUpperCase()}</p>
                <p className="text-xs text-muted">{slot ? `${slot.doc.bricks.length} bricks` : "Empty"}</p>
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => saveSlot(id)} className="h-10 flex-1 rounded-xl bg-amber text-sm font-bold text-ink">
                    Save
                  </button>
                  <button
                    type="button"
                    disabled={!slot}
                    onClick={() => loadSlot(id)}
                    className="h-10 flex-1 rounded-xl border border-line text-sm font-bold disabled:opacity-40"
                  >
                    Load
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <SheetBtn
            label="Export JSON"
            icon={<Download className="size-4" />}
            onClick={() => {
              const doc = useStudio.getState().currentDoc();
              downloadText("brick-lab.json", JSON.stringify(doc, null, 2), "application/json");
              useStudio.getState().showToast("JSON downloaded");
            }}
          />
          <SheetBtn label="Import JSON" icon={<Upload className="size-4" />} onClick={() => fileRef.current?.click()} />
          <SheetBtn
            label="Save PNG"
            icon={<ImageDown className="size-4" />}
            onClick={() => {
              const canvas = document.querySelector("canvas");
              if (!canvas) return;
              const link = document.createElement("a");
              link.href = canvas.toDataURL("image/png");
              link.download = "brick-lab.png";
              link.click();
              useStudio.getState().showToast("Picture saved");
            }}
          />
          <SheetBtn
            label="Quick save"
            icon={<Save className="size-4" />}
            onClick={() => {
              saveDoc(useStudio.getState().currentDoc());
              useStudio.getState().showToast("Saved on this device");
            }}
          />
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(event) => {
            void onFile(event.target.files?.[0]);
            event.target.value = "";
          }}
        />

        <div className="mt-3 flex gap-2 sm:hidden">
          <SheetBtn label="Zoom in" icon={<ZoomIn className="size-4" />} onClick={() => zoomBy(0.86)} />
          <SheetBtn label="Zoom out" icon={<ZoomOut className="size-4" />} onClick={() => zoomBy(1.16)} />
          <SheetBtn label="Frame" icon={<Focus className="size-4" />} onClick={() => frameBricks(useStudio.getState().bricks)} />
        </div>

        {confirmClear ? (
          <div className="mt-4 rounded-2xl border border-danger bg-ink p-3">
            <p className="text-sm font-semibold">Clear every brick? You can still undo it.</p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  useStudio.getState().clearAll();
                  setConfirmClear(false);
                  onClose();
                }}
                className="h-11 flex-1 rounded-xl bg-danger text-sm font-bold text-cream"
              >
                Clear
              </button>
              <button type="button" onClick={() => setConfirmClear(false)} className="h-11 flex-1 rounded-xl border border-line text-sm font-bold">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-line text-sm font-bold text-danger"
          >
            <Trash2 className="size-4" />
            Clear baseplate
          </button>
        )}
      </div>
    </div>
  );
}

function Toggle({ label, on, onClick, icon }: { label: string; on: boolean; onClick: () => void; icon: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-bold ${
        on ? "border-amber bg-amber text-ink" : "border-line text-cream"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function SheetBtn({ label, onClick, icon }: { label: string; onClick: () => void; icon: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 items-center justify-center gap-2 rounded-xl border border-line text-sm font-bold"
    >
      {icon}
      {label}
    </button>
  );
}

function Help({ onClose }: { onClose: () => void }) {
  const rows = [
    ["Tap", "Place, paint, or select"],
    ["Drag", "Orbit the studio"],
    ["Scroll / pinch", "Zoom"],
    ["Shift + drag", "Pan"],
    ["Right click, R, E", "Rotate clockwise"],
    ["Q", "Rotate the other way"],
    ["Del", "Delete selection"],
    ["Arrows", "Nudge a selected brick"],
    ["Shift + up / down", "Raise or lower it"],
    ["Ctrl Z / Y", "Undo and redo"],
    ["Ctrl D", "Duplicate"],
    ["Ctrl S", "Save on this device"],
    ["1 – 8", "Favorite brick sizes"],
    ["B P V L", "Build, paint, select, look"],
    ["[ ]", "Previous / next color"],
    ["M G F I", "Mirror, grid, frame, eyedrop"],
  ];
  return (
    <div className="pointer-events-auto fixed inset-0 z-20 flex items-end justify-center bg-ink/70 p-3 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Shortcuts"
        className="hud-panel sheet w-full max-w-md overflow-y-auto rounded-3xl p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="nabla text-3xl">Shortcuts</h2>
          <IconBtn label="Close" onClick={onClose}>
            <X className="size-5" />
          </IconBtn>
        </div>
        <ul className="space-y-2">
          {rows.map(([key, action]) => (
            <li key={key} className="flex items-baseline justify-between gap-4 text-sm">
              <span className="font-semibold text-amber">{key}</span>
              <span className="text-right text-cream">{action}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Splash({ bricks, onStart }: { bricks: number; onStart: () => void }) {
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-ink/80 p-4 sm:items-center">
      <div className="hud-panel w-full max-w-md rounded-3xl p-6 sm:p-8">
        <p className="text-xs font-bold tracking-widest text-amber">STUDIO</p>
        <h1 className="nabla mt-1 text-6xl sm:text-7xl">BRICK LAB</h1>
        <p className="mt-3 text-pretty text-base leading-relaxed text-muted">
          A bench for studs. Pieces snap to the grid, refuse to overlap, and only sit where something holds them up.
        </p>
        <ul className="mt-4 space-y-1.5 text-sm font-medium text-cream">
          <li>Tap to place. Drag to look around. Pinch or scroll to zoom.</li>
          <li>Plates, tiles, rounds, and slopes live in the tray.</li>
          <li>Right-click or press R to turn the piece in your hand.</li>
        </ul>
        <button
          type="button"
          onClick={onStart}
          className="mt-6 h-12 w-full rounded-2xl bg-amber text-base font-extrabold text-ink"
        >
          {bricks > 0 ? `Resume · ${bricks} bricks` : "Start building"}
        </button>
      </div>
    </div>
  );
}
