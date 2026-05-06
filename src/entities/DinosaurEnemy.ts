import Phaser from 'phaser';

export type DinosaurKind = 'raptor' | 'trex';

export type DinosaurOptions = {
  kind: DinosaurKind;
  /** World x in pixels. */
  x: number;
  /** Surface y (top of grass) in pixels — feet sit on this line. */
  surfaceY: number;
  /** Half-width of patrol range, in pixels. */
  patrolHalfWidth?: number;
};

const RAPTOR_CONFIG = {
  scale: 2,
  patrolSpeed: 70,
  chaseSpeed: 150,
  detectionRangeX: 320,
  contactDamage: 1,
  health: 2,
  invincible: false,
} as const;

const TREX_CONFIG = {
  scale: 2,
  patrolSpeed: 55,
  chaseSpeed: 170,
  detectionRangeX: 520,
  contactDamage: 3,
  health: 999,
  invincible: true,
} as const;

export class DinosaurEnemy extends Phaser.Physics.Arcade.Sprite {
  readonly kind: DinosaurKind;
  readonly invincible: boolean;
  readonly contactDamage: number;
  private healthValue: number;
  private readonly patrolMinX: number;
  private readonly patrolMaxX: number;
  private readonly patrolSpeed: number;
  private readonly chaseSpeed: number;
  private readonly detectionRangeX: number;
  private hurtUntil = 0;
  private removed = false;
  private facing: -1 | 1 = -1;

  constructor(scene: Phaser.Scene, options: DinosaurOptions) {
    const { kind, x, surfaceY, patrolHalfWidth = 96 } = options;
    const config = kind === 'trex' ? TREX_CONFIG : RAPTOR_CONFIG;

    super(scene, x, surfaceY, kind, 'walk1');

    this.kind = kind;
    this.invincible = config.invincible;
    this.contactDamage = config.contactDamage;
    this.healthValue = config.health;
    this.patrolSpeed = config.patrolSpeed;
    this.chaseSpeed = config.chaseSpeed;
    this.detectionRangeX = config.detectionRangeX;
    this.patrolMinX = x - patrolHalfWidth;
    this.patrolMaxX = x + patrolHalfWidth;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(config.scale);
    this.setOrigin(0.5, 1);
    this.setDepth(kind === 'trex' ? 9 : 8);

    // Configure body for ground physics. Body coords are in *texture* space
    // (the unscaled sprite frame), Phaser scales it automatically.
    if (kind === 'trex') {
      // T-Rex: body covers most of the body area but not the head.
      this.body!.setSize(46, 28);
      (this.body as Phaser.Physics.Arcade.Body).setOffset(8, 14);
    } else {
      // Raptor: body around torso/legs.
      this.body!.setSize(22, 16);
      (this.body as Phaser.Physics.Arcade.Body).setOffset(4, 6);
    }

    this.setCollideWorldBounds(true);
    this.play(kind === 'trex' ? 'trex-walk' : 'raptor-walk');
    this.setFacing(-1);
  }

  get isAlive() {
    return this.healthValue > 0;
  }

  get health() {
    return this.healthValue;
  }

  get arcadeBody() {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  takeDamage(amount: number) {
    if (!this.isAlive || amount <= 0) return false;
    if (this.invincible) {
      this.flashInvincible();
      return false;
    }

    this.healthValue = Math.max(0, this.healthValue - amount);
    this.hurtUntil = this.scene.time.now + 200;
    this.play(`${this.kind}-hurt`, true);

    if (!this.isAlive) {
      this.defeat();
    }
    return true;
  }

  private flashInvincible() {
    this.scene.tweens.killTweensOf(this);
    this.alpha = 1;
    this.clearTint();
    this.setTint(0xffffff);
    this.scene.tweens.add({
      targets: this,
      alpha: 0.4,
      duration: 80,
      yoyo: true,
      repeat: 1,
      onComplete: () => {
        this.alpha = 1;
        this.clearTint();
      },
    });
  }

  private defeat() {
    this.arcadeBody.setVelocity(0, 0);
    this.arcadeBody.enable = false;
    this.setRotation(Math.PI / 2);
    this.setAlpha(0.8);
    this.setTint(0x888888);
    this.scene.time.delayedCall(700, () => {
      this.removed = true;
      this.setActive(false);
      this.setVisible(false);
    });
  }

  update(time: number, target?: Phaser.Math.Vector2) {
    if (!this.isAlive || this.removed) return;
    if (time < this.hurtUntil) {
      this.arcadeBody.setVelocityX(0);
      return;
    }

    // Resume animation after hurt frame.
    const walkAnim = `${this.kind}-walk`;
    if (this.anims.currentAnim?.key !== walkAnim) {
      this.play(walkAnim, true);
    }

    const distX = target ? target.x - this.x : Number.POSITIVE_INFINITY;
    const distY = target ? Math.abs(target.y - this.y) : Number.POSITIVE_INFINITY;
    const inRange = target !== undefined
      && Math.abs(distX) <= this.detectionRangeX
      && distY <= 120;

    if (inRange) {
      const dir: -1 | 1 = distX < 0 ? -1 : 1;
      this.setFacing(dir);
      this.arcadeBody.setVelocityX(dir * this.chaseSpeed);
      return;
    }

    // Patrol within bounds.
    if (this.x <= this.patrolMinX) this.setFacing(1);
    else if (this.x >= this.patrolMaxX) this.setFacing(-1);

    this.arcadeBody.setVelocityX(this.facing * this.patrolSpeed);
  }

  private setFacing(next: -1 | 1) {
    this.facing = next;
    this.setFlipX(next === 1); // sprites drawn facing left by default
  }
}
