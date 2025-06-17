// GameFramework/src/parsers/AsepriteParser.js

/**
 * AsepriteParser - Parses Aseprite JSON data
 * @class AsepriteParser
 */
export class AsepriteParser {
    /**
     * Parse Aseprite JSON data
     * @param {object|string} data - JSON data or string
     * @returns {Promise<object>} Parsed sprite data
     */
    static async parse(data) {
        // Parse JSON if string
        const jsonData = typeof data === 'string' ? JSON.parse(data) : data;
        
        // Validate data
        if (!jsonData.frames || !jsonData.meta) {
            throw new Error('Invalid Aseprite JSON format');
        }
        
        const parsed = {
            frames: this.parseFrames(jsonData.frames),
            animations: this.parseAnimations(jsonData.meta.frameTags || []),
            meta: this.parseMeta(jsonData.meta)
        };
        
        // Parse image data
        if (jsonData.meta.image) {
            parsed.imagePath = jsonData.meta.image;
            
            // Handle embedded base64 image
            if (jsonData.meta.image.startsWith('data:image/')) {
                parsed.image = await this.loadBase64Image(jsonData.meta.image);
                parsed.imageData = jsonData.meta.image;
            }
        }
        
        // Parse layers
        if (jsonData.meta.layers) {
            parsed.layers = this.parseLayers(jsonData.meta.layers);
        }
        
        // Parse slices (for 9-slice sprites)
        if (jsonData.meta.slices) {
            parsed.slices = this.parseSlices(jsonData.meta.slices);
        }
        
        return parsed;
    }
    
    /**
     * Parse frame data
     * @private
     */
    static parseFrames(framesData) {
        const frames = new Map();
        
        if (Array.isArray(framesData)) {
            // Array format
            framesData.forEach((frame, index) => {
                frames.set(index.toString(), this.parseFrame(frame, index));
            });
        } else {
            // Object format
            Object.entries(framesData).forEach(([name, frame]) => {
                frames.set(name, this.parseFrame(frame, name));
            });
        }
        
        return frames;
    }
    
    /**
     * Parse single frame
     * @private
     */
    static parseFrame(frameData, identifier) {
        return {
            name: identifier,
            x: frameData.frame.x,
            y: frameData.frame.y,
            w: frameData.frame.w,
            h: frameData.frame.h,
            duration: frameData.duration || 100,
            rotated: frameData.rotated || false,
            trimmed: frameData.trimmed || false,
            spriteSourceSize: frameData.spriteSourceSize || {
                x: 0,
                y: 0,
                w: frameData.frame.w,
                h: frameData.frame.h
            },
            sourceSize: frameData.sourceSize || {
                w: frameData.frame.w,
                h: frameData.frame.h
            }
        };
    }
    
    /**
     * Parse animation tags
     * @private
     */
    static parseAnimations(frameTags) {
        const animations = new Map();
        
        frameTags.forEach(tag => {
            animations.set(tag.name, {
                name: tag.name,
                from: tag.from,
                to: tag.to,
                direction: tag.direction || 'forward',
                repeat: tag.repeat,
                color: tag.color
            });
        });
        
        return animations;
    }
    
    /**
     * Parse metadata
     * @private
     */
    static parseMeta(meta) {
        return {
            app: meta.app || 'Aseprite',
            version: meta.version,
            image: meta.image,
            format: meta.format || 'RGBA8888',
            size: meta.size || { w: 0, h: 0 },
            scale: meta.scale || '1',
            frameTags: meta.frameTags,
            layers: meta.layers,
            slices: meta.slices
        };
    }
    
    /**
     * Parse layers
     * @private
     */
    static parseLayers(layersData) {
        return layersData.map(layer => ({
            name: layer.name,
            opacity: layer.opacity || 255,
            blendMode: layer.blendMode || 'normal',
            visible: layer.visible !== false,
            group: layer.group || null,
            parent: layer.parent || null
        }));
    }
    
    /**
     * Parse slices (9-slice data)
     * @private
     */
    static parseSlices(slicesData) {
        const slices = new Map();
        
        slicesData.forEach(slice => {
            slices.set(slice.name, {
                name: slice.name,
                color: slice.color,
                keys: slice.keys.map(key => ({
                    frame: key.frame,
                    bounds: key.bounds,
                    center: key.center,
                    pivot: key.pivot
                }))
            });
        });
        
        return slices;
    }
    
    /**
     * Load base64 image
     * @private
     */
    static loadBase64Image(base64Data) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('Failed to load base64 image'));
            
            image.src = base64Data;
        });
    }
    
    /**
     * Extract animation sequences from frame names
     * @param {Map} frames - Frame map
     * @returns {Map} Animations map
     */
    static extractAnimationsFromNames(frames) {
        const animations = new Map();
        const animationPattern = /^(.+?)(\d+)$/;
        const sequences = new Map();
        
        // Group frames by animation name
        frames.forEach((frame, name) => {
            const match = name.match(animationPattern);
            if (match) {
                const animName = match[1];
                const frameNum = parseInt(match[2]);
                
                if (!sequences.has(animName)) {
                    sequences.set(animName, []);
                }
                
                sequences.get(animName).push({
                    frame: name,
                    number: frameNum,
                    index: Array.from(frames.keys()).indexOf(name)
                });
            }
        });
        
        // Create animations from sequences
        sequences.forEach((frameList, animName) => {
            // Sort by frame number
            frameList.sort((a, b) => a.number - b.number);
            
            animations.set(animName, {
                name: animName,
                from: frameList[0].index,
                to: frameList[frameList.length - 1].index,
                direction: 'forward'
            });
        });
        
        return animations;
    }
    
    /**
     * Convert Aseprite data to sprite sheet format
     * @param {object} asepriteData - Parsed Aseprite data
     * @returns {object} Sprite sheet data
     */
    static toSpriteSheet(asepriteData) {
        const frames = [];
        const animations = {};
        
        // Convert frames
        asepriteData.frames.forEach((frame, key) => {
            frames.push({
                name: frame.name || key,
                x: frame.x,
                y: frame.y,
                width: frame.w,
                height: frame.h,
                duration: frame.duration
            });
        });
        
        // Convert animations
        asepriteData.animations.forEach((anim, name) => {
            animations[name] = {
                frames: [],
                durations: [],
                loop: anim.repeat !== 0
            };
            
            for (let i = anim.from; i <= anim.to; i++) {
                animations[name].frames.push(i);
                const frame = Array.from(asepriteData.frames.values())[i];
                animations[name].durations.push(frame.duration);
            }
        });
        
        return {
            frames,
            animations,
            image: asepriteData.imagePath,
            meta: {
                width: asepriteData.meta.size.w,
                height: asepriteData.meta.size.h
            }
        };
    }
}