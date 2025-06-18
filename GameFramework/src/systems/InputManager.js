// GameFramework/src/systems/InputManager.js
import { Vector2 } from '../core/Vector2.js';

/**
 * InputManager - Handles all input (keyboard, mouse, touch, gamepad)
 * @class InputManager
 */
export class InputManager {
    constructor(engine) {
        this.engine = engine;
        
        // Keyboard state
        this.keys = new Map();
        this.keysJustPressed = new Set();
        this.keysJustReleased = new Set();
        
        // Mouse state
        this.mouse = {
            position: new Vector2(),
            worldPosition: new Vector2(),
            buttons: new Map(),
            buttonsJustPressed: new Set(),
            buttonsJustReleased: new Set(),
            wheel: 0,
            locked: false
        };
        
        // Touch state
        this.touches = new Map();
        this.touchesJustStarted = new Set();
        this.touchesJustEnded = new Set();
        
        // Gamepad state
        this.gamepads = new Map();
        
        // Input mapping
        this.actions = new Map();
        this.axes = new Map();
        
        // Settings
        this.preventDefaultKeys = true;
        this.preventDefaultMouse = false;
        this.touchAsMouseFallback = true;
        
        // Bind event handlers
        this._bindEventHandlers();
    }
    
    /**
     * Initialize the input system
     */
    initialize() {
        this._setupEventListeners();
        
        // Default action mappings
        this.mapAction('moveLeft', ['KeyA', 'ArrowLeft']);
        this.mapAction('moveRight', ['KeyD', 'ArrowRight']);
        this.mapAction('moveUp', ['KeyW', 'ArrowUp']);
        this.mapAction('moveDown', ['KeyS', 'ArrowDown']);
        this.mapAction('jump', ['Space']);
        this.mapAction('interact', ['KeyE', 'Enter']);
        this.mapAction('pause', ['Escape']);
        this.mapAction('inventory', ['KeyI', 'Tab']);
        
        // Default axis mappings
        this.mapAxis('horizontal', {
            positive: ['KeyD', 'ArrowRight'],
            negative: ['KeyA', 'ArrowLeft'],
            gamepadAxis: 0
        });
        
        this.mapAxis('vertical', {
            positive: ['KeyS', 'ArrowDown'],
            negative: ['KeyW', 'ArrowUp'],
            gamepadAxis: 1
        });
    }
    
    /**
     * Bind event handler methods
     * @private
     */
    _bindEventHandlers() {
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onKeyUp = this._onKeyUp.bind(this);
        this._onMouseMove = this._onMouseMove.bind(this);
        this._onMouseDown = this._onMouseDown.bind(this);
        this._onMouseUp = this._onMouseUp.bind(this);
        this._onMouseWheel = this._onMouseWheel.bind(this);
        this._onContextMenu = this._onContextMenu.bind(this);
        this._onPointerLockChange = this._onPointerLockChange.bind(this);
        this._onTouchStart = this._onTouchStart.bind(this);
        this._onTouchMove = this._onTouchMove.bind(this);
        this._onTouchEnd = this._onTouchEnd.bind(this);
        this._onGamepadConnected = this._onGamepadConnected.bind(this);
        this._onGamepadDisconnected = this._onGamepadDisconnected.bind(this);
    }
    
    /**
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
        // Keyboard
        document.addEventListener('keydown', this._onKeyDown);
        document.addEventListener('keyup', this._onKeyUp);
        
        // Mouse
        const canvas = this.engine.canvas;
        canvas.addEventListener('mousemove', this._onMouseMove);
        canvas.addEventListener('mousedown', this._onMouseDown);
        canvas.addEventListener('mouseup', this._onMouseUp);
        canvas.addEventListener('wheel', this._onMouseWheel);
        canvas.addEventListener('contextmenu', this._onContextMenu);
        
        // Pointer lock
        document.addEventListener('pointerlockchange', this._onPointerLockChange);
        
        // Touch
        canvas.addEventListener('touchstart', this._onTouchStart);
        canvas.addEventListener('touchmove', this._onTouchMove);
        canvas.addEventListener('touchend', this._onTouchEnd);
        canvas.addEventListener('touchcancel', this._onTouchEnd);
        
        // Gamepad
        window.addEventListener('gamepadconnected', this._onGamepadConnected);
        window.addEventListener('gamepaddisconnected', this._onGamepadDisconnected);
    }
    
    /**
     * Update input state
     */
    update() {
        // Clear just pressed/released
        this.keysJustPressed.clear();
        this.keysJustReleased.clear();
        this.mouse.buttonsJustPressed.clear();
        this.mouse.buttonsJustReleased.clear();
        this.touchesJustStarted.clear();
        this.touchesJustEnded.clear();
        this.mouse.wheel = 0;
        
        // Update gamepads
        this._updateGamepads();
    }
    
