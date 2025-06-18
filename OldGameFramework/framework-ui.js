// GameFramework/framework-ui.js - UI system and components

/**
 * UI Manager System
 */
class UISystem extends System {
    constructor(config = {}) {
        super(config);
        this.elements = new Map();
        this.activeDialogs = [];
        this.defaultFont = config.defaultFont || '16px Arial';
        this.defaultColor = config.defaultColor || '#ffffff';
    }
    
    addElement(id, element) {
        element.id = id;
        element.system = this;
        this.elements.set(id, element);
        return element;
    }
    
    removeElement(id) {
        this.elements.delete(id);
    }
    
    getElement(id) {
        return this.elements.get(id);
    }
    
    update(deltaTime) {
        this.elements.forEach(element => {
            if (element.active && element.update) {
                element.update(deltaTime);
            }
        });
    }
    
    render(context) {
        // Sort by z-index
        const sorted = Array.from(this.elements.values())
            .filter(e => e.visible)
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
        
        sorted.forEach(element => {
            if (element.render) {
                element.render(context);
            }
        });
    }
    
    showDialog(text, options = {}) {
        const dialog = new DialogBox({
            text,
            ...options
        });
        
        this.activeDialogs.push(dialog);
        this.addElement(`dialog_${Date.now()}`, dialog);
        
        return dialog;
    }
}

/**
 * Base UI Element
 */
class UIElement {
    constructor(config = {}) {
        this.x = config.x || 0;
        this.y = config.y || 0;
        this.width = config.width || 100;
        this.height = config.height || 50;
        this.anchor = config.anchor || { x: 0, y: 0 }; // 0-1, relative to element
        this.pivot = config.pivot || { x: 0, y: 0 }; // 0-1, relative to screen
        this.active = config.active !== false;
        this.visible = config.visible !== false;
        this.zIndex = config.zIndex || 0;
        this.system = null;
    }
    
    get game() {
        return this.system?.game;
    }
    
    get screenX() {
        const canvas = this.game?.canvas;
        if (!canvas) return this.x;
        
        return this.x + canvas.width * this.pivot.x - this.width * this.anchor.x;
    }
    
    get screenY() {
        const canvas = this.game?.canvas;
        if (!canvas) return this.y;
        
        return this.y + canvas.height * this.pivot.y - this.height * this.anchor.y;
    }
    
    update(deltaTime) {}
    render(context) {}
    
    destroy() {
        if (this.system && this.id) {
            this.system.removeElement(this.id);
        }
    }
}

/**
 * Health Bar UI
 */
class HealthBar extends UIElement {
    constructor(config = {}) {
        super(config);
        this.entity = config.entity;
        this.maxHealth = config.maxHealth || 100;
        this.currentHealth = config.currentHealth || this.maxHealth;
        this.backgroundColor = config.backgroundColor || '#333333';
        this.healthColor = config.healthColor || '#00ff00';
        this.damageColor = config.damageColor || '#ff0000';
        this.borderColor = config.borderColor || '#ffffff';
        this.borderWidth = config.borderWidth || 2;
        this.showText = config.showText || false;
        this.animated = config.animated !== false;
        this.displayHealth = this.currentHealth;
    }
    
    update(deltaTime) {
        // Follow entity if attached
        if (this.entity) {
            const health = this.entity.getComponent(HealthComponent);
            if (health) {
                this.currentHealth = health.health;
                this.maxHealth = health.maxHealth;
            }
        }
        
        // Animate health change
        if (this.animated) {
            const diff = this.currentHealth - this.displayHealth;
            this.displayHealth += diff * deltaTime * 5;
        } else {
            this.displayHealth = this.currentHealth;
        }
    }
    
