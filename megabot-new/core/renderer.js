// renderer.js - Rendering system

class Renderer {
    constructor(canvas, ctx, config) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.config = config;
        this.spriteCache = new Map();
        
        // Ensure projectile config exists with defaults
        this.projectileConfig = this.config.sprites?.projectiles || {
            playerBullet: {
                color: "#00ff00",
                glowColor: "#00ff00",
                glowIntensity: 5
            },
            enemyBullet: {
                color: "#ff0000",
                glowColor: "#ff0000",
                glowIntensity: 5
            },
            chargedShot: {
                color: "#ffff00",
                glowColor: "#ffff00",
                glowIntensity: 15
            }
        };
    }
    
    clear() {
        this.ctx.fillStyle = this.config.game.backgroundColor || '#000000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    renderBackground(camera) {
        // Stars parallax background
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 50; i++) {
            const x = (i * 73) % this.canvas.width;
            const y = (i * 37) % this.canvas.height;
            const parallax = 1 - (i % 3) * 0.3;
            this.ctx.fillRect(
                x - camera.x * parallax * 0.1, 
                y, 
                1, 
                1
            );
        }
    }
    
    renderPlatforms(platforms) {
        this.ctx.fillStyle = this.config.ui.colors.primary;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = this.config.ui.colors.primary;
        
        platforms.forEach(platform => {
            this.ctx.fillRect(platform.x, platform.y, platform.w, platform.h);
            
            // Platform detail
            this.ctx.fillStyle = '#008800';
            this.ctx.fillRect(platform.x, platform.y, platform.w, 4);
            this.ctx.fillStyle = this.config.ui.colors.primary;
        });
        
        this.ctx.shadowBlur = 0;
    }
    
    renderPlayer(player) {
        if (player.invulnerable % 4 < 2 || player.godMode) {
            // Shield effect
            if (player.shield > 0) {
                this.renderShield(player);
            }
            
            // Charging effect
            if (player.charging) {
                this.renderChargeEffect(player);
            }
            
            // Player sprite or shape
            if (player.sprite) {
                this.renderSprite(player);
            } else {
                this.renderPlayerShape(player);
            }
        }
    }
    
    renderPlayerShape(player) {
        this.ctx.fillStyle = player.godMode ? '#ffff00' : '#0088ff';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = player.godMode ? '#ffff00' : '#0088ff';
        this.ctx.fillRect(player.x, player.y, player.width, player.height);
        this.ctx.shadowBlur = 0;
        
        // Player details
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(player.x + 8, player.y + 8, 5, 5);
        this.ctx.fillRect(player.x + 17, player.y + 8, 5, 5);
        
        // Arm/gun
        this.ctx.fillStyle = '#0066cc';
        const gunX = player.facing > 0 ? player.x + player.width - 5 : player.x - 5;
        const gunY = player.y + 15;
        this.ctx.fillRect(gunX, gunY, 10, 6);
        
        // Charge indicator on gun
        if (player.charging && player.chargeTimer > 0) {
            const chargeRatio = player.chargeTimer / player.maxCharge;
            if (chargeRatio > 0.2) {
                this.ctx.fillStyle = chargeRatio >= 1 ? '#ffff00' : '#00ffff';
                this.ctx.globalAlpha = 0.7;
                const chargeSize = 3 + chargeRatio * 4;
                this.ctx.fillRect(
                    gunX + (player.facing > 0 ? 10 : -chargeSize), 
                    gunY + 3 - chargeSize/2, 
                    chargeSize, 
                    chargeSize
                );
                this.ctx.globalAlpha = 1;
            }
        }
    }
    
    renderShield(entity) {
        this.ctx.fillStyle = this.config.ui.colors.charge;
        this.ctx.globalAlpha = 0.3 + Math.sin(Date.now() * 0.01) * 0.1;
        this.ctx.beginPath();
        this.ctx.arc(
            entity.x + entity.width/2, 
            entity.y + entity.height/2, 
            25, 
            0, 
            Math.PI * 2
        );
        this.ctx.fill();
        this.ctx.globalAlpha = 1;
    }
    
    renderChargeEffect(player) {
        const chargeLevel = player.chargeTimer / player.maxCharge;
        if (chargeLevel > 0.2) {
            this.ctx.fillStyle = chargeLevel >= 1 ? '#ffff00' : '#00ffff';
            this.ctx.globalAlpha = 0.3 + (Math.sin(Date.now() * 0.02) * 0.2);
            this.ctx.beginPath();
            this.ctx.arc(
                player.x + player.width/2, 
                player.y + player.height/2, 
                20 + chargeLevel * 15, 
                0, 
                Math.PI * 2
            );
            this.ctx.fill();
            this.ctx.globalAlpha = 1;
        }
    }
    
    renderEnemy(enemy) {
        const color = this.config.enemies[enemy.type]?.color || '#ff00ff';
        this.ctx.fillStyle = color;
        this.ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
        
        // Enemy details
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(enemy.x + 5, enemy.y + 5, 4, 4);
        this.ctx.fillRect(enemy.x + enemy.width - 9, enemy.y + 5, 4, 4);
    }
    
    renderBoss(boss) {
        this.ctx.fillStyle = this.config.ui.colors.danger;
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = this.config.ui.colors.danger;
        this.ctx.fillRect(boss.x, boss.y, boss.width, boss.height);
        this.ctx.shadowBlur = 0;
        
        // Boss details
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(boss.x + 10, boss.y + 20, 15, 10);
        this.ctx.fillRect(boss.x + boss.width - 25, boss.y + 20, 15, 10);
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(boss.x + 30, boss.y + 50, 20, 10);
    }
    
    renderProjectile(projectile) {
        // Reset any previous styling
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;
        
        if (projectile.laser) {
            this.ctx.fillStyle = '#ff00ff';
            this.ctx.shadowBlur = 20;
            this.ctx.shadowColor = '#ff00ff';
            this.ctx.globalAlpha = projectile.lifetime / 10;
        } else if (projectile.charged === 'full') {
            const config = this.projectileConfig.chargedShot;
            this.ctx.fillStyle = config.color;
            this.ctx.shadowBlur = config.glowIntensity;
            this.ctx.shadowColor = config.glowColor;
        } else if (projectile.charged === 'medium') {
            this.ctx.fillStyle = '#00ffff';
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#00ffff';
        } else {
            // Default projectile rendering
            const config = projectile.fromPlayer ? 
                this.projectileConfig.playerBullet : 
                this.projectileConfig.enemyBullet;
            
            this.ctx.fillStyle = config.color;
            this.ctx.shadowBlur = config.glowIntensity;
            this.ctx.shadowColor = config.glowColor;
        }
        
        this.ctx.fillRect(projectile.x, projectile.y, projectile.width, projectile.height);
        
        // Reset styling
        this.ctx.globalAlpha = 1;
        this.ctx.shadowBlur = 0;
    }
    
    renderPickup(pickup) {
        const pickupConfig = this.config.pickups[pickup.type];
        
        switch(pickup.type) {
            case 'health':
                this.ctx.fillStyle = pickupConfig?.color || '#00ff00';
                this.ctx.fillRect(pickup.x + 5, pickup.y, 10, 20);
                this.ctx.fillRect(pickup.x, pickup.y + 5, 20, 10);
                break;
                
            case 'shield':
                this.ctx.fillStyle = pickupConfig?.color || '#00ffff';
                this.ctx.beginPath();
                this.ctx.arc(pickup.x + pickup.width/2, pickup.y + pickup.height/2, 10, 0, Math.PI * 2);
                this.ctx.fill();
                break;
                
            case 'speed':
                this.ctx.fillStyle = pickupConfig?.color || '#ff00ff';
                this.ctx.fillRect(pickup.x, pickup.y + 5, 20, 10);
                this.ctx.fillRect(pickup.x + 5, pickup.y, 10, 20);
                break;
                
            default:
                // Weapon pickups
                if (this.config.weapons && this.config.weapons[pickup.type]) {
                    this.renderWeaponPickup(pickup);
                } else {
                    this.ctx.fillStyle = '#ffff00';
                    this.ctx.fillRect(pickup.x, pickup.y, pickup.width, pickup.height);
                }
        }
    }
    
    renderWeaponPickup(pickup) {
        const colors = {
            'spread': '#ff00ff',
            'laser': '#ff0000',
            'wave': '#00ffff',
            'bounce': '#ffff00',
            'rapid': '#ff6600'
        };
        
        const color = colors[pickup.type] || '#ffffff';
        this.ctx.fillStyle = color;
        
        const glowIntensity = this.config.pickups?.weaponPickup?.glowIntensity || 10;
        this.ctx.shadowBlur = glowIntensity;
        this.ctx.shadowColor = color;
        
        this.ctx.save();
        this.ctx.translate(pickup.x + pickup.width/2, pickup.y + pickup.height/2);
        
        switch(pickup.type) {
            case 'spread':
                for (let i = -1; i <= 1; i++) {
                    this.ctx.fillRect(0, i * 6, 12, 2);
                }
                break;
            case 'laser':
                this.ctx.fillRect(-10, -1, 20, 2);
                break;
            case 'wave':
                this.ctx.beginPath();
                this.ctx.moveTo(-10, 0);
                for (let x = -10; x <= 10; x += 2) {
                    this.ctx.lineTo(x, Math.sin(x * 0.5) * 4);
                }
                this.ctx.strokeStyle = this.ctx.fillStyle;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                break;
            case 'bounce':
                this.ctx.beginPath();
                this.ctx.arc(0, 0, 8, 0, Math.PI * 2);
                this.ctx.fill();
                break;
            case 'rapid':
                for (let i = 0; i < 3; i++) {
                    this.ctx.fillRect(i * 4 - 6, -1, 2, 2);
                }
                break;
        }
        
        this.ctx.restore();
        this.ctx.shadowBlur = 0;
    }
    
    renderSprite(entity) {
        // TODO: Implement sprite rendering when sprites are loaded
        // For now, fall back to shape rendering
        this.renderPlayerShape(entity);
    }
    
    renderDebugBox(entity, color = '#ff0000') {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(entity.x, entity.y, entity.width, entity.height);
    }
}