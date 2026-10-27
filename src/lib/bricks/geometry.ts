import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Part } from "@/lib/bricks/parts";

const GAP = 0.055;
const STUD_R = 0.28;
const STUD_H = 0.17;

const cache = new Map<string, THREE.BufferGeometry>();
const plastics = new Map<string, THREE.MeshPhysicalMaterial>();

function bare(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const next = geo.index ? geo.toNonIndexed() : geo;
  if (next !== geo) geo.dispose();
  next.deleteAttribute("uv");
  next.computeVertexNormals();
  return next;
}

function studGeo(x: number, y: number, z: number): THREE.BufferGeometry {
  const geo = bare(new THREE.CylinderGeometry(STUD_R, STUD_R, STUD_H, 18));
  geo.translate(x, y, z);
  return geo;
}

function boxPart(part: Part): THREE.BufferGeometry {
  const h = part.plates * 0.4;
  const body = bare(new THREE.BoxGeometry(part.w - GAP, h, part.l - GAP));
  body.translate(0, h / 2, 0);
  const pieces = [body];
  if (part.studs) {
    const x0 = -part.w / 2 + 0.5;
    const z0 = -part.l / 2 + 0.5;
    for (let x = 0; x < part.w; x++) {
      for (let z = 0; z < part.l; z++) {
        pieces.push(studGeo(x0 + x, h + STUD_H / 2, z0 + z));
      }
    }
  }
  return mergeGeometries(pieces, false) ?? body;
}

function roundPart(part: Part): THREE.BufferGeometry {
  const h = part.plates * 0.4;
  const body = bare(new THREE.CylinderGeometry(0.46, 0.46, h, 28));
  body.translate(0, h / 2, 0);
  const pieces = [body];
  if (part.studs) pieces.push(studGeo(0, h + STUD_H / 2, 0));
  return mergeGeometries(pieces, false) ?? body;
}

function slopePart(part: Part): THREE.BufferGeometry {
  const h = part.plates * 0.4;
  const hw = part.w / 2 - GAP / 2;
  const hl = part.l / 2 - GAP / 2;
  const p = [
    [-hw, 0, -hl],
    [hw, 0, -hl],
    [hw, 0, hl],
    [-hw, 0, hl],
    [hw, h, hl],
    [-hw, h, hl],
  ];
  const faces = [
    [0, 1, 2],
    [0, 2, 3],
    [3, 2, 4],
    [3, 4, 5],
    [0, 4, 1],
    [0, 5, 4],
    [0, 3, 5],
    [1, 4, 2],
  ];
  const positions: number[] = [];
  for (const face of faces) {
    for (const index of face) {
      const v = p[index]!;
      positions.push(v[0]!, v[1]!, v[2]!);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const pieces = [bare(geo)];
  if (part.studs) {
    const z = hl - 0.5;
    const x0 = -part.w / 2 + 0.5;
    for (let x = 0; x < part.w; x++) pieces.push(studGeo(x0 + x, h + STUD_H / 2, z));
  }
  return mergeGeometries(pieces, false) ?? geo;
}

export function geometryFor(part: Part): THREE.BufferGeometry {
  const hit = cache.get(part.id);
  if (hit) return hit;
  const geo = part.shape === "round" ? roundPart(part) : part.shape === "slope" ? slopePart(part) : boxPart(part);
  cache.set(part.id, geo);
  return geo;
}

export function plasticMaterial(hex: string): THREE.MeshPhysicalMaterial {
  const key = hex.toLowerCase();
  const existing = plastics.get(key);
  if (existing) return existing;
  const material = new THREE.MeshPhysicalMaterial({
    color: key,
    roughness: 0.36,
    metalness: 0.04,
    clearcoat: 0.65,
    clearcoatRoughness: 0.24,
  });
  plastics.set(key, material);
  return material;
}

export function ghostMaterial(): THREE.MeshPhysicalMaterial {
  return new THREE.MeshPhysicalMaterial({
    color: "#3dd68c",
    emissive: "#145c38",
    emissiveIntensity: 0.35,
    roughness: 0.28,
    metalness: 0,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  });
}
