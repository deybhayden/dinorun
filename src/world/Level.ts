import Phaser from 'phaser';
import { SPRITE_DIMENSIONS } from '../assets/SpriteFactory';

const TILE = SPRITE_DIMENSIONS.tile.width; // 32
export const LEVEL_TILE_SIZE = TILE;

// Terrain tile glyphs:
//   '.' empty / sky
//   'g' grass (solid)
//   'd' dirt  (solid)
//   'p' platform (solid, floating)
//   's' spike (hazard)
//   'T' decorative tree (non-solid background)
//
// 160 columns wide x 17 rows tall = 5120 x 544 pixels.
// World ground line is row 14 (top of grass).
const ROWS = [
  '................................................................................................................................................................',
  '................................................................................................................................................................',
  '................................................................................................................................................................',
  '................................................................................................................................................................',
  '................................................................................................................................................................',
  '................................................................................................................................................................',
  '................................................................................................................................................................',
  '................................................................................................................................................................',
  '................................................................................................................................................................',
  '..........................pppp......................................................................pppp........................................................',
  '................................................................................................................................................................',
  '................................................pppp..................pppp.........................................................ppp..........................',
  '................................................................................................................................................................',
  '..........T......................T..........................T...................T........................T...................T........................T.......F.',
  'gggggggggggggggggggggggggg....gggggggggggggggggggggggggggggggggggggggg....gggggggggggggggggggggggggg....gggggggggggggggggggggggggggsssgggggggggggggggggggggggggg',
  'dddddddddddddddddddddddddd....dddddddddddddddddddddddddddddddddddddddd....dddddddddddddddddddddddddd....dddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
  'dddddddddddddddddddddddddd....dddddddddddddddddddddddddddddddddddddddd....dddddddddddddddddddddddddd....dddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
] as const;

const SOLID_TILES = new Set(['g', 'd', 'p']);

export type EnemySpawnType = 'raptor' | 'trex';

export type EnemySpawn = {
  type: EnemySpawnType;
  /** Tile column. */
  tileX: number;
  /** Tile row of the surface the dinosaur stands on (top of grass = row 14). */
  tileY: number;
  /** Optional patrol range in tiles, clamped to surface. */
  patrolRange?: number;
};

const HERO_SPAWN_TILE = { x: 3, y: 14 };

// Section layout (cols): 0-25 ground | 26-29 pit | 30-69 ground | 70-73 pit |
//   74-99 ground (T-Rex zone) | 100-103 pit | 104-130 ground | 131-133 spikes |
//   134-159 ground (goal at 158).
const ENEMY_SPAWNS: EnemySpawn[] = [
  { type: 'raptor', tileX: 18, tileY: 14, patrolRange: 2 },
  { type: 'raptor', tileX: 45, tileY: 14, patrolRange: 5 },
  { type: 'raptor', tileX: 60, tileY: 14, patrolRange: 5 },
  { type: 'trex', tileX: 86, tileY: 14, patrolRange: 8 },
  { type: 'raptor', tileX: 115, tileY: 14, patrolRange: 4 },
  { type: 'raptor', tileX: 145, tileY: 14, patrolRange: 4 },
];

const GOAL_TILE = { x: 158, y: 14 };

export class Level {
  readonly tileSize = TILE;
  readonly cols: number;
  readonly rows: number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly heroSpawn: Phaser.Math.Vector2;
  readonly enemySpawns: EnemySpawn[] = ENEMY_SPAWNS;
  readonly goalPosition: Phaser.Math.Vector2;
  readonly goalRect: Phaser.Geom.Rectangle;

  private readonly scene: Phaser.Scene;
  private readonly solidGroup: Phaser.Physics.Arcade.StaticGroup;
  private readonly hazardRects: Phaser.Geom.Rectangle[] = [];

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.cols = ROWS[0].length;
    this.rows = ROWS.length;
    this.worldWidth = this.cols * TILE;
    this.worldHeight = this.rows * TILE;
    this.heroSpawn = new Phaser.Math.Vector2(
      HERO_SPAWN_TILE.x * TILE + TILE / 2,
      HERO_SPAWN_TILE.y * TILE,
    );
    this.goalPosition = new Phaser.Math.Vector2(
      GOAL_TILE.x * TILE + TILE / 2,
      GOAL_TILE.y * TILE,
    );
    this.goalRect = new Phaser.Geom.Rectangle(
      GOAL_TILE.x * TILE,
      (GOAL_TILE.y - 6) * TILE,
      TILE,
      TILE * 7,
    );

    this.validate();

