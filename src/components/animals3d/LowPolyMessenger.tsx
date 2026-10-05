"use client";

import { useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import type { MessengerId } from "@/lib/messengers";

export type Pose = "idle" | "travel" | "arrive";

type Props = {
  id: MessengerId;
  pose?: Pose;
  scale?: number;
};

export function LowPolyMessenger({ id, pose = "idle", scale = 1 }: Props) {
  const root = useRef<Group>(null);
  const wings = useRef<Group>(null);
  const neck = useRef<Group>(null);
  const extra = useRef<Group>(null);
  const poseStarted = useRef(0);

  useLayoutEffect(() => {
    poseStarted.current = 0;
  }, [id, pose]);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1);
    poseStarted.current += d;
    const t = poseStarted.current;
    const g = root.current;
    if (!g) return;

    g.scale.setScalar(scale);

    if (pose === "idle") {
      g.rotation.y = Math.sin(t * 0.7) * 0.35;
      g.position.y = Math.sin(t * 1.5) * 0.05;
      g.rotation.x = 0;
      g.rotation.z = 0;
      flap(wings.current, t, 6, 0.45);
      if (neck.current) neck.current.rotation.x = Math.sin(t * 1.2) * 0.08;
    }

    if (pose === "travel") {
      const air = id === "turtle" || id === "donkey" || id === "horse" ? false : true;
      if (air) {
        g.position.y = 0.12 + Math.sin(t * 3.2) * 0.1;
        g.rotation.z = Math.sin(t * 2.2) * 0.1;
        g.rotation.x = Math.sin(t * 1.4) * 0.05;
        flap(wings.current, t, id === "plane" ? 0.4 : 10, id === "plane" ? 0.08 : 0.7);
      } else {
        const beat = id === "horse" ? 9 : id === "donkey" ? 4.2 : 2.2;
        g.position.y = Math.abs(Math.sin(t * beat)) * (id === "horse" ? 0.12 : 0.06);
        g.rotation.z = Math.sin(t * beat) * 0.08;
        g.rotation.x = 0;
      }
      g.rotation.y = Math.sin(t * 0.4) * 0.15;
    }

    if (pose === "arrive") {
      playArrival(id, g, wings.current, neck.current, extra.current, t);
    }
  });

  const body = useMemo(() => <Body id={id} wings={wings} neck={neck} extra={extra} />, [id]);

  return (
    <group ref={root}>
      {body}
    </group>
  );
}

function flap(wings: Group | null, t: number, speed: number, amp: number) {
  if (!wings) return;
  const a = Math.sin(t * speed) * amp;
  wings.children[0] && (wings.children[0].rotation.z = a);
  wings.children[1] && (wings.children[1].rotation.z = -a);
}

function playArrival(
  id: MessengerId,
  g: Group,
  wings: Group | null,
  neck: Group | null,
  extra: Group | null,
  t: number,
) {
  const k = Math.min(1, t / 2.2);
  const ease = 1 - (1 - k) ** 3;

  if (id === "pigeon" || id === "stork") {
    g.position.y = 0.45 * (1 - ease);
    g.rotation.x = 0.15 * (1 - ease);
    flap(wings, t, 14 * (1 - ease) + 2, 0.8 * (1 - ease) + 0.1);
  } else if (id === "plane") {
    g.position.y = 0.55 * (1 - ease);
    g.rotation.x = 0.35 * (1 - ease);
    g.rotation.z = 0;
  } else if (id === "horse") {
    g.rotation.x = -Math.sin(Math.min(t, 1.4) * Math.PI) * 0.45;
    g.position.y = Math.max(0, Math.sin(Math.min(t, 1.4) * Math.PI) * 0.2);
  } else if (id === "donkey") {
    g.rotation.x = Math.sin(Math.min(t, 1.6) * Math.PI) * 0.35;
  } else if (id === "swan") {
    g.position.y = 0.08 * (1 - ease);
    flap(wings, t, 3, 0.15 * (1 - ease));
  } else if (id === "turtle") {
    if (neck) neck.rotation.x = -Math.sin(Math.min(t, 2) * 1.6) * 0.45;
    g.position.y = 0;
  }

  if (extra && (id === "stork" || id === "horse" || id === "donkey" || id === "swan")) {
    extra.visible = true;
    extra.position.y = -0.05 - ease * 0.45;
    extra.rotation.z = ease * 0.6;
  }
}

