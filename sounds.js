export class SoundEffects {
    constructor() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.3; // Master volume
        this.masterGain.connect(this.audioContext.destination);
    }

    createOscillator(type, frequency, duration, gainValue = 0.1, frequencySlide = null) {
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
        
        if (frequencySlide) {
            oscillator.frequency.exponentialRampToValueAtTime(
                frequencySlide, 
                this.audioContext.currentTime + duration
            );
        }

        gainNode.gain.setValueAtTime(gainValue, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);

        return oscillator;
    }

    play(soundName) {
        switch (soundName) {
            case 'shoot':
                // High-pitched laser sound
                const shootOsc = this.createOscillator('square', 880, 0.1, 0.1, 440);
                shootOsc.start();
                shootOsc.stop(this.audioContext.currentTime + 0.1);
                break;

            case 'explosion':
                // Enemy explosion - descending noise
                const explosionOsc1 = this.createOscillator('square', 220, 0.3, 0.2, 55);
                const explosionOsc2 = this.createOscillator('sawtooth', 440, 0.3, 0.1, 110);
                explosionOsc1.start();
                explosionOsc2.start();
                explosionOsc1.stop(this.audioContext.currentTime + 0.3);
                explosionOsc2.stop(this.audioContext.currentTime + 0.3);
                break;

            case 'playerExplosion':
                // Player explosion - more dramatic
                const playerExpOsc1 = this.createOscillator('square', 440, 0.5, 0.3, 55);
                const playerExpOsc2 = this.createOscillator('sawtooth', 220, 0.5, 0.2, 27.5);
                const playerExpOsc3 = this.createOscillator('triangle', 110, 0.5, 0.2, 13.75);
                playerExpOsc1.start();
                playerExpOsc2.start();
                playerExpOsc3.start();
                playerExpOsc1.stop(this.audioContext.currentTime + 0.5);
                playerExpOsc2.stop(this.audioContext.currentTime + 0.5);
                playerExpOsc3.stop(this.audioContext.currentTime + 0.5);
                break;

            case 'hit':
                // Barrier hit sound
                const hitOsc = this.createOscillator('square', 160, 0.1, 0.15, 40);
                hitOsc.start();
                hitOsc.stop(this.audioContext.currentTime + 0.1);
                break;

            case 'gameOver':
                // Game over - descending tones
                const notes = [880, 699.2, 523.3, 440, 349.2, 261.6];
                const duration = 0.2;
                notes.forEach((freq, i) => {
                    const gameOverOsc = this.createOscillator('square', freq, duration, 0.2);
                    gameOverOsc.start(this.audioContext.currentTime + i * duration);
                    gameOverOsc.stop(this.audioContext.currentTime + (i + 1) * duration);
                });
                break;
        }
    }
}
