// pickup.js - Pickup entity class

class Pickup {
    constructor(data) {
        this.x = data.x;
        this.y = data.y;
        this.type = data.type;
        this.width = data.width || 20;
        this.height = data.height || 20;
        this.floatOffset = 0;
        this.floatSpeed = 0.003;
        this.floatAmount = 0.5;
        this.active = true;
        
        // Adjust size based on pickup type
        if (['spread', 'laser', 'wave', 'bounce'].includes(this.type)) {
            this.width = 25;
            this.height = 25;
        }
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        // Floating animation
        this.floatOffset += this.floatSpeed * deltaTime * 60;
        this.y += Math.sin(this.floatOffset) * this.floatAmount;
    }
    
    collect(player) {
        if (!this.active) return;
        
        player.collectPickup(this);
        this.active = false;
    }
    
    isActive() {
        return this.active;
    }
}