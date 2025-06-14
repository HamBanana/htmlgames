// collision-system.js - Collision detection and resolution

class CollisionSystem {
    constructor() {
        this.collisionLayers = new Map();
        this.collisionMatrix = new Map();
    }
    
    // Check basic AABB collision
    checkCollision(a, b) {
        return a.x < b.x + b.width &&
               a.x + a.width > b.x &&
               a.y < b.y + b.height &&
               a.y + a.height > b.y;
    }
    
    // Get collision overlap
    getOverlap(a, b) {
        const overlapX = Math.min(a.x + a.width - b.x, b.x + b.width - a.x);
        const overlapY = Math.min(a.y + a.height - b.y, b.y + b.height - a.y);
        
        return {
            x: overlapX,
            y: overlapY,
            total: overlapX * overlapY
        };
    }
    
    // Get collision side
    getCollisionSide(a, b) {
        const overlap = this.getOverlap(a, b);
        
        if (overlap.x < overlap.y) {
            // Horizontal collision
            if (a.x < b.x) {
                return 'right'; // A hit B from the right
            } else {
                return 'left'; // A hit B from the left
            }
        } else {
            // Vertical collision
            if (a.y < b.y) {
                return 'bottom'; // A hit B from below
            } else {
                return 'top'; // A hit B from above
            }
        }
    }
    
    // Resolve collision by separating objects
    resolveCollision(movable, staticObject) {
        const overlap = this.getOverlap(movable, staticObject);
        const side = this.getCollisionSide(movable, staticObject);
        
        switch (side) {
            case 'left':
                movable.x = staticObject.x - movable.width;
                if (movable.vx > 0) movable.vx = 0;
                break;
            case 'right':
                movable.x = staticObject.x + staticObject.width;
                if (movable.vx < 0) movable.vx = 0;
                break;
            case 'top':
                movable.y = staticObject.y - movable.height;
                if (movable.vy > 0) {
                    movable.vy = 0;
                    movable.grounded = true;
                }
                break;
            case 'bottom':
                movable.y = staticObject.y + staticObject.height;
                if (movable.vy < 0) movable.vy = 0;
                break;
        }
        
        return side;
    }
    
    // Check circle collision (for special effects)
    checkCircleCollision(circle1, circle2) {
        const dx = (circle1.x + circle1.radius) - (circle2.x + circle2.radius);
        const dy = (circle1.y + circle1.radius) - (circle2.y + circle2.radius);
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance < circle1.radius + circle2.radius;
    }
    
    // Check point in rectangle
    pointInRect(point, rect) {
        return point.x >= rect.x &&
               point.x <= rect.x + rect.width &&
               point.y >= rect.y &&
               point.y <= rect.y + rect.height;
    }
    
    // Check line intersection with rectangle
    lineIntersectsRect(lineStart, lineEnd, rect) {
        // Check if either endpoint is inside the rectangle
        if (this.pointInRect(lineStart, rect) || this.pointInRect(lineEnd, rect)) {
            return true;
        }
        
        // Check if line intersects any edge of the rectangle
        const rectEdges = [
            { start: { x: rect.x, y: rect.y }, end: { x: rect.x + rect.width, y: rect.y } },
            { start: { x: rect.x + rect.width, y: rect.y }, end: { x: rect.x + rect.width, y: rect.y + rect.height } },
            { start: { x: rect.x + rect.width, y: rect.y + rect.height }, end: { x: rect.x, y: rect.y + rect.height } },
            { start: { x: rect.x, y: rect.y + rect.height }, end: { x: rect.x, y: rect.y } }
        ];
        
        for (const edge of rectEdges) {
            if (this.lineIntersectsLine(lineStart, lineEnd, edge.start, edge.end)) {
                return true;
            }
        }
        
        return false;
    }
    
    // Check if two lines intersect
    lineIntersectsLine(p1, p2, p3, p4) {
        const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
        
        if (Math.abs(denominator) < 0.0001) {
            return false; // Lines are parallel
        }
        
        const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
        const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;
        
        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }
    
    // Spatial hashing for performance
    getSpatialHash(x, y, cellSize = 100) {
        const gridX = Math.floor(x / cellSize);
        const gridY = Math.floor(y / cellSize);
        return `${gridX},${gridY}`;
    }
    
    // Get nearby entities using spatial hashing
    getNearbyEntities(entity, entities, cellSize = 100) {
        const nearby = [];
        const entityHash = this.getSpatialHash(entity.x, entity.y, cellSize);
        
        // Check surrounding cells
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                const checkX = entity.x + dx * cellSize;
                const checkY = entity.y + dy * cellSize;
                const hash = this.getSpatialHash(checkX, checkY, cellSize);
                
                entities.forEach(other => {
                    if (other !== entity && 
                        this.getSpatialHash(other.x, other.y, cellSize) === hash) {
                        nearby.push(other);
                    }
                });
            }
        }
        
        return nearby;
    }
    
    // Broad phase collision detection
    broadPhase(entities) {
        const potentialCollisions = [];
        const spatialMap = new Map();
        
        // Build spatial map
        entities.forEach(entity => {
            const hash = this.getSpatialHash(entity.x, entity.y);
            if (!spatialMap.has(hash)) {
                spatialMap.set(hash, []);
            }
            spatialMap.get(hash).push(entity);
        });
        
        // Check potential collisions
        spatialMap.forEach(cellEntities => {
            for (let i = 0; i < cellEntities.length; i++) {
                for (let j = i + 1; j < cellEntities.length; j++) {
                    potentialCollisions.push([cellEntities[i], cellEntities[j]]);
                }
            }
        });
        
        return potentialCollisions;
    }
}