function Body({
  id,
  wings,
  neck,
  extra,
}: {
  id: MessengerId;
  wings: RefObject<Group | null>;
  neck: RefObject<Group | null>;
  extra: RefObject<Group | null>;
}) {
  switch (id) {
    case "pigeon":
      return (
        <group>
          <mesh position={[0, 0.12, 0]} castShadow>
            <sphereGeometry args={[0.28, 12, 12]} />
            <meshStandardMaterial color="#D9C4B0" roughness={0.55} />
          </mesh>
          <mesh position={[0.22, 0.28, 0]}>
            <sphereGeometry args={[0.14, 10, 10]} />
            <meshStandardMaterial color="#F7F1EA" />
          </mesh>
          <mesh position={[0.34, 0.26, 0]} rotation={[0, 0, -1.1]}>
            <coneGeometry args={[0.035, 0.14, 6]} />
            <meshStandardMaterial color="#C4A35A" />
          </mesh>
          <group ref={wings}>
            <mesh position={[0, 0.16, 0.22]} rotation={[0.2, 0.3, 0.2]}>
              <boxGeometry args={[0.38, 0.04, 0.16]} />
              <meshStandardMaterial color="#E85A7A" />
            </mesh>
            <mesh position={[0, 0.16, -0.22]} rotation={[-0.2, -0.3, -0.2]}>
              <boxGeometry args={[0.38, 0.04, 0.16]} />
              <meshStandardMaterial color="#E85A7A" />
            </mesh>
          </group>
          <LetterChip />
        </group>
      );
    case "horse":
      return (
        <group>
          <mesh position={[0, 0.18, 0]} castShadow>
            <boxGeometry args={[0.72, 0.32, 0.28]} />
            <meshStandardMaterial color="#8B5E3C" roughness={0.7} />
          </mesh>
          <mesh position={[0.36, 0.4, 0]}>
            <boxGeometry args={[0.16, 0.28, 0.16]} />
            <meshStandardMaterial color="#7A4E30" />
          </mesh>
          <mesh position={[0.5, 0.5, 0]}>
            <boxGeometry args={[0.24, 0.14, 0.14]} />
            <meshStandardMaterial color="#7A4E30" />
          </mesh>
          <mesh position={[-0.38, 0.28, 0]}>
            <boxGeometry args={[0.08, 0.28, 0.08]} />
            <meshStandardMaterial color="#5C3A24" />
          </mesh>
          <Leg x={0.22} z={0.1} />
          <Leg x={0.22} z={-0.1} />
          <Leg x={-0.22} z={0.1} />
          <Leg x={-0.22} z={-0.1} />
          <group ref={extra} visible={false} position={[0.05, 0.05, 0.18]}>
            <LetterChip />
          </group>
        </group>
      );
    case "donkey":
      return (
        <group>
          <mesh position={[0, 0.16, 0]} castShadow>
            <boxGeometry args={[0.6, 0.28, 0.24]} />
            <meshStandardMaterial color="#A89888" />
          </mesh>
          <mesh position={[0.3, 0.36, 0]}>
            <boxGeometry args={[0.16, 0.2, 0.16]} />
            <meshStandardMaterial color="#938274" />
          </mesh>
          <mesh position={[0.28, 0.54, 0.07]} rotation={[0, 0, 0.35]}>
            <boxGeometry args={[0.04, 0.22, 0.05]} />
            <meshStandardMaterial color="#6B5344" />
          </mesh>
          <mesh position={[0.28, 0.54, -0.07]} rotation={[0, 0, 0.35]}>
            <boxGeometry args={[0.04, 0.22, 0.05]} />
            <meshStandardMaterial color="#6B5344" />
          </mesh>
          <Leg x={0.18} z={0.08} />
          <Leg x={0.18} z={-0.08} />
          <Leg x={-0.18} z={0.08} />
          <Leg x={-0.18} z={-0.08} />
          <group ref={extra} visible={false} position={[0, 0.02, 0.16]}>
            <LetterChip />
          </group>
        </group>
      );
    case "stork":
      return (
        <group>
          <mesh position={[0, 0.22, 0]} castShadow>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshStandardMaterial color="#F7F2EA" />
          </mesh>
          <mesh position={[0.28, 0.24, 0]} rotation={[0, 0, -0.6]}>
            <coneGeometry args={[0.035, 0.38, 6]} />
            <meshStandardMaterial color="#E85A7A" />
          </mesh>
          <mesh position={[0, -0.12, 0]}>
            <cylinderGeometry args={[0.022, 0.022, 0.42, 6]} />
            <meshStandardMaterial color="#C4A35A" />
          </mesh>
          <group ref={wings}>
            <mesh position={[-0.04, 0.22, 0.2]} rotation={[0.15, 0.4, 0.2]}>
              <boxGeometry args={[0.46, 0.03, 0.16]} />
              <meshStandardMaterial color="#F4B8C5" />
            </mesh>
            <mesh position={[-0.04, 0.22, -0.2]} rotation={[-0.15, -0.4, -0.2]}>
              <boxGeometry args={[0.46, 0.03, 0.16]} />
              <meshStandardMaterial color="#F4B8C5" />
            </mesh>
          </group>
          <group ref={extra} visible={false} position={[0.12, -0.05, 0]}>
            <LetterChip />
          </group>
        </group>
      );
    case "swan":
      return (
        <group>
          <mesh position={[0, 0.06, 0]} scale={[1.25, 0.7, 0.85]} castShadow>
            <sphereGeometry args={[0.26, 14, 14]} />
            <meshStandardMaterial color="#F4EFE8" />
          </mesh>
          <group ref={neck} position={[0.18, 0.14, 0]}>
            <mesh position={[0.02, 0.16, 0]}>
              <cylinderGeometry args={[0.045, 0.05, 0.28, 8]} />
              <meshStandardMaterial color="#F4EFE8" />
            </mesh>
            <mesh position={[0.08, 0.3, 0]}>
              <sphereGeometry args={[0.09, 10, 10]} />
              <meshStandardMaterial color="#F4EFE8" />
            </mesh>
            <mesh position={[0.16, 0.28, 0]} rotation={[0, 0, -0.5]}>
              <coneGeometry args={[0.025, 0.1, 6]} />
              <meshStandardMaterial color="#E85A7A" />
            </mesh>
          </group>
          <group ref={wings}>
            <mesh position={[-0.02, 0.1, 0.18]} rotation={[0.3, 0.2, 0.15]}>
              <boxGeometry args={[0.34, 0.04, 0.18]} />
              <meshStandardMaterial color="#E8D9C8" />
            </mesh>
            <mesh position={[-0.02, 0.1, -0.18]} rotation={[-0.3, -0.2, -0.15]}>
              <boxGeometry args={[0.34, 0.04, 0.18]} />
              <meshStandardMaterial color="#E8D9C8" />
            </mesh>
          </group>
          <group ref={extra} visible={false} position={[0, 0.12, 0]}>
            <LetterChip />
          </group>
        </group>
      );
    case "turtle":
      return (
        <group>
          <mesh position={[0, 0.08, 0]} castShadow>
            <sphereGeometry args={[0.32, 12, 10]} />
            <meshStandardMaterial color="#3F6B54" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.18, 0]}>
            <cylinderGeometry args={[0.2, 0.22, 0.06, 8]} />
            <meshStandardMaterial color="#2E5240" />
          </mesh>
          <group ref={neck} position={[0.26, 0.06, 0]}>
            <mesh>
              <sphereGeometry args={[0.1, 10, 10]} />
              <meshStandardMaterial color="#7FA38C" />
            </mesh>
          </group>
          <mesh position={[-0.22, 0.02, 0.12]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color="#7FA38C" />
          </mesh>
          <mesh position={[-0.22, 0.02, -0.12]}>
            <sphereGeometry args={[0.07, 8, 8]} />
            <meshStandardMaterial color="#7FA38C" />
          </mesh>
        </group>
      );
    case "plane":
      return (
        <group rotation={[0, 0, -0.12]}>
          <mesh castShadow>
            <boxGeometry args={[0.82, 0.12, 0.16]} />
            <meshStandardMaterial color="#4C6A8A" metalness={0.2} roughness={0.4} />
          </mesh>
          <group ref={wings}>
            <mesh position={[0.04, 0, 0.38]}>
              <boxGeometry args={[0.16, 0.035, 0.72]} />
              <meshStandardMaterial color="#C4A35A" />
            </mesh>
            <mesh position={[0.04, 0, -0.38]}>
              <boxGeometry args={[0.16, 0.035, 0.72]} />
              <meshStandardMaterial color="#C4A35A" />
            </mesh>
          </group>
          <mesh position={[-0.32, 0.1, 0]}>
            <boxGeometry args={[0.08, 0.16, 0.22]} />
            <meshStandardMaterial color="#E85A7A" />
          </mesh>
          <mesh position={[0.38, 0.02, 0]}>
            <boxGeometry args={[0.16, 0.08, 0.1]} />
            <meshStandardMaterial color="#F4B8C5" />
          </mesh>
        </group>
      );
  }
}

function Leg({ x, z }: { x: number; z: number }) {
  return (
    <mesh position={[x, -0.08, z]}>
      <boxGeometry args={[0.06, 0.22, 0.06]} />
      <meshStandardMaterial color="#4A3428" />
    </mesh>
  );
}

function LetterChip() {
  return (
    <mesh position={[0.02, 0.02, 0.22]} rotation={[0.3, 0.4, 0.2]}>
      <boxGeometry args={[0.14, 0.02, 0.1]} />
      <meshStandardMaterial color="#FBF6F0" />
    </mesh>
  );
}
