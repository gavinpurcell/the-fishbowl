import { Application, Container, FederatedPointerEvent } from 'pixi.js';
import { Room } from './Room';
import { Character, type CharacterState } from './Character';
import { PanelistTag } from './PanelistTag';
import { SpeechBubble } from './SpeechBubble';
import { ThinkingIndicator } from './ThinkingIndicator';
import type { Panelist } from '@/engine/types';

interface InitOptions {
  panelists: Panelist[];
  onReady: () => void;
}

interface SeatPlacement {
  x: number;
  y: number;
  facing: 'left' | 'right';
  scale: number;
  tagX: number;
  tagY: number;
  tagAlign: 'left' | 'right' | 'center';
}

export interface LayoutEditorPanelistSnapshot {
  character: {
    x: number;
    y: number;
    scale: number;
  };
  tag: {
    x: number;
    y: number;
    tagX: number;
    tagY: number;
  };
}

export interface LayoutEditorSnapshot {
  table: {
    x: number;
    y: number;
  } | null;
  panelists: Record<string, LayoutEditorPanelistSnapshot>;
}

/**
 * Main scene orchestrator. Creates the PixiJS Application, Room, Characters,
 * and SpeechBubbles, and arranges them in the fishbowl layout.
 */
export class FishbowlScene {
  private app: Application | null = null;
  private room: Room | null = null;
  private characters: Map<string, Character> = new Map();
  private tags: Map<string, PanelistTag> = new Map();
  private bubbles: Map<string, SpeechBubble> = new Map();
  private thinkingIndicators: Map<string, ThinkingIndicator> = new Map();
  private observerId: string | null = null;
  private destroyed = false;
  private panelists: Panelist[] = [];
  private layoutEditorCleanup: Array<() => void> = [];
  private layoutChangeCallback: ((snapshot: LayoutEditorSnapshot) => void) | null = null;
  private activeDrag:
    | {
        offsetX: number;
        offsetY: number;
        onMove: (x: number, y: number) => void;
      }
    | null = null;

  private readonly BASE_BUBBLE_HEIGHT = 146;

  /** Seat layout tuned to the room perspective: smaller in the back, fuller in the front. */
  private getSeatLayout(count: number): SeatPlacement[] {
    // Tight diamond around the fishbowl table, matching the mock-up composition.
    const CENTER_BACK =  { x: 400, y: 300, facing: 'right' as const, scale: 0.70, tagX: 0, tagY: -42, tagAlign: 'center' as const };
    const LEFT_BACK =    { x: 329, y: 348, facing: 'right' as const, scale: 0.72, tagX: -81, tagY: -90, tagAlign: 'right' as const };
    const RIGHT_BACK =   { x: 473, y: 346, facing: 'left' as const, scale: 0.72, tagX: 79, tagY: -87, tagAlign: 'left' as const };
    const LEFT_MID =     { x: 308, y: 304, facing: 'right' as const, scale: 0.75, tagX: -48, tagY: -34, tagAlign: 'right' as const };
    const RIGHT_MID =    { x: 452, y: 300, facing: 'left' as const, scale: 0.75, tagX: 48, tagY: -34, tagAlign: 'left' as const };
    const LEFT_FRONT =   { x: 304, y: 402, facing: 'right' as const, scale: 0.80, tagX: -43, tagY: -71, tagAlign: 'right' as const };
    const RIGHT_FRONT =  { x: 489, y: 409, facing: 'left' as const, scale: 0.80, tagX: 49, tagY: -78, tagAlign: 'left' as const };
    const CENTER_FRONT = { x: 400, y: 420, facing: 'right' as const, scale: 0.85, tagX: 0, tagY: -30, tagAlign: 'center' as const };

    switch (count) {
      case 3:
        return [LEFT_BACK, RIGHT_BACK, CENTER_FRONT];
      case 4:
        return [LEFT_BACK, RIGHT_BACK, LEFT_FRONT, RIGHT_FRONT];
      case 5:
        return [LEFT_BACK, RIGHT_BACK, LEFT_FRONT, RIGHT_FRONT, CENTER_BACK];
      case 6:
        return [LEFT_BACK, RIGHT_BACK, LEFT_MID, RIGHT_MID, LEFT_FRONT, RIGHT_FRONT];
      default:
        return [LEFT_BACK, RIGHT_BACK, CENTER_FRONT].slice(0, Math.min(count, 3));
    }
  }

