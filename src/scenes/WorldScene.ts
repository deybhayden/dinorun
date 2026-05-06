import Phaser from 'phaser';
import { DinosaurEnemy } from '../entities/DinosaurEnemy';
import { Hero } from '../entities/Hero';
import { Projectile } from '../entities/Projectile';
import { Level } from '../world/Level';

export class WorldScene extends Phaser.Scene {
  private level!: Level;
  private hero!: Hero;
  private dinosaurs: DinosaurEnemy[] = [];
  private readonly dinoTarget = new Phaser.Math.Vector2();
  private readonly heroRectCache = new Phaser.Geom.Rectangle();
  private projectiles!: Phaser.Physics.Arcade.Group;
  private heroHealthFill!: Phaser.GameObjects.Rectangle;
  private heroHealthText!: Phaser.GameObjects.Text;
  private objectiveText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private warningText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private victoryText!: Phaser.GameObjects.Text;
  private pauseOverlay!: Phaser.GameObjects.Rectangle;
  private pauseText!: Phaser.GameObjects.Text;
  private restartKey?: Phaser.Input.Keyboard.Key;
  private gameOver = false;
  private victory = false;
  private paused = false;

  constructor() {
    super('WorldScene');
  }

  create() {
    this.gameOver = false;
    this.victory = false;
    this.paused = false;
    this.dinosaurs = [];

    this.level = new Level(this);

    this.cameras.main.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);
    this.physics.world.setBounds(0, 0, this.level.worldWidth, this.level.worldHeight);

    this.projectiles = this.physics.add.group({
      classType: Projectile,
      maxSize: 16,
      runChildUpdate: true,
      allowGravity: false,
    });

    this.createHero();
    this.createDinosaurs();
    this.createCollisions();
    this.createInput();
    this.createHud();

