import Phaser from 'phaser';

export type DinosaurMovementState = 'idle' | 'walk' | 'hurt' | 'dead';
export type DinosaurAiState = 'patrol' | 'chase' | 'return';

export type DinosaurEnemyOptions = {
  maxHealth?: number;
  movementSpeed?: number;
  facing?: -1 | 1;
  patrolPoints?: Phaser.Types.Math.Vector2Like[];
  detectionRadius?: number;
  loseInterestRadius?: number;
  chaseSpeedMultiplier?: number;
  waitAtPatrolPointMs?: number;
  contactDamage?: number;
};

// Visual extent runs from y ~= -86 (head) to y ~= +27 (feet). For top-down
// collision we want the box centered on the feet/lower body, not floating up
// at head height like before.
const DINO_BODY_WIDTH = 70;
const DINO_BODY_HEIGHT = 38;
const DINO_BODY_OFFSET_X = -DINO_BODY_WIDTH / 2;
const DINO_BODY_OFFSET_Y = -8;
const DINO_VISUAL_WIDTH = 108;
const DINO_VISUAL_HEIGHT = 58;
const DEFAULT_DINO_HEALTH = 3;
const DEFAULT_DINO_SPEED = 115;
const DEFAULT_DETECTION_RADIUS = 300;
const DEFAULT_LOSE_INTEREST_RADIUS = 430;
const DEFAULT_CHASE_SPEED_MULTIPLIER = 1.45;
const DEFAULT_PATROL_WAIT_MS = 550;
const DEFAULT_CONTACT_DAMAGE = 1;
const PATROL_POINT_REACHED_DISTANCE = 14;

