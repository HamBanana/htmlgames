// input.js - Input handling system

class InputSystem {
    constructor(config) {
        this.config = config;
        this.keys = new Map();
        this.previousKeys = new Map();
        this.gamepadState = null;
        this.touchState = {
            joystick: { active: false, x: 0, y: 0 },
            buttons: new Map()
        };
        
        this.setupEventListeners();
        this.setupMobileControls();
    }
    
    setupEventListeners() {
        // Keyboard events
        window.addEventListener('keydown', (e) => {
            this.keys.set(e.key.toLowerCase(), true);
            this.keys.set(e.code.toLowerCase(), true);
        });
        
        window.addEventListener('keyup', (e) => {
            this.keys.set(e.key.toLowerCase(), false);
            this.keys.set(e.code.toLowerCase(), false);
        });
        
        // Prevent context menu on right click
        window.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
        
        // Gamepad events
        window.addEventListener('gamepadconnected', (e) => {
            console.log('Gamepad connected:', e.gamepad);
        });
        
        window.addEventListener('gamepaddisconnected', (e) => {
            console.log('Gamepad disconnected:', e.gamepad);
        });
    }
    
    setupMobileControls() {
        const joystick = document.getElementById('joystick');
        const joystickKnob = document.getElementById('joystickKnob');
        const jumpBtn = document.getElementById('jumpBtn');
        const shootBtn = document.getElementById('shootBtn');
        
        if (joystick && joystickKnob) {
            this.setupJoystick(joystick, joystickKnob);
        }
        
        if (jumpBtn) {
            this.setupButton(jumpBtn, 'jump');
        }
        
        if (shootBtn) {
            this.setupButton(shootBtn, 'shoot');
        }
    }
    
    setupJoystick(joystick, knob) {
        const rect = joystick.getBoundingClientRect();
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const maxDistance = centerX - 20;
        
        const handleStart = (clientX, clientY) => {
            this.touchState.joystick.active = true;
        };
        
        const handleMove = (clientX, clientY) => {
            if (!this.touchState.joystick.active) return;
            
            const rect = joystick.getBoundingClientRect();
            const deltaX = clientX - rect.left - centerX;
            const deltaY = clientY - rect.top - centerY;
            
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            const clampedDistance = Math.min(distance, maxDistance);
            
            if (distance > 0) {
                const normalizedX = (deltaX / distance) * clampedDistance;
                const normalizedY = (deltaY / distance) * clampedDistance;
                
                this.touchState.joystick.x = normalizedX / maxDistance;
                this.touchState.joystick.y = normalizedY / maxDistance;
                
                knob.style.transform = `translate(${normalizedX}px, ${normalizedY}px)`;
            }
        };
        
        const handleEnd = () => {
            this.touchState.joystick.active = false;
            this.touchState.joystick.x = 0;
            this.touchState.joystick.y = 0;
            knob.style.transform = 'translate(0px, 0px)';
        };
        
        // Touch events
        joystick.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleStart(touch.clientX, touch.clientY);
        });
        
        joystick.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleMove(touch.clientX, touch.clientY);
        });
        
        joystick.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleEnd();
        });
        
        // Mouse events for testing
        joystick.addEventListener('mousedown', (e) => {
            handleStart(e.clientX, e.clientY);
        });
        
        joystick.addEventListener('mousemove', (e) => {
            handleMove(e.clientX, e.clientY);
        });
        
        joystick.addEventListener('mouseup', () => {
            handleEnd();
        });
    }
    
    setupButton(button, action) {
        const handleStart = () => {
            this.touchState.buttons.set(action, true);
        };
        
        const handleEnd = () => {
            this.touchState.buttons.set(action, false);
        };
        
        // Touch events
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleStart();
        });
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleEnd();
        });
        
        // Mouse events for testing
        button.addEventListener('mousedown', (e) => {
            e.preventDefault();
            handleStart();
        });
        
        button.addEventListener('mouseup', (e) => {
            e.preventDefault();
            handleEnd();
        });
    }
    
    update() {
        // Store previous frame keys
        this.previousKeys.clear();
        this.keys.forEach((value, key) => {
            this.previousKeys.set(key, value);
        });
        
        // Update gamepad state
        this.updateGamepad();
    }
    
    updateGamepad() {
        const gamepads = navigator.getGamepads();
        if (gamepads[0]) {
            this.gamepadState = gamepads[0];
        }
    }
    
    isActionPressed(action) {
        const bindings = this.config.keyboard[action] || [];
        
        // Check keyboard
        for (const key of bindings) {
            if (this.keys.get(key)) {
                return true;
            }
        }
        
        // Check mobile controls
        if (this.touchState.buttons.get(action)) {
            return true;
        }
        
        // Check gamepad
        if (this.gamepadState) {
            switch (action) {
                case 'jump':
                    return this.gamepadState.buttons[0]?.pressed; // A button
                case 'shoot':
                    return this.gamepadState.buttons[1]?.pressed; // B button
                case 'slide':
                    return this.gamepadState.buttons[2]?.pressed; // X button
            }
        }
        
        return false;
    }
    
    wasActionJustPressed(action) {
        const bindings = this.config.keyboard[action] || [];
        
        // Check keyboard
        for (const key of bindings) {
            if (this.keys.get(key) && !this.previousKeys.get(key)) {
                return true;
            }
        }
        
        // Check mobile controls (simplified - would need previous state for proper implementation)
        if (this.touchState.buttons.get(action)) {
            return true;
        }
        
        return false;
    }
    
    getMovementVector() {
        let x = 0;
        let y = 0;
        
        // Keyboard input
        if (this.isActionPressed('left')) x -= 1;
        if (this.isActionPressed('right')) x += 1;
        if (this.isActionPressed('slide')) y += 1; // Down for slide
        
        // Mobile joystick input
        if (this.touchState.joystick.active) {
            x = this.touchState.joystick.x;
            y = this.touchState.joystick.y;
        }
        
        // Gamepad input
        if (this.gamepadState) {
            const deadzone = this.config.mobile?.joystickDeadzone || 0.3;
            const gamepadX = this.gamepadState.axes[0];
            const gamepadY = this.gamepadState.axes[1];
            
            if (Math.abs(gamepadX) > deadzone) {
                x = gamepadX;
            }
            if (Math.abs(gamepadY) > deadzone) {
                y = gamepadY;
            }
        }
        
        return { x, y };
    }
    
    reset() {
        this.keys.clear();
        this.previousKeys.clear();
        this.touchState.joystick.active = false;
        this.touchState.joystick.x = 0;
        this.touchState.joystick.y = 0;
        this.touchState.buttons.clear();
    }
}