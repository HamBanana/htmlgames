// GameFramework/src/components/AnimatedSprite.js
import { AsepriteRenderer } from './AsepriteRenderer.js';

/**
 * AnimatedSprite - Animated sprite component using Aseprite data
 * @class AnimatedSprite
 */
export class AnimatedSprite extends AsepriteRenderer {
    constructor(spriteName = null) {
        super(spriteName);
        
        // Animation state
        this.animations = new Map();
        this.currentAnimation = null;
        this.currentAnimationData = null;
        this.animationTime = 0;
        this.animationFrame = 0;
        this.playing = false;
        this.speed = 1;
        
        // Playback settings
        this.loop = true;
        this.pingPong = false;
        this.reversed = false;
        this.pingPongDirection = 1;
        
        // Callbacks
        this.onAnimationEnd = null;
        this.onAnimationLoop = null;
        this.onFrameChange = null;
    }
    
    /**
     * Load sprite and parse animations
     */
    loadSprite() {
        super.loadSprite();
        
        if (this.spriteData && this.spriteData.animations) {
            this.parseAnimations();
        }
    }
    
    /**
     * Parse animations from Aseprite data
     */
    parseAnimations() {
        if (!this.spriteData || !this.spriteData.animations) return;
        
        // Clear existing animations
        this.animations.clear();
        
        // Parse each animation tag
        this.spriteData.animations.forEach((animData, name) => {
            const frames = [];
            const durations = [];
            
            // Collect frames for this animation
            for (let i = animData.from; i <= animData.to; i++) {
                frames.push(i);
                
                // Get frame duration
                const frameData = this.getFrameData(i);
                durations.push(frameData ? frameData.duration : 100);
            }
            
            // Store animation
            this.animations.set(name, {
                name,
                frames,
                durations,
                totalDuration: durations.reduce((sum, d) => sum + d, 0),
                direction: animData.direction || 'forward',
                repeat: animData.repeat
            });
        });
        
        // Auto-play first animation if none is set
        if (!this.currentAnimation && this.animations.size > 0) {
            const firstAnim = this.animations.keys().next().value;
            this.play(firstAnim);
        }
    }
    
    /**
     * Play an animation
     * @param {string} name - Animation name
     * @param {boolean} restart - Restart if already playing
     */
    play(name, restart = false) {
        const animation = this.animations.get(name);
        if (!animation) {
            console.warn(`Animation '${name}' not found in sprite '${this.spriteName}'`);
            return;
        }
        
        // Don't restart if already playing unless forced
        if (this.currentAnimation === name && this.playing && !restart) {
            return;
        }
        
        this.currentAnimation = name;
        this.currentAnimationData = animation;
        this.animationTime = 0;
        this.animationFrame = 0;
        this.playing = true;
        this.pingPongDirection = 1;
        
        // Apply animation direction
        switch (animation.direction) {
            case 'reverse':
                this.reversed = true;
                this.pingPong = false;
                this.animationFrame = animation.frames.length - 1;
                break;
            case 'pingpong':
                this.reversed = false;
                this.pingPong = true;
                break;
            default: // 'forward'
                this.reversed = false;
                this.pingPong = false;
                break;
        }
        
        // Set initial frame
        this.updateFrame();
    }
    
    /**
     * Stop animation
     */
    stop() {
        this.playing = false;
    }
    
    /**
     * Pause animation
     */
    pause() {
        this.playing = false;
    }
    
    /**
     * Resume animation
     */
    resume() {
        this.playing = true;
    }
    
    /**
     * Set animation speed
     * @param {number} speed - Speed multiplier
     */
    setSpeed(speed) {
        this.speed = speed;
    }
    
    /**
     * Set whether animation should loop
     * @param {boolean} loop - Loop state
     */
    setLoop(loop) {
        this.loop = loop;
    }
    
    /**
     * Get current animation name
     * @returns {string|null}
     */
    getCurrentAnimation() {
        return this.currentAnimation;
    }
    
    /**
     * Get available animation names
     * @returns {string[]}
     */
    getAnimationNames() {
        return Array.from(this.animations.keys());
    }
    
