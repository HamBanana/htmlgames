// GameFramework/src/components/TextRenderer.js
import { Component } from '../core/Component.js';
import { Vector2 } from '../core/Vector2.js';

/**
 * TextRenderer - Renders text
 * @class TextRenderer
 */
export class TextRenderer extends Component {
    constructor(text = '', config = {}) {
        super(config);
        
        // Text content
        this.text = text;
        
        // Font properties
        this.font = config.font || 'Arial';
        this.fontSize = config.fontSize || 16;
        this.fontWeight = config.fontWeight || 'normal';
        this.fontStyle = config.fontStyle || 'normal';
        
        // Text appearance
        this.color = config.color || '#ffffff';
        this.strokeColor = config.strokeColor || null;
        this.strokeWidth = config.strokeWidth || 2;
        this.alpha = config.alpha !== undefined ? config.alpha : 1;
        
        // Text alignment
        this.align = config.align || 'center'; // left, center, right
        this.baseline = config.baseline || 'middle'; // top, middle, bottom, alphabetic
        
        // Text effects
        this.shadow = config.shadow || null; // { color, blur, offsetX, offsetY }
        this.outline = config.outline || false;
        this.gradient = config.gradient || null; // { colors, direction }
        
        // Layout
        this.offset = new Vector2(config.offsetX || 0, config.offsetY || 0);
        this.maxWidth = config.maxWidth || null;
        this.lineHeight = config.lineHeight || 1.2;
        this.wordWrap = config.wordWrap || false;
        
        // Animation
        this.typewriter = config.typewriter || false;
        this.typewriterSpeed = config.typewriterSpeed || 20; // chars per second
        this.typewriterIndex = 0;
        this.typewriterTimer = 0;
        this.displayText = '';
        
        // Cached values
        this._fontString = '';
        this._needsFontUpdate = true;
        this._wrappedLines = [];
        this._needsWrap = true;
    }
    
    /**
     * Set text content
     * @param {string} text - Text to display
     */
    setText(text) {
        if (this.text !== text) {
            this.text = text;
            this._needsWrap = true;
            
            if (this.typewriter) {
                this.typewriterIndex = 0;
                this.typewriterTimer = 0;
                this.displayText = '';
            }
        }
    }
    
    /**
     * Set font properties
     * @param {object} properties - Font properties
     */
    setFont(properties) {
        if (properties.font !== undefined) this.font = properties.font;
        if (properties.fontSize !== undefined) this.fontSize = properties.fontSize;
        if (properties.fontWeight !== undefined) this.fontWeight = properties.fontWeight;
        if (properties.fontStyle !== undefined) this.fontStyle = properties.fontStyle;
        
        this._needsFontUpdate = true;
        this._needsWrap = true;
    }
    
    /**
     * Get computed font string
     * @returns {string}
     */
    getFontString() {
        if (this._needsFontUpdate) {
            this._fontString = `${this.fontStyle} ${this.fontWeight} ${this.fontSize}px ${this.font}`;
            this._needsFontUpdate = false;
        }
        return this._fontString;
    }
    
    /**
     * Start typewriter effect
     */
    startTypewriter() {
        this.typewriter = true;
        this.typewriterIndex = 0;
        this.typewriterTimer = 0;
        this.displayText = '';
    }
    
    /**
     * Complete typewriter instantly
     */
    completeTypewriter() {
        this.typewriterIndex = this.text.length;
        this.displayText = this.text;
    }
    
    /**
     * Update component
     * @param {number} deltaTime - Delta time
     */
    update(deltaTime) {
        // Update typewriter effect
        if (this.typewriter && this.typewriterIndex < this.text.length) {
            this.typewriterTimer += deltaTime;
            
            const charsToAdd = Math.floor(this.typewriterTimer * this.typewriterSpeed);
            if (charsToAdd > 0) {
                this.typewriterIndex = Math.min(
                    this.typewriterIndex + charsToAdd,
                    this.text.length
                );
                this.displayText = this.text.substring(0, this.typewriterIndex);
                this.typewriterTimer = 0;
                this._needsWrap = true;
                
                // Emit event
                if (this.entity) {
                    this.entity.emit('text:typewriter', {
                        progress: this.typewriterIndex / this.text.length,
                        complete: this.typewriterIndex >= this.text.length
                    });
                }
            }
        }
    }
    
    /**
     * Wrap text to fit maxWidth
     * @private
     */
    wrapText(context, text) {
        if (!this.maxWidth || !this.wordWrap) {
            this._wrappedLines = [text];
            return;
        }
        
        this._wrappedLines = [];
        const words = text.split(' ');
        let currentLine = '';
        
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = context.measureText(testLine);
            
            if (metrics.width > this.maxWidth && currentLine) {
                this._wrappedLines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            this._wrappedLines.push(currentLine);
        }
        
        this._needsWrap = false;
    }
    
