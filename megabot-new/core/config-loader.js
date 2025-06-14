// config-loader.js - Handles loading and parsing configuration files

window.ConfigLoader = (function() {
    'use strict';
    
    // Default configuration as fallback
    const DEFAULT_CONFIG = {
        sprites: {
            directory: "../Sprites/Aseprite/",
            player: {
                json: "megabot.json",
                sheet: "megabot.png"
            }
        },
        game: {
            width: 800,
            height: 600,
            gravity: 0.5,
            friction: 0.1,
            maxProjectiles: 50,
            particleLimit: 200
        },
        player: {
            width: 30,
            height: 40,
            health: 100,
            maxHealth: 100,
            speed: 5,
            jumpPower: 12,
            slideSpeed: 8,
            slideHeight: 20,
            invulnerabilityTime: 60,
            maxCharge: 60,
            weapon: {
                damage: 10,
                speed: 10,
                cooldown: 10,
                size: {
                    width: 8,
                    height: 4
                }
            }
        },
        boss: {
            width: 80,
            height: 100,
            health: 200,
            maxHealth: 200,
            phases: [
                {
                    healthThreshold: 1.0,
                    speed: 2,
                    attackInterval: 80,
                    patterns: ["triple"]
                },
                {
                    healthThreshold: 0.5,
                    speed: 3,
                    attackInterval: 60,
                    patterns: ["spread", "triple"]
                }
            ],
            projectile: {
                damage: 15,
                baseSpeed: 8,
                size: {
                    width: 10,
                    height: 10
                }
            }
        },
        enemies: {
            walker: {
                width: 30,
                height: 35,
                health: 20,
                speed: 1,
                damage: 10,
                detectionRange: 300,
                scoreValue: 100
            },
            flyer: {
                width: 30,
                height: 35,
                health: 20,
                speed: 0.5,
                damage: 10,
                detectionRange: 200,
                scoreValue: 100
            },
            turret: {
                width: 40,
                height: 30,
                health: 30,
                damage: 10,
                detectionRange: 300,
                scoreValue: 100
            }
        },
        ui: {
            colors: {
                primary: "#00ff00",
                danger: "#ff0000",
                warning: "#ffff00",
                boss: "#ff00ff",
                charge: "#00ffff",
                background: "#000000"
            },
            healthBar: {
                width: 100,
                height: 10,
                borderWidth: 1
            }
        },
        particles: {
            damage: {
                count: 10,
                speed: 8,
                lifetime: 25,
                sizeRange: [2, 6]
            },
            explosion: {
                count: 30,
                speed: 8,
                lifetime: 25,
                sizeRange: [2, 6]
            },
            charge: {
                count: 15,
                speed: 8,
                lifetime: 25,
                sizeRange: [2, 6]
            }
        },
        input: {
            keyboard: {
                left: ['a', 'arrowleft'],
                right: ['d', 'arrowright'],
                jump: ['z', 'arrowup', 'w'],
                shoot: ['x'],
                slide: ['s', 'arrowdown']
            }
        },
        debug: {
            showHitboxes: false,
            showFPS: false,
            godMode: false,
            menuKey: '+'
        }
    };
    
    // Deep merge helper function
    function deepMerge(target, source) {
        const output = Object.assign({}, target);
        if (isObject(target) && isObject(source)) {
            Object.keys(source).forEach(key => {
                if (isObject(source[key])) {
                    if (!(key in target))
                        Object.assign(output, { [key]: source[key] });
                    else
                        output[key] = deepMerge(target[key], source[key]);
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    }
    
    function isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }
    
    // Load configuration from file
    async function loadConfig(filepath) {
        try {
            const response = await fetch(filepath);
            if (!response.ok) {
                throw new Error(`Failed to load config: ${response.statusText}`);
            }
            
            const userConfig = await response.json();
            
            // Merge with defaults
            const config = deepMerge(DEFAULT_CONFIG, userConfig);
            
            // Validate configuration
            validateConfig(config);
            
            // Store in window for global access
            window.gameConfig = config;
            
            return config;
            
        } catch (error) {
            console.warn('Failed to load user config, using defaults:', error);
            window.gameConfig = DEFAULT_CONFIG;
            return DEFAULT_CONFIG;
        }
    }
    
    // Validate configuration structure
    function validateConfig(config) {
        // Basic validation
        if (!config.game || typeof config.game.width !== 'number') {
            throw new Error('Invalid game configuration');
        }
        
        if (!config.player || typeof config.player.health !== 'number') {
            throw new Error('Invalid player configuration');
        }
        
        // Add more validation as needed
        return true;
    }
    
    // Get a specific configuration value with dot notation
    function getConfigValue(path, defaultValue) {
        const keys = path.split('.');
        let value = window.gameConfig;
        
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        
        return value;
    }
    
    // Update a configuration value
    function setConfigValue(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        let target = window.gameConfig;
        
        for (const key of keys) {
            if (!(key in target) || typeof target[key] !== 'object') {
                target[key] = {};
            }
            target = target[key];
        }
        
        target[lastKey] = value;
    }
    
    // Public API
    return {
        loadConfig,
        getConfigValue,
        setConfigValue,
        DEFAULT_CONFIG
    };
})();