// GameFramework/src/systems/Renderer.js
import { Vector2 } from '../core/Vector2.js';

/**
 * Camera - Handles view transformation
 * @class Camera
 */
export class Camera {
    constructor(renderer) {
        this.renderer = renderer;
        this.position = new Vector2();
        this.rotation = 0;
        this.zoom = 1;
        this.bounds = null;
        this.target = null;
        this.smoothing = 0.1;
        
        // Screen shake
        this.shake = {
            intensity: 0,
            duration: 0,
            timer: 0,
            offset: new Vector2()
        };
    }
    
    /**
     * Follow an entity
     * @param {Entity} entity - Entity to follow
     * @param {number} smoothing - Smoothing factor (0-1)
     */
    follow(entity, smoothing = 0.1) {
        this.target = entity;
        this.smoothing = smoothing;
    }
    
    /**
     * Stop following
     */
    unfollow() {
        this.target = null;
    }
    
    /**
     * Set camera bounds
     * @param {object} bounds - Bounds object {x, y, width, height}
     */
    setBounds(bounds) {
        this.bounds = bounds;
    }
    
    /**
     * Apply screen shake
     * @param {number} intensity - Shake intensity
     * @param {number} duration - Shake duration in seconds
     */
    applyShake(intensity = 10, duration = 0.5) {
        this.shake.intensity = intensity;
        this.shake.duration = duration;
        this.shake.timer = duration;
    }
    
    /**
     * Update camera
     * @param {number} deltaTime - Delta time
     */
    update(deltaTime) {
        // Follow target
        if (this.target) {
            const targetX = this.target.position.x - this.renderer.engine.canvas.width / 2 / this.zoom;
            const targetY = this.target.position.y - this.renderer.engine.canvas.height / 2 / this.zoom;
            
            this.position.x += (targetX - this.position.x) * this.smoothing;
            this.position.y += (targetY - this.position.y) * this.smoothing;
        }
        
        // Apply bounds
        if (this.bounds) {
            const viewWidth = this.renderer.engine.canvas.width / this.zoom;
            const viewHeight = this.renderer.engine.canvas.height / this.zoom;
            
            this.position.x = Math.max(
                this.bounds.x,
                Math.min(this.bounds.x + this.bounds.width - viewWidth, this.position.x)
            );
            
            this.position.y = Math.max(
                this.bounds.y,
                Math.min(this.bounds.y + this.bounds.height - viewHeight, this.position.y)
            );
        }
        
        // Update shake
        if (this.shake.timer > 0) {
            this.shake.timer -= deltaTime;
            
            if (this.shake.timer > 0) {
                const progress = this.shake.timer / this.shake.duration;
                const currentIntensity = this.shake.intensity * progress;
                
                this.shake.offset.x = (Math.random() - 0.5) * currentIntensity;
                this.shake.offset.y = (Math.random() - 0.5) * currentIntensity;
            } else {
                this.shake.offset.set(0, 0);
            }
        }
    }
    
    /**
     * Apply camera transform to context
     * @param {CanvasRenderingContext2D} context - Canvas context
     */
    applyTransform(context) {
        const canvas = this.renderer.engine.canvas;
        
        // Center camera
        context.translate(canvas.width / 2, canvas.height / 2);
        
        // Apply zoom
        context.scale(this.zoom, this.zoom);
        
        // Apply rotation
        context.rotate(-this.rotation);
        
        // Apply position and shake
        context.translate(
            -this.position.x - this.shake.offset.x,
            -this.position.y - this.shake.offset.y
        );
    }
    
    /**
     * Convert screen position to world position
     * @param {Vector2} screenPos - Screen position
     * @returns {Vector2} World position
     */
    screenToWorld(screenPos) {
        const canvas = this.renderer.engine.canvas;
        
        // Adjust for camera zoom and position
        const x = (screenPos.x - canvas.width / 2) / this.zoom + this.position.x;
        const y = (screenPos.y - canvas.height / 2) / this.zoom + this.position.y;
        
        // TODO: Account for rotation if needed
        
        return new Vector2(x, y);
    }
    