    this.drawSky();
    this.drawDecorations();
    this.solidGroup = scene.physics.add.staticGroup();
    this.buildTerrain();
    this.drawGoalFlag();
  }

  /** Static physics group for player/enemy collision. */
  get colliders() {
    return this.solidGroup;
  }

  /** World-space hazard rectangles (spikes). */
  get hazards(): readonly Phaser.Geom.Rectangle[] {
    return Object.freeze([...this.hazardRects]);
  }

  /** Surface Y (top edge in pixels) for an enemy standing on tile row. */
  surfaceYFor(tileY: number) {
    return tileY * TILE;
  }

  private validate() {
    ROWS.forEach((row) => {
      if (row.length !== this.cols) {
        throw new Error('Level rows must all be the same width.');
      }
    });
  }

  private drawSky() {
    // Volcanic sunset sky gradient matching the cover image. Behind everything.
    const g = this.scene.add.graphics();
    g.setDepth(-100);
    g.setScrollFactor(0);
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    // Purple/pink top to orange/gold bottom - volcanic sunset
    g.fillGradientStyle(0x8b5a7c, 0x8b5a7c, 0xd4956a, 0xd4956a, 1);
    g.fillRect(0, 0, w, h);

    // Distant mountains parallax - dark purple/brown silhouettes.
    const mountains = this.scene.add.graphics();
    mountains.setDepth(-90);
    mountains.setScrollFactor(0.2, 0);
    mountains.fillStyle(0x5a3d4a, 1);
    for (let i = 0; i < 30; i += 1) {
      const baseX = i * 220;
      mountains.fillTriangle(baseX, 380, baseX + 110, 200, baseX + 220, 380);
    }
    const hills = this.scene.add.graphics();
    hills.setDepth(-80);
    hills.setScrollFactor(0.45, 0);
    hills.fillStyle(0x4a5d3a, 1);
    for (let i = 0; i < 60; i += 1) {
      const baseX = i * 160;
      hills.fillTriangle(baseX, 440, baseX + 80, 320, baseX + 160, 440);
    }
  }

  private drawDecorations() {
    // Background trees (drawn from level data 'T' glyphs) sit behind everything else.
    ROWS.forEach((row, tileY) => {
      for (let tileX = 0; tileX < row.length; tileX += 1) {
        const ch = row[tileX];
        if (ch !== 'T') continue;
        const x = tileX * TILE + TILE / 2;
        const y = tileY * TILE + TILE; // anchor at the bottom of the tile (foot)
        this.scene.add
          .sprite(x, y, 'tree', 'tree')
          .setOrigin(0.5, 1)
          .setScale(2)
          .setDepth(-10);
      }
    });
  }

  private buildTerrain() {
    ROWS.forEach((row, tileY) => {
      for (let tileX = 0; tileX < row.length; tileX += 1) {
        const ch = row[tileX];
        if (ch === '.' || ch === 'T' || ch === 'F') continue;

        const x = tileX * TILE + TILE / 2;
        const y = tileY * TILE + TILE / 2;

        let frame: string | null = null;
        if (ch === 'g') frame = 'grass';
        else if (ch === 'd') frame = 'dirt';
        else if (ch === 'p') frame = 'platform';
        else if (ch === 's') frame = 'spike';
        if (!frame) continue;

        const sprite = this.scene.physics.add.staticSprite(x, y, 'tiles', frame);
        sprite.setDepth(-1);

        if (ch === 's') {
          // Hazard: still solid for stand-on, but smaller body that lives in upper half.
          // We treat the whole tile as a damage zone via hazardRects; visuals stay full size.
          this.hazardRects.push(new Phaser.Geom.Rectangle(tileX * TILE, tileY * TILE, TILE, TILE));
        }

        if (ch === 'p') {
          // Platforms: only solid from above. We tag the sprite and use
          // a processCallback in the collider to skip collision when moving up.
          sprite.refreshBody();
          sprite.body.setSize(TILE, 8, false).setOffset(0, 0);
          sprite.setData('oneWay', true);
        }

        if (SOLID_TILES.has(ch) || ch === 's') {
          this.solidGroup.add(sprite);
        }
      }
    });
  }

  private drawGoalFlag() {
    const x = this.goalPosition.x;
    // Goal sprite is anchored from the top of its 64-tall texture; place its base near the ground.
    const y = this.goalPosition.y - SPRITE_DIMENSIONS.goal.height + 6;
    this.scene.add
      .sprite(x, y, 'goal', 'flag')
      .setOrigin(0.5, 0)
      .setScale(1)
      .setDepth(-2);
  }
}
