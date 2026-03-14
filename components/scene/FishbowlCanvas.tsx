'use client';

import { useEffect, useRef } from 'react';
import { FishbowlScene } from '@/scene/FishbowlScene';
import type { Panelist } from '@/engine/types';

interface Props {
  panelists: Panelist[];
  onSceneReady: (scene: FishbowlScene) => void;
}

export default function FishbowlCanvas({ panelists, onSceneReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<FishbowlScene | null>(null);

  useEffect(() => {
    if (!containerRef.current || sceneRef.current) return;

    let cancelled = false;
    const scene = new FishbowlScene();
    sceneRef.current = scene;

    scene.initWithContainer(containerRef.current, {
      panelists,
      onReady: () => {
        if (!cancelled) onSceneReady(scene);
      },
    });

    return () => {
      cancelled = true;
      scene.destroy();
      sceneRef.current = null;
    };
  }, [panelists, onSceneReady]);

  return (
    <div
      ref={containerRef}
      className="w-full max-w-[800px] mx-auto rounded-lg shadow-lg overflow-hidden"
      style={{ aspectRatio: '4/3' }}
    />
  );
}
