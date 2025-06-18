// GameFramework/tools/build.js - Build script for GameFramework

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * Build configuration
 */
const BUILD_CONFIG = {
    entryPoint: 'index.js',
    outputDir: 'dist',
    outputFile: 'gameframework.js',
    outputMinFile: 'gameframework.min.js',
    
    // Modules to include in order
    modules: [
        // Core (order matters!)
        'src/core/Vector2.js',
        'src/core/EventEmitter.js',
        'src/core/Component.js',
        'src/core/Entity.js',
        'src/core/Scene.js',
        'src/core/GameEngine.js',
        
        // Systems
        'src/systems/InputManager.js',
        'src/systems/Renderer.js',
        'src/systems/AssetManager.js',
        'src/systems/AudioSystem.js',
        'src/systems/CollisionSystem.js',
        
        // Components
        'src/components/AsepriteRenderer.js',
        'src/components/AnimatedSprite.js',
        'src/components/PhysicsBody.js',
        'src/components/Collider.js',
        'src/components/TextRenderer.js',
        'src/components/AudioSource.js',
        
        // Parsers
        'src/parsers/AsepriteParser.js',
        'src/parsers/AssetConfig.js',
        
        // Utils
        'src/utils/MathUtils.js',
        'src/utils/DebugUtils.js'
    ]
};

/**
 * Build the framework
 */
async function build() {
    console.log('🔨 Building GameFramework...\n');
    
    try {
        // Create output directory
        const outputPath = path.join(ROOT_DIR, BUILD_CONFIG.outputDir);
        await fs.mkdir(outputPath, { recursive: true });
        
        // Read all modules
        console.log('📖 Reading modules...');
        const moduleContents = await Promise.all(
            BUILD_CONFIG.modules.map(async (modulePath) => {
                const fullPath = path.join(ROOT_DIR, modulePath);
                const content = await fs.readFile(fullPath, 'utf8');
                console.log(`   ✓ ${modulePath}`);
                return { path: modulePath, content };
            })
        );
        
        // Process modules
        console.log('\n🔧 Processing modules...');
        const processedModules = moduleContents.map(({ path: modulePath, content }) => {
            // Remove import statements
            let processed = content.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '');
            
            // Remove export statements but keep the content
            processed = processed.replace(/^export\s+{[^}]*};?\s*$/gm, '');
            processed = processed.replace(/^export\s+default\s+/gm, '');
            processed = processed.replace(/^export\s+/gm, '');
            
            // Add module comment
            processed = `\n// Module: ${modulePath}\n${processed}`;
            
            return processed;
        });
        
        // Create bundle
        console.log('\n📦 Creating bundle...');
        const bundle = createBundle(processedModules);
        
        // Write output
        const outputFile = path.join(outputPath, BUILD_CONFIG.outputFile);
        await fs.writeFile(outputFile, bundle, 'utf8');
        console.log(`   ✓ Written to ${BUILD_CONFIG.outputFile}`);
        
        // Get file size
        const stats = await fs.stat(outputFile);
        const sizeKB = (stats.size / 1024).toFixed(2);
        console.log(`   📏 Size: ${sizeKB} KB`);
        
        // Create minified version (placeholder - would use terser in production)
        console.log('\n🗜️  Creating minified version...');
        await createMinified(bundle, outputPath);
        
        console.log('\n✅ Build completed successfully!');
        
    } catch (error) {
        console.error('\n❌ Build failed:', error);
        process.exit(1);
    }
}

/**
 * Create the bundle wrapper
 */
