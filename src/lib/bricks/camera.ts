import { partById, footprint, type Brick } from "@/lib/bricks/parts";
import { PLATE } from "@/lib/bricks/parts";

export const cameraGoal = {
  theta: 0.72,
  phi: 1.02,
  radius: 26,
  x: 0,
  y: 0.7,
  z: 0,
  trauma: 0,
};

let shakeOn = true;

export function setShakeEnabled(on: boolean) {
  shakeOn = on;
  if (!on) cameraGoal.trauma = 0;
}

export function addTrauma(amount: number) {
  if (!shakeOn) return;
  cameraGoal.trauma = Math.min(1, cameraGoal.trauma + amount);
}

export function resetCamera() {
  cameraGoal.theta = 0.72;
  cameraGoal.phi = 1.02;
  cameraGoal.radius = 26;
  cameraGoal.x = 0;
  cameraGoal.y = 0.7;
  cameraGoal.z = 0;
}

export function zoomBy(factor: number) {
  cameraGoal.radius = Math.min(70, Math.max(8, cameraGoal.radius * factor));
}

export function frameBricks(bricks: Brick[]) {
  if (bricks.length === 0) {
    resetCamera();
    return;
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const brick of bricks) {
    const part = partById(brick.partId);
    const { fw, fl } = footprint(part, brick.rot);
    const x0 = brick.gx;
    const x1 = brick.gx + fw;
    const z0 = brick.gz;
    const z1 = brick.gz + fl;
    const y0 = brick.gy * PLATE;
    const y1 = y0 + part.plates * PLATE;
    minX = Math.min(minX, x0);
    maxX = Math.max(maxX, x1);
    minZ = Math.min(minZ, z0);
    maxZ = Math.max(maxZ, z1);
    minY = Math.min(minY, y0);
    maxY = Math.max(maxY, y1);
  }
  cameraGoal.x = (minX + maxX) / 2;
  cameraGoal.z = (minZ + maxZ) / 2;
  cameraGoal.y = Math.max(0.4, (minY + maxY) / 2);
  const span = Math.max(maxX - minX, maxZ - minZ, (maxY - minY) * 1.4);
  cameraGoal.radius = Math.min(70, Math.max(10, span * 1.25 + 8));
  cameraGoal.phi = 1.0;
}
