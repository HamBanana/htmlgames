// camera-system.js - Camera control and viewport management

class CameraSystem {
    constructor(canvas, config) {
        this.canvas = canvas;
        this.config = config;
        
        this.x = 0;
        this.y = 0;
        this.width = canvas.width;
        this.height = canvas.height;
        
        this.target = null;
        this.smoothing = 0.1;
        this.offsetX = 0;
        this.offsetY = 0;
        
        this.bounds = {
            minX: 0,
            minY: 0,
            maxX: config.levelWidth || 3200,
            maxY: config.levelHeight || 600
        };
        
        this.shake = {
            active: false,
            intensity: 0,
            duration: 0,
            timer: 0
        };
    }
    
    followTarget(target) {
        if (!target) return;
        
        this.target = target;
        
        // Calculate desired camera position (centered on target)
        const targetX = target.x + target.width / 2 - this.width / 2 + this.offsetX;
        const targetY = target.y + target.height / 2 - this.height / 2 + this.offsetY;
        
        // Smooth camera movement
        this.x += (targetX - this.x) * this.smoothing;
        this.y += (targetY - this.y) * this.smoothing;
        
        // Apply camera shake if active
        if (this.shake.active) {
            this.applyShake();
        }
        
        // Clamp to level bounds
        this.clampToBounds();
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.clampToBounds();
    }
    
    setOffset(x, y) {
        this.offsetX = x;
        this.offsetY = y;
    }
    
    setBounds(minX, minY, maxX, maxY) {
        this.bounds.minX = minX;
        this.bounds.minY = minY;
        this.bounds.maxX = maxX;
        this.bounds.maxY = maxY;
    }
    
    clampToBounds() {
        // Ensure camera doesn't go outside level bounds
        this.x = Math.max(this.bounds.minX, 
                 Math.min(this.bounds.maxX - this.width, this.x));
        this.y = Math.max(this.bounds.minY, 
                 Math.min(this.bounds.maxY - this.height, this.y));
    }
    
    screenToWorld(screenX, screenY) {
        return {
            x: screenX + this.x,
            y: screenY + this.y
        };
    }
    
    worldToScreen(worldX, worldY) {
        return {
            x: worldX - this.x,
            y: worldY - this.y
        };
    }
    
    isInView(x, y, width, height) {
        return x + width > this.x &&
               x < this.x + this.width &&
               y + height > this.y &&
               y < this.y + this.height;
    }
    
    startShake(intensity, duration) {
        this.shake.active = true;
        this.shake.intensity = intensity;
        this.shake.duration = duration;
        this.shake.timer = 0;
    }
    
    applyShake() {
        this.shake.timer++;
        
        if (this.shake.timer >= this.shake.duration) {
            this.shake.active = false;
            return;
        }
        
        // Calculate shake offset
        const progress = this.shake.timer / this.shake.duration;
        const currentIntensity = this.shake.intensity * (1 - progress);
        
        const shakeX = (Math.random() - 0.5) * currentIntensity;
        const shakeY = (Math.random() - 0.5) * currentIntensity;
        
        this.x += shakeX;
        this.y += shakeY;
    }
    
    applyTransform(ctx) {
        ctx.translate(-Math.floor(this.x), -Math.floor(this.y));
    }
    
    reset() {
        this.x = 0;
        this.y = 0;
        this.target = null;
        this.shake.active = false;
    }
    
    update(deltaTime) {
        if (this.target) {
            this.followTarget(this.target);
        }
    }
}