  private getBubblePosition(seat: SeatPlacement): { x: number; y: number } {
    return {
      x: seat.x,
      y: seat.y - this.BASE_BUBBLE_HEIGHT * seat.scale,
    };
  }

  private getTagPosition(seat: SeatPlacement): { x: number; y: number } {
    let x = seat.x + seat.tagX;
    x = Math.max(10, Math.min(790, x));
    const y = Math.max(10, seat.y + seat.tagY);
    return { x, y };
  }

  private updateCharacterAnchors(id: string): void {
    const character = this.characters.get(id);
    if (!character) return;

    const bubble = this.bubbles.get(id);
    if (bubble) {
      bubble.position.set(
        character.position.x,
        character.position.y - this.BASE_BUBBLE_HEIGHT * character.scale.y,
      );
    }

    const indicator = this.thinkingIndicators.get(id);
    if (indicator) {
      indicator.position.set(
        character.position.x,
        character.position.y - this.BASE_BUBBLE_HEIGHT * character.scale.y + 10,
      );
    }
  }

  private emitLayoutChange(): void {
    if (this.layoutChangeCallback) {
      this.layoutChangeCallback(this.getLayoutSnapshot());
    }
  }

  private makeDraggable(target: Container, onMove: (x: number, y: number) => void): void {
    if (!this.app) return;

    const handlePointerDown = (event: FederatedPointerEvent) => {
      const point = event.getLocalPosition(this.app!.stage);
      this.activeDrag = {
        offsetX: target.position.x - point.x,
        offsetY: target.position.y - point.y,
        onMove,
      };
      target.cursor = 'grabbing';
      target.alpha = 0.92;
      event.stopPropagation();
    };

    const handlePointerUp = () => {
      this.activeDrag = null;
      target.cursor = 'grab';
      target.alpha = 1;
      this.emitLayoutChange();
    };

    target.eventMode = 'static';
    target.cursor = 'grab';
    target.on('pointerdown', handlePointerDown);
    target.on('pointerup', handlePointerUp);
    target.on('pointerupoutside', handlePointerUp);

    this.layoutEditorCleanup.push(() => {
      target.off('pointerdown', handlePointerDown);
      target.off('pointerup', handlePointerUp);
      target.off('pointerupoutside', handlePointerUp);
      target.eventMode = 'passive';
      target.cursor = 'default';
      target.alpha = 1;
    });
  }

  /** Initialize the scene, letting PixiJS create its own canvas inside a container div */
  async initWithContainer(container: HTMLElement, options: InitOptions): Promise<void> {
    const { panelists, onReady } = options;
    this.panelists = panelists;

    this.app = new Application();
    await this.app.init({
      width: 800,
      height: 450,
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

    // Create characters and position them at fixed seats on the floor
    const seatLayout = this.getSeatLayout(panelists.length);

    panelists.forEach((panelist, index) => {
      if (index >= seatLayout.length) return; // Guard against more panelists than seats

      const character = new Character({
        panelistId: panelist.id,
        name: panelist.name,
        color: panelist.color,
        spriteIndex: panelist.spriteIndex,
        isObserver: false,
        showLabels: false,
      });

      // Place at fixed seat position
      const seat = seatLayout[index];
      character.position.set(seat.x, seat.y);
      character.scale.set(seat.scale);
      character.setFacing(seat.facing);

      // Set z-index based on y position for proper depth sorting
      character.zIndex = Math.floor(seat.y * 10);

      this.characters.set(panelist.id, character);
      this.app!.stage.addChild(character);

      const tag = new PanelistTag({
        name: panelist.name,
        role: panelist.role,
        align: seat.tagAlign,
        accentColor: panelist.color,
      });
      const tagPos = this.getTagPosition(seat);
      tag.position.set(tagPos.x, tagPos.y);
      tag.zIndex = 15000;
      this.tags.set(panelist.id, tag);
      this.app!.stage.addChild(tag);

      // Create speech bubble for each character (positioned above their head)
      const bubble = new SpeechBubble();
      const bubblePos = this.getBubblePosition(seat);
      bubble.position.set(bubblePos.x, bubblePos.y);
      bubble.zIndex = 20000; // bubbles always on top

      this.bubbles.set(panelist.id, bubble);
      this.app!.stage.addChild(bubble);

      // Create thinking indicator for each character
      const indicator = new ThinkingIndicator();
      const indicatorPos = this.getBubblePosition(seat);
      indicator.position.set(indicatorPos.x, indicatorPos.y + 10);
      indicator.zIndex = 19000;
      this.thinkingIndicators.set(panelist.id, indicator);
      this.app!.stage.addChild(indicator);
    });

    // Table layer skipped — the room background sprite already has a table baked in

    // NOTE: Observer is NOT created here — use addObserver() during moderation

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

      this.thinkingIndicators.forEach((indicator) => {
        indicator.update(delta);
      });
    });

    onReady();
  }

