// level-manager.js - Level loading and management

class LevelManager {
    constructor() {
        this.currentLevel = null;
        this.platforms = [];
        this.mapDirectory = 'maps/'; // Changed from './maps/' to 'maps/'
        this.builtInMaps = this.createBuiltInMaps();
    }
    
    async loadAvailableMaps() {
        console.log('LevelManager: Loading available maps from:', this.mapDirectory);
        const availableMaps = [];
        
        try {
            // First, try to load the maps configuration from the game config
            if (window.gameConfig && window.gameConfig.maps && window.gameConfig.maps.availableMaps) {
                console.log('LevelManager: Found maps config with available maps:', window.gameConfig.maps.availableMaps);
                return window.gameConfig.maps.availableMaps;
            }
            
            // Try to load from index.json first
            const indexResponse = await fetch(this.mapDirectory + 'index.json');
            if (indexResponse.ok) {
                const mapIndex = await indexResponse.json();
                if (mapIndex.maps && Array.isArray(mapIndex.maps)) {
                    console.log('LevelManager: Loaded maps from index.json:', mapIndex.maps);
                    return mapIndex.maps;
                }
            }
        } catch (e) {
            console.log('LevelManager: No index.json found, trying to detect maps automatically');
        }
        
        // Try to detect maps by testing known map files from the maps folder
        const knownMaps = [
            'factory.json',
            'traininggrounds.json', 
            'industrialzone.json',
            'skyfortress.json',
            'spacestation.json',
            'crystalcaverns.json',
            'gauntlet.json',
            'speedrunchallenge.json',
            'bouncycastle.json',
            'bossarena.json'
        ];
        
        console.log('LevelManager: Testing known map files...');
        
        const mapTests = knownMaps.map(async (mapName) => {
            try {
                const response = await fetch(this.mapDirectory + mapName, { method: 'HEAD' });
                if (response.ok) {
                    console.log(`LevelManager: Found map: ${mapName}`);
                    return mapName;
                } else {
                    console.log(`LevelManager: Map not found: ${mapName} (${response.status})`);
                    return null;
                }
            } catch (e) {
                console.log(`LevelManager: Error testing map ${mapName}:`, e);
                return null;
            }
        });
        
        const results = await Promise.all(mapTests);
        results.forEach(mapName => {
            if (mapName) {
                availableMaps.push(mapName);
            }
        });
        
        console.log('LevelManager: Found available maps:', availableMaps);
        
        // If no maps found, use built-in maps
        if (availableMaps.length === 0) {
            console.log('LevelManager: No external maps found, using built-in maps');
            return ['builtin-1', 'builtin-2', 'builtin-3'];
        }
        
        return availableMaps;
    }
    
    async loadMap(mapFile) {
        console.log('LevelManager: Loading map:', mapFile);
        
        try {
            // Check if it's a built-in map
            if (mapFile.startsWith('builtin-')) {
                const mapNum = parseInt(mapFile.replace('builtin-', ''));
                console.log('LevelManager: Loading built-in map', mapNum);
                return this.loadBuiltInMap(mapNum);
            }
            
            // Load external map from maps folder
            const mapUrl = this.mapDirectory + mapFile;
            console.log('LevelManager: Fetching map from:', mapUrl);
            
            const response = await fetch(mapUrl);
            if (!response.ok) {
                throw new Error(`Failed to load map: ${mapFile} (${response.status})`);
            }
            
            const mapData = await response.json();
            console.log('LevelManager: Successfully loaded map data for:', mapFile);
            
            this.currentLevel = mapData;
            this.platforms = mapData.platforms || [];
            
            console.log(`LevelManager: Map loaded - ${this.platforms.length} platforms, ${(mapData.enemies || []).length} enemies, ${(mapData.pickups || []).length} pickups`);
            
            return mapData;
            
        } catch (error) {
            console.error('LevelManager: Error loading map:', error);
            console.log('LevelManager: Falling back to built-in map 1');
            // Fall back to built-in map
            return this.loadBuiltInMap(1);
        }
    }
    
    loadBuiltInMap(mapNum) {
        console.log('LevelManager: Loading built-in map:', mapNum);
        const mapData = this.builtInMaps[mapNum] || this.builtInMaps[1];
        this.currentLevel = mapData;
        this.platforms = mapData.platforms || [];
        return mapData;
    }
    
