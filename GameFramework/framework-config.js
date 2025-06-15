// framework-config.js - Framework path configuration and asset loading system

/**
 * Framework Path Configuration
 * Defines WHERE to find different types of assets, but not WHICH assets to load
 * The game will decide which specific assets it needs
 */
const FRAMEWORK_CONFIG = {
    // Asset path configuration (relative to gameframework.js file)
    paths: {
        // Base path for all assets
        base: 'Assets/',
        
        // Sprite assets - Aseprite JSON format with embedded base64 images
        sprites: 'Assets/Sprites/Aseprite/',
        
        // Audio assets
        audio: {
            base: 'Assets/Audio/',
            music: 'Assets/Audio/Music/',
            sfx: 'Assets/Audio/SFX/'
        },
        
        // Shader assets
        shaders: {
            base: 'Assets/Shaders/',
            vertex: 'Assets/Shaders/vertex/',
            fragment: 'Assets/Shaders/fragment/'
        },
        
        // Font assets
        fonts: 'Assets/Fonts/',
        
        // Data files (JSON, XML, etc.)
        data: {
            base: 'Assets/Data/',
            levels: 'Assets/Data/Levels/',
            configs: 'Assets/Data/Configs/',
            gamedata: 'Assets/Data/GameData/',
            saves: 'Assets/Data/Saves/'
        },
        
        // Texture atlases
        atlases: 'Assets/Atlases/',
        
        // Video assets
        videos: 'Assets/Videos/'
    },
    
    // Asset type configuration
    assetTypes: {
        // Sprite configuration
        sprites: {
            // Primary format for sprites
            defaultFormat: 'aseprite',
            // Supported formats
            supportedFormats: ['json', 'png', 'jpg', 'webp'],
            // Default extension for Aseprite files
            defaultExtension: '.json',
            // File naming convention
            namingConvention: 'lowercase_underscore'
        },
        
        // Audio configuration
        audio: {
            // Supported audio formats (in preference order)
            supportedFormats: ['ogg', 'mp3', 'wav', 'm4a'],
            // Default format to try first
            defaultFormat: 'ogg',
            // Volume defaults
            defaultVolumes: {
                music: 0.7,
                sfx: 0.8,
                voice: 0.9
            }
        },
        
        // Shader configuration
        shaders: {
            // Shader file extensions
            vertexExtension: '.vert',
            fragmentExtension: '.frag',
            // Supported shader languages
            supportedLanguages: ['glsl', 'hlsl']
        },
        
        // Font configuration
        fonts: {
            // Supported font formats (in preference order)
            supportedFormats: ['woff2', 'woff', 'ttf', 'otf'],
            // Default sizes to preload
            defaultSizes: [12, 16, 20, 24, 32]
        },
        
        // Data file configuration
        data: {
            // Supported data formats
            supportedFormats: ['json', 'xml', 'csv', 'txt'],
            // Default format
            defaultFormat: 'json'
        }
    },
    
    // Asset loading behavior
    loading: {
        // Show loading progress in console
        showProgress: true,
        
        // Retry failed loads
        retryAttempts: 3,
        retryDelay: 1000,
        
        // Parallel loading limit
        maxConcurrentLoads: 6,
        
        // Validate file existence before loading
        validatePaths: true,
        
        // Cache loaded assets
        enableCaching: true,
        
        // Preload commonly used assets
        preloadCommon: false  // Game decides what to preload
    },
    
    // Aseprite sprite processing
    sprites: {
        // Default animation settings
        defaultAnimation: {
            speed: 1.0,
            loop: true,
            autoPlay: false,  // Game decides when to play
            blendTime: 0.1
        },
        
        // Rendering configuration
        rendering: {
            pixelPerfect: true,
            defaultScale: 1.0,
            maxScale: 8.0,
            smoothing: false,
            alphaTest: 0.01
        },
        
        // Optimization settings
        optimization: {
            cacheFrames: true,
            precalculateTimings: true,
            deduplicateFrames: true
        },
        
        // Validation for Aseprite files
        validation: {
            requireMeta: true,
            requireFrames: true,
            validateBase64: true,
            validateAnimations: true
        }
    },
    
    // Audio processing
    audio: {
        // Audio format preferences
        formatPreference: ['ogg', 'mp3', 'wav'],
        
        // Processing options
        processing: {
            normalize: true,
            compression: 'auto'
        },
        
        // Pooling for sound effects
        pooling: {
            enabled: true,
            defaultPoolSize: 5,
            maxPoolSize: 20
        }
    },
    
    // Performance optimization
    optimization: {
        // Asset caching
        caching: {
            enabled: true,
            maxCacheSize: '100MB',
            compression: true
        },
        
        // Texture settings
        textures: {
            generateMipmaps: false,
            powerOfTwo: false,
            maxTextureSize: 2048
        },
        
        // Memory management
        memory: {
            autoCleanup: true,
            cleanupInterval: 30000,
            maxUnusedTime: 60000
        }
    },
    
    // Development tools
    development: {
        // Asset validation
        validation: {
            enabled: true,
            strictMode: false,
            logMissingAssets: true,
            logLoadTimes: true
        },
        
        // Hot reloading
        hotReload: {
            enabled: false,
            watchPaths: ['../Sprites/', '../Audio/', '../Data/'],
            reloadDelay: 500
        },
        
        // Asset inspector
        inspector: {
            enabled: false,
            showAssetList: true,
            showLoadTimes: true,
            showMemoryUsage: true
        }
    }
};

