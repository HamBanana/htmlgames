// ===== math.js (Utils) =====
window.GameMath = {
    distance: function(a, b) {
        const dx = (a.x + a.width/2) - (b.x + b.width/2);
        const dy = (a.y + a.height/2) - (b.y + b.height/2);
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    angle: function(from, to) {
        const dx = (to.x + to.width/2) - (from.x + from.width/2);
        const dy = (to.y + to.height/2) - (from.y + from.height/2);
        return Math.atan2(dy, dx);
    },
    
    normalize: function(vector) {
        const length = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
        if (length === 0) return { x: 0, y: 0 };
        return {
            x: vector.x / length,
            y: vector.y / length
        };
    }
};