    /**
     * Map an action to keys/buttons
     * @param {string} action - Action name
     * @param {string[]} inputs - Array of input codes
     */
    mapAction(action, inputs) {
        this.actions.set(action, inputs);
    }
    
    /**
     * Map an axis to keys/buttons/gamepad
     * @param {string} axis - Axis name
     * @param {object} config - Axis configuration
     */
    mapAxis(axis, config) {
        this.axes.set(axis, config);
    }
    
    /**
     * Check if action is pressed
     * @param {string} action - Action name
     * @returns {boolean}
     */
    isActionPressed(action) {
        const inputs = this.actions.get(action);
        if (!inputs) return false;
        
        return inputs.some(input => {
            if (input.startsWith('Mouse')) {
                const button = parseInt(input.replace('Mouse', ''));
                return this.isMouseButtonPressed(button);
            }
            return this.isKeyPressed(input);
        });
    }
    
    /**
     * Check if action was just pressed
     * @param {string} action - Action name
     * @returns {boolean}
     */
    isActionJustPressed(action) {
        const inputs = this.actions.get(action);
        if (!inputs) return false;
        
        return inputs.some(input => {
            if (input.startsWith('Mouse')) {
                const button = parseInt(input.replace('Mouse', ''));
                return this.isMouseButtonJustPressed(button);
            }
            return this.isKeyJustPressed(input);
        });
    }
    
    /**
     * Check if action was just released
     * @param {string} action - Action name
     * @returns {boolean}
     */
    isActionJustReleased(action) {
        const inputs = this.actions.get(action);
        if (!inputs) return false;
        
        return inputs.some(input => {
            if (input.startsWith('Mouse')) {
                const button = parseInt(input.replace('Mouse', ''));
                return this.isMouseButtonJustReleased(button);
            }
            return this.isKeyJustReleased(input);
        });
    }
    
    /**
     * Get axis value (-1 to 1)
     * @param {string} axis - Axis name
     * @returns {number}
     */
    getAxis(axis) {
        const config = this.axes.get(axis);
        if (!config) return 0;
        
        let value = 0;
        
        // Keyboard input
        if (config.positive) {
            config.positive.forEach(key => {
                if (this.isKeyPressed(key)) value += 1;
            });
        }
        
        if (config.negative) {
            config.negative.forEach(key => {
                if (this.isKeyPressed(key)) value -= 1;
            });
        }
        
        // Gamepad input
        if (config.gamepadAxis !== undefined) {
            const gamepadValue = this.getGamepadAxis(0, config.gamepadAxis);
            if (Math.abs(gamepadValue) > Math.abs(value)) {
                value = gamepadValue;
            }
        }
        
        return Math.max(-1, Math.min(1, value));
    }
    
    /**
     * Get movement vector
     * @returns {Vector2}
     */
    getMovementVector() {
        return new Vector2(
            this.getAxis('horizontal'),
            this.getAxis('vertical')
        );
    }
    
    /**
     * Check if key is pressed
     * @param {string} code - Key code
     * @returns {boolean}
     */
    isKeyPressed(code) {
        return this.keys.get(code) || false;
    }
    
    /**
     * Check if key was just pressed
     * @param {string} code - Key code
     * @returns {boolean}
     */
    isKeyJustPressed(code) {
        return this.keysJustPressed.has(code);
    }
    
    /**
     * Check if key was just released
     * @param {string} code - Key code
     * @returns {boolean}
     */
    isKeyJustReleased(code) {
        return this.keysJustReleased.has(code);
    }
    
    /**
     * Check if mouse button is pressed
     * @param {number} button - Button number (0=left, 1=middle, 2=right)
     * @returns {boolean}
     */
    isMouseButtonPressed(button) {
        return this.mouse.buttons.get(button) || false;
    }
    
    /**
     * Check if mouse button was just pressed
     * @param {number} button - Button number
     * @returns {boolean}
     */
    isMouseButtonJustPressed(button) {
        return this.mouse.buttonsJustPressed.has(button);
    }
    
    /**
     * Check if mouse button was just released
     * @param {number} button - Button number
     * @returns {boolean}
     */
    isMouseButtonJustReleased(button) {
        return this.mouse.buttonsJustReleased.has(button);
    }
    
    /**
     * Get mouse position in screen coordinates
     * @returns {Vector2}
     */
    getMousePosition() {
        return this.mouse.position.copy();
    }
    
    /**
     * Get mouse position in world coordinates
     * @returns {Vector2}
     */
    getMouseWorldPosition() {
        return this.mouse.worldPosition.copy();
    }
    
