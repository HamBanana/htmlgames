// core/state-machine.js - Finite State Machine for entities
class StateMachine {
    constructor(entity) {
        this.entity = entity;
        this.states = new Map();
        this.currentState = null;
        this.previousState = null;
        this.globalState = null;
    }
    
    registerState(name, state) {
        this.states.set(name, state);
        state.entity = this.entity;
        state.stateMachine = this;
    }
    
    setGlobalState(state) {
        this.globalState = state;
        if (state) {
            state.entity = this.entity;
            state.stateMachine = this;
        }
    }
    
    changeState(stateName) {
        const newState = this.states.get(stateName);
        if (!newState) {
            console.warn(`State '${stateName}' not found`);
            return;
        }
        
        // Exit current state
        if (this.currentState) {
            this.currentState.exit();
            this.previousState = this.currentState;
        }
        
        // Enter new state
        this.currentState = newState;
        this.currentState.enter();
    }
    
    update(deltaTime) {
        // Update global state
        if (this.globalState) {
            this.globalState.update(deltaTime);
        }
        
        // Update current state
        if (this.currentState) {
            this.currentState.update(deltaTime);
        }
    }
    
    revertToPreviousState() {
        if (this.previousState) {
            this.changeState(this.previousState.name);
        }
    }
    
    isInState(stateName) {
        return this.currentState && this.currentState.name === stateName;
    }
}

// Base State class
class State {
    constructor(name) {
        this.name = name;
        this.entity = null;
        this.stateMachine = null;
    }
    
    enter() {}
    update(deltaTime) {}
    exit() {}
}

// Enhanced Player with State Machine
class EnhancedPlayer extends Player {
    constructor(config, weaponSystem, particleSystem) {
        super(config, weaponSystem, particleSystem);
        
        // Initialize state machine
        this.stateMachine = new StateMachine(this);
        
        // Register states
        this.stateMachine.registerState('idle', new PlayerIdleState());
        this.stateMachine.registerState('walking', new PlayerWalkingState());
        this.stateMachine.registerState('jumping', new PlayerJumpingState());
        this.stateMachine.registerState('sliding', new PlayerSlidingState());
        this.stateMachine.registerState('shooting', new PlayerShootingState());
        this.stateMachine.registerState('hurt', new PlayerHurtState());
        this.stateMachine.registerState('charging', new PlayerChargingState());
        
        // Set initial state
        this.stateMachine.changeState('idle');
        
        // Additional properties
        this.combo = [];
        this.lastActionTime = 0;
        this.dashCooldown = 0;
    }
    
    update(deltaTime, input, platforms) {
        // Store input for states to use
        this.currentInput = input;
        this.currentPlatforms = platforms;
        
        // Update state machine
        this.stateMachine.update(deltaTime);
        
        // Update physics (handled by states)
        this.updatePhysics(deltaTime);
        this.checkPlatformCollisions(platforms);
        
        // Update timers
        this.updateTimers(deltaTime);
        
        // Update dash cooldown
        if (this.dashCooldown > 0) {
            this.dashCooldown -= deltaTime * 60;
        }
    }
    
    canDash() {
        return this.dashCooldown <= 0 && !this.sliding;
    }
    
    performDash(direction) {
        if (this.canDash()) {
            this.vx = direction * this.speed * 3;
            this.dashCooldown = 30;
            this.invulnerable = 10; // Brief invulnerability during dash
            
            // Create dash effect
            if (this.particleSystem) {
                for (let i = 0; i < 5; i++) {
                    this.particleSystem.createCustomParticles(
                        this.x + this.width/2 - direction * i * 10,
                        this.y + this.height/2,
                        3, '#00ffff', 6, 20
                    );
                }
            }
        }
    }
}

// Player States
class PlayerIdleState extends State {
    constructor() {
        super('idle');
    }
    
    enter() {
        this.entity.currentAnimation = 'idle';
    }
    
    update(deltaTime) {
        const input = this.entity.currentInput;
        const movement = input.getMovementVector();
        
        // Transition to other states
        if (Math.abs(movement.x) > 0.1) {
            this.stateMachine.changeState('walking');
        } else if (input.isActionPressed('jump') && this.entity.grounded) {
            this.stateMachine.changeState('jumping');
        } else if (input.isActionPressed('slide') && this.entity.grounded) {
            this.stateMachine.changeState('sliding');
        } else if (input.isActionPressed('shoot')) {
            this.stateMachine.changeState('shooting');
        }
        
        // Apply friction
        if (this.entity.grounded) {
            this.entity.vx *= 0.8;
        }
    }
}

