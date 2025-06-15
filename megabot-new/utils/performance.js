// utils/performance.js - Performance monitoring utilities

class PerformanceMonitor {
    constructor() {
        this.metrics = new Map();
        this.frameMetrics = {
            fps: 0,
            frameTime: 0,
            frames: [],
            maxFrames: 60
        };
        this.measurementCategories = new Map();
        this.frameStartTime = 0;
    }
    
    startFrame() {
        this.frameStartTime = performance.now();
    }
    
    endFrame() {
        if (this.frameStartTime === 0) return;
        
        const frameTime = performance.now() - this.frameStartTime;
        this.frameMetrics.frames.push(frameTime);
        
        if (this.frameMetrics.frames.length > this.frameMetrics.maxFrames) {
            this.frameMetrics.frames.shift();
        }
        
        // Calculate average frame time and FPS
        const avgFrameTime = this.frameMetrics.frames.reduce((a, b) => a + b, 0) / this.frameMetrics.frames.length;
        this.frameMetrics.frameTime = avgFrameTime;
        this.frameMetrics.fps = Math.round(1000 / avgFrameTime);
        
        this.frameStartTime = 0;
    }
    
    startMeasure(name) {
        this.metrics.set(name, performance.now());
    }
    
    endMeasure(name) {
        const startTime = this.metrics.get(name);
        if (startTime) {
            const duration = performance.now() - startTime;
            this.metrics.delete(name);
            
            // Store in category for averaging
            if (!this.measurementCategories.has(name)) {
                this.measurementCategories.set(name, []);
            }
            
            const category = this.measurementCategories.get(name);
            category.push(duration);
            
            // Keep only recent measurements
            if (category.length > 60) {
                category.shift();
            }
            
            return duration;
        }
        return 0;
    }
    
    measure(name, fn) {
        this.startMeasure(name);
        const result = fn();
        this.endMeasure(name);
        return result;
    }
    
    getFPS() {
        return this.frameMetrics.fps;
    }
    
    getFrameTime() {
        return this.frameMetrics.frameTime;
    }
    
    getStats() {
        const stats = {
            fps: this.frameMetrics.fps,
            frameTime: this.frameMetrics.frameTime.toFixed(2),
            avgFrameTime: this.frameMetrics.frameTime.toFixed(2),
            breakdown: {}
        };
        
        // Add measurement breakdowns
        this.measurementCategories.forEach((measurements, name) => {
            if (measurements.length > 0) {
                const avg = measurements.reduce((a, b) => a + b, 0) / measurements.length;
                const max = Math.max(...measurements);
                stats.breakdown[name] = {
                    avg: avg.toFixed(2),
                    max: max.toFixed(2)
                };
            }
        });
        
        return stats;
    }
    
    getAverageTime(name) {
        const measurements = this.measurementCategories.get(name);
        if (!measurements || measurements.length === 0) return 0;
        
        return measurements.reduce((a, b) => a + b, 0) / measurements.length;
    }
    
    reset() {
        this.metrics.clear();
        this.measurementCategories.clear();
        this.frameMetrics.frames = [];
        this.frameMetrics.fps = 0;
        this.frameMetrics.frameTime = 0;
    }
    
    // Static utility methods for backwards compatibility
    static startMeasure(name) {
        if (!window._globalPerformanceMonitor) {
            window._globalPerformanceMonitor = new PerformanceMonitor();
        }
        window._globalPerformanceMonitor.startMeasure(name);
    }
    
    static endMeasure(name) {
        if (window._globalPerformanceMonitor) {
            const duration = window._globalPerformanceMonitor.endMeasure(name);
            console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
            return duration;
        }
        return 0;
    }
}

// Export as global for backwards compatibility
window.PerformanceMonitor = PerformanceMonitor;