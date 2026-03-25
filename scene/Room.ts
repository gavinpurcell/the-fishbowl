import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import { getRoomTexture, getShadowTexture } from '@/lib/spriteLoader';

/**
 * Room background using pixel art sprite.
 * Falls back to procedural drawing if sprite textures aren't loaded.
 */
interface DustParticle {
  graphics: Graphics;
  x: number;
  y: number;
  speed: number;
  drift: number;
  phase: number;
  baseAlpha: number;
  isBokeh: boolean;
}

export class Room extends Container {
  private static readonly TABLE_X = 398;
  private static readonly TABLE_Y = 373;
  private static readonly TABLE_SCALE = 0.194;
  private static readonly TABLE_SHADOW_SCALE = 0.346;
  private static readonly TABLE_SHADOW_OFFSET_Y = 17;
  private static readonly TABLE_SHADOW_BASE_ALPHA = 0.58;
  private static readonly TABLE_SHADOW_ANCHOR_X = 0.62;
  private pulseTime = 0;
  private useSpriteBackground: boolean;
  private fishbowlTable: Sprite | null = null;
  private tableShadow: Graphics | Sprite | null = null;

  // Fallback fields
  private fishbowlCircle: Graphics | null = null;

  // Ambient effect fields (sprite mode)
  private particles: DustParticle[] = [];
  private lightPatch: Graphics | null = null;
  private lightPatchSecondary: Graphics | null = null;
  private ambientOverlay: Graphics | null = null;

  // Room dimensions (procedural fallback)
  private readonly ROOM_WIDTH = 700;
  private readonly ROOM_HEIGHT = 400;
  private readonly FLOOR_Y_OFFSET = 180;
  private readonly WALL_HEIGHT = 220;

