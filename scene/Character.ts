import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export type CharacterState = 'idle' | 'talking' | 'thinking' | 'reacting' | 'gesturing' | 'skeptical';

interface CharacterAppearance {
  hairStyle: 'wavy' | 'short' | 'curly' | 'ponytail' | 'cropped' | 'bangs';
  hairColor: number;
  skinTone: number;
  hasGlasses: boolean;
}

const CHARACTER_APPEARANCES: CharacterAppearance[] = [
  { hairStyle: 'wavy', hairColor: 0x5a3a1a, skinTone: 0xf5d0a9, hasGlasses: false },
  { hairStyle: 'short', hairColor: 0x2a1a0a, skinTone: 0xe0bc8a, hasGlasses: true },
  { hairStyle: 'curly', hairColor: 0x1a1a2a, skinTone: 0xd4a878, hasGlasses: false },
  { hairStyle: 'ponytail', hairColor: 0xc47040, skinTone: 0xf5d0a9, hasGlasses: false },
  { hairStyle: 'cropped', hairColor: 0x4a4a5a, skinTone: 0xe8c8a0, hasGlasses: true },
  { hairStyle: 'bangs', hairColor: 0x8a5a2a, skinTone: 0xd4a878, hasGlasses: false },
  { hairStyle: 'wavy', hairColor: 0x1a1a2a, skinTone: 0xe0bc8a, hasGlasses: true },
  { hairStyle: 'curly', hairColor: 0x5a3a1a, skinTone: 0xf5d0a9, hasGlasses: false },
];

/**
 * A seated character rendered with PixiJS Graphics primitives.
 * Geometric illustrated style with per-character visual variety:
 * different hair styles, skin tones, and optional glasses.
 */
export class Character extends Container {
  public panelistId: string;
  public isObserver: boolean;

  private bodyColor: number;
  private spriteIndex: number;
  private appearance: CharacterAppearance;

  // Graphics references for animation
  private headGraphics: Graphics;
  private bodyGraphics: Graphics;
  private collarGraphics: Graphics;
  private leftArm: Graphics;
  private rightArm: Graphics;
  private leftHand: Graphics;
  private rightHand: Graphics;
  private hairGraphics: Graphics;
  private leftEyeGroup: Graphics;
  private rightEyeGroup: Graphics;
  private blushGraphics: Graphics;
  private mouthGraphics: Graphics;
  private glassesGraphics: Graphics | null = null;
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
  private gesturingLines: Graphics | null = null;

  // Character proportions
  private readonly HEAD_RADIUS = 16;
  private readonly BODY_WIDTH = 30;
  private readonly BODY_HEIGHT = 30;
  private readonly CHAIR_WIDTH = 36;
  private readonly CHAIR_HEIGHT = 24;

  // Computed positions
  private readonly headY: number;

  constructor(options: {
    panelistId: string;
    name: string;
    color: string;
    spriteIndex?: number;
    isObserver?: boolean;
  }) {
    super();

    this.panelistId = options.panelistId;
    this.isObserver = options.isObserver ?? false;
    this.breathOffset = Math.random() * Math.PI * 2;

    this.bodyColor = this.parseColor(options.color);
    this.spriteIndex = options.spriteIndex ?? 0;
    this.appearance = CHARACTER_APPEARANCES[this.spriteIndex % CHARACTER_APPEARANCES.length];

    // Compute head center Y
    this.headY = -this.BODY_HEIGHT / 2 - this.HEAD_RADIUS + 6;

    // Build the character from bottom to top

    // 1. Chair
    const chair = this.drawChair();
    this.addChild(chair);

    // 2. Body
    this.bodyGraphics = this.drawBody();
    this.addChild(this.bodyGraphics);

    // 3. Collar
    this.collarGraphics = this.drawCollar();
    this.addChild(this.collarGraphics);

    // 4. Arms
    const arms = this.drawArms();
    this.leftArm = arms.left;
    this.rightArm = arms.right;
    this.addChild(this.leftArm);
    this.addChild(this.rightArm);

    // 5. Hands
    const hands = this.drawHands();
    this.leftHand = hands.left;
    this.rightHand = hands.right;
    this.addChild(this.leftHand);
    this.addChild(this.rightHand);

    // 6. Head
    this.headGraphics = this.drawHead();
    this.addChild(this.headGraphics);

    // 7. Hair
    this.hairGraphics = this.drawHairByStyle();
    this.addChild(this.hairGraphics);

    // 8. Eyes
    const eyes = this.drawEyes();
    this.leftEyeGroup = eyes.left;
    this.rightEyeGroup = eyes.right;
    this.addChild(this.leftEyeGroup);
    this.addChild(this.rightEyeGroup);

    // 9. Blush
    this.blushGraphics = this.drawBlush();
    this.addChild(this.blushGraphics);

    // 10. Mouth
    this.mouthGraphics = this.drawMouth();
    this.addChild(this.mouthGraphics);

    // 11. Glasses (if applicable)
    if (this.appearance.hasGlasses) {
      this.glassesGraphics = this.drawGlasses();
      this.addChild(this.glassesGraphics);
    }

    // 12. Name label
    this.nameLabel = new Text({
      text: options.name,
      style: new TextStyle({
        fontFamily: '"DM Mono", monospace',
        fontSize: 10,
        fill: 0x5a5a5a,
        align: 'center',
      }),
    });
    this.nameLabel.anchor.set(0.5, 0);
    this.nameLabel.position.set(0, 36);
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
    return 0x6b9eaa;
  }