    /**
     * Get mouse wheel delta
     * @returns {number}
     */
    getMouseWheel() {
        return this.mouse.wheel;
    }
    
    /**
     * Lock mouse pointer
     */
    lockMouse() {
        this.engine.canvas.requestPointerLock();
    }
    
    /**
     * Unlock mouse pointer
     */
    unlockMouse() {
        if (document.pointerLockElement === this.engine.canvas) {
            document.exitPointerLock();
        }
    }
    
    /**
     * Check if mouse is locked
     * @returns {boolean}
     */
    isMouseLocked() {
        return this.mouse.locked;
    }
    
    /**
     * Get touch by ID
     * @param {number} id - Touch identifier
     * @returns {Touch|null}
     */
    getTouch(id) {
        return this.touches.get(id) || null;
    }
    
    /**
     * Get all active touches
     * @returns {Touch[]}
     */
    getTouches() {
        return Array.from(this.touches.values());
    }
    
    /**
     * Get gamepad by index
     * @param {number} index - Gamepad index
     * @returns {Gamepad|null}
     */
    getGamepad(index) {
        return this.gamepads.get(index) || null;
    }
    
    /**
     * Get gamepad axis value
     * @param {number} padIndex - Gamepad index
     * @param {number} axisIndex - Axis index
     * @returns {number}
     */
    getGamepadAxis(padIndex, axisIndex) {
        const gamepad = this.getGamepad(padIndex);
        if (!gamepad || axisIndex >= gamepad.axes.length) return 0;
        
        const value = gamepad.axes[axisIndex];
        const deadzone = 0.1;
        
        if (Math.abs(value) < deadzone) return 0;
        return value;
    }
    
    /**
     * Check if gamepad button is pressed
     * @param {number} padIndex - Gamepad index
     * @param {number} buttonIndex - Button index
     * @returns {boolean}
     */
    isGamepadButtonPressed(padIndex, buttonIndex) {
        const gamepad = this.getGamepad(padIndex);
        if (!gamepad || buttonIndex >= gamepad.buttons.length) return false;
        return gamepad.buttons[buttonIndex].pressed;
    }
    
    // Event handlers
    _onKeyDown(event) {
        const code = event.code;
        
        if (!this.keys.get(code)) {
            this.keysJustPressed.add(code);
        }
        
        this.keys.set(code, true);
        
        if (this.preventDefaultKeys) {
            event.preventDefault();
        }
        
        this.engine.emit('input:keydown', { code, event });
    }
    
    _onKeyUp(event) {
        const code = event.code;
        
        this.keys.set(code, false);
        this.keysJustReleased.add(code);
        
        if (this.preventDefaultKeys) {
            event.preventDefault();
        }
        
        this.engine.emit('input:keyup', { code, event });
    }
    
    _onMouseMove(event) {
        const rect = this.engine.canvas.getBoundingClientRect();
        
        this.mouse.position.x = event.clientX - rect.left;
        this.mouse.position.y = event.clientY - rect.top;
        
        // Calculate world position
        const renderer = this.engine.getSystem('renderer');
        if (renderer && renderer.camera) {
            this.mouse.worldPosition = renderer.camera.screenToWorld(this.mouse.position);
        } else {
            this.mouse.worldPosition = this.mouse.position.copy();
        }
        
        this.engine.emit('input:mousemove', {
            position: this.mouse.position.copy(),
            worldPosition: this.mouse.worldPosition.copy(),
            event
        });
    }
    
    _onMouseDown(event) {
        const button = event.button;
        
        if (!this.mouse.buttons.get(button)) {
            this.mouse.buttonsJustPressed.add(button);
        }
        
        this.mouse.buttons.set(button, true);
        
        if (this.preventDefaultMouse) {
            event.preventDefault();
        }
        
        this.engine.emit('input:mousedown', {
            button,
            position: this.mouse.position.copy(),
            worldPosition: this.mouse.worldPosition.copy(),
            event
        });
    }
    
    _onMouseUp(event) {
        const button = event.button;
        
        this.mouse.buttons.set(button, false);
        this.mouse.buttonsJustReleased.add(button);
        
        if (this.preventDefaultMouse) {
            event.preventDefault();
        }
        
        this.engine.emit('input:mouseup', {
            button,
            position: this.mouse.position.copy(),
            worldPosition: this.mouse.worldPosition.copy(),
            event
        });
    }
    
    _onMouseWheel(event) {
        this.mouse.wheel = event.deltaY;
        
        if (this.preventDefaultMouse) {
            event.preventDefault();
        }
        
        this.engine.emit('input:mousewheel', {
            delta: event.deltaY,
            event
        });
    }
    
