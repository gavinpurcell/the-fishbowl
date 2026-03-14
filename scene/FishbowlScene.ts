import { Application } from 'pixi.js';
import { Room } from './Room';
import { Character, type CharacterState } from './Character';
import { SpeechBubble } from './SpeechBubble';
import type { Panelist } from '@/engine/types';

interface InitOptions {
  panelists: Panelist[];
  onReady: () => void;
}

/**
 * Main scene orchestrator. Creates the PixiJS Application, Room, Characters,
 * and SpeechBubbles, and arranges them in the fishbowl layout.
 */
export class FishbowlScene {
  private app: Application | null = null;
  private room: Room | null = null;
  private characters: Map<string, Character> = new Map();
  private bubbles: Map<string, SpeechBubble> = new Map();
  private observerId: string | null = null;
  private destroyed = false;

  // Fishbowl circle center and radius (matches Room's fishbowl ellipse)
  private readonly CIRCLE_CX = 400;
  private readonly CIRCLE_CY = 390;
  private readonly CIRCLE_RX = 180;
  private readonly CIRCLE_RY = 55;

  // Observer position (outside the circle, bottom-right)
  private readonly OBSERVER_X = 680;
  private readonly OBSERVER_Y = 460;

  /** Initialize the scene, letting PixiJS create its own canvas inside a container div */
  async initWithContainer(container: HTMLElement, options: InitOptions): Promise<void> {
    const { panelists, onReady } = options;

    this.app = new Application();
    await this.app.init({
      width: 800,
      height: 600,
      background: 0xf0e8d8,
      antialias: false,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });

    // Let PixiJS manage its own canvas and append it to the container
    const canvas = this.app.canvas;
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.appendChild(canvas);

    // Create the room
    this.room = new Room();
    this.app.stage.addChild(this.room);

    // Create characters and position ALL panelists in the fishbowl circle
    panelists.forEach((panelist, index) => {
      const character = new Character({
        panelistId: panelist.id,
        name: panelist.name,
        color: panelist.color,
        isObserver: false,
      });

      // Arrange evenly around the ellipse
      const angle = (index / panelists.length) * Math.PI * 2 - Math.PI / 2;
      const x = this.CIRCLE_CX + Math.cos(angle) * this.CIRCLE_RX;
      const y = this.CIRCLE_CY + Math.sin(angle) * this.CIRCLE_RY;
      character.position.set(x, y);

      // Set z-index based on y position for proper depth sorting
      character.zIndex = Math.floor(character.position.y);

      this.characters.set(panelist.id, character);
      this.app!.stage.addChild(character);

      // Create speech bubble for each character
      const bubble = new SpeechBubble();
      bubble.position.set(character.position.x, character.position.y - 60);
      bubble.zIndex = 1000; // bubbles always on top

      this.bubbles.set(panelist.id, bubble);
      this.app!.stage.addChild(bubble);
    });

    // Create the observer ("You") as a separate character outside the circle
    const observer = new Character({
      panelistId: '__observer__',
      name: 'You',
      color: '#eea444',
      isObserver: true,
    });
    observer.position.set(this.OBSERVER_X, this.OBSERVER_Y);
    observer.zIndex = Math.floor(this.OBSERVER_Y);
    this.observerId = '__observer__';
    this.characters.set('__observer__', observer);
    this.app.stage.addChild(observer);

    // Enable z-index sorting on stage
    this.app.stage.sortableChildren = true;
    this.app.stage.sortChildren();

    // Animation loop
    this.app.ticker.add((ticker) => {
      if (this.destroyed) return;

      const delta = ticker.deltaTime;

      this.room?.update(delta);

      this.characters.forEach((char) => {
        char.update(delta);
      });

      this.bubbles.forEach((bubble) => {
        bubble.update(delta);
      });
    });

    onReady();
  }

  /** Set a character's animation state */
  setCharacterState(id: string, state: CharacterState): void {
    const character = this.characters.get(id);
    if (character) {
      character.setState(state);
    }
  }

  /** Show a speech bubble above a character, optionally with text */
  showSpeechBubble(id: string, text?: string): void {
    // Hide all other bubbles first
    this.bubbles.forEach((b) => b.hide());
    const bubble = this.bubbles.get(id);
    if (bubble) {
      console.log('[Fishbowl] showSpeechBubble', id, 'text:', text?.slice(0, 30));
      bubble.show(text);
    }
  }

  /** Append streaming text to a character's speech bubble */
  appendToBubble(id: string, chunk: string): void {
    const bubble = this.bubbles.get(id);
    if (bubble) {
      if (!bubble.visible) {
        bubble.show();
      }
      bubble.appendText(chunk);
    }
  }

  /** Hide a character's speech bubble */
  hideSpeechBubble(id: string): void {
    const bubble = this.bubbles.get(id);
    if (bubble) {
      bubble.finishStreaming();
      bubble.hide();
    }
  }

  /** Animate the observer character moving into the fishbowl circle */
  moveObserverIn(): void {
    if (!this.observerId) return;

    const character = this.characters.get(this.observerId);
    const bubble = this.bubbles.get(this.observerId);
    if (!character) return;

    // Target: an open position in the circle
    const targetX = this.CIRCLE_CX;
    const targetY = this.CIRCLE_CY + this.CIRCLE_RY + 10;

    // Simple animated transition
    const startX = character.position.x;
    const startY = character.position.y;
    const duration = 60; // frames
    let frame = 0;

    const originalAlpha = character.alpha;

    const animate = () => {
      if (this.destroyed || !this.app) return;
      frame++;

      const progress = Math.min(frame / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);

      character.position.set(
        startX + (targetX - startX) * eased,
        startY + (targetY - startY) * eased
      );

      // Fade to full opacity as they join
      character.alpha = originalAlpha + (1 - originalAlpha) * eased;

      // Update bubble position
      if (bubble) {
        bubble.position.set(character.position.x, character.position.y - 60);
      }

      // Update z-index
      character.zIndex = Math.floor(character.position.y);
      this.app!.stage.sortChildren();

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        character.isObserver = false;
      }
    };

    requestAnimationFrame(animate);
  }

  /** Get the canvas element (for video recording) */
  getCanvas(): HTMLCanvasElement | null {
    if (!this.app) return null;
    return this.app.canvas as HTMLCanvasElement;
  }

  /** Clean up all PixiJS resources */
  destroy(): void {
    this.destroyed = true;

    this.characters.clear();
    this.bubbles.clear();
    this.room = null;

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
  }
}
