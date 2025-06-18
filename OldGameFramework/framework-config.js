// GameFramework/framework-config.js - Framework configuration and asset paths (Enhanced Audio Support)

// Framework configuration (global)
if (typeof window !== 'undefined' && !window.FRAMEWORK_CONFIG) {
    window.FRAMEWORK_CONFIG = {
        // Asset path configuration (relative to server root)
        paths: {
            // Base path for all framework assets
            base: '/GameAssets/',
            
            // Sprite assets - Aseprite JSON format with embedded base64 images
            sprites: '/GameAssets/Sprites/Aseprite/',
            
            // Audio assets - Enhanced structure
            audio: {
                base: '/GameAssets/Audio/',
                music: '/GameAssets/Audio/Music/',
                sfx: '/GameAssets/Audio/SFX/',
                voice: '/GameAssets/Audio/Voice/',
                ambient: '/GameAssets/Audio/Ambient/',
                ui: '/GameAssets/Audio/UI/'
            },
            
            // Shader assets
            shaders: {
                base: '/GameAssets/Shaders/',
                vertex: '/GameAssets/Shaders/vertex/',
                fragment: '/GameAssets/Shaders/fragment/'
            },
            
            // Font assets
            fonts: '/GameAssets/Fonts/',
            
            // Data files (JSON, XML, etc.)
            data: {
                base: '/GameAssets/Data/',
                levels: '/GameAssets/Data/Levels/',
                configs: '/GameAssets/Data/Configs/',
                gamedata: '/GameAssets/Data/GameData/',
                saves: '/GameAssets/Data/Saves/'
            },
            
            // Texture atlases
            atlases: '/GameAssets/Atlases/',
            
            // Video assets
            videos: '/GameAssets/Videos/'
        },
        
        // Asset type configuration
        assetTypes: {
            sprites: {
                defaultFormat: 'aseprite',
                supportedFormats: ['json', 'png', 'jpg', 'webp'],
                defaultExtension: '.json',
                namingConvention: 'lowercase_underscore'
            },
            
            audio: {
                // Supported formats in order of preference
                supportedFormats: ['ogg', 'mp3', 'wav', 'm4a', 'aac'],
                defaultFormat: 'ogg',
                
                // Default volumes by category
                defaultVolumes: {
                    music: 0.7,
                    sfx: 0.8,
                    voice: 0.9,
                    ambient: 0.5,
                    ui: 0.6
                },
                
                // Default audio configurations by category
                presets: {
                    music: {
                        category: 'music',
                        loop: true,
                        volume: 0.7,
                        maxInstances: 1
                    },
                    sfx: {
                        category: 'sfx',
                        loop: false,
                        volume: 0.8,
                        maxInstances: 3
                    },
                    ambient: {
                        category: 'ambient',
                        loop: true,
                        volume: 0.5,
                        maxInstances: 2
                    },
                    ui: {
                        category: 'ui',
                        loop: false,
                        volume: 0.6,
                        maxInstances: 2
                    },
                    voice: {
                        category: 'voice',
                        loop: false,
                        volume: 0.9,
                        maxInstances: 1
                    }
                },
                
                // Audio system configuration
                system: {
                    maxTotalInstances: 32,
                    enableWebAudio: true,
                    enableFallback: true,
                    crossfadeTime: 1.0,
                    fadeInTime: 0.5,
                    fadeOutTime: 0.5
                }
            }
        },
        
        // Asset loading behavior
        loading: {
            showProgress: true,
            retryAttempts: 3,
            retryDelay: 1000,
            maxConcurrentLoads: 6,
            validatePaths: true,
            enableCaching: true,
            
            // Audio-specific loading options
            audio: {
                enablePreloading: true,
                preloadMostCommon: true,
                lazyLoadMusic: false,
                enableStreaming: false // For future large audio files
            }
        },
        
        // Aseprite sprite processing
        sprites: {
            defaultAnimation: {
                speed: 1.0,
                loop: true,
                autoPlay: false
            },
            rendering: {
                pixelPerfect: true,
                defaultScale: 1.0,
                maxScale: 8.0,
                smoothing: false
            }
        },
        
        // Audio system configuration
        audio: {
            // Web Audio API settings
            webAudio: {
                bufferSize: 2048,
                enableDynamics: true,
                enableEffects: false,
                sampleRate: 44100
            },
            
            // Fallback HTML5 Audio settings
            htmlAudio: {
                preload: 'auto',
                enablePolyphony: false
            },
            
            // Performance settings
            performance: {
                maxConcurrentSounds: 16,
                enableGarbageCollection: true,
                gcInterval: 30000, // 30 seconds
                poolSize: 10
            },
            
            // User experience settings
            ux: {
                requireUserGesture: true,
                showAudioPermissionPrompt: true,
                gracefulDegradation: true,
                mutedByDefault: false
            }
        },
        
        // Common audio asset definitions (can be overridden by games)
        commonAssets: {
            audio: {
                ui: [
                    { id: 'click', filename: 'click', preset: 'ui' },
                    { id: 'hover', filename: 'hover', preset: 'ui' },
                    { id: 'select', filename: 'select', preset: 'ui' },
                    { id: 'back', filename: 'back', preset: 'ui' },
                    { id: 'error', filename: 'error', preset: 'ui' },
                    { id: 'success', filename: 'success', preset: 'ui' }
                ],
                gameplay: [
                    { id: 'jump', filename: 'jump', preset: 'sfx' },
                    { id: 'hit', filename: 'hit', preset: 'sfx' },
                    { id: 'collect', filename: 'collect', preset: 'sfx' },
                    { id: 'powerup', filename: 'powerup', preset: 'sfx' },
                    { id: 'hurt', filename: 'hurt', preset: 'sfx' },
                    { id: 'death', filename: 'death', preset: 'sfx' }
                ]
            }
        }
    };
}

// Audio utility functions
if (typeof window !== 'undefined') {
    window.FRAMEWORK_CONFIG.getAudioPath = function(category, filename) {
        const audioPaths = this.paths.audio;
        let basePath;
        
        switch (category) {
            case 'music':
                basePath = audioPaths.music || audioPaths.base;
                break;
            case 'voice':
                basePath = audioPaths.voice || audioPaths.base;
                break;
            case 'ambient':
                basePath = audioPaths.ambient || audioPaths.base;
                break;
            case 'ui':
                basePath = audioPaths.ui || audioPaths.base;
                break;
            default:
                basePath = audioPaths.sfx || audioPaths.base;
        }
        
        return basePath + filename;
    };
    
    window.FRAMEWORK_CONFIG.getAudioPreset = function(presetName) {
        return this.assetTypes.audio.presets[presetName] || null;
    };
    
    window.FRAMEWORK_CONFIG.getAllAudioPresets = function() {
        return Object.keys(this.assetTypes.audio.presets);
    };
    
    window.FRAMEWORK_CONFIG.createCustomAudioPreset = function(name, config) {
        this.assetTypes.audio.presets[name] = config;
        console.log(`🎵 Created custom audio preset: ${name}`);
    };
}

console.log('📋 Framework configuration loaded with enhanced audio support');
console.log('🎵 Available audio presets:', Object.keys(window.FRAMEWORK_CONFIG.assetTypes.audio.presets));