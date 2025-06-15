// managers/game-manager.js - Enhanced game manager with proper boss integration

class GameManager {
    constructor(config) {
        this.config = config;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Game state
        this.gameRunning = false;
        this.gameLoopId = null;
        this.currentMapFile = null;
        this.gameWon = false;

        // Apply game speed modifier from config
        this.gameSpeed = config.game?.gameSpeed || 0.7;

        // Core systems
        this.engine = null;
        this.input = null;
        this.physics = null;
        this.renderer = null;
        this.timeManager = null;

        // Game systems
        this.weaponSystem = null;
        this.enemySystem = null;
        this.particleSystem = null;
        this.audioSystem = null;
        this.collisionSystem = null;
        this.cameraSystem = null;

        // Managers
        this.assetManager = null;
        this.levelManager = null;
        this.stateManager = null;
        this.uiManager = null;
        this.saveManager = null;

        // Game entities
        this.player = null;
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.pickups = [];
        this.boss = null;
        this.bossActivated = false;

        //Utils
        this.performanceMonitor = new PerformanceMonitor();

        // Game variables
        this.score = 0;
        this.lives = 3;
    }

    async initialize() {
        try {
            // Set canvas size from config
            this.canvas.width = this.config.game.width;
            this.canvas.height = this.config.game.height;

            // Set initial canvas display size to fit viewport
            this.handleResize();

            // Initialize core systems
            this.initializeSystems();

            // Load player sprite
            console.log('Loading player sprite...');
            try {
                const spritePath = this.config.sprites?.directory || 'Sprites/Aseprite/';
                const playerSprite = this.config.sprites?.player?.json || 'karateguy.json';
                const fullPath = spritePath + playerSprite;
                console.log('Loading sprite from:', fullPath);

                await this.renderer.spriteRenderer.loadSpriteFromJSON(fullPath, 'player');
                console.log('Player sprite loaded successfully');
            } catch (error) {
                console.warn('Failed to load player sprite, using fallback shapes:', error);
            }

            // Load boss sprite
            console.log('Loading boss sprite...');
            try {
                const spritePath = this.config.sprites?.directory || 'Sprites/Aseprite/';
                const bossSprite = this.config.sprites?.boss?.json || 'ninjamand.json';
                const fullPath = spritePath + bossSprite;
                console.log('Loading boss sprite from:', fullPath);

                await this.renderer.spriteRenderer.loadSpriteFromJSON(fullPath, 'boss');
                console.log('Boss sprite loaded successfully');
            } catch (error) {
                console.warn('Failed to load boss sprite, using fallback shapes:', error);
            }

            // Initialize debug menu safely
            if (window.initializeDebugMenu && typeof window.initializeDebugMenu === 'function') {
                try {
                    window.initializeDebugMenu();
                } catch (error) {
                    console.warn('Debug menu initialization failed:', error);
                }
            }

            // Load available maps from maps folder
            await this.loadAvailableMaps();

            // Set up input handlers
            this.setupInputHandlers();

            // Initialize UI
            this.uiManager.initialize();

            // Hide loading message
            document.getElementById('loadingMessage').style.display = 'none';

        } catch (error) {
            console.error('Failed to initialize game:', error);
            throw error;
        }
    }

    initializeSystems() {
        // Initialize core systems with config
        this.engine = new Engine(this.config);
        this.input = new InputSystem(this.config.input);
        this.physics = new PhysicsSystem(this.config.game);
        this.renderer = new Renderer(this.canvas, this.ctx, this.config);
        this.timeManager = new TimeManager();

        // Initialize game systems
        this.weaponSystem = new WeaponSystem(this.config);
        this.enemySystem = new EnemySystem(this.config.enemies);
        this.particleSystem = new ParticleSystem(this.config.particles);
        this.audioSystem = new AudioSystem(this.config.audio);
        this.collisionSystem = new CollisionSystem();
        this.cameraSystem = new CameraSystem(this.canvas, this.config.game);

        // Use pooled particle system if available
        if (typeof ParticleSystemPooled !== 'undefined') {
            this.particleSystem = new ParticleSystemPooled(this.config.particles);
            console.log('Using pooled particle system');
        } else {
            this.particleSystem = new ParticleSystem(this.config.particles);
        }

        // Initialize managers
        this.assetManager = new AssetManager(this.config.sprites);
        this.levelManager = new LevelManager();
        this.stateManager = new StateManager();
        this.uiManager = new UIManager(this.config.ui);
        this.saveManager = new SaveManager();
    }

