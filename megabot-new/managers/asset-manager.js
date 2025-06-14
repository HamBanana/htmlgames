// asset-manager.js - Asset loading and caching

class AssetManager {
    constructor(config) {
        this.config = config;
        this.assets = new Map();
        this.loading = new Map();
        this.spriteSheets = new Map();
        this.spriteData = new Map();
    }
    
    async loadSprite(category, name) {
        const key = `${category}/${name}`;
        
        // Check if already loaded
        if (this.assets.has(key)) {
            return this.assets.get(key);
        }
        
        // Check if currently loading
        if (this.loading.has(key)) {
            return this.loading.get(key);
        }
        
        // Start loading
        const loadPromise = this._loadSpriteAssets(category, name);
        this.loading.set(key, loadPromise);
        
        try {
            const result = await loadPromise;
            this.assets.set(key, result);
            this.loading.delete(key);
            return result;
        } catch (error) {
            this.loading.delete(key);
            throw error;
        }
    }
    
    async _loadSpriteAssets(category, name) {
        const spriteConfig = this._getSpriteConfig(category, name);
        if (!spriteConfig) {
            throw new Error(`Sprite config not found for ${category}/${name}`);
        }
        
        const baseDir = this.config.directory || 'assets/sprites/';
        
        // Load sprite sheet image
        const image = await this._loadImage(baseDir + spriteConfig.sheet);
        
        // Load sprite data JSON
        const jsonData = await this._loadJSON(baseDir + spriteConfig.json);
        
        // Process sprite data
        const processedData = this._processSpriteData(jsonData, image);
        
        return {
            image: image,
            data: processedData,
            config: spriteConfig
        };
    }
    
    _getSpriteConfig(category, name) {
        if (category === 'player') {
            return this.config.player;
        } else if (category === 'boss') {
            return this.config.boss;
        } else if (category === 'enemies' && this.config.enemies[name]) {
            return this.config.enemies[name];
        } else if (category === 'effects' && this.config.effects[name]) {
            return this.config.effects[name];
        }
        return null;
    }
    
    async _loadImage(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
            img.src = url;
        });
    }
    
    async _loadJSON(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to load JSON: ${url}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error loading JSON:', error);
            throw error;
        }
    }
    
    _processSpriteData(jsonData, image) {
        const processed = {
            frames: {},
            animations: {},
            meta: jsonData.meta || {}
        };
        
        // Process frames
        if (jsonData.frames) {
            for (const [frameName, frameData] of Object.entries(jsonData.frames)) {
                processed.frames[frameName] = {
                    x: frameData.frame.x,
                    y: frameData.frame.y,
                    w: frameData.frame.w,
                    h: frameData.frame.h,
                    duration: frameData.duration || 100
                };
            }
        }
        
        // Process animations from frame tags
        if (jsonData.meta && jsonData.meta.frameTags) {
            jsonData.meta.frameTags.forEach(tag => {
                processed.animations[tag.name] = {
                    name: tag.name,
                    from: tag.from,
                    to: tag.to,
                    direction: tag.direction || 'forward',
                    frames: tag.frames || []
                };
            });
        }
        
        return processed;
    }
    
    getAnimation(category, name, animationName) {
        const key = `${category}/${name}`;
        const asset = this.assets.get(key);
        
        if (!asset || !asset.data.animations[animationName]) {
            console.warn(`Animation not found: ${category}/${name}/${animationName}`);
            return null;
        }
        
        return asset.data.animations[animationName];
    }
    
    getFrame(category, name, frameIndex) {
        const key = `${category}/${name}`;
        const asset = this.assets.get(key);
        
        if (!asset) {
            return null;
        }
        
        const frameNames = Object.keys(asset.data.frames);
        if (frameIndex >= 0 && frameIndex < frameNames.length) {
            const frameName = frameNames[frameIndex];
            return {
                ...asset.data.frames[frameName],
                image: asset.image
            };
        }
        
        return null;
    }
    
    drawSprite(ctx, category, name, frameIndex, x, y, scale = 1, flip = false) {
        const frame = this.getFrame(category, name, frameIndex);
        if (!frame) return;
        
        ctx.save();
        
        if (flip) {
            ctx.scale(-1, 1);
            x = -x - frame.w * scale;
        }
        
        ctx.drawImage(
            frame.image,
            frame.x, frame.y, frame.w, frame.h,
            x, y, frame.w * scale, frame.h * scale
        );
        
        ctx.restore();
    }
    
    drawAnimation(ctx, category, name, animationName, frameTime, x, y, scale = 1, flip = false) {
        const key = `${category}/${name}`;
        const asset = this.assets.get(key);
        
        if (!asset) return;
        
        const animation = asset.data.animations[animationName];
        if (!animation) return;
        
        // Calculate current frame based on time
        const totalFrames = animation.to - animation.from + 1;
        const frameIndex = animation.from + (Math.floor(frameTime / 100) % totalFrames);
        
        this.drawSprite(ctx, category, name, frameIndex, x, y, scale, flip);
    }
    
    async preloadAll() {
        const loadPromises = [];
        
        // Preload player sprite
        if (this.config.player) {
            loadPromises.push(this.loadSprite('player', 'main'));
        }
        
        // Preload enemy sprites
        if (this.config.enemies) {
            for (const enemyType of Object.keys(this.config.enemies)) {
                loadPromises.push(this.loadSprite('enemies', enemyType));
            }
        }
        
        // Preload boss sprite
        if (this.config.boss) {
            loadPromises.push(this.loadSprite('boss', 'main'));
        }
        
        // Preload effects
        if (this.config.effects) {
            for (const effectType of Object.keys(this.config.effects)) {
                loadPromises.push(this.loadSprite('effects', effectType));
            }
        }
        
        await Promise.all(loadPromises);
    }
    
    isLoaded(category, name) {
        const key = `${category}/${name}`;
        return this.assets.has(key);
    }
    
    clear() {
        this.assets.clear();
        this.loading.clear();
        this.spriteSheets.clear();
        this.spriteData.clear();
    }
}