class PlayerWalkingState extends State {
    constructor() {
        super('walking');
    }
    
    enter() {
        this.entity.currentAnimation = 'walk';
    }
    
    update(deltaTime) {
        const input = this.entity.currentInput;
        const movement = input.getMovementVector();
        
        // Apply movement
        if (Math.abs(movement.x) > 0.1) {
            this.entity.vx = movement.x * this.entity.speed;
            this.entity.facing = movement.x > 0 ? 1 : -1;
        } else {
            // No input, go to idle
            this.stateMachine.changeState('idle');
            return;
        }
        
        // Check for dash (double tap)
        if (input.wasActionJustPressed('left') || input.wasActionJustPressed('right')) {
            const now = Date.now();
            if (now - this.entity.lastActionTime < 300) {
                this.entity.performDash(this.entity.facing);
            }
            this.entity.lastActionTime = now;
        }
        
        // Other transitions
        if (input.isActionPressed('jump') && this.entity.grounded) {
            this.stateMachine.changeState('jumping');
        } else if (input.isActionPressed('slide') && this.entity.grounded) {
            this.stateMachine.changeState('sliding');
        } else if (input.isActionPressed('shoot')) {
            this.stateMachine.changeState('shooting');
        }
    }
}

class PlayerJumpingState extends State {
    constructor() {
        super('jumping');
    }
    
    enter() {
        this.entity.currentAnimation = 'jump';
        this.entity.vy = -this.entity.jumpPower;
        this.entity.grounded = false;
        
        // Jump particles
        if (this.entity.particleSystem) {
            this.entity.particleSystem.createEffect(
                'jump', 
                this.entity.x + this.entity.width/2, 
                this.entity.y + this.entity.height
            );
        }
    }
    
    update(deltaTime) {
        const input = this.entity.currentInput;
        const movement = input.getMovementVector();
        
        // Air control
        if (Math.abs(movement.x) > 0.1) {
            this.entity.vx = movement.x * this.entity.speed * 0.8; // Reduced air control
            this.entity.facing = movement.x > 0 ? 1 : -1;
        }
        
        // Variable jump height
        if (!input.isActionPressed('jump') && this.entity.vy < 0) {
            this.entity.vy *= 0.5; // Cut jump short
        }
        
        // Check if landed
        if (this.entity.grounded) {
            this.stateMachine.changeState('idle');
        }
        
        // Can shoot while jumping
        if (input.isActionPressed('shoot')) {
            this.entity.shoot();
        }
    }
}

class PlayerSlidingState extends State {
    constructor() {
        super('sliding');
        this.slideDuration = 0;
    }
    
    enter() {
        this.entity.currentAnimation = 'slide';
        this.entity.sliding = true;
        this.entity.height = this.entity.slideHeight;
        this.entity.y += (this.entity.normalHeight - this.entity.slideHeight);
        this.entity.vx = this.entity.facing * this.entity.slideSpeed;
        this.slideDuration = this.entity.slideDuration;
        
        // Slide particles
        if (this.entity.particleSystem) {
            this.entity.particleSystem.createCustomParticles(
                this.entity.x - this.entity.facing * 10,
                this.entity.y + this.entity.height,
                5, '#ffff00', 4, 15
            );
        }
    }
    
    update(deltaTime) {
        this.slideDuration -= deltaTime * 60;
        
        // Apply sliding friction
        this.entity.vx *= 0.95;
        
        // End slide
        if (this.slideDuration <= 0 || !this.entity.grounded) {
            this.stateMachine.changeState('idle');
        }
    }
    
    exit() {
        this.entity.sliding = false;
        this.entity.height = this.entity.normalHeight;
        this.entity.y -= (this.entity.normalHeight - this.entity.slideHeight);
    }
}

// Enhanced Boss with State Machine
class EnhancedBoss extends Boss {
    constructor(data, config) {
        super(data, config);
        
        // Initialize state machine
        this.stateMachine = new StateMachine(this);
        
        // Register states
        this.stateMachine.registerState('idle', new BossIdleState());
        this.stateMachine.registerState('patrol', new BossPatrolState());
        this.stateMachine.registerState('attacking', new BossAttackingState());
        this.stateMachine.registerState('enraged', new BossEnragedState());
        this.stateMachine.registerState('vulnerable', new BossVulnerableState());
        
        // Start in idle
        this.stateMachine.changeState('idle');
        
        // Additional properties
        this.attackCooldown = 0;
        this.vulnerableTimer = 0;
    }
    
