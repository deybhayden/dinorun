import Phaser from 'phaser';
import { Hero } from '../entities/Hero';

const WORLD_WIDTH = 1920;
const WORLD_HEIGHT = 1080;
const GROUND_Y = 820;

export class WorldScene extends Phaser.Scene {
  private readonly worldBounds = new Phaser.Geom.Rectangle(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  private hero!: Hero;
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super('WorldScene');
  }

  create() {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    this.createPlaceholderBackground();
    this.createTitleCard();
    this.createHero();
    this.createHud();

    this.cameras.main.startFollow(this.hero, true, 0.12, 0.12);
  }

  update(time: number, delta: number) {
    this.hero.update(time, delta);
    this.statusText.setText(`Hero: ${this.hero.movement}`);
  }

  private createHero() {
    this.hero = new Hero(this, 480, 420, this.worldBounds);
  }

  private createPlaceholderBackground() {
    this.cameras.main.setBackgroundColor('#86efac');

    this.add.rectangle(WORLD_WIDTH / 2, GROUND_Y + 120, WORLD_WIDTH, 280, 0x65a30d);
    this.add.rectangle(WORLD_WIDTH / 2, GROUND_Y + 230, WORLD_WIDTH, 120, 0x4d7c0f);

    this.add.circle(1680, 140, 56, 0xfacc15);

    this.add.triangle(190, GROUND_Y - 115, 0, 170, 170, 0, 340, 170, 0x6b7280);
    this.add.triangle(430, GROUND_Y - 100, 0, 210, 230, 0, 460, 210, 0x4b5563);
    this.add.triangle(340, GROUND_Y - 130, 0, 96, 110, 0, 220, 96, 0xf3f4f6);
    this.add.triangle(1180, GROUND_Y - 95, 0, 180, 190, 0, 380, 180, 0x64748b);
    this.add.triangle(1285, GROUND_Y - 120, 0, 88, 100, 0, 200, 88, 0xf8fafc);

    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0x166534, 0.3);

    for (let x = 0; x <= WORLD_WIDTH; x += 64) {
      graphics.lineBetween(x, 0, x, WORLD_HEIGHT);
    }

    for (let y = 0; y <= WORLD_HEIGHT; y += 64) {
      graphics.lineBetween(0, y, WORLD_WIDTH, y);
    }

    graphics.lineStyle(6, 0x14532d, 0.8);
    graphics.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  }

  private createTitleCard() {
    const panel = this.add.rectangle(480, 190, 440, 160, 0xf9fafb, 0.88);
    panel.setStrokeStyle(3, 0x1f2937);

    this.add
      .text(480, 155, 'Dino Run', {
        color: '#1f2937',
        fontFamily: 'Arial, sans-serif',
        fontSize: '48px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(480, 214, 'Use WASD or arrow keys to explore', {
        color: '#374151',
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
      })
      .setOrigin(0.5);
  }

  private createHud() {
    this.add
      .text(16, 16, 'Move: WASD / Arrow Keys', {
        color: '#f9fafb',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        stroke: '#111827',
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.statusText = this.add
      .text(16, 44, 'Hero: idle', {
        color: '#f9fafb',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        stroke: '#111827',
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(100);
  }
}
