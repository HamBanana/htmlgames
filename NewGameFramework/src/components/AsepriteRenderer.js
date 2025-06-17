// GameFramework/src/components/AsepriteRenderer.js
import { Component } from '../core/Component.js';
import { Vector2 } from '../core/Vector2.js';

/**
 * AsepriteRenderer - Renders Aseprite sprites
 * @class AsepriteRenderer
 */
export class AsepriteRenderer extends Component {
    constructor(spriteName = null) {
        super();
        
        this.spriteName = spriteName;
        this.currentFrame = 0;
        this.flipX = false;
        this.flipY = false;
        this.alpha = 1;
        this.tint = null;
        this.offset = new Vector2();
        
        // Size override (null = use sprite size)
        this.width = null;
        this.height = null;
        
        // Sprite data cache
        this.sprite = null;
        this.spriteData = null;
    }
    
    /**
     * Set the sprite to render
     * @param {string} spriteName - Name of the sprite asset
     */
    setSprite(spriteName) {
        this.spriteName = spriteName;
        this.sprite = null;
        this.spriteData = null;
        this.loadSprite();
    }
    
    /**
     * Called when component starts
     */
    start() {
        this.loadSprite();
    }
    
    /**
     * Load sprite data
     */
    loadSprite() {
        if (!this.spriteName || !this.engine) return;
        
        const renderer = this.engine.getSystem('renderer');
        if (!renderer) return;
        
        this.sprite = renderer.getSprite(this.spriteName);
        this.spriteData = renderer.getSpriteData(this.spriteName);
        
        if (!this.sprite) {
            console.warn(`Sprite '${this.spriteName}' not loaded`);
        }
    }
    
    /**
     * Set current frame
     * @param {number} frame - Frame index
     */
    setFrame(frame) {
        this.currentFrame = frame;
    }
    
    /**
     * Get frame data
     * @param {number} frameIndex - Frame index
     * @returns {object|null} Frame data
     */
    getFrameData(frameIndex) {
        if (!this.spriteData || !this.spriteData.frames) return null;
        
        // Aseprite frames can be named or indexed
        let frame = this.spriteData.frames.get(frameIndex.toString());
        
        if (!frame) {
            // Try array access
            const frames = Array.from(this.spriteData.frames.values());
            frame = frames[frameIndex];
        }
        
        return frame;
    }
    
    /**
     * Get sprite bounds
     * @returns {object} Bounds object
     */
    getBounds() {
        const frame = this.getFrameData(this.currentFrame);
        
        if (frame) {
            return {
                x: this.entity.position.x + this.offset.x - (this.width || frame.w) / 2,
                y: this.entity.position.y + this.offset.y - (this.height || frame.h) / 2,
                width: this.width || frame.w,
                height: this.height || frame.h
            };
        }
        
        // Fallback bounds
        return {
            x: this.entity.position.x + this.offset.x - 16,
            y: this.entity.position.y + this.offset.y - 16,
            width: 32,
            height: 32
        };
    }
    
    /**
     * Render the sprite
     * @param {CanvasRenderingContext2D} context - Canvas context
     */
    render(context) {
        if (!this.sprite || !this.spriteData) {
            this.loadSprite();
            return;
        }
        
        const frame = this.getFrameData(this.currentFrame);
        if (!frame) return;
        
        context.save();
        
        // Apply alpha
        if (this.alpha < 1) {
            context.globalAlpha = this.alpha;
        }
        
        // Apply flipping
        if (this.flipX || this.flipY) {
            context.scale(
                this.flipX ? -1 : 1,
                this.flipY ? -1 : 1
            );
        }
        
        // Calculate draw position
        const drawWidth = this.width || frame.w;
        const drawHeight = this.height || frame.h;
        const drawX = this.offset.x - drawWidth / 2;
        const drawY = this.offset.y - drawHeight / 2;
        
        // Handle sprite source size (trimmed sprites)
        let sourceX = frame.x;
        let sourceY = frame.y;
        let sourceWidth = frame.w;
        let sourceHeight = frame.h;
        
        if (frame.spriteSourceSize) {
            // Adjust for trimmed sprite
            const trim = frame.spriteSourceSize;
            const fullWidth = frame.sourceSize.w;
            const fullHeight = frame.sourceSize.h;
            
            // Adjust draw position for trim
            const trimX = trim.x - fullWidth / 2;
            const trimY = trim.y - fullHeight / 2;
            
            context.translate(trimX, trimY);
        }
        
        // Apply tint if specified
        if (this.tint) {
            // This is a simple tint implementation
            // For better tinting, you might want to use a separate canvas
            context.globalCompositeOperation = 'multiply';
        }
        
        // Draw the sprite
        context.drawImage(
            this.sprite,
            sourceX, sourceY, sourceWidth, sourceHeight,
            drawX, drawY, drawWidth, drawHeight
        );
        
        // Draw tint overlay
        if (this.tint) {
            context.globalCompositeOperation = 'destination-atop';
            context.fillStyle = this.tint;
            context.fillRect(drawX, drawY, drawWidth, drawHeight);
            context.globalCompositeOperation = 'source-over';
        }
        
        context.restore();
    }
}