    render(context) {
        const x = this.screenX;
        const y = this.screenY;
        
        // Background
        context.fillStyle = this.backgroundColor;
        context.fillRect(x, y, this.width, this.height);
        
        // Health fill
        const healthPercent = Math.max(0, Math.min(1, this.displayHealth / this.maxHealth));
        const healthWidth = this.width * healthPercent;
        
        // Gradient based on health
        const gradient = context.createLinearGradient(x, y, x + this.width, y);
        if (healthPercent > 0.5) {
            gradient.addColorStop(0, this.healthColor);
            gradient.addColorStop(1, this.healthColor);
        } else if (healthPercent > 0.25) {
            gradient.addColorStop(0, '#ffff00');
            gradient.addColorStop(1, '#ff9900');
        } else {
            gradient.addColorStop(0, this.damageColor);
            gradient.addColorStop(1, '#990000');
        }
        
        context.fillStyle = gradient;
        context.fillRect(x, y, healthWidth, this.height);
        
        // Border
        if (this.borderWidth > 0) {
            context.strokeStyle = this.borderColor;
            context.lineWidth = this.borderWidth;
            context.strokeRect(x, y, this.width, this.height);
        }
        
        // Text
        if (this.showText) {
            context.fillStyle = this.borderColor;
            context.font = '12px Arial';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(
                `${Math.ceil(this.displayHealth)}/${this.maxHealth}`,
                x + this.width / 2,
                y + this.height / 2
            );
        }
    }
}

/**
 * Score Display
 */
class ScoreDisplay extends UIElement {
    constructor(config = {}) {
        super({
            width: 200,
            height: 40,
            ...config
        });
        this.score = config.score || 0;
        this.targetScore = this.score;
        this.prefix = config.prefix || 'Score: ';
        this.font = config.font || 'bold 24px Arial';
        this.color = config.color || '#ffffff';
        this.shadowColor = config.shadowColor || '#000000';
        this.shadowBlur = config.shadowBlur || 4;
        this.animated = config.animated !== false;
        this.animationSpeed = config.animationSpeed || 5;
    }
    
    setScore(value) {
        this.targetScore = value;
        
        if (!this.animated) {
            this.score = value;
        }
    }
    
    addScore(value) {
        this.setScore(this.targetScore + value);
    }
    
    update(deltaTime) {
        if (this.animated && this.score !== this.targetScore) {
            const diff = this.targetScore - this.score;
            const change = diff * deltaTime * this.animationSpeed;
            
            if (Math.abs(diff) < 1) {
                this.score = this.targetScore;
            } else {
                this.score += change;
            }
        }
    }
    
    render(context) {
        const x = this.screenX;
        const y = this.screenY;
        
        context.save();
        
        // Shadow
        if (this.shadowBlur > 0) {
            context.shadowColor = this.shadowColor;
            context.shadowBlur = this.shadowBlur;
        }
        
        // Text
        context.fillStyle = this.color;
        context.font = this.font;
        context.textAlign = 'left';
        context.textBaseline = 'top';
        
        const displayScore = Math.round(this.score);
        context.fillText(this.prefix + displayScore, x, y);
        
        context.restore();
    }
}

/**
 * Dialog Box
 */
class DialogBox extends UIElement {
    constructor(config = {}) {
        super({
            width: config.width || 400,
            height: config.height || 150,
            anchor: { x: 0.5, y: 0.5 },
            pivot: { x: 0.5, y: 0.5 },
            zIndex: 100,
            ...config
        });
        
        this.text = config.text || '';
        this.title = config.title || '';
        this.font = config.font || '16px Arial';
        this.titleFont = config.titleFont || 'bold 20px Arial';
        this.textColor = config.textColor || '#ffffff';
        this.backgroundColor = config.backgroundColor || 'rgba(0, 0, 0, 0.9)';
        this.borderColor = config.borderColor || '#ffffff';
        this.borderWidth = config.borderWidth || 2;
        this.padding = config.padding || 20;
        this.typewriter = config.typewriter !== false;
        this.typewriterSpeed = config.typewriterSpeed || 30; // chars per second
        this.onComplete = config.onComplete;
        this.autoClose = config.autoClose || 0; // seconds, 0 = manual close
        
        this.displayedText = '';
        this.charIndex = 0;
        this.timer = 0;
        this.closeTimer = 0;
        this.complete = false;
    }
    
