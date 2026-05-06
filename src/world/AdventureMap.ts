import Phaser from 'phaser';

const TILE_SIZE = 64;
const MAP_ROWS = [
  '##############################',
  '#............TTTT............#',
  '#..,,,,......TTTT.....RR.....#',
  '#............TTTT............#',
  '#......RR............~~~~~~..#',
  '#...................~~~~~~~~.#',
  '#..######...........~~~==~~~.#',
  '#.......#...........~~~==~~~.#',
  '#.......#.....RR....~~~~~~~~.#',
  '#.......#...........~~~~~~...#',
  '#.......#....................#',
  '#..,,,,..................TTT.#',
  '#..,,,,......####........TTT.#',
  '#............#..#............#',
  '#............####.....RR.....#',
  '#............................#',
  '##############################',
] as const;

const MAP_WIDTH_TILES = MAP_ROWS[0].length;
const MAP_HEIGHT_TILES = MAP_ROWS.length;
const BLOCKED_TILES = new Set(['#', 'T', 'R', '~']);

const TILE_COLORS: Record<string, number> = {
  '.': 0x86efac,
  ',': 0x4ade80,
  '=': 0x92400e,
  '#': 0x475569,
  T: 0x14532d,
  R: 0x78716c,
  '~': 0x38bdf8,
};

const TILE_STROKES: Record<string, number> = {
  '.': 0x65a30d,
  ',': 0x15803d,
  '=': 0x451a03,
  '#': 0x334155,
  T: 0x052e16,
  R: 0x44403c,
  '~': 0x0284c7,
};

export type DinosaurSpawn = {
  x: number;
  y: number;
  maxHealth: number;
  movementSpeed: number;
  facing: -1 | 1;
  detectionRadius?: number;
  patrolPoints: Phaser.Types.Math.Vector2Like[];
};

export class AdventureMap {
  readonly worldBounds = new Phaser.Geom.Rectangle(0, 0, MAP_WIDTH_TILES * TILE_SIZE, MAP_HEIGHT_TILES * TILE_SIZE);
  readonly heroSpawn = { x: 224, y: 736 };
  readonly dinosaurSpawns: DinosaurSpawn[] = [
    {
      x: 832,
      y: 512,
      maxHealth: 3,
      movementSpeed: 115,
      facing: -1,
      patrolPoints: [
        { x: 704, y: 512 },
        { x: 1040, y: 512 },
        { x: 1040, y: 704 },
      ],
    },
    {
      x: 1420,
      y: 760,
      maxHealth: 4,
      movementSpeed: 95,
      facing: 1,
      detectionRadius: 340,
      patrolPoints: [
        { x: 1248, y: 760 },
        { x: 1540, y: 760 },
        { x: 1540, y: 960 },
      ],
    },
  ];

  private readonly scene: Phaser.Scene;
  private readonly collisionRectangles: Phaser.Geom.Rectangle[] = [];
  private readonly collisionBodies: Phaser.GameObjects.Rectangle[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.scene.cameras.main.setBackgroundColor('#86efac');

    this.validateRows();
    this.createGroundTiles();
    this.createCollisionRectangles();
    this.createCollisionBodies();
    this.createLandmarkLabels();
  }

  get blockers() {
    return this.collisionBodies;
  }

