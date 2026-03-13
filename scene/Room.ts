import { Container, Graphics, TextStyle, Text } from 'pixi.js';

/**
 * Isometric conference room with floor, walls, window, plant, and fishbowl circle.
 * All rendered with PixiJS Graphics primitives.
 */
export class Room extends Container {
  private fishbowlCircle: Graphics;
  private pulseTime = 0;

  // Room dimensions (isometric)
  private readonly ROOM_WIDTH = 700;
  private readonly ROOM_HEIGHT = 400;
  private readonly FLOOR_Y_OFFSET = 180;
  private readonly WALL_HEIGHT = 220;

  constructor() {
    super();

    // Draw layers bottom-to-top
    this.drawBackWall();
    this.drawSideWalls();
    this.drawWindow();
    this.drawFloor();
    this.drawFloorGrid();
    this.drawPlant();

    this.fishbowlCircle = this.drawFishbowlCircle();
  }

  private drawBackWall(): void {
    const wall = new Graphics();
    // Back wall — warm off-white
    wall.rect(50, 40, this.ROOM_WIDTH, this.WALL_HEIGHT)
      .fill({ color: 0xf5efe6 });
    // Baseboard
    wall.rect(50, 40 + this.WALL_HEIGHT - 8, this.ROOM_WIDTH, 8)
      .fill({ color: 0xd4c5a9 });
    // Subtle wall shadow at top
    wall.rect(50, 40, this.ROOM_WIDTH, 3)
      .fill({ color: 0xe8e0d0 });
    this.addChild(wall);
  }

  private drawSideWalls(): void {
    // Left wall edge highlight
    const leftWall = new Graphics();
    leftWall.rect(47, 40, 3, this.WALL_HEIGHT)
      .fill({ color: 0xe0d8c8 });
    this.addChild(leftWall);

    // Right wall edge highlight
    const rightWall = new Graphics();
    rightWall.rect(50 + this.ROOM_WIDTH, 40, 3, this.WALL_HEIGHT)
      .fill({ color: 0xe0d8c8 });
    this.addChild(rightWall);
  }

  private drawWindow(): void {
    const windowGroup = new Container();

    // Window frame (outer)
    const frame = new Graphics();
    frame.roundRect(480, 70, 180, 140, 4)
      .fill({ color: 0xc9b896 });
    windowGroup.addChild(frame);

    // Window glass — light blue sky
    const glass = new Graphics();
    glass.roundRect(488, 78, 164, 124, 2)
      .fill({ color: 0xc5dff0 });
    windowGroup.addChild(glass);

    // Window cross bars
    const bars = new Graphics();
    bars.rect(568, 78, 4, 124)
      .fill({ color: 0xc9b896 });
    bars.rect(488, 138, 164, 4)
      .fill({ color: 0xc9b896 });
    windowGroup.addChild(bars);

    // Cloud shapes in window
    const cloud = new Graphics();
    cloud.ellipse(520, 110, 20, 8)
      .fill({ color: 0xe8f0fa, alpha: 0.7 });
    cloud.ellipse(610, 120, 16, 6)
      .fill({ color: 0xe8f0fa, alpha: 0.6 });
    windowGroup.addChild(cloud);

    // Window sill
    const sill = new Graphics();
    sill.rect(476, 202, 192, 8)
      .fill({ color: 0xb8a88c });
    windowGroup.addChild(sill);

    this.addChild(windowGroup);
  }

  private drawFloor(): void {
    const floor = new Graphics();
    // Warm wood-tone floor
    floor.rect(50, 40 + this.WALL_HEIGHT, this.ROOM_WIDTH, this.FLOOR_Y_OFFSET + 40)
      .fill({ color: 0xe8d5b8 });

    // Floor shadow near wall
    floor.rect(50, 40 + this.WALL_HEIGHT, this.ROOM_WIDTH, 12)
      .fill({ color: 0xdec9a8, alpha: 0.6 });

    this.addChild(floor);
  }