  constructor() {
    super();

    const bgTexture = getRoomTexture('room_bg');

    if (bgTexture && bgTexture !== Texture.EMPTY) {
      // === SPRITE-BASED RENDERING ===
      this.useSpriteBackground = true;

      // Room background — scaled up and offset to crop roof off the top
      const bgSprite = new Sprite(bgTexture);
      bgSprite.texture.source.scaleMode = 'nearest';
      // Room background — 10% zoom, shifted up to crop ceiling
      bgSprite.width = 880;
      bgSprite.height = 495;
      bgSprite.position.set(-40, -36);
      this.addChild(bgSprite);

      // Table is baked into the background sprite — no separate table layer needed

      // Fishbowl table at center of character group
      const fishbowlTexture = getRoomTexture('fishbowl_table');
      if (fishbowlTexture && fishbowlTexture !== Texture.EMPTY) {
        // Table shadow (rendered below the table sprite)
        const tableShadowTex = getShadowTexture('table_shadow');
        if (tableShadowTex && tableShadowTex !== Texture.EMPTY) {
          // Crop to the painted pixels so placement is based on the actual shadow,
          // not the large transparent padding in the source PNG.
          const croppedShadowTex = new Texture({
            source: tableShadowTex.source,
            frame: new Rectangle(40, 757, 767, 232),
          });
          const tShadow = new Sprite(croppedShadowTex);
          tShadow.texture.source.scaleMode = 'nearest';
          tShadow.anchor.set(Room.TABLE_SHADOW_ANCHOR_X, 1.0);
          tShadow.position.set(Room.TABLE_X, Room.TABLE_Y + Room.TABLE_SHADOW_OFFSET_Y);
          tShadow.scale.set(Room.TABLE_SHADOW_SCALE);
          // The table shadow art is baked lighter than the character shadows,
          // so it needs a slightly higher runtime alpha to read the same on wood.
          tShadow.alpha = Room.TABLE_SHADOW_BASE_ALPHA;
          tShadow.zIndex = 2790;
          this.tableShadow = tShadow;
          this.addChild(tShadow);
        } else {
          // Fallback: procedural — layered ellipses matching character shadow style
          const shadow = new Graphics();
          shadow.ellipse(0, 0, 62, 20).fill({ color: 0x000000, alpha: 0.18 });
          shadow.ellipse(0, 0, 48, 16).fill({ color: 0x000000, alpha: 0.25 });
          shadow.ellipse(0, 0, 32, 11).fill({ color: 0x000000, alpha: 0.30 });
          shadow.position.set(400, 410);
          shadow.zIndex = 2790;
          this.tableShadow = shadow;
          this.addChild(shadow);
        }

        const fishbowl = new Sprite(fishbowlTexture);
        fishbowl.texture.source.scaleMode = 'nearest';
        fishbowl.anchor.set(0.5, 0.75);
        fishbowl.position.set(Room.TABLE_X, Room.TABLE_Y);  // placed from the in-browser layout editor
        fishbowl.scale.set(Room.TABLE_SCALE);
        fishbowl.zIndex = 2800;  // above floor & back row, below front characters
        this.fishbowlTable = fishbowl;
        this.addChild(fishbowl);
      }

      // === AMBIENT EFFECTS ===

      // 1. Ambient color shift overlay (full-screen, lowest z of effects)
      this.ambientOverlay = new Graphics();
      this.ambientOverlay.rect(0, 0, 800, 450).fill({ color: 0xf5d080, alpha: 0.02 });
      this.ambientOverlay.zIndex = 2;
      this.addChild(this.ambientOverlay);

      // 2. Floating dust motes / particles (12-18 normal + 2-3 bokeh)
      const particleCount = 12 + Math.floor(Math.random() * 7); // 12-18
      // Tint palette: warm gold variations
      const dustTints = [0xf5e6c8, 0xf8e0b0, 0xfff0d0, 0xe8d4a8, 0xfce8c0];

      for (let i = 0; i < particleCount; i++) {
        const radius = 1 + Math.random() * 2; // 1-3px
        const baseAlpha = 0.12 + Math.random() * 0.23; // 0.12-0.35
        const tint = dustTints[Math.floor(Math.random() * dustTints.length)];
        const g = new Graphics();
        g.circle(0, 0, radius).fill({ color: tint, alpha: baseAlpha });
        g.zIndex = 4;

        const particle: DustParticle = {
          graphics: g,
          x: Math.random() * 800,
          y: Math.random() * 450,
          speed: 0.15 + Math.random() * 0.25, // upward drift speed
          drift: 0.3 + Math.random() * 0.4, // sideways drift amplitude
          phase: Math.random() * Math.PI * 2, // sin wave phase offset
          baseAlpha,
          isBokeh: false,
        };

        g.position.set(particle.x, particle.y);
        this.particles.push(particle);
        this.addChild(g);
      }

      // Bokeh particles — larger, slower, lower alpha
      const bokehCount = 2 + Math.floor(Math.random() * 2); // 2-3
      for (let i = 0; i < bokehCount; i++) {
        const radius = 3 + Math.random() * 2; // 3-5px
        const baseAlpha = 0.06 + Math.random() * 0.06; // 0.06-0.12
        const g = new Graphics();
        g.circle(0, 0, radius).fill({ color: 0xfff0d0, alpha: baseAlpha });
        g.zIndex = 4;

        const particle: DustParticle = {
          graphics: g,
          x: Math.random() * 800,
          y: Math.random() * 450,
          speed: 0.06 + Math.random() * 0.10, // slower drift
          drift: 0.2 + Math.random() * 0.3, // gentler sway
          phase: Math.random() * Math.PI * 2,
          baseAlpha,
          isBokeh: true,
        };

        g.position.set(particle.x, particle.y);
        this.particles.push(particle);
        this.addChild(g);
      }

      this.sortChildren();
    } else {
      // === FALLBACK: PROCEDURAL RENDERING ===
      this.useSpriteBackground = false;
      this.drawBackWall();
      this.drawSideWalls();
      this.drawWindow();
      this.drawFloor();
      this.drawFloorGrid();
      this.drawPlant();
      this.fishbowlCircle = this.drawFishbowlCircle();
    }
  }

  // =====================================================================
  // PROCEDURAL FALLBACK (kept for safety)
  // =====================================================================

  private drawBackWall(): void {
    const wall = new Graphics();
    wall.rect(50, 40, this.ROOM_WIDTH, this.WALL_HEIGHT).fill({ color: 0xf5efe6 });
    wall.rect(50, 40 + this.WALL_HEIGHT - 8, this.ROOM_WIDTH, 8).fill({ color: 0xd4c5a9 });
    wall.rect(50, 40, this.ROOM_WIDTH, 3).fill({ color: 0xe8e0d0 });
    wall.rect(50, 40, this.ROOM_WIDTH, 3).fill({ color: 0x000000, alpha: 0.05 });
    this.addChild(wall);
  }

