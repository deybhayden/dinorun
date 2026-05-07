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
  private heroFace!: Phaser.GameObjects.Sprite;
  private objectiveArrow!: Phaser.GameObjects.Text;
  private helpOverlay!: Phaser.GameObjects.Container;
  private warningText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;
  private victoryText!: Phaser.GameObjects.Text;
  private pauseOverlay!: Phaser.GameObjects.Rectangle;
  private pauseText!: Phaser.GameObjects.Text;
  private pauseControlsText!: Phaser.GameObjects.Text;
  private restartKey?: Phaser.Input.Keyboard.Key;
  private gameOver = false;
  private victory = false;
  private paused = false;
  private helpVisible = false;

  constructor() {
    super('WorldScene');
  }

  create() {
    this.gameOver = false;
    this.victory = false;
    this.paused = false;
    this.helpVisible = false;
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
    if (this.paused || this.helpVisible) return;

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
        (target, proj) => {
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

    // ? / SLASH key toggles help overlay.
    const helpKey = this.input.keyboard?.addKey(191); // Forward-slash keycode
    if (helpKey) {
      helpKey.on('down', () => {
        if (!this.gameOver && !this.victory) this.toggleHelp();
      });
    }
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
    const PANEL_W = 360;
    const PANEL_H = 56;
    const PANEL_X = 8;
    const PANEL_Y = 8;

    // Subtle panel — dark translucent, thin gold border.
    this.add.rectangle(PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0x140e08, 0.82)
      .setOrigin(0)
      .setStrokeStyle(1, 0x8a7040, 0.55)
      .setScrollFactor(0)
      .setDepth(100);
    // Fade the top edge for a vignette feel.
    this.add.rectangle(PANEL_X, PANEL_Y, PANEL_W, 1, 0xd4a45a, 0.7)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(101);

    // Face sprite — Doom-style, changes with health.
    this.heroFace = this.add.sprite(PANEL_X + 26, PANEL_Y + PANEL_H / 2, 'hero-face', 'face-100')
      .setScale(1.75)
      .setScrollFactor(0)
      .setDepth(102);

    // Thin health bar — background.
    const barX = PANEL_X + 58;
    const barY = PANEL_Y + 18;
    const barW = 130;
    const barH = 8;
    this.add.rectangle(barX, barY, barW, barH, 0x1a0e08)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x443018, 0.6)
      .setScrollFactor(0)
      .setDepth(101);
    this.heroHealthFill = this.add.rectangle(barX, barY, barW, barH, 0x7ab85a)
      .setOrigin(0, 0.5)
      .setScrollFactor(0)
      .setDepth(102);

    // Arrow objective — just "→ ESCAPE" with a gentle pulse.
    this.objectiveArrow = this.add.text(PANEL_X + 198, PANEL_Y + 12, '\u2192 ESCAPE', {
      color: '#e8c070',
      fontFamily: 'monospace',
      fontSize: '18px',
      fontStyle: 'bold',
    })
      .setScrollFactor(0)
      .setDepth(101);
    this.tweens.add({
      targets: this.objectiveArrow,
      alpha: { from: 1, to: 0.55 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // "?" help button.
    const helpBtn = this.add.text(PANEL_X + 198, PANEL_Y + 36, '[ ? ] Help', {
      color: '#8a7040',
      fontFamily: 'monospace',
      fontSize: '13px',
    })
      .setScrollFactor(0)
      .setDepth(101)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => { if (!this.gameOver && !this.victory) this.toggleHelp(); });
    helpBtn.on('pointerover', () => helpBtn.setColor('#d4a45a'));
    helpBtn.on('pointerout', () => helpBtn.setColor('#8a7040'));

    // Help overlay (hidden by default).
    this.createHelpOverlay();

    // T-REX warning.
    this.warningText = this.add
      .text(this.scale.width / 2, 70, '!! T-REX  RUN !!', {
        color: '#fca5a5',
        fontFamily: 'monospace',
        fontSize: '36px',
        fontStyle: 'bold',
        stroke: '#450a0a',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(101)
      .setVisible(false);

    // Game over.
    this.gameOverText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Game Over\nPress R to restart', {
        align: 'center',
        color: '#f9fafb',
        fontFamily: 'monospace',
        fontSize: '44px',
        fontStyle: 'bold',
        stroke: '#111827',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);

    // Victory.
    this.victoryText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'You made it!\nPress R to play again', {
        align: 'center',
        color: '#fde68a',
        fontFamily: 'monospace',
        fontSize: '44px',
        fontStyle: 'bold',
        stroke: '#111827',
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);

    // Pause overlay.
    this.pauseOverlay = this.add
      .rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.55)
      .setScrollFactor(0)
      .setDepth(199)
      .setVisible(false);

    this.pauseText = this.add
      .text(this.scale.width / 2, this.scale.height / 2 - 60, 'PAUSED\n\nPress Esc to resume', {
        align: 'center',
        color: '#f9fafb',
        fontFamily: 'monospace',
        fontSize: '30px',
        fontStyle: 'bold',
        stroke: '#111827',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);

    const pauseControls = [
      'Move  ............  A / D  or  Arrow Keys',
      'Jump  ............  W  or  Up Arrow',
      'Shoot  ...........  Space',
      'Help  ............  ?',
    ];
    this.pauseControlsText = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 28, pauseControls.join('\n'), {
        align: 'left',
        color: '#c8b898',
        fontFamily: 'monospace',
        fontSize: '17px',
        lineSpacing: 10,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(200)
      .setVisible(false);

    this.updateHud();
  }

  private createHelpOverlay() {
    const W = 380;
    const H = 220;
    const ox = (this.scale.width - W) / 2;
    const oy = (this.scale.height - H) / 2;

    const bg = this.add.rectangle(ox, oy, W, H, 0x140e08, 0.94)
      .setOrigin(0)
      .setStrokeStyle(2, 0x8a7040, 0.6)
      .setScrollFactor(0)
      .setDepth(201);

    const title = this.add.text(ox + W / 2, oy + 18, 'Controls', {
      color: '#d4a45a',
      fontFamily: 'monospace',
      fontSize: '22px',
      fontStyle: 'bold',
    })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(202);

    const lines = [
      'Move Left  ........  A  /  \u2190',
      'Move Right  .......  D  /  \u2192',
      'Jump  .............  W  /  \u2191',
      'Shoot  ............  Space',
      '',
      'Pause  ............  Esc',
      'Help  .............  ?',
    ];
    const body = this.add.text(ox + 28, oy + 48, lines.join('\n'), {
      color: '#c8b898',
      fontFamily: 'monospace',
      fontSize: '15px',
      lineSpacing: 6,
    })
      .setScrollFactor(0)
      .setDepth(202);

    const closeHint = this.add.text(ox + W / 2, oy + H - 22, 'Press ? or Esc to close', {
      color: '#8a7040',
      fontFamily: 'monospace',
      fontSize: '13px',
    })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(202);

    this.helpOverlay = this.add.container(0, 0, [bg, title, body, closeHint])
      .setScrollFactor(0)
      .setDepth(201)
      .setVisible(false);
  }

  private updateHud() {
    const healthPercent = Phaser.Math.Clamp(this.hero.health / this.hero.maxHealth, 0, 1);

    // Face frame based on health.
    if (healthPercent > 0.75) this.heroFace.setFrame('face-100');
    else if (healthPercent > 0.5) this.heroFace.setFrame('face-75');
    else if (healthPercent > 0.25) this.heroFace.setFrame('face-50');
    else if (healthPercent > 0) this.heroFace.setFrame('face-25');
    else this.heroFace.setFrame('face-0');

    // Invulnerability flash on face.
    if (this.hero.isAlive && this.hero.isInvulnerable()) {
      this.heroFace.alpha = 0.45 + Math.sin(this.time.now * 0.04) * 0.25;
    } else {
      this.heroFace.alpha = 1;
    }

    // Health bar fill.
    const barW = 130;
    this.heroHealthFill.displayWidth = barW * healthPercent;
    this.heroHealthFill.setFillStyle(
      healthPercent > 0.5 ? 0x22c55e : healthPercent > 0.25 ? 0xfacc15 : 0xef4444,
    );

    // Death face: tint the face grey.
    if (!this.hero.isAlive) {
      this.heroFace.setTint(0x888888);
    } else {
      this.heroFace.clearTint();
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
    // If help overlay is showing, close it first instead of pausing.
    if (this.helpVisible) {
      this.toggleHelp();
      return;
    }
    this.togglePause();
  }

  private toggleHelp() {
    this.helpVisible = !this.helpVisible;
    this.helpOverlay.setVisible(this.helpVisible);

    if (this.helpVisible) {
      // Disable gameplay physics while reading help.
      this.physics.world.pause();
    } else if (!this.paused) {
      this.physics.world.resume();
    }
  }

  private togglePause() {
    this.paused = !this.paused;
    this.pauseOverlay.setVisible(this.paused);
    this.pauseText.setVisible(this.paused);
    this.pauseControlsText.setVisible(this.paused);

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