    /**
     * Check if animation exists
     * @param {string} name - Animation name
     * @returns {boolean}
     */
    hasAnimation(name) {
        return this.animations.has(name);
    }
    
    /**
     * Update animation
     * @param {number} deltaTime - Time since last frame
     */
    update(deltaTime) {
        if (!this.playing || !this.currentAnimationData) return;
        
        // Update animation time
        this.animationTime += deltaTime * 1000 * this.speed; // Convert to milliseconds
        
        // Get current frame duration
        const frameDuration = this.currentAnimationData.durations[this.animationFrame];
        
        // Check if we need to advance frame
        if (this.animationTime >= frameDuration) {
            this.animationTime -= frameDuration;
            this.advanceFrame();
        }
    }
    
    /**
     * Advance to next frame
     */
    advanceFrame() {
        const anim = this.currentAnimationData;
        const lastFrame = this.animationFrame;
        
        if (this.pingPong) {
            // Ping-pong animation
            this.animationFrame += this.pingPongDirection;
            
            if (this.animationFrame >= anim.frames.length) {
                this.animationFrame = anim.frames.length - 2;
                this.pingPongDirection = -1;
                
                if (!this.loop) {
                    this.onAnimationComplete();
                }
            } else if (this.animationFrame < 0) {
                this.animationFrame = 1;
                this.pingPongDirection = 1;
                
                if (this.loop) {
                    this.onAnimationLooped();
                } else {
                    this.animationFrame = 0;
                    this.onAnimationComplete();
                }
            }
        } else if (this.reversed) {
            // Reverse animation
            this.animationFrame--;
            
            if (this.animationFrame < 0) {
                if (this.loop) {
                    this.animationFrame = anim.frames.length - 1;
                    this.onAnimationLooped();
                } else {
                    this.animationFrame = 0;
                    this.onAnimationComplete();
                }
            }
        } else {
            // Forward animation
            this.animationFrame++;
            
            if (this.animationFrame >= anim.frames.length) {
                if (this.loop) {
                    this.animationFrame = 0;
                    this.onAnimationLooped();
                } else {
                    this.animationFrame = anim.frames.length - 1;
                    this.onAnimationComplete();
                }
            }
        }
        
        // Update frame if changed
        if (this.animationFrame !== lastFrame) {
            this.updateFrame();
        }
    }
    
    /**
     * Update current frame
     */
    updateFrame() {
        if (!this.currentAnimationData) return;
        
        const frameIndex = this.currentAnimationData.frames[this.animationFrame];
        this.setFrame(frameIndex);
        
        // Trigger frame change callback
        if (this.onFrameChange) {
            this.onFrameChange(this.animationFrame, frameIndex);
        }
        
        // Emit event
        if (this.entity) {
            this.entity.emit('animation:frame', {
                animation: this.currentAnimation,
                frame: this.animationFrame,
                frameIndex
            });
        }
    }
    
    /**
     * Called when animation completes
     */
    onAnimationComplete() {
        this.playing = false;
        
        if (this.onAnimationEnd) {
            this.onAnimationEnd(this.currentAnimation);
        }
        
        if (this.entity) {
            this.entity.emit('animation:end', {
                animation: this.currentAnimation
            });
        }
    }
    
    /**
     * Called when animation loops
     */
    onAnimationLooped() {
        if (this.onAnimationLoop) {
            this.onAnimationLoop(this.currentAnimation);
        }
        
        if (this.entity) {
            this.entity.emit('animation:loop', {
                animation: this.currentAnimation
            });
        }
    }
    
    /**
     * Set animation by checking multiple possible names
     * @param {...string} names - Animation names to try
     */
    playFirstAvailable(...names) {
        for (const name of names) {
            if (this.hasAnimation(name)) {
                this.play(name);
                return true;
            }
        }
        return false;
    }
    
    /**
     * Queue an animation to play after current one
     * @param {string} name - Animation name
     * @param {boolean} loop - Whether to loop the queued animation
     */
    queueAnimation(name, loop = true) {
        const currentEnd = this.onAnimationEnd;
        
        this.onAnimationEnd = () => {
            if (currentEnd) currentEnd(this.currentAnimation);
            
            this.setLoop(loop);
            this.play(name);
            this.onAnimationEnd = null;
        };
    }
}