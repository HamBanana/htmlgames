// sprite-renderer.js - Sprite rendering system

class SpriteRenderer {
    constructor() {
        this.sprites = new Map();
        this.animations = new Map();
        this.loadedImages = new Map();
    }
    
    async loadSpriteFromJSON(jsonPath, spriteId) {
        try {
            const response = await fetch(jsonPath);
            if (!response.ok) {
                throw new Error(`Failed to load sprite JSON: ${jsonPath}`);
            }
            
            const data = await response.json();
            
            // Load the embedded base64 image
            const image = new Image();
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
                image.src = data.meta.image;
            });
            
            // Store the sprite data
            this.sprites.set(spriteId, {
                image: image,
                frames: data.frames,
                meta: data.meta,
                animations: {}
            });
            
            // Process frame tags into animations
            if (data.meta.frameTags) {
                const sprite = this.sprites.get(spriteId);
                data.meta.frameTags.forEach(tag => {
                    sprite.animations[tag.name] = {
                        name: tag.name,
                        frames: tag.frames,
                        duration: tag.duration,
                        from: tag.from,
                        to: tag.to,
                        direction: tag.direction,
                        type: tag.type
                    };
                });
            }
            
            console.log(`Loaded sprite: ${spriteId} with animations:`, Object.keys(this.sprites.get(spriteId).animations));
            
            return this.sprites.get(spriteId);
            
        } catch (error) {
            console.error('Error loading sprite:', error);
            throw error;
        }
    }
    
    drawSprite(ctx, spriteId, frameName, x, y, flip = false, scale = 1) {
        const sprite = this.sprites.get(spriteId);
        if (!sprite || !sprite.frames[frameName]) {
            return;
        }
        
        const frame = sprite.frames[frameName];
        
        ctx.save();
        
        // Handle flipping
        if (flip) {
            ctx.scale(-1, 1);
            x = -x - frame.frame.w * scale;
        }
        
        // Draw the sprite frame
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(
            sprite.image,
            frame.frame.x,
            frame.frame.y,
            frame.frame.w,
            frame.frame.h,
            Math.floor(x),
            Math.floor(y),
            frame.frame.w * scale,
            frame.frame.h * scale
        );
        
        ctx.restore();
    }
    
    drawAnimation(ctx, spriteId, animationName, frameIndex, x, y, flip = false, scale = 1) {
        const sprite = this.sprites.get(spriteId);
        if (!sprite || !sprite.animations[animationName]) {
            return;
        }
        
        const animation = sprite.animations[animationName];
        const frameNumber = animation.frames[frameIndex % animation.frames.length];
        const frameName = `sprite_${frameNumber}.aseprite`;
        
        this.drawSprite(ctx, spriteId, frameName, x, y, flip, scale);
    }
    
    getAnimationInfo(spriteId, animationName) {
        const sprite = this.sprites.get(spriteId);
        if (!sprite || !sprite.animations[animationName]) {
            return null;
        }
        
        return sprite.animations[animationName];
    }
    
    getFrameDuration(spriteId, animationName) {
        const animation = this.getAnimationInfo(spriteId, animationName);
        return animation ? animation.duration : 150;
    }
    
    getFrameCount(spriteId, animationName) {
        const animation = this.getAnimationInfo(spriteId, animationName);
        return animation ? animation.frames.length : 0;
    }
}