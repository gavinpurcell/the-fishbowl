import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export type CharacterState = 'idle' | 'talking' | 'thinking' | 'reacting';

/**
 * A seated character rendered with PixiJS Graphics primitives.
 * Geometric/placeholder style: body rectangle, circle head, rectangle hair, dot eyes.
 */
export class Character extends Container {
  public panelistId: string;
  public isObserver: boolean;

  private bodyColor: number;
  private skinColor: number;
  private hairColor: number;

  private head: Graphics;
  private body: Graphics;
  private hair: Graphics;
  private leftEye: Graphics;
  private rightEye: Graphics;
  private nameLabel: Text;

  // Animation state
  private state: CharacterState = 'idle';
  private animTime = 0;
  private breathOffset: number;
  private headBaseY = 0;

  // Animation indicators (created on demand)
  private talkLines: Graphics | null = null;
  private thinkDots: Graphics | null = null;
  private reactIndicator: Graphics | null = null;

  // Character proportions
  private readonly HEAD_RADIUS = 14;
  private readonly BODY_WIDTH = 28;
  private readonly BODY_HEIGHT = 32;
  private readonly CHAIR_WIDTH = 36;
  private readonly CHAIR_HEIGHT = 24;

  constructor(options: {
    panelistId: string;
    name: string;
    color: string;
    isObserver?: boolean;
  }) {
    super();

    this.panelistId = options.panelistId;
    this.isObserver = options.isObserver ?? false;
    this.breathOffset = Math.random() * Math.PI * 2; // Desynchronize breathing

    // Parse the color string to a number
    this.bodyColor = this.parseColor(options.color);
    this.skinColor = 0xf5d0a9; // warm skin tone
    this.hairColor = this.darkenColor(this.bodyColor, 0.4);

    // Build the character from bottom to top

    // Chair
    const chair = this.drawChair();
    this.addChild(chair);

    // Body (torso)
    this.body = this.drawBody();
    this.addChild(this.body);

    // Head
    this.head = this.drawHead();
    this.addChild(this.head);

    // Hair
    this.hair = this.drawHair();
    this.addChild(this.hair);

    // Eyes
    const eyes = this.drawEyes();
    this.leftEye = eyes.left;
    this.rightEye = eyes.right;
    this.addChild(this.leftEye);
    this.addChild(this.rightEye);

    // Name label
    this.nameLabel = new Text({
      text: options.name,
      style: new TextStyle({
        fontFamily: 'monospace',
        fontSize: 10,
        fill: 0x5a5a5a,
        align: 'center',
      }),
    });
    this.nameLabel.anchor.set(0.5, 0);
    this.nameLabel.position.set(0, 32);
    this.addChild(this.nameLabel);

    // Observer characters are slightly transparent
    if (this.isObserver) {
      this.alpha = 0.65;
    }
  }

  private parseColor(color: string): number {
    if (color.startsWith('#')) {
      return parseInt(color.slice(1), 16);
    }
    if (color.startsWith('0x')) {
      return parseInt(color, 16);
    }
    // Fallback warm color
    return 0x6b9eaa;
  }

  private darkenColor(color: number, factor: number): number {
    const r = Math.floor(((color >> 16) & 0xff) * (1 - factor));
    const g = Math.floor(((color >> 8) & 0xff) * (1 - factor));
    const b = Math.floor((color & 0xff) * (1 - factor));
    return (r << 16) | (g << 8) | b;
  }

  private drawChair(): Graphics {
    const chair = new Graphics();
    // Chair seat
    chair.roundRect(
      -this.CHAIR_WIDTH / 2,
      8,
      this.CHAIR_WIDTH,
      this.CHAIR_HEIGHT,
      4
    ).fill({ color: 0x8b7355 });

    // Chair back
    chair.roundRect(
      -this.CHAIR_WIDTH / 2 + 2,
      -8,
      this.CHAIR_WIDTH - 4,
      18,
      3
    ).fill({ color: 0x7a6548 });

    // Chair legs (front two visible)
    chair.rect(-this.CHAIR_WIDTH / 2 + 2, 28, 3, 10)
      .fill({ color: 0x6b5840 });
    chair.rect(this.CHAIR_WIDTH / 2 - 5, 28, 3, 10)
      .fill({ color: 0x6b5840 });

    return chair;
  }

  private drawBody(): Graphics {
    const body = new Graphics();
    // Torso — uses the character color
    body.roundRect(
      -this.BODY_WIDTH / 2,
      -this.BODY_HEIGHT / 2 + 8,
      this.BODY_WIDTH,
      this.BODY_HEIGHT,
      4
    ).fill({ color: this.bodyColor });

    // Arms
    body.roundRect(-this.BODY_WIDTH / 2 - 6, 0, 6, 16, 2)
      .fill({ color: this.bodyColor });
    body.roundRect(this.BODY_WIDTH / 2, 0, 6, 16, 2)
      .fill({ color: this.bodyColor });

    // Collar detail
    body.moveTo(-5, -8)
      .lineTo(0, -2)
      .lineTo(5, -8)
      .stroke({ color: this.darkenColor(this.bodyColor, 0.15), width: 1.5 });

    return body;
  }

