// GameFramework/src/systems/AssetManager.js
import { AsepriteParser } from '../parsers/AsepriteParser.js';
import { AssetConfig } from '../parsers/AssetConfig.js';

/**
 * AssetManager - Handles loading and management of game assets
 * @class AssetManager
 */
export class AssetManager {
    constructor(engine) {
        this.engine = engine;

        // Asset storage
        this.assets = new Map();
        this.loadingAssets = new Map();

        // Asset configuration - single source of truth
        this.assetConfig = new AssetConfig(engine.config.assetConfig || AssetConfig.createDefault());

        // Loading state
        this.loading = false;
        this.loadQueue = [];
        this.loadProgress = {
            loaded: 0,
            total: 0,
            current: null
        };

        // Asset loaders
        this.loaders = new Map();
        this._registerDefaultLoaders();
    }

    /**
     * Initialize asset manager
     */
    initialize() {
        // Asset config is already initialized in constructor
        // No need for path overrides - everything goes through AssetConfig
    }

    /**
     * Register default asset loaders
     * @private
     */
    _registerDefaultLoaders() {
        // Image loader
        this.registerLoader(['png', 'jpg', 'jpeg', 'gif', 'webp'], async (url, name) => {
            return new Promise((resolve, reject) => {
                const image = new Image();

                image.onload = () => {
                    resolve({
                        type: 'image',
                        data: image,
                        url,
                        name
                    });
                };

                image.onerror = () => {
                    reject(new Error(`Failed to load image: ${url}`));
                };

                image.src = url;
            });
        });

        // JSON loader (handles both data and Aseprite sprites)
        this.registerLoader(['json'], async (url, name, options = {}) => {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to load JSON: ${response.statusText}`);
            }

            const data = await response.json();

            // Check if this is an Aseprite JSON file
            if (data.frames && data.meta && (data.meta.app === 'aseprite' || data.meta.app === 'Aseprite')) {
                // This is an Aseprite file, parse it as such
                const parsed = await AsepriteParser.parse(data);

                // Check if image is already loaded (embedded base64)
                let image;
                if (parsed.image) {
                    // Image was already loaded from embedded base64 data
                    image = parsed.image;
                } else if (parsed.imagePath) {
                    // Load external image file
                    const imageUrl = parsed.imagePath;
                    // If it's a relative path, make it relative to the JSON file location
                    const absoluteImageUrl = imageUrl.startsWith('http') || imageUrl.startsWith('/')
                        ? imageUrl
                        : url.substring(0, url.lastIndexOf('/') + 1) + imageUrl;
                    image = await this._loadImage(absoluteImageUrl);
                } else {
                    throw new Error('No image data found in Aseprite file');
                }

                // Store in renderer
                const renderer = this.engine.getSystem('renderer');
                if (renderer) {
                    renderer.sprites.set(name, image);
                    renderer.spriteData.set(name, parsed);
                }

                return {
                    type: 'aseprite',
                    data: {
                        image,
                        ...parsed
                    },
                    url,
                    name
                };
            }

            // Regular JSON data
            return {
                type: 'json',
                data,
                url,
                name
            };
        });

        // Aseprite loader (for .aseprite and .ase extensions)
        this.registerLoader(['aseprite', 'ase'], async (url, name, options = {}) => {
            // Load the JSON file
            const jsonUrl = url.replace(/\.(aseprite|ase)$/, '.json');
            const response = await fetch(jsonUrl);

            if (!response.ok) {
                throw new Error(`Failed to load Aseprite JSON: ${response.statusText}`);
            }

            const jsonData = await response.json();
            const parsed = await AsepriteParser.parse(jsonData);

            // Check if image is already loaded (embedded base64)
            let image;
            if (parsed.image) {
                // Image was already loaded from embedded base64 data
                image = parsed.image;
            } else if (parsed.imagePath) {
                // Load external image file
                const imageUrl = parsed.imagePath;
                // If it's a relative path, make it relative to the JSON file location
                const absoluteImageUrl = imageUrl.startsWith('http') || imageUrl.startsWith('/')
                    ? imageUrl
                    : jsonUrl.substring(0, jsonUrl.lastIndexOf('/') + 1) + imageUrl;
                image = await this._loadImage(absoluteImageUrl);
            } else {
                throw new Error('No image data found in Aseprite file');
            }

            // Store in renderer
            const renderer = this.engine.getSystem('renderer');
            if (renderer) {
                renderer.sprites.set(name, image);
                renderer.spriteData.set(name, parsed);
            }

            return {
                type: 'aseprite',
                data: {
                    image,
                    ...parsed
                },
                url,
                name
            };
        });

        // Audio loader
        this.registerLoader(['mp3', 'ogg', 'wav', 'm4a'], async (url, name) => {
            return new Promise((resolve, reject) => {
                const audio = new Audio();

                audio.addEventListener('canplaythrough', () => {
                    resolve({
                        type: 'audio',
                        data: audio,
                        url,
                        name
                    });
                }, { once: true });

                audio.addEventListener('error', () => {
                    reject(new Error(`Failed to load audio: ${url}`));
                }, { once: true });

                audio.src = url;
                audio.load();
            });
        });

        // Text loader
        this.registerLoader(['txt', 'glsl', 'vert', 'frag'], async (url, name) => {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to load text: ${response.statusText}`);
            }

            const text = await response.text();

            return {
                type: 'text',
                data: text,
                url,
                name
            };
        });
    }

    /**
     * Load an image (helper)
     * @private
     */
    async _loadImage(url) {
        return new Promise((resolve, reject) => {
            const image = new Image();

            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error(`Failed to load image: ${url}`));

            image.src = url;
        });
    }

    /**
     * Register an asset loader
     * @param {string[]} extensions - File extensions
     * @param {Function} loader - Loader function
     */
    registerLoader(extensions, loader) {
        extensions.forEach(ext => {
            this.loaders.set(ext.toLowerCase(), loader);
        });
    }

    /**
     * Load an asset
     * @param {string} name - Asset name/ID
     * @param {string} path - Asset path or filename
     * @param {object} [options] - Loading options
     * @returns {Promise} Promise that resolves with the asset
     */
    async load(name, path, options = {}) {
        // Check if already loaded
        if (this.assets.has(name)) {
            return this.assets.get(name);
        }

        // Check if already loading
        if (this.loadingAssets.has(name)) {
            return this.loadingAssets.get(name);
        }

        // Determine full URL using AssetConfig
        let url;
        if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('/')) {
            // Absolute URL
            url = path;
        } else {
            // Use AssetConfig to resolve the path
            const extension = path.split('.').pop().toLowerCase();
            const type = options.type || this._guessAssetType(extension);

            if (options.framework) {
                url = this.assetConfig.getFrameworkAssetUrl(path, type);
            } else {
                url = this.assetConfig.getAssetUrl(path, type);
            }
        }

        // Get loader
        const extension = url.split('.').pop().toLowerCase();
        const loader = this.loaders.get(extension);

        if (!loader) {
            throw new Error(`No loader registered for extension: ${extension}`);
        }

        // Create loading promise
        const loadingPromise = this._loadAsset(name, url, loader, options);
        this.loadingAssets.set(name, loadingPromise);

        try {
            const asset = await loadingPromise;
            this.assets.set(name, asset);
            this.loadingAssets.delete(name);

            this.engine.emit('asset:loaded', asset);

            return asset;
        } catch (error) {
            this.loadingAssets.delete(name);

            // Try framework assets as fallback
            if (!options.framework && !options.noFallback) {
                console.warn(`Failed to load game asset '${name}', trying framework assets...`);
                return this.load(name, path, { ...options, framework: true });
            }

            this.engine.emit('asset:error', { name, url, error });
            throw error;
        }
    }

    /**
     * Load asset with loader
     * @private
     */
    async _loadAsset(name, url, loader, options) {
        this.loadProgress.current = name;

        try {
            const asset = await loader(url, name, options);
            return asset;
        } finally {
            this.loadProgress.current = null;
        }
    }

    /**
     * Guess asset type from extension
     * @private
     */
    _guessAssetType(extension) {
        const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
        const audioExts = ['mp3', 'ogg', 'wav', 'm4a'];
        const dataExts = ['json', 'xml', 'txt'];

        if (imageExts.includes(extension)) return 'sprites';
        if (audioExts.includes(extension)) return 'audio';
        if (dataExts.includes(extension)) return 'data';

        return 'sprites'; // Default
    }

    /**
     * Load multiple assets
     * @param {Array} assets - Array of asset definitions
     * @returns {Promise} Promise that resolves when all assets are loaded
     */
    async loadAssets(assets) {
        this.loading = true;
        this.loadProgress.loaded = 0;
        this.loadProgress.total = assets.length;

        const promises = assets.map(async (asset) => {
            try {
                const result = await this.load(asset.name, asset.path, asset.options);
                this.loadProgress.loaded++;

                this.engine.emit('asset:progress', {
                    loaded: this.loadProgress.loaded,
                    total: this.loadProgress.total,
                    percent: this.loadProgress.loaded / this.loadProgress.total
                });

                return result;
            } catch (error) {
                console.error(`Failed to load asset ${asset.name}:`, error);
                throw error;
            }
        });

        try {
            const results = await Promise.all(promises);
            this.loading = false;
            this.engine.emit('assets:loaded', results);
            return results;
        } catch (error) {
            this.loading = false;
            this.engine.emit('assets:error', error);
            throw error;
        }
    }

    /**
     * Preload essential framework assets
     */
    async preloadFrameworkAssets() {
        const essentialAssets = [
            { name: 'placeholder', path: 'debug/placeholder', options: { framework: true } },
            { name: 'ui_button', path: 'ui/button', options: { framework: true } },
            { name: 'ui_panel', path: 'ui/panel', options: { framework: true } }
        ];

        try {
            await this.loadAssets(essentialAssets);
            console.log('Framework assets loaded');
        } catch (error) {
            console.warn('Some framework assets failed to load:', error);
        }
    }

    /**
     * Load sprite (convenience method)
     * @param {string} name - Sprite name
     * @param {string} filename - Sprite filename
     * @returns {Promise}
     */
    async loadSprite(name, filename) {
        // Determine extension
        let finalFilename = filename;
        if (!filename.includes('.')) {
            // Try common sprite extensions
            const extensions = ['.json', '.aseprite', '.png'];
            for (const ext of extensions) {
                try {
                    return await this.load(name, filename + ext, { type: 'sprites' });
                } catch (error) {
                    // Try next extension
                }
            }
            throw new Error(`Could not find sprite file: ${filename}`);
        }

        return this.load(name, finalFilename, { type: 'sprites' });
    }

    /**
     * Load audio (convenience method)
     * @param {string} name - Audio name
     * @param {string} filename - Audio filename
     * @returns {Promise}
     */
    async loadAudio(name, filename) {
        return this.load(name, filename, { type: 'audio' });
    }

    /**
     * Load JSON data (convenience method)
     * @param {string} name - Data name
     * @param {string} filename - Data filename
     * @returns {Promise}
     */
    async loadData(name, filename) {
        return this.load(name, filename, { type: 'data' });
    }

    /**
     * Get loaded asset
     * @param {string} name - Asset name
     * @returns {*} Asset data or null
     */
    get(name) {
        const asset = this.assets.get(name);
        return asset ? asset.data : null;
    }

    /**
     * Check if asset is loaded
     * @param {string} name - Asset name
     * @returns {boolean}
     */
    has(name) {
        return this.assets.has(name);
    }

    /**
     * Unload an asset
     * @param {string} name - Asset name
     */
    unload(name) {
        const asset = this.assets.get(name);
        if (!asset) return;

        // Clean up based on type
        if (asset.type === 'audio' && asset.data.pause) {
            asset.data.pause();
            asset.data.src = '';
        }

        this.assets.delete(name);
        this.engine.emit('asset:unloaded', { name });
    }

    /**
     * Unload all assets
     */
    unloadAll() {
        this.assets.forEach((asset, name) => {
            this.unload(name);
        });
    }

    /**
     * Get loading progress
     * @returns {object} Loading progress
     */
    getProgress() {
        return {
            ...this.loadProgress,
            percent: this.loadProgress.total > 0
                ? this.loadProgress.loaded / this.loadProgress.total
                : 0
        };
    }
}