import Phaser from 'phaser';
import { DinosaurEnemy } from '../entities/DinosaurEnemy';
import { Hero } from '../entities/Hero';
import { AdventureMap } from '../world/AdventureMap';

const CONTACT_KNOCKBACK_DISTANCE = 42;

export class WorldScene extends Phaser.Scene {
  private adventureMap!: AdventureMap;
  private hero!: Hero;
  private dinosaurs: DinosaurEnemy[] = [];
  private heroHealthFill!: Phaser.GameObjects.Rectangle;
  private heroHealthText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private restartKey?: Phaser.Input.Keyboard.Key;
  private attackHits = new Map<DinosaurEnemy, number>();
  private gameOver = false;

  constructor() {
    super('WorldScene');
  }

  create() {
    this.adventureMap = new AdventureMap(this);
    this.cameras.main.setBounds(
      this.adventureMap.worldBounds.x,
      this.adventureMap.worldBounds.y,
      this.adventureMap.worldBounds.width,
      this.adventureMap.worldBounds.height,
    );

    this.physics.world.setBounds(
      this.adventureMap.worldBounds.x,
      this.adventureMap.worldBounds.y,
      this.adventureMap.worldBounds.width,
      this.adventureMap.worldBounds.height,
    );
    this.restartKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);

    this.createTitleCard();
    this.createHero();
    this.createDinosaurs();
    this.createTerrainCollisions();
    this.createHud();

