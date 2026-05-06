import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    const width = this.scale.width;
    const height = this.scale.height;

    this.cameras.main.setBackgroundColor('#0f172a');

    this.add
      .text(width / 2, height / 2 - 32, 'Preparing adventure...', {
        color: '#e5e7eb',
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
      })
      .setOrigin(0.5);

    const barWidth = 320;
    const barHeight = 18;
    const x = (width - barWidth) / 2;
    const y = height / 2 + 8;

    this.add.rectangle(x, y, barWidth, barHeight, 0x1f2937).setOrigin(0);
    const progressBar = this.add.rectangle(x, y, 0, barHeight, 0x22c55e).setOrigin(0);

    this.load.on('progress', (value: number) => {
      progressBar.width = barWidth * value;
    });
  }

  create() {
    this.scene.start('WorldScene');
  }
}
