import { useEffect, useState } from "react";
import { cameraGoal, frameBricks, setShakeEnabled, zoomBy } from "@/lib/bricks/camera";
import { setSoundEnabled, unlockAudio } from "@/lib/bricks/audio";
import { COLORS, HOT_PARTS } from "@/lib/bricks/parts";
import { saveDoc, loadDoc } from "@/lib/bricks/storage";
import { useStudio } from "@/lib/bricks/store";
import { Splash, StudioChrome } from "@/components/studio/hud";
import { BrickCanvas } from "@/components/studio/scene";

export function Studio() {
  const [ready, setReady] = useState(false);
  const [entered, setEntered] = useState(false);
  const [open, setOpen] = useState<"projects" | "help" | null>(null);
  const bricks = useStudio((s) => s.bricks.length);

  useEffect(() => {
    if (sessionStorage.getItem("bricklab.entered") === "1") setEntered(true);
    const saved = loadDoc();
    if (saved && (saved.bricks.length > 0 || saved.baseColor)) {
      useStudio.getState().replaceDoc(saved, false);
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      useStudio.setState({ shake: false });
      setShakeEnabled(false);
    }
    setSoundEnabled(useStudio.getState().sound);
    useStudio.getState().markBooted();
    setReady(true);

    let timer = 0;
    const unsub = useStudio.subscribe((state, prev) => {
      if (!useStudio.getState().booted) return;
      if (state.sound !== prev.sound) setSoundEnabled(state.sound);
      if (state.shake !== prev.shake) setShakeEnabled(state.shake);
      if (state.bricks === prev.bricks && state.baseColor === prev.baseColor) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => saveDoc(useStudio.getState().currentDoc()), 400);
    });
    return () => {
      unsub();
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const studio = useStudio.getState();
      const key = event.key;
      const meta = event.metaKey || event.ctrlKey;

      if (key === "Escape") {
        setOpen(null);
        studio.select(null);
        return;
      }
      if (meta && key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) studio.redo();
        else studio.undo();
        return;
      }
      if (meta && key.toLowerCase() === "y") {
        event.preventDefault();
        studio.redo();
        return;
      }
      if (meta && key.toLowerCase() === "d") {
        event.preventDefault();
        studio.duplicateSelected();
        return;
      }
      if (meta && key.toLowerCase() === "s") {
        event.preventDefault();
        saveDoc(studio.currentDoc());
        studio.showToast("Saved on this device");
        return;
      }
      if (key === "?" ) {
        setOpen("help");
        return;
      }
      if (open) return;

      if (key === "Backspace" || key === "Delete") {
        studio.removeSelected();
        return;
      }
      if (key === "r" || key === "R" || key === "e" || key === "E") {
        studio.rotateTool(1);
        return;
      }
      if (key === "q" || key === "Q") {
        studio.rotateTool(-1);
        return;
      }
      if (key >= "1" && key <= "8") {
        const id = HOT_PARTS[Number(key) - 1];
        if (id) studio.setPart(id);
        return;
      }
      if (key === "b" || key === "B") studio.setMode("build");
      if (key === "p" || key === "P") studio.setMode("paint");
      if (key === "v" || key === "V") studio.setMode("select");
      if (key === "l" || key === "L") studio.setMode("look");
      if (key === "m" || key === "M") studio.toggleMirror();
      if (key === "g" || key === "G") studio.toggleGrid();
      if (key === "f" || key === "F") frameBricks(studio.bricks);
      if (key === "i" || key === "I") studio.toggleEyedrop();
      if (key === "[" || key === "]") {
        const index = COLORS.findIndex((swatch) => swatch.hex === studio.color);
        const dir = key === "]" ? 1 : -1;
        const next = COLORS[(index + dir + COLORS.length) % COLORS.length]!;
        studio.setColor(next.hex);
      }
      if (key === "=" || key === "+") zoomBy(0.86);
      if (key === "-" || key === "_") zoomBy(1.16);

      const nudging = studio.mode === "select" && studio.selectedId;
      if (key.startsWith("Arrow")) event.preventDefault();
      if (nudging) {
        if (key === "ArrowLeft") studio.nudgeSelected(-1, 0, 0);
        if (key === "ArrowRight") studio.nudgeSelected(1, 0, 0);
        if (key === "ArrowUp") studio.nudgeSelected(0, event.shiftKey ? 0 : -1, event.shiftKey ? 1 : 0);
        if (key === "ArrowDown") studio.nudgeSelected(0, event.shiftKey ? 0 : 1, event.shiftKey ? -1 : 0);
        return;
      }
      if (key === "ArrowLeft") cameraGoal.theta += 0.1;
      if (key === "ArrowRight") cameraGoal.theta -= 0.1;
      if (key === "ArrowUp") cameraGoal.phi = Math.max(0.22, cameraGoal.phi - 0.06);
      if (key === "ArrowDown") cameraGoal.phi = Math.min(1.28, cameraGoal.phi + 0.06);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-ink">
      {ready ? <BrickCanvas /> : null}
      <StudioChrome open={open} setOpen={setOpen} started={entered} />
      {entered ? null : (
        <Splash
          bricks={bricks}
          onStart={() => {
            unlockAudio();
            sessionStorage.setItem("bricklab.entered", "1");
            setEntered(true);
          }}
        />
      )}
    </main>
  );
}
