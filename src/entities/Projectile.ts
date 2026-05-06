import Phaser from 'phaser';
import { SPRITE_DIMENSIONS } from '../assets/SpriteFactory';

const PROJECTILE_SPEED = 620;
const PROJECTILE_LIFETIME_MS = 1100;

export class Projectile extends Phaser.Physics.Arcade.Sprite {
  private spawnTime = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'projectile', 'bolt');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setScale(2);
    this.setDepth(15);
    this.body!.setSize(SPRITE_DIMENSIONS.projectile.width, SPRITE_DIMENSIONS.projectile.height);
    (this.body as Phaser.Physics.Arcade.Body).setAllowGravity(false);
  }

  fire(direction: -1 | 1, time: number) {
    this.spawnTime = time;
    this.setActive(true);
    this.setVisible(true);
    this.body!.enable = true;
    this.setFlipX(direction === -1);
    (this.body as Phaser.Physics.Arcade.Body).setVelocity(direction * PROJECTILE_SPEED, 0);
  }

  protected preUpdate(time: number, delta: number) {
    super.preUpdate(time, delta);
    if (!this.active || this.spawnTime === 0) return;
    if (time - this.spawnTime > PROJECTILE_LIFETIME_MS) {
      this.disable();
    }
  }

  disable() {
    this.spawnTime = 0;
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (body) {
      body.setVelocity(0, 0);
      body.enable = false;
    }
    this.setActive(false);
    this.setVisible(false);
  }
}
