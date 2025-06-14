// debug-menu.js - Debug menu functionality

class DebugMenu {
    constructor(gameManager, config) {
        this.gameManager = gameManager;
        this.config = config || {};
        this.isVisible = false;
        this.holdTimer = 0;
        this.holdDuration = this.config.holdDuration || 60;
        this.menuKey = this.config.menuKey || '+';
        
        this.setupEventListeners();
        this.createMenu();
    }
    
    setupEventListeners() {
        window.addEventListener('keydown', (e) => {
            if (e.key === this.menuKey || e.key === '=') {
                this.holdTimer = 1;
            }
        });
        
        window.addEventListener('keyup', (e) => {
            if (e.key === this.menuKey || e.key === '=') {
                this.holdTimer = 0;
            }
            
            // ESC to close
            if (e.key === 'Escape' && this.isVisible) {
                this.hide();
            }
        });
    }
    
    update(deltaTime) {
        if (this.holdTimer > 0) {
            this.holdTimer += deltaTime * 60;
            
            if (this.holdTimer >= this.holdDuration && !this.isVisible) {
                this.show();
            }
        }
    }
    
    createMenu() {
        const menu = document.getElementById('debugMenu');
        if (!menu) return;
        
        menu.innerHTML = `
            <h2>DEBUG MENU</h2>
            
            <div class="debug-section">
                <h3>Display Options</h3>
                <label class="debug-checkbox">
                    <input type="checkbox" id="debugShowHitboxes" ${this.config.showHitboxes ? 'checked' : ''}>
                    <span class="debug-label">Show Hitboxes</span>
                </label>
                <label class="debug-checkbox">
                    <input type="checkbox" id="debugShowFPS" ${this.config.showFPS ? 'checked' : ''}>
                    <span class="debug-label">Show FPS</span>
                </label>
                <label class="debug-checkbox">
                    <input type="checkbox" id="debugShowStats" ${this.config.showStats ? 'checked' : ''}>
                    <span class="debug-label">Show Debug Stats</span>
                </label>
            </div>
            
            <div class="debug-section">
                <h3>Player Cheats</h3>
                <label class="debug-checkbox">
                    <input type="checkbox" id="debugGodMode" ${this.config.godMode ? 'checked' : ''}>
                    <span class="debug-label">God Mode</span>
                </label>
                <label class="debug-checkbox">
                    <input type="checkbox" id="debugInfiniteJumps" ${this.config.infiniteJumps ? 'checked' : ''}>
                    <span class="debug-label">Infinite Jumps</span>
                </label>
                <label class="debug-checkbox">
                    <input type="checkbox" id="debugInstantCharge" ${this.config.instantCharge ? 'checked' : ''}>
                    <span class="debug-label">Instant Charge</span>
                </label>
                <label class="debug-checkbox">
                    <input type="checkbox" id="debugNoclip" ${this.config.noclip ? 'checked' : ''}>
                    <span class="debug-label">Noclip</span>
                </label>
            </div>
            
            <div class="debug-section">
                <h3>Game Options</h3>
                <div>
                    <span class="debug-label">Time Scale:</span>
                    <input type="range" id="debugTimeScale" min="0" max="3" step="0.1" value="1" class="debug-input">
                    <span id="timeScaleValue">1.0</span>
                </div>
                <div>
                    <span class="debug-label">Player Health:</span>
                    <input type="number" id="debugPlayerHealth" min="0" max="999" value="100" class="debug-input">
                </div>
                <div>
                    <span class="debug-label">Lives:</span>
                    <input type="number" id="debugLives" min="0" max="99" value="3" class="debug-input">
                </div>
                <div>
                    <span class="debug-label">Score:</span>
                    <input type="number" id="debugScore" min="0" max="999999" value="0" class="debug-input">
                </div>
            </div>
            
            <div class="debug-section">
                <h3>Spawn Options</h3>
                <button class="debug-btn" onclick="if(window.debugMenu) window.debugMenu.spawnEnemy('walker')">Spawn Walker</button>
                <button class="debug-btn" onclick="if(window.debugMenu) window.debugMenu.spawnEnemy('flyer')">Spawn Flyer</button>
                <button class="debug-btn" onclick="if(window.debugMenu) window.debugMenu.spawnEnemy('turret')">Spawn Turret</button>
                <button class="debug-btn" onclick="if(window.debugMenu) window.debugMenu.spawnPickup('health')">Spawn Health</button>
                <button class="debug-btn" onclick="if(window.debugMenu) window.debugMenu.spawnPickup('spread')">Spawn Spread</button>
                <button class="debug-btn" onclick="if(window.debugMenu) window.debugMenu.spawnPickup('laser')">Spawn Laser</button>
                <button class="debug-btn" onclick="if(window.debugMenu) window.debugMenu.clearEnemies()">Clear Enemies</button>
            </div>
            
            <div class="debug-section">
                <h3>Level Options</h3>
                <button class="debug-btn" onclick="if(window.debugMenu) window.debugMenu.skipToBoss()">Skip to Boss</button>
                <button class="debug-btn" onclick="if(window.debugMenu) window.debugMenu.winLevel()">Win Level</button>
                <button class="debug-btn" onclick="if(window.debugMenu) window.debugMenu.restartLevel()">Restart Level</button>
            </div>
            
            <div class="debug-section">
                <button class="debug-btn" onclick="if(window.debugMenu) window.debugMenu.hide()">Close (ESC)</button>
            </div>
        `;
        
        // Set up event handlers
        this.setupMenuHandlers();
    }
    
