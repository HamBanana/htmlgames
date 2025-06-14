// player.js - Player entity class

class Player {
    constructor(config, weaponSystem, particleSystem) {
        this.config = config;
        this.weaponSystem = weaponSystem;
        this.particleSystem = particleSystem;
        
        // Position and size
        this.x = 100;
        this.y = 400;
        this.width = config.width;
        this.height = config.height;
        
        // Physics
        this.vx = 0;
        this.vy = 0;
        this.speed = config.speed;
        this.jumpPower = Math.abs(config.jumpPower); // Ensure positive for upward jump
        this.grounded = false;
        this.gravityScale = 1;
        this.wasGrounded = false; // Track previous ground state
        
        // State
        this.facing = 1; // 1 = right, -1 = left
        this.health = config.health;
        this.maxHealth = config.maxHealth;
        this.invulnerable = 0;
        this.godMode = false;
        
        // Sliding
        this.sliding = false;
        this.slideTimer = 0;
        this.slideSpeed = config.slideSpeed;
        this.slideHeight = config.slideHeight;
        this.slideDuration = config.slideDuration;
        this.normalHeight = config.height;
        
        // Shooting
        this.shootCooldown = 0;
        this.charging = false;
        this.chargeTimer = 0;
        this.maxCharge = config.maxCharge;
        
        // Weapons
        this.currentWeapon = 'normal';
        this.weaponDamage = config.weapon.damage;
        
        // Power-ups
        this.shield = 0;
        this.speedBoost = 0;
        
        // Animation state
        this.currentAnimation = 'idle';
        this.animationTimer = 0;
        
        // Input tracking for jump
        this.jumpPressed = false;
        this.jumpReleased = true;
    }
    
    update(deltaTime, input, platforms) {
        this.wasGrounded = this.grounded; // Remember previous ground state
        this.handleInput(input, deltaTime);
        this.updatePhysics(deltaTime);
        this.checkPlatformCollisions(platforms);
        this.updateTimers(deltaTime);
        this.updateAnimation();
    }
    
    handleInput(input, deltaTime) {
        const movement = input.getMovementVector();
        
        // FIXED: Reset horizontal velocity first, then apply input
        if (!this.sliding) {
            // Reset horizontal velocity
            this.vx = 0;
            
            // Apply movement input
            if (Math.abs(movement.x) > 0.1) { // Add deadzone for joystick
                this.vx = movement.x * this.speed * (this.speedBoost > 0 ? 1.5 : 1);
                this.facing = movement.x > 0 ? 1 : -1;
            }
        }
        
        // FIXED: Jumping logic with proper button press detection
        const jumpCurrentlyPressed = input.isActionPressed('jump');
        
        // Detect jump button press (transition from not pressed to pressed)
        if (jumpCurrentlyPressed && this.jumpReleased) {
            this.jumpPressed = true;
            this.jumpReleased = false;
        } else if (!jumpCurrentlyPressed) {
            this.jumpReleased = true;
            this.jumpPressed = false;
        }
        
        // Execute jump if button was just pressed and player is grounded
        if (this.jumpPressed && this.grounded) {
            this.vy = -this.jumpPower; // Negative for upward movement
            this.grounded = false;
            this.jumpPressed = false; // Consume the jump press
            
            if (this.particleSystem) {
                this.particleSystem.createEffect('jump', this.x + this.width/2, this.y + this.height);
            }
            
            console.log('Jump executed! vy:', this.vy, 'jumpPower:', this.jumpPower);
        }
        
        // Sliding
        if (input.isActionPressed('slide') && this.grounded && !this.sliding) {
            this.startSlide();
        }
        
        // Shooting
        if (input.isActionPressed('shoot')) {
            if (!this.charging) {
                this.charging = true;
            }
            if (this.chargeTimer < this.maxCharge) {
                this.chargeTimer++;
                if (this.chargeTimer === this.maxCharge && this.particleSystem) {
                    this.particleSystem.createEffect('charge', this.x + this.width/2, this.y + this.height/2);
                }
            }
        } else if (this.charging) {
            this.shoot();
            this.charging = false;
            this.chargeTimer = 0;
        }
    }
    
    updatePhysics(deltaTime) {
        // Apply gravity
        if (!this.grounded) {
            this.vy += (this.config.game?.gravity || 0.5) * deltaTime * 60;
        }
        
        // Apply friction when grounded and not moving
        if (this.grounded && Math.abs(this.vx) > 0.1) {
            this.vx *= Math.pow(0.85, deltaTime * 60); // Friction
        } else if (this.grounded && Math.abs(this.vx) <= 0.1) {
            this.vx = 0; // Stop completely when very slow
        }
        
        // Update position
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;
        
        // Apply slide friction
        if (this.sliding) {
            this.vx *= Math.pow(0.95, deltaTime * 60);
        }
        
        // Debug logging for jump
        if (Math.abs(this.vy) > 0.1) {
            console.log('Player physics - y:', this.y.toFixed(1), 'vy:', this.vy.toFixed(2), 'grounded:', this.grounded);
        }
    }
    