    /**
     * Convert world position to screen position
     * @param {Vector2} worldPos - World position
     * @returns {Vector2} Screen position
     */
    worldToScreen(worldPos) {
        const canvas = this.renderer.engine.canvas;
        
        // Adjust for camera position and zoom
        const x = (worldPos.x - this.position.x) * this.zoom + canvas.width / 2;
        const y = (worldPos.y - this.position.y) * this.zoom + canvas.height / 2;
        
        // TODO: Account for rotation if needed
        
        return new Vector2(x, y);
    }
}

/**
 * Renderer - Main rendering system
 * @class Renderer
 */
export class Renderer {
    constructor(engine) {
        this.engine = engine;
        this.context = engine.context;
        
        // Camera
        this.camera = new Camera(this);
        
        // Rendering settings
        this.pixelPerfect = true;
        this.smoothing = false;
        
        // Sprite cache
        this.sprites = new Map();
        this.spriteData = new Map();
        
        // Render layers
        this.layers = new Map();
        
        // Debug rendering
        this.debug = {
            enabled: false,
            showColliders: true,
            showBounds: true,
            showPositions: true,
            showGrid: false,
            gridSize: 32,
            colors: {
                collider: '#00ff00',
                bounds: '#ffff00',
                position: '#ff00ff',
                grid: 'rgba(255, 255, 255, 0.1)'
            }
        };
    }
    
    /**
     * Initialize renderer
     */
    initialize() {
        // Apply initial settings
        this.setSmoothing(this.smoothing);
    }
    
    /**
     * Update renderer
     * @param {number} deltaTime - Delta time
     */
    update(deltaTime) {
        // Update camera
        this.camera.update(deltaTime);
    }
    
    /**
     * Set image smoothing
     * @param {boolean} enabled - Enable smoothing
     */
    setSmoothing(enabled) {
        this.smoothing = enabled;
        this.context.imageSmoothingEnabled = enabled;
        this.context.imageSmoothingQuality = enabled ? 'high' : 'low';
    }
    
    /**
     * Load a sprite
     * @param {string} name - Sprite name
     * @param {string} url - Sprite URL
     * @returns {Promise<Image>}
     */
    async loadSprite(name, url) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            
            image.onload = () => {
                this.sprites.set(name, image);
                this.engine.emit('renderer:sprite-loaded', { name, url });
                resolve(image);
            };
            
            image.onerror = () => {
                const error = new Error(`Failed to load sprite: ${url}`);
                this.engine.emit('renderer:sprite-error', { name, url, error });
                reject(error);
            };
            