  private drawSideWalls(): void {
    const leftWall = new Graphics();
    leftWall.rect(47, 40, 3, this.WALL_HEIGHT).fill({ color: 0xe0d8c8 });
    this.addChild(leftWall);
    const rightWall = new Graphics();
    rightWall.rect(50 + this.ROOM_WIDTH, 40, 3, this.WALL_HEIGHT).fill({ color: 0xe0d8c8 });
    this.addChild(rightWall);
  }

  private drawWindow(): void {
    const windowGroup = new Container();
    const frame = new Graphics();
    frame.roundRect(480, 70, 180, 140, 4).fill({ color: 0xc9b896 }).stroke({ color: 0xb0a080, width: 1 });
    windowGroup.addChild(frame);
    const glass = new Graphics();
    glass.roundRect(488, 78, 164, 124, 2).fill({ color: 0xc5dff0 }).stroke({ color: 0xa8c8e8, width: 1 });
    windowGroup.addChild(glass);
    const bars = new Graphics();
    bars.rect(568, 78, 4, 124).fill({ color: 0xc9b896 });
    bars.rect(488, 138, 164, 4).fill({ color: 0xc9b896 });
    windowGroup.addChild(bars);
    const cloud = new Graphics();
    cloud.ellipse(520, 110, 20, 8).fill({ color: 0xe8f0fa, alpha: 0.7 });
    cloud.ellipse(610, 120, 16, 6).fill({ color: 0xe8f0fa, alpha: 0.6 });
    windowGroup.addChild(cloud);
    const sill = new Graphics();
    sill.rect(476, 202, 192, 8).fill({ color: 0xb8a88c });
    windowGroup.addChild(sill);
    this.addChild(windowGroup);
  }

  private drawFloor(): void {
    const floor = new Graphics();
    floor.rect(50, 40 + this.WALL_HEIGHT, this.ROOM_WIDTH, this.FLOOR_Y_OFFSET + 40).fill({ color: 0xe8d5b8 });
    floor.rect(50, 40 + this.WALL_HEIGHT, this.ROOM_WIDTH, 12).fill({ color: 0xdec9a8, alpha: 0.6 });
    this.addChild(floor);
  }

  private drawFloorGrid(): void {
    const grid = new Graphics();
    const floorTop = 40 + this.WALL_HEIGHT;
    const floorBottom = floorTop + this.FLOOR_Y_OFFSET + 40;
    const spacings = [22, 25, 23, 26, 24, 22, 25];
    let y = floorTop + 20;
    let spacingIndex = 0;
    while (y < floorBottom) {
      grid.rect(50, y, this.ROOM_WIDTH, 1).fill({ color: 0xd4c0a0, alpha: 0.3 });
      y += spacings[spacingIndex % spacings.length];
      spacingIndex++;
    }
    const grainXPositions = [130, 310, 530];
    for (const x of grainXPositions) {
      grid.rect(x, floorTop, 1, floorBottom - floorTop).fill({ color: 0xd4c0a0, alpha: 0.04 });
    }
    this.addChild(grid);
  }

  private drawPlant(): void {
    const plant = new Container();
    const pot = new Graphics();
    pot.roundRect(80, 350, 40, 50, 3).fill({ color: 0xc47a5a }).stroke({ color: 0xa0604a, width: 1 });
    pot.roundRect(75, 345, 50, 10, 2).fill({ color: 0xd4876a }).stroke({ color: 0xa0604a, width: 1 });
    plant.addChild(pot);
    const soil = new Graphics();
    soil.ellipse(100, 350, 18, 4).fill({ color: 0x6b4e3d });
    plant.addChild(soil);
    const leaves = new Graphics();
    leaves.ellipse(95, 320, 14, 22).fill({ color: 0x6b9e5e });
    leaves.ellipse(108, 325, 12, 20).fill({ color: 0x7fb36e });
    leaves.ellipse(88, 330, 10, 16).fill({ color: 0x5a8e4e });
    leaves.ellipse(100, 306, 8, 14).fill({ color: 0x82b872 });
    leaves.ellipse(115, 318, 10, 10).fill({ color: 0x6ba85c });
    plant.addChild(leaves);
    this.addChild(plant);
  }

  private drawFishbowlCircle(): Graphics {
    const circle = new Graphics();
    circle.zIndex = 1;
    this.renderFishbowlEllipse(circle);
    this.addChild(circle);
    this.sortChildren();
    return circle;
  }

