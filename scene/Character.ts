import { Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import { getCharacterTexture, getObserverTexture, getShadowTexture } from '@/lib/spriteLoader';

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
 * A seated character rendered with a pixel art sprite.
 * Falls back to procedural Graphics if sprite textures aren't loaded.
 */
export class Character extends Container {
  public panelistId: string;
  public isObserver: boolean;

  private spriteIndex: number;
  private useSprite: boolean;

  // Sprite-based rendering
  private groundShadow: Graphics | Sprite;
  private dirShadow: Graphics | null = null;
  private shadowSprite: Sprite | null = null;
  private sprite: Sprite | null = null;
  private nameLabel: Text | null = null;

  // Animation state
  private state: CharacterState = 'idle';
  private animTime = 0;
  private breathOffset: number;

  // Sprite idle behavior: fidget timer
  private fidgetTimer = 0;
  private fidgetInterval: number;
  private fidgetActive = false;
  private fidgetPhase = 0;

  // === Fallback procedural fields (only used when sprites unavailable) ===
  private bodyColor: number = 0x6b9eaa;
  private appearance: CharacterAppearance;
  private headGraphics: Graphics | null = null;
  private bodyGraphics: Graphics | null = null;
  private collarGraphics: Graphics | null = null;
  private leftArm: Graphics | null = null;
  private rightArm: Graphics | null = null;
  private leftHand: Graphics | null = null;
  private rightHand: Graphics | null = null;
  private hairGraphics: Graphics | null = null;
  private leftEyeGroup: Graphics | null = null;
  private rightEyeGroup: Graphics | null = null;
  private blushGraphics: Graphics | null = null;
  private mouthGraphics: Graphics | null = null;
  private glassesGraphics: Graphics | null = null;
  private talkLines: Graphics | null = null;
  private thinkDots: Graphics | null = null;
  private reactIndicator: Graphics | null = null;
  private gesturingLines: Graphics | null = null;
  private headBaseY = 0;
  private readonly HEAD_RADIUS = 16;
  private readonly BODY_WIDTH = 30;
  private readonly BODY_HEIGHT = 30;
  private readonly CHAIR_WIDTH = 36;
  private readonly CHAIR_HEIGHT = 24;
  private readonly headY: number;

  constructor(options: {
    panelistId: string;
    name: string;
    role?: string;
    color: string;
    spriteIndex?: number;
    isObserver?: boolean;
    showLabels?: boolean;
  }) {
    super();

    this.panelistId = options.panelistId;
    this.isObserver = options.isObserver ?? false;
    this.breathOffset = Math.random() * Math.PI * 2;
    this.fidgetInterval = 5 + Math.random() * 3; // 5-8 seconds per character
    this.spriteIndex = options.spriteIndex ?? 0;
    this.appearance = CHARACTER_APPEARANCES[this.spriteIndex % CHARACTER_APPEARANCES.length];
    this.bodyColor = this.parseColor(options.color);
    this.headY = -this.BODY_HEIGHT / 2 - this.HEAD_RADIUS + 6;
    // Try to load shadow sprite, fall back to procedural
    const shadowAlias = this.isObserver ? 'observer_shadow' : `char_${this.spriteIndex}_shadow`;
    const shadowTexture = getShadowTexture(shadowAlias);
    if (shadowTexture && shadowTexture !== Texture.EMPTY) {
      this.shadowSprite = new Sprite(shadowTexture);
      this.shadowSprite.texture.source.scaleMode = 'nearest';
      this.shadowSprite.anchor.set(0.5, 1.0);
      this.shadowSprite.scale.set(0.224);
      this.shadowSprite.alpha = 0.45;
      this.shadowSprite.roundPixels = true;
      this.groundShadow = this.shadowSprite;
    } else {
      this.groundShadow = this.drawGroundShadow();
    }

    // Try to load sprite texture
    let texture: Texture | undefined;
    if (this.isObserver) {
      texture = getObserverTexture('standing_idle');
    } else {
      texture = getCharacterTexture(this.spriteIndex, 'idle');
    }

    if (texture && texture !== Texture.EMPTY) {
      // === SPRITE-BASED RENDERING ===
      this.useSprite = true;
      this.sprite = new Sprite(texture);
      this.sprite.texture.source.scaleMode = 'nearest';
      this.sprite.anchor.set(0.5, 1.0);
      this.sprite.scale.set(0.224);
      this.sprite.roundPixels = true;
    } else {
      // === FALLBACK: PROCEDURAL RENDERING ===
      this.useSprite = false;
    }

    // Directional shadow from window light (upper-left) — skip for observers and when using shadow sprites
    if (!this.isObserver && !this.shadowSprite) {
      this.dirShadow = this.drawDirectionalShadow();
      this.addChild(this.dirShadow);
    }

    this.addChild(this.groundShadow);

    // Now add sprite or build procedural (above shadows in z-order)
    if (this.useSprite && this.sprite) {
      this.addChild(this.sprite);
    } else if (!this.useSprite) {
      this.buildProcedural();
    }

    // Name label (below sprite/character) — white with black outline for readability
    if (options.showLabels !== false) {
      this.nameLabel = new Text({
        text: options.name,
        style: new TextStyle({
          fontFamily: '"DM Mono", monospace',
          fontSize: 10,
          fill: 0xffffff,
          align: 'center',
          stroke: { color: 0x000000, width: 3 },
        }),
      });
      this.nameLabel.anchor.set(0.5, 0);
      this.nameLabel.position.set(0, this.useSprite ? 2 : 36);
      this.addChild(this.nameLabel);

      // Role label (if provided)
      if (options.role) {
        const roleLabel = new Text({
          text: options.role,
          style: new TextStyle({
            fontFamily: '"DM Mono", monospace',
            fontSize: 8,
            fill: 0xffffff,
            align: 'center',
            stroke: { color: 0x000000, width: 2 },
          }),
        });
        roleLabel.anchor.set(0.5, 0);
        roleLabel.position.set(0, this.useSprite ? 13 : 48);
        this.addChild(roleLabel);
      }
    }

    // Observer characters are slightly transparent
    if (this.isObserver) {
      this.alpha = 0.65;
    }
  }

  /** Set facing direction — left-side characters face right, right-side face left */
  setFacing(direction: 'left' | 'right'): void {
    if (!this.sprite) return;
    this.sprite.scale.x = direction === 'left' ? -Math.abs(this.sprite.scale.x) : Math.abs(this.sprite.scale.x);
  }

  /** Set the character's animation state */
  setState(newState: CharacterState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.animTime = 0;

    if (this.useSprite && this.sprite) {
      // Swap texture to match state
      let texture: Texture | undefined;
      if (this.isObserver) {
        // Map CharacterState to observer poses
        const observerPoseMap: Record<CharacterState, string> = {
          idle: 'standing_idle',
          talking: 'standing_talking',
          thinking: 'standing_idle',
          reacting: 'standing_idle',
          gesturing: 'standing_talking',
          skeptical: 'standing_idle',
        };
        texture = getObserverTexture(observerPoseMap[newState]);
      } else {
        texture = getCharacterTexture(this.spriteIndex, newState);
      }
      if (texture && texture !== Texture.EMPTY) {
        this.sprite.texture = texture;
        this.sprite.texture.source.scaleMode = 'nearest';
      }
    } else {
      // Procedural fallback — clean up indicators
      this.clearIndicators();
    }
  }

  getState(): CharacterState {
    return this.state;
  }

  /** Update animation each frame */
  update(delta: number): void {
    this.animTime += delta * 0.05;
    const shadowPulse = Math.sin(this.animTime * 2 + this.breathOffset);

    if (this.shadowSprite) {
      // Sprite-based shadow: subtle breathing pulse
      this.shadowSprite.alpha = (this.isObserver ? 0.35 : 0.45) + shadowPulse * 0.03;
      this.shadowSprite.scale.set(
        0.17 * (1 + shadowPulse * 0.01),
        0.17 * (1 + shadowPulse * 0.008),
      );
    } else {
      // Procedural shadow fallback
      this.groundShadow.alpha = this.isObserver ? 0.12 : 0.18;
      this.groundShadow.scale.set(
        1 + shadowPulse * 0.015,
        1 + shadowPulse * 0.01,
      );
    }

    // Directional shadow: subtle breathing-linked pulse
    if (this.dirShadow) {
      this.dirShadow.alpha = 0.08 + shadowPulse * 0.02;
      this.dirShadow.scale.x = 1 + shadowPulse * 0.02;
    }

    if (this.useSprite) {
      if (this.sprite) {
        // --- No vertical bob — characters are seated, vertical movement looks like floating ---
        let yOffset = 0;

        // --- Micro-movements: subtle weight shifting in chair (horizontal only) ---
        const shiftFreqA = 0.7 + this.breathOffset * 0.1;
        const xShift = Math.sin(this.animTime * shiftFreqA + this.breathOffset) * 0.2;
        this.sprite.x = xShift;

        // --- Subtle scale pulse: simulate breathing ---
        const scaleBase = 0.17;
        const scalePulse = Math.sin(this.animTime * 1.1 + this.breathOffset * 1.5) * 0.0008;
        const facingSign = this.sprite.scale.x < 0 ? -1 : 1;
        let spriteScaleX = (scaleBase + scalePulse) * facingSign;
        let spriteScaleY = scaleBase + scalePulse;

        // --- Sprite rotation (default: none) ---
        let spriteRotation = 0;

        // --- State-specific enhancements (no y-movement, use rotation/scale instead) ---
        switch (this.state) {
          case 'talking': {
            // Slight lean forward when talking
            spriteRotation = Math.sin(this.animTime * 4.5 + this.breathOffset) * 0.008;
            break;
          }
          case 'thinking': {
            spriteRotation = Math.sin(this.animTime * 0.8 + this.breathOffset) * 0.012;
            break;
          }
          case 'reacting': {
            // Quick nod via scale pulse
            const nodDecay = Math.max(0, 1 - this.animTime * 0.8);
            const nodScale = Math.sin(this.animTime * 8) * 0.002 * nodDecay;
            spriteScaleY = scaleBase + nodScale;
            break;
          }
          case 'skeptical': {
            const skepticShrink = 0.002;
            spriteScaleX = (scaleBase - skepticShrink) * facingSign;
            spriteScaleY = scaleBase - skepticShrink;
            spriteRotation = Math.sin(this.animTime * 1.5) * 0.02;
            break;
          }
          case 'gesturing': {
            // Horizontal sway only
            this.sprite.x += Math.sin(this.animTime * 3.5 + this.breathOffset) * 0.4;
            spriteRotation = Math.sin(this.animTime * 5 + this.breathOffset) * 0.01;
            break;
          }
        }

        // --- Occasional fidget: quick micro-animation every 5-8 seconds ---
        this.fidgetTimer += delta * 0.05;
        if (!this.fidgetActive && this.fidgetTimer >= this.fidgetInterval) {
          this.fidgetActive = true;
          this.fidgetPhase = 0;
          this.fidgetTimer = 0;
          this.fidgetInterval = 5 + Math.random() * 3;
        }
        if (this.fidgetActive) {
          this.fidgetPhase += delta * 0.05;
          const fidgetDuration = 0.4;
          if (this.fidgetPhase < fidgetDuration) {
            const fidgetProgress = this.fidgetPhase / fidgetDuration;
            const fidgetEase = Math.sin(fidgetProgress * Math.PI);
            // Horizontal fidget only — no vertical bounce
            this.sprite.x += fidgetEase * 0.5 * Math.sin(this.breathOffset);
          } else {
            this.fidgetActive = false;
          }
        }

        // --- Apply all computed values ---
        this.sprite.y = yOffset;
        this.sprite.scale.x = spriteScaleX;
        this.sprite.scale.y = spriteScaleY;
        this.sprite.rotation = spriteRotation;
      }
    } else {
      // Procedural fallback
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
  }

  // =====================================================================
  // PROCEDURAL FALLBACK (kept for safety when sprites aren't loaded)
  // =====================================================================

  private parseColor(color: string): number {
    if (color.startsWith('#')) return parseInt(color.slice(1), 16);
    if (color.startsWith('0x')) return parseInt(color, 16);
    return 0x6b9eaa;
  }

  private darkenColor(color: number, factor: number): number {
    const r = Math.floor(((color >> 16) & 0xff) * (1 - factor));
    const g = Math.floor(((color >> 8) & 0xff) * (1 - factor));
    const b = Math.floor((color & 0xff) * (1 - factor));
    return (r << 16) | (g << 8) | b;
  }

  private buildProcedural(): void {
    // Chair
    const chair = this.drawChair();
    this.addChild(chair);

    // Body
    this.bodyGraphics = this.drawBody();
    this.addChild(this.bodyGraphics);

    // Collar
    this.collarGraphics = this.drawCollar();
    this.addChild(this.collarGraphics);

    // Arms
    const arms = this.drawArms();
    this.leftArm = arms.left;
    this.rightArm = arms.right;
    this.addChild(this.leftArm);
    this.addChild(this.rightArm);

    // Hands
    const hands = this.drawHands();
    this.leftHand = hands.left;
    this.rightHand = hands.right;
    this.addChild(this.leftHand);
    this.addChild(this.rightHand);

    // Head
    this.headGraphics = this.drawHead();
    this.addChild(this.headGraphics);

    // Hair
    this.hairGraphics = this.drawHairByStyle();
    this.addChild(this.hairGraphics);

    // Eyes
    const eyes = this.drawEyes();
    this.leftEyeGroup = eyes.left;
    this.rightEyeGroup = eyes.right;
    this.addChild(this.leftEyeGroup);
    this.addChild(this.rightEyeGroup);

    // Blush
    this.blushGraphics = this.drawBlush();
    this.addChild(this.blushGraphics);

    // Mouth
    this.mouthGraphics = this.drawMouth();
    this.addChild(this.mouthGraphics);

    // Glasses
    if (this.appearance.hasGlasses) {
      this.glassesGraphics = this.drawGlasses();
      this.addChild(this.glassesGraphics);
    }
  }

  private drawGroundShadow(): Graphics {
    const shadow = new Graphics();
    const isObs = this.isObserver;

    // Layered ellipses: must be wider than the sprite (~136px local) to be visible
    // Positioned below sprite bottom (anchor y=1.0, so y=0 is feet)
    shadow.ellipse(0, 6, isObs ? 70 : 58, isObs ? 20 : 17)
      .fill({ color: 0x000000, alpha: 0.18 });
    shadow.ellipse(0, 6, isObs ? 50 : 42, isObs ? 14 : 12)
      .fill({ color: 0x000000, alpha: 0.25 });
    shadow.ellipse(0, 6, isObs ? 30 : 24, isObs ? 9 : 7)
      .fill({ color: 0x000000, alpha: 0.30 });

    return shadow;
  }

  private drawDirectionalShadow(): Graphics {
    const shadow = new Graphics();
    // Shadow extending right from warm sunset light through left window
    const xOffset = this.useSprite ? 30 : 20;
    const yOffset = this.useSprite ? 8 : 8;
    const rx = this.useSprite ? 50 : 35;
    const ry = this.useSprite ? 14 : 12;
    shadow.ellipse(xOffset, yOffset, rx, ry)
      .fill({ color: 0x000000, alpha: 0.12 });
    return shadow;
  }

  private drawChair(): Graphics {
    const chair = new Graphics();
    chair.roundRect(-this.CHAIR_WIDTH / 2, 8, this.CHAIR_WIDTH, this.CHAIR_HEIGHT, 4)
      .fill({ color: 0xc9b896 })
      .stroke({ color: 0xb0a080, width: 0.8 });
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
    body.roundRect(-this.BODY_WIDTH / 2, -this.BODY_HEIGHT / 2 + 8, this.BODY_WIDTH, this.BODY_HEIGHT, 8)
      .fill({ color: this.bodyColor });
    return body;
  }

  private drawCollar(): Graphics {
    const collar = new Graphics();
    const collarColor = this.darkenColor(this.bodyColor, 0.12);
    collar.roundRect(-10, -this.BODY_HEIGHT / 2 + 6, 20, 8, 3)
      .fill({ color: collarColor });
    return collar;
  }

  private drawArms(): { left: Graphics; right: Graphics } {
    const left = new Graphics();
    left.roundRect(-this.BODY_WIDTH / 2 - 8, 0, 8, 16, 4)
      .fill({ color: this.bodyColor });
    const right = new Graphics();
    right.roundRect(this.BODY_WIDTH / 2, 0, 8, 16, 4)
      .fill({ color: this.bodyColor });
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
      case 'wavy': this.drawWavyHair(hair); break;
      case 'short': this.drawShortHair(hair); break;
      case 'curly': this.drawCurlyHair(hair); break;
      case 'ponytail': this.drawPonytailHair(hair); break;
      case 'cropped': this.drawCroppedHair(hair); break;
      case 'bangs': this.drawBangsHair(hair); break;
    }
    return hair;
  }

  private drawWavyHair(g: Graphics): void {
    const topY = this.headY - this.HEAD_RADIUS;
    const color = this.appearance.hairColor;
    g.moveTo(-this.HEAD_RADIUS - 2, this.headY - 4)
      .bezierCurveTo(-this.HEAD_RADIUS + 2, topY - 6, -6, topY - 4, 0, topY - 5)
      .bezierCurveTo(6, topY - 4, this.HEAD_RADIUS - 2, topY - 6, this.HEAD_RADIUS + 2, this.headY - 4)
      .bezierCurveTo(this.HEAD_RADIUS + 1, this.headY - 10, 6, topY - 2, 0, topY - 2)
      .bezierCurveTo(-6, topY - 2, -this.HEAD_RADIUS - 1, this.headY - 10, -this.HEAD_RADIUS - 2, this.headY - 4)
      .fill({ color });
  }

  private drawShortHair(g: Graphics): void {
    const topY = this.headY - this.HEAD_RADIUS;
    const color = this.appearance.hairColor;
    g.roundRect(-this.HEAD_RADIUS - 1, topY - 3, (this.HEAD_RADIUS + 1) * 2, this.HEAD_RADIUS + 2, 8)
      .fill({ color });
    g.rect(-this.HEAD_RADIUS - 1, this.headY - 6, 4, 8).fill({ color });
    g.rect(this.HEAD_RADIUS - 3, this.headY - 6, 4, 8).fill({ color });
  }

  private drawCurlyHair(g: Graphics): void {
    const topY = this.headY - this.HEAD_RADIUS;
    const color = this.appearance.hairColor;
    const positions = [
      { x: 0, y: topY - 4 }, { x: -8, y: topY - 2 }, { x: 8, y: topY - 2 },
      { x: -12, y: topY + 4 }, { x: 12, y: topY + 4 },
    ];
    for (const pos of positions) {
      g.circle(pos.x, pos.y, 7).fill({ color });
    }
  }

  private drawPonytailHair(g: Graphics): void {
    const topY = this.headY - this.HEAD_RADIUS;
    const color = this.appearance.hairColor;
    g.roundRect(-this.HEAD_RADIUS, topY - 2, this.HEAD_RADIUS * 2, this.HEAD_RADIUS, 8)
      .fill({ color });
    g.ellipse(this.HEAD_RADIUS + 6, this.headY - 4, 5, 10).fill({ color });
  }

  private drawCroppedHair(g: Graphics): void {
    const topY = this.headY - this.HEAD_RADIUS;
    const color = this.appearance.hairColor;
    g.moveTo(-this.HEAD_RADIUS, this.headY - 6)
      .bezierCurveTo(-this.HEAD_RADIUS, topY - 4, this.HEAD_RADIUS, topY - 4, this.HEAD_RADIUS, this.headY - 6)
      .bezierCurveTo(this.HEAD_RADIUS - 2, topY + 2, -this.HEAD_RADIUS + 2, topY + 2, -this.HEAD_RADIUS, this.headY - 6)
      .fill({ color });
  }

  private drawBangsHair(g: Graphics): void {
    const topY = this.headY - this.HEAD_RADIUS;
    const color = this.appearance.hairColor;
    g.roundRect(-this.HEAD_RADIUS, topY - 2, 10, this.HEAD_RADIUS + 4, 4).fill({ color });
    g.roundRect(-this.HEAD_RADIUS + 8, topY - 4, 10, this.HEAD_RADIUS + 2, 4).fill({ color });
    g.roundRect(-this.HEAD_RADIUS + 16, topY - 1, 10, this.HEAD_RADIUS + 3, 4).fill({ color });
    g.roundRect(-this.HEAD_RADIUS, topY - 2, this.HEAD_RADIUS * 2, 8, 6).fill({ color });
  }

  private drawEyes(): { left: Graphics; right: Graphics } {
    const eyeY = this.headY - 1;
    const left = new Graphics();
    left.ellipse(-5.5, eyeY, 3.5, 3).fill({ color: 0xffffff });
    left.circle(-5.5, eyeY, 1.8).fill({ color: 0x2a2a2a });
    left.circle(-4.5, eyeY - 1, 0.7).fill({ color: 0xffffff });
    const right = new Graphics();
    right.ellipse(5.5, eyeY, 3.5, 3).fill({ color: 0xffffff });
    right.circle(5.5, eyeY, 1.8).fill({ color: 0x2a2a2a });
    right.circle(6.5, eyeY - 1, 0.7).fill({ color: 0xffffff });
    return { left, right };
  }

  private drawBlush(): Graphics {
    const blush = new Graphics();
    const cheekY = this.headY + 4;
    blush.ellipse(-9, cheekY, 4, 2.5).fill({ color: 0xf0b0a0, alpha: 0.35 });
    blush.ellipse(9, cheekY, 4, 2.5).fill({ color: 0xf0b0a0, alpha: 0.35 });
    return blush;
  }

  private drawMouth(): Graphics {
    const mouth = new Graphics();
    const mouthY = this.headY + 6;
    mouth.moveTo(-3, mouthY)
      .bezierCurveTo(-1.5, mouthY + 3, 1.5, mouthY + 3, 3, mouthY)
      .stroke({ color: 0x5a3a3a, width: 1.2 });
    return mouth;
  }

  private drawGlasses(): Graphics {
    const glasses = new Graphics();
    const glassY = this.headY - 1;
    glasses.circle(-5.5, glassY, 5).stroke({ color: 0x4a4a4a, width: 0.8 });
    glasses.circle(5.5, glassY, 5).stroke({ color: 0x4a4a4a, width: 0.8 });
    glasses.moveTo(-0.5, glassY).lineTo(0.5, glassY).stroke({ color: 0x4a4a4a, width: 0.8 });
    return glasses;
  }

  private clearIndicators(): void {
    if (this.talkLines) { this.removeChild(this.talkLines); this.talkLines = null; }
    if (this.thinkDots) { this.removeChild(this.thinkDots); this.thinkDots = null; }
    if (this.reactIndicator) { this.removeChild(this.reactIndicator); this.reactIndicator = null; }
    if (this.gesturingLines) { this.removeChild(this.gesturingLines); this.gesturingLines = null; }
  }

  private animateIdle(): void {
    const breathAmount = Math.sin(this.animTime * 2 + this.breathOffset) * 0.8;
    this.headBaseY = breathAmount * 0.5;
    if (this.headGraphics) this.headGraphics.y = this.headBaseY;
    if (this.hairGraphics) this.hairGraphics.y = this.headBaseY;
    if (this.leftEyeGroup) this.leftEyeGroup.y = this.headBaseY;
    if (this.rightEyeGroup) this.rightEyeGroup.y = this.headBaseY;
    if (this.blushGraphics) this.blushGraphics.y = this.headBaseY;
    if (this.mouthGraphics) this.mouthGraphics.y = this.headBaseY;
    if (this.glassesGraphics) this.glassesGraphics.y = this.headBaseY;
    if (this.bodyGraphics) this.bodyGraphics.y = breathAmount * 0.3;
    if (this.collarGraphics) this.collarGraphics.y = breathAmount * 0.3;
  }

  private animateTalking(): void {
    if (!this.talkLines) {
      this.talkLines = new Graphics();
      for (let i = 0; i < 3; i++) {
        const x = this.HEAD_RADIUS + 6 + i * 4;
        const y = this.headY - 4 + i * 5;
        this.talkLines.rect(x, y, 5, 1.5).fill({ color: this.bodyColor });
      }
      this.addChild(this.talkLines);
    }
    this.talkLines.alpha = 0.4 + Math.sin(this.animTime * 3) * 0.3;
  }

  private animateThinking(): void {
    if (!this.thinkDots) {
      this.thinkDots = new Graphics();
      for (let i = 0; i < 3; i++) {
        const dotX = -6 + i * 6;
        const dotY = this.headY - this.HEAD_RADIUS - 12;
        this.thinkDots.circle(dotX, dotY, 2.5).fill({ color: 0x888888 });
      }
      this.addChild(this.thinkDots);
    }
    this.thinkDots.y = Math.sin(this.animTime * 3) * 3;
    this.thinkDots.alpha = 0.4 + Math.sin(this.animTime * 2) * 0.3;
  }

  private animateReacting(): void {
    const nodAmount = Math.sin(this.animTime * 4) * 1.5;
    if (this.headGraphics) this.headGraphics.y = this.headBaseY + nodAmount;
    if (this.hairGraphics) this.hairGraphics.y = this.headBaseY + nodAmount;
    if (this.leftEyeGroup) this.leftEyeGroup.y = this.headBaseY + nodAmount;
    if (this.rightEyeGroup) this.rightEyeGroup.y = this.headBaseY + nodAmount;
    if (this.blushGraphics) this.blushGraphics.y = this.headBaseY + nodAmount;
    if (this.mouthGraphics) this.mouthGraphics.y = this.headBaseY + nodAmount;
    if (this.glassesGraphics) this.glassesGraphics.y = this.headBaseY + nodAmount;
    if (!this.reactIndicator) {
      this.reactIndicator = new Graphics();
      this.reactIndicator.circle(this.HEAD_RADIUS + 8, this.headY - 8, 3).fill({ color: 0xf0c866 });
      this.addChild(this.reactIndicator);
    }
    this.reactIndicator.alpha = 0.4 + Math.sin(this.animTime * 3) * 0.3;
  }

  private animateGesturing(): void {
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
        this.gesturingLines.moveTo(x1, y1).lineTo(x2, y2)
          .stroke({ color: this.bodyColor, width: 1.5 });
      }
      this.addChild(this.gesturingLines);
    }
    this.gesturingLines.alpha = 0.3 + Math.sin(this.animTime * 4) * 0.4;
  }

  private animateSkeptical(): void {
    const tiltAmount = Math.sin(this.animTime * 1.5) * 0.04;
    if (this.headGraphics) this.headGraphics.rotation = tiltAmount;
    if (this.hairGraphics) this.hairGraphics.rotation = tiltAmount;
    if (this.leftEyeGroup) this.leftEyeGroup.rotation = tiltAmount;
    if (this.rightEyeGroup) this.rightEyeGroup.rotation = tiltAmount;
    if (this.blushGraphics) this.blushGraphics.rotation = tiltAmount;
    if (this.mouthGraphics) this.mouthGraphics.rotation = tiltAmount;
    if (this.glassesGraphics) this.glassesGraphics.rotation = tiltAmount;
  }
}
