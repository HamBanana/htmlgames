// ui-manager.js - User Interface Manager

class UIManager {
    constructor(config) {
        this.config = config;
        this.elements = this.cacheElements();
    }
    
    cacheElements() {
        return {
            // Main screens
            startScreen: document.getElementById('startScreen'),
            gameOverScreen: document.getElementById('gameOverScreen'),
            
            // UI elements
            score: document.getElementById('score'),
            lives: document.getElementById('lives'),
            playerHealth: document.getElementById('playerHealth'),
            bossHealth: document.getElementById('bossHealth'),
            bossUI: document.getElementById('bossUI'),
            
            // Map selection
            currentMapName: document.getElementById('currentMapName'),
            mapInstruction: document.getElementById('mapInstruction'),
            mapButtons: document.getElementById('mapButtons'),
            
            // Weapon and charge
            weaponIndicator: document.getElementById('weaponIndicator'),
            currentWeapon: document.getElementById('currentWeapon'),
            chargeIndicator: document.getElementById('chargeIndicator'),
            chargeLevel: document.getElementById('chargeLevel'),
            
            // Debug
            debugMenu: document.getElementById('debugMenu'),
            debugStats: document.getElementById('debugStats'),
            fps: document.getElementById('fps'),
            entityCount: document.getElementById('entityCount'),
            particleCount: document.getElementById('particleCount'),
            playerX: document.getElementById('playerX'),
            playerY: document.getElementById('playerY'),
            
            // Game over
            gameOverText: document.getElementById('gameOverText'),
            finalScore: document.getElementById('finalScore'),
            
            // Loading
            loadingMessage: document.getElementById('loadingMessage')
        };
    }
    
    initialize() {
        this.applyColorScheme();
        this.setupDebugMenu();
    }
    
    applyColorScheme() {
        const root = document.documentElement;
        const colors = this.config.colors;
        
        // Set CSS variables for dynamic theming
        root.style.setProperty('--color-primary', colors.primary);
        root.style.setProperty('--color-danger', colors.danger);
        root.style.setProperty('--color-warning', colors.warning);
        root.style.setProperty('--color-boss', colors.boss);
        root.style.setProperty('--color-charge', colors.charge);
        root.style.setProperty('--color-background', colors.background);
    }
    
    updateScore(score) {
        if (this.elements.score) {
            this.elements.score.textContent = score;
        }
    }
    
    updateLives(lives) {
        if (this.elements.lives) {
            this.elements.lives.textContent = lives;
        }
    }
    
    updateHealth(current, max) {
        if (this.elements.playerHealth) {
            const percentage = (current / max) * 100;
            this.elements.playerHealth.style.width = percentage + '%';
            
            // Change color based on health level
            if (percentage < 25) {
                this.elements.playerHealth.style.background = this.config.colors.danger;
            } else if (percentage < 50) {
                this.elements.playerHealth.style.background = this.config.colors.warning;
            } else {
                this.elements.playerHealth.style.background = this.config.colors.primary;
            }
        }
    }
    
    updateBossHealth(current, max) {
        if (this.elements.bossHealth) {
            const percentage = (current / max) * 100;
            this.elements.bossHealth.style.width = percentage + '%';
        }
    }
    
    showBossHealth() {
        if (this.elements.bossUI) {
            this.elements.bossUI.style.display = 'block';
        }
    }
    
    hideBossHealth() {
        if (this.elements.bossUI) {
            this.elements.bossUI.style.display = 'none';
        }
    }
    
    updateChargeIndicator(current, max) {
        if (current > 0 && this.elements.chargeIndicator) {
            this.elements.chargeIndicator.style.display = 'block';
            const percentage = Math.floor((current / max) * 100);
            this.elements.chargeLevel.textContent = percentage + '%';
            
            // Change color based on charge level
            if (percentage >= 100) {
                this.elements.chargeLevel.style.color = this.config.colors.chargeMax || '#ffff00';
            } else if (percentage >= 20) {
                this.elements.chargeLevel.style.color = this.config.colors.charge;
            } else {
                this.elements.chargeLevel.style.color = this.config.colors.primary;
            }
        } else if (this.elements.chargeIndicator) {
            this.elements.chargeIndicator.style.display = 'none';
        }
    }
    