    update(deltaTime) {
        // Typewriter effect
        if (this.typewriter && this.charIndex < this.text.length) {
            this.timer += deltaTime;
            const charsToAdd = Math.floor(this.timer * this.typewriterSpeed);
            
            if (charsToAdd > 0) {
                this.charIndex = Math.min(this.charIndex + charsToAdd, this.text.length);
                this.displayedText = this.text.substring(0, this.charIndex);
                this.timer = 0;
                
                if (this.charIndex >= this.text.length) {
                    this.onTextComplete();
                }
            }
        }
        
        // Auto close
        if (this.complete && this.autoClose > 0) {
            this.closeTimer += deltaTime;
            if (this.closeTimer >= this.autoClose) {
                this.close();
            }
        }
        
        // Check for skip input
        const input = this.game?.getSystem('input');
        if (input && input.isActionJustPressed('action')) {
            if (this.charIndex < this.text.length) {
                // Skip to end
                this.charIndex = this.text.length;
                this.displayedText = this.text;
                this.onTextComplete();
            } else if (this.complete) {
                // Close dialog
                this.close();
            }
        }
    }
    
    render(context) {
        const x = this.screenX;
        const y = this.screenY;
        
        // Background
        context.fillStyle = this.backgroundColor;
        context.fillRect(x, y, this.width, this.height);
        
        // Border
        if (this.borderWidth > 0) {
            context.strokeStyle = this.borderColor;
            context.lineWidth = this.borderWidth;
            context.strokeRect(x, y, this.width, this.height);
        }
        
        // Title
        if (this.title) {
            context.fillStyle = this.textColor;
            context.font = this.titleFont;
            context.textAlign = 'left';
            context.textBaseline = 'top';
            context.fillText(this.title, x + this.padding, y + this.padding);
        }
        
        // Text
        context.fillStyle = this.textColor;
        context.font = this.font;
        context.textAlign = 'left';
        context.textBaseline = 'top';
        
        const textY = y + this.padding + (this.title ? 30 : 0);
        const maxWidth = this.width - this.padding * 2;
        
        // Word wrap
        const words = this.displayedText.split(' ');
        let line = '';
        let lineY = textY;
        
        words.forEach(word => {
            const testLine = line + word + ' ';
            const metrics = context.measureText(testLine);
            
            if (metrics.width > maxWidth && line !== '') {
                context.fillText(line, x + this.padding, lineY);
                line = word + ' ';
                lineY += 20;
            } else {
                line = testLine;
            }
        });
        
        context.fillText(line, x + this.padding, lineY);
        
        // Continue indicator
        if (this.complete) {
            context.fillStyle = this.textColor;
            context.font = '12px Arial';
            context.textAlign = 'right';
            context.textBaseline = 'bottom';
            context.fillText('Press E to continue', x + this.width - this.padding, y + this.height - this.padding);
        }
    }
    
    onTextComplete() {
        this.complete = true;
        if (this.onComplete) {
            this.onComplete();
        }
    }
    
    close() {
        this.destroy();
        
        // Remove from active dialogs
        const uiSystem = this.system;
        if (uiSystem) {
            const index = uiSystem.activeDialogs.indexOf(this);
            if (index > -1) {
                uiSystem.activeDialogs.splice(index, 1);
            }
        }
    }
}

/**
 * Button UI
 */
class Button extends UIElement {
    constructor(config = {}) {
        super(config);
        this.text = config.text || 'Button';
        this.font = config.font || '16px Arial';
        this.textColor = config.textColor || '#ffffff';
        this.backgroundColor = config.backgroundColor || '#4444ff';
        this.hoverColor = config.hoverColor || '#6666ff';
        this.pressColor = config.pressColor || '#2222ff';
        this.borderColor = config.borderColor || '#ffffff';
        this.borderWidth = config.borderWidth || 2;
        this.borderRadius = config.borderRadius || 5;
        this.onClick = config.onClick;
        this.onHover = config.onHover;
        
        this.hovered = false;
        this.pressed = false;
        this.enabled = config.enabled !== false;
    }
    