  private darkenColor(color: number, factor: number): number {
    const r = Math.floor(((color >> 16) & 0xff) * (1 - factor));
    const g = Math.floor(((color >> 8) & 0xff) * (1 - factor));
    const b = Math.floor((color & 0xff) * (1 - factor));
    return (r << 16) | (g << 8) | b;
  }

  // --- Drawing methods ---

  private drawChair(): Graphics {
    const chair = new Graphics();
    // Seat
    chair.roundRect(
      -this.CHAIR_WIDTH / 2,
      8,
      this.CHAIR_WIDTH,
      this.CHAIR_HEIGHT,
      4
    ).fill({ color: 0xc9b896 })
     .stroke({ color: 0xb0a080, width: 0.8 });

    // Legs
    chair.rect(-this.CHAIR_WIDTH / 2 + 3, 28, 3, 10)
      .fill({ color: 0xc9b896 })
      .stroke({ color: 0xb0a080, width: 0.8 });
    chair.rect(this.CHAIR_WIDTH / 2 - 6, 28, 3, 10)
      .fill({ color: 0xc9b896 })
      .stroke({ color: 0xb0a080, width: 0.8 });

    return chair;
  }

  private drawBody(): Graphics {
    const body = new Graphics();
    body.roundRect(
      -this.BODY_WIDTH / 2,
      -this.BODY_HEIGHT / 2 + 8,
      this.BODY_WIDTH,
      this.BODY_HEIGHT,
      8
    ).fill({ color: this.bodyColor });
    return body;
  }

  private drawCollar(): Graphics {
    const collar = new Graphics();
    const collarColor = this.darkenColor(this.bodyColor, 0.12);
    collar.roundRect(
      -10,
      -this.BODY_HEIGHT / 2 + 6,
      20,
      8,
      3
    ).fill({ color: collarColor });
    return collar;
  }

  private drawArms(): { left: Graphics; right: Graphics } {
    const left = new Graphics();
    left.roundRect(
      -this.BODY_WIDTH / 2 - 8,
      0,
      8,
      16,
      4
    ).fill({ color: this.bodyColor });

    const right = new Graphics();
    right.roundRect(
      this.BODY_WIDTH / 2,
      0,
      8,
      16,
      4
    ).fill({ color: this.bodyColor });

    return { left, right };
  }

  private drawHands(): { left: Graphics; right: Graphics } {
    const left = new Graphics();
    left.circle(-this.BODY_WIDTH / 2 - 4, 18, 3.5)
      .fill({ color: this.appearance.skinTone });

    const right = new Graphics();
    right.circle(this.BODY_WIDTH / 2 + 4, 18, 3.5)
      .fill({ color: this.appearance.skinTone });

    return { left, right };
  }