    setupMenuHandlers() {
        // Display options
        const showHitboxes = document.getElementById('debugShowHitboxes');
        if (showHitboxes) {
            showHitboxes.addEventListener('change', (e) => {
                this.config.showHitboxes = e.target.checked;
                if (window.ConfigLoader && window.ConfigLoader.setConfigValue) {
                    window.ConfigLoader.setConfigValue('debug.showHitboxes', e.target.checked);
                }
            });
        }
        
        const showFPS = document.getElementById('debugShowFPS');
        if (showFPS) {
            showFPS.addEventListener('change', (e) => {
                this.config.showFPS = e.target.checked;
                if (window.ConfigLoader && window.ConfigLoader.setConfigValue) {
                    window.ConfigLoader.setConfigValue('debug.showFPS', e.target.checked);
                }
                const debugStats = document.getElementById('debugStats');
                if (debugStats) {
                    debugStats.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
        
        const showStats = document.getElementById('debugShowStats');
        if (showStats) {
            showStats.addEventListener('change', (e) => {
                this.config.showStats = e.target.checked;
                const debugStats = document.getElementById('debugStats');
                if (debugStats) {
                    debugStats.style.display = e.target.checked ? 'block' : 'none';
                }
            });
        }
        
        // Player cheats
        const godMode = document.getElementById('debugGodMode');
        if (godMode) {
            godMode.addEventListener('change', (e) => {
                this.config.godMode = e.target.checked;
                if (this.gameManager && this.gameManager.player) {
                    this.gameManager.player.godMode = e.target.checked;
                }
            });
        }
        
        const infiniteJumps = document.getElementById('debugInfiniteJumps');
        if (infiniteJumps) {
            infiniteJumps.addEventListener('change', (e) => {
                this.config.infiniteJumps = e.target.checked;
            });
        }
        
        const instantCharge = document.getElementById('debugInstantCharge');
        if (instantCharge) {
            instantCharge.addEventListener('change', (e) => {
                this.config.instantCharge = e.target.checked;
            });
        }
        
        const noclip = document.getElementById('debugNoclip');
        if (noclip) {
            noclip.addEventListener('change', (e) => {
                this.config.noclip = e.target.checked;
            });
        }
        
        // Game options
        const timeScale = document.getElementById('debugTimeScale');
        const timeScaleValue = document.getElementById('timeScaleValue');
        if (timeScale && timeScaleValue) {
            timeScale.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                timeScaleValue.textContent = value.toFixed(1);
                if (this.gameManager && this.gameManager.timeManager) {
                    this.gameManager.timeManager.setTimeScale(value);
                }
            });
        }
        
        const playerHealth = document.getElementById('debugPlayerHealth');
        if (playerHealth) {
            playerHealth.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                if (this.gameManager && this.gameManager.player) {
                    this.gameManager.player.health = value;
                    if (this.gameManager.uiManager) {
                        this.gameManager.uiManager.updateHealth(value, this.gameManager.player.maxHealth);
                    }
                }
            });
        }
        
        const lives = document.getElementById('debugLives');
        if (lives) {
            lives.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                if (this.gameManager) {
                    this.gameManager.lives = value;
                    if (this.gameManager.uiManager) {
                        this.gameManager.uiManager.updateLives(value);
                    }
                }
            });
        }
        
        const score = document.getElementById('debugScore');
        if (score) {
            score.addEventListener('change', (e) => {
                const value = parseInt(e.target.value);
                if (this.gameManager) {
                    this.gameManager.score = value;
                    if (this.gameManager.uiManager) {
                        this.gameManager.uiManager.updateScore(value);
                    }
                }
            });
        }
    }
    
    show() {
        const menu = document.getElementById('debugMenu');
        if (menu) {
            menu.style.display = 'block';
            this.isVisible = true;
            if (this.gameManager && this.gameManager.timeManager) {
                this.gameManager.timeManager.pause();
            }
        }
    }
    
    hide() {
        const menu = document.getElementById('debugMenu');
        if (menu) {
            menu.style.display = 'none';
            this.isVisible = false;
            if (this.gameManager && this.gameManager.timeManager) {
                this.gameManager.timeManager.resume();
            }
        }
    }
    
    // Spawn functions
    spawnEnemy(type) {
        if (!this.gameManager || !this.gameManager.player || !this.gameManager.enemySystem) return;
        
        const enemy = this.gameManager.enemySystem.createEnemy({
            x: this.gameManager.player.x + 200,
            y: this.gameManager.player.y,
            type: type
        });
        
        if (enemy) {
            this.gameManager.enemies.push(enemy);
        }
    }
    
    spawnPickup(type) {
        if (!this.gameManager || !this.gameManager.player) return;
        
        const pickup = new Pickup({
            x: this.gameManager.player.x + 100,
            y: this.gameManager.player.y,
            type: type,
            width: 20,
            height: 20
        });
        
        this.gameManager.pickups.push(pickup);
    }
    
    clearEnemies() {
        if (this.gameManager) {
            this.gameManager.enemies = [];
        }
    }
    
    skipToBoss() {
        if (this.gameManager && this.gameManager.player && this.gameManager.boss) {
            this.gameManager.player.x = this.gameManager.boss.triggerX - 100;
            if (this.gameManager.cameraSystem) {
                this.gameManager.cameraSystem.setPosition(this.gameManager.player.x - 400, 0);
            }
        }
    }
    
    winLevel() {
        if (this.gameManager && this.gameManager.boss) {
            this.gameManager.boss.health = 0;
        }
    }
    
    restartLevel() {
        this.hide();
        if (this.gameManager) {
            this.gameManager.resetGameState();
            this.gameManager.startGame();
        }
    }
}

// Safe initialization function
function initializeDebugMenu() {
    if (window.gameManager && !window.debugMenu) {
        const debugConfig = window.gameManager.config?.debug || {};
        window.debugMenu = new DebugMenu(window.gameManager, debugConfig);
    }
}

// Make it globally accessible
window.DebugMenu = DebugMenu;
window.initializeDebugMenu = initializeDebugMenu;