    this.cameras.main.startFollow(this.hero, true, 0.15, 0.1);
    this.cameras.main.setDeadzone(120, 80);
  }

  update(time: number, delta: number) {
    if (this.paused) return;

    if (this.gameOver || this.victory) {
      this.restartIfRequested();
      return;
    }

    this.hero.update(time, delta);
    this.dinoTarget.set(this.hero.x, this.hero.y);
    this.dinosaurs.forEach((dino) => dino.update(time, this.dinoTarget));

    this.handleHazardDamage(time);
    this.checkGoalReached();
    this.updateWarning();
    this.updateHud();

    if (!this.hero.isAlive) {
      this.showGameOver();
    }
  }

  private createHero() {
    this.hero = new Hero(this, this.level.heroSpawn.x, this.level.heroSpawn.y, this.projectiles);
  }

  private createDinosaurs() {
    this.dinosaurs = this.level.enemySpawns.map((spawn) => {
      const x = spawn.tileX * this.level.tileSize + this.level.tileSize / 2;
      const surfaceY = this.level.surfaceYFor(spawn.tileY);
      const patrolHalfWidth = (spawn.patrolRange ?? 4) * this.level.tileSize;
      return new DinosaurEnemy(this, {
        kind: spawn.type,
        x,
        surfaceY,
        patrolHalfWidth,
      });
    });
  }

  private createCollisions() {
    // Hero vs terrain — platforms are one-way (pass through from below).
    this.physics.add.collider(
      this.hero,
      this.level.colliders,
      undefined,
      (hero, tile) => {
        if ((tile as Phaser.Physics.Arcade.Sprite).getData('oneWay')) {
          return ((hero as Phaser.Physics.Arcade.Sprite).body as Phaser.Physics.Arcade.Body).velocity.y >= 0;
        }
        return true;
      },
    );

    // Dinosaurs vs terrain (no one-way for them — they walk on platforms too).
    this.dinosaurs.forEach((dino) => {
      this.physics.add.collider(dino, this.level.colliders);
    });

    // Projectiles vs terrain (disable on impact).
    this.physics.add.collider(this.projectiles, this.level.colliders, (proj) => {
      (proj as Projectile).disable();
    });

    // Projectiles vs dinosaurs.
    this.dinosaurs.forEach((dino) => {
      this.physics.add.overlap(
        this.projectiles,
        dino,
        (proj, target) => {
          if (this.gameOver || this.victory) return;
          if (!(proj instanceof Projectile) || !(target instanceof DinosaurEnemy)) return;
          if (!proj.active || !target.active || !target.isAlive) return;
          target.takeDamage(1);
          proj.disable();
          if (!target.invincible) this.cameras.main.shake(60, 0.003);
          else this.cameras.main.shake(80, 0.005);
        },
      );
    });

    // Hero contact with dinosaurs.
    this.dinosaurs.forEach((dino) => {
      this.physics.add.overlap(this.hero, dino, () => {
        if (this.gameOver || this.victory || !dino.isAlive || !this.hero.isAlive) return;
        const tookDamage = this.hero.takeDamage(dino.contactDamage, dino.x);
        if (tookDamage) {
          this.cameras.main.shake(140, 0.008);
          this.cameras.main.flash(120, 239, 68, 68, false);
        }
      });
    });
  }

  private createInput() {
    this.restartKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);
    this.input.keyboard?.addCapture('ESC');
    this.input.keyboard?.on('keydown-ESC', this.handlePauseKey, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-ESC', this.handlePauseKey, this);
    });
  }

  private handleHazardDamage(time: number) {
    if (!this.hero.isAlive || this.hero.isInvulnerable(time)) return;

    const heroBody = this.hero.arcadeBody;
    const heroRect = this.heroRectCache;
    heroRect.x = heroBody.position.x;
    heroRect.y = heroBody.position.y;
    heroRect.width = heroBody.width;
    heroRect.height = heroBody.height;

    for (const hazard of this.level.hazards) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(heroRect, hazard)) {
        if (this.hero.takeDamage(1, hazard.centerX, time)) {
          this.cameras.main.shake(120, 0.006);
          this.cameras.main.flash(100, 239, 68, 68, false);
        }
        break;
      }
    }
  }

  private checkGoalReached() {
    if (this.victory) return;
    const heroBody = this.hero.arcadeBody;
    const heroRect = this.heroRectCache;
    heroRect.x = heroBody.position.x;
    heroRect.y = heroBody.position.y;
    heroRect.width = heroBody.width;
    heroRect.height = heroBody.height;
    if (Phaser.Geom.Intersects.RectangleToRectangle(heroRect, this.level.goalRect)) {
      this.showVictory();
    }
  }

  private updateWarning() {
    // Show "T-REX!" warning when an invincible dinosaur is near.
    // Warn slightly before the T-Rex detection range (520) to give player time to react.
    const WARN_DISTANCE = 540;
    const danger = this.dinosaurs.find(
      (d) => d.invincible && d.isAlive && Math.abs(d.x - this.hero.x) < WARN_DISTANCE,
    );
    this.warningText.setVisible(Boolean(danger));
  }

  private createHud() {
    const panel = this.add.rectangle(16, 16, 380, 110, 0x2a1810, 0.75).setOrigin(0);
    panel.setStrokeStyle(2, 0xe8dcc8, 0.5).setScrollFactor(0).setDepth(100);

    this.heroHealthText = this.add
      .text(28, 25, 'Health: 5/5', {
        color: '#f5e6d3',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(101);

    this.add.rectangle(132, 36, 150, 16, 0x5a2010).setOrigin(0, 0.5).setScrollFactor(0).setDepth(101);
    this.heroHealthFill = this.add
      .rectangle(132, 36, 150, 16, 0x7ab85a)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(102);

    this.objectiveText = this.add
      .text(28, 58, 'Objective: Reach the rescue flag', {
        color: '#d4a45a',
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(101);

    this.statusText = this.add
      .text(28, 87, 'Move: A/D or Arrows  Jump: W/Up/Space  Shoot: J/Shift', {
        color: '#b8a890',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
      })
      .setScrollFactor(0)
      .setDepth(101);

    this.warningText = this.add
      .text(this.scale.width / 2, 70, '!! T-REX  RUN !!', {
        color: '#fca5a5',
        fontFamily: 'Arial, sans-serif',
        fontSize: '32px',
        fontStyle: 'bold',
        stroke: '#450a0a',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101)
      .setVisible(false);

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

    this.victoryText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'You made it!\nPress R to play again', {
        align: 'center',
        color: '#fde68a',
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

    this.pauseOverlay = this.add
      .rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.55)
      .setScrollFactor(0)
      .setDepth(199)
      .setVisible(false);

    this.pauseText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Paused\nPress Esc to resume', {
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
    const inv = this.hero.isAlive && this.hero.isInvulnerable() ? ' (invuln)' : '';
    this.heroHealthText.setText(`Health: ${this.hero.health}/${this.hero.maxHealth}${inv}`);
    this.heroHealthFill.displayWidth = 150 * healthPercent;
    this.heroHealthFill.setFillStyle(
      healthPercent > 0.5 ? 0x22c55e : healthPercent > 0.25 ? 0xfacc15 : 0xef4444,
    );

    const distance = Math.max(0, this.level.goalPosition.x - this.hero.x);
    const distanceTiles = Math.round(distance / this.level.tileSize);
    this.objectiveText.setText(`Objective: Reach the rescue flag  (${distanceTiles} tiles)`);

    if (this.gameOver || this.victory) {
      this.statusText.setText('Press R to restart');
    } else {
      this.statusText.setText('Move: A/D or Arrows  Jump: W/Up/Space  Shoot: J/Shift');
    }
  }

  private showGameOver() {
    if (this.gameOver) return;
    this.gameOver = true;
    this.gameOverText.setVisible(true);
    this.cameras.main.stopFollow();
  }

  private showVictory() {
    if (this.victory) return;
    this.victory = true;
    this.victoryText.setVisible(true);
    this.warningText.setVisible(false);
    this.hero.arcadeBody.setVelocity(0, 0);
    this.hero.arcadeBody.allowGravity = false;
    this.dinosaurs.forEach((dino) => {
      dino.arcadeBody.setVelocity(0, 0);
      dino.arcadeBody.enable = false;
    });
    this.projectiles.getChildren().forEach((child) => {
      if (child instanceof Projectile) child.disable();
    });
    this.cameras.main.stopFollow();
    this.cameras.main.flash(280, 253, 230, 138, false);
  }

  private handlePauseKey() {
    if (this.gameOver || this.victory) return;
    this.togglePause();
  }

  private togglePause() {
    this.paused = !this.paused;
    this.pauseOverlay.setVisible(this.paused);
    this.pauseText.setVisible(this.paused);

    if (this.paused) {
      this.physics.world.pause();
    } else {
      this.physics.world.resume();
    }
  }

  private restartIfRequested() {
    if (this.restartKey && Phaser.Input.Keyboard.JustDown(this.restartKey)) {
      this.scene.restart();
    }
  }
}
