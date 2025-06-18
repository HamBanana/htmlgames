// GameFramework/src/core/Vector2.js
/**
 * Vector2 Class - 2D vector mathematics
 * @class Vector2
 */
export class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    set(x, y) {
        this.x = x;
        this.y = y;
        return this;
    }
    
    copy() {
        return new Vector2(this.x, this.y);
    }
    
    add(v) {
        return new Vector2(this.x + v.x, this.y + v.y);
    }
    
    subtract(v) {
        return new Vector2(this.x - v.x, this.y - v.y);
    }
    
    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }
    
    divide(scalar) {
        return new Vector2(this.x / scalar, this.y / scalar);
    }
    
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2(0, 0);
        return this.divide(mag);
    }
    
    distanceTo(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    dot(v) {
        return this.x * v.x + this.y * v.y;
    }
    
    angle() {
        return Math.atan2(this.y, this.x);
    }
    
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }
    
    lerp(v, t) {
        return new Vector2(
            this.x + (v.x - this.x) * t,
            this.y + (v.y - this.y) * t
        );
    }
    
    equals(v) {
        return this.x === v.x && this.y === v.y;
    }
    
    toString() {
        return `Vector2(${this.x}, ${this.y})`;
    }
}

// Static methods
Vector2.ZERO = new Vector2(0, 0);
Vector2.ONE = new Vector2(1, 1);
Vector2.UP = new Vector2(0, -1);
Vector2.DOWN = new Vector2(0, 1);
Vector2.LEFT = new Vector2(-1, 0);
Vector2.RIGHT = new Vector2(1, 0);

Vector2.fromAngle = (angle) => {
    return new Vector2(Math.cos(angle), Math.sin(angle));
};

Vector2.random = () => {
    return new Vector2(Math.random() * 2 - 1, Math.random() * 2 - 1).normalize();
};