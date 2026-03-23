import { Application } from 'pixi.js';
import { Character } from './Character';
import { Room } from './Room';
import { SpeechBubble } from './SpeechBubble';
import { PanelistTag } from './PanelistTag';

type CharacterState = 'idle' | 'talking' | 'thinking' | 'reacting' | 'gesturing' | 'skeptical';

const DEMO_CHARACTERS = [
  { id: 'alex', name: 'ALEX', role: 'Strategist', color: '#9a6ab4', spriteIndex: 4, state: 'skeptical' as const },
  { id: 'derek', name: 'DEREK', role: 'CFO', color: '#c45a5a', spriteIndex: 1, state: 'thinking' as const },
  { id: 'sam', name: 'SAM', role: 'Marketer', color: '#d4a040', spriteIndex: 3, state: 'reacting' as const },
  { id: 'priya', name: 'PRIYA', role: 'Engineer', color: '#5a7ec4', spriteIndex: 2, state: 'talking' as const },
];

const DEMO_QUOTES = [
  'The market timing feels right, but the unit economics need work.',
  'I keep coming back to the retention numbers. They tell the real story.',
  'This could work, but only if we nail the onboarding experience first.',
  'Look, the TAM is there. The question is whether this team can execute.',
  'The competitive moat is thinner than you think. What happens when a big player copies this?',
  'I would use this. Actually, I would pay for this. That says something.',
  'The brand positioning is off. You are selling features when you should be selling outcomes.',
  'Ship it. Learn. Iterate. We are overthinking this.',
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
  private tags: PanelistTag[] = [];
  private bubble: SpeechBubble | null = null;
  private room: Room | null = null;
  private readonly BASE_BUBBLE_HEIGHT = 146;

  // Use the same seat positions as FishbowlScene for 4 characters
  private SEATS = [
    { x: 329, y: 348, scale: 0.72, facing: 'right' as const, tagX: -81, tagY: -90, tagAlign: 'right' as const },
    { x: 473, y: 346, scale: 0.72, facing: 'left' as const, tagX: 79, tagY: -87, tagAlign: 'left' as const },
    { x: 304, y: 402, scale: 0.80, facing: 'right' as const, tagX: -43, tagY: -71, tagAlign: 'right' as const },
    { x: 489, y: 409, scale: 0.80, facing: 'left' as const, tagX: 49, tagY: -78, tagAlign: 'left' as const },
  ];

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

    // 4 characters in fixed seat positions matching the session layout
    for (let i = 0; i < DEMO_CHARACTERS.length; i++) {
      const cfg = DEMO_CHARACTERS[i];
      const seat = this.SEATS[i];

      const character = new Character({
        panelistId: cfg.id,
        name: cfg.name,
        role: cfg.role,
        color: cfg.color,
        spriteIndex: cfg.spriteIndex,
      });
      character.position.set(seat.x, seat.y);
      character.scale.set(seat.scale);
      character.setFacing(seat.facing);
      character.setState(cfg.state);
      character.zIndex = Math.floor(seat.y * 10);

      this.app.stage.addChild(character);
      this.characters.push(character);

      // Name tags
      const tag = new PanelistTag({
        name: cfg.name,
        role: cfg.role,
        align: seat.tagAlign,
        accentColor: cfg.color,
      });
      tag.position.set(seat.x + seat.tagX, seat.y + seat.tagY);
      tag.zIndex = 15000;
      this.app.stage.addChild(tag);
      this.tags.push(tag);
    }

    // Speech bubble (shared, repositioned per speaker)
    this.bubble = new SpeechBubble();
    this.bubble.zIndex = 20000;
    this.bubble.visible = false;
    this.app.stage.addChild(this.bubble);

    // Z-sorting
    this.app.stage.sortableChildren = true;
    this.app.stage.sortChildren();

    // Kick off the first conversation turn
    this.startNewTurn();

    // Animation loop
    this.app.ticker.add((ticker) => {
      const delta = ticker.deltaTime;
      this.room?.update(delta);
      this.characters.forEach(c => c.update(delta));
      this.bubble?.update(delta);
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

    // Show speech bubble above the speaker
    if (this.bubble) {
      const seat = this.SEATS[nextSpeaker];
      this.bubble.position.set(seat.x, seat.y - this.BASE_BUBBLE_HEIGHT * seat.scale);
      this.bubble.show(pick(DEMO_QUOTES));
    }

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

    // Hide speech bubble during pause
    if (this.bubble) this.bubble.hide();

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
