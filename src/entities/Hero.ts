import Phaser from 'phaser';

export type HeroMovementState = 'idle' | 'walk' | 'hurt' | 'dead';

type MovementKeys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
};

const HERO_HALF_WIDTH = 22;
const HERO_HALF_HEIGHT = 32;
const HERO_SPEED = 260;
const HERO_MAX_HEALTH = 5;
const HERO_INVULNERABILITY_MS = 900;

export class Hero extends Phaser.GameObjects.Container {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly wasd: MovementKeys;
  private readonly worldBounds: Phaser.Geom.Rectangle;
  private readonly torso: Phaser.GameObjects.Rectangle;
  private readonly leftLeg: Phaser.GameObjects.Rectangle;
  private readonly rightLeg: Phaser.GameObjects.Rectangle;
  private readonly head: Phaser.GameObjects.Arc;
  private healthValue = HERO_MAX_HEALTH;
  private invulnerableUntil = 0;
  private movementState: HeroMovementState = 'idle';
  private facing = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, worldBounds: Phaser.Geom.Rectangle) {
    super(scene, x, y);

    const keyboard = scene.input.keyboard;

    if (!keyboard) {
      throw new Error('Keyboard input is required for hero movement.');
    }

    this.worldBounds = worldBounds;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    const shadow = scene.add.ellipse(0, 28, 46, 16, 0x000000, 0.18);
    this.leftLeg = scene.add.rectangle(-10, 18, 9, 24, 0x1f2937);
    this.rightLeg = scene.add.rectangle(10, 18, 9, 24, 0x1f2937);
    this.torso = scene.add.rectangle(0, -4, 34, 42, 0x2563eb);
    this.head = scene.add.circle(0, -34, 17, 0xfbbf24);
    const eye = scene.add.circle(7, -38, 3, 0x111827);
    const pack = scene.add.rectangle(-22, -2, 12, 34, 0x7c2d12);

    this.add([shadow, pack, this.leftLeg, this.rightLeg, this.torso, this.head, eye]);
    this.setSize(HERO_HALF_WIDTH * 2, HERO_HALF_HEIGHT * 2);
    this.setDepth(10);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.arcadeBody
      .setSize(HERO_HALF_WIDTH * 2, HERO_HALF_HEIGHT * 2)
      .setOffset(-HERO_HALF_WIDTH, -HERO_HALF_HEIGHT)
      .setAllowGravity(false)
      .setCollideWorldBounds(true);
  }

  get movement() {
    return this.movementState;
  }

  get health() {
    return this.healthValue;
  }

  get maxHealth() {
    return HERO_MAX_HEALTH;
  }

  get isAlive() {
    return this.healthValue > 0;
  }

  get arcadeBody() {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  isInvulnerable(time = this.scene.time.now) {
    return time < this.invulnerableUntil;
  }

  takeDamage(amount: number, time = this.scene.time.now) {
    if (!this.isAlive || this.isInvulnerable(time) || amount <= 0) {
      return false;
    }

    this.healthValue = Math.max(0, this.healthValue - amount);
    this.invulnerableUntil = time + HERO_INVULNERABILITY_MS;

    if (!this.isAlive) {
      this.setMovementState('dead');
      this.arcadeBody.setVelocity(0, 0);
      this.arcadeBody.enable = false;
      return true;
    }

    this.setMovementState('hurt');
    return true;
  }

  heal(amount: number) {
    if (amount <= 0) {
      return;
    }

    this.healthValue = Math.min(HERO_MAX_HEALTH, this.healthValue + amount);
  }

  update(time: number, delta: number) {
    if (!this.isAlive) {
      this.playDeadPose();
      return;
    }

    const inputX = Number(this.isRightDown()) - Number(this.isLeftDown());
    const inputY = Number(this.isDownDown()) - Number(this.isUpDown());
    const inputLength = Math.hypot(inputX, inputY);
    const seconds = delta / 1000;

    if (inputLength > 0) {
      const normalizedX = inputX / inputLength;
      const normalizedY = inputY / inputLength;

      this.x = Phaser.Math.Clamp(
        this.x + normalizedX * HERO_SPEED * seconds,
        this.worldBounds.x + HERO_HALF_WIDTH,
        this.worldBounds.x + this.worldBounds.width - HERO_HALF_WIDTH,
      );
      this.y = Phaser.Math.Clamp(
        this.y + normalizedY * HERO_SPEED * seconds,
        this.worldBounds.y + HERO_HALF_HEIGHT,
        this.worldBounds.y + this.worldBounds.height - HERO_HALF_HEIGHT,
      );

      if (inputX !== 0) {
        this.facing = inputX > 0 ? 1 : -1;
        this.scaleX = this.facing;
      }

      this.setMovementState('walk');
      this.playWalkPose(time);
      this.playDamageFeedback(time);
      return;
    }

    this.setMovementState('idle');
    this.playIdlePose(time);
    this.playDamageFeedback(time);
  }

  private isUpDown() {
    return this.cursors.up.isDown || this.wasd.up.isDown;
  }

  private isDownDown() {
    return this.cursors.down.isDown || this.wasd.down.isDown;
  }

  private isLeftDown() {
    return this.cursors.left.isDown || this.wasd.left.isDown;
  }

  private isRightDown() {
    return this.cursors.right.isDown || this.wasd.right.isDown;
  }

  private setMovementState(nextState: HeroMovementState) {
    if (this.movementState === nextState) {
      return;
    }

    this.movementState = nextState;

    if (nextState === 'hurt') {
      this.torso.setFillStyle(0xdc2626);
      this.head.setFillStyle(0xf87171);
      return;
    }

    if (nextState === 'dead') {
      this.torso.setFillStyle(0x4b5563);
      this.head.setFillStyle(0x9ca3af);
      return;
    }

    this.torso.setFillStyle(nextState === 'walk' ? 0x1d4ed8 : 0x2563eb);
    this.head.setFillStyle(nextState === 'walk' ? 0xf59e0b : 0xfbbf24);
  }

  private playWalkPose(time: number) {
    const stride = Math.sin(time * 0.018);

    this.leftLeg.y = 18 + stride * 4;
    this.rightLeg.y = 18 - stride * 4;
    this.torso.y = -4 + Math.abs(stride) * 2;
    this.head.y = -34 + Math.abs(stride) * 2;
    this.rotation = stride * 0.035;
  }

  private playIdlePose(time: number) {
    const breath = Math.sin(time * 0.004) * 1.5;

    this.leftLeg.y = 18;
    this.rightLeg.y = 18;
    this.torso.y = -4 + breath;
    this.head.y = -34 + breath;
    this.rotation = 0;
  }

  private playDamageFeedback(time: number) {
    this.alpha = this.isInvulnerable(time) ? 0.45 + Math.sin(time * 0.04) * 0.25 : 1;
  }

  private playDeadPose() {
    this.setMovementState('dead');
    this.leftLeg.y = 18;
    this.rightLeg.y = 18;
    this.torso.y = -4;
    this.head.y = -34;
    this.rotation = Math.PI / 2;
    this.alpha = 0.8;
  }
}