    activate() {
        super.activate();
        this.stateMachine.changeState('patrol');
    }
    
    update(deltaTime, player, projectiles) {
        if (!this.active) return;
        
        // Store references for states
        this.targetPlayer = player;
        this.currentProjectiles = projectiles;
        
        // Update state machine
        this.stateMachine.update(deltaTime);
        
        // Update cooldowns
        if (this.attackCooldown > 0) {
            this.attackCooldown -= deltaTime * 60;
        }
        
        if (this.vulnerableTimer > 0) {
            this.vulnerableTimer -= deltaTime * 60;
        }
    }
    
    takeDamage(amount) {
        if (this.vulnerableTimer > 0) {
            amount *= 2; // Double damage when vulnerable
        }
        
        const wasAboveHalf = this.health > this.maxHealth / 2;
        super.takeDamage(amount);
        const nowBelowHalf = this.health <= this.maxHealth / 2;
        
        // Transition to enraged at half health
        if (wasAboveHalf && nowBelowHalf) {
            this.stateMachine.changeState('enraged');
        }
        
        return this.health <= 0;
    }
}

// Boss States
class BossIdleState extends State {
    constructor() {
        super('idle');
    }
    
    update(deltaTime) {
        // Wait for activation
        if (this.entity.active) {
            this.stateMachine.changeState('patrol');
        }
    }
}

class BossPatrolState extends State {
    constructor() {
        super('patrol');
        this.moveTimer = 0;
        this.moveDirection = 1;
    }
    
    enter() {
        this.moveTimer = 0;
    }
    
    update(deltaTime) {
        const player = this.entity.targetPlayer;
        const distance = Math.abs(player.x - this.entity.x);
        
        // Movement pattern
        this.moveTimer += deltaTime * 60;
        if (this.moveTimer > 120) {
            this.moveDirection *= -1;
            this.moveTimer = 0;
        }
        
        this.entity.vx = this.moveDirection * this.entity.speed;
        this.entity.facing = player.x > this.entity.x ? 1 : -1;
        
        // Attack when close enough
        if (distance < 300 && this.entity.attackCooldown <= 0) {
            this.stateMachine.changeState('attacking');
        }
        
        // Random jump
        if (Math.random() < 0.02 && this.entity.grounded) {
            this.entity.jump();
        }
    }
}

class BossAttackingState extends State {
    constructor() {
        super('attacking');
        this.attackPattern = 0;
        this.attackTimer = 0;
    }
    
    enter() {
        // Choose random attack pattern
        this.attackPattern = Math.floor(Math.random() * 3);
        this.attackTimer = 0;
        this.entity.vx = 0; // Stop moving during attack
    }
    
    update(deltaTime) {
        this.attackTimer += deltaTime * 60;
        
        switch (this.attackPattern) {
            case 0: // Triple shot
                if (this.attackTimer === 1) {
                    this.entity.attackTriple(this.entity.targetPlayer);
                }
                break;
                
            case 1: // Spread shot
                if (this.attackTimer === 1) {
                    this.entity.attackSpread(this.entity.targetPlayer);
                }
                break;
                
            case 2: // Barrage
                if (this.attackTimer % 10 === 1 && this.attackTimer < 60) {
                    this.entity.attackSingle(this.entity.targetPlayer);
                }
                break;
        }
        
        // End attack
        if (this.attackTimer > 60) {
            this.entity.attackCooldown = 60;
            this.stateMachine.changeState('patrol');
        }
    }
}

class BossEnragedState extends State {
    constructor() {
        super('enraged');
    }
    
    enter() {
        // Increase speed and attack rate
        this.entity.speed *= 1.5;
        this.entity.currentPhaseData.attackInterval *= 0.5;
        
        // Visual effect
        // TODO: Add red tint or particle effect
    }
    
    update(deltaTime) {
        // Similar to patrol but more aggressive
        const player = this.entity.targetPlayer;
        
        // Always move towards player
        this.entity.facing = player.x > this.entity.x ? 1 : -1;
        this.entity.vx = this.entity.facing * this.entity.speed;
        
        // Attack more frequently
        if (this.entity.attackCooldown <= 0) {
            this.stateMachine.changeState('attacking');
        }
        
        // More frequent jumps
        if (Math.random() < 0.04 && this.entity.grounded) {
            this.entity.jump();
        }
    }
}