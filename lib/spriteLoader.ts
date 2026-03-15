import { Assets, Texture } from 'pixi.js';

const POSES = ['idle', 'talking', 'thinking', 'reacting', 'gesturing', 'skeptical'] as const;
const OBSERVER_POSES = ['standing_idle', 'walking', 'sitting_down', 'seated_idle', 'seated_talking'] as const;

export type CharacterPose = (typeof POSES)[number];
export type ObserverPose = (typeof OBSERVER_POSES)[number];

export async function loadAllSprites(): Promise<void> {
  const assets: { alias: string; src: string }[] = [];

  // 8 character variants x 6 poses
  for (let i = 0; i < 8; i++) {
    for (const pose of POSES) {
      assets.push({ alias: `char_${i}_${pose}`, src: `/sprites/characters/char_${i}_${pose}.png` });
    }
  }

  // Observer
  for (const pose of OBSERVER_POSES) {
    assets.push({ alias: `observer_${pose}`, src: `/sprites/observer/observer_${pose}.png` });
  }

  // Room
  assets.push({ alias: 'room_bg', src: '/sprites/room/background.png' });
  assets.push({ alias: 'coffee_table', src: '/sprites/room/coffee_table.png' });

  await Assets.load(assets.map(a => ({ alias: a.alias, src: a.src })));
}

export function getCharacterTexture(spriteIndex: number, pose: string): Texture | undefined {
  return Assets.get(`char_${spriteIndex}_${pose}`);
}

export function getObserverTexture(pose: string): Texture | undefined {
  return Assets.get(`observer_${pose}`);
}

export function getRoomTexture(name: string): Texture | undefined {
  return Assets.get(name);
}
