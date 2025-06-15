// pong-components.js - Pong-specific components

/**
 * Input Component - Handles entity input
 */
class InputComponent extends Component {
    constructor(config = {}) {
        super(config);
        this.inputType = config.inputType || 'keyboard'; // 'keyboard', 'ai', 'mouse'
        this.keyMap = config.keyMap || {};
    }
    
    isActionPressed(action) {
        const input = this.game?.getSystem('input');
        if (!input) return false;
        
        const keys = this.keyMap[action];
        if (!keys) return input.isActionPressed(action);
        
        if (Array.isArray(keys)) {
            return keys.some(key => input.isKeyPressed(key));
        }
        return input.isKeyPressed(keys);
    }
    
    isActionJustPressed(action) {
        const input = this.game?.getSystem('input');
        if (!input) return false;
        
        const keys = this.keyMap[action];
        if (!keys) return input.isActionJustPressed(action);
        
        if (Array.isArray(keys)) {
            return keys.some(key => input.isKeyJustPressed(key));
        }
        return input.isKeyJustPressed(keys);
    }
    
    getMovementVector() {
        const input = this.game?.getSystem('input');
        if (!input) return { x: 0, y: 0 };
        
        return input.getMovementVector();
    }
}

/**
 * Collider Component - Simple physics collider
 */
class ColliderComponent extends CollisionComponent {
    constructor(config = {}) {
        super(config);
        this.static = config.static || false;
        this.bounciness = config.bounciness || 0;
        this.onCollision = config.onCollision;
    }
}

/**
 * Health Component
 */
class HealthComponent extends Component {
    constructor(config = {}) {
        super(config);
        this.maxHealth = config.maxHealth || 100;
        this.health = config.health || this.maxHealth;
        this.invulnerable = false;
        this.invulnerableTime = config.invulnerableTime || 1;
        this.onDamage = config.onDamage;
        this.onDeath = config.onDeath;
    }
    
    takeDamage(amount) {
        if (this.invulnerable || this.health <= 0) return;
        
        this.health = Math.max(0, this.health - amount);
        
        if (this.onDamage) {
            this.onDamage(amount);
        }
        
        if (this.health <= 0) {
            this.die();
        }
    }
    
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }
    
    die() {
        if (this.onDeath) {
            this.onDeath();
        }
        
        this.game?.events.emit('entity:died', this.entity);
    }
}

// Make components globally available
window.InputComponent = InputComponent;
window.ColliderComponent = ColliderComponent;
window.HealthComponent = HealthComponent;