import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { cameraGoal } from "@/lib/bricks/camera";
import { geometryFor, ghostMaterial, plasticMaterial } from "@/lib/bricks/geometry";
import { bornEntries, onSpark } from "@/lib/bricks/juice";
import {
  footprint,
  partById,
  placementValid,
  PLATE,
  poseOf,
  snapAnchor,
  SPAN,
  type Brick,
} from "@/lib/bricks/parts";
import { useStudio } from "@/lib/bricks/store";

const ghostBind: {
  group: THREE.Group | null;
  mat: THREE.MeshPhysicalMaterial | null;
} = { group: null, mat: null };

const sparkDummy = new THREE.Object3D();
const sparkColor = new THREE.Color();

function BrickMesh({ brick, selected }: { brick: Brick; selected: boolean }) {
  const part = partById(brick.partId);
  const pose = poseOf(brick);
  return (
    <group
      name={`brick-${brick.id}`}
      position={[pose.x, pose.y, pose.z]}
      rotation={[0, brick.rot * (Math.PI / 2), 0]}
    >
      <mesh
        geometry={geometryFor(part)}
        material={plasticMaterial(brick.color)}
        castShadow
        receiveShadow
        userData={{ pick: "brick", id: brick.id, gy: brick.gy, plates: part.plates }}
      />
      {selected ? (
        <mesh geometry={geometryFor(part)} scale={[1.04, 1.025, 1.04]}>
          <meshBasicMaterial color="#f0a202" side={THREE.BackSide} transparent opacity={0.92} />
        </mesh>
      ) : null}
    </group>
  );
}

function Bricks() {
  const bricks = useStudio((s) => s.bricks);
  const selectedId = useStudio((s) => s.selectedId);
  return (
    <>
      {bricks.map((brick) => (
        <BrickMesh key={brick.id} brick={brick} selected={brick.id === selectedId} />
      ))}
    </>
  );
}

function Baseplate() {
  const color = useStudio((s) => s.baseColor);
  const width = SPAN * 2 + 1;
  const count = width * width;
  const studGeo = useMemo(() => new THREE.CylinderGeometry(0.3, 0.3, 0.15, 12), []);
  const plateMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0.05 }),
    [color],
  );
  const studMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.06 }),
    [color],
  );
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useLayoutEffect(() => {
    const inst = mesh.current;
    if (!inst) return;
    let i = 0;
    for (let x = -SPAN; x <= SPAN; x++) {
      for (let z = -SPAN; z <= SPAN; z++) {
        dummy.position.set(x, 0.075, z);
        dummy.updateMatrix();
        inst.setMatrixAt(i++, dummy.matrix);
      }
    }
    inst.instanceMatrix.needsUpdate = true;
  }, [dummy]);

  useEffect(() => {
    return () => {
      plateMat.dispose();
      studMat.dispose();
    };
  }, [plateMat, studMat]);

  return (
    <group>
      <mesh position={[0, -0.34, 0]} receiveShadow>
        <boxGeometry args={[width + 0.7, 0.28, width + 0.7]} />
        <meshStandardMaterial color="#14160f" roughness={0.95} />
      </mesh>
      <mesh position={[0, -0.12, 0]} receiveShadow userData={{ pick: "base" }}>
        <boxGeometry args={[width, 0.24, width]} />
        <primitive object={plateMat} attach="material" />
      </mesh>
      <instancedMesh ref={mesh} args={[studGeo, studMat, count]} raycast={() => null} />
    </group>
  );
}

function Ghost() {
  const partId = useStudio((s) => s.partId);
  const mat = useMemo(() => ghostMaterial(), []);
  const ref = useRef<THREE.Group>(null);
  useEffect(() => {
    ghostBind.group = ref.current;
    ghostBind.mat = mat;
    return () => {
      ghostBind.group = null;
      ghostBind.mat = null;
      mat.dispose();
    };
  }, [mat]);
  return (
    <group ref={ref} visible={false}>
      <mesh geometry={geometryFor(partById(partId))} material={mat} />
    </group>
  );
}

function GridOverlay() {
  const on = useStudio((s) => s.grid);
  const ref = useRef<THREE.GridHelper>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const materials = Array.isArray(ref.current.material) ? ref.current.material : [ref.current.material];
    materials.forEach((material) => {
      material.transparent = true;
      material.opacity = 0.32;
    });
  }, [on]);
  if (!on) return null;
  return <gridHelper ref={ref} args={[SPAN * 2, SPAN * 2, "#f0a202", "#2c3344"]} position={[0, 0.02, 0]} />;
}