/**
 * Asset Loader - Framework service for loading assets
 * Games call these methods to load their chosen assets
 */
class AssetLoader {
    constructor(framework) {
        this.framework = framework;
        this.config = FRAMEWORK_CONFIG;
        
        // Asset storage
        this.loadedAssets = new Map();
        this.loadingPromises = new Map();
        
        // Asset pools for reusable assets
        this.audioPools = new Map();
        
        // Loading statistics
        this.loadStats = {
            totalRequested: 0,
            totalLoaded: 0,
            totalFailed: 0,
            loadTimes: new Map()
        };
    }
    
    /**
     * Initialize the asset loader
     */
    async initialize() {
        console.log('🔧 Framework Asset Loader initialized');
        
        if (this.config.development.hotReload.enabled) {
            this.setupHotReload();
        }
    }
    
    /**
     * Load a sprite by filename
     * Game specifies which sprite file to load
     */
    async loadSprite(assetId, filename) {
        const path = this.config.paths.sprites + filename;
        
        if (this.loadedAssets.has(assetId)) {
            return this.loadedAssets.get(assetId);
        }
        
        if (this.loadingPromises.has(assetId)) {
            return this.loadingPromises.get(assetId);
        }
        
        console.log(`📦 Loading sprite: ${assetId} from ${filename}`);
        
        const loadPromise = this.doLoadSprite(assetId, path);
        this.loadingPromises.set(assetId, loadPromise);
        
        try {
            const startTime = performance.now();
            const spriteData = await loadPromise;
            const loadTime = performance.now() - startTime;
            
            this.loadedAssets.set(assetId, spriteData);
            this.loadStats.totalLoaded++;
            this.loadStats.loadTimes.set(assetId, loadTime);
            
            if (this.config.development.validation.logLoadTimes) {
                console.log(`  ✅ Loaded in ${loadTime.toFixed(2)}ms`);
            }
            
            // Emit event for games to listen to
            this.framework.events.emit('asset:loaded', {
                type: 'sprite',
                id: assetId,
                filename: filename,
                loadTime: loadTime
            });
            
            return spriteData;
        } catch (error) {
            this.loadStats.totalFailed++;
            console.error(`❌ Failed to load sprite ${assetId}:`, error);
            this.loadingPromises.delete(assetId);
            throw error;
        }
    }
    
