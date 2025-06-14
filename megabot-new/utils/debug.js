// ===== debug.js (Utils) =====
window.DebugSystem = {
    enabled: false,
    
    log: function(...args) {
        if (this.enabled) {
            console.log('[DEBUG]', ...args);
        }
    },
    
    drawHitbox: function(ctx, entity, color = '#ff0000') {
        if (!this.enabled) return;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(entity.x, entity.y, entity.width, entity.height);
    }
};