  enableLayoutEditor(onChange: (snapshot: LayoutEditorSnapshot) => void): void {
    if (!this.app || !this.room) return;

    this.disableLayoutEditor();
    this.layoutChangeCallback = onChange;

    const handlePointerMove = (event: FederatedPointerEvent) => {
      if (!this.activeDrag) return;
      const point = event.getLocalPosition(this.app!.stage);
      this.activeDrag.onMove(
        point.x + this.activeDrag.offsetX,
        point.y + this.activeDrag.offsetY,
      );
      this.app!.stage.sortChildren();
      this.emitLayoutChange();
    };

    const handlePointerUp = () => {
      this.activeDrag = null;
    };

    this.app.stage.eventMode = 'static';
    this.app.stage.on('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    this.layoutEditorCleanup.push(() => {
      this.app?.stage.off('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (this.app?.stage) {
        this.app.stage.eventMode = 'passive';
      }
      this.activeDrag = null;
    });

    this.characters.forEach((character, id) => {
      this.makeDraggable(character, (x, y) => {
        character.position.set(x, y);
        character.zIndex = Math.floor(y * 10);
        this.updateCharacterAnchors(id);
      });
    });

    this.tags.forEach((tag) => {
      this.makeDraggable(tag, (x, y) => {
        tag.position.set(x, y);
      });
    });

    const table = this.room.getTableSprite();
    if (table) {
      this.makeDraggable(table, (x, y) => {
        this.room?.setTablePosition(x, y);
      });
    }

