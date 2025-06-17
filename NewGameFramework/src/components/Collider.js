// GameFramework/src/components/Collider.js
import { Component } from '../core/Component.js';
import { Vector2 } from '../core/Vector2.js';
import { CollisionShape, CollisionLayers } from '../systems/CollisionSystem.js';

/**
 * Collider - Collision detection component
 * @class Collider
 */
export class Collider extends Component {
    constructor(config = {}) {
        super(config);
        
        // Collision shape
        this.shape = config.shape || CollisionShape.RECTANGLE;
        
        // Shape dimensions
        this.width = config.width || 32;
        this.height = config.height || 32;
        this.radius = config.radius || 16;
        this.vertices = config.vertices || []; // For polygon shape
        
        // Offset from entity position
        this.offset = new Vector2(config.offsetX || 0, config.offsetY || 0);
        
        // Collision properties
        this.isTrigger = config.isTrigger || false;
        this.isStatic = config.isStatic || false;
        
        // Collision layers
        this.layer = config.layer || CollisionLayers.DEFAULT;
        this.mask = config.mask !== undefined ? config.mask : -1; // Collides with all by default
        
        // Material properties
        this.restitution = config.restitution || 0; // Bounciness
        this.friction = config.friction || 0.5;
        
        // Collision callbacks
        this.onCollisionEnter = config.onCollisionEnter;
        this.onCollisionStay = config.onCollisionStay;
        this.onCollisionExit = config.onCollisionExit;
        
        // For compound colliders
        this.isCompound = config.isCompound || false;
        this.childColliders = [];
    }
    
    /**
     * Get world-space bounds
     * @returns {object} Bounds object
     */
    getBounds() {
        const worldPos = this.entity.position.add(this.offset);
        const scale = this.entity.scale;
        
        switch (this.shape) {
            case CollisionShape.RECTANGLE:
                return {
                    x: worldPos.x - (this.width * scale.x) / 2,
                    y: worldPos.y - (this.height * scale.y) / 2,
                    width: this.width * scale.x,
                    height: this.height * scale.y
                };
                
            case CollisionShape.CIRCLE:
                const scaledRadius = this.radius * Math.max(scale.x, scale.y);
                return {
                    x: worldPos.x - scaledRadius,
                    y: worldPos.y - scaledRadius,
                    width: scaledRadius * 2,
                    height: scaledRadius * 2,
                    radius: scaledRadius
                };
                
            case CollisionShape.POLYGON:
                // For polygons, return AABB
                const transformedVerts = this.getTransformedVertices();
                let minX = Infinity, minY = Infinity;
                let maxX = -Infinity, maxY = -Infinity;
                
                transformedVerts.forEach(v => {
                    minX = Math.min(minX, v.x);
                    minY = Math.min(minY, v.y);
                    maxX = Math.max(maxX, v.x);
                    maxY = Math.max(maxY, v.y);
                });
                
                return {
                    x: minX,
                    y: minY,
                    width: maxX - minX,
                    height: maxY - minY
                };
                
            default:
                return {
                    x: worldPos.x - 16,
                    y: worldPos.y - 16,
                    width: 32,
                    height: 32
                };
        }
    }
    
    /**
     * Get transformed vertices for polygon collider
     * @returns {Vector2[]}
     */
    getTransformedVertices() {
        const worldPos = this.entity.position.add(this.offset);
        const rotation = this.entity.rotation;
        const scale = this.entity.scale;
        
        return this.vertices.map(v => {
            // Scale
            let transformed = new Vector2(v.x * scale.x, v.y * scale.y);
            
            // Rotate
            if (rotation !== 0) {
                transformed = transformed.rotate(rotation);
            }
            
            // Translate
            return transformed.add(worldPos);
        });
    }
    
    /**
     * Check if point is inside collider
     * @param {Vector2} point - Point to test
     * @returns {boolean}
     */
    containsPoint(point) {
        const bounds = this.getBounds();
        
        switch (this.shape) {
            case CollisionShape.RECTANGLE:
                return point.x >= bounds.x &&
                       point.x <= bounds.x + bounds.width &&
                       point.y >= bounds.y &&
                       point.y <= bounds.y + bounds.height;
                
            case CollisionShape.CIRCLE:
                const center = new Vector2(
                    bounds.x + bounds.width / 2,
                    bounds.y + bounds.height / 2
                );
                return point.distanceTo(center) <= bounds.radius;
                
            case CollisionShape.POLYGON:
                return this.pointInPolygon(point, this.getTransformedVertices());
                
            default:
                return false;
        }
    }
    
