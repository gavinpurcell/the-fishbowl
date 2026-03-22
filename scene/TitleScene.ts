import { Application } from 'pixi.js';
import { Character } from './Character';
import { Room } from './Room';

type CharacterState = 'idle' | 'talking' | 'thinking' | 'reacting' | 'gesturing' | 'skeptical';

const DEMO_CHARACTERS = [
  { id: 'maya', name: 'MAYA', role: 'Designer', color: '#4a9e6e', spriteIndex: 0, state: 'gesturing' as const },
  { id: 'derek', name: 'DEREK', role: 'CFO', color: '#c45a5a', spriteIndex: 1, state: 'thinking' as const },
  { id: 'priya', name: 'PRIYA', role: 'Engineer', color: '#5a7ec4', spriteIndex: 2, state: 'talking' as const },
  { id: 'sam', name: 'SAM', role: 'Marketer', color: '#d4a040', spriteIndex: 3, state: 'reacting' as const },
  { id: 'alex', name: 'ALEX', role: 'Strategist', color: '#9a6ab4', spriteIndex: 4, state: 'skeptical' as const },
];

const SPEAKER_STATES: CharacterState[] = ['talking', 'gesturing'];
const REACTOR_STATES: CharacterState[] = ['reacting', 'thinking'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export class TitleScene {
  private app: Application | null = null;
  private characters: Character[] = [];
  private room: Room | null = null;

  // Same ellipse layout as FishbowlScene
  private CIRCLE_CX = 400;
  private CIRCLE_CY = 390;
  private CIRCLE_RX = 180;
  private CIRCLE_RY = 55;

  // Conversation simulation state
  private conversationTimer = 0;
  private turnDuration = 0;
  private pauseTimer = 0;
  private pauseDuration = 0;
  private isPausing = false;
  private currentSpeakerIndex = -1;
  private turnCount = 0;

  async init(container: HTMLElement): Promise<void> {
    this.app = new Application();
    await this.app.init({
      width: 800,
      height: 450,
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

      // Scale based on y-position for depth perspective
      const depthScale = 0.8 + ((y - (this.CIRCLE_CY - this.CIRCLE_RY)) / (2 * this.CIRCLE_RY)) * 0.4;
      character.scale.set(depthScale);

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

    // Kick off the first conversation turn
    this.startNewTurn();

    // Animation loop
    this.app.ticker.add((ticker) => {
      const delta = ticker.deltaTime;
      this.room?.update(delta);
      this.characters.forEach(c => c.update(delta));
      this.updateConversation(delta);
    });
  }

  private startNewTurn(): void {
    this.turnCount++;

    // Pick a new speaker (different from current)
    let nextSpeaker: number;
    do {
      nextSpeaker = randInt(0, this.characters.length - 1);
    } while (nextSpeaker === this.currentSpeakerIndex && this.characters.length > 1);
    this.currentSpeakerIndex = nextSpeaker;

    // Set the speaker to talking or gesturing
    this.characters[nextSpeaker].setState(pick(SPEAKER_STATES));

    // Build list of non-speaker indices
    const others = this.characters
      .map((_, i) => i)
      .filter(i => i !== nextSpeaker);

    // Pick 1-2 reactors
    const reactorCount = randInt(1, Math.min(2, others.length));
    const shuffled = others.sort(() => Math.random() - 0.5);
    const reactors = shuffled.slice(0, reactorCount);
    const idlers = shuffled.slice(reactorCount);

    // Every 3rd or 4th turn, one non-speaker goes skeptical
    const skepticTurn = this.turnCount % randInt(3, 4) === 0;
    let skepticAssigned = false;

    for (const idx of reactors) {
      this.characters[idx].setState(pick(REACTOR_STATES));
    }

    for (const idx of idlers) {
      if (skepticTurn && !skepticAssigned) {
        this.characters[idx].setState('skeptical');
        skepticAssigned = true;
      } else {
        this.characters[idx].setState('idle');
      }
    }

    // If we didn't assign a skeptic yet (all were reactors), steal one reactor
    if (skepticTurn && !skepticAssigned && reactors.length > 0) {
      this.characters[reactors[reactors.length - 1]].setState('skeptical');
    }

    // Turn lasts 3-5 seconds at 60fps => 180-300 frames
    this.turnDuration = randInt(180, 300);
    this.conversationTimer = 0;
    this.isPausing = false;
  }

  private startPause(): void {
    this.isPausing = true;
    this.pauseTimer = 0;
    this.pauseDuration = randInt(60, 120);

    // Speaker transitions to thinking (brief pause before next speaker)
    if (this.currentSpeakerIndex >= 0) {
      this.characters[this.currentSpeakerIndex].setState('thinking');
    }

    // Everyone else goes idle during the pause
    for (let i = 0; i < this.characters.length; i++) {
      if (i !== this.currentSpeakerIndex) {
        this.characters[i].setState('idle');
      }
    }
  }

  private updateConversation(delta: number): void {
    if (this.characters.length === 0) return;

    if (this.isPausing) {
      // Pause lasts 1-2 seconds => 60-120 frames
      this.pauseTimer += delta;
      if (this.pauseTimer >= this.pauseDuration) {
        this.startNewTurn();
      }
    } else {
      this.conversationTimer += delta;
      if (this.conversationTimer >= this.turnDuration) {
        this.startPause();
      }
    }
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
    this.conversationTimer = 0;
    this.turnDuration = 0;
    this.pauseTimer = 0;
    this.pauseDuration = 0;
    this.isPausing = false;
    this.currentSpeakerIndex = -1;
    this.turnCount = 0;
  }
}
