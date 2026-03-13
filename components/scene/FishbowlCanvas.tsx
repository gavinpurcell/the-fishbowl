'use client';

import { useEffect, useRef } from 'react';
import { FishbowlScene } from '@/scene/FishbowlScene';
import type { Panelist } from '@/engine/types';

interface Props {
  panelists: Panelist[];
  onSceneReady: (scene: FishbowlScene) => void;
}

export default function FishbowlCanvas({ panelists, onSceneReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<FishbowlScene | null>(null);

  useEffect(() => {
    if (!canvasRef.current || sceneRef.current) return;

    const scene = new FishbowlScene();
    sceneRef.current = scene;

    scene.init(canvasRef.current, {
      panelists,
      onReady: () => onSceneReady(scene),
    });

    return () => {
      scene.destroy();
      sceneRef.current = null;
    };
  }, [panelists, onSceneReady]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full max-w-[800px] mx-auto rounded-lg shadow-lg"
      style={{ aspectRatio: '4/3', imageRendering: 'pixelated' }}
    />
  );
}
