import Phaser from 'phaser';

export type HeroMovementState = 'idle' | 'walk' | 'attack' | 'hurt' | 'dead';

type MovementKeys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
};

const HERO_HALF_WIDTH = 22;
const HERO_HALF_HEIGHT = 32;
const HERO_COLLISION_WIDTH = 32;
const HERO_COLLISION_HEIGHT = 20;
const HERO_COLLISION_OFFSET_X = -HERO_COLLISION_WIDTH / 2;
const HERO_COLLISION_OFFSET_Y = 10;
const HERO_SPEED = 260;
const HERO_MAX_HEALTH = 5;
const HERO_INVULNERABILITY_MS = 900;
const HERO_ATTACK_DAMAGE = 1;
const HERO_ATTACK_RANGE = 74;
const HERO_ATTACK_HEIGHT = 72;
const HERO_ATTACK_ACTIVE_MS = 160;
const HERO_ATTACK_DURATION_MS = 260;
const HERO_ATTACK_COOLDOWN_MS = 430;

export class Hero extends Phaser.GameObjects.Container {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly wasd: MovementKeys;
  private readonly attackKeys: Phaser.Input.Keyboard.Key[];
  private readonly torso: Phaser.GameObjects.Rectangle;
  private readonly leftLeg: Phaser.GameObjects.Rectangle;
  private readonly rightLeg: Phaser.GameObjects.Rectangle;
  private readonly head: Phaser.GameObjects.Arc;
  private readonly attackIndicator: Phaser.GameObjects.Rectangle;
  private healthValue = HERO_MAX_HEALTH;
  private invulnerableUntil = 0;
  private movementState: HeroMovementState = 'idle';
  private facing: -1 | 1 = 1;
  private attackDirX: -1 | 0 | 1 = 1;
  private attackDirY: -1 | 0 | 1 = 0;
  private attackActiveUntil = 0;
  private attackUntil = 0;
  private nextAttackAt = 0;
  private currentAttackId = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    const keyboard = scene.input.keyboard;

    if (!keyboard) {
      throw new Error('Keyboard input is required for hero movement.');
    }

    this.cursors = keyboard.createCursorKeys();
    this.wasd = {
      up: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
    this.attackKeys = [
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.J),
    ];

    const shadow = scene.add.ellipse(0, 28, 46, 16, 0x000000, 0.18);
    this.leftLeg = scene.add.rectangle(-10, 18, 9, 24, 0x1f2937);
    this.rightLeg = scene.add.rectangle(10, 18, 9, 24, 0x1f2937);
    this.torso = scene.add.rectangle(0, -4, 34, 42, 0x2563eb);
    this.head = scene.add.circle(0, -34, 17, 0xfbbf24);
    const eye = scene.add.circle(7, -38, 3, 0x111827);
    const pack = scene.add.rectangle(-22, -2, 12, 34, 0x7c2d12);
    this.attackIndicator = scene.add
      .rectangle(HERO_HALF_WIDTH + HERO_ATTACK_RANGE / 2, 0, HERO_ATTACK_RANGE, HERO_ATTACK_HEIGHT, 0xfef08a, 0.22)
      .setStrokeStyle(2, 0xfacc15, 0.82)
      .setVisible(false);

    this.add([shadow, pack, this.leftLeg, this.rightLeg, this.torso, this.head, eye, this.attackIndicator]);
    this.setSize(HERO_HALF_WIDTH * 2, HERO_HALF_HEIGHT * 2);
    this.setDepth(10);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.arcadeBody
      .setSize(HERO_COLLISION_WIDTH, HERO_COLLISION_HEIGHT)
      .setOffset(HERO_COLLISION_OFFSET_X, HERO_COLLISION_OFFSET_Y)
      .setAllowGravity(false)
      .setCollideWorldBounds(true);
    this.updateBodyOffset();
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

  get attackDamage() {
    return HERO_ATTACK_DAMAGE;
  }