    this.emitLayoutChange();
  }

  disableLayoutEditor(): void {
    this.layoutChangeCallback = null;
    this.layoutEditorCleanup.forEach((cleanup) => cleanup());
    this.layoutEditorCleanup = [];
    this.activeDrag = null;
  }

  getLayoutSnapshot(): LayoutEditorSnapshot {
    const panelists: Record<string, LayoutEditorPanelistSnapshot> = {};

    this.panelists.forEach((panelist) => {
      const character = this.characters.get(panelist.id);
      const tag = this.tags.get(panelist.id);
      if (!character || !tag) return;

      panelists[panelist.id] = {
        character: {
          x: Math.round(character.position.x),
          y: Math.round(character.position.y),
          scale: Number(character.scale.x.toFixed(3)),
        },
        tag: {
          x: Math.round(tag.position.x),
          y: Math.round(tag.position.y),
          tagX: Math.round(tag.position.x - character.position.x),
          tagY: Math.round(tag.position.y - character.position.y),
        },
      };
    });

    const table = this.room?.getTablePosition() ?? null;

    return {
      table: table
        ? {
            x: Math.round(table.x),
            y: Math.round(table.y),
          }
        : null,
      panelists,
    };
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

  /** Replace a character's speech bubble text (for paragraph pagination) */
  setBubbleText(id: string, text: string): void {
    const bubble = this.bubbles.get(id);
    if (bubble) {
      if (!bubble.visible) {
        bubble.show(text);
      } else {
        bubble.replaceText(text);
      }
    }
  }

  /** Hide all speech bubbles */
  hideAllSpeechBubbles(): void {
    this.bubbles.forEach((b) => {
      b.finishStreaming();
      b.hide();
    });
  }

  /** Hide a character's speech bubble */
  hideSpeechBubble(id: string): void {
    const bubble = this.bubbles.get(id);
    if (bubble) {
      bubble.finishStreaming();
      bubble.hide();
    }
  }

  /** Show the thinking indicator for a character, hiding all others */
  showThinkingIndicator(id: string): void {
    this.thinkingIndicators.forEach((indicator) => indicator.hide());
    const indicator = this.thinkingIndicators.get(id);
    if (indicator) {
      indicator.show();
    }
  }

  /** Hide the thinking indicator for a specific character */
  hideThinkingIndicator(id: string): void {
    const indicator = this.thinkingIndicators.get(id);
    if (indicator) {
      indicator.hide();
    }
  }

  /** Hide all thinking indicators */
  hideAllThinkingIndicators(): void {
    this.thinkingIndicators.forEach((indicator) => indicator.hide());
  }

  /**
   * Add the observer character to the fishbowl.
   * Creates the observer, tweens existing panelists to 5-seat positions,
   * and animates the observer walking in.
   */
  async addObserver(): Promise<void> {
    if (!this.app || this.destroyed) return;
    if (this.observerId) return; // Already added

    // Hide all speech bubbles during the walk-in so they don't cover the observer
    this.bubbles.forEach((b) => b.hide());

    const totalSeats = this.panelists.length + 1;
    const newLayout = this.getSeatLayout(totalSeats);

    // Observer takes the last seat; panelists shift to new positions
    const observerSeat = newLayout[newLayout.length - 1];

    // Create observer character
    const observer = new Character({
      panelistId: '__observer__',
      name: 'You',
      role: 'Moderator',
      color: '#eea444',
      spriteIndex: 0,
      isObserver: true,
      showLabels: false,
    });

    this.observerId = '__observer__';

    // Observer starts near the lounge corner, then walks into the fishbowl.
    const startX = 650;
    const startY = 300;
    observer.position.set(startX, startY);
    observer.scale.set(0.92);
    observer.zIndex = Math.floor(startY * 10);
    observer.setFacing('left');

    this.characters.set('__observer__', observer);
    this.app.stage.addChild(observer);

    // Create speech bubble for observer
    const bubble = new SpeechBubble();
    bubble.position.set(startX, startY - this.BASE_BUBBLE_HEIGHT * 0.92);
    bubble.zIndex = 20000;
    this.bubbles.set('__observer__', bubble);
    this.app.stage.addChild(bubble);

    // Create thinking indicator for observer
    const observerIndicator = new ThinkingIndicator();
    observerIndicator.position.set(startX, startY - this.BASE_BUBBLE_HEIGHT * 0.92 + 10);
    observerIndicator.zIndex = 19000;
    this.thinkingIndicators.set('__observer__', observerIndicator);
    this.app.stage.addChild(observerIndicator);

    const observerTag = new PanelistTag({
      name: 'You',
      role: 'Moderator',
      align: observerSeat.tagAlign,
      accentColor: '#eea444',
    });
    observerTag.position.set(startX + observerSeat.tagX, startY + observerSeat.tagY);
    observerTag.zIndex = 15000;
    this.tags.set('__observer__', observerTag);
    this.app.stage.addChild(observerTag);

    // Phase boundary frames for staged walk-in
    const PHASE_1_END = 25;   // Walk in while panelists shift
    const PHASE_2_END = 45;   // Approach final position
    const TOTAL_FRAMES = 60;  // Settle into final position
    const OBSERVER_DELAY = 8; // Panelists shift first before observer moves

    return new Promise<void>((resolve) => {
      let frame = 0;

      // Store starting positions for panelists
      const panelistStarts = this.panelists.map((p, i) => {
        const char = this.characters.get(p.id);
        const target = newLayout[i];
        return {
          id: p.id,
          startX: char?.position.x ?? 0,
          startY: char?.position.y ?? 0,
          startScale: char?.scale.x ?? 1,
          targetX: target.x,
          targetY: target.y,
          targetScale: target.scale,
          tagX: target.tagX,
          tagY: target.tagY,
          facing: target.facing,
        };
      });

      const updateObserverPositions = (obsX: number, obsY: number) => {
        const obsScale = observer.scale.y;
        bubble.position.set(obsX, obsY - this.BASE_BUBBLE_HEIGHT * obsScale);
        observerIndicator.position.set(obsX, obsY - this.BASE_BUBBLE_HEIGHT * obsScale + 10);
        observerTag.position.set(obsX + observerSeat.tagX, obsY + observerSeat.tagY);
      };

      const animate = () => {
        if (this.destroyed || !this.app) { resolve(); return; }
        frame++;

        const totalProgress = Math.min(frame / TOTAL_FRAMES, 1);

        // --- Panelist repositioning (runs across all phases, ease-out cubic) ---
        const panelistEased = 1 - Math.pow(1 - totalProgress, 3);
        for (const p of panelistStarts) {
          const char = this.characters.get(p.id);
          if (char) {
            const newX = p.startX + (p.targetX - p.startX) * panelistEased;
            const newY = p.startY + (p.targetY - p.startY) * panelistEased;
            const newScale = p.startScale + (p.targetScale - p.startScale) * panelistEased;
            char.position.set(newX, newY);
            char.scale.set(newScale);
            char.zIndex = Math.floor(newY * 10);
            char.setFacing(p.facing);

            const b = this.bubbles.get(p.id);
            if (b) b.position.set(newX, newY - this.BASE_BUBBLE_HEIGHT * newScale);

            const tag = this.tags.get(p.id);
            if (tag) tag.position.set(newX + p.tagX, newY + p.tagY);

            const ti = this.thinkingIndicators.get(p.id);
            if (ti) ti.position.set(newX, newY - this.BASE_BUBBLE_HEIGHT * newScale + 10);
          }
        }

        // --- Observer animation (delayed start, 3 phases) ---
        const observerFrame = Math.max(0, frame - OBSERVER_DELAY);

        if (observerFrame > 0) {
          // Phase 1: Walk in (standing_idle pose from constructor)
          if (frame <= PHASE_1_END) {
            const phaseProgress = observerFrame / (PHASE_1_END - OBSERVER_DELAY);
            const eased = 1 - Math.pow(1 - Math.min(phaseProgress, 1), 2);
            const walkTarget = 0.6;
            const obsX = startX + (observerSeat.x - startX) * walkTarget * eased;
            const obsY = startY + (observerSeat.y - startY) * walkTarget * eased;
            observer.position.set(obsX, obsY);
            observer.scale.set(0.92 + (observerSeat.scale - 0.92) * walkTarget * eased);
            observer.zIndex = Math.floor(obsY * 10);
            observer.alpha = 0.65 + 0.15 * eased;
            updateObserverPositions(obsX, obsY);
          }

          // Phase 2: Approach final position
          if (frame > PHASE_1_END && frame <= PHASE_2_END) {
            const phaseProgress = (frame - PHASE_1_END) / (PHASE_2_END - PHASE_1_END);
            const eased = 1 - Math.pow(1 - phaseProgress, 4);
            const moveProgress = 0.6 + 0.35 * eased;
            const obsX = startX + (observerSeat.x - startX) * moveProgress;
            const obsY = startY + (observerSeat.y - startY) * moveProgress;
            observer.position.set(obsX, obsY);
            observer.scale.set(0.92 + (observerSeat.scale - 0.92) * moveProgress);
            observer.zIndex = Math.floor(obsY * 10);
            observer.alpha = 0.80 + 0.10 * eased;
            updateObserverPositions(obsX, obsY);
          }

          // Phase 3: Settle into final position
          if (frame > PHASE_2_END) {
            const phaseProgress = (frame - PHASE_2_END) / (TOTAL_FRAMES - PHASE_2_END);
            const eased = 1 - Math.pow(1 - Math.min(phaseProgress, 1), 3);
            const moveProgress = 0.95 + 0.05 * eased;
            const obsX = startX + (observerSeat.x - startX) * moveProgress;
            const obsY = startY + (observerSeat.y - startY) * moveProgress;
            observer.position.set(obsX, obsY);
            observer.scale.set(0.92 + (observerSeat.scale - 0.92) * moveProgress);
            observer.zIndex = Math.floor(obsY * 10);
            observer.alpha = 0.90 + 0.10 * eased;
            updateObserverPositions(obsX, obsY);
          }
        }

        this.app!.stage.sortChildren();

        if (totalProgress < 1) {
          requestAnimationFrame(animate);
        } else {
          observer.alpha = 1;
          observer.setFacing(observerSeat.facing);
          observer.setState('idle');
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * @deprecated Use addObserver() instead. Kept for backward compatibility.
   */
  moveObserverIn(): void {
    this.addObserver();
  }

  /** Get the canvas element (for video recording) */
  getCanvas(): HTMLCanvasElement | null {
    if (!this.app) return null;
    return this.app.canvas as HTMLCanvasElement;
  }

  /** Clean up all PixiJS resources */
  destroy(): void {
    this.destroyed = true;
    this.disableLayoutEditor();

    this.characters.clear();
    this.tags.clear();
    this.bubbles.clear();
    this.thinkingIndicators.clear();
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