    /**
     * Actually load the sprite file
     */
    async doLoadSprite(assetId, path) {
        const renderer = this.framework.getSystem('renderer');
        if (!renderer) {
            throw new Error('Renderer system not available');
        }
        
        // All sprites are assumed to be Aseprite JSON format
        const spriteData = await renderer.loadAseprite(assetId, path);
        
        // Apply framework configuration
        if (spriteData.animations.size > 0) {
            spriteData.defaultAnimationConfig = this.config.sprites.defaultAnimation;
            
            if (this.config.development.validation.enabled) {
                const animNames = Array.from(spriteData.animations.keys());
                console.log(`  📋 Animations: ${animNames.join(', ')}`);
            }
        }
        
        spriteData.renderConfig = this.config.sprites.rendering;
        return spriteData;
    }
    
    /**
     * Load audio by filename
     */
    async loadAudio(assetId, filename, type = 'sfx') {
        const basePath = type === 'music' ? this.config.paths.audio.music : this.config.paths.audio.sfx;
        const path = basePath + filename;
        
        if (this.loadedAssets.has(assetId)) {
            return this.loadedAssets.get(assetId);
        }
        
        console.log(`🔊 Loading audio: ${assetId} from ${filename}`);
        
        try {
            const audio = this.framework.getSystem('audio');
            if (!audio) {
                throw new Error('Audio system not available');
            }
            
            const audioAsset = await audio.loadSound(assetId, path);
            this.loadedAssets.set(assetId, audioAsset);
            
            // Create audio pool for SFX
            if (type === 'sfx' && this.config.audio.pooling.enabled) {
                this.createAudioPool(assetId, audioAsset);
            }
            
            this.framework.events.emit('asset:loaded', {
                type: 'audio',
                id: assetId,
                filename: filename,
                audioType: type
            });
            
            return audioAsset;
        } catch (error) {
            console.error(`❌ Failed to load audio ${assetId}:`, error);
            throw error;
        }
    }
    
    /**
     * Load shader by filenames
     */
    async loadShader(assetId, vertexFile, fragmentFile) {
        const vertexPath = this.config.paths.shaders.vertex + vertexFile;
        const fragmentPath = this.config.paths.shaders.fragment + fragmentFile;
        
        console.log(`🎨 Loading shader: ${assetId}`);
        
        try {
            const [vertexSource, fragmentSource] = await Promise.all([
                fetch(vertexPath).then(r => r.text()),
                fetch(fragmentPath).then(r => r.text())
            ]);
            
            const shaderData = {
                vertex: vertexSource,
                fragment: fragmentSource,
                id: assetId
            };
            
            this.loadedAssets.set(assetId, shaderData);
            
            this.framework.events.emit('asset:loaded', {
                type: 'shader',
                id: assetId,
                vertexFile: vertexFile,
                fragmentFile: fragmentFile
            });
            
            return shaderData;
        } catch (error) {
            console.error(`❌ Failed to load shader ${assetId}:`, error);
            throw error;
        }
    }
    
    /**
     * Load font by filename
     */
    async loadFont(assetId, filename) {
        const path = this.config.paths.fonts + filename;
        
        console.log(`🔤 Loading font: ${assetId} from ${filename}`);
        
        try {
            const font = new FontFace(assetId, `url(${path})`);
            await font.load();
            document.fonts.add(font);
            
            const fontData = {
                family: assetId,
                filename: filename,
                loaded: true
            };
            
            this.loadedAssets.set(assetId, fontData);
            
            this.framework.events.emit('asset:loaded', {
                type: 'font',
                id: assetId,
                filename: filename
            });
            
            return fontData;
        } catch (error) {
            console.error(`❌ Failed to load font ${assetId}:`, error);
            throw error;
        }
    }
    
