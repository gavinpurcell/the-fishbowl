import { Container, Graphics, Sprite, Texture } from 'pixi.js';
import { getRoomTexture } from '@/lib/spriteLoader';

/**
 * Room background using pixel art sprite.
 * Falls back to procedural drawing if sprite textures aren't loaded.
 */
export class Room extends Container {
  private pulseTime = 0;
  private useSpriteBackground: boolean;

  // Fallback fields
  private fishbowlCircle: Graphics | null = null;

  // Room dimensions (procedural fallback)
  private readonly ROOM_WIDTH = 700;
  private readonly ROOM_HEIGHT = 400;
  private readonly FLOOR_Y_OFFSET = 180;
  private readonly WALL_HEIGHT = 220;

  constructor() {
    super();

    const bgTexture = getRoomTexture('room_bg');
    const tableTexture = getRoomTexture('coffee_table');

    if (bgTexture && bgTexture !== Texture.EMPTY) {
      // === SPRITE-BASED RENDERING ===
      this.useSpriteBackground = true;

      // Room background (800x600)
      const bgSprite = new Sprite(bgTexture);
      bgSprite.texture.source.scaleMode = 'nearest';
      bgSprite.position.set(0, 0);
      // Scale to fill 800x600 canvas
      bgSprite.width = 800;
      bgSprite.height = 600;
      this.addChild(bgSprite);

      // Coffee table at center
      if (tableTexture && tableTexture !== Texture.EMPTY) {
        const tableSprite = new Sprite(tableTexture);
        tableSprite.texture.source.scaleMode = 'nearest';
        tableSprite.anchor.set(0.5, 0.5);
        tableSprite.position.set(400, 400);
        tableSprite.scale.set(0.15);
        tableSprite.zIndex = 1;
        this.addChild(tableSprite);
      }
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
    if (this.useSpriteBackground) {
      // Nothing to animate for sprite background
      return;
    }

    // Procedural fallback: pulse fishbowl circle
    if (this.fishbowlCircle) {
      this.pulseTime += delta * 0.02;
      const alpha = 0.5 + Math.sin(this.pulseTime) * 0.2;
      this.fishbowlCircle.alpha = alpha;
    }
  }
}
