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