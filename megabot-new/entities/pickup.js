// pickup.js - Pickup entity class

class Pickup {
    constructor(data) {
        this.x = data.x;
        this.y = data.y;
        this.type = data.type;
        this.width = data.width || 20;
        this.height = data.height || 20;
        this.baseY = data.y; // Store original Y position
        this.floatOffset = Math.random() * Math.PI * 2; // Random starting phase
        this.floatSpeed = 0.05;
        this.floatAmount = 5;
        this.active = true;
        
        // Adjust size based on pickup type
        if (['spread', 'laser', 'wave', 'bounce', 'rapid'].includes(this.type)) {
            this.width = 25;
            this.height = 25;
        }
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        // Floating animation
        this.floatOffset += this.floatSpeed * deltaTime * 60;
        this.y = this.baseY + Math.sin(this.floatOffset) * this.floatAmount;
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