function Sparks() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const sparks = useRef<
    { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; color: string }[]
  >([]);
  const geo = useMemo(() => new THREE.SphereGeometry(1, 8, 6), []);
  const mat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#ffffff", transparent: true, opacity: 0.95, toneMapped: false }),
    [],
  );

  useEffect(
    () =>
      onSpark((spark) => {
        for (let i = 0; i < 8; i++) {
          sparks.current.push({
            x: spark.x + (Math.random() - 0.5) * 0.5,
            y: spark.y,
            z: spark.z + (Math.random() - 0.5) * 0.5,
            vx: (Math.random() - 0.5) * 2.6,
            vy: 1.3 + Math.random() * 1.5,
            vz: (Math.random() - 0.5) * 2.6,
            life: 0.28 + Math.random() * 0.14,
            color: spark.color,
          });
        }
        if (sparks.current.length > 48) sparks.current.splice(0, sparks.current.length - 48);
      }),
    [],
  );

  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    const step = Math.min(dt, 0.05);
    const alive = [];
    let index = 0;
    for (const spark of sparks.current) {
      spark.life -= step;
      if (spark.life <= 0) continue;
      spark.vy -= 8 * step;
      spark.x += spark.vx * step;
      spark.y += spark.vy * step;
      spark.z += spark.vz * step;
      alive.push(spark);
      if (index >= 48) continue;
      sparkDummy.position.set(spark.x, spark.y, spark.z);
      sparkDummy.scale.setScalar(Math.max(0.02, spark.life * 0.18));
      sparkDummy.updateMatrix();
      mesh.setMatrixAt(index, sparkDummy.matrix);
      mesh.setColorAt(index, sparkColor.set(spark.color));
      index += 1;
    }
    sparks.current = alive;
    for (let i = index; i < 48; i++) {
      sparkDummy.position.set(0, -8, 0);
      sparkDummy.scale.setScalar(0.0001);
      sparkDummy.updateMatrix();
      mesh.setMatrixAt(i, sparkDummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return <instancedMesh ref={ref} args={[geo, mat, 48]} frustumCulled={false} raycast={() => null} />;
}

function Popper() {
  const { scene } = useThree();
  useFrame(() => {
    const now = performance.now();
    for (const [id, t0] of bornEntries()) {
      const obj = scene.getObjectByName(`brick-${id}`);
      const u = (now - t0) / 210;
      if (!obj) {
        if (u > 1) bornEntries().delete(id);
        continue;
      }
      if (u >= 1) {
        obj.scale.set(1, 1, 1);
        bornEntries().delete(id);
        continue;
      }
      const pop = 1 + Math.sin(u * Math.PI) * 0.065;
      obj.scale.set(pop, 0.88 + 0.12 * u, pop);
    }
  });
  return null;
}

function Rig() {
  const { camera, gl, scene } = useThree();
  const live = useRef({
    theta: cameraGoal.theta,
    phi: cameraGoal.phi,
    radius: cameraGoal.radius,
    x: cameraGoal.x,
    y: cameraGoal.y,
    z: cameraGoal.z,
  });

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "none";
    const pointers = new Map<number, { x: number; y: number }>();
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const normal = new THREE.Vector3();
    const pose = { gx: 0, gz: 0, gy: 0, valid: false };
    const drag = { down: false, moved: false, button: 0, x: 0, y: 0 };
    const last = { x: 0, y: 0 };
    let pinch: number | null = null;
    let hoverX = 0;
    let hoverY = 0;
    let hovered = false;

    const pick = (clientX: number, clientY: number) => {
      const rect = el.getBoundingClientRect();
      ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      for (const hit of hits) {
        let obj: THREE.Object3D | null = hit.object;
        while (obj) {
          if (obj.userData.pick) return { hit, obj };
          obj = obj.parent;
        }
      }
      return null;
    };

    const updateGhost = (clientX: number, clientY: number) => {
      const group = ghostBind.group;
      const mat = ghostBind.mat;
      const studio = useStudio.getState();
      if (!group || !mat) return;
      if (studio.mode !== "build") {
        group.visible = false;
        pose.valid = false;
        return;
      }
      const picked = pick(clientX, clientY);
      if (!picked?.hit.face) {
        group.visible = false;
        pose.valid = false;
        return;
      }
      normal.copy(picked.hit.face.normal).transformDirection(picked.obj.matrixWorld);
      const part = partById(studio.partId);
      const { fw, fl } = footprint(part, studio.rot);
      let px = picked.hit.point.x;
      let pz = picked.hit.point.z;
      let gy = 0;
      const kind = String(picked.obj.userData.pick);
      if (kind === "base") {
        gy = 0;
      } else if (normal.y > 0.55) {
        gy = Number(picked.obj.userData.gy) + Number(picked.obj.userData.plates);
      } else {
        gy = Number(picked.obj.userData.gy);
        px += Math.sign(normal.x) * 0.52;
        pz += Math.sign(normal.z) * 0.52;
      }
      let gx = snapAnchor(px, fw);
      let gz = snapAnchor(pz, fl);
      const draft = { partId: studio.partId, color: studio.color, gx, gz, gy, rot: studio.rot };
      let check = placementValid(studio.bricks, draft, undefined, studio.floatOK);
      if (!check.ok && check.reason === "overlap" && kind !== "base" && normal.y <= 0.55) {
        const sx = Math.abs(normal.x) >= Math.abs(normal.z) ? Math.sign(normal.x) : 0;
        const sz = Math.abs(normal.z) > Math.abs(normal.x) ? Math.sign(normal.z) : 0;
        for (let step = 1; step <= 4; step++) {
          const attempt = { ...draft, gx: gx + sx * step, gz: gz + sz * step };
          const next = placementValid(studio.bricks, attempt, undefined, studio.floatOK);
          if (next.ok) {
            gx = attempt.gx;
            gz = attempt.gz;
            check = next;
            break;
          }
        }
      }
      group.visible = true;
      group.position.set(gx + fw / 2, gy * PLATE, gz + fl / 2);
      group.rotation.y = (studio.rot * Math.PI) / 2;
      pose.gx = gx;
      pose.gz = gz;
      pose.gy = gy;
      pose.valid = check.ok;
      mat.color.set(check.ok ? "#3dd68c" : "#e5484d");
      mat.emissive.set(check.ok ? "#145c38" : "#6a1420");
    };

    const pan = (dx: number, dy: number) => {
      const scale = cameraGoal.radius * 0.00155;
      const ct = Math.cos(cameraGoal.theta);
      const st = Math.sin(cameraGoal.theta);
      cameraGoal.x -= (dx * ct + dy * st) * scale;
      cameraGoal.z -= (-dx * st + dy * ct) * scale;
      live.current.x = cameraGoal.x;
      live.current.z = cameraGoal.z;
    };

    const onDown = (ev: PointerEvent) => {
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pointers.size === 1) {
        drag.down = true;
        drag.moved = false;
        drag.button = ev.button;
        drag.x = ev.clientX;
        drag.y = ev.clientY;
        last.x = ev.clientX;
        last.y = ev.clientY;
      }
    };

    const onMove = (ev: PointerEvent) => {
      hoverX = ev.clientX;
      hoverY = ev.clientY;
      hovered = true;
      if (pointers.has(ev.pointerId)) pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

      if (pointers.size >= 2) {
        const pts = [...pointers.values()];
        const dist = Math.hypot(pts[0]!.x - pts[1]!.x, pts[0]!.y - pts[1]!.y);
        const midX = (pts[0]!.x + pts[1]!.x) / 2;
        const midY = (pts[0]!.y + pts[1]!.y) / 2;
        if (pinch != null && dist > 0) {
          cameraGoal.radius = Math.min(70, Math.max(8, cameraGoal.radius * (pinch / dist)));
          live.current.radius = cameraGoal.radius;
          pan(midX - last.x, midY - last.y);
        }
        pinch = dist;
        last.x = midX;
        last.y = midY;
        drag.moved = true;
        return;
      }
      pinch = null;

      if (!drag.down) {
        updateGhost(ev.clientX, ev.clientY);
        return;
      }

      const dx = ev.clientX - last.x;
      const dy = ev.clientY - last.y;
      last.x = ev.clientX;
      last.y = ev.clientY;
      if (Math.hypot(ev.clientX - drag.x, ev.clientY - drag.y) > 8) drag.moved = true;
      if (!drag.moved) {
        updateGhost(ev.clientX, ev.clientY);
        return;
      }

      const panning = ev.shiftKey || ev.altKey || drag.button === 1;
      if (panning) {
        pan(dx, dy);
        return;
      }
      cameraGoal.theta -= dx * 0.0052;
      cameraGoal.phi = Math.min(1.28, Math.max(0.22, cameraGoal.phi - dy * 0.0042));
      live.current.theta = cameraGoal.theta;
      live.current.phi = cameraGoal.phi;
    };

    const onUp = (ev: PointerEvent) => {
      const wasDown = drag.down && pointers.has(ev.pointerId);
      const wasMoved = drag.moved;
      const button = drag.button;
      pointers.delete(ev.pointerId);
      if (pointers.size < 2) pinch = null;
      if (pointers.size === 0) drag.down = false;
      if (!wasDown || wasMoved || button !== 0 || pointers.size > 0) return;

      const studio = useStudio.getState();
      const picked = pick(ev.clientX, ev.clientY);
      const brickId = picked?.obj.userData.pick === "brick" ? String(picked.obj.userData.id) : null;
      if (studio.eyedrop && brickId) {
        studio.sample(brickId);
        return;
      }
      if (studio.mode === "build") {
        updateGhost(ev.clientX, ev.clientY);
        if (picked) studio.place(pose.gx, pose.gz, pose.gy);
        return;
      }
      if (studio.mode === "paint" && brickId) studio.paint(brickId);
      if (studio.mode === "select") studio.select(brickId);
    };

    const onWindowUp = (ev: PointerEvent) => {
      pointers.delete(ev.pointerId);
      if (pointers.size === 0) drag.down = false;
    };

    const onWheel = (ev: WheelEvent) => {
      ev.preventDefault();
      cameraGoal.radius = Math.min(70, Math.max(8, cameraGoal.radius * Math.exp(ev.deltaY * 0.00105)));
      live.current.radius = cameraGoal.radius;
    };

    const onContext = (ev: Event) => {
      ev.preventDefault();
      useStudio.getState().rotateTool();
    };

    const onLeave = () => {
      hovered = false;
      drag.down = false;
      pointers.clear();
      pinch = null;
      if (ghostBind.group) ghostBind.group.visible = false;
    };

    const unsub = useStudio.subscribe(() => {
      if (hovered) updateGhost(hoverX, hoverY);
    });

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    window.addEventListener("pointerup", onWindowUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("contextmenu", onContext);
    el.addEventListener("pointerleave", onLeave);

    return () => {
      unsub();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      window.removeEventListener("pointerup", onWindowUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", onContext);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [camera, gl, scene]);

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05);
    const glide = 1 - Math.exp(-12 * step);
    const cam = live.current;
    cam.theta += (cameraGoal.theta - cam.theta) * glide;
    cam.phi += (cameraGoal.phi - cam.phi) * glide;
    cam.radius += (cameraGoal.radius - cam.radius) * glide;
    cam.x += (cameraGoal.x - cam.x) * glide;
    cam.y += (cameraGoal.y - cam.y) * glide;
    cam.z += (cameraGoal.z - cam.z) * glide;

    let sx = 0;
    let sy = 0;
    if (cameraGoal.trauma > 0) {
      cameraGoal.trauma = Math.max(0, cameraGoal.trauma - step * 1.7);
      const mag = cameraGoal.trauma * cameraGoal.trauma;
      const t = performance.now() * 0.03;
      sx = Math.sin(t * 9.1) * mag * 0.22;
      sy = Math.cos(t * 7.3) * mag * 0.14;
    }
    const sp = Math.sin(cam.phi);
    camera.position.set(
      cam.x + cam.radius * sp * Math.sin(cam.theta) + sx,
      cam.y + cam.radius * Math.cos(cam.phi) + sy,
      cam.z + cam.radius * sp * Math.cos(cam.theta),
    );
    camera.lookAt(cam.x, cam.y, cam.z);
  });

  return null;
}

export function BrickCanvas() {
  return (
    <Canvas
      className="touch-none"
      shadows
      dpr={[1, 1.7]}
      camera={{ fov: 42, near: 0.1, far: 220, position: [14, 16, 16] }}
      gl={{
        antialias: true,
        preserveDrawingBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      onCreated={({ gl }) => {
        gl.shadowMap.type = THREE.PCFSoftShadowMap;
      }}
    >
      <color attach="background" args={["#090b10"]} />
      <fog attach="fog" args={["#090b10", 34, 90]} />
      <hemisphereLight args={["#f6f1e6", "#1c2438", 0.72]} />
      <ambientLight intensity={0.2} />
      <directionalLight
        position={[16, 26, 12]}
        intensity={2.45}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={2}
        shadow-camera-far={72}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-bias={-0.00022}
      />
      <directionalLight position={[-12, 8, -10]} intensity={0.38} color="#9db7e8" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.56, 0]} receiveShadow>
        <circleGeometry args={[52, 48]} />
        <meshStandardMaterial color="#10131b" roughness={1} />
      </mesh>
      <Baseplate />
      <Bricks />
      <Ghost />
      <Sparks />
      <Popper />
      <GridOverlay />
      <Rig />
    </Canvas>
  );
}
