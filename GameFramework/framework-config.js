// GameFramework/framework-config.js - Framework configuration and asset paths

// Framework configuration (global)
if (typeof window !== 'undefined' && !window.FRAMEWORK_CONFIG) {
    window.FRAMEWORK_CONFIG = {
        // Asset path configuration (relative to server root)
        paths: {
            // Base path for all framework assets
            base: '/GameAssets/',
            
            // Sprite assets - Aseprite JSON format with embedded base64 images
            sprites: '/GameAssets/Sprites/Aseprite/',
            
            // Audio assets
            audio: {
                base: '/GameAssets/Audio/',
                music: '/GameAssets/Audio/Music/',
                sfx: '/GameAssets/Audio/SFX/'
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
                supportedFormats: ['ogg', 'mp3', 'wav', 'm4a'],
                defaultFormat: 'ogg',
                defaultVolumes: {
                    music: 0.7,
                    sfx: 0.8,
                    voice: 0.9
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
            enableCaching: true
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
        }
    };
}

console.log('📋 Framework configuration loaded');