  private drawHead(): Graphics {
    const head = new Graphics();
    head.circle(0, -this.BODY_HEIGHT / 2 - this.HEAD_RADIUS + 6, this.HEAD_RADIUS)
      .fill({ color: this.skinColor });
    return head;
  }

  private drawHair(): Graphics {
    const hair = new Graphics();
    const headY = -this.BODY_HEIGHT / 2 - this.HEAD_RADIUS + 6;

    // Hair on top of head — slightly wider than head
    hair.roundRect(
      -this.HEAD_RADIUS - 1,
      headY - this.HEAD_RADIUS - 2,
      (this.HEAD_RADIUS + 1) * 2,
      this.HEAD_RADIUS + 2,
      6
    ).fill({ color: this.hairColor });

    return hair;
  }

  private drawEyes(): { left: Graphics; right: Graphics } {
    const headY = -this.BODY_HEIGHT / 2 - this.HEAD_RADIUS + 6;

    const left = new Graphics();
    left.circle(-5, headY - 1, 2)
      .fill({ color: 0x3a3a3a });

    const right = new Graphics();
    right.circle(5, headY - 1, 2)
      .fill({ color: 0x3a3a3a });

    return { left, right };
  }

  /** Set the character's animation state */
  setState(newState: CharacterState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.animTime = 0;

    // Clean up previous state indicators
    this.clearIndicators();
  }

  getState(): CharacterState {
    return this.state;
  }

  private clearIndicators(): void {
    if (this.talkLines) {
      this.removeChild(this.talkLines);
      this.talkLines = null;
    }
    if (this.thinkDots) {
      this.removeChild(this.thinkDots);
      this.thinkDots = null;
    }
    if (this.reactIndicator) {
      this.removeChild(this.reactIndicator);
      this.reactIndicator = null;
    }
  }

  /** Update animation each frame */
  update(delta: number): void {
    this.animTime += delta * 0.05;

    switch (this.state) {
      case 'idle':
        this.animateIdle();
        break;
      case 'talking':
        this.animateIdle();
        this.animateTalking();
        break;
      case 'thinking':
        this.animateIdle();
        this.animateThinking();
        break;
      case 'reacting':
        this.animateIdle();
        this.animateReacting();
        break;
    }
  }

  private animateIdle(): void {
    // Subtle breathing — gentle vertical movement (absolute positioning, not additive)
    const breathAmount = Math.sin(this.animTime * 2 + this.breathOffset) * 0.8;
    this.headBaseY = breathAmount * 0.5;
    this.head.y = this.headBaseY;
    this.hair.y = this.headBaseY;
    this.leftEye.y = this.headBaseY;
    this.rightEye.y = this.headBaseY;
    this.body.y = breathAmount * 0.3;
  }

  private animateTalking(): void {
    // Talk lines — use alpha pulsing instead of redrawing
    if (!this.talkLines) {
      this.talkLines = new Graphics();
      const headY = -this.BODY_HEIGHT / 2 - this.HEAD_RADIUS + 6;
      for (let i = 0; i < 3; i++) {
        const x = this.HEAD_RADIUS + 6 + i * 4;
        const y = headY - 4 + i * 5;
        this.talkLines.rect(x, y, 5, 1.5)
          .fill({ color: this.bodyColor });
      }
      this.addChild(this.talkLines);
    }
    // Pulse the opacity
    this.talkLines.alpha = 0.4 + Math.sin(this.animTime * 3) * 0.3;
  }

  private animateThinking(): void {
    // Thinking dots — use position/alpha animation instead of redrawing
    if (!this.thinkDots) {
      this.thinkDots = new Graphics();
      const headY = -this.BODY_HEIGHT / 2 - this.HEAD_RADIUS + 6;
      for (let i = 0; i < 3; i++) {
        const dotX = -6 + i * 6;
        const dotY = headY - this.HEAD_RADIUS - 12;
        this.thinkDots.circle(dotX, dotY, 2.5)
          .fill({ color: 0x888888 });
      }
      this.addChild(this.thinkDots);
    }
    // Bounce the whole group
    const headY = -this.BODY_HEIGHT / 2 - this.HEAD_RADIUS + 6;
    this.thinkDots.y = Math.sin(this.animTime * 3) * 3;
    this.thinkDots.alpha = 0.4 + Math.sin(this.animTime * 2) * 0.3;
  }

  private animateReacting(): void {
    // Subtle nod — add to the base breathing position, not accumulate
    const nodAmount = Math.sin(this.animTime * 4) * 1.5;
    this.head.y = this.headBaseY + nodAmount;
    this.hair.y = this.headBaseY + nodAmount;
    this.leftEye.y = this.headBaseY + nodAmount;
    this.rightEye.y = this.headBaseY + nodAmount;

    if (!this.reactIndicator) {
      this.reactIndicator = new Graphics();
      const headY = -this.BODY_HEIGHT / 2 - this.HEAD_RADIUS + 6;
      this.reactIndicator.circle(this.HEAD_RADIUS + 8, headY - 8, 3)
        .fill({ color: 0xf0c866 });
      this.addChild(this.reactIndicator);
    }
    this.reactIndicator.alpha = 0.4 + Math.sin(this.animTime * 3) * 0.3;
  }
}
