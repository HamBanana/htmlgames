// ===== audio-system.js =====
class AudioSystem {
    constructor(config) {
        this.config = config;
        this.sounds = new Map();
        this.enabled = config.enabled !== false;
    }
    
    async loadSound(name, url) {
        if (!this.enabled) return;
        // TODO: Implement audio loading
    }
    
    playSound(name, volume = 1) {
        if (!this.enabled) return;
        // TODO: Implement sound playback
    }
    
    stopSound(name) {
        if (!this.enabled) return;
        // TODO: Implement sound stopping
    }
}

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

// ===== state-manager.js =====
class StateManager {
    constructor() {
        this.states = new Map();
        this.currentState = null;
    }
    
    addState(name, state) {
        this.states.set(name, state);
    }
    
    changeState(name) {
        if (this.currentState && this.currentState.exit) {
            this.currentState.exit();
        }
        
        this.currentState = this.states.get(name);
        
        if (this.currentState && this.currentState.enter) {
            this.currentState.enter();
        }
    }
    
    update(deltaTime) {
        if (this.currentState && this.currentState.update) {
            this.currentState.update(deltaTime);
        }
    }
}

// ===== save-manager.js =====
class SaveManager {
    constructor() {
        this.storageKey = 'megabot_save';
    }
    
    save(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Failed to save game:', e);
            return false;
        }
    }
    
    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Failed to load game:', e);
            return null;
        }
    }
    
    deleteSave() {
        localStorage.removeItem(this.storageKey);
    }
}

// ===== enemy.js (Entity) =====
class Enemy {
    constructor(data, config) {
        Object.assign(this, data);
        this.config = config;
    }
    
    update(deltaTime, player) {
        // Enemy update logic
    }
    
    takeDamage(amount) {
        this.health -= amount;
    }
}

// ===== boss.js (Entity) =====
class Boss {
    constructor(data, config) {
        this.x = data.x || 2900;
        this.y = data.y || 300;
        this.width = config.width;
        this.height = config.height;
        this.health = config.health;
        this.maxHealth = config.maxHealth;
        this.active = false;
        this.phase = 1;
        this.attackTimer = 0;
        this.pattern = 0;
        this.triggerX = data.triggerX || 2800;
    }
    
    activate() {
        this.active = true;
    }
    
    update(deltaTime, player, projectiles) {
        if (!this.active) return;
        // Boss AI logic
    }
    
    takeDamage(amount) {
        this.health -= amount;
    }
}

// ===== projectile.js (Entity) =====
class Projectile {
    constructor(data) {
        Object.assign(this, data);
    }
    
    update(deltaTime) {
        // Projectile update logic
    }
}

// ===== pickup.js (Entity) =====
class Pickup {
    constructor(data) {
        this.x = data.x;
        this.y = data.y;
        this.type = data.type;
        this.width = data.width || 20;
        this.height = data.height || 20;
        this.floatOffset = 0;
    }
    
    update(deltaTime) {
        // Floating animation
        this.floatOffset += deltaTime * 3;
        this.y += Math.sin(this.floatOffset) * 0.5;
    }
    
    collect(player) {
        player.collectPickup(this);
    }
}

// ===== helpers.js (Utils) =====
window.GameHelpers = {
    clamp: function(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    lerp: function(start, end, t) {
        return start + (end - start) * t;
    },
    
    randomRange: function(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    randomInt: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};

// ===== math.js (Utils) =====
window.GameMath = {
    distance: function(a, b) {
        const dx = (a.x + a.width/2) - (b.x + b.width/2);
        const dy = (a.y + a.height/2) - (b.y + b.height/2);
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    angle: function(from, to) {
        const dx = (to.x + to.width/2) - (from.x + from.width/2);
        const dy = (to.y + to.height/2) - (from.y + from.height/2);
        return Math.atan2(dy, dx);
    },
    
    normalize: function(vector) {
        const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        if (length === 0) return { x: 0, y: 0 };
        return {
            x: vector.x / length,
            y: vector.y / length
        };
    }
};

// ===== debug.js (Utils) =====
window.DebugSystem = {
    enabled: false,
    
    log: function(...args) {
        if (this.enabled) {
            console.log('[DEBUG]', ...args);
        }
    },
    
    drawHitbox: function(ctx, entity, color = '#ff0000') {
        if (!this.enabled) return;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(entity.x, entity.y, entity.width, entity.height);
    }
};

// ===== performance.js (Utils) =====
window.PerformanceMonitor = {
    metrics: {},
    
    startMeasure: function(name) {
        this.metrics[name] = performance.now();
    },
    
    endMeasure: function(name) {
        if (this.metrics[name]) {
            const duration = performance.now() - this.metrics[name];
            console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
            delete this.metrics[name];
        }
    }
};