    updateWeaponIndicator(weaponType) {
        const weaponNames = {
            'normal': 'NORMAL',
            'rapid': 'RAPID FIRE',
            'spread': 'SPREAD SHOT',
            'laser': 'LASER',
            'wave': 'WAVE BEAM',
            'bounce': 'BOUNCE SHOT'
        };
        
        if (this.elements.currentWeapon) {
            this.elements.currentWeapon.textContent = weaponNames[weaponType] || 'NORMAL';
        }
        
        if (this.elements.weaponIndicator) {
            this.elements.weaponIndicator.style.display = weaponType !== 'normal' ? 'block' : 'none';
        }
    }
    
    updateMapSelection(mapFile) {
        // This is handled by GameManager for now
    }
    
    updateFPS(fps) {
        if (this.elements.fps) {
            this.elements.fps.textContent = fps;
        }
    }
    
    updateDebugStats(stats) {
        if (this.elements.entityCount) {
            this.elements.entityCount.textContent = stats.entities || 0;
        }
        if (this.elements.particleCount) {
            this.elements.particleCount.textContent = stats.particles || 0;
        }
        if (this.elements.playerX) {
            this.elements.playerX.textContent = Math.floor(stats.playerX || 0);
        }
        if (this.elements.playerY) {
            this.elements.playerY.textContent = Math.floor(stats.playerY || 0);
        }
    }
    
    showStartScreen() {
        if (this.elements.startScreen) {
            this.elements.startScreen.style.display = 'flex';
        }
        if (this.elements.gameOverScreen) {
            this.elements.gameOverScreen.style.display = 'none';
        }
        this.hideBossHealth();
    }
    
    hideStartScreen() {
        if (this.elements.startScreen) {
            this.elements.startScreen.style.display = 'none';
        }
    }
    
    showGameOver(score, won) {
        if (this.elements.gameOverScreen) {
            this.elements.gameOverScreen.style.display = 'flex';
            
            if (this.elements.gameOverText) {
                this.elements.gameOverText.textContent = won ? 'YOU WIN!' : 'GAME OVER';
                this.elements.gameOverText.style.color = won ? this.config.colors.primary : this.config.colors.danger;
            }
            
            if (this.elements.finalScore) {
                this.elements.finalScore.textContent = score;
            }
        }
        
        this.hideBossHealth();
    }
    
    hideGameOver() {
        if (this.elements.gameOverScreen) {
            this.elements.gameOverScreen.style.display = 'none';
        }
    }
    
    showLoading(message = 'LOADING...') {
        if (this.elements.loadingMessage) {
            this.elements.loadingMessage.textContent = message;
            this.elements.loadingMessage.style.display = 'block';
        }
    }
    
    hideLoading() {
        if (this.elements.loadingMessage) {
            this.elements.loadingMessage.style.display = 'none';
        }
    }
    
    showDebugMenu() {
        if (this.elements.debugMenu) {
            this.elements.debugMenu.style.display = 'block';
        }
    }
    
    hideDebugMenu() {
        if (this.elements.debugMenu) {
            this.elements.debugMenu.style.display = 'none';
        }
    }
    
    toggleDebugStats(show) {
        if (this.elements.debugStats) {
            this.elements.debugStats.style.display = show ? 'block' : 'none';
        }
    }
    
    setupDebugMenu() {
        // This will be populated by the debug system
        if (this.elements.debugMenu) {
            this.elements.debugMenu.innerHTML = `
                <h2>DEBUG MENU</h2>
                <div class="debug-section">
                    <h3>Debug features will be loaded from config</h3>
                    <p>Press ESC to close</p>
                </div>
            `;
        }
    }
    
    createNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 20px;
            background: rgba(0, 0, 0, 0.9);
            border: 2px solid ${this.config.colors[type] || this.config.colors.primary};
            color: ${this.config.colors[type] || this.config.colors.primary};
            font-size: 18px;
            z-index: 1000;
            animation: fadeOut 2s forwards;
        `;
        
        document.getElementById('gameContainer').appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 2000);
    }
}