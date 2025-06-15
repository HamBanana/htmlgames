// utils/performance.js - Performance monitoring system

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.frameMetrics = {
            frameCount: 0,
            frameTime: 0,
            lastTime: performance.now(),
            fps: 0,
            fpsUpdateTime: 0,
            fpsFrameCount: 0
        };
        this.breakdown = {};
    }
    
    startFrame() {
        this.frameStartTime = performance.now();
        this.frameMetrics.frameCount++;
    }
    
    endFrame() {
        const now = performance.now();
        const frameTime = now - this.frameStartTime;
        
        this.frameMetrics.frameTime = frameTime;
        
        // Update FPS counter
        this.frameMetrics.fpsFrameCount++;
        const timeSinceLastFPSUpdate = now - this.frameMetrics.fpsUpdateTime;
        
        if (timeSinceLastFPSUpdate >= 1000) {
            this.frameMetrics.fps = Math.round(this.frameMetrics.fpsFrameCount * 1000 / timeSinceLastFPSUpdate);
            this.frameMetrics.fpsFrameCount = 0;
            this.frameMetrics.fpsUpdateTime = now;
        }
        
        this.frameMetrics.lastTime = now;
    }
    
    measure(name, fn) {
        const start = performance.now();
        const result = fn();
        const duration = performance.now() - start;
        
        this.breakdown[name] = duration;
        
        return result;
    }
    
    startMeasure(name) {
        this.metrics.set(name, performance.now());
    }
    
    endMeasure(name) {
        const start = this.metrics.get(name);
        if (start) {
            const duration = performance.now() - start;
            this.metrics.delete(name);
            this.breakdown[name] = duration;
            return duration;
        }
        return 0;
    }
    
    getStats() {
        return {
            fps: this.frameMetrics.fps,
            frameTime: this.frameMetrics.frameTime.toFixed(2),
            avgFrameTime: this.frameMetrics.frameTime.toFixed(2),
            breakdown: this.breakdown
        };
    }
    
    reset() {
        this.metrics.clear();
        this.breakdown = {};
    }
}

// Also keep the old interface for backwards compatibility
window.PerformanceMonitor = PerformanceMonitor;