    async loadAvailableMaps() {
        try {
            console.log('GameManager: Loading available maps...');
            const maps = await this.levelManager.loadAvailableMaps();
            console.log('GameManager: Loaded maps:', maps);
            this.updateMapButtons(maps);
        } catch (error) {
            console.error('GameManager: Error loading maps:', error);
            // Fallback to built-in maps
            this.updateMapButtons(['builtin-1', 'builtin-2', 'builtin-3']);
        }
    }

    async loadMap(mapFile) {
        const mapData = await this.levelManager.loadMap(mapFile);

        // Clear existing entities
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.pickups = [];
        this.boss = null;
        this.bossActivated = false;
        this.gameWon = false;

        // Create enemies from map data
        if (mapData.enemies) {
            console.log(`Loading ${mapData.enemies.length} enemies`);
            mapData.enemies.forEach(enemyData => {
                const enemy = this.enemySystem.createEnemy(enemyData);
                if (enemy) {
                    this.enemies.push(enemy);
                }
            });
        }

        // Create pickups from map data
        if (mapData.pickups) {
            console.log(`Loading ${mapData.pickups.length} pickups`);
            mapData.pickups.forEach(pickupData => {
                const pickup = new Pickup({
                    ...pickupData,
                    width: pickupData.width || 20,
                    height: pickupData.height || 20
                });
                this.pickups.push(pickup);
            });
        }

        // Create boss - ALWAYS create boss for every map
        console.log('Creating boss...');
        const bossData = mapData.boss || {
            x: this.config.game.levelWidth - 300,  // Place boss near end of level
            y: 300,
            triggerX: this.config.game.levelWidth - 400  // Trigger boss when player is close to end
        };

        this.boss = new Boss(bossData, this.config.boss);
        console.log(`Boss created at x:${this.boss.x}, triggerX:${this.boss.triggerX}`);

        console.log(`Map loaded: ${this.enemies.length} enemies, ${this.pickups.length} pickups, boss: ${this.boss ? 'YES' : 'NO'}`);
    }

    updateMapButtons(maps) {
        const mapButtons = document.getElementById('mapButtons');
        mapButtons.innerHTML = '';

        if (maps.length === 0) {
            mapButtons.innerHTML = '<p style="color: #ff0000;">No maps found!</p>';
            return;
        }

        maps.forEach(mapFile => {
            const btn = document.createElement('button');
            btn.className = 'map-btn';
            btn.textContent = this.levelManager.getMapDisplayName(mapFile);
            btn.onclick = () => this.selectMap(mapFile);
            mapButtons.appendChild(btn);
        });
    }

    selectMap(mapFile) {
        this.currentMapFile = mapFile;
        this.uiManager.updateMapSelection(mapFile);

        // Update UI to show selected map
        const displayName = this.levelManager.getMapDisplayName(mapFile);
        document.getElementById('currentMapName').textContent = displayName;
        document.getElementById('mapInstruction').textContent = `Selected: ${displayName} - Click START GAME to play!`;
        document.getElementById('mapInstruction').style.color = '#00ff00';

        // Highlight selected button
        const buttons = document.querySelectorAll('.map-btn');
        buttons.forEach(btn => {
            if (btn.textContent === displayName) {
                btn.style.background = '#ffff00';
                btn.style.color = '#000';
            } else {
                btn.style.background = '#00ff00';
                btn.style.color = '#000';
            }
        });
    }

    async startGame() {
        if (!this.currentMapFile) {
            alert('Please select a map first!');
            return;
        }

        // Reset game state
        this.resetGameState();

        // Load the selected map
        await this.loadMap(this.currentMapFile);

        // Initialize player with config values
        this.player = new Player(
            this.config.player,
            this.weaponSystem,
            this.particleSystem
        );

        // Set initial player position from level
        const startPos = this.levelManager.getPlayerStartPosition();
        this.player.setPosition(startPos.x, startPos.y);

        // Update UI
        this.uiManager.hideStartScreen();
        this.uiManager.updateHealth(this.player.health, this.player.maxHealth);
        this.uiManager.updateLives(this.lives);
        this.uiManager.updateScore(this.score);

        // Start game loop
        this.gameRunning = true;
        this.gameLoop();
    }

    resetGameState() {
        // Stop any running game loop
        if (this.gameLoopId) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }

        // Reset game variables
        this.gameRunning = false;
        this.score = 0;
        this.lives = 3;
        this.bossActivated = false;
        this.gameWon = false;

        // Clear all entities
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.pickups = [];
        this.boss = null;