  private renderFishbowlEllipse(circle: Graphics): void {
    const cx = 400;
    const cy = 380;
    const rx = 170;
    const ry = 50;
    const segments = 48;
    for (let i = 0; i < segments; i++) {
      if (i % 2 !== 0) continue;
      const startAngle = (i / segments) * Math.PI * 2;
      const endAngle = ((i + 0.67) / segments) * Math.PI * 2;
      const steps = 6;
      circle.moveTo(cx + Math.cos(startAngle) * rx, cy + Math.sin(startAngle) * ry);
      for (let s = 1; s <= steps; s++) {
        const angle = startAngle + (endAngle - startAngle) * (s / steps);
        circle.lineTo(cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry);
      }
    }
    circle.stroke({ color: 0xf0c866, alpha: 0.5, width: 2 });
    circle.ellipse(cx, cy, rx - 4, ry - 2).fill({ color: 0xf5d780, alpha: 0.03 });
  }

  /** Call every frame with delta time */
  update(delta: number): void {
    this.pulseTime += delta * 0.02;

    if (this.useSpriteBackground) {
      // Animate ambient effects for sprite background

      // 1. Floating dust motes with alpha oscillation
      for (const p of this.particles) {
        p.y -= p.speed * delta;
        p.x = p.x + Math.sin(this.pulseTime * 0.5 + p.phase) * p.drift * 0.3;

        // Wrap around: reappear at bottom when going off top
        if (p.y < -10) {
          p.y = 460;
          p.x = Math.random() * 800;
        }
        // Wrap horizontally
        if (p.x < -10) p.x = 810;
        if (p.x > 810) p.x = -10;

        p.graphics.position.set(p.x, p.y);

        // Alpha oscillation: fade in/out based on y-position and time
        // Particles fade in as they rise, peak in the middle, fade out near top
        const yNorm = p.y / 450; // 0 at top, 1 at bottom
        const yFade = Math.sin(yNorm * Math.PI); // peaks at center (y=225)
        const timeFade = 0.8 + Math.sin(this.pulseTime * 0.3 + p.phase) * 0.2;
        p.graphics.alpha = p.baseAlpha * yFade * timeFade;
      }

      // 2. Window light shimmer (period ~8 seconds at 60fps)
      if (this.lightPatch) {
        const lightAlpha = 0.07 + Math.sin(this.pulseTime * 0.25) * 0.03;
        this.lightPatch.alpha = Math.max(0, lightAlpha);
      }
      // Secondary light patch — slightly different phase for natural feel
      if (this.lightPatchSecondary) {
        const secAlpha = 0.04 + Math.sin(this.pulseTime * 0.18 + 1.2) * 0.02;
        this.lightPatchSecondary.alpha = Math.max(0, secAlpha);
      }

      // 3. Ambient color shift (period ~20 seconds at 60fps)
      if (this.ambientOverlay) {
        const ambientAlpha = 0.02 + Math.sin(this.pulseTime * 0.1) * 0.01;
        this.ambientOverlay.alpha = Math.max(0, ambientAlpha);
      }

      if (this.tableShadow) {
        const pulse = Math.sin(this.pulseTime * 2);
        this.tableShadow.alpha = Room.TABLE_SHADOW_BASE_ALPHA + pulse * 0.03;
        this.tableShadow.scale.set(
          Room.TABLE_SHADOW_SCALE * (1 + pulse * 0.01),
          Room.TABLE_SHADOW_SCALE * (1 + pulse * 0.008),
        );
      }

      return;
    }

    // Procedural fallback: pulse fishbowl circle
    if (this.fishbowlCircle) {
      const alpha = 0.5 + Math.sin(this.pulseTime) * 0.2;
      this.fishbowlCircle.alpha = alpha;
    }
  }

  getTableSprite(): Sprite | null {
    return this.fishbowlTable;
  }

  getTablePosition(): { x: number; y: number } | null {
    if (!this.fishbowlTable) return null;
    return {
      x: this.fishbowlTable.position.x,
      y: this.fishbowlTable.position.y,
    };
  }

  setTablePosition(x: number, y: number): void {
    if (!this.fishbowlTable) return;
    this.fishbowlTable.position.set(x, y);
    if (this.tableShadow) {
      this.tableShadow.position.set(x, y + Room.TABLE_SHADOW_OFFSET_Y);
    }
  }
}