  get attackId() {
    return this.currentAttackId;
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

  isAttackActive(time = this.scene.time.now) {
    return this.isAlive && time < this.attackActiveUntil;
  }

  getAttackBounds(time = this.scene.time.now) {
    if (!this.isAttackActive(time)) {
      return null;
    }

    if (this.attackDirY !== 0) {
      const y =
        this.attackDirY > 0
          ? this.y + HERO_HALF_HEIGHT
          : this.y - HERO_HALF_HEIGHT - HERO_ATTACK_RANGE;
      return new Phaser.Geom.Rectangle(
        this.x - HERO_ATTACK_HEIGHT / 2,
        y,
        HERO_ATTACK_HEIGHT,
        HERO_ATTACK_RANGE,
      );
    }

    const dirX = this.attackDirX === 0 ? this.facing : this.attackDirX;
    const x = dirX > 0 ? this.x + HERO_HALF_WIDTH : this.x - HERO_HALF_WIDTH - HERO_ATTACK_RANGE;

    return new Phaser.Geom.Rectangle(x, this.y - HERO_ATTACK_HEIGHT / 2, HERO_ATTACK_RANGE, HERO_ATTACK_HEIGHT);
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

  update(time: number, _delta: number) {
    if (!this.isAlive) {
      this.playDeadPose();
      return;
    }

    this.tryStartAttack(time);

    const inputX = Number(this.isRightDown()) - Number(this.isLeftDown());
    const inputY = Number(this.isDownDown()) - Number(this.isUpDown());
    const inputLength = Math.hypot(inputX, inputY);

    if (inputLength > 0) {
      const normalizedX = inputX / inputLength;
      const normalizedY = inputY / inputLength;

      this.arcadeBody.setVelocity(normalizedX * HERO_SPEED, normalizedY * HERO_SPEED);

      if (inputX !== 0 && !this.isAttacking(time)) {
        this.setFacing(inputX > 0 ? 1 : -1);
      }

      this.setMovementState('walk');
      this.playWalkPose(time);
    } else {
      this.arcadeBody.setVelocity(0, 0);
      this.setMovementState('idle');
      this.playIdlePose(time);
    }

    if (this.isAttacking(time)) {
      this.setMovementState('attack');
      this.playAttackPose(time);
    }

    this.updateAttackIndicator(time);
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

  private isAttackDown() {
    return this.attackKeys.some((key) => Phaser.Input.Keyboard.JustDown(key));
  }

  private isAttacking(time: number) {
    return time < this.attackUntil;
  }

  private tryStartAttack(time: number) {
    if (time < this.nextAttackAt || !this.isAttackDown()) {
      return;
    }

    const horizInput = (Number(this.isRightDown()) - Number(this.isLeftDown())) as -1 | 0 | 1;
    const vertInput = (Number(this.isDownDown()) - Number(this.isUpDown())) as -1 | 0 | 1;

    if (horizInput !== 0) {
      this.attackDirX = horizInput;
      this.attackDirY = 0;
      this.setFacing(horizInput === 1 ? 1 : -1);
    } else if (vertInput !== 0) {
      this.attackDirX = 0;
      this.attackDirY = vertInput;
    } else {
      this.attackDirX = this.facing;
      this.attackDirY = 0;
    }

    this.currentAttackId += 1;
    this.attackActiveUntil = time + HERO_ATTACK_ACTIVE_MS;
    this.attackUntil = time + HERO_ATTACK_DURATION_MS;
    this.nextAttackAt = time + HERO_ATTACK_COOLDOWN_MS;
  }

  private setFacing(nextFacing: -1 | 1) {
    this.facing = nextFacing;
    this.scaleX = nextFacing;
  }

  private updateBodyOffset() {
    if (!this.body) {
      return;
    }

    // The body is symmetric and centered on the container origin. The visuals
    // are mirrored via scaleX, so the offset must NOT be flipped with facing –
    // doing so would teleport the body sideways by a full body width and
    // cause invisible-wall behavior.
    this.arcadeBody.setOffset(HERO_COLLISION_OFFSET_X, HERO_COLLISION_OFFSET_Y);
  }

  private setMovementState(nextState: HeroMovementState) {
    if (this.movementState === nextState) {
      return;
    }

    this.movementState = nextState;

    if (nextState === 'attack') {
      this.torso.setFillStyle(0x7c3aed);
      this.head.setFillStyle(0xfbbf24);
      return;
    }

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

  private playAttackPose(time: number) {
    const swing = Math.sin(time * 0.045) * 0.08;

    this.torso.y = -6;
    this.head.y = -36;
    this.rotation = swing;
  }

  private updateAttackIndicator(time: number) {
    const active = this.isAttackActive(time);
    this.attackIndicator.setVisible(active);

    if (!active) {
      return;
    }

    if (this.attackDirY !== 0) {
      this.attackIndicator.setSize(HERO_ATTACK_HEIGHT, HERO_ATTACK_RANGE);
      const offsetY =
        this.attackDirY > 0
          ? HERO_HALF_HEIGHT + HERO_ATTACK_RANGE / 2
          : -HERO_HALF_HEIGHT - HERO_ATTACK_RANGE / 2;
      this.attackIndicator.setPosition(0, offsetY);
    } else {
      this.attackIndicator.setSize(HERO_ATTACK_RANGE, HERO_ATTACK_HEIGHT);
      this.attackIndicator.setPosition(HERO_HALF_WIDTH + HERO_ATTACK_RANGE / 2, 0);
    }
  }

  private playDamageFeedback(time: number) {
    this.alpha = this.isInvulnerable(time) ? 0.45 + Math.sin(time * 0.04) * 0.25 : 1;
  }

  private playDeadPose() {
    this.setMovementState('dead');
    this.attackIndicator.setVisible(false);
    this.leftLeg.y = 18;
    this.rightLeg.y = 18;
    this.torso.y = -4;
    this.head.y = -34;
    this.rotation = Math.PI / 2;
    this.alpha = 0.8;
  }
}