export class DinosaurEnemy extends Phaser.GameObjects.Container {
  private readonly maxHealthValue: number;
  private readonly speed: number;
  private readonly chaseSpeed: number;
  private readonly patrolPoints: Phaser.Math.Vector2[];
  private readonly detectionRadius: number;
  private readonly loseInterestRadius: number;
  private readonly waitAtPatrolPointMs: number;
  private readonly contactDamageValue: number;
  private readonly bodyShape: Phaser.GameObjects.Ellipse;
  private readonly head: Phaser.GameObjects.Arc;
  private readonly tail: Phaser.GameObjects.Triangle;
  private readonly leftLeg: Phaser.GameObjects.Rectangle;
  private readonly rightLeg: Phaser.GameObjects.Rectangle;
  private readonly healthText: Phaser.GameObjects.Text;
  private readonly behaviorText: Phaser.GameObjects.Text;
  private healthValue: number;
  private movementState: DinosaurMovementState = 'idle';
  private aiState: DinosaurAiState = 'patrol';
  private facing: -1 | 1;
  private hurtUntil = 0;
  private removedFromPlay = false;
  private patrolIndex = 0;
  private waitingUntil = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, options: DinosaurEnemyOptions = {}) {
    super(scene, x, y);

    this.maxHealthValue = options.maxHealth ?? DEFAULT_DINO_HEALTH;
    this.healthValue = this.maxHealthValue;
    this.speed = options.movementSpeed ?? DEFAULT_DINO_SPEED;
    this.chaseSpeed = this.speed * (options.chaseSpeedMultiplier ?? DEFAULT_CHASE_SPEED_MULTIPLIER);
    this.detectionRadius = options.detectionRadius ?? DEFAULT_DETECTION_RADIUS;
    this.loseInterestRadius = options.loseInterestRadius ?? DEFAULT_LOSE_INTEREST_RADIUS;
    this.waitAtPatrolPointMs = options.waitAtPatrolPointMs ?? DEFAULT_PATROL_WAIT_MS;
    this.contactDamageValue = options.contactDamage ?? DEFAULT_CONTACT_DAMAGE;
    this.patrolPoints = this.createPatrolPoints(x, y, options.patrolPoints);
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
      .text(0, -108, `${this.healthValue}/${this.maxHealthValue}`, {
        color: '#f8fafc',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        fontStyle: 'bold',
        stroke: '#052e16',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    this.behaviorText = scene.add
      .text(0, -88, this.aiState, {
        color: '#dcfce7',
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        stroke: '#052e16',
        strokeThickness: 3,
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
      this.behaviorText,
    ]);
    this.setSize(DINO_VISUAL_WIDTH, DINO_VISUAL_HEIGHT);
    this.setDepth(8);
    this.setFacing(this.facing);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.arcadeBody
      .setSize(DINO_BODY_WIDTH, DINO_BODY_HEIGHT)
      .setOffset(DINO_BODY_OFFSET_X, DINO_BODY_OFFSET_Y)
      .setAllowGravity(false)
      .setCollideWorldBounds(true)
      .setMaxSpeed(this.chaseSpeed);
    this.updateBodyOffset();
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

  get behavior() {
    return this.aiState;
  }

  get contactDamage() {
    return this.contactDamageValue;
  }

  get isAlive() {
    return this.healthValue > 0;
  }

  get arcadeBody() {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  update(time: number, target?: Phaser.Types.Math.Vector2Like) {
    if (!this.isAlive) {
      if (!this.removedFromPlay) {
        this.playDeadPose();
      }
      return;
    }

    this.updateAi(time, target);

    if (time < this.hurtUntil) {
      this.setMovementState('hurt');
      this.playHurtPose(time);
      return;
    }

    const velocity = this.arcadeBody.velocity;

    if (velocity.lengthSq() > 1) {
      this.setFacing(velocity.x >= 0 ? 1 : -1);
      this.setMovementState('walk');
      this.playWalkPose(time);
      return;
    }

    this.setMovementState('idle');
    this.playIdlePose(time);
  }

  setMoveDirection(directionX: number, directionY = 0, movementSpeed = this.speed) {
    if (!this.isAlive) {
      this.arcadeBody.setVelocity(0, 0);
      return;
    }

    const length = Math.hypot(directionX, directionY);

    if (length === 0) {
      this.arcadeBody.setVelocity(0, 0);
      return;
    }

    this.arcadeBody.setVelocity((directionX / length) * movementSpeed, (directionY / length) * movementSpeed);
  }

  takeDamage(amount: number) {
    if (!this.isAlive || amount <= 0) {
      return;
    }

    this.healthValue = Math.max(0, this.healthValue - amount);
    this.healthText.setText(`${this.healthValue}/${this.maxHealthValue}`);
    this.hurtUntil = this.scene.time.now + 220;

    if (!this.isAlive) {
      this.defeat();
    }
  }

  private defeat() {
    this.arcadeBody.setVelocity(0, 0);
    this.arcadeBody.enable = false;
    this.setMovementState('dead');

    this.scene.time.delayedCall(650, () => {
      this.removedFromPlay = true;
      this.setActive(false);
      this.setVisible(false);
    });
  }

  private createPatrolPoints(x: number, y: number, patrolPoints?: Phaser.Types.Math.Vector2Like[]) {
    const points = patrolPoints?.length ? patrolPoints : [{ x, y }, { x: x + 220, y }];

    return points.map((point) => new Phaser.Math.Vector2(point.x, point.y));
  }

  private updateAi(time: number, target?: Phaser.Types.Math.Vector2Like) {
    if (!target) {
      if (this.aiState === 'chase') {
        this.setAiState('return');
      }

      this.updatePatrolOrReturn(time);
      return;
    }

    const targetDistance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);

    if (this.aiState === 'chase') {
      if (targetDistance > this.loseInterestRadius) {
        this.setAiState('return');
      }
    } else if (targetDistance <= this.detectionRadius) {
      this.setAiState('chase');
    }

    if (this.aiState === 'chase') {
      this.setMoveDirection(target.x - this.x, target.y - this.y, this.chaseSpeed);
      return;
    }

    this.updatePatrolOrReturn(time);
  }

  private updatePatrolOrReturn(time: number) {
    if (this.aiState === 'return') {
      this.returnToPatrol(time);
      return;
    }

    this.patrol(time);
  }

  private patrol(time: number) {
    if (this.patrolPoints.length < 2) {
      this.setMoveDirection(0);
      return;
    }

    const point = this.patrolPoints[this.patrolIndex];

    if (this.isAtPoint(point)) {
      this.setMoveDirection(0);

      if (this.waitingUntil === 0) {
        this.waitingUntil = time + this.waitAtPatrolPointMs;
      }

      if (time >= this.waitingUntil) {
        this.patrolIndex = (this.patrolIndex + 1) % this.patrolPoints.length;
        this.waitingUntil = 0;
      }

      return;
    }

    this.waitingUntil = 0;
    this.moveToward(point, this.speed);
  }

  private returnToPatrol(time: number) {
    if (!this.patrolPoints.length) {
      this.setAiState('patrol');
      this.setMoveDirection(0);
      return;
    }

    const point = this.patrolPoints[this.patrolIndex];

    if (this.isAtPoint(point)) {
      this.setAiState('patrol');
      this.patrol(time);
      return;
    }

    this.moveToward(point, this.speed);
  }

  private moveToward(point: Phaser.Types.Math.Vector2Like, movementSpeed: number) {
    this.setMoveDirection(point.x - this.x, point.y - this.y, movementSpeed);
  }

  private isAtPoint(point: Phaser.Types.Math.Vector2Like) {
    return Phaser.Math.Distance.Between(this.x, this.y, point.x, point.y) <= PATROL_POINT_REACHED_DISTANCE;
  }

  private setAiState(nextState: DinosaurAiState) {
    if (this.aiState === nextState) {
      return;
    }

    this.aiState = nextState;
    this.behaviorText.setText(nextState);

    if (nextState === 'return') {
      this.patrolIndex = this.findNearestPatrolPointIndex();
      this.waitingUntil = 0;
    }

    if (nextState === 'chase') {
      this.waitingUntil = 0;
    }
  }

  private findNearestPatrolPointIndex() {
    if (!this.patrolPoints.length) {
      return 0;
    }

    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    this.patrolPoints.forEach((point, index) => {
      const distance = Phaser.Math.Distance.Between(this.x, this.y, point.x, point.y);

      if (distance < nearestDistance) {
        nearestIndex = index;
        nearestDistance = distance;
      }
    });

    return nearestIndex;
  }

  private setFacing(nextFacing: -1 | 1) {
    this.facing = nextFacing;
    this.scaleX = nextFacing;

    // The whole container is mirrored to turn the dinosaur around. Counter-scale
    // text labels so health and behavior remain readable in either direction.
    this.healthText.scaleX = nextFacing;
    this.behaviorText.scaleX = nextFacing;
  }

  private updateBodyOffset() {
    if (!this.body) {
      return;
    }

    // The body is symmetric and centered on the container origin. The visuals
    // are mirrored via scaleX, so the offset must NOT be flipped with facing –
    // doing so would teleport the body sideways by a full body width and
    // cause invisible-wall behavior.
    this.arcadeBody.setOffset(DINO_BODY_OFFSET_X, DINO_BODY_OFFSET_Y);
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