  resolveActorMovement(
    currentX: number,
    currentY: number,
    targetX: number,
    targetY: number,
    halfWidth: number,
    halfHeight: number,
  ) {
    let x = Phaser.Math.Clamp(targetX, this.worldBounds.left + halfWidth, this.worldBounds.right - halfWidth);
    let y = currentY;
    const dx = x - currentX;

    if (dx !== 0) {
      const horizontalBounds = this.createActorRectangle(x, y, halfWidth, halfHeight);

      this.collisionRectangles.forEach((blocked) => {
        if (!Phaser.Geom.Intersects.RectangleToRectangle(horizontalBounds, blocked)) {
          return;
        }

        x = dx > 0 ? blocked.left - halfWidth : blocked.right + halfWidth;
        horizontalBounds.x = x - halfWidth;
      });
    }

    y = Phaser.Math.Clamp(targetY, this.worldBounds.top + halfHeight, this.worldBounds.bottom - halfHeight);
    const dy = y - currentY;

    if (dy !== 0) {
      const verticalBounds = this.createActorRectangle(x, y, halfWidth, halfHeight);

      this.collisionRectangles.forEach((blocked) => {
        if (!Phaser.Geom.Intersects.RectangleToRectangle(verticalBounds, blocked)) {
          return;
        }

        y = dy > 0 ? blocked.top - halfHeight : blocked.bottom + halfHeight;
        verticalBounds.y = y - halfHeight;
      });
    }

    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(x, this.worldBounds.left + halfWidth, this.worldBounds.right - halfWidth),
      Phaser.Math.Clamp(y, this.worldBounds.top + halfHeight, this.worldBounds.bottom - halfHeight),
    );
  }

  private validateRows() {
    MAP_ROWS.forEach((row) => {
      if (row.length !== MAP_WIDTH_TILES) {
        throw new Error('Adventure map rows must all be the same width.');
      }
    });
  }

  private createGroundTiles() {
    MAP_ROWS.forEach((row, tileY) => {
      [...row].forEach((tile, tileX) => {
        const centerX = tileX * TILE_SIZE + TILE_SIZE / 2;
        const centerY = tileY * TILE_SIZE + TILE_SIZE / 2;

        this.scene.add
          .rectangle(centerX, centerY, TILE_SIZE, TILE_SIZE, TILE_COLORS[tile] ?? TILE_COLORS['.'])
          .setStrokeStyle(1, TILE_STROKES[tile] ?? TILE_STROKES['.'], 0.28)
          .setDepth(0);

        this.createTileDecoration(tile, centerX, centerY, tileX, tileY);
      });
    });
  }

  private createTileDecoration(tile: string, centerX: number, centerY: number, tileX: number, tileY: number) {
    if (tile === ',') {
      const sway = (tileX + tileY) % 3;
      this.scene.add.rectangle(centerX - 15, centerY + 8 - sway, 6, 28, 0x166534, 0.5).setDepth(1);
      this.scene.add.rectangle(centerX + 6, centerY + 4 + sway, 5, 24, 0x15803d, 0.45).setDepth(1);
      this.scene.add.rectangle(centerX + 19, centerY + 10, 4, 18, 0x16a34a, 0.45).setDepth(1);
      return;
    }

    if (tile === '=') {
      this.scene.add.rectangle(centerX, centerY - 14, TILE_SIZE, 8, 0x78350f, 0.8).setDepth(1);
      this.scene.add.rectangle(centerX, centerY + 14, TILE_SIZE, 8, 0x78350f, 0.8).setDepth(1);
      this.scene.add.rectangle(centerX, centerY, TILE_SIZE, 2, 0xfbbf24, 0.5).setDepth(1);
      return;
    }

    if (tile === '~') {
      this.scene.add.arc(centerX, centerY, 18, 15, 165, false, 0xbae6fd, 0.35).setDepth(1);
      return;
    }

    if (tile === 'T') {
      this.scene.add.rectangle(centerX, centerY + 13, 14, 34, 0x7c2d12).setDepth(2);
      this.scene.add.circle(centerX - 11, centerY - 6, 25, 0x166534).setDepth(2);
      this.scene.add.circle(centerX + 12, centerY - 9, 25, 0x15803d).setDepth(2);
      this.scene.add.circle(centerX, centerY - 25, 23, 0x16a34a).setDepth(2);
      return;
    }

    if (tile === 'R' || tile === '#') {
      const rockColor = tile === '#' ? 0x64748b : 0x8b8580;
      this.scene.add.ellipse(centerX - 6, centerY + 8, 46, 30, rockColor).setDepth(2);
      this.scene.add.ellipse(centerX + 12, centerY - 5, 34, 27, rockColor - 0x101010).setDepth(2);
    }
  }

  private createCollisionRectangles() {
    MAP_ROWS.forEach((row, tileY) => {
      let runStart: number | null = null;

      [...row].forEach((tile, tileX) => {
        const isBlocked = BLOCKED_TILES.has(tile);

        if (isBlocked && runStart === null) {
          runStart = tileX;
        }

        if ((!isBlocked || tileX === MAP_WIDTH_TILES - 1) && runStart !== null) {
          const runEnd = isBlocked && tileX === MAP_WIDTH_TILES - 1 ? tileX : tileX - 1;
          const runWidth = runEnd - runStart + 1;

          this.collisionRectangles.push(
            new Phaser.Geom.Rectangle(runStart * TILE_SIZE, tileY * TILE_SIZE, runWidth * TILE_SIZE, TILE_SIZE),
          );
          runStart = null;
        }
      });
    });
  }

  private createCollisionBodies() {
    this.collisionRectangles.forEach((rectangle) => {
      const body = this.scene.add
        .rectangle(rectangle.centerX, rectangle.centerY, rectangle.width, rectangle.height, 0xef4444, 0)
        .setDepth(3)
        .setData('collision', true);

      this.scene.physics.add.existing(body, true);
      this.collisionBodies.push(body);

      this.scene.add
        .rectangle(rectangle.centerX, rectangle.centerY, rectangle.width, rectangle.height)
        .setStrokeStyle(2, 0xfef3c7, 0.16)
        .setDepth(3);
    });
  }

  private createLandmarkLabels() {
    this.createLabel(210, 650, 'Trailhead');
    this.createLabel(720, 390, 'Old Quarry');
    this.createLabel(1450, 360, 'River Crossing');
    this.createLabel(1540, 900, 'Nest Clearing');
  }

  private createLabel(x: number, y: number, text: string) {
    this.scene.add
      .text(x, y, text, {
        color: '#f9fafb',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        stroke: '#14532d',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(4);
  }

  private createActorRectangle(x: number, y: number, halfWidth: number, halfHeight: number) {
    return new Phaser.Geom.Rectangle(x - halfWidth, y - halfHeight, halfWidth * 2, halfHeight * 2);
  }
}