    /**
     * Load data file by filename
     */
    async loadData(assetId, filename, dataType = 'gamedata') {
        let basePath;
        switch (dataType) {
            case 'level':
                basePath = this.config.paths.data.levels;
                break;
            case 'config':
                basePath = this.config.paths.data.configs;
                break;
            case 'save':
                basePath = this.config.paths.data.saves;
                break;
            default:
                basePath = this.config.paths.data.gamedata;
        }
        
        const path = basePath + filename;
        
        console.log(`📄 Loading data: ${assetId} from ${filename}`);
        
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            let data;
            if (filename.endsWith('.json')) {
                data = await response.json();
            } else {
                data = await response.text();
            }
            
            this.loadedAssets.set(assetId, data);
            
            this.framework.events.emit('asset:loaded', {
                type: 'data',
                id: assetId,
                filename: filename,
                dataType: dataType
            });
            
            return data;
        } catch (error) {
            console.error(`❌ Failed to load data ${assetId}:`, error);
            throw error;
        }
    }
    
    /**
     * Batch load multiple assets
     */
    async loadAssets(assetList) {
        console.log(`📦 Batch loading ${assetList.length} assets...`);
        
        const loadPromises = assetList.map(asset => {
            switch (asset.type) {
                case 'sprite':
                    return this.loadSprite(asset.id, asset.file);
                case 'audio':
                    return this.loadAudio(asset.id, asset.file, asset.audioType);
                case 'shader':
                    return this.loadShader(asset.id, asset.vertexFile, asset.fragmentFile);
                case 'font':
                    return this.loadFont(asset.id, asset.file);
                case 'data':
                    return this.loadData(asset.id, asset.file, asset.dataType);
                default:
                    console.warn(`Unknown asset type: ${asset.type}`);
                    return Promise.resolve(null);
            }
        });
        
        const results = await Promise.allSettled(loadPromises);
        
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        console.log(`✅ Batch load complete: ${successful} successful, ${failed} failed`);
        
        return results;
    }
    
    /**
     * Create audio pool for sound effects
     */
    createAudioPool(assetId, audioAsset) {
        const poolSize = this.config.audio.pooling.defaultPoolSize;
        const pool = [];
        
        for (let i = 0; i < poolSize; i++) {
            pool.push({
                asset: audioAsset,
                playing: false,
                source: null
            });
        }
        
        this.audioPools.set(assetId, pool);
    }
    
    /**
     * Get loaded asset
     */
    getAsset(assetId) {
        return this.loadedAssets.get(assetId);
    }
    
    /**
     * Check if asset is loaded
     */
    hasAsset(assetId) {
        return this.loadedAssets.has(assetId);
    }
    
    /**
     * Get loading statistics
     */
    getStats() {
        return {
            ...this.loadStats,
            loadedAssets: Array.from(this.loadedAssets.keys())
        };
    }
    
    /**
     * Play sound effect using audio pool
     */
    playSFX(assetId, options = {}) {
        const pool = this.audioPools.get(assetId);
        if (!pool) {
            // Fallback to direct audio system
            const audio = this.framework.getSystem('audio');
            return audio?.playSound(assetId, options);
        }
        
        // Find available audio instance in pool
        const available = pool.find(instance => !instance.playing);
        if (available) {
            available.playing = true;
            const audio = this.framework.getSystem('audio');
            const source = audio.playSound(assetId, options);
            
            if (source) {
                available.source = source;
                source.onended = () => {
                    available.playing = false;
                    available.source = null;
                };
            }
            
            return source;
        }
    }
    
    /**
     * Setup hot reload (development feature)
     */
    setupHotReload() {
        console.log('🔥 Hot reload enabled for assets');
        // Implementation would depend on development setup
    }
}

/**
 * Enhanced GameFramework with Asset Loader
 */
class GameFramework {
    constructor(userConfig = {}) {
        this.config = this.mergeConfigs(FRAMEWORK_CONFIG, userConfig);
        this.assetLoader = new AssetLoader(this);
        this.canvas = null;
        this.context = null;
        this.running = false;
        this.paused = false;
        
        // Core systems
        this.systems = new Map();
        this.entities = new Map();
        this.scenes = new Map();
        this.currentScene = null;
        
        // Event system
        this.events = new EventEmitter();
        
        // Performance monitoring
        this.performanceMonitor = new PerformanceMonitor();
    }
    
    /**
     * Initialize framework
     */
    async initialize(canvasId = 'gameCanvas') {
        console.log('🚀 Initializing GameFramework...');
        
        // Setup canvas
        await this.setupCanvas(canvasId);
        
        // Initialize core systems
        this.initializeSystems();
        
        // Initialize asset loader
        await this.assetLoader.initialize();
        
        console.log('✅ GameFramework initialized');
        this.events.emit('framework:initialized');
        
        return this;
    }
    
