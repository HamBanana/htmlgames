// ===== enemy-system.js =====
class EnemySystem {
    constructor(config) {
        this.config = config;
    }
    
    createEnemy(data) {
        const type = data.type || 'walker';
        const config = this.config[type];
        
        return {
            x: data.x,
            y: data.y,
            width: config.width,
            height: config.height,
            vx: type === 'walker' ? config.speed : 0,
            vy: 0,
            type: type,
            health: config.health,
            damage: config.damage,
            shootTimer: 0,
            moveTimer: 0,
            facing: -1,
            scoreValue: config.scoreValue,
            detectionRange: config.detectionRange
        };
    }
    
    updateEnemies(enemies, player, deltaTime, projectiles) {
        return enemies.filter(enemy => {
            // Update enemy logic here
            if (enemy.health <= 0) return false;
            
            // Basic movement for walker
            if (enemy.type === 'walker') {
                enemy.x += enemy.vx * deltaTime * 60;
                enemy.moveTimer++;
                if (enemy.moveTimer > 100) {
                    enemy.vx *= -1;
                    enemy.facing *= -1;
                    enemy.moveTimer = 0;
                }
            }
            
            return true;
        });
    }
}