    checkPlatformCollisions(platforms) {
        this.grounded = false;
        
        platforms.forEach(platform => {
            if (this.x < platform.x + platform.w && 
                this.x + this.width > platform.x &&
                this.y < platform.y + platform.h && 
                this.y + this.height > platform.y) {
                
                // Calculate overlap
                const overlapX = Math.min(this.x + this.width - platform.x, platform.x + platform.w - this.x);
                const overlapY = Math.min(this.y + this.height - platform.y, platform.y + platform.h - this.y);
                
                // Resolve collision based on smallest overlap
                if (overlapX < overlapY) {
                    // Horizontal collision
                    if (this.x < platform.x) {
                        this.x = platform.x - this.width;
                        if (this.vx > 0) this.vx = 0;
                    } else {
                        this.x = platform.x + platform.w;
                        if (this.vx < 0) this.vx = 0;
                    }
                } else {
                    // Vertical collision
                    if (this.y < platform.y) {
                        // Landing on top of platform
                        this.y = platform.y - this.height;
                        if (this.vy > 0) {
                            this.vy = 0;
                            this.grounded = true;
                        }
                    } else {
                        // Hitting platform from below
                        this.y = platform.y + platform.h;
                        if (this.vy < 0) this.vy = 0;
                    }
                }
            }
        });
    }
    
    updateTimers(deltaTime) {
        const frameTime = deltaTime * 60;
        
        // Shooting cooldown
        if (this.shootCooldown > 0) {
            this.shootCooldown -= frameTime;
        }
        
        // Slide timer
        if (this.sliding) {
            this.slideTimer -= frameTime;
            if (this.slideTimer <= 0) {
                this.endSlide();
            }
        }
        
        // FIXED: Invulnerability timer (was preventing damage)
        if (this.invulnerable > 0) {
            this.invulnerable -= frameTime;
            if (this.invulnerable < 0) this.invulnerable = 0;
        }
        
        // Power-up timers
        if (this.shield > 0) {
            this.shield -= frameTime;
            if (this.shield < 0) this.shield = 0;
        }
        if (this.speedBoost > 0) {
            this.speedBoost -= frameTime;
            if (this.speedBoost < 0) this.speedBoost = 0;
        }
    }
    
    startSlide() {
        this.sliding = true;
        this.slideTimer = this.slideDuration;
        this.height = this.slideHeight;
        this.vx = this.facing * this.slideSpeed;
        this.y += (this.normalHeight - this.slideHeight); // Adjust position
    }
    
    endSlide() {
        this.sliding = false;
        this.height = this.normalHeight;
        this.y -= (this.normalHeight - this.slideHeight); // Restore position
    }
    
    shoot() {
        if (this.shootCooldown > 0 || !this.weaponSystem) return;
        
        const weapon = this.weaponSystem.createWeapon(
            this.currentWeapon,
            this.x + (this.facing > 0 ? this.width : 0),
            this.y + this.height/2,
            this.facing,
            this.chargeTimer,
            this.maxCharge
        );
        
        if (weapon) {
            this.shootCooldown = weapon.cooldown;
        }
    }
    
    takeDamage(amount) {
        // FIXED: Check invulnerability properly
        if (this.isInvulnerable()) {
            console.log('Player is invulnerable, no damage taken');
            return;
        }
        
        // Check shield first
        if (this.shield > 0) {
            this.shield = 0;
            if (this.particleSystem) {
                this.particleSystem.createEffect('shield', this.x + this.width/2, this.y + this.height/2);
            }
            console.log('Shield absorbed damage');
            return;
        }
        
        // Take damage
        this.health -= amount;
        this.invulnerable = this.config.invulnerabilityTime;
        
        if (this.particleSystem) {
            this.particleSystem.createEffect('damage', this.x + this.width/2, this.y + this.height/2);
        }
        
        if (this.health < 0) {
            this.health = 0;
        }
        
        console.log('Player took', amount, 'damage. Health:', this.health, 'Invulnerable for:', this.invulnerable);
    }
    
    heal(amount) {
        this.health = Math.min(this.health + amount, this.maxHealth);
    }
    
    respawn() {
        this.health = this.maxHealth;
        this.x = 100;
        this.y = 400;
        this.vx = 0;
        this.vy = 0;
        this.grounded = false;
        this.invulnerable = this.config.respawnInvulnerability || 120;
        this.sliding = false;
        this.slideTimer = 0;
        this.chargeTimer = 0;
        this.charging = false;
        this.shootCooldown = 0;
        this.jumpPressed = false;
        this.jumpReleased = true;
    }
    
    collectPickup(pickup) {
        switch (pickup.type) {
            case 'health':
                this.heal(this.config.pickups?.health?.healAmount || 30);
                break;
            case 'shield':
                this.shield = this.config.pickups?.shield?.duration || 300;
                break;
            case 'speed':
                this.speedBoost = this.config.pickups?.speed?.duration || 600;
                break;
            default:
                // Check if it's a weapon pickup
                if (this.config.weapons && this.config.weapons[pickup.type]) {
                    this.currentWeapon = pickup.type;
                }
        }
    }
    
    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.vx = 0; // FIXED: Reset velocity when setting position
        this.vy = 0;
    }
    
    isInvulnerable() {
        return this.invulnerable > 0 || this.godMode;
    }
    
    updateAnimation() {
        if (this.sliding) {
            this.currentAnimation = 'slide';
        } else if (!this.grounded) {
            this.currentAnimation = 'jump';
        } else if (Math.abs(this.vx) > 0.1) {
            this.currentAnimation = 'walk';
        } else {
            this.currentAnimation = 'idle';
        }
    }
}