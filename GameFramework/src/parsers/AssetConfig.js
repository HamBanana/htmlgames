// GameFramework/src/parsers/AssetConfig.js

/**
 * AssetConfig - Parses and manages asset configuration
 * @class AssetConfig
 */
export class AssetConfig {
    constructor(config = {}) {
        this.config = this.parseConfig(config);
        this.assetGroups = new Map();
        this.assetDependencies = new Map();
    }
    
    /**
     * Parse asset configuration
     * @param {object} config - Raw configuration
     * @returns {object} Parsed configuration
     */
    parseConfig(config) {
        return {
            // Asset paths
            paths: {
                sprites: config.paths?.sprites || 'assets/sprites/',
                audio: config.paths?.audio || 'assets/audio/',
                data: config.paths?.data || 'assets/data/',
                fonts: config.paths?.fonts || 'assets/fonts/',
                ...config.paths
            },
            
            // Framework asset paths - Fixed to use server root consistently
            frameworkPaths: {
                sprites: config.frameworkPaths?.sprites || '/GameAssets/Sprites/Aseprite',
                audio: config.frameworkPaths?.audio || '/GameAssets/audio/',
                fonts: config.frameworkPaths?.fonts || '/GameAssets/fonts/',
                ...config.frameworkPaths
            },
            
            // Asset definitions
            sprites: this.parseAssetList(config.sprites || {}),
            audio: this.parseAssetList(config.audio || {}),
            data: this.parseAssetList(config.data || {}),
            fonts: this.parseAssetList(config.fonts || {}),
            
            // Asset groups
            groups: config.groups || {},
            
            // Loading settings
            loading: {
                parallel: config.loading?.parallel !== false,
                maxConcurrent: config.loading?.maxConcurrent || 6,
                retryAttempts: config.loading?.retryAttempts || 3,
                retryDelay: config.loading?.retryDelay || 1000,
                timeout: config.loading?.timeout || 30000,
                ...config.loading
            }
        };
    }
    
    /**
     * Parse asset list
     * @private
     */
    parseAssetList(assets) {
        const parsed = {};
        
        Object.entries(assets).forEach(([name, value]) => {
            if (typeof value === 'string') {
                // Simple string path
                parsed[name] = {
                    path: value,
                    options: {}
                };
            } else if (typeof value === 'object') {
                // Object with options
                parsed[name] = {
                    path: value.path || value.file || name,
                    options: {
                        preload: value.preload !== false,
                        framework: value.framework || false,
                        fallback: value.fallback,
                        variations: value.variations,
                        metadata: value.metadata,
                        ...value
                    }
                };
            }
        });
        
        return parsed;
    }
    
    /**
     * Get asset definition
     * @param {string} type - Asset type
     * @param {string} name - Asset name
     * @returns {object|null}
     */
    getAsset(type, name) {
        return this.config[type]?.[name] || null;
    }
    
    /**
     * Get all assets of a type
     * @param {string} type - Asset type
     * @returns {object}
     */
    getAssetsByType(type) {
        return this.config[type] || {};
    }
    
    /**
     * Get asset path
     * @param {string} type - Asset type
     * @param {string} name - Asset name
     * @returns {string|null}
     */
    getAssetPath(type, name) {
        const asset = this.getAsset(type, name);
        if (!asset) return null;
        
        const basePath = asset.options.framework
            ? this.config.frameworkPaths[type]
            : this.config.paths[type];
        
        return basePath + asset.path;
    }
    
    /**
     * Get asset URL for game assets
     * @param {string} path - Asset path
     * @param {string} type - Asset type
     * @returns {string}
     */
    getAssetUrl(path, type) {
        const basePath = this.config.paths[type] || this.config.paths.sprites;
        return basePath + path;
    }
    
    /**
     * Get asset URL for framework assets
     * @param {string} path - Asset path
     * @param {string} type - Asset type
     * @returns {string}
     */
    getFrameworkAssetUrl(path, type) {
        const basePath = this.config.frameworkPaths[type] || this.config.frameworkPaths.sprites;
        return basePath + path;
    }
    
    /**
     * Register asset group
     * @param {string} name - Group name
     * @param {string[]} assets - Asset names
     */
    registerGroup(name, assets) {
        this.assetGroups.set(name, new Set(assets));
    }
    
    /**
     * Get asset group
     * @param {string} name - Group name
     * @returns {string[]}
     */
    getGroup(name) {
        const group = this.assetGroups.get(name);
        return group ? Array.from(group) : [];
    }
    
    /**
     * Parse groups from config
     */
    parseGroups() {
        Object.entries(this.config.groups).forEach(([name, assets]) => {
            this.registerGroup(name, assets);
        });
    }
    
    /**
     * Add asset dependency
     * @param {string} asset - Asset name
     * @param {string[]} dependencies - Dependency names
     */
    addDependency(asset, dependencies) {
        if (!this.assetDependencies.has(asset)) {
            this.assetDependencies.set(asset, new Set());
        }
        
        dependencies.forEach(dep => {
            this.assetDependencies.get(asset).add(dep);
        });
    }
    
    /**
     * Get asset dependencies
     * @param {string} asset - Asset name
     * @returns {string[]}
     */
    getDependencies(asset) {
        const deps = this.assetDependencies.get(asset);
        return deps ? Array.from(deps) : [];
    }
    
