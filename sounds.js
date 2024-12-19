class SoundEffects {
    constructor() {
        this.sounds = {};
        this.createSound('shoot', [261.63, 0, 0], 0.1);  // Middle C
        this.createSound('enemyShoot', [165.00, 0, 0], 0.1);  // Low E
        this.createSound('explosion', [100, 50, 0], 0.3);  // Noise
        this.createSound('hit', [440, 0, 0], 0.1);  // High A
        this.createSound('levelComplete', [523.25, 659.25, 783.99], 0.3);  // C5, E5, G5 arpeggio
        this.createSound('gameOver', [440, 349.23, 293.66, 261.63], 0.5);  // A4, F4, D4, C4 descending
        
        // Load MP3 explosion sound
        this.playerExplosion = new Audio('sounds/Space_invaders_retro.mp3');
    }

    createSound(name, frequencies, duration) {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        const soundData = {
            ctx: audioCtx,
            osc: oscillator,
            gain: gainNode,
            frequencies: frequencies,
            duration: duration
        };
        
        this.sounds[name] = soundData;
    }

    play(name) {
        if (name === 'playerExplosion') {
            this.playerExplosion.currentTime = 0;
            this.playerExplosion.play();
            return;
        }

        const sound = this.sounds[name];
        if (!sound) return;

        const { ctx, frequencies, duration } = sound;
        
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.frequency.setValueAtTime(frequencies[0], ctx.currentTime);
        frequencies.forEach((freq, i) => {
            if (i > 0) {
                oscillator.frequency.linearRampToValueAtTime(
                    freq,
                    ctx.currentTime + (duration * i/frequencies.length)
                );
            }
        });
        
        gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
        
        oscillator.start(ctx.currentTime);
        oscillator.stop(ctx.currentTime + duration);
    }
}