        // Reset systems
        this.cameraSystem.reset();
        this.particleSystem.clear();

        // Clear input state
        this.input.reset();

        // Hide boss UI
        this.uiManager.hideBossHealth();
    }

    // Update gameLoop()
    gameLoop() {
        if (!this.gameRunning) return;

        // Start performance monitoring
        this.performanceMonitor.startFrame();

        // Update time
        this.timeManager.update();
        let deltaTime = this.timeManager.getDeltaTime();
        deltaTime *= this.gameSpeed;

        // Measure update performance
        this.performanceMonitor.measure('update', () => {
            this.update(deltaTime);
        });

        // Measure render performance
        this.performanceMonitor.measure('render', () => {
            this.render();
        });

        // Update UI
        this.updateUI();

        // End frame measurement
        this.performanceMonitor.endFrame();

        // Update debug stats if enabled
        if (this.config.debug.showFPS) {
            const stats = this.performanceMonitor.getStats();
            this.uiManager.updateDebugStats({
                fps: stats.fps,
                frameTime: stats.avgFrameTime,
                breakdown: stats.breakdown
            });
        }

        // Continue loop
        this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }

    update(deltaTime) {
        // Update input
        this.input.update();

        // Update debug menu if it exists and has update method
        if (window.debugMenu && typeof window.debugMenu.update === 'function') {
            window.debugMenu.update(deltaTime);
        }

        // Update player
        if (this.player) {
            this.player.update(deltaTime, this.input, this.levelManager.getPlatforms());

            // Update camera to follow player
            this.cameraSystem.followTarget(this.player);
        }

        // Update enemies
        this.enemies = this.enemySystem.updateEnemies(
            this.enemies,
            this.player,
            deltaTime,
            this.projectiles,
            this.levelManager.getPlatforms(),
            this.physics
        );

        // Update boss
        if (this.boss) {
            // Check if boss should be activated
            if (!this.boss.active && this.player && this.player.x >= this.boss.triggerX) {
                this.activateBoss();
            }

            // Update boss if active
            if (this.boss.active) {
                // Apply physics to boss
                this.physics.applyGravity(this.boss, deltaTime);
                this.physics.updatePosition(this.boss, deltaTime);
                this.physics.checkPlatformCollisions(this.boss, this.levelManager.getPlatforms());

                // Update boss AI
                this.boss.update(deltaTime, this.player, this.projectiles);

                // Handle boss shooting
                if (this.boss.shouldShoot && this.boss.projectileData) {
                    this.createBossProjectile(this.boss.projectileData);
                    this.boss.shouldShoot = false;
                    this.boss.projectileData = null;
                }
            }
        }

        // Handle enemy shooting
        this.enemies.forEach(enemy => {
            if (enemy.shouldShoot) {
                this.weaponSystem.createEnemyProjectile(
                    enemy.x + enemy.width / 2,
                    enemy.y + enemy.height / 2,
                    enemy.targetX,
                    enemy.targetY,
                    enemy.damage,
                    enemy.projectileSpeed || 1
                );
                enemy.shouldShoot = false;
            }
        });

        // Update projectiles
        this.projectiles = this.weaponSystem.updateProjectiles(
            this.projectiles,
            this.levelManager.getPlatforms(),
            deltaTime
        );

        // Update particles
        this.particleSystem.update(deltaTime);

        // Update pickups
        this.pickups = this.updatePickups(this.pickups, deltaTime);

        // Check collisions
        this.checkCollisions();

        // Check game state
        this.checkGameState();
    }

    activateBoss() {
        console.log('🔥 BOSS ACTIVATED! 🔥');
        this.boss.activate();
        this.bossActivated = true;
        this.uiManager.showBossHealth();
        this.uiManager.updateBossHealth(this.boss.health, this.boss.maxHealth);

        // Create dramatic activation effects
        for (let i = 0; i < 50; i++) {
            this.particleSystem.createCustomParticles(
                this.boss.x + this.boss.width / 2 + (Math.random() - 0.5) * 100,
                this.boss.y + this.boss.height / 2 + (Math.random() - 0.5) * 100,
                1, '#ff0000', 12, 40
            );
        }

        // Boss entrance warning particles
        for (let i = 0; i < 30; i++) {
            this.particleSystem.createCustomParticles(
                this.boss.x + this.boss.width / 2,
                this.boss.y + this.boss.height,
                1, '#ffff00', 8, 30
            );
        }

        this.cameraSystem.startShake(15, 45);
    }

    createBossProjectile(data) {
        const projectile = {
            x: data.x - data.width / 2,
            y: data.y - data.height / 2,
            width: data.width,
            height: data.height,
            vx: data.vx,
            vy: data.vy,
            damage: data.damage,
            fromPlayer: false,
            boss: true,
            type: 'boss'
        };

        this.projectiles.push(projectile);
    }

    updatePickups(pickups, deltaTime) {
        return pickups.filter(pickup => {
            pickup.update(deltaTime);

            // Check collision with player
            if (this.collisionSystem.checkCollision(this.player, pickup)) {
                pickup.collect(this.player);
                this.particleSystem.createEffect('pickup', pickup.x, pickup.y);
                return false;
            }

            return true;
        });
    }

    checkCollisions() {
        // Player vs enemies
        this.enemies.forEach(enemy => {
            if (this.collisionSystem.checkCollision(this.player, enemy)) {
                if (!this.player.isInvulnerable()) {
                    this.player.takeDamage(enemy.damage);
                    this.uiManager.updateHealth(this.player.health, this.player.maxHealth);
                }
            }
        });

        // Player vs boss
        if (this.boss && this.boss.active) {
            if (this.collisionSystem.checkCollision(this.player, this.boss)) {
                if (!this.player.isInvulnerable()) {
                    this.player.takeDamage(30); // Boss contact damage
                    this.uiManager.updateHealth(this.player.health, this.player.maxHealth);
                }
            }
        }

        // Player projectiles vs enemies and boss
        this.projectiles = this.projectiles.filter(proj => {
            if (!proj.fromPlayer) return true;

            let hit = false;

            // Check enemies
            this.enemies = this.enemies.filter(enemy => {
                if (this.collisionSystem.checkCollision(proj, enemy)) {
                    enemy.takeDamage(proj.damage);
                    this.particleSystem.createEffect('hit', proj.x, proj.y);

                    if (enemy.health <= 0) {
                        this.score += enemy.scoreValue;
                        this.particleSystem.createEffect('explosion', enemy.x + enemy.width / 2, enemy.y + enemy.height / 2);
                        return false;
                    }

                    if (!proj.piercing) hit = true;
                }
                return true;
            });

            // Check boss
            if (this.boss && this.boss.active && this.collisionSystem.checkCollision(proj, this.boss)) {
                this.boss.takeDamage(proj.damage);
                this.particleSystem.createEffect('hit', proj.x, proj.y);
                this.uiManager.updateBossHealth(this.boss.health, this.boss.maxHealth);

                // Screen shake on boss hit
                this.cameraSystem.startShake(3, 5);

                if (!proj.piercing) hit = true;
            }

            return !hit;
        });

        // Enemy and boss projectiles vs player
        this.projectiles = this.projectiles.filter(proj => {
            if (proj.fromPlayer) return true;

            if (this.collisionSystem.checkCollision(proj, this.player)) {
                if (!this.player.isInvulnerable()) {
                    this.player.takeDamage(proj.damage);
                    this.uiManager.updateHealth(this.player.health, this.player.maxHealth);
                    this.particleSystem.createEffect('hit', this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);
                }
                return false;
            }

            return true;
        });
    }

    checkGameState() {
        // Check if player died
        if (this.player.health <= 0) {
            this.lives--;
            this.uiManager.updateLives(this.lives);

            if (this.lives <= 0) {
                this.gameOver();
            } else {
                this.player.respawn();
                this.uiManager.updateHealth(this.player.health, this.player.maxHealth);
            }
        }

        // Check if boss defeated
        if (this.boss && this.boss.health <= 0 && !this.gameWon) {
            this.gameWin();
        }
    }

    render() {
        // Clear canvas
        this.renderer.clear();

        // Apply camera transform
        this.ctx.save();
        this.cameraSystem.applyTransform(this.ctx);

        // Render background
        this.renderer.renderBackground(this.cameraSystem);

        // Render level
        this.renderer.renderPlatforms(this.levelManager.getPlatforms());

        // Render pickups
        this.pickups.forEach(pickup => this.renderer.renderPickup(pickup));

        // Render enemies
        this.enemies.forEach(enemy => this.renderer.renderEnemy(enemy));

        // Render boss
        if (this.boss && this.boss.active) {
            this.renderer.renderBoss(this.boss);
        }

        // Render player
        if (this.player) {
            this.renderer.renderPlayer(this.player);
        }

        // Render projectiles
        this.projectiles.forEach(proj => this.renderer.renderProjectile(proj));

        // Render particles
        this.particleSystem.render(this.ctx);

        // Restore transform
        this.ctx.restore();

        // Render UI elements that shouldn't be affected by camera
        if (this.config.debug.showHitboxes) {
            this.renderDebugInfo();
        }
    }

    renderDebugInfo() {
        this.ctx.save();
        this.cameraSystem.applyTransform(this.ctx);

        // Render collision boxes
        this.ctx.strokeStyle = '#ff0000';
        this.ctx.lineWidth = 1;

        // Player hitbox
        if (this.player) {
            this.ctx.strokeRect(this.player.x, this.player.y, this.player.width, this.player.height);
        }

        // Enemy hitboxes
        this.enemies.forEach(enemy => {
            this.ctx.strokeRect(enemy.x, enemy.y, enemy.width, enemy.height);
        });

        // Boss hitbox
        if (this.boss && this.boss.active) {
            this.ctx.strokeStyle = '#ff00ff';
            this.ctx.strokeRect(this.boss.x, this.boss.y, this.boss.width, this.boss.height);
        }

        this.ctx.restore();
    }

    updateUI() {
        this.uiManager.updateScore(this.score);

        if (this.config.debug.showFPS) {
            this.uiManager.updateFPS(this.timeManager.getFPS());
        }

        if (this.player) {
            this.uiManager.updateChargeIndicator(
                this.player.chargeTimer,
                this.player.maxCharge
            );

            this.uiManager.updateWeaponIndicator(this.player.currentWeapon);
        }

        // Update boss health if active
        if (this.boss && this.boss.active) {
            this.uiManager.updateBossHealth(this.boss.health, this.boss.maxHealth);
        }
    }

    gameOver() {
        this.gameRunning = false;
        this.uiManager.showGameOver(this.score, false);
    }

    gameWin() {
        this.gameRunning = false;
        this.gameWon = true;
        this.score += this.boss.scoreValue; // Boss bonus

        // Epic victory effects
        console.log('🎉 BOSS DEFEATED! LEVEL COMPLETE! 🎉');

        // Multiple explosion effects
        for (let i = 0; i < 100; i++) {
            setTimeout(() => {
                this.particleSystem.createCustomParticles(
                    this.boss.x + Math.random() * this.boss.width,
                    this.boss.y + Math.random() * this.boss.height,
                    3, i % 2 === 0 ? '#ffff00' : '#ff0000', 15, 50
                );
            }, i * 20);
        }

        // Victory sparkles
        for (let i = 0; i < 200; i++) {
            setTimeout(() => {
                this.particleSystem.createCustomParticles(
                    this.boss.x - 100 + Math.random() * (this.boss.width + 200),
                    this.boss.y - 100 + Math.random() * (this.boss.height + 200),
                    1, '#00ff00', 10, 60
                );
            }, i * 10);
        }

        this.cameraSystem.startShake(25, 90);

        // Show victory screen after effects
        setTimeout(() => {
            this.uiManager.showGameOver(this.score, true);
        }, 2000);
    }

    returnToMapSelection() {
        this.resetGameState();
        this.uiManager.showStartScreen();
        this.currentMapFile = null;

        // Reset map selection UI
        document.getElementById('currentMapName').textContent = '-';
        document.getElementById('mapInstruction').textContent = 'Select a map above, then click START GAME';
        document.getElementById('mapInstruction').style.color = '#ffff00';

        // Reset button highlighting
        const buttons = document.querySelectorAll('.map-btn');
        buttons.forEach(btn => {
            btn.style.background = '#00ff00';
            btn.style.color = '#000';
        });
    }

    setupInputHandlers() {
        // ESC key to return to menu
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.gameRunning) {
                this.returnToMapSelection();
            }
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
    }

    handleResize() {
        // Get viewport dimensions
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Leave some padding for the border and UI
        const maxWidth = viewportWidth - 20;
        const maxHeight = viewportHeight - 20;

        // Calculate aspect ratio
        const gameAspectRatio = this.config.game.width / this.config.game.height;

        let newWidth, newHeight;

        // Fit canvas within viewport while maintaining aspect ratio
        if (maxWidth / maxHeight > gameAspectRatio) {
            // Viewport is wider - fit to height
            newHeight = maxHeight;
            newWidth = newHeight * gameAspectRatio;
        } else {
            // Viewport is taller - fit to width
            newWidth = maxWidth;
            newHeight = newWidth / gameAspectRatio;
        }

        // Apply the calculated dimensions
        this.canvas.style.width = Math.floor(newWidth) + 'px';
        this.canvas.style.height = Math.floor(newHeight) + 'px';
    }
}