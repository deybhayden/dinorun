import Phaser from 'phaser';

export type DinosaurMovementState = 'idle' | 'walk' | 'hurt' | 'dead';

export type DinosaurEnemyOptions = {
  maxHealth?: number;
  movementSpeed?: number;
  facing?: -1 | 1;
};

const DINO_BODY_WIDTH = 108;
const DINO_BODY_HEIGHT = 58;
const DINO_BODY_OFFSET_X = -54;
const DINO_BODY_OFFSET_Y = -52;
const DEFAULT_DINO_HEALTH = 3;
const DEFAULT_DINO_SPEED = 115;

export class DinosaurEnemy extends Phaser.GameObjects.Container {
  private readonly maxHealthValue: number;
  private readonly speed: number;
  private readonly bodyShape: Phaser.GameObjects.Ellipse;
  private readonly head: Phaser.GameObjects.Arc;
  private readonly tail: Phaser.GameObjects.Triangle;
  private readonly leftLeg: Phaser.GameObjects.Rectangle;
  private readonly rightLeg: Phaser.GameObjects.Rectangle;
  private readonly healthText: Phaser.GameObjects.Text;
  private healthValue: number;
  private movementState: DinosaurMovementState = 'idle';
  private facing: -1 | 1;
  private hurtUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, options: DinosaurEnemyOptions = {}) {
    super(scene, x, y);

    this.maxHealthValue = options.maxHealth ?? DEFAULT_DINO_HEALTH;
    this.healthValue = this.maxHealthValue;
    this.speed = options.movementSpeed ?? DEFAULT_DINO_SPEED;
    this.facing = options.facing ?? -1;

    const shadow = scene.add.ellipse(0, 20, 118, 24, 0x000000, 0.16);
    this.tail = scene.add.triangle(-58, -16, 0, 14, 0, -18, -50, 8, 0x15803d);
    this.bodyShape = scene.add.ellipse(0, -18, 96, 54, 0x16a34a);
    const belly = scene.add.ellipse(10, -9, 56, 28, 0xbbf7d0, 0.7);
    const neck = scene.add.rectangle(42, -40, 22, 44, 0x16a34a).setRotation(-0.35);
    this.head = scene.add.circle(61, -62, 24, 0x22c55e);
    const snout = scene.add.rectangle(79, -56, 30, 16, 0x22c55e);
    const eye = scene.add.circle(66, -70, 3, 0x111827);
    const tooth = scene.add.triangle(82, -47, 0, 0, 8, 0, 4, 8, 0xf8fafc);
    this.leftLeg = scene.add.rectangle(-23, 11, 13, 32, 0x14532d);
    this.rightLeg = scene.add.rectangle(25, 11, 13, 32, 0x14532d);

    this.healthText = scene.add
      .text(0, -98, `${this.healthValue}/${this.maxHealthValue}`, {
        color: '#f8fafc',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        stroke: '#052e16',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.add([
      shadow,
      this.tail,
      this.leftLeg,
      this.rightLeg,
      this.bodyShape,
      belly,
      neck,
      this.head,
      snout,
      eye,
      tooth,
      this.healthText,
    ]);
    this.setSize(DINO_BODY_WIDTH, DINO_BODY_HEIGHT);
    this.setDepth(8);
    this.scaleX = this.facing;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.arcadeBody
      .setSize(DINO_BODY_WIDTH, DINO_BODY_HEIGHT)
      .setOffset(DINO_BODY_OFFSET_X, DINO_BODY_OFFSET_Y)
      .setAllowGravity(false)
      .setCollideWorldBounds(true)
      .setMaxSpeed(this.speed);
  }

  get health() {
    return this.healthValue;
  }

  get maxHealth() {
    return this.maxHealthValue;
  }

  get movementSpeed() {
    return this.speed;
  }

  get movement() {
    return this.movementState;
  }

  get isAlive() {
    return this.healthValue > 0;
  }

  get arcadeBody() {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  update(time: number) {
    if (!this.isAlive) {
      this.playDeadPose();
      return;
    }

    if (time < this.hurtUntil) {
      this.setMovementState('hurt');
      this.playHurtPose(time);
      return;
    }

    const velocity = this.arcadeBody.velocity;

    if (velocity.lengthSq() > 1) {
      this.facing = velocity.x >= 0 ? 1 : -1;
      this.scaleX = this.facing;
      this.setMovementState('walk');
      this.playWalkPose(time);
      return;
    }

    this.setMovementState('idle');
    this.playIdlePose(time);
  }

  setMoveDirection(directionX: number, directionY = 0) {
    if (!this.isAlive) {
      this.arcadeBody.setVelocity(0, 0);
      return;
    }

    const length = Math.hypot(directionX, directionY);

    if (length === 0) {
      this.arcadeBody.setVelocity(0, 0);
      return;
    }

    this.arcadeBody.setVelocity((directionX / length) * this.speed, (directionY / length) * this.speed);
  }

  takeDamage(amount: number) {
    if (!this.isAlive || amount <= 0) {
      return;
    }

    this.healthValue = Math.max(0, this.healthValue - amount);
    this.healthText.setText(`${this.healthValue}/${this.maxHealthValue}`);
    this.hurtUntil = this.scene.time.now + 220;

    if (!this.isAlive) {
      this.arcadeBody.setVelocity(0, 0);
      this.arcadeBody.enable = false;
      this.setMovementState('dead');
    }
  }

  private setMovementState(nextState: DinosaurMovementState) {
    if (this.movementState === nextState) {
      return;
    }

    this.movementState = nextState;

    if (nextState === 'hurt') {
      this.bodyShape.setFillStyle(0xef4444);
      this.head.setFillStyle(0xf87171);
      return;
    }

    if (nextState === 'dead') {
      this.bodyShape.setFillStyle(0x4b5563);
      this.head.setFillStyle(0x6b7280);
      return;
    }

    this.bodyShape.setFillStyle(nextState === 'walk' ? 0x15803d : 0x16a34a);
    this.head.setFillStyle(nextState === 'walk' ? 0x16a34a : 0x22c55e);
  }

  private playWalkPose(time: number) {
    const stride = Math.sin(time * 0.016);

    this.leftLeg.y = 11 + stride * 4;
    this.rightLeg.y = 11 - stride * 4;
    this.bodyShape.y = -18 + Math.abs(stride) * 1.5;
    this.head.y = -62 + Math.abs(stride) * 1.5;
    this.tail.rotation = stride * 0.12;
    this.rotation = stride * 0.018;
    this.alpha = 1;
  }

  private playIdlePose(time: number) {
    const breath = Math.sin(time * 0.004) * 1.2;

    this.leftLeg.y = 11;
    this.rightLeg.y = 11;
    this.bodyShape.y = -18 + breath;
    this.head.y = -62 + breath;
    this.tail.rotation = 0;
    this.rotation = 0;
    this.alpha = 1;
  }

  private playHurtPose(time: number) {
    const shake = Math.sin(time * 0.08);

    this.rotation = shake * 0.04;
    this.alpha = 0.85;
  }

  private playDeadPose() {
    this.setMovementState('dead');
    this.leftLeg.y = 11;
    this.rightLeg.y = 11;
    this.tail.rotation = -0.2;
    this.rotation = -0.35;
    this.alpha = 0.7;
  }
}
