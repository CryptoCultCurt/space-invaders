import { getHighScores, addHighScore } from './supabase.js';

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 800;
        this.canvas.height = 600;
        
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameOver = false;
        this.gameOverDisplayed = false;
        this.isPaused = false;
        this.isExploding = false;
        this.explosionTimer = 0;
        this.explosionDuration = 2000; // 2 seconds for explosion animation
        this.explosionParticles = [];
        this.invincibleTimer = 0;
        this.invincibleDuration = 2000; // 2 seconds of invincibility after being hit
        this.levelMessageTimer = 0;
        this.showTitleScreen = true;
        this.titleScreenTimer = 0;
        this.showHighScores = false;
        this.enteringInitials = false;
        this.currentInitials = '';
        this.highScores = [];
        
        // Load high scores from Supabase
        this.loadHighScores();
        
        // Initialize sound effects
        this.sounds = new SoundEffects();
        
        // Load sprites
        this.sprites = {
            player: new Image(),
            enemy: new Image(),
            bullet: new Image(),
            barrier: new Image()
        };
        
        this.sprites.player.src = 'sprites/player.svg';
        this.sprites.enemy.src = 'sprites/enemy.svg';
        this.sprites.bullet.src = 'sprites/bullet.svg';
        this.sprites.barrier.src = 'sprites/barrier.svg';
        
        // Player properties
        this.player = {
            x: this.canvas.width / 2 - 30,
            y: this.canvas.height - 50,
            width: 60,
            height: 32,
            speed: 8,
            bullets: []
        };
        
        // Enemy properties
        this.enemies = [];
        this.enemyRows = 5;
        this.enemyCols = 10;
        this.enemyWidth = 40;
        this.enemyHeight = 32;
        this.enemyPadding = 10;
        this.enemyDirection = 1;
        this.enemyDropDistance = 30;
        this.enemyMoveSpeed = 1;
        this.enemyBullets = [];
        this.enemyShootChance = 0.02;
        
        // Barrier properties
        this.barriers = [];
        this.barrierCount = 4;
        this.barrierWidth = 60;
        this.barrierHeight = 40;
        this.barrierHealth = 4;
        
        // Initialize game state
        this.initializeGame();
        
        // Make sure all sprites are loaded before starting
        Promise.all([
            new Promise(resolve => this.sprites.player.onload = resolve),
            new Promise(resolve => this.sprites.enemy.onload = resolve),
            new Promise(resolve => this.sprites.bullet.onload = resolve),
            new Promise(resolve => this.sprites.barrier.onload = resolve)
        ]).then(() => {
            this.setupEventListeners();
            this.gameLoop();
        });
        
        this.gamepadIndex = null;
        this.lastButtonStates = {};
        this.gamepadDeadzone = 0.1;
        
        // Set up gamepad detection
        window.addEventListener("gamepadconnected", (e) => {
            console.log("Gamepad connected:", e.gamepad.id);
            this.gamepadIndex = e.gamepad.index;
        });
        
        window.addEventListener("gamepaddisconnected", (e) => {
            console.log("Gamepad disconnected");
            if (this.gamepadIndex === e.gamepad.index) {
                this.gamepadIndex = null;
            }
        });
    }
    
    async loadHighScores() {
        this.highScores = await getHighScores();
    }

    initializeGame() {
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.gameOver = false;
        this.gameOverDisplayed = false;
        this.isPaused = false;
        this.isExploding = false;
        this.explosionTimer = 0;
        this.levelMessageTimer = 0;
        this.enemyMoveSpeed = 1;
        this.enemyShootChance = 0.02;
        
        // Clear existing entities
        this.player.bullets = [];
        this.enemyBullets = [];
        this.enemies = [];  // Clear existing enemies
        
        // Reset player position
        this.player.x = this.canvas.width / 2 - 30;
        
        // Initialize new game elements
        this.initializeEnemies();
        this.initializeBarriers();
        
        // Update HUD
        document.getElementById('scoreElement').textContent = this.score;
        document.getElementById('livesElement').textContent = this.lives;
        document.getElementById('levelElement').textContent = this.level;
    }
    
    initializeBarriers() {
        const spacing = this.canvas.width / (this.barrierCount + 1);
        for (let i = 0; i < this.barrierCount; i++) {
            this.barriers.push({
                x: spacing * (i + 1) - this.barrierWidth / 2,
                y: this.canvas.height - 150,
                width: this.barrierWidth,
                height: this.barrierHeight,
                health: this.barrierHealth
            });
        }
    }
    
    initializeEnemies() {
        for (let i = 0; i < this.enemyRows; i++) {
            for (let j = 0; j < this.enemyCols; j++) {
                this.enemies.push({
                    x: j * (this.enemyWidth + this.enemyPadding) + this.enemyPadding,
                    y: i * (this.enemyHeight + this.enemyPadding) + this.enemyPadding + 50,
                    width: this.enemyWidth,
                    height: this.enemyHeight
                });
            }
        }
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            if (this.showTitleScreen) {
                if (e.code === 'Enter') {
                    this.showTitleScreen = false;
                    this.initializeGame();
                    return;
                }
                if (e.code === 'KeyH') {
                    this.showHighScores = true;
                    this.showTitleScreen = false;
                    return;
                }
            }

            if (this.showHighScores) {
                if (e.code === 'Escape') {
                    this.showHighScores = false;
                    this.showTitleScreen = true;
                    return;
                }
            }

            if (this.enteringInitials) {
                if (e.key.match(/^[a-zA-Z]$/) && this.currentInitials.length < 3) {
                    this.currentInitials += e.key.toUpperCase();
                } else if (e.code === 'Backspace') {
                    this.currentInitials = this.currentInitials.slice(0, -1);
                } else if (e.code === 'Enter' && this.currentInitials.length === 3) {
                    this.addHighScore(this.currentInitials);
                }
                return;
            }

            if (this.gameOver) {
                if (e.code === 'Enter') {
                    this.initializeGame();
                    return;
                }
                if (e.code === 'Escape') {
                    this.showTitleScreen = true;
                    this.gameOver = false;
                    return;
                }
            }
            
            if (e.code === 'KeyR') {
                this.isPaused = !this.isPaused;
                return;
            }

            if (this.isPaused) return;

            if (e.key === 'ArrowLeft' && this.player.x > 0) {
                this.player.x -= this.player.speed;
            }
            if (e.key === 'ArrowRight' && this.player.x < this.canvas.width - this.player.width) {
                this.player.x += this.player.speed;
            }
            if (e.key === ' ') {
                this.shoot();
            }
        });
    }
    
    shoot() {
        this.player.bullets.push({
            x: this.player.x + this.player.width / 2 - 2,
            y: this.player.y,
            width: 4,
            height: 10,
            speed: 7
        });
        this.sounds.play('shoot');
    }
    
    enemyShoot() {
        if (this.enemies.length === 0) return;
        
        // Randomly select an enemy to shoot
        const shooter = this.enemies[Math.floor(Math.random() * this.enemies.length)];
        this.enemyBullets.push({
            x: shooter.x + shooter.width / 2 - 2,
            y: shooter.y + shooter.height,
            width: 4,
            height: 10,
            speed: 5
        });
        this.sounds.play('enemyShoot');
    }
    
    moveEnemies() {
        let touchedEdge = false;
        
        this.enemies.forEach(enemy => {
            enemy.x += this.enemyMoveSpeed * this.enemyDirection;
            
            if (enemy.x <= 0 || enemy.x + this.enemyWidth >= this.canvas.width) {
                touchedEdge = true;
            }
        });
        
        if (touchedEdge) {
            this.enemyDirection *= -1;
            this.enemies.forEach(enemy => {
                enemy.y += this.enemyDropDistance;
            });
        }
    }
    
    checkCollision(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }
    
    createExplosionParticles() {
        this.explosionParticles = [];
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            this.explosionParticles.push({
                x: this.player.x + this.player.width / 2,
                y: this.player.y + this.player.height / 2,
                vx: Math.cos(angle) * 5,
                vy: Math.sin(angle) * 5,
                size: 3,
                alpha: 1
            });
        }
    }

    updateExplosion() {
        if (!this.isExploding) return;

        this.explosionTimer -= 16; // Assuming 60fps
        
        if (this.explosionTimer <= 0) {
            this.isExploding = false;
            this.invincibleTimer = this.invincibleDuration;
            return;
        }

        // Update explosion particles
        this.explosionParticles.forEach(particle => {
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.alpha = this.explosionTimer / this.explosionDuration;
            particle.size *= 0.99;
        });
    }

    drawExplosion() {
        if (!this.isExploding) return;

        this.explosionParticles.forEach(particle => {
            this.ctx.fillStyle = `rgba(255, 200, 0, ${particle.alpha})`;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }

    playerHit() {
        this.lives--;
        document.getElementById('livesElement').textContent = this.lives;
        
        if (this.lives <= 0) {
            this.gameOver = true;
            this.sounds.play('gameOver');
            this.gameOverDisplayed = true;
            if (this.checkHighScore()) {
                this.enteringInitials = true;
            } else {
                this.showHighScores = true;
            }
            return;
        }

        // Start explosion sequence
        this.isExploding = true;
        this.explosionTimer = this.explosionDuration;
        this.createExplosionParticles();
        this.sounds.play('playerExplosion');
    }

    async update() {
        if (this.showTitleScreen || this.gameOver || this.showHighScores) {
            this.handleGamepad();
            return;
        }

        // Handle gamepad input
        this.handleGamepad();
        
        if (this.gameOver) {
            if (!this.gameOverDisplayed) {
                this.sounds.play('gameOver');
                this.gameOverDisplayed = true;
            }
            return;
        }

        if (this.isPaused) return;
        
        // Update invincibility timer
        if (this.invincibleTimer > 0) {
            this.invincibleTimer -= 16; // Assuming 60fps (1000ms/60 ≈ 16ms)
        }
        
        // Update level message timer
        if (this.levelMessageTimer > 0) {
            this.levelMessageTimer -= 16; // Assuming 60fps (1000/60 ≈ 16)
        }

        // Update explosion animation
        this.updateExplosion();

        if (this.isExploding) return; // Don't update game while exploding

        // Update bullet positions
        this.player.bullets = this.player.bullets.filter(bullet => {
            bullet.y -= bullet.speed;
            return bullet.y > 0;
        });
        
        // Update enemy bullets
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            bullet.y += bullet.speed;
            return bullet.y < this.canvas.height;
        });
        
        // Move enemies
        this.moveEnemies();
        
        // Random enemy shooting
        if (Math.random() < this.enemyShootChance) {
            this.enemyShoot();
        }
        
        // Check all collisions
        this.checkCollisions();
        
        // Check if all enemies are defeated
        if (this.enemies.length === 0) {
            this.level++;
            this.displayLevel();
            this.initializeEnemies();
            this.enemyMoveSpeed += 0.2; // Increase difficulty
            this.enemyShootChance += 0.005; // Increase shooting frequency
        }
    }
    
    displayLevel() {
        this.levelMessageTimer = 2000; // Display for 2 seconds
        this.sounds.play('levelComplete');
        document.getElementById('levelElement').textContent = this.level;
    }

    drawLevelMessage() {
        if (this.levelMessageTimer > 0) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(`Level ${this.level}`, this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    async checkHighScore() {
        // Refresh high scores first
        await this.loadHighScores();
        
        if (this.highScores.length < 5 || this.score > this.highScores[this.highScores.length - 1].score) {
            this.enteringInitials = true;
            this.currentInitials = '';
            return true;
        }
        return false;
    }

    async addHighScore(initials) {
        const success = await addHighScore(initials.toUpperCase(), this.score, this.level);
        if (success) {
            await this.loadHighScores(); // Reload the high scores
            this.enteringInitials = false;
            this.showHighScores = true;
        } else {
            console.error('Failed to save high score');
        }
    }

    drawHighScores() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        this.ctx.fillStyle = 'white';
        this.ctx.font = 'bold 40px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('HIGH SCORES', this.canvas.width / 2, 100);

        this.ctx.font = '24px monospace';
        this.highScores.forEach((score, index) => {
            const text = `${index + 1}. ${score.initials.padEnd(3, ' ')}  ${score.score.toString().padStart(6, '0')}  LVL ${score.level}`;
            this.ctx.fillText(text, this.canvas.width / 2, 180 + (index * 50));
        });

        // Loading message if no scores yet
        if (this.highScores.length === 0) {
            this.ctx.fillText('Loading scores...', this.canvas.width / 2, 180);
        }

        this.ctx.font = '20px monospace';
        if (this.gamepadIndex !== null) {
            this.ctx.fillText('Press B to return', this.canvas.width / 2, this.canvas.height - 50);
        } else {
            this.ctx.fillText('Press ESC to return', this.canvas.width / 2, this.canvas.height - 50);
        }
    }
    
    drawTitleScreen() {
        const ctx = this.ctx;
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw main title with retro effect
        ctx.fillStyle = 'white';
        ctx.font = 'bold 80px monospace';
        ctx.textAlign = 'center';
        
        // Draw "INVADERS" with glitch effect
        const baseY = this.canvas.height * 0.3;
        const title = "INVADERS";
        const glitchOffset = Math.sin(this.titleScreenTimer / 500) * 3;
        
        // Draw shadow/glitch effect
        ctx.fillStyle = 'rgba(0, 255, 255, 0.5)'; // Cyan shadow
        ctx.fillText(title, this.canvas.width / 2 + glitchOffset, baseY);
        ctx.fillStyle = 'rgba(255, 0, 255, 0.5)'; // Magenta shadow
        ctx.fillText(title, this.canvas.width / 2 - glitchOffset, baseY);
        
        // Main title
        ctx.fillStyle = 'white';
        ctx.fillText(title, this.canvas.width / 2, baseY);

        // Draw enemy sprites in a row
        const enemyY = this.canvas.height * 0.5;
        const enemySpacing = 80;
        const startX = this.canvas.width / 2 - (enemySpacing * 2);
        
        for (let i = 0; i < 5; i++) {
            ctx.drawImage(
                this.sprites.enemy,
                startX + (i * enemySpacing),
                enemyY,
                40,
                32
            );
        }

        // Draw "Press ENTER to Start" with blinking effect
        ctx.font = '24px monospace';
        if (Math.floor(this.titleScreenTimer / 500) % 2 === 0) {
            ctx.fillStyle = 'white';
            ctx.fillText('Press ENTER to Start', this.canvas.width / 2, this.canvas.height * 0.7);
            ctx.fillText('Press H for High Scores', this.canvas.width / 2, this.canvas.height * 0.7 + 30);
        }

        // Draw credits
        ctx.font = '16px monospace';
        ctx.fillStyle = 'gray';
        ctx.fillText(' 2024 RETRO GAMES', this.canvas.width / 2, this.canvas.height * 0.85);

        // Update timer for animations
        this.titleScreenTimer += 16;
        
        // Update controller instructions
        if (this.gamepadIndex !== null) {
            ctx.font = '16px monospace';
            ctx.fillStyle = 'gray';
            ctx.fillText('Controller: A to Start, Y for High Scores', 
                this.canvas.width / 2, this.canvas.height * 0.75 + 30);
        }
    }

    draw() {
        if (this.showTitleScreen) {
            this.drawTitleScreen();
            return;
        }

        if (this.showHighScores) {
            this.drawHighScores();
            return;
        }

        if (this.enteringInitials) {
            this.ctx.fillStyle = 'black';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.drawInitialsEntry();
            return;
        }

        // Clear the canvas
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw level indicator in top-right corner
        this.ctx.fillStyle = 'white';
        this.ctx.font = '20px Arial';
        this.ctx.textAlign = 'right';
        this.ctx.fillText(`Level: ${this.level}`, this.canvas.width - 10, 30);
        
        // Draw barriers
        this.barriers.forEach(barrier => {
            this.ctx.globalAlpha = barrier.health / this.barrierHealth;
            this.ctx.drawImage(this.sprites.barrier, barrier.x, barrier.y, barrier.width, barrier.height);
        });
        this.ctx.globalAlpha = 1;
        
        // Draw level message if active
        this.drawLevelMessage();
        
        // Draw player with blinking effect when invincible
        if (!this.isExploding && (this.invincibleTimer <= 0 || Math.floor(this.invincibleTimer / 100) % 2 === 0)) {
            this.ctx.drawImage(this.sprites.player, this.player.x, this.player.y, this.player.width, this.player.height);
        }

        // Draw explosion if active
        this.drawExplosion();
        
        // Draw enemies
        this.enemies.forEach(enemy => {
            this.ctx.drawImage(this.sprites.enemy, enemy.x, enemy.y, enemy.width, enemy.height);
        });
        
        // Draw player bullets
        this.player.bullets.forEach(bullet => {
            this.ctx.drawImage(this.sprites.bullet, bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        // Draw enemy bullets
        this.enemyBullets.forEach(bullet => {
            this.ctx.fillStyle = '#ff0000';
            this.ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
        });
        
        if (this.gameOver) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 40);
            this.ctx.font = '24px Arial';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);
            this.ctx.fillText('Press ENTER to play again', this.canvas.width / 2, this.canvas.height / 2 + 50);
            this.ctx.fillText('Press ESC for title screen', this.canvas.width / 2, this.canvas.height / 2 + 80);
            return;
        }

        if (this.isPaused) {
            this.ctx.fillStyle = 'white';
            this.ctx.font = '40px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.font = '24px Arial';
            this.ctx.fillText('Press R to resume', this.canvas.width / 2, this.canvas.height / 2 + 40);
            return;
        }
    }
    
    gameLoop() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }

    checkCollisions() {
        // Player bullets with enemies
        this.player.bullets.forEach((bullet, bulletIndex) => {
            this.enemies.forEach((enemy, enemyIndex) => {
                if (this.checkCollision(bullet, enemy)) {
                    this.enemies.splice(enemyIndex, 1);
                    this.player.bullets.splice(bulletIndex, 1);
                    this.score += 10;
                    document.getElementById('scoreElement').textContent = this.score;
                    this.sounds.play('explosion');
                }
            });
        });

        // Enemy bullets with player
        if (!this.invincibleTimer && !this.isExploding) {
            this.enemyBullets.forEach((bullet, index) => {
                if (this.checkCollision(bullet, this.player)) {
                    this.enemyBullets.splice(index, 1);
                    this.playerHit();
                }
            });
        }
        
        // Bullets with barriers
        [...this.player.bullets, ...this.enemyBullets].forEach((bullet, bulletIndex) => {
            this.barriers.forEach((barrier, barrierIndex) => {
                if (this.checkCollision(bullet, barrier)) {
                    barrier.health--;
                    if (barrier.health <= 0) {
                        this.barriers.splice(barrierIndex, 1);
                    }
                    if (bullet.y < barrier.y) { // Player bullet
                        this.player.bullets.splice(this.player.bullets.indexOf(bullet), 1);
                    } else { // Enemy bullet
                        this.enemyBullets.splice(this.enemyBullets.indexOf(bullet), 1);
                    }
                    this.sounds.play('hit');
                }
            });
        });
        
        // Check if enemies reached the player
        this.enemies.forEach(enemy => {
            if (enemy.y + enemy.height >= this.player.y) {
                this.gameOver = true;
            }
        });
    }
    
    drawInitialsEntry() {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '40px monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('NEW HIGH SCORE!', this.canvas.width / 2, this.canvas.height / 2 - 80);
        
        this.ctx.font = '24px monospace';
        this.ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 - 30);
        this.ctx.fillText('Enter your initials:', this.canvas.width / 2, this.canvas.height / 2 + 20);
        
        const displayInitials = this.currentInitials.padEnd(3, '_');
        this.ctx.font = '40px monospace';
        this.ctx.fillText(displayInitials, this.canvas.width / 2, this.canvas.height / 2 + 80);
        
        if (this.gamepadIndex !== null) {
            this.ctx.font = '16px monospace';
            this.ctx.fillText('Use D-pad: ↑↓ change letter, →← move cursor, A to confirm', 
                this.canvas.width / 2, this.canvas.height / 2 + 120);
        }
    }

    handleGamepad() {
        if (this.gamepadIndex === null) return;
        
        const gamepad = navigator.getGamepads()[this.gamepadIndex];
        if (!gamepad) return;

        // Get horizontal axis (left stick or d-pad)
        const horizontalAxis = Math.abs(gamepad.axes[0]) > this.gamepadDeadzone ? gamepad.axes[0] : 0;
        
        // Movement
        if (horizontalAxis !== 0) {
            const newX = this.player.x + (horizontalAxis * this.player.speed);
            if (newX >= 0 && newX <= this.canvas.width - this.player.width) {
                this.player.x = newX;
            }
        }

        // Handle button presses (checking for button state changes)
        const isButtonPressed = (buttonIndex) => {
            const pressed = gamepad.buttons[buttonIndex].pressed;
            const wasPressed = this.lastButtonStates[buttonIndex];
            this.lastButtonStates[buttonIndex] = pressed;
            return pressed && !wasPressed;
        };

        // A Button (0) - Shoot/Confirm
        if (gamepad.buttons[0].pressed && !this.lastButtonStates[0]) {
            if (this.showTitleScreen) {
                this.showTitleScreen = false;
                this.initializeGame();
            } else if (this.gameOver) {
                this.initializeGame();
            } else if (this.enteringInitials && this.currentInitials.length === 3) {
                this.addHighScore(this.currentInitials);
            } else if (!this.gameOver && !this.enteringInitials) {
                this.shoot();
            }
        }

        // B Button (1) - Back/Cancel
        if (isButtonPressed(1)) {
            if (this.showHighScores) {
                this.showHighScores = false;
                this.showTitleScreen = true;
            } else if (this.gameOver) {
                this.showTitleScreen = true;
                this.gameOver = false;
            }
        }

        // Y Button (3) - View High Scores from title
        if (isButtonPressed(3) && this.showTitleScreen) {
            this.showHighScores = true;
            this.showTitleScreen = false;
        }

        // Handle initial entry with d-pad
        if (this.enteringInitials) {
            const dpadUp = isButtonPressed(12);
            const dpadDown = isButtonPressed(13);
            const dpadLeft = isButtonPressed(14);
            const dpadRight = isButtonPressed(15);

            if (this.currentInitials.length < 3) {
                if (dpadUp || dpadDown) {
                    const currentChar = this.currentInitials.length > 0 ? 
                        this.currentInitials.charAt(this.currentInitials.length - 1).charCodeAt(0) : 64;
                    let newChar = currentChar + (dpadUp ? 1 : -1);
                    if (newChar < 65) newChar = 90;
                    if (newChar > 90) newChar = 65;
                    
                    if (this.currentInitials.length > 0) {
                        this.currentInitials = this.currentInitials.slice(0, -1) + String.fromCharCode(newChar);
                    } else {
                        this.currentInitials += String.fromCharCode(newChar);
                    }
                }
                if (dpadRight && this.currentInitials.length < 3) {
                    this.currentInitials += 'A';
                }
            }
            if (dpadLeft && this.currentInitials.length > 0) {
                this.currentInitials = this.currentInitials.slice(0, -1);
            }
        }

        // Update last button states
        gamepad.buttons.forEach((button, index) => {
            this.lastButtonStates[index] = button.pressed;
        });
    }
}

// Start the game
window.onload = () => {
    new Game();
};
