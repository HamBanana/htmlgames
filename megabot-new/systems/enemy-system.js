// enemy-system.js - Enemy creation and behavior management

class EnemySystem {
    constructor(config) {
        this.config = config;
        this.enemies = [];
    }
    
    createEnemy(data) {
        const type = data.type || 'walker';
        const config = this.config[type];
        
        if (!config) {
            console.warn(`Unknown enemy type: ${type}`);
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
            scoreValue: config.scoreValue,
            detectionRange: config.detectionRange,
            
            // AI state
            shootTimer: 0,
            moveTimer: 0,
            direction: -1,
            facing: -1,
            targetX: 0,
            targetY: 0,
            shouldShoot: false,
            
            // Type-specific properties
            ...(type === 'flyer' && {
                floatOffset: Math.random() * Math.PI * 2,
                baseY: data.y,
                floatSpeed: 0.02,
                floatAmplitude: config.floatAmplitude || 30
            }),
            
            ...(type === 'turret' && {
                shootCooldown: config.shootCooldown || 60,
                projectileSpeed: config.projectileSpeed || 5
            })
        };
        
        return enemy;
    }
    
    updateEnemies(enemies, player, deltaTime, projectiles, platforms, physics) {
        return enemies.filter(enemy => {
            if (enemy.health <= 0) return false;
            
            // Update enemy AI based on type
            this.updateEnemyAI(enemy, player, deltaTime);
            
            // Update physics
            this.updateEnemyPhysics(enemy, platforms, physics, deltaTime);
            
            return true;
        });
    }
    
    updateEnemyAI(enemy, player, deltaTime) {
        const frameTime = deltaTime * 60;
        
        switch (enemy.type) {
            case 'walker':
                this.updateWalkerAI(enemy, player, frameTime);
                break;
            case 'flyer':
                this.updateFlyerAI(enemy, player, frameTime);
                break;
            case 'turret':
                this.updateTurretAI(enemy, player, frameTime);
                break;
        }
    }
    
    updateWalkerAI(enemy, player, frameTime) {
        const config = this.config.walker;
        
        // Basic patrol movement
        enemy.moveTimer += frameTime;
        
        if (enemy.moveTimer > 120) { // Change direction every 2 seconds
            enemy.direction *= -1;
            enemy.facing = enemy.direction;
            enemy.moveTimer = 0;
        }
        
        enemy.vx = enemy.direction * enemy.speed;
        
        // Detect player
        const distance = Math.abs(player.x - enemy.x);
        if (distance < enemy.detectionRange) {
            // Face player
            enemy.facing = player.x > enemy.x ? 1 : -1;
            
            // Move towards player
            if (distance > 100) {
                enemy.vx = enemy.facing * enemy.speed * 1.5;
            }
            
            // Shoot at player
            enemy.shootTimer += frameTime;
            if (enemy.shootTimer > config.shootCooldown) {
                enemy.shouldShoot = true;
                enemy.targetX = player.x + player.width / 2;
                enemy.targetY = player.y + player.height / 2;
                enemy.shootTimer = 0;
            }
        }
    }
    
    updateFlyerAI(enemy, player, frameTime) {
        const config = this.config.flyer;
        
        // Floating motion
        enemy.floatOffset += enemy.floatSpeed * frameTime;
        enemy.y = enemy.baseY + Math.sin(enemy.floatOffset) * enemy.floatAmplitude;
        
        // Move towards player horizontally
        const distance = Math.abs(player.x - enemy.x);
        if (distance < enemy.detectionRange) {
            enemy.facing = player.x > enemy.x ? 1 : -1;
            enemy.vx = enemy.facing * enemy.speed;
            
            // Shoot at player
            enemy.shootTimer += frameTime;
            if (enemy.shootTimer > config.shootCooldown) {
                enemy.shouldShoot = true;
                enemy.targetX = player.x + player.width / 2;
                enemy.targetY = player.y + player.height / 2;
                enemy.shootTimer = 0;
            }
        } else {
            enemy.vx *= 0.9; // Slow down when not chasing
        }
    }
    
    updateTurretAI(enemy, player, frameTime) {
        const config = this.config.turret;
        
        // Turrets don't move
        enemy.vx = 0;
        
        // Always face player
        enemy.facing = player.x > enemy.x ? 1 : -1;
        
        // Shoot at player if in range
        const distance = Math.sqrt(
            Math.pow(player.x - enemy.x, 2) + 
            Math.pow(player.y - enemy.y, 2)
        );
        
        if (distance < enemy.detectionRange) {
            enemy.shootTimer += frameTime;
            if (enemy.shootTimer > config.shootCooldown) {
                enemy.shouldShoot = true;
                enemy.targetX = player.x + player.width / 2;
                enemy.targetY = player.y + player.height / 2;
                enemy.shootTimer = 0;
            }
        }
    }
    
    updateEnemyPhysics(enemy, platforms, physics, deltaTime) {
        // Apply gravity (except for flyers)
        if (enemy.type !== 'flyer' && enemy.type !== 'turret') {
            physics.applyGravity(enemy, deltaTime);
        }
        
        // Update position
        physics.updatePosition(enemy, deltaTime);
        
        // Check platform collisions
        if (enemy.type === 'walker') {
            physics.checkPlatformCollisions(enemy, platforms);
            
            // Reverse direction if about to fall off platform
            if (enemy.grounded) {
                const futureX = enemy.x + enemy.vx * 2;
                let onPlatform = false;
                
                for (const platform of platforms) {
                    if (futureX + enemy.width > platform.x && 
                        futureX < platform.x + platform.w &&
                        enemy.y + enemy.height <= platform.y + platform.h + 10 &&
                        enemy.y + enemy.height >= platform.y - 10) {
                        onPlatform = true;
                        break;
                    }
                }
                
                if (!onPlatform) {
                    enemy.direction *= -1;
                    enemy.facing = enemy.direction;
                    enemy.vx = enemy.direction * enemy.speed;
                }
            }
        }
    }
    
    takeDamage(enemy, amount) {
        enemy.health -= amount;
        if (enemy.health < 0) enemy.health = 0;
        return enemy.health <= 0;
    }
    
    getEnemiesInRange(enemies, x, y, range) {
        return enemies.filter(enemy => {
            const distance = Math.sqrt(
                Math.pow(enemy.x + enemy.width/2 - x, 2) + 
                Math.pow(enemy.y + enemy.height/2 - y, 2)
            );
            return distance <= range;
        });
    }
}