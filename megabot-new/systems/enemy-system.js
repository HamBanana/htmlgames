// enemy-system.js - Enemy creation and management
class EnemySystem {
    constructor(config) {
        this.config = config;
    }
    
    createEnemy(data) {
        const type = data.type || 'walker';
        const config = this.config[type] || this.config.walker;
        
        if (!config) {
            console.error('No config found for enemy type:', type);
            return null;
        }
        
        const enemy = {
            x: data.x,
            y: data.y,
            width: config.width,
            height: config.height,
            vx: 0,
            vy: 0,
            type: type,
            health: config.health,
            maxHealth: config.health,
            damage: config.damage,
            speed: config.speed,
            shootTimer: 0,
            moveTimer: 0,
            facing: -1,
            scoreValue: config.scoreValue,
            detectionRange: config.detectionRange,
            grounded: false,
            active: true
        };
        
        // Set initial velocity for walkers
        if (type === 'walker') {
            enemy.vx = config.speed * enemy.facing;
        }
        
        return enemy;
    }
    
    updateEnemies(enemies, player, deltaTime, projectiles) {
        return enemies.filter(enemy => {
            if (!enemy || enemy.health <= 0) return false;
            
            // Update based on enemy type
            switch (enemy.type) {
                case 'walker':
                    this.updateWalker(enemy, player, deltaTime);
                    break;
                case 'flyer':
                    this.updateFlyer(enemy, player, deltaTime);
                    break;
                case 'turret':
                    this.updateTurret(enemy, player, deltaTime, projectiles);
                    break;
            }
            
            return true;
        });
    }
    
    updateWalker(enemy, player, deltaTime) {
        // Apply gravity
        if (!enemy.grounded) {
            enemy.vy += 0.5;
        }
        
        // Update position
        enemy.x += enemy.vx * deltaTime * 60;
        enemy.y += enemy.vy * deltaTime * 60;
        
        // Simple patrol behavior
        enemy.moveTimer++;
        if (enemy.moveTimer > 120) {
            enemy.vx = -enemy.vx;
            enemy.facing = -enemy.facing;
            enemy.moveTimer = 0;
        }
        
        // Prevent going off edges
        if (enemy.x < 0 || enemy.x > 3200 - enemy.width) {
            enemy.vx = -enemy.vx;
            enemy.facing = -enemy.facing;
            enemy.x = Math.max(0, Math.min(3200 - enemy.width, enemy.x));
        }
    }
    
    updateFlyer(enemy, player, deltaTime) {
        // Hovering motion
        enemy.moveTimer++;
        const baseY = enemy.y;
        enemy.y = baseY + Math.sin(enemy.moveTimer * 0.05) * 20;
        
        // Move towards player horizontally if in range
        const dx = player.x - enemy.x;
        if (Math.abs(dx) < enemy.detectionRange) {
            enemy.x += Math.sign(dx) * enemy.speed * deltaTime * 60;
            enemy.facing = Math.sign(dx);
        }
    }
    
    updateTurret(enemy, player, deltaTime, projectiles) {
        // Turrets don't move, just track player
        const dx = player.x - enemy.x;
        if (Math.abs(dx) < enemy.detectionRange) {
            enemy.facing = Math.sign(dx);
            
            // Shoot at player
            enemy.shootTimer++;
            if (enemy.shootTimer > (enemy.shootCooldown || 60)) {
                // Create projectile (would need weapon system reference)
                enemy.shootTimer = 0;
            }
        }
    }
}