// ===== performance.js (Utils) =====
window.PerformanceMonitor = {
    metrics: {},
    
    startMeasure: function(name) {
        this.metrics[name] = performance.now();
    },
    
    endMeasure: function(name) {
        if (this.metrics[name]) {
            const duration = performance.now() - this.metrics[name];
            console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
            delete this.metrics[name];
        }
    }
};