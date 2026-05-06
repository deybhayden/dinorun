import Phaser from 'phaser';
import { SPRITE_DIMENSIONS } from '../assets/SpriteFactory';
import { Projectile } from './Projectile';

const HERO_SCALE = 2;
const HERO_RUN_SPEED = 220;
const HERO_JUMP_VELOCITY = -540;
const HERO_MAX_HEALTH = 5;
const HERO_INVULNERABILITY_MS = 900;
const HERO_HURT_KNOCKBACK_X = 220;
const HERO_HURT_KNOCKBACK_Y = -260;
const HERO_HURT_CONTROL_LOCK_MS = 240;
const HERO_SHOOT_COOLDOWN_MS = 320;
const HERO_SHOOT_POSE_MS = 180;

type Keys = {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  jump: Phaser.Input.Keyboard.Key[];
  shoot: Phaser.Input.Keyboard.Key[];
};

export class Hero extends Phaser.Physics.Arcade.Sprite {
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keys: Keys;
  private readonly projectileGroup: Phaser.Physics.Arcade.Group;
  private healthValue = HERO_MAX_HEALTH;
  private invulnerableUntil = 0;
  private hurtControlLockedUntil = 0;
  private nextShotAt = 0;
  private shootingUntil = 0;
  private facing: -1 | 1 = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, projectileGroup: Phaser.Physics.Arcade.Group) {
    super(scene, x, y, 'hero', 'idle');
    this.projectileGroup = projectileGroup;

    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is required.');
    }

    this.cursors = keyboard.createCursorKeys();
    this.keys = {
      left: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      jump: [keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W)],
      shoot: [keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)],
    };

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setScale(HERO_SCALE);
    this.setOrigin(0.5, 1);
    this.setDepth(10);

    // Hero visuals are 16x24 native; collision box hugs the body.
    const body = this.body as Phaser.Physics.Arcade.Body | null;
    if (!body) {
      throw new Error('Hero physics body not initialized');
    }
    const dim = SPRITE_DIMENSIONS.hero;
    const bodyW = 8;
    const bodyH = 22;
    body.setSize(bodyW, bodyH);
    // Center body horizontally on the sprite, anchor to feet.
    body.setOffset((dim.width - bodyW) / 2, dim.height - bodyH);
    body.setMaxVelocity(420, 900);
    this.setCollideWorldBounds(true);

    this.play('hero-idle');
  }

  get arcadeBody() {
    return this.body as Phaser.Physics.Arcade.Body;
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

  get facingDirection() {
    return this.facing;
  }

  isInvulnerable(time = this.scene.time.now) {
    return time < this.invulnerableUntil;
  }

  takeDamage(amount: number, sourceX: number, time = this.scene.time.now) {
    if (!this.isAlive || this.isInvulnerable(time) || amount <= 0) return false;

    this.healthValue = Math.max(0, this.healthValue - amount);
    this.invulnerableUntil = time + HERO_INVULNERABILITY_MS;
    this.hurtControlLockedUntil = time + HERO_HURT_CONTROL_LOCK_MS;

    const dir = this.x < sourceX ? -1 : 1;
    this.arcadeBody.setVelocity(dir * HERO_HURT_KNOCKBACK_X, HERO_HURT_KNOCKBACK_Y);

    if (this.isAlive) {
      this.play('hero-hurt', true);
    } else {
      this.arcadeBody.setVelocity(0, 0);
      this.arcadeBody.allowGravity = false;
      this.setTint(0x666666);
      this.setRotation(Math.PI / 2);
    }
    return true;
  }

  update(time: number, _delta: number) {
    if (!this.isAlive) return;

    const left = this.cursors.left.isDown || this.keys.left.isDown;
    const right = this.cursors.right.isDown || this.keys.right.isDown;
    const jumpPressed = this.cursors.up.isDown || this.keys.jump.some((k) => k.isDown);
    const shootJustPressed = this.keys.shoot.some((k) => Phaser.Input.Keyboard.JustDown(k));

    const onGround = this.arcadeBody.blocked.down || this.arcadeBody.touching.down;
    const controlLocked = time < this.hurtControlLockedUntil;

    if (!controlLocked) {
      // Horizontal movement.
      if (left && !right) {
        this.arcadeBody.setVelocityX(-HERO_RUN_SPEED);
        this.setFacing(-1);
      } else if (right && !left) {
        this.arcadeBody.setVelocityX(HERO_RUN_SPEED);
        this.setFacing(1);
      } else {
        this.arcadeBody.setVelocityX(0);
      }

      // Jump (only when grounded; classic platformer feel — not a double-jump).
      if (jumpPressed && onGround) {
        this.arcadeBody.setVelocityY(HERO_JUMP_VELOCITY);
      }
    }

    // Shoot.
    if (shootJustPressed && time >= this.nextShotAt) {
      this.fireProjectile(time);
    }

    this.updateAnimation(time, onGround);
    this.updateInvulnerabilityFlash(time);
  }

  private fireProjectile(time: number) {
    const projectile = this.projectileGroup.get(this.x, this.y, 'projectile', 'bolt') as Projectile | null;
    if (!projectile) return;

    projectile.body!.enable = true;
    const muzzleX = this.x + this.facing * 18;
    const muzzleY = this.y - 26;
    projectile.setPosition(muzzleX, muzzleY);
    projectile.fire(this.facing, time);

    this.nextShotAt = time + HERO_SHOOT_COOLDOWN_MS;
    this.shootingUntil = time + HERO_SHOOT_POSE_MS;
  }

  private setFacing(next: -1 | 1) {
    this.facing = next;
    this.setFlipX(next === -1);
  }

  private updateAnimation(time: number, onGround: boolean) {
    if (this.anims.isPlaying && this.anims.currentAnim?.key === 'hero-hurt') {
      // Stay in hurt frame briefly while knocked back.
      if (time < this.invulnerableUntil - HERO_INVULNERABILITY_MS + HERO_HURT_CONTROL_LOCK_MS) return;
    }

    if (time < this.shootingUntil) {
      if (this.anims.currentAnim?.key !== 'hero-shoot') this.play('hero-shoot', true);
      return;
    }

    if (!onGround) {
      if (this.anims.currentAnim?.key !== 'hero-jump') this.play('hero-jump', true);
      return;
    }

    if (Math.abs(this.arcadeBody.velocity.x) > 5) {
      if (this.anims.currentAnim?.key !== 'hero-run') this.play('hero-run', true);
    } else if (this.anims.currentAnim?.key !== 'hero-idle') {
      this.play('hero-idle', true);
    }
  }

  private updateInvulnerabilityFlash(time: number) {
    if (this.isInvulnerable(time)) {
      this.alpha = 0.45 + Math.sin(time * 0.04) * 0.25;
    } else {
      this.alpha = 1;
    }
  }
}