            image.src = url;
        });
    }
    
    /**
     * Load sprite data (for sprite sheets)
     * @param {string} name - Sprite name
     * @param {object} data - Sprite data
     */
    loadSpriteData(name, data) {
        this.spriteData.set(name, data);
    }
    
    /**
     * Get sprite
     * @param {string} name - Sprite name
     * @returns {Image|null}
     */
    getSprite(name) {
        return this.sprites.get(name) || null;
    }
    
    /**
     * Get sprite data
     * @param {string} name - Sprite name
     * @returns {object|null}
     */
    getSpriteData(name) {
        return this.spriteData.get(name) || null;
    }
    
    /**
     * Begin render frame
     */
    beginRender() {
        const canvas = this.engine.canvas;
        
        // Clear canvas
        this.context.clearRect(0, 0, canvas.width, canvas.height);
        
        // Save context state
        this.context.save();
        
        // Apply camera transform
        this.camera.applyTransform(this.context);
    }
    
    /**
     * End render frame
     */
    endRender() {
        // Restore context state
        this.context.restore();
        
        // Render debug info if enabled
        if (this.debug.enabled) {
            this.renderDebug();
        }
    }
    
    /**
     * Draw sprite
     * @param {string} name - Sprite name
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {object} options - Drawing options
     */
    drawSprite(name, x, y, options = {}) {
        const sprite = this.getSprite(name);
        if (!sprite) {
            console.warn(`Sprite '${name}' not found`);
            return;
        }
        
        this.context.save();
        
        // Apply transform
        if (options.rotation) {
            this.context.translate(x, y);
            this.context.rotate(options.rotation);
            this.context.translate(-x, -y);
        }
        
        if (options.scale) {
            this.context.translate(x, y);
            this.context.scale(
                options.scale.x || options.scale,
                options.scale.y || options.scale
            );
            this.context.translate(-x, -y);
        }
        
        // Apply alpha
        if (options.alpha !== undefined) {
            this.context.globalAlpha = options.alpha;
        }
        
        // Apply flip
        if (options.flipX || options.flipY) {
            this.context.translate(x, y);
            this.context.scale(
                options.flipX ? -1 : 1,
                options.flipY ? -1 : 1
            );
            this.context.translate(-x, -y);
        }
        
        // Draw sprite
        const width = options.width || sprite.width;
        const height = options.height || sprite.height;
        
        if (options.frame !== undefined) {
            // Draw from sprite sheet
            const data = this.getSpriteData(name);
            if (data && data.frames) {
                const frame = data.frames[options.frame];
                if (frame) {
                    this.context.drawImage(
                        sprite,
                        frame.x, frame.y, frame.width, frame.height,
                        x - width / 2, y - height / 2, width, height
                    );
                }
            }
        } else {
            // Draw entire sprite
            this.context.drawImage(
                sprite,
                x - width / 2,
                y - height / 2,
                width,
                height
            );
        }
        
        this.context.restore();
    }
    
    /**
     * Draw rectangle
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Width
     * @param {number} height - Height
     * @param {object} options - Drawing options
     */
    drawRect(x, y, width, height, options = {}) {
        this.context.save();
        
        if (options.rotation) {
            this.context.translate(x + width / 2, y + height / 2);
            this.context.rotate(options.rotation);
            this.context.translate(-x - width / 2, -y - height / 2);
        }
        
        if (options.alpha !== undefined) {
            this.context.globalAlpha = options.alpha;
        }
        
        if (options.fill) {
            this.context.fillStyle = options.fill;
            this.context.fillRect(x, y, width, height);
        }
        
        if (options.stroke) {
            this.context.strokeStyle = options.stroke;
            this.context.lineWidth = options.lineWidth || 1;
            this.context.strokeRect(x, y, width, height);
        }
        
        this.context.restore();
    }
    
    /**
     * Draw circle
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} radius - Radius
     * @param {object} options - Drawing options
     */
    drawCircle(x, y, radius, options = {}) {
        this.context.save();
        
        if (options.alpha !== undefined) {
            this.context.globalAlpha = options.alpha;
        }
        
        this.context.beginPath();
        this.context.arc(x, y, radius, 0, Math.PI * 2);
        
        if (options.fill) {
            this.context.fillStyle = options.fill;
            this.context.fill();
        }
        
        if (options.stroke) {
            this.context.strokeStyle = options.stroke;
            this.context.lineWidth = options.lineWidth || 1;
            this.context.stroke();
        }
        
        this.context.restore();
    }
    
    /**
     * Draw line
     * @param {number} x1 - Start X
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {object} options - Drawing options
     */
    drawLine(x1, y1, x2, y2, options = {}) {
        this.context.save();
        
        this.context.strokeStyle = options.color || '#ffffff';
        this.context.lineWidth = options.width || 1;
        
        if (options.alpha !== undefined) {
            this.context.globalAlpha = options.alpha;
        }
        
        this.context.beginPath();
        this.context.moveTo(x1, y1);
        this.context.lineTo(x2, y2);
        this.context.stroke();
        
        this.context.restore();
    }
    
    /**
     * Draw text
     * @param {string} text - Text to draw
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {object} options - Drawing options
     */
    drawText(text, x, y, options = {}) {
        this.context.save();
        
        this.context.font = options.font || '16px Arial';
        this.context.textAlign = options.align || 'left';
        this.context.textBaseline = options.baseline || 'top';
        
        if (options.alpha !== undefined) {
            this.context.globalAlpha = options.alpha;
        }
        
        if (options.stroke) {
            this.context.strokeStyle = options.stroke;
            this.context.lineWidth = options.strokeWidth || 2;
            this.context.strokeText(text, x, y);
        }
        
        if (options.fill !== false) {
            this.context.fillStyle = options.fill || '#ffffff';
            this.context.fillText(text, x, y);
        }
        
        this.context.restore();
    }
    
    /**
     * Enable debug rendering
     * @param {boolean} enabled - Enable debug
     */
    setDebug(enabled) {
        this.debug.enabled = enabled;
    }
    
    /**
     * Render debug information
     * @private
     */
    renderDebug() {
        this.context.save();
        
        // Reset transform for screen-space rendering
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        
        // Draw grid
        if (this.debug.showGrid) {
            this.drawDebugGrid();
        }
        
        // Draw entity debug info
        if (this.engine.activeScene) {
            this.context.save();
            this.camera.applyTransform(this.context);
            
            this.engine.activeScene.getAllEntities().forEach(entity => {
                this.drawEntityDebug(entity);
            });
            
            this.context.restore();
        }
        
        this.context.restore();
    }
    
    /**
     * Draw debug grid
     * @private
     */
    drawDebugGrid() {
        const canvas = this.engine.canvas;
        const gridSize = this.debug.gridSize;
        
        this.context.strokeStyle = this.debug.colors.grid;
        this.context.lineWidth = 1;
        
        // Calculate grid bounds based on camera
        const startX = Math.floor(this.camera.position.x / gridSize) * gridSize;
        const startY = Math.floor(this.camera.position.y / gridSize) * gridSize;
        const endX = startX + canvas.width / this.camera.zoom + gridSize;
        const endY = startY + canvas.height / this.camera.zoom + gridSize;
        
        this.context.save();
        this.camera.applyTransform(this.context);
        
        // Vertical lines
        for (let x = startX; x <= endX; x += gridSize) {
            this.context.beginPath();
            this.context.moveTo(x, startY);
            this.context.lineTo(x, endY);
            this.context.stroke();
        }
        
        // Horizontal lines
        for (let y = startY; y <= endY; y += gridSize) {
            this.context.beginPath();
            this.context.moveTo(startX, y);
            this.context.lineTo(endX, y);
            this.context.stroke();
        }
        
        this.context.restore();
    }
    
    /**
     * Draw entity debug info
     * @private
     */
    drawEntityDebug(entity) {
        if (!entity.visible) return;
        
        const pos = entity.position;
        
        // Draw position
        if (this.debug.showPositions) {
            this.drawCircle(pos.x, pos.y, 3, {
                fill: this.debug.colors.position
            });
        }
        
        // Draw bounds
        if (this.debug.showBounds) {
            // Simple bounds based on entity transform
            const bounds = {
                x: pos.x - 16 * entity.scale.x,
                y: pos.y - 16 * entity.scale.y,
                width: 32 * entity.scale.x,
                height: 32 * entity.scale.y
            };
            
            this.drawRect(bounds.x, bounds.y, bounds.width, bounds.height, {
                stroke: this.debug.colors.bounds,
                lineWidth: 1
            });
        }
        
        // Draw colliders
        if (this.debug.showColliders) {
            const collider = entity.getComponent('Collider');
            if (collider && collider.enabled) {
                const bounds = collider.getBounds();
                this.drawRect(bounds.x, bounds.y, bounds.width, bounds.height, {
                    stroke: this.debug.colors.collider,
                    lineWidth: 2
                });
            }
        }
    }
}