    update(deltaTime) {
        if (!this.enabled) return;
        
        const input = this.game?.getSystem('input');
        if (!input) return;
        
        const mouse = input.getMousePosition();
        const x = this.screenX;
        const y = this.screenY;
        
        // Check hover
        const wasHovered = this.hovered;
        this.hovered = mouse.x >= x && mouse.x <= x + this.width &&
                      mouse.y >= y && mouse.y <= y + this.height;
        
        if (this.hovered && !wasHovered && this.onHover) {
            this.onHover();
        }
        
        // Check click
        if (this.hovered) {
            if (input.isMouseButtonPressed(0)) {
                this.pressed = true;
            } else if (this.pressed) {
                this.pressed = false;
                if (this.onClick) {
                    this.onClick();
                    this.game.playSound('button_click');
                }
            }
        } else {
            this.pressed = false;
        }
    }
    
    render(context) {
        const x = this.screenX;
        const y = this.screenY;
        
        // Determine color
        let bgColor = this.backgroundColor;
        if (!this.enabled) {
            bgColor = '#666666';
        } else if (this.pressed) {
            bgColor = this.pressColor;
        } else if (this.hovered) {
            bgColor = this.hoverColor;
        }
        
        // Draw rounded rectangle
        context.fillStyle = bgColor;
        context.beginPath();
        context.roundRect(x, y, this.width, this.height, this.borderRadius);
        context.fill();
        
        // Border
        if (this.borderWidth > 0) {
            context.strokeStyle = this.enabled ? this.borderColor : '#999999';
            context.lineWidth = this.borderWidth;
            context.stroke();
        }
        
        // Text
        context.fillStyle = this.enabled ? this.textColor : '#999999';
        context.font = this.font;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(this.text, x + this.width / 2, y + this.height / 2);
    }
}

/**
 * Mini Map
 */
class MiniMap extends UIElement {
    constructor(config = {}) {
        super({
            width: config.width || 200,
            height: config.height || 150,
            anchor: { x: 1, y: 0 },
            pivot: { x: 1, y: 0 },
            x: -10,
            y: 10,
            ...config
        });
        
        this.worldWidth = config.worldWidth || 1000;
        this.worldHeight = config.worldHeight || 1000;
        this.backgroundColor = config.backgroundColor || 'rgba(0, 0, 0, 0.7)';
        this.borderColor = config.borderColor || '#ffffff';
        this.playerColor = config.playerColor || '#00ff00';
        this.enemyColor = config.enemyColor || '#ff0000';
        this.objectColor = config.objectColor || '#ffff00';
        this.trackTypes = config.trackTypes || ['player', 'enemy', 'objective'];
    }
    
    render(context) {
        const x = this.screenX;
        const y = this.screenY;
        
        // Background
        context.fillStyle = this.backgroundColor;
        context.fillRect(x, y, this.width, this.height);
        
        // Border
        context.strokeStyle = this.borderColor;
        context.lineWidth = 1;
        context.strokeRect(x, y, this.width, this.height);
        
        // Scale factors
        const scaleX = this.width / this.worldWidth;
        const scaleY = this.height / this.worldHeight;
        
        // Draw tracked entities
        const entities = this.game?.getAllEntities() || [];
        
        entities.forEach(entity => {
            if (!this.trackTypes.includes(entity.type)) return;
            
            const mapX = x + entity.x * scaleX;
            const mapY = y + entity.y * scaleY;
            
            // Determine color
            let color = this.objectColor;
            if (entity.type === 'player') color = this.playerColor;
            else if (entity.type === 'enemy') color = this.enemyColor;
            
            // Draw dot
            context.fillStyle = color;
            context.beginPath();
            context.arc(mapX, mapY, 3, 0, Math.PI * 2);
            context.fill();
        });
        
        // Draw camera view
        const camera = this.game?.getSystem('camera');
        if (camera) {
            context.strokeStyle = '#ffffff';
            context.lineWidth = 1;
            context.setLineDash([2, 2]);
            context.strokeRect(
                x + camera.position.x * scaleX,
                y + camera.position.y * scaleY,
                (this.game.canvas.width) * scaleX,
                (this.game.canvas.height) * scaleY
            );
            context.setLineDash([]);
        }
    }
}

