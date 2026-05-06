import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#111827');

    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'Loading Dino Run...', {
        color: '#f9fafb',
        fontFamily: 'Arial, sans-serif',
        fontSize: '28px',
      })
      .setOrigin(0.5);

    this.scene.start('PreloadScene');
  }
}
