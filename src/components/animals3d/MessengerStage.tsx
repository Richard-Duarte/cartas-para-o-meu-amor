"use client";

import { useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { LowPolyMessenger, type Pose } from "./LowPolyMessenger";
import type { MessengerId } from "@/lib/messengers";
import { getMessenger } from "@/lib/messengers";
import { cn } from "@/lib/utils";

type Props = {
  id: MessengerId;
  pose?: Pose;
  height?: number;
  className?: string;
  showName?: boolean;
  compact?: boolean;
};

function Aim({ compact }: { compact: boolean }) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(compact ? 1.2 : 1.45, compact ? 0.7 : 0.85, compact ? 1.7 : 2.05);
    camera.lookAt(0, 0.12, 0);
    camera.updateProjectionMatrix();
  }, [camera, compact]);
  return null;
}

export function MessengerStage({
  id,
  pose = "idle",
  height = 280,
  className,
  showName = true,
  compact = false,
}: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const m = getMessenger(id);

  return (
    <div className={cn("relative w-full overflow-hidden rounded-xl bg-blush/40", className)} style={{ height }}>
      {mounted ? (
        <Canvas dpr={[1, 1.75]} gl={{ antialias: true, alpha: false }} camera={{ fov: 40, near: 0.1, far: 20 }}>
          <color attach="background" args={["#EFD6C8"]} />
          <Aim compact={compact} />
          <ambientLight intensity={0.85} />
          <directionalLight position={[3, 5, 4]} intensity={1.5} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
            <circleGeometry args={[1.2, 48]} />
            <meshStandardMaterial color="#F6EDE4" />
          </mesh>
          <LowPolyMessenger id={id} pose={pose} scale={compact ? 1.2 : 1.45} />
        </Canvas>
      ) : (
        <div className="h-full w-full bg-blush/40" />
      )}
      {showName && (
        <p className="pointer-events-none absolute bottom-3 left-0 right-0 text-center text-xs uppercase tracking-widest text-muted">
          {m.name}
        </p>
      )}
    </div>
  );
}