    /**
     * Point in polygon test
     * @private
     */
    pointInPolygon(point, vertices) {
        let inside = false;
        
        for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
            const xi = vertices[i].x, yi = vertices[i].y;
            const xj = vertices[j].x, yj = vertices[j].y;
            
            const intersect = ((yi > point.y) !== (yj > point.y)) &&
                (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
            
            if (intersect) inside = !inside;
        }
        
        return inside;
    }
    
    /**
     * Set collision layer
     * @param {number} layer - Layer value
     */
    setLayer(layer) {
        this.layer = layer;
    }
    
    /**
     * Set collision mask
     * @param {number} mask - Mask value
     */
    setMask(mask) {
        this.mask = mask;
    }
    
    /**
     * Add layers to collision mask
     * @param {...number} layers - Layers to add
     */
    addToMask(...layers) {
        layers.forEach(layer => {
            this.mask |= layer;
        });
    }
    
    /**
     * Remove layers from collision mask
     * @param {...number} layers - Layers to remove
     */
    removeFromMask(...layers) {
        layers.forEach(layer => {
            this.mask &= ~layer;
        });
    }
    
    /**
     * Check if collides with layer
     * @param {number} layer - Layer to check
     * @returns {boolean}
     */
    collidesWithLayer(layer) {
        return (this.mask & layer) !== 0;
    }
    
    /**
     * Create a box collider
     * @static
     * @param {number} width - Box width
     * @param {number} height - Box height
     * @param {object} options - Additional options
     * @returns {Collider}
     */
    static box(width, height, options = {}) {
        return new Collider({
            shape: CollisionShape.RECTANGLE,
            width,
            height,
            ...options
        });
    }
    
    /**
     * Create a circle collider
     * @static
     * @param {number} radius - Circle radius
     * @param {object} options - Additional options
     * @returns {Collider}
     */
    static circle(radius, options = {}) {
        return new Collider({
            shape: CollisionShape.CIRCLE,
            radius,
            width: radius * 2,
            height: radius * 2,
            ...options
        });
    }
    
    /**
     * Create a polygon collider
     * @static
     * @param {Vector2[]} vertices - Polygon vertices
     * @param {object} options - Additional options
     * @returns {Collider}
     */
    static polygon(vertices, options = {}) {
        return new Collider({
            shape: CollisionShape.POLYGON,
            vertices,
            ...options
        });
    }
    
    /**
     * Debug render
     * @param {CanvasRenderingContext2D} context - Canvas context
     */
    debugRender(context) {
        const bounds = this.getBounds();
        
        context.strokeStyle = this.isTrigger ? '#ffff00' : '#00ff00';
        context.lineWidth = 2;
        
        switch (this.shape) {
            case CollisionShape.RECTANGLE:
                context.strokeRect(
                    bounds.x - this.entity.position.x,
                    bounds.y - this.entity.position.y,
                    bounds.width,
                    bounds.height
                );
                break;
                
            case CollisionShape.CIRCLE:
                context.beginPath();
                context.arc(
                    this.offset.x,
                    this.offset.y,
                    bounds.radius || this.radius,
                    0,
                    Math.PI * 2
                );
                context.stroke();
                break;
                
            case CollisionShape.POLYGON:
                const verts = this.getTransformedVertices();
                if (verts.length > 0) {
                    context.beginPath();
                    context.moveTo(
                        verts[0].x - this.entity.position.x,
                        verts[0].y - this.entity.position.y
                    );
                    
                    for (let i = 1; i < verts.length; i++) {
                        context.lineTo(
                            verts[i].x - this.entity.position.x,
                            verts[i].y - this.entity.position.y
                        );
                    }
                    
                    context.closePath();
                    context.stroke();
                }
                break;
        }
        
        // Draw offset indicator
        if (this.offset.magnitude() > 0) {
            context.strokeStyle = '#ff00ff';
            context.lineWidth = 1;
            context.beginPath();
            context.moveTo(0, 0);
            context.lineTo(this.offset.x, this.offset.y);
            context.stroke();
            
            context.fillStyle = '#ff00ff';
            context.beginPath();
            context.arc(this.offset.x, this.offset.y, 3, 0, Math.PI * 2);
            context.fill();
        }
    }
}