    /**
     * Render text
     * @param {CanvasRenderingContext2D} context - Canvas context
     */
    render(context) {
        const textToRender = this.typewriter ? this.displayText : this.text;
        if (!textToRender) return;
        
        context.save();
        
        // Set font
        context.font = this.getFontString();
        context.textAlign = this.align;
        context.textBaseline = this.baseline;
        
        // Apply alpha
        if (this.alpha < 1) {
            context.globalAlpha = this.alpha;
        }
        
        // Wrap text if needed
        if (this._needsWrap || !this._wrappedLines.length) {
            this.wrapText(context, textToRender);
        }
        
        // Calculate starting position
        let x = this.offset.x;
        let y = this.offset.y;
        
        // Adjust for multi-line vertical alignment
        if (this._wrappedLines.length > 1) {
            const totalHeight = (this._wrappedLines.length - 1) * this.fontSize * this.lineHeight;
            
            if (this.baseline === 'middle') {
                y -= totalHeight / 2;
            } else if (this.baseline === 'bottom') {
                y -= totalHeight;
            }
        }
        
        // Render each line
        this._wrappedLines.forEach((line, index) => {
            const lineY = y + index * this.fontSize * this.lineHeight;
            
            // Apply shadow
            if (this.shadow) {
                context.save();
                context.shadowColor = this.shadow.color || 'rgba(0,0,0,0.5)';
                context.shadowBlur = this.shadow.blur || 4;
                context.shadowOffsetX = this.shadow.offsetX || 2;
                context.shadowOffsetY = this.shadow.offsetY || 2;
            }
            
            // Apply gradient
            if (this.gradient) {
                const gradient = this.createGradient(context, x, lineY, line);
                context.fillStyle = gradient;
            } else {
                context.fillStyle = this.color;
            }
            
            // Draw stroke/outline
            if (this.strokeColor || this.outline) {
                context.strokeStyle = this.strokeColor || '#000000';
                context.lineWidth = this.strokeWidth;
                
                if (this.outline) {
                    // Draw outline (stroke in 8 directions)
                    const offsets = [
                        [-1, -1], [0, -1], [1, -1],
                        [-1, 0], [1, 0],
                        [-1, 1], [0, 1], [1, 1]
                    ];
                    
                    offsets.forEach(([dx, dy]) => {
                        context.strokeText(line, x + dx, lineY + dy);
                    });
                } else {
                    context.strokeText(line, x, lineY);
                }
            }
            
            // Draw fill
            context.fillText(line, x, lineY, this.maxWidth);
            
            if (this.shadow) {
                context.restore();
            }
        });
        
        context.restore();
    }
    
    /**
     * Create gradient for text
     * @private
     */
    createGradient(context, x, y, text) {
        const metrics = context.measureText(text);
        const width = metrics.width;
        const height = this.fontSize;
        
        let gradient;
        
        switch (this.gradient.direction || 'horizontal') {
            case 'horizontal':
                gradient = context.createLinearGradient(
                    x - width/2, y,
                    x + width/2, y
                );
                break;
                
            case 'vertical':
                gradient = context.createLinearGradient(
                    x, y - height/2,
                    x, y + height/2
                );
                break;
                
            case 'diagonal':
                gradient = context.createLinearGradient(
                    x - width/2, y - height/2,
                    x + width/2, y + height/2
                );
                break;
                
            case 'radial':
                gradient = context.createRadialGradient(
                    x, y, 0,
                    x, y, Math.max(width, height) / 2
                );
                break;
        }
        
        // Add color stops
        const colors = this.gradient.colors || ['#ffffff', '#000000'];
        colors.forEach((color, index) => {
            gradient.addColorStop(index / (colors.length - 1), color);
        });
        
        return gradient;
    }
    
    /**
     * Get text bounds
     * @returns {object}
     */
    getBounds() {
        const renderer = this.engine?.renderer;
        if (!renderer) return { width: 0, height: 0 };
        
        const context = renderer.context;
        context.save();
        context.font = this.getFontString();
        
        let maxWidth = 0;
        this._wrappedLines.forEach(line => {
            const metrics = context.measureText(line);
            maxWidth = Math.max(maxWidth, metrics.width);
        });
        
        context.restore();
        
        return {
            width: maxWidth,
            height: this._wrappedLines.length * this.fontSize * this.lineHeight
        };
    }
}