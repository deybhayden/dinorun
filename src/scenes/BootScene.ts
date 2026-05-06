import Phaser from 'phaser';

const coverImageUrl = new URL('../../assets/images/dino-run-cover.png', import.meta.url).href;

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    this.load.image('dino-run-cover', coverImageUrl);
  }

  create() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.cameras.main.setBackgroundColor('#111827');

    const cover = this.add.image(width / 2, height / 2, 'dino-run-cover');
    cover.setScale(Math.min(width / cover.width, height / cover.height));

    this.time.delayedCall(900, () => {
      this.scene.start('PreloadScene');
    });
  }
}