    /**
     * Load sprite - game decides which sprite file to load
     */
    async loadSprite(assetId, filename) {
        return this.assetLoader.loadSprite(assetId, filename);
    }
    
    /**
     * Load audio - game decides which audio file to load
     */
    async loadAudio(assetId, filename, type = 'sfx') {
        return this.assetLoader.loadAudio(assetId, filename, type);
    }
    
    /**
     * Load multiple assets - game provides the list
     */
    async loadAssets(assetList) {
        return this.assetLoader.loadAssets(assetList);
    }
    
    /**
     * Get loaded asset
     */
    getAsset(assetId) {
        return this.assetLoader.getAsset(assetId);
    }
    
    /**
     * Check if asset is loaded
     */
    hasAsset(assetId) {
        return this.assetLoader.hasAsset(assetId);
    }
    
    /**
     * Play sound effect
     */
    playSFX(assetId, options = {}) {
        return this.assetLoader.playSFX(assetId, options);
    }
    
    /**
     * Create entity with loaded sprite
     */
    createSpriteEntity(assetId, config = {}) {
        if (!this.hasAsset(assetId)) {
            console.warn(`Sprite asset '${assetId}' not loaded`);
            return null;
        }
        
        const entity = new BaseEntity(config);
        entity.addComponent(new SpriteComponent(assetId));
        
        // Add animation component if sprite has animations
        const renderer = this.getSystem('renderer');
        const spriteData = renderer?.getSpriteData(assetId);
        if (spriteData && spriteData.animations.size > 0) {
            entity.addComponent(new AnimationComponent({
                autoLoadAnimations: true
            }));
        }
        
        return entity;
    }
    
    // ... rest of framework methods ...
    
    mergeConfigs(defaultConfig, userConfig) {
        return { ...defaultConfig, ...userConfig };
    }
    
    async setupCanvas(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.canvas.id = canvasId;
            document.body.appendChild(this.canvas);
        }
        
        this.canvas.width = 800;
        this.canvas.height = 600;
        this.context = this.canvas.getContext('2d');
    }
    
    initializeSystems() {
        this.registerSystem('renderer', new RenderSystem(this.canvas, this.context, this.config));
        this.registerSystem('audio', new AudioSystem(this.config));
        this.registerSystem('input', new InputSystem(this.config));
    }
    
    registerSystem(name, system) {
        system.game = this;
        this.systems.set(name, system);
        if (system.initialize) system.initialize();
    }
    
    getSystem(name) {
        return this.systems.get(name);
    }
}

// Export framework
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        FRAMEWORK_CONFIG,
        AssetLoader,
        GameFramework
    };
}

/*
Game Usage Examples:

// 1. Initialize framework (defines paths, not assets)
const game = new GameFramework();
await game.initialize('gameCanvas');

// 2. Game decides which sprites to load
await game.loadSprite('ninja', 'ninjamand.json');
await game.loadSprite('enemy1', 'enemy_grunt.json');
await game.loadSprite('explosion', 'explosion_effect.json');

// 3. Game decides which audio to load
await game.loadAudio('shoot_sound', 'laser_shot.ogg', 'sfx');
await game.loadAudio('bgm', 'space_theme.ogg', 'music');

// 4. Batch load game-specific assets
const gameAssets = [
    { type: 'sprite', id: 'ninja', file: 'ninjamand.json' },
    { type: 'sprite', id: 'enemy1', file: 'basic_enemy.json' },
    { type: 'audio', id: 'shoot', file: 'shoot.wav', audioType: 'sfx' },
    { type: 'data', id: 'level1', file: 'level_01.json', dataType: 'level' }
];
await game.loadAssets(gameAssets);

// 5. Use loaded assets
const ninja = game.createSpriteEntity('ninja', { x: 50, y: 300 });
game.playSFX('shoot');

// Framework provides the infrastructure, game chooses the content!
*/