    this.cameras.main.startFollow(this.hero, true, 0.12, 0.12);
  }

  update(time: number, delta: number) {
    if (this.gameOver) {
      this.restartIfRequested();
      this.updateHud();
      return;
    }

    this.hero.update(time, delta);
    this.dinosaurs.forEach((dinosaur) => dinosaur.update(time, this.hero));
    this.handleHeroAttackDamage(time);
    this.handleDinosaurContactDamage(time);

    if (!this.hero.isAlive) {
      this.showGameOver();
    }

    this.updateHud();
  }

  private createHero() {
    this.hero = new Hero(this, this.adventureMap.heroSpawn.x, this.adventureMap.heroSpawn.y);
  }

  private createDinosaurs() {
    this.dinosaurs = this.adventureMap.dinosaurSpawns.map(
      (spawn) =>
        new DinosaurEnemy(this, spawn.x, spawn.y, {
          maxHealth: spawn.maxHealth,
          movementSpeed: spawn.movementSpeed,
          facing: spawn.facing,
          detectionRadius: spawn.detectionRadius,
          patrolPoints: spawn.patrolPoints,
        }),
    );
  }

  private createTerrainCollisions() {
    this.physics.add.collider(this.hero, this.adventureMap.blockers);
    this.dinosaurs.forEach((dinosaur) => {
      this.physics.add.collider(dinosaur, this.adventureMap.blockers);
    });
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
      .text(480, 214, 'Use WASD or arrow keys to explore. Press Space or J to attack.', {
        color: '#374151',
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
      })
      .setOrigin(0.5);
  }

  private createHud() {
    const panel = this.add.rectangle(16, 16, 360, 110, 0x111827, 0.72).setOrigin(0);
    panel.setStrokeStyle(2, 0xf9fafb, 0.4).setScrollFactor(0).setDepth(100);

    this.heroHealthText = this.add
      .text(28, 25, 'Health: 5/5', {
        color: '#f9fafb',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(101);

    this.add.rectangle(132, 36, 150, 16, 0x450a0a).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
    this.heroHealthFill = this.add
      .rectangle(132, 36, 150, 16, 0x22c55e)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(102);

    this.objectiveText = this.add
      .text(28, 58, 'Objective: Defeat all dinosaurs (0/2)', {
        color: '#fde68a',
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(101);

    this.statusText = this.add
      .text(28, 87, 'Move: WASD / Arrow Keys  Attack: Space / J', {
        color: '#d1d5db',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
      })
      .setScrollFactor(0)
      .setDepth(101);

    this.gameOverText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Game Over\nPress R to restart', {
        align: 'center',
        color: '#f9fafb',
        fontFamily: 'Arial, sans-serif',
        fontSize: '44px',
        fontStyle: 'bold',
        stroke: '#111827',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);

    this.updateHud();
  }

  private updateHud() {
    const healthPercent = Phaser.Math.Clamp(this.hero.health / this.hero.maxHealth, 0, 1);
    const defeatedDinosaurs = this.dinosaurs.filter((dinosaur) => !dinosaur.isAlive).length;
    const allDinosaursDefeated = defeatedDinosaurs === this.dinosaurs.length;

    const invulnerabilityLabel = this.hero.isAlive && this.hero.isInvulnerable() ? ' (invulnerable)' : '';

    this.heroHealthText.setText(`Health: ${this.hero.health}/${this.hero.maxHealth}${invulnerabilityLabel}`);
    this.heroHealthFill.displayWidth = 150 * healthPercent;
    this.heroHealthFill.setFillStyle(healthPercent > 0.5 ? 0x22c55e : healthPercent > 0.25 ? 0xfacc15 : 0xef4444);
    this.objectiveText.setText(
      `Objective: Defeat all dinosaurs (${defeatedDinosaurs}/${this.dinosaurs.length})${allDinosaursDefeated ? ' complete' : ''}`,
    );

    this.statusText.setText(
      this.gameOver ? 'Press R to restart' : 'Move: WASD / Arrow Keys  Attack: Space / J',
    );
  }

  private handleHeroAttackDamage(time: number) {
    const attackBounds = this.hero.getAttackBounds(time);

    if (!attackBounds) {
      return;
    }

    this.dinosaurs.forEach((dinosaur) => {
      if (!dinosaur.isAlive || this.attackHits.get(dinosaur) === this.hero.attackId) {
        return;
      }

      const dinosaurBody = dinosaur.arcadeBody;
      const dinosaurBounds = new Phaser.Geom.Rectangle(
        dinosaurBody.position.x,
        dinosaurBody.position.y,
        dinosaurBody.width,
        dinosaurBody.height,
      );

      if (!Phaser.Geom.Intersects.RectangleToRectangle(attackBounds, dinosaurBounds)) {
        return;
      }

      dinosaur.takeDamage(this.hero.attackDamage);
      this.attackHits.set(dinosaur, this.hero.attackId);
      this.cameras.main.shake(80, 0.003);
    });
  }

  private handleDinosaurContactDamage(time: number) {
    if (!this.hero.isAlive || this.hero.isInvulnerable(time)) {
      return;
    }

    const touchingDinosaur = this.dinosaurs.find(
      (dinosaur) => dinosaur.isAlive && this.physics.overlap(this.hero, dinosaur),
    );

    if (!touchingDinosaur) {
      return;
    }

    const tookDamage = this.hero.takeDamage(touchingDinosaur.contactDamage, time);

    if (!tookDamage) {
      return;
    }

    this.knockHeroAwayFrom(touchingDinosaur);
    this.cameras.main.shake(120, 0.006);
    this.cameras.main.flash(120, 239, 68, 68, false);
  }

  private knockHeroAwayFrom(dinosaur: DinosaurEnemy) {
    const direction = new Phaser.Math.Vector2(this.hero.x - dinosaur.x, this.hero.y - dinosaur.y);

    if (direction.lengthSq() === 0) {
      direction.set(1, 0);
    }

    direction.normalize().scale(CONTACT_KNOCKBACK_DISTANCE);

    const body = this.hero.arcadeBody;
    const nextPosition = this.adventureMap.resolveActorMovement(
      this.hero.x,
      this.hero.y,
      this.hero.x + direction.x,
      this.hero.y + direction.y,
      body.width / 2,
      body.height / 2,
    );

    this.hero.x = nextPosition.x;
    this.hero.y = nextPosition.y;
    body.setVelocity(0, 0);
    body.updateFromGameObject();
  }

  private showGameOver() {
    if (this.gameOver) {
      return;
    }

    this.gameOver = true;
    this.gameOverText.setVisible(true);
    this.dinosaurs.forEach((dinosaur) => dinosaur.setMoveDirection(0));
    this.cameras.main.stopFollow();
  }

  private restartIfRequested() {
    if (this.restartKey && Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.scene.restart();
    }
  }
}
