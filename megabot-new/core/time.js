// time.js - Time management system

class TimeManager {
    constructor() {
        this.lastTime = 0;
        this.deltaTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.fpsUpdateTime = 0;
        this.timeScale = 1;
        this.maxDeltaTime = 0.05; // Cap at 50ms to prevent physics issues
    }
    
    update() {
        const currentTime = performance.now() / 1000; // Convert to seconds
        
        if (this.lastTime === 0) {
            this.lastTime = currentTime;
            this.fpsUpdateTime = currentTime;
            return;
        }
        
        // Calculate raw delta time
        const rawDeltaTime = currentTime - this.lastTime;
        
        // Apply time scale and clamp
        this.deltaTime = Math.min(rawDeltaTime * this.timeScale, this.maxDeltaTime);
        
        // Update FPS counter
        this.frameCount++;
        if (currentTime - this.fpsUpdateTime >= 1.0) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.fpsUpdateTime = currentTime;
        }
        
        this.lastTime = currentTime;
    }
    
    getDeltaTime() {
        return this.deltaTime;
    }
    
    getFPS() {
        return this.fps;
    }
    
    setTimeScale(scale) {
        this.timeScale = Math.max(0, Math.min(3, scale));
    }
    
    getTimeScale() {
        return this.timeScale;
    }
    
    pause() {
        this.timeScale = 0;
    }
    
    resume() {
        this.timeScale = 1;
    }
    
    reset() {
        this.lastTime = 0;
        this.deltaTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.fpsUpdateTime = 0;
        this.timeScale = 1;
    }
}