  private drawFloorGrid(): void {
    const grid = new Graphics();
    const floorTop = 40 + this.WALL_HEIGHT;
    const floorBottom = floorTop + this.FLOOR_Y_OFFSET + 40;

    // Subtle horizontal floorboard lines
    for (let y = floorTop + 20; y < floorBottom; y += 24) {
      grid.rect(50, y, this.ROOM_WIDTH, 1)
        .fill({ color: 0xd4c0a0, alpha: 0.3 });
    }

    // Subtle vertical grain lines (sparse)
    for (let x = 90; x < 50 + this.ROOM_WIDTH; x += 70) {
      grid.rect(x, floorTop, 1, floorBottom - floorTop)
        .fill({ color: 0xd4c0a0, alpha: 0.15 });
    }

    this.addChild(grid);
  }

  private drawPlant(): void {
    const plant = new Container();

    // Pot
    const pot = new Graphics();
    pot.roundRect(80, 350, 40, 50, 3)
      .fill({ color: 0xc47a5a });
    // Pot rim
    pot.roundRect(75, 345, 50, 10, 2)
      .fill({ color: 0xd4876a });
    plant.addChild(pot);

    // Soil
    const soil = new Graphics();
    soil.ellipse(100, 350, 18, 4)
      .fill({ color: 0x6b4e3d });
    plant.addChild(soil);

    // Leaves — stacked ellipses
    const leaves = new Graphics();
    // Main leaves
    leaves.ellipse(95, 320, 14, 22)
      .fill({ color: 0x6b9e5e });
    leaves.ellipse(108, 325, 12, 20)
      .fill({ color: 0x7fb36e });
    leaves.ellipse(88, 330, 10, 16)
      .fill({ color: 0x5a8e4e });
    // Top leaf
    leaves.ellipse(100, 306, 8, 14)
      .fill({ color: 0x82b872 });
    // Side leaf
    leaves.ellipse(115, 318, 10, 10)
      .fill({ color: 0x6ba85c });
    plant.addChild(leaves);

    this.addChild(plant);
  }

  private drawFishbowlCircle(): Graphics {
    const circle = new Graphics();
    circle.zIndex = 1;
    this.addChild(circle);
    this.sortChildren();
    return circle;
  }

  private renderFishbowlEllipse(alpha: number): void {
    this.fishbowlCircle.clear();

    const cx = 400;
    const cy = 380;
    const rx = 170;
    const ry = 50;
    const segments = 48;
    const dashLen = 4;

    // Draw dashed ellipse
    for (let i = 0; i < segments; i++) {
      if (i % 2 !== 0) continue; // skip every other segment for dash effect

      const startAngle = (i / segments) * Math.PI * 2;
      const endAngle = ((i + dashLen / 6) / segments) * Math.PI * 2;
      const steps = 6;

      const dashGraphic = new Graphics();

      dashGraphic.moveTo(
        cx + Math.cos(startAngle) * rx,
        cy + Math.sin(startAngle) * ry
      );

      for (let s = 1; s <= steps; s++) {
        const angle = startAngle + (endAngle - startAngle) * (s / steps);
        dashGraphic.lineTo(
          cx + Math.cos(angle) * rx,
          cy + Math.sin(angle) * ry
        );
      }

      dashGraphic.stroke({ color: 0xf0c866, alpha: alpha, width: 2 });
      this.fishbowlCircle.addChild(dashGraphic);
    }

    // Inner glow ellipse
    const glow = new Graphics();
    glow.ellipse(cx, cy, rx - 4, ry - 2)
      .fill({ color: 0xf5d780, alpha: alpha * 0.06 });
    this.fishbowlCircle.addChild(glow);
  }

  /** Call every frame with delta time to animate the fishbowl circle pulse */
  update(delta: number): void {
    this.pulseTime += delta * 0.02;
    const alpha = 0.5 + Math.sin(this.pulseTime) * 0.2;

    // Clear and redraw the fishbowl circle with new alpha
    this.fishbowlCircle.removeChildren();
    this.renderFishbowlEllipse(alpha);
  }
}
