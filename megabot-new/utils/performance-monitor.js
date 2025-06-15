class DetailedPerformanceMonitor {
    constructor() {
        this.metrics = {
            update: [],
            render: [],
            physics: [],
            collision: []
        };
        
        this.framebudget = 16.67; // 60 FPS
    }
    
    measure(category, fn) {
        const start = performance.now();
        const result = fn();
        const duration = performance.now() - start;
        
        this.metrics[category].push(duration);
        if (this.metrics[category].length > 60) {
            this.metrics[category].shift();
        }
        
        return result;
    }
    
    getReport() {
        const report = {};
        
        for (const [category, times] of Object.entries(this.metrics)) {
            const avg = times.reduce((a, b) => a + b, 0) / times.length;
            const max = Math.max(...times);
            
            report[category] = {
                average: avg.toFixed(2),
                max: max.toFixed(2),
                overBudget: avg > this.framebudget
            };
        }
        
        return report;
    }
}