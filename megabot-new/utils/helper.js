// ===== helpers.js (Utils) =====
window.GameHelpers = {
    clamp: function(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    lerp: function(start, end, t) {
        return start + (end - start) * t;
    },
    
    randomRange: function(min, max) {
        return Math.random() * (max - min) + min;
    },
    
    randomInt: function(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
};