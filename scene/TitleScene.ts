import { Application } from 'pixi.js';
import { Character } from './Character';
import { Room } from './Room';

const DEMO_CHARACTERS = [
  { id: 'maya', name: 'MAYA', role: 'Designer', color: '#4a9e6e', spriteIndex: 0, state: 'gesturing' as const },
  { id: 'derek', name: 'DEREK', role: 'CFO', color: '#c45a5a', spriteIndex: 1, state: 'thinking' as const },
  { id: 'priya', name: 'PRIYA', role: 'Engineer', color: '#5a7ec4', spriteIndex: 2, state: 'talking' as const },
  { id: 'sam', name: 'SAM', role: 'Marketer', color: '#d4a040', spriteIndex: 3, state: 'reacting' as const },
  { id: 'alex', name: 'ALEX', role: 'Strategist', color: '#9a6ab4', spriteIndex: 4, state: 'skeptical' as const },
];

export class TitleScene {
  private app: Application | null = null;
  private characters: Character[] = [];
  private room: Room | null = null;

  // Same ellipse layout as FishbowlScene
  private CIRCLE_CX = 400;
  private CIRCLE_CY = 390;
  private CIRCLE_RX = 180;
  private CIRCLE_RY = 55;

  async init(container: HTMLElement): Promise<void> {
    this.app = new Application();
    await this.app.init({
      width: 800,
      height: 600,
      background: 0xf0e8d8,
      antialias: false,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    });

    // Scale canvas to fit container
    const canvas = this.app.canvas;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    // Room background
    this.room = new Room();
    this.app.stage.addChild(this.room);

    // 5 characters in ellipse
    for (let i = 0; i < DEMO_CHARACTERS.length; i++) {
      const cfg = DEMO_CHARACTERS[i];
      const angle = (i / DEMO_CHARACTERS.length) * Math.PI * 2 - Math.PI / 2;
      const x = this.CIRCLE_CX + Math.cos(angle) * this.CIRCLE_RX;
      const y = this.CIRCLE_CY + Math.sin(angle) * this.CIRCLE_RY;

      const character = new Character({
        panelistId: cfg.id,
        name: cfg.name,
        role: cfg.role,
        color: cfg.color,
        spriteIndex: cfg.spriteIndex,
      });
      character.position.set(x, y);
      character.setState(cfg.state);

      // Set facing based on position
      if (x > this.CIRCLE_CX) {
        character.setFacing('left');
      } else {
        character.setFacing('right');
      }

      this.app.stage.addChild(character);
      this.characters.push(character);
    }

    // Z-sorting
    this.app.stage.sortableChildren = true;
    this.characters.forEach(c => { c.zIndex = Math.floor(c.y); });
    this.app.stage.sortChildren();

    // Animation loop
    this.app.ticker.add((ticker) => {
      const delta = ticker.deltaTime;
      this.room?.update(delta);
      this.characters.forEach(c => c.update(delta));
    });
  }

  destroy(): void {
    if (this.app) {
      try {
        this.app.stop();
        this.app.stage.removeChildren();
        this.app.destroy(true, { children: true });
      } catch {
        // PixiJS destroy can throw if app wasn't fully initialized
      }
      this.app = null;
    }
    this.characters = [];
    this.room = null;
  }
}