/**
 * Inventory UI
 */
class InventoryUI extends UIElement {
    constructor(config = {}) {
        super({
            width: config.width || 320,
            height: config.height || 240,
            anchor: { x: 0.5, y: 0.5 },
            pivot: { x: 0.5, y: 0.5 },
            visible: false,
            zIndex: 90,
            ...config
        });
        
        this.inventory = config.inventory; // InventoryComponent reference
        this.slots = config.slots || 20;
        this.columns = config.columns || 5;
        this.slotSize = config.slotSize || 48;
        this.slotSpacing = config.slotSpacing || 8;
        this.backgroundColor = config.backgroundColor || 'rgba(0, 0, 0, 0.9)';
        this.slotColor = config.slotColor || '#444444';
        this.selectedColor = config.selectedColor || '#ffff00';
        this.borderColor = config.borderColor || '#ffffff';
        
        this.selectedSlot = 0;
        this.itemSprites = config.itemSprites || {};
    }
    
    update(deltaTime) {
        const input = this.game?.getSystem('input');
        if (!input) return;
        
        // Toggle inventory
        if (input.isActionJustPressed('inventory')) {
            this.toggle();
        }
        
        if (!this.visible) return;
        
        // Navigate slots
        if (input.isActionJustPressed('left')) {
            this.selectedSlot = Math.max(0, this.selectedSlot - 1);
        } else if (input.isActionJustPressed('right')) {
            this.selectedSlot = Math.min(this.slots - 1, this.selectedSlot + 1);
        } else if (input.isActionJustPressed('up')) {
            this.selectedSlot = Math.max(0, this.selectedSlot - this.columns);
        } else if (input.isActionJustPressed('down')) {
            this.selectedSlot = Math.min(this.slots - 1, this.selectedSlot + this.columns);
        }
    }
    
    render(context) {
        const x = this.screenX;
        const y = this.screenY;
        
        // Background
        context.fillStyle = this.backgroundColor;
        context.fillRect(x, y, this.width, this.height);
        
        // Border
        context.strokeStyle = this.borderColor;
        context.lineWidth = 2;
        context.strokeRect(x, y, this.width, this.height);
        
        // Title
        context.fillStyle = '#ffffff';
        context.font = 'bold 20px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'top';
        context.fillText('Inventory', x + this.width / 2, y + 10);
        
        // Get items
        const items = this.inventory ? Array.from(this.inventory.items.entries()) : [];
        
        // Draw slots
        const startX = x + 20;
        const startY = y + 40;
        
        for (let i = 0; i < this.slots; i++) {
            const col = i % this.columns;
            const row = Math.floor(i / this.columns);
            const slotX = startX + col * (this.slotSize + this.slotSpacing);
            const slotY = startY + row * (this.slotSize + this.slotSpacing);
            
            // Slot background
            context.fillStyle = i === this.selectedSlot ? this.selectedColor : this.slotColor;
            context.fillRect(slotX, slotY, this.slotSize, this.slotSize);
            
            // Item
            if (i < items.length) {
                const [itemId, quantity] = items[i];
                
                // Item sprite
                const sprite = this.itemSprites[itemId];
                if (sprite && this.game) {
                    const renderer = this.game.getSystem('renderer');
                    if (renderer) {
                        context.save();
                        context.translate(slotX + this.slotSize / 2, slotY + this.slotSize / 2);
                        renderer.drawSprite(sprite, -16, -16, 32, 32);
                        context.restore();
                    }
                }
                
                // Quantity
                if (quantity > 1) {
                    context.fillStyle = '#ffffff';
                    context.font = '12px Arial';
                    context.textAlign = 'right';
                    context.textBaseline = 'bottom';
                    context.fillText(quantity.toString(), slotX + this.slotSize - 2, slotY + this.slotSize - 2);
                }
            }
        }
    }
    