function createBundle(modules) {
    return `/**
 * GameFramework v1.0.0
 * A powerful HTML5 game development framework
 * 
 * @license MIT
 * @author GameFramework Team
 * Built: ${new Date().toISOString()}
 */

(function(global, factory) {
    // UMD (Universal Module Definition) pattern
    if (typeof exports === 'object' && typeof module !== 'undefined') {
        // CommonJS
        module.exports = factory();
    } else if (typeof define === 'function' && define.amd) {
        // AMD
        define(factory);
    } else {
        // Browser globals
        global = typeof globalThis !== 'undefined' ? globalThis : global || self;
        global.GameFramework = factory();
    }
})(this, function() {
    'use strict';
    
    // Framework modules
${modules.join('\n')}
    
    // Main framework object
    const GameFramework = {
        VERSION: '1.0.0',
        
        // Core classes
        Vector2,
        EventEmitter,
        Component,
        Entity,
        Scene,
        GameEngine,
        
        // Systems
        Systems: {
            InputManager,
            Renderer,
            Camera,
            AssetManager,
            AudioSystem,
            CollisionSystem
        },
        
        // Components
        Components: {
            AsepriteRenderer,
            AnimatedSprite,
            PhysicsBody,
            Collider,
            TextRenderer,
            AudioSource
        },
        
        // Parsers
        Parsers: {
            AsepriteParser,
            AssetConfig
        },
        
        // Utilities
        Utils: {
            MathUtils,
            DebugUtils
        },
        
        // Constants
        CollisionShape,
        CollisionLayers,
        
        // Helper methods
        createGame(canvasId, config = {}) {
            if (config.debug) {
                DebugUtils.init({
                    enabled: true,
                    logLevel: config.debugLevel || 'info'
                });
            }
            
            const engine = new GameEngine(canvasId, config);
            
            if (config.debug) {
                window.__gameEngine = engine;
            }
            
            return engine;
        },
        
        async quickStart(canvasId, config = {}) {
            const engine = this.createGame(canvasId, config);
            
            if (config.loadFrameworkAssets !== false) {
                await engine.assets.preloadFrameworkAssets();
            }
            
            engine.start();
            return engine;
        },
        
        createEntity(definition = {}) {
            const entity = new Entity({
                name: definition.name,
                x: definition.x || 0,
                y: definition.y || 0,
                ...definition.transform
            });
            
            if (definition.components) {
                Object.entries(definition.components).forEach(([name, config]) => {
                    const ComponentClass = this.Components[name];
                    if (ComponentClass) {
                        entity.addComponent(new ComponentClass(config));
                    } else {
                        console.warn(\`Component '\${name}' not found\`);
                    }
                });
            }
            
            return entity;
        },
        
        createScene(name, config = {}) {
            return new Scene(name, config);
        },
        
        createAssetConfig() {
            return new AssetConfig(AssetConfig.createDefault());
        },
        
        registerComponent(name, ComponentClass) {
            this.Components[name] = ComponentClass;
        },
        
        registerSystem(name, SystemClass) {
            this.Systems[name] = SystemClass;
        }
    };
    
    // Dispatch ready event
    if (typeof window !== 'undefined') {
        window.addEventListener('DOMContentLoaded', () => {
            window.dispatchEvent(new CustomEvent('gameframework:ready', {
                detail: { framework: GameFramework }
            }));
        });
        
        console.log(\`🎮 GameFramework v\${GameFramework.VERSION} loaded\`);
    }
    
    return GameFramework;
});`;
}

/**
 * Create minified version (placeholder)
 */
async function createMinified(bundle, outputPath) {
    // In a real build, we would use terser or another minifier
    // For now, just create a copy with basic minification
    
    let minified = bundle;
    
    // Remove comments
    minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');
    minified = minified.replace(/\/\/.*$/gm, '');
    
    // Remove extra whitespace
    minified = minified.replace(/\s+/g, ' ');
    minified = minified.replace(/\s*([{}()[\];,])\s*/g, '$1');
    
    const outputFile = path.join(outputPath, BUILD_CONFIG.outputMinFile);
    await fs.writeFile(outputFile, minified, 'utf8');
    
    const stats = await fs.stat(outputFile);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`   ✓ Written to ${BUILD_CONFIG.outputMinFile}`);
    console.log(`   📏 Size: ${sizeKB} KB`);
}

// Run build
build().catch(console.error);