  private drawHead(): Graphics {
    const head = new Graphics();
    head.circle(0, this.headY, this.HEAD_RADIUS)
      .fill({ color: this.appearance.skinTone });
    return head;
  }

  private drawHairByStyle(): Graphics {
    const hair = new Graphics();

    switch (this.appearance.hairStyle) {
      case 'wavy':
        this.drawWavyHair(hair);
        break;
      case 'short':
        this.drawShortHair(hair);
        break;
      case 'curly':
        this.drawCurlyHair(hair);
        break;
      case 'ponytail':
        this.drawPonytailHair(hair);
        break;
      case 'cropped':
        this.drawCroppedHair(hair);
        break;
      case 'bangs':
        this.drawBangsHair(hair);
        break;
    }

    return hair;
  }

  private drawWavyHair(g: Graphics): void {
    const topY = this.headY - this.HEAD_RADIUS;
    const color = this.appearance.hairColor;

    // Wavy bezier path across top of head
    g.moveTo(-this.HEAD_RADIUS - 2, this.headY - 4)
      .bezierCurveTo(
        -this.HEAD_RADIUS + 2, topY - 6,
        -6, topY - 4,
        0, topY - 5
      )
      .bezierCurveTo(
        6, topY - 4,
        this.HEAD_RADIUS - 2, topY - 6,
        this.HEAD_RADIUS + 2, this.headY - 4
      )
      .bezierCurveTo(
        this.HEAD_RADIUS + 1, this.headY - 10,
        6, topY - 2,
        0, topY - 2
      )
      .bezierCurveTo(
        -6, topY - 2,
        -this.HEAD_RADIUS - 1, this.headY - 10,
        -this.HEAD_RADIUS - 2, this.headY - 4
      )
      .fill({ color });
  }

  private drawShortHair(g: Graphics): void {
    const topY = this.headY - this.HEAD_RADIUS;
    const color = this.appearance.hairColor;

    // Rounded rect on top
    g.roundRect(
      -this.HEAD_RADIUS - 1,
      topY - 3,
      (this.HEAD_RADIUS + 1) * 2,
      this.HEAD_RADIUS + 2,
      8
    ).fill({ color });

    // Sideburn rects
    g.rect(-this.HEAD_RADIUS - 1, this.headY - 6, 4, 8)
      .fill({ color });
    g.rect(this.HEAD_RADIUS - 3, this.headY - 6, 4, 8)
      .fill({ color });
  }

  private drawCurlyHair(g: Graphics): void {
    const topY = this.headY - this.HEAD_RADIUS;
    const color = this.appearance.hairColor;

    // 5 small circles clustered above head
    const positions = [
      { x: 0, y: topY - 4 },
      { x: -8, y: topY - 2 },
      { x: 8, y: topY - 2 },
      { x: -12, y: topY + 4 },
      { x: 12, y: topY + 4 },
    ];

    for (const pos of positions) {
      g.circle(pos.x, pos.y, 7)
        .fill({ color });
    }
  }

  private drawPonytailHair(g: Graphics): void {
    const topY = this.headY - this.HEAD_RADIUS;
    const color = this.appearance.hairColor;

    // Arc path across top
    g.roundRect(
      -this.HEAD_RADIUS,
      topY - 2,
      this.HEAD_RADIUS * 2,
      this.HEAD_RADIUS,
      8
    ).fill({ color });

    // Trailing ponytail ellipse to the right
    g.ellipse(this.HEAD_RADIUS + 6, this.headY - 4, 5, 10)
      .fill({ color });
  }

  private drawCroppedHair(g: Graphics): void {
    const topY = this.headY - this.HEAD_RADIUS;
    const color = this.appearance.hairColor;

    // Arc across top only — thinner than short
    g.moveTo(-this.HEAD_RADIUS, this.headY - 6)
      .bezierCurveTo(
        -this.HEAD_RADIUS, topY - 4,
        this.HEAD_RADIUS, topY - 4,
        this.HEAD_RADIUS, this.headY - 6
      )
      .bezierCurveTo(
        this.HEAD_RADIUS - 2, topY + 2,
        -this.HEAD_RADIUS + 2, topY + 2,
        -this.HEAD_RADIUS, this.headY - 6
      )
      .fill({ color });
  }

