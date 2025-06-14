// game-manager.js - Main game orchestrator

class GameManager {
    constructor(config) {
        this.config = config;
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.gameRunning = false;
        this.gameLoopId = null;
        this.currentMapFile = null;
        
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
        
        // Game variables
        this.score = 0;
        this.lives = 3;
    }
    
    async initialize() {
        try {
            // Set canvas size from config
            this.canvas.width = this.config.game.width;
            this.canvas.height = this.config.game.height;
            
            // Initialize core systems
            this.initializeSystems();
            
            // Load available maps
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
    
    async loadMap(mapFile) {
        const mapData = await this.levelManager.loadMap(mapFile);
        
        // Clear existing entities
        this.enemies = [];
        this.projectiles = [];
        this.particles = [];
        this.pickups = [];
        
        // Create enemies from map data
        if (mapData.enemies) {
            mapData.enemies.forEach(enemyData => {
                const enemy = this.enemySystem.createEnemy(enemyData);
                this.enemies.push(enemy);
            });
        }
        
        // Create pickups from map data
        if (mapData.pickups) {
            mapData.pickups.forEach(pickupData => {
                const pickup = new Pickup(pickupData);
                this.pickups.push(pickup);
            });
        }
        
        // Create boss if defined
        if (mapData.boss) {
            this.boss = new Boss(mapData.boss, this.config.boss);
        }
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
    }
    
    gameLoop() {
        if (!this.gameRunning) return;
        
        // Update time
        this.timeManager.update();
        const deltaTime = this.timeManager.getDeltaTime();
        
        // Update all systems
        this.update(deltaTime);
        
        // Render everything
        this.render();
        
        // Update UI
        this.updateUI();
        
        // Continue loop
        this.gameLoopId = requestAnimationFrame(() => this.gameLoop());
    }
    
    update(deltaTime) {
        // Update input
        this.input.update();
        
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
            this.projectiles
        );
        
        // Update boss
        if (this.boss && this.boss.active) {
            this.boss.update(deltaTime, this.player, this.projectiles);
        }
        
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
        
        // Player projectiles vs enemies
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
                        this.particleSystem.createEffect('explosion', enemy.x, enemy.y);
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
                
                if (!proj.piercing) hit = true;
            }
            
            return !hit;
        });
        
        // Enemy projectiles vs player
        this.projectiles = this.projectiles.filter(proj => {
            if (proj.fromPlayer) return true;
            
            if (this.collisionSystem.checkCollision(proj, this.player)) {
                if (!this.player.isInvulnerable()) {
                    this.player.takeDamage(proj.damage);
                    this.uiManager.updateHealth(this.player.health, this.player.maxHealth);
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
        if (this.boss && this.boss.health <= 0) {
            this.gameWin();
        }
        
        // Activate boss when player is near
        if (this.boss && !this.boss.active && this.player.x > this.boss.triggerX) {
            this.boss.activate();
            this.uiManager.showBossHealth();
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
    }
    
    gameOver() {
        this.gameRunning = false;
        this.uiManager.showGameOver(this.score, false);
    }
    
    gameWin() {
        this.gameRunning = false;
        this.score += 1000; // Boss bonus
        this.uiManager.showGameOver(this.score, true);
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
        // Maintain aspect ratio
        const aspectRatio = this.config.game.width / this.config.game.height;
        const maxWidth = window.innerWidth;
        const maxHeight = window.innerHeight;
        
        let newWidth = maxWidth;
        let newHeight = maxWidth / aspectRatio;
        
        if (newHeight > maxHeight) {
            newHeight = maxHeight;
            newWidth = maxHeight * aspectRatio;
        }
        
        this.canvas.style.width = newWidth + 'px';
        this.canvas.style.height = newHeight + 'px';
    }
}