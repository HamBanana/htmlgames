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