    createBuiltInMaps() {
        return {
            1: {
                name: "Factory Level",
                playerStart: { x: 100, y: 400 },
                platforms: [
                    { x: 0, y: 500, w: 800, h: 100 },
                    { x: 800, y: 500, w: 400, h: 100 },
                    { x: 1400, y: 500, w: 600, h: 100 },
                    { x: 2200, y: 500, w: 1000, h: 100 },
                    { x: 200, y: 400, w: 150, h: 20 },
                    { x: 450, y: 350, w: 150, h: 20 },
                    { x: 700, y: 300, w: 100, h: 20 },
                    { x: 900, y: 400, w: 200, h: 20 },
                    { x: 1200, y: 350, w: 150, h: 20 },
                    { x: 1500, y: 400, w: 100, h: 20 },
                    { x: 1700, y: 300, w: 200, h: 20 },
                    { x: 2000, y: 350, w: 150, h: 20 },
                    { x: 2300, y: 400, w: 200, h: 20 },
                    { x: 2600, y: 300, w: 150, h: 20 }
                ],
                enemies: [
                    { x: 400, y: 450, type: 'walker' },
                    { x: 600, y: 250, type: 'flyer' },
                    { x: 950, y: 350, type: 'walker' },
                    { x: 1300, y: 450, type: 'walker' },
                    { x: 1600, y: 250, type: 'flyer' },
                    { x: 1800, y: 250, type: 'turret' },
                    { x: 2100, y: 300, type: 'flyer' },
                    { x: 2400, y: 350, type: 'walker' },
                    { x: 2700, y: 250, type: 'turret' }
                ],
                pickups: [
                    { x: 500, y: 320, type: 'health' },
                    { x: 1250, y: 320, type: 'spread' },
                    { x: 1900, y: 270, type: 'health' },
                    { x: 2500, y: 370, type: 'laser' }
                ],
                boss: {
                    x: 2900,
                    y: 300,
                    triggerX: 2800
                }
            },
            2: {
                name: "Cyber City",
                playerStart: { x: 50, y: 400 },
                platforms: [
                    { x: 0, y: 500, w: 3200, h: 100 },
                    { x: 300, y: 400, w: 200, h: 20 },
                    { x: 600, y: 350, w: 150, h: 20 },
                    { x: 850, y: 300, w: 200, h: 20 },
                    { x: 1150, y: 400, w: 250, h: 20 },
                    { x: 1500, y: 350, w: 200, h: 20 },
                    { x: 1800, y: 300, w: 150, h: 20 },
                    { x: 2050, y: 250, w: 200, h: 20 },
                    { x: 2350, y: 350, w: 250, h: 20 },
                    { x: 2700, y: 400, w: 200, h: 20 }
                ],
                enemies: [
                    { x: 350, y: 350, type: 'walker' },
                    { x: 650, y: 300, type: 'flyer' },
                    { x: 900, y: 250, type: 'turret' },
                    { x: 1200, y: 350, type: 'walker' },
                    { x: 1550, y: 300, type: 'walker' },
                    { x: 1850, y: 250, type: 'flyer' },
                    { x: 2100, y: 200, type: 'turret' },
                    { x: 2400, y: 300, type: 'walker' },
                    { x: 2750, y: 350, type: 'flyer' }
                ],
                pickups: [
                    { x: 700, y: 320, type: 'health' },
                    { x: 1300, y: 370, type: 'wave' },
                    { x: 1900, y: 270, type: 'shield' },
                    { x: 2450, y: 320, type: 'health' }
                ],
                boss: {
                    x: 2950,
                    y: 300,
                    triggerX: 2850
                }
            },
            3: {
                name: "Underground Base",
                playerStart: { x: 100, y: 300 },
                platforms: [
                    { x: 0, y: 500, w: 3200, h: 100 },
                    { x: 0, y: 0, w: 3200, h: 50 },
                    { x: 250, y: 400, w: 100, h: 100 },
                    { x: 450, y: 350, w: 200, h: 150 },
                    { x: 750, y: 300, w: 150, h: 200 },
                    { x: 1000, y: 400, w: 200, h: 100 },
                    { x: 1300, y: 200, w: 300, h: 20 },
                    { x: 1700, y: 350, w: 150, h: 150 },
                    { x: 1950, y: 400, w: 200, h: 100 },
                    { x: 2250, y: 300, w: 250, h: 200 },
                    { x: 2600, y: 350, w: 200, h: 150 }
                ],
                enemies: [
                    { x: 300, y: 350, type: 'turret' },
                    { x: 500, y: 300, type: 'walker' },
                    { x: 800, y: 250, type: 'flyer' },
                    { x: 1050, y: 350, type: 'walker' },
                    { x: 1350, y: 150, type: 'turret' },
                    { x: 1450, y: 150, type: 'flyer' },
                    { x: 1750, y: 300, type: 'walker' },
                    { x: 2000, y: 350, type: 'turret' },
                    { x: 2300, y: 250, type: 'flyer' },
                    { x: 2650, y: 300, type: 'walker' }
                ],
                pickups: [
                    { x: 550, y: 320, type: 'health' },
                    { x: 1100, y: 370, type: 'bounce' },
                    { x: 1400, y: 170, type: 'speed' },
                    { x: 2050, y: 370, type: 'health' },
                    { x: 2350, y: 270, type: 'rapid' }
                ],
                boss: {
                    x: 2900,
                    y: 250,
                    triggerX: 2800
                }
            }
        };
    }
    
    getMapDisplayName(mapFile) {
        if (mapFile.startsWith('builtin-')) {
            const mapNum = parseInt(mapFile.replace('builtin-', ''));
            const builtInMap = this.builtInMaps[mapNum];
            return builtInMap ? builtInMap.name : `Built-in Map ${mapNum}`;
        }
        
        // Format external map names
        return mapFile
            .replace('.json', '')
            .replace(/([A-Z])/g, ' $1')
            .replace(/[-_]/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .trim();
    }
    
    getPlatforms() {
        return this.platforms;
    }
    
    getPlayerStartPosition() {
        if (this.currentLevel && this.currentLevel.playerStart) {
            return this.currentLevel.playerStart;
        }
        return { x: 100, y: 400 };
    }
    
    getLevelBounds() {
        return {
            width: this.currentLevel?.levelWidth || 3200,
            height: this.currentLevel?.levelHeight || 600
        };
    }
    
    getBackgroundColor() {
        return this.currentLevel?.background?.color || '#001122';
    }
    
    getLevelTheme() {
        return this.currentLevel?.theme || 'factory';
    }
}