    /**
     * Get all dependencies recursively
     * @param {string} asset - Asset name
     * @param {Set} visited - Visited assets
     * @returns {string[]}
     */
    getAllDependencies(asset, visited = new Set()) {
        if (visited.has(asset)) return [];
        visited.add(asset);
        
        const deps = this.getDependencies(asset);
        const allDeps = [...deps];
        
        deps.forEach(dep => {
            allDeps.push(...this.getAllDependencies(dep, visited));
        });
        
        return [...new Set(allDeps)];
    }
    
    /**
     * Create asset manifest for loading
     * @param {string[]} assetNames - Assets to load
     * @returns {object[]} Asset manifest
     */
    createManifest(assetNames) {
        const manifest = [];
        const processed = new Set();
        
        assetNames.forEach(name => {
            this.addToManifest(name, manifest, processed);
        });
        
        return manifest;
    }
    
    /**
     * Add asset to manifest with dependencies
     * @private
     */
    addToManifest(name, manifest, processed) {
        if (processed.has(name)) return;
        
        // Add dependencies first
        const deps = this.getDependencies(name);
        deps.forEach(dep => {
            this.addToManifest(dep, manifest, processed);
        });
        
        // Find asset in all types
        let found = false;
        ['sprites', 'audio', 'data', 'fonts'].forEach(type => {
            const asset = this.getAsset(type, name);
            if (asset && !processed.has(name)) {
                manifest.push({
                    name,
                    type,
                    path: asset.path,
                    options: asset.options,
                    fullPath: this.getAssetPath(type, name)
                });
                processed.add(name);
                found = true;
            }
        });
        
        if (!found) {
            console.warn(`Asset '${name}' not found in configuration`);
        }
    }
    
    /**
     * Validate configuration
     * @returns {object} Validation result
     */
    validate() {
        const errors = [];
        const warnings = [];
        
        // Check paths exist
        Object.entries(this.config.paths).forEach(([type, path]) => {
            if (!path.endsWith('/')) {
                warnings.push(`Path for '${type}' should end with '/': ${path}`);
            }
        });
        
        // Check for circular dependencies
        const checkCircular = (asset, path = []) => {
            if (path.includes(asset)) {
                errors.push(`Circular dependency detected: ${[...path, asset].join(' -> ')}`);
                return;
            }
            
            const deps = this.getDependencies(asset);
            deps.forEach(dep => {
                checkCircular(dep, [...path, asset]);
            });
        };
        
        this.assetDependencies.forEach((deps, asset) => {
            checkCircular(asset);
        });
        
        // Check asset references
        Object.entries(this.config.groups).forEach(([group, assets]) => {
            assets.forEach(asset => {
                let found = false;
                ['sprites', 'audio', 'data', 'fonts'].forEach(type => {
                    if (this.getAsset(type, asset)) found = true;
                });
                
                if (!found) {
                    warnings.push(`Group '${group}' references unknown asset: ${asset}`);
                }
            });
        });
        
        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    /**
     * Export configuration
     * @returns {object}
     */
    export() {
        return {
            paths: this.config.paths,
            frameworkPaths: this.config.frameworkPaths,
            sprites: this.config.sprites,
            audio: this.config.audio,
            data: this.config.data,
            fonts: this.config.fonts,
            groups: Object.fromEntries(
                Array.from(this.assetGroups.entries()).map(([name, assets]) => [
                    name,
                    Array.from(assets)
                ])
            ),
            loading: this.config.loading
        };
    }
    
    /**
     * Create default configuration
     * @static
     * @returns {object}
     */
    static createDefault() {
        return {
            paths: {
                sprites: 'assets/sprites/',
                audio: 'assets/audio/',
                data: 'assets/data/',
                fonts: 'assets/fonts/'
            },
            frameworkPaths: {
                sprites: '/GameAssets/Sprites/Aseprite/',
                audio: '/GameAssets/audio/',
                fonts: '/GameAssets/fonts/'
            },
            sprites: {
                // Framework defaults (no extensions - AssetManager will try .json, .aseprite, .ase)
                'placeholder': { path: 'debug/placeholder', framework: true },
                'ui_button': { path: 'ui/button', framework: true },
                'ui_panel': { path: 'ui/panel', framework: true },
                'ui_slider': { path: 'ui/slider', framework: true },
                'explosion': { path: 'effects/explosion', framework: true },
                'sparks': { path: 'effects/sparks', framework: true },
                'smoke': { path: 'effects/smoke', framework: true }
            },
            audio: {
                // Framework defaults
                'ui_click': { path: 'ui/click', framework: true },
                'ui_hover': { path: 'ui/hover', framework: true },
                'ui_error': { path: 'ui/error', framework: true },
                'ui_success': { path: 'ui/success', framework: true },
                'explosion': { path: 'effects/explosion', framework: true },
                'pickup': { path: 'effects/pickup', framework: true },
                'damage': { path: 'effects/damage', framework: true },
                'powerup': { path: 'effects/powerup', framework: true }
            },
            groups: {
                'ui': ['ui_button', 'ui_panel', 'ui_slider', 'ui_click', 'ui_hover'],
                'effects': ['explosion', 'sparks', 'smoke', 'pickup', 'damage'],
                'essential': ['placeholder', 'ui_button', 'ui_click']
            },
            loading: {
                parallel: true,
                maxConcurrent: 6,
                retryAttempts: 3,
                retryDelay: 1000,
                timeout: 30000
            }
        };
    }
}