    _onContextMenu(event) {
        if (this.preventDefaultMouse) {
            event.preventDefault();
        }
    }
    
    _onPointerLockChange() {
        this.mouse.locked = document.pointerLockElement === this.engine.canvas;
        
        this.engine.emit('input:pointerlockchange', {
            locked: this.mouse.locked
        });
    }
    
    _onTouchStart(event) {
        const rect = this.engine.canvas.getBoundingClientRect();
        
        for (const touch of event.changedTouches) {
            const touchData = {
                id: touch.identifier,
                position: new Vector2(
                    touch.clientX - rect.left,
                    touch.clientY - rect.top
                ),
                startPosition: new Vector2(
                    touch.clientX - rect.left,
                    touch.clientY - rect.top
                ),
                force: touch.force || 0
            };
            
            this.touches.set(touch.identifier, touchData);
            this.touchesJustStarted.add(touch.identifier);
            
            // Touch as mouse fallback
            if (this.touchAsMouseFallback && this.touches.size === 1) {
                this.mouse.position = touchData.position.copy();
                this.mouse.buttons.set(0, true);
                this.mouse.buttonsJustPressed.add(0);
            }
        }
        
        event.preventDefault();
        
        this.engine.emit('input:touchstart', {
            touches: this.getTouches(),
            event
        });
    }
    
    _onTouchMove(event) {
        const rect = this.engine.canvas.getBoundingClientRect();
        
        for (const touch of event.changedTouches) {
            const touchData = this.touches.get(touch.identifier);
            if (touchData) {
                touchData.position.x = touch.clientX - rect.left;
                touchData.position.y = touch.clientY - rect.top;
                touchData.force = touch.force || 0;
                
                // Touch as mouse fallback
                if (this.touchAsMouseFallback && touch.identifier === 0) {
                    this.mouse.position = touchData.position.copy();
                }
            }
        }
        
        event.preventDefault();
        
        this.engine.emit('input:touchmove', {
            touches: this.getTouches(),
            event
        });
    }
    
    _onTouchEnd(event) {
        for (const touch of event.changedTouches) {
            this.touches.delete(touch.identifier);
            this.touchesJustEnded.add(touch.identifier);
            
            // Touch as mouse fallback
            if (this.touchAsMouseFallback && touch.identifier === 0) {
                this.mouse.buttons.set(0, false);
                this.mouse.buttonsJustReleased.add(0);
            }
        }
        
        event.preventDefault();
        
        this.engine.emit('input:touchend', {
            touches: this.getTouches(),
            event
        });
    }
    
    _onGamepadConnected(event) {
        this.gamepads.set(event.gamepad.index, event.gamepad);
        
        this.engine.emit('input:gamepadconnected', {
            gamepad: event.gamepad
        });
    }
    
    _onGamepadDisconnected(event) {
        this.gamepads.delete(event.gamepad.index);
        
        this.engine.emit('input:gamepaddisconnected', {
            gamepad: event.gamepad
        });
    }
    
    _updateGamepads() {
        // Update gamepad state
        if (navigator.getGamepads) {
            const gamepads = navigator.getGamepads();
            
            for (let i = 0; i < gamepads.length; i++) {
                if (gamepads[i]) {
                    this.gamepads.set(i, gamepads[i]);
                }
            }
        }
    }
    
    /**
     * Destroy the input system
     */
    destroy() {
        // Remove event listeners
        document.removeEventListener('keydown', this._onKeyDown);
        document.removeEventListener('keyup', this._onKeyUp);
        
        const canvas = this.engine.canvas;
        canvas.removeEventListener('mousemove', this._onMouseMove);
        canvas.removeEventListener('mousedown', this._onMouseDown);
        canvas.removeEventListener('mouseup', this._onMouseUp);
        canvas.removeEventListener('wheel', this._onMouseWheel);
        canvas.removeEventListener('contextmenu', this._onContextMenu);
        
        document.removeEventListener('pointerlockchange', this._onPointerLockChange);
        
        canvas.removeEventListener('touchstart', this._onTouchStart);
        canvas.removeEventListener('touchmove', this._onTouchMove);
        canvas.removeEventListener('touchend', this._onTouchEnd);
        canvas.removeEventListener('touchcancel', this._onTouchEnd);
        
        window.removeEventListener('gamepadconnected', this._onGamepadConnected);
        window.removeEventListener('gamepaddisconnected', this._onGamepadDisconnected);
        
        // Clear state
        this.keys.clear();
        this.mouse.buttons.clear();
        this.touches.clear();
        this.gamepads.clear();
        this.actions.clear();
        this.axes.clear();
    }
}