  private drawBangsHair(g: Graphics): void {
    const topY = this.headY - this.HEAD_RADIUS;
    const color = this.appearance.hairColor;

    // Overlapping rounded rects with staggered heights (bangs effect)
    g.roundRect(-this.HEAD_RADIUS, topY - 2, 10, this.HEAD_RADIUS + 4, 4)
      .fill({ color });
    g.roundRect(-this.HEAD_RADIUS + 8, topY - 4, 10, this.HEAD_RADIUS + 2, 4)
      .fill({ color });
    g.roundRect(-this.HEAD_RADIUS + 16, topY - 1, 10, this.HEAD_RADIUS + 3, 4)
      .fill({ color });
    // Extra coverage on top
    g.roundRect(-this.HEAD_RADIUS, topY - 2, this.HEAD_RADIUS * 2, 8, 6)
      .fill({ color });
  }

  private drawEyes(): { left: Graphics; right: Graphics } {
    const eyeY = this.headY - 1;

    // Left eye
    const left = new Graphics();
    // White
    left.ellipse(-5.5, eyeY, 3.5, 3)
      .fill({ color: 0xffffff });
    // Pupil
    left.circle(-5.5, eyeY, 1.8)
      .fill({ color: 0x2a2a2a });
    // Highlight
    left.circle(-4.5, eyeY - 1, 0.7)
      .fill({ color: 0xffffff });

    // Right eye
    const right = new Graphics();
    // White
    right.ellipse(5.5, eyeY, 3.5, 3)
      .fill({ color: 0xffffff });
    // Pupil
    right.circle(5.5, eyeY, 1.8)
      .fill({ color: 0x2a2a2a });
    // Highlight
    right.circle(6.5, eyeY - 1, 0.7)
      .fill({ color: 0xffffff });

    return { left, right };
  }

  private drawBlush(): Graphics {
    const blush = new Graphics();
    const cheekY = this.headY + 4;

    // Left cheek
    blush.ellipse(-9, cheekY, 4, 2.5)
      .fill({ color: 0xf0b0a0, alpha: 0.35 });
    // Right cheek
    blush.ellipse(9, cheekY, 4, 2.5)
      .fill({ color: 0xf0b0a0, alpha: 0.35 });

    return blush;
  }

  private drawMouth(): Graphics {
    const mouth = new Graphics();
    const mouthY = this.headY + 6;

    // Resting smile — bezier curve
    mouth.moveTo(-3, mouthY)
      .bezierCurveTo(-1.5, mouthY + 3, 1.5, mouthY + 3, 3, mouthY)
      .stroke({ color: 0x5a3a3a, width: 1.2 });

    return mouth;
  }

  private drawGlasses(): Graphics {
    const glasses = new Graphics();
    const glassY = this.headY - 1;

    // Left lens
    glasses.circle(-5.5, glassY, 5)
      .stroke({ color: 0x4a4a4a, width: 0.8 });
    // Right lens
    glasses.circle(5.5, glassY, 5)
      .stroke({ color: 0x4a4a4a, width: 0.8 });
    // Bridge
    glasses.moveTo(-0.5, glassY)
      .lineTo(0.5, glassY)
      .stroke({ color: 0x4a4a4a, width: 0.8 });

    return glasses;
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
    if (this.gesturingLines) {
      this.removeChild(this.gesturingLines);
      this.gesturingLines = null;
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
      case 'gesturing':
        this.animateIdle();
        this.animateGesturing();
        break;
      case 'skeptical':
        this.animateIdle();
        this.animateSkeptical();
        break;
    }
  }

  private animateIdle(): void {
    // Subtle breathing — gentle vertical movement
    const breathAmount = Math.sin(this.animTime * 2 + this.breathOffset) * 0.8;
    this.headBaseY = breathAmount * 0.5;

    // Move all head-attached parts together
    this.headGraphics.y = this.headBaseY;
    this.hairGraphics.y = this.headBaseY;
    this.leftEyeGroup.y = this.headBaseY;
    this.rightEyeGroup.y = this.headBaseY;
    this.blushGraphics.y = this.headBaseY;
    this.mouthGraphics.y = this.headBaseY;
    if (this.glassesGraphics) {
      this.glassesGraphics.y = this.headBaseY;
    }

    // Body breathes slightly
    this.bodyGraphics.y = breathAmount * 0.3;
    this.collarGraphics.y = breathAmount * 0.3;
  }

