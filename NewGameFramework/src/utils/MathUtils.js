// GameFramework/src/utils/MathUtils.js
import { Vector2 } from '../core/Vector2.js';

/**
 * MathUtils - Mathematical utility functions
 */
export const MathUtils = {
    /**
     * Constants
     */
    PI2: Math.PI * 2,
    HALF_PI: Math.PI / 2,
    QUARTER_PI: Math.PI / 4,
    DEG_TO_RAD: Math.PI / 180,
    RAD_TO_DEG: 180 / Math.PI,
    EPSILON: 0.00001,
    
    /**
     * Clamp a value between min and max
     * @param {number} value - Value to clamp
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number}
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },
    
    /**
     * Linear interpolation
     * @param {number} start - Start value
     * @param {number} end - End value
     * @param {number} t - Interpolation factor (0-1)
     * @returns {number}
     */
    lerp(start, end, t) {
        return start + (end - start) * t;
    },
    
    /**
     * Inverse linear interpolation
     * @param {number} start - Start value
     * @param {number} end - End value
     * @param {number} value - Current value
     * @returns {number} Interpolation factor (0-1)
     */
    inverseLerp(start, end, value) {
        if (Math.abs(end - start) < this.EPSILON) return 0;
        return (value - start) / (end - start);
    },
    
    /**
     * Map a value from one range to another
     * @param {number} value - Value to map
     * @param {number} inMin - Input minimum
     * @param {number} inMax - Input maximum
     * @param {number} outMin - Output minimum
     * @param {number} outMax - Output maximum
     * @returns {number}
     */
    map(value, inMin, inMax, outMin, outMax) {
        const t = this.inverseLerp(inMin, inMax, value);
        return this.lerp(outMin, outMax, t);
    },
    
    /**
     * Smooth step interpolation
     * @param {number} edge0 - Lower edge
     * @param {number} edge1 - Upper edge
     * @param {number} x - Value
     * @returns {number}
     */
    smoothStep(edge0, edge1, x) {
        const t = this.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * (3 - 2 * t);
    },
    
    /**
     * Smoother step interpolation
     * @param {number} edge0 - Lower edge
     * @param {number} edge1 - Upper edge
     * @param {number} x - Value
     * @returns {number}
     */
    smootherStep(edge0, edge1, x) {
        const t = this.clamp((x - edge0) / (edge1 - edge0), 0, 1);
        return t * t * t * (t * (t * 6 - 15) + 10);
    },
    
    /**
     * Move towards target value
     * @param {number} current - Current value
     * @param {number} target - Target value
     * @param {number} maxDelta - Maximum change
     * @returns {number}
     */
    moveTowards(current, target, maxDelta) {
        if (Math.abs(target - current) <= maxDelta) {
            return target;
        }
        return current + Math.sign(target - current) * maxDelta;
    },
    
    /**
     * Move towards angle
     * @param {number} current - Current angle in radians
     * @param {number} target - Target angle in radians
     * @param {number} maxDelta - Maximum change in radians
     * @returns {number}
     */
    moveTowardsAngle(current, target, maxDelta) {
        const delta = this.deltaAngle(current, target);
        if (-maxDelta < delta && delta < maxDelta) {
            return target;
        }
        target = current + delta;
        return this.moveTowards(current, target, maxDelta);
    },
    
    /**
     * Calculate shortest angle difference
     * @param {number} current - Current angle in radians
     * @param {number} target - Target angle in radians
     * @returns {number} Delta angle in radians
     */
    deltaAngle(current, target) {
        let delta = target - current;
        while (delta > Math.PI) delta -= this.PI2;
        while (delta < -Math.PI) delta += this.PI2;
        return delta;
    },
    
    /**
     * Normalize angle to range [0, 2π]
     * @param {number} angle - Angle in radians
     * @returns {number}
     */
    normalizeAngle(angle) {
        angle = angle % this.PI2;
        if (angle < 0) angle += this.PI2;
        return angle;
    },
    
    /**
     * Normalize angle to range [-π, π]
     * @param {number} angle - Angle in radians
     * @returns {number}
     */
    normalizeAngleSigned(angle) {
        while (angle > Math.PI) angle -= this.PI2;
        while (angle < -Math.PI) angle += this.PI2;
        return angle;
    },
    
    /**
     * Convert degrees to radians
     * @param {number} degrees - Angle in degrees
     * @returns {number} Angle in radians
     */
    degToRad(degrees) {
        return degrees * this.DEG_TO_RAD;
    },
    
    /**
     * Convert radians to degrees
     * @param {number} radians - Angle in radians
     * @returns {number} Angle in degrees
     */
    radToDeg(radians) {
        return radians * this.RAD_TO_DEG;
    },
    
    /**
     * Calculate distance between two points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number}
     */
    distance(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },
    
    /**
     * Calculate squared distance (faster than distance)
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number}
     */
    distanceSquared(x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        return dx * dx + dy * dy;
    },
    
    /**
     * Calculate angle between two points
     * @param {number} x1 - First point X
     * @param {number} y1 - First point Y
     * @param {number} x2 - Second point X
     * @param {number} y2 - Second point Y
     * @returns {number} Angle in radians
     */
    angle(x1, y1, x2, y2) {
        return Math.atan2(y2 - y1, x2 - x1);
    },
    
    /**
     * Check if value is approximately equal
     * @param {number} a - First value
     * @param {number} b - Second value
     * @param {number} epsilon - Tolerance
     * @returns {boolean}
     */
    approximately(a, b, epsilon = this.EPSILON) {
        return Math.abs(a - b) < epsilon;
    },
    
    /**
     * Check if value is power of two
     * @param {number} value - Value to check
     * @returns {boolean}
     */
    isPowerOfTwo(value) {
        return (value & (value - 1)) === 0 && value !== 0;
    },
    
    /**
     * Get next power of two
     * @param {number} value - Value
     * @returns {number}
     */
    nextPowerOfTwo(value) {
        value--;
        value |= value >> 1;
        value |= value >> 2;
        value |= value >> 4;
        value |= value >> 8;
        value |= value >> 16;
        value++;
        return value;
    },
    
    /**
     * Random float between min and max
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number}
     */
    random(min = 0, max = 1) {
        return Math.random() * (max - min) + min;
    },
    
    /**
     * Random integer between min and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number}
     */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    /**
     * Random boolean with probability
     * @param {number} probability - Probability (0-1)
     * @returns {boolean}
     */
    randomBool(probability = 0.5) {
        return Math.random() < probability;
    },
    
    /**
     * Random sign (-1 or 1)
     * @returns {number}
     */
    randomSign() {
        return Math.random() < 0.5 ? -1 : 1;
    },
    
    /**
     * Random element from array
     * @param {Array} array - Array to pick from
     * @returns {*}
     */
    randomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    },
    
    /**
     * Shuffle array (Fisher-Yates)
     * @param {Array} array - Array to shuffle
     * @returns {Array} Shuffled array
     */
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },
    
    /**
     * Weighted random selection
     * @param {number[]} weights - Array of weights
     * @returns {number} Selected index
     */
    weightedRandom(weights) {
        const total = weights.reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * total;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) return i;
        }
        
        return weights.length - 1;
    },
    
    /**
     * Gaussian random (Box-Muller transform)
     * @param {number} mean - Mean value
     * @param {number} stdDev - Standard deviation
     * @returns {number}
     */
    gaussianRandom(mean = 0, stdDev = 1) {
        let u = 0, v = 0;
        while (u === 0) u = Math.random();
        while (v === 0) v = Math.random();
        
        const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
        return num * stdDev + mean;
    },
    
    /**
     * Perlin noise (simplified)
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @returns {number} Noise value (-1 to 1)
     */
    perlinNoise(x, y) {
        // This is a simplified version
        // For production, use a proper Perlin noise implementation
        const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        return (n - Math.floor(n)) * 2 - 1;
    },
    
    /**
     * Ease in quad
     * @param {number} t - Time (0-1)
     * @returns {number}
     */
    easeInQuad(t) {
        return t * t;
    },
    
    /**
     * Ease out quad
     * @param {number} t - Time (0-1)
     * @returns {number}
     */
    easeOutQuad(t) {
        return t * (2 - t);
    },
    
    /**
     * Ease in out quad
     * @param {number} t - Time (0-1)
     * @returns {number}
     */
    easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    },
    
    /**
     * Ease in cubic
     * @param {number} t - Time (0-1)
     * @returns {number}
     */
    easeInCubic(t) {
        return t * t * t;
    },
    
    /**
     * Ease out cubic
     * @param {number} t - Time (0-1)
     * @returns {number}
     */
    easeOutCubic(t) {
        return (--t) * t * t + 1;
    },
    
    /**
     * Ease in out cubic
     * @param {number} t - Time (0-1)
     * @returns {number}
     */
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    },
    
    /**
     * Ease in elastic
     * @param {number} t - Time (0-1)
     * @returns {number}
     */
    easeInElastic(t) {
        if (t === 0 || t === 1) return t;
        const p = 0.3;
        const s = p / 4;
        return -(Math.pow(2, 10 * (t - 1)) * Math.sin((t - 1 - s) * (2 * Math.PI) / p));
    },
    
    /**
     * Ease out elastic
     * @param {number} t - Time (0-1)
     * @returns {number}
     */
    easeOutElastic(t) {
        if (t === 0 || t === 1) return t;
        const p = 0.3;
        const s = p / 4;
        return Math.pow(2, -10 * t) * Math.sin((t - s) * (2 * Math.PI) / p) + 1;
    },
    
    /**
     * Ease out bounce
     * @param {number} t - Time (0-1)
     * @returns {number}
     */
    easeOutBounce(t) {
        if (t < 1 / 2.75) {
            return 7.5625 * t * t;
        } else if (t < 2 / 2.75) {
            return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
        } else if (t < 2.5 / 2.75) {
            return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
        } else {
            return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
        }
    }
};