    toggle() {
        this.visible = !this.visible;
        
        if (this.visible) {
            this.game.pause();
        } else {
            this.game.resume();
        }
    }
}

/**
 * Notification System
 */
class NotificationSystem extends UIElement {
    constructor(config = {}) {
        super({
            width: 300,
            height: 400,
            anchor: { x: 1, y: 0 },
            pivot: { x: 1, y: 0 },
            x: -10,
            y: 10,
            ...config
        });
        
        this.notifications = [];
        this.maxNotifications = config.maxNotifications || 5;
        this.notificationHeight = config.notificationHeight || 60;
        this.notificationSpacing = config.notificationSpacing || 5;
        this.defaultDuration = config.defaultDuration || 3;
        this.fadeTime = config.fadeTime || 0.5;
    }
    
    addNotification(text, options = {}) {
        const notification = {
            text,
            icon: options.icon,
            color: options.color || '#ffffff',
            backgroundColor: options.backgroundColor || 'rgba(0, 0, 0, 0.8)',
            duration: options.duration || this.defaultDuration,
            timer: 0,
            opacity: 0,
            y: 0,
            targetY: 0
        };
        
        this.notifications.unshift(notification);
        
        // Limit notifications
        if (this.notifications.length > this.maxNotifications) {
            this.notifications.pop();
        }
        
        // Update positions
        this.updatePositions();
        
        // Play sound
        if (options.sound) {
            this.game.playSound(options.sound);
        }
        
        return notification;
    }
    
    update(deltaTime) {
        // Update each notification
        for (let i = this.notifications.length - 1; i >= 0; i--) {
            const notification = this.notifications[i];
            
            notification.timer += deltaTime;
            
            // Fade in
            if (notification.timer < this.fadeTime) {
                notification.opacity = notification.timer / this.fadeTime;
            }
            // Fade out
            else if (notification.timer > notification.duration - this.fadeTime) {
                notification.opacity = (notification.duration - notification.timer) / this.fadeTime;
            }
            // Full opacity
            else {
                notification.opacity = 1;
            }
            
            // Animate position
            notification.y += (notification.targetY - notification.y) * deltaTime * 10;
            
            // Remove expired
            if (notification.timer >= notification.duration) {
                this.notifications.splice(i, 1);
                this.updatePositions();
            }
        }
    }
    
    updatePositions() {
        this.notifications.forEach((notification, index) => {
            notification.targetY = index * (this.notificationHeight + this.notificationSpacing);
        });
    }
    
    render(context) {
        const x = this.screenX;
        const y = this.screenY;
        
        this.notifications.forEach(notification => {
            const notifY = y + notification.y;
            
            context.save();
            context.globalAlpha = notification.opacity;
            
            // Background
            context.fillStyle = notification.backgroundColor;
            context.fillRect(x, notifY, this.width, this.notificationHeight);
            
            // Icon
            if (notification.icon && this.game) {
                const renderer = this.game.getSystem('renderer');
                if (renderer) {
                    renderer.drawSprite(notification.icon, x + 10, notifY + 10, 40, 40);
                }
            }
            
            // Text
            context.fillStyle = notification.color;
            context.font = '16px Arial';
            context.textAlign = 'left';
            context.textBaseline = 'middle';
            
            const textX = notification.icon ? x + 60 : x + 10;
            context.fillText(notification.text, textX, notifY + this.notificationHeight / 2);
            
            context.restore();
        });
    }
}

// Register UI components
GameFramework.UI = {
    System: UISystem,
    Element: UIElement,
    HealthBar: HealthBar,
    ScoreDisplay: ScoreDisplay,
    DialogBox: DialogBox,
    Button: Button,
    MiniMap: MiniMap,
    InventoryUI: InventoryUI,
    NotificationSystem: NotificationSystem
};