  private animateTalking(): void {
    // Talk lines — small horizontal lines near the head
    if (!this.talkLines) {
      this.talkLines = new Graphics();
      for (let i = 0; i < 3; i++) {
        const x = this.HEAD_RADIUS + 6 + i * 4;
        const y = this.headY - 4 + i * 5;
        this.talkLines.rect(x, y, 5, 1.5)
          .fill({ color: this.bodyColor });
      }
      this.addChild(this.talkLines);
    }
    // Pulse the opacity
    this.talkLines.alpha = 0.4 + Math.sin(this.animTime * 3) * 0.3;
  }

  private animateThinking(): void {
    // Thinking dots above head
    if (!this.thinkDots) {
      this.thinkDots = new Graphics();
      for (let i = 0; i < 3; i++) {
        const dotX = -6 + i * 6;
        const dotY = this.headY - this.HEAD_RADIUS - 12;
        this.thinkDots.circle(dotX, dotY, 2.5)
          .fill({ color: 0x888888 });
      }
      this.addChild(this.thinkDots);
    }
    // Bounce the whole group
    this.thinkDots.y = Math.sin(this.animTime * 3) * 3;
    this.thinkDots.alpha = 0.4 + Math.sin(this.animTime * 2) * 0.3;
  }

  private animateReacting(): void {
    // Subtle nod
    const nodAmount = Math.sin(this.animTime * 4) * 1.5;
    this.headGraphics.y = this.headBaseY + nodAmount;
    this.hairGraphics.y = this.headBaseY + nodAmount;
    this.leftEyeGroup.y = this.headBaseY + nodAmount;
    this.rightEyeGroup.y = this.headBaseY + nodAmount;
    this.blushGraphics.y = this.headBaseY + nodAmount;
    this.mouthGraphics.y = this.headBaseY + nodAmount;
    if (this.glassesGraphics) {
      this.glassesGraphics.y = this.headBaseY + nodAmount;
    }

    if (!this.reactIndicator) {
      this.reactIndicator = new Graphics();
      this.reactIndicator.circle(this.HEAD_RADIUS + 8, this.headY - 8, 3)
        .fill({ color: 0xf0c866 });
      this.addChild(this.reactIndicator);
    }
    this.reactIndicator.alpha = 0.4 + Math.sin(this.animTime * 3) * 0.3;
  }

  private animateGesturing(): void {
    // Small exclamation lines radiating from head with pulsing opacity
    if (!this.gesturingLines) {
      this.gesturingLines = new Graphics();
      const angles = [-0.6, -0.3, 0, 0.3, 0.6];
      for (const angle of angles) {
        const startR = this.HEAD_RADIUS + 4;
        const endR = this.HEAD_RADIUS + 10;
        const cx = 0;
        const cy = this.headY - 6;
        const x1 = cx + Math.sin(angle) * startR;
        const y1 = cy - Math.cos(angle) * startR;
        const x2 = cx + Math.sin(angle) * endR;
        const y2 = cy - Math.cos(angle) * endR;
        this.gesturingLines.moveTo(x1, y1)
          .lineTo(x2, y2)
          .stroke({ color: this.bodyColor, width: 1.5 });
      }
      this.addChild(this.gesturingLines);
    }
    this.gesturingLines.alpha = 0.3 + Math.sin(this.animTime * 4) * 0.4;
  }

  private animateSkeptical(): void {
    // Slight head tilt for skeptical look
    const tiltAmount = Math.sin(this.animTime * 1.5) * 0.04;
    this.headGraphics.rotation = tiltAmount;
    this.hairGraphics.rotation = tiltAmount;
    this.leftEyeGroup.rotation = tiltAmount;
    this.rightEyeGroup.rotation = tiltAmount;
    this.blushGraphics.rotation = tiltAmount;
    this.mouthGraphics.rotation = tiltAmount;
    if (this.glassesGraphics) {
      this.glassesGraphics.rotation = tiltAmount;
    }
  }
}
