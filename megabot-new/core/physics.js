// physics.js - Physics system

class PhysicsSystem {
    constructor(config) {
        this.gravity = config.gravity || 0.5;
        this.friction = config.friction || 0.1;
        this.maxVelocity = { x: 20, y: 20 };
    }
    
    applyGravity(entity, deltaTime) {
        if (entity.gravityScale !== undefined && entity.gravityScale === 0) return;
        
        const scale = entity.gravityScale || 1;
        entity.vy += this.gravity * scale * deltaTime;
        
        // Terminal velocity
        if (entity.vy > this.maxVelocity.y) {
            entity.vy = this.maxVelocity.y;
        }
    }
    
    applyFriction(entity, deltaTime) {
        if (!entity.grounded) return;
        
        if (Math.abs(entity.vx) > 0.1) {
            entity.vx *= (1 - this.friction * deltaTime);
        } else {
            entity.vx = 0;
        }
    }
    
    updatePosition(entity, deltaTime) {
        entity.x += entity.vx * deltaTime;
        entity.y += entity.vy * deltaTime;
        
        // Clamp velocity
        entity.vx = Math.max(-this.maxVelocity.x, Math.min(this.maxVelocity.x, entity.vx));
        entity.vy = Math.max(-this.maxVelocity.y, Math.min(this.maxVelocity.y, entity.vy));
    }
    
    checkPlatformCollisions(entity, platforms) {
        entity.grounded = false;
        
        for (const platform of platforms) {
            if (this.checkCollision(entity, platform)) {
                this.resolvePlatformCollision(entity, platform);
            }
        }
    }
    
    checkCollision(a, b) {
        return a.x < b.x + b.w &&
               a.x + a.width > b.x &&
               a.y < b.y + b.h &&
               a.y + a.height > b.y;
    }
    
    resolvePlatformCollision(entity, platform) {
        const overlapX = Math.min(entity.x + entity.width - platform.x, platform.x + platform.w - entity.x);
        const overlapY = Math.min(entity.y + entity.height - platform.y, platform.y + platform.h - entity.y);
        
        if (overlapX < overlapY) {
            // Horizontal collision
            if (entity.x < platform.x) {
                entity.x = platform.x - entity.width;
                if (entity.vx > 0) entity.vx = 0;
            } else {
                entity.x = platform.x + platform.w;
                if (entity.vx < 0) entity.vx = 0;
            }
        } else {
            // Vertical collision
            if (entity.y < platform.y) {
                entity.y = platform.y - entity.height;
                if (entity.vy > 0) {
                    entity.vy = 0;
                    entity.grounded = true;
                }
            } else {
                entity.y = platform.y + platform.h;
                if (entity.vy < 0) entity.vy = 0;
            }
        }
    }
    
    checkLevelBounds(entity, levelWidth, levelHeight) {
        // Left bound
        if (entity.x < 0) {
            entity.x = 0;
            if (entity.vx < 0) entity.vx = 0;
        }
        
        // Right bound
        if (entity.x + entity.width > levelWidth) {
            entity.x = levelWidth - entity.width;
            if (entity.vx > 0) entity.vx = 0;
        }
        
        // Top bound
        if (entity.y < 0) {
            entity.y = 0;
            if (entity.vy < 0) entity.vy = 0;
        }
        
        // Bottom bound (fall off level)
        if (entity.y > levelHeight) {
            return true; // Entity fell off level
        }
        
        return false;
    }
    
    getDistance(a, b) {
        const dx = (a.x + a.width/2) - (b.x + b.width/2);
        const dy = (a.y + a.height/2) - (b.y + b.height/2);
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    getAngle(from, to) {
        const dx = (to.x + to.width/2) - (from.x + from.width/2);
        const dy = (to.y + to.height/2) - (from.y + from.height/2);
        return Math.atan2(dy, dx);
    }
    
    getNormalizedVector(from, to) {
        const dx = (to.x + to.width/2) - (from.x + from.width/2);
        const dy = (to.y + to.height/2) - (from.y + from.height/2);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance === 0) return { x: 0, y: 0 };
        
        return {
            x: dx / distance,
            y: dy / distance
        };
    }
}