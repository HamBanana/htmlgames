// GameFramework/src/utils/DebugUtils.js

/**
 * DebugUtils - Debugging utilities and tools
 */
export const DebugUtils = {
    /**
     * Debug configuration
     */
    config: {
        enabled: false,
        logLevel: 'info', // error, warn, info, debug, verbose
        showTimestamps: true,
        showPerformance: true,
        profileEnabled: false,
        maxLogHistory: 100
    },
    
    /**
     * Log history
     */
    logHistory: [],
    
    /**
     * Performance profiles
     */
    profiles: new Map(),
    
    /**
     * Initialize debug utilities
     * @param {object} config - Debug configuration
     */
    init(config = {}) {
        Object.assign(this.config, config);
        
        if (this.config.enabled) {
            this.setupConsoleOverrides();
            this.setupErrorHandlers();
        }
    },
    
    /**
     * Setup console overrides
     * @private
     */
    setupConsoleOverrides() {
        const originalLog = console.log;
        const originalWarn = console.warn;
        const originalError = console.error;
        
        console.log = (...args) => {
            this.log('info', ...args);
            originalLog.apply(console, args);
        };
        
        console.warn = (...args) => {
            this.log('warn', ...args);
            originalWarn.apply(console, args);
        };
        
        console.error = (...args) => {
            this.log('error', ...args);
            originalError.apply(console, args);
        };
    },
    
    /**
     * Setup error handlers
     * @private
     */
    setupErrorHandlers() {
        window.addEventListener('error', (event) => {
            this.log('error', 'Uncaught error:', {
                message: event.message,
                source: event.filename,
                line: event.lineno,
                column: event.colno,
                error: event.error
            });
        });
        
        window.addEventListener('unhandledrejection', (event) => {
            this.log('error', 'Unhandled promise rejection:', event.reason);
        });
    },
    
    /**
     * Log message
     * @param {string} level - Log level
     * @param {...any} args - Log arguments
     */
    log(level, ...args) {
        const levels = ['error', 'warn', 'info', 'debug', 'verbose'];
        const currentLevelIndex = levels.indexOf(this.config.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        
        if (messageLevelIndex > currentLevelIndex) return;
        
        const logEntry = {
            level,
            timestamp: Date.now(),
            message: args.map(arg => this.stringify(arg)).join(' ')
        };
        
        this.logHistory.push(logEntry);
        
        if (this.logHistory.length > this.config.maxLogHistory) {
            this.logHistory.shift();
        }
    },
    
    /**
     * Stringify value for logging
     * @private
     */
    stringify(value) {
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        if (typeof value === 'string') return value;
        if (typeof value === 'number' || typeof value === 'boolean') return value.toString();
        if (value instanceof Error) return value.stack || value.message;
        
        try {
            return JSON.stringify(value, null, 2);
        } catch (e) {
            return value.toString();
        }
    },
    
    /**
     * Assert condition
     * @param {boolean} condition - Condition to assert
     * @param {string} message - Error message
     */
    assert(condition, message) {
        if (!condition) {
            const error = new Error(`Assertion failed: ${message}`);
            this.log('error', error);
            throw error;
        }
    },
    
    /**
     * Start performance profile
     * @param {string} name - Profile name
     */
    profileStart(name) {
        if (!this.config.profileEnabled) return;
        
        this.profiles.set(name, {
            startTime: performance.now(),
            marks: []
        });
    },
    
    /**
     * Mark performance profile
     * @param {string} name - Profile name
     * @param {string} mark - Mark name
     */
    profileMark(name, mark) {
        if (!this.config.profileEnabled) return;
        
        const profile = this.profiles.get(name);
        if (!profile) return;
        
        profile.marks.push({
            name: mark,
            time: performance.now() - profile.startTime
        });
    },
    
    /**
     * End performance profile
     * @param {string} name - Profile name
     * @returns {object} Profile results
     */
    profileEnd(name) {
        if (!this.config.profileEnabled) return null;
        
        const profile = this.profiles.get(name);
        if (!profile) return null;
        
        const endTime = performance.now();
        const duration = endTime - profile.startTime;
        
        const result = {
            name,
            duration,
            marks: profile.marks,
            average: profile.marks.length > 0 
                ? profile.marks.reduce((sum, mark) => sum + mark.time, 0) / profile.marks.length
                : 0
        };
        
        this.profiles.delete(name);
        this.log('debug', `Profile ${name}:`, result);
        
        return result;
    },
    
    /**
     * Measure function performance
     * @param {Function} fn - Function to measure
     * @param {string} name - Measurement name
     * @returns {*} Function result
     */
    measure(fn, name = 'anonymous') {
        const start = performance.now();
        
        try {
            const result = fn();
            const duration = performance.now() - start;
            
            this.log('debug', `${name} took ${duration.toFixed(2)}ms`);
            
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.log('error', `${name} failed after ${duration.toFixed(2)}ms:`, error);
            throw error;
        }
    },
    
    /**
     * Create debug overlay
     * @param {GameEngine} engine - Game engine instance
     * @returns {object} Debug overlay
     */
    createOverlay(engine) {
        const overlay = {
            visible: true,
            panels: new Map(),
            
            addPanel(name, panel) {
                this.panels.set(name, panel);
            },
            
            removePanel(name) {
                this.panels.delete(name);
            },
            
            update(deltaTime) {
                this.panels.forEach(panel => {
                    if (panel.update) panel.update(deltaTime);
                });
            },
            
            render(context) {
                if (!this.visible) return;
                
                let y = 10;
                
                this.panels.forEach(panel => {
                    if (panel.render) {
                        context.save();
                        context.translate(10, y);
                        const height = panel.render(context) || 100;
                        context.restore();
                        y += height + 10;
                    }
                });
            }
        };
        
        // Add default panels
        overlay.addPanel('fps', this.createFPSPanel(engine));
        overlay.addPanel('stats', this.createStatsPanel(engine));
        overlay.addPanel('input', this.createInputPanel(engine));
        
        return overlay;
    },
    
    /**
     * Create FPS panel
     * @private
     */
    createFPSPanel(engine) {
        return {
            fps: 0,
            frameTime: 0,
            frames: 0,
            lastUpdate: 0,
            
            update(deltaTime) {
                this.frames++;
                
                const now = Date.now();
                if (now - this.lastUpdate >= 1000) {
                    this.fps = this.frames;
                    this.frames = 0;
                    this.lastUpdate = now;
                }
                
                this.frameTime = deltaTime * 1000;
            },
            
            render(context) {
                context.fillStyle = 'rgba(0, 0, 0, 0.8)';
                context.fillRect(0, 0, 150, 50);
                
                context.fillStyle = '#00ff00';
                context.font = '14px monospace';
                context.fillText(`FPS: ${this.fps}`, 5, 20);
                context.fillText(`Frame: ${this.frameTime.toFixed(2)}ms`, 5, 40);
                
                return 50;
            }
        };
    },
    
    /**
     * Create stats panel
     * @private
     */
    createStatsPanel(engine) {
        return {
            render(context) {
                const scene = engine.activeScene;
                if (!scene) return 0;
                
                const entities = scene.entities.size;
                const systems = engine.systems.size;
                
                context.fillStyle = 'rgba(0, 0, 0, 0.8)';
                context.fillRect(0, 0, 150, 70);
                
                context.fillStyle = '#00ff00';
                context.font = '14px monospace';
                context.fillText(`Entities: ${entities}`, 5, 20);
                context.fillText(`Systems: ${systems}`, 5, 40);
                context.fillText(`Scene: ${scene.name}`, 5, 60);
                
                return 70;
            }
        };
    },
    
    /**
     * Create input panel
     * @private
     */
    createInputPanel(engine) {
        return {
            render(context) {
                const input = engine.getSystem('input');
                if (!input) return 0;
                
                const mouse = input.getMousePosition();
                const keys = Array.from(input.keys.entries())
                    .filter(([key, pressed]) => pressed)
                    .map(([key]) => key);
                
                context.fillStyle = 'rgba(0, 0, 0, 0.8)';
                context.fillRect(0, 0, 200, 90);
                
                context.fillStyle = '#00ff00';
                context.font = '14px monospace';
                context.fillText(`Mouse: ${Math.round(mouse.x)}, ${Math.round(mouse.y)}`, 5, 20);
                context.fillText(`Keys: ${keys.length}`, 5, 40);
                
                if (keys.length > 0) {
                    context.font = '12px monospace';
                    context.fillText(keys.slice(0, 3).join(', '), 5, 60);
                    if (keys.length > 3) {
                        context.fillText(`... +${keys.length - 3} more`, 5, 80);
                    }
                }
                
                return 90;
            }
        };
    },
    
    /**
     * Draw collision bounds
     * @param {CanvasRenderingContext2D} context - Canvas context
     * @param {Entity} entity - Entity to draw bounds for
     * @param {string} color - Outline color
     */
    drawBounds(context, entity, color = '#00ff00') {
        const collider = entity.getComponent('Collider');
        if (!collider) return;
        
        const bounds = collider.getBounds();
        
        context.save();
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.setLineDash([5, 5]);
        
        context.strokeRect(
            bounds.x - entity.position.x,
            bounds.y - entity.position.y,
            bounds.width,
            bounds.height
        );
        
        context.restore();
    },
    
    /**
     * Draw entity info
     * @param {CanvasRenderingContext2D} context - Canvas context
     * @param {Entity} entity - Entity to draw info for
     */
    drawEntityInfo(context, entity) {
        context.save();
        
        // Background
        context.fillStyle = 'rgba(0, 0, 0, 0.8)';
        context.fillRect(-50, -60, 100, 40);
        
        // Text
        context.fillStyle = '#ffffff';
        context.font = '10px monospace';
        context.textAlign = 'center';
        context.fillText(entity.name || entity.id, 0, -45);
        context.fillText(`(${Math.round(entity.position.x)}, ${Math.round(entity.position.y)})`, 0, -30);
        
        context.restore();
    },
    
    /**
     * Create performance graph
     * @param {number} width - Graph width
     * @param {number} height - Graph height
     * @param {number} maxValue - Maximum value
     * @returns {object} Graph object
     */
    createGraph(width = 200, height = 100, maxValue = 60) {
        const values = new Array(width).fill(0);
        let index = 0;
        
        return {
            width,
            height,
            maxValue,
            values,
            
            addValue(value) {
                values[index] = value;
                index = (index + 1) % width;
            },
            
            render(context, x = 0, y = 0) {
                context.save();
                
                // Background
                context.fillStyle = 'rgba(0, 0, 0, 0.8)';
                context.fillRect(x, y, width, height);
                
                // Grid
                context.strokeStyle = 'rgba(255, 255, 255, 0.1)';
                context.lineWidth = 1;
                
                for (let i = 0; i <= 4; i++) {
                    const lineY = y + (height / 4) * i;
                    context.beginPath();
                    context.moveTo(x, lineY);
                    context.lineTo(x + width, lineY);
                    context.stroke();
                }
                
                // Graph
                context.strokeStyle = '#00ff00';
                context.lineWidth = 2;
                context.beginPath();
                
                for (let i = 0; i < width; i++) {
                    const valueIndex = (index + i) % width;
                    const value = values[valueIndex];
                    const normalizedValue = Math.min(value / maxValue, 1);
                    const graphY = y + height - (normalizedValue * height);
                    
                    if (i === 0) {
                        context.moveTo(x + i, graphY);
                    } else {
                        context.lineTo(x + i, graphY);
                    }
                }
                
                context.stroke();
                
                // Current value
                const currentValue = values[(index - 1 + width) % width];
                context.fillStyle = '#ffffff';
                context.font = '12px monospace';
                context.fillText(currentValue.toFixed(1), x + 5, y + 15);
                
                context.restore();
            }
        };
    },
    
    /**
     * Export debug data
     * @returns {object} Debug data
     */
    exportData() {
        return {
            config: this.config,
            logHistory: this.logHistory,
            profiles: Array.from(this.profiles.entries()),
            timestamp: Date.now()
        };
    },
    
    /**
     * Clear debug data
     */
    clear() {
        this.logHistory = [];
        this.profiles.clear();
    }
};