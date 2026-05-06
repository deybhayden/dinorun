import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  private progressBar?: Phaser.GameObjects.Rectangle;

  constructor() {
    super('PreloadScene');
  }

  preload() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.cameras.main.setBackgroundColor('#0f172a');

    const cover = this.add.image(width / 2, height / 2, 'dino-run-cover');
    cover.setScale(Math.min(width / cover.width, height / cover.height));

    const barWidth = 320;
    const barHeight = 18;
    const x = (width - barWidth) / 2;
    const y = height - 36;

    this.add.rectangle(x - 4, y - 4, barWidth + 8, barHeight + 8, 0x111827, 0.82).setOrigin(0);
    this.add.rectangle(x, y, barWidth, barHeight, 0x1f2937).setOrigin(0);
    this.progressBar = this.add.rectangle(x, y, 0, barHeight, 0x22c55e).setOrigin(0);

    this.load.on('progress', (value: number) => {
      if (this.progressBar) {
        this.progressBar.width = barWidth * value;
      }
    });
  }

  create() {
    this.tweens.add({
      targets: this.progressBar,
      width: 320,
      duration: 650,
      ease: 'Sine.easeOut',
      onComplete: () => {
        this.scene.start('WorldScene');
      },
    });
  }
}
