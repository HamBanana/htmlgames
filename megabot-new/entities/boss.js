// entities/boss.js - Enhanced Boss with AI and attack patterns

class Boss {
    constructor(data, config) {
        this.x = data.x || 2900;
        this.y = data.y || 300;
        this.width = config.width;
        this.height = config.height;
        this.health = config.health;
        this.maxHealth = config.maxHealth;
        this.active = false;
        this.vx = 0;
        this.vy = 0;
        this.grounded = false;
        
        // AI state
        this.phase = 0;
        this.attackTimer = 0;
        this.moveTimer = 0;
        this.pattern = 0;
        this.facing = -1;
        this.triggerX = data.triggerX || config.triggerDistance || 2800;
        
        // Movement
        this.speed = 1.5;
        this.jumpPower = -10;
        this.direction = -1;
        
        // Attack patterns
        this.attackPatterns = config.phases || [
            {
                healthThreshold: 1.0,
                speed: 1.5,
                attackInterval: 100,
                jumpChance: 0.02,
                patterns: ["single", "triple"]
            },
            {
                healthThreshold: 0.6,
                speed: 2,
                attackInterval: 80,
                jumpChance: 0.04,
                patterns: ["triple", "spread"]
            },
            {
                healthThreshold: 0.3,
                speed: 2.5,
                attackInterval: 60,
                jumpChance: 0.06,
                patterns: ["spread", "barrage"]
            }
        ];
        
        this.currentPhaseData = this.attackPatterns[0];
        this.scoreValue = config.scoreValue || 1000;
    }
    
    activate() {
        console.log('Boss activated!');
        this.active = true;
        this.updatePhase();
    }
    
    update(deltaTime, player, projectiles) {
        if (!this.active) return;
        
        const frameTime = deltaTime * 60;
        
        // Update phase based on health
        this.updatePhase();
        
        // Boss AI
        this.updateAI(player, frameTime);
        
        // Update timers
        this.attackTimer += frameTime;
        this.moveTimer += frameTime;
    }
    
    updatePhase() {
        const healthRatio = this.health / this.maxHealth;
        
        for (let i = this.attackPatterns.length - 1; i >= 0; i--) {
            if (healthRatio <= this.attackPatterns[i].healthThreshold) {
                if (this.phase !== i) {
                    this.phase = i;
                    this.currentPhaseData = this.attackPatterns[i];
                    console.log(`Boss entered phase ${i + 1}`);
                }
                break;
            }
        }
    }
    
    updateAI(player, frameTime) {
        const distanceToPlayer = Math.abs(player.x - this.x);
        
        // Face the player
        this.facing = player.x > this.x ? 1 : -1;
        
        // Movement AI
        this.updateMovement(player, frameTime);
        
        // Attack AI
        if (this.attackTimer >= this.currentPhaseData.attackInterval) {
            this.performAttack(player);
            this.attackTimer = 0;
        }
        
        // Random jump
        if (this.grounded && Math.random() < this.currentPhaseData.jumpChance) {
            this.jump();
        }
    }
    
    updateMovement(player, frameTime) {
        const distanceToPlayer = Math.abs(player.x - this.x);
        
        // Move towards player if too far, away if too close
        if (distanceToPlayer > 200) {
            this.vx = this.facing * this.currentPhaseData.speed;
        } else if (distanceToPlayer < 100) {
            this.vx = -this.facing * this.currentPhaseData.speed;
        } else {
            // Patrol behavior
            if (this.moveTimer > 60) {
                this.direction *= -1;
                this.moveTimer = 0;
            }
            this.vx = this.direction * this.currentPhaseData.speed * 0.5;
        }
    }
    
    performAttack(player) {
        const patterns = this.currentPhaseData.patterns;
        const selectedPattern = patterns[Math.floor(Math.random() * patterns.length)];
        
        console.log(`Boss attacking with pattern: ${selectedPattern}`);
        
        switch (selectedPattern) {
            case 'single':
                this.attackSingle(player);
                break;
            case 'triple':
                this.attackTriple(player);
                break;
            case 'spread':
                this.attackSpread(player);
                break;
            case 'barrage':
                this.attackBarrage(player);
                break;
        }
    }
    
    attackSingle(player) {
        const angle = Math.atan2(
            player.y + player.height/2 - (this.y + this.height/2),
            player.x + player.width/2 - (this.x + this.width/2)
        );
        
        this.createProjectile(
            this.x + this.width/2,
            this.y + this.height/2,
            Math.cos(angle) * 3,
            Math.sin(angle) * 3
        );
    }
    
    attackTriple(player) {
        const baseAngle = Math.atan2(
            player.y + player.height/2 - (this.y + this.height/2),
            player.x + player.width/2 - (this.x + this.width/2)
        );
        
        for (let i = -1; i <= 1; i++) {
            const angle = baseAngle + (i * 0.3);
            this.createProjectile(
                this.x + this.width/2,
                this.y + this.height/2,
                Math.cos(angle) * 3,
                Math.sin(angle) * 3
            );
        }
    }
    
    attackSpread(player) {
        const centerAngle = Math.atan2(
            player.y + player.height/2 - (this.y + this.height/2),
            player.x + player.width/2 - (this.x + this.width/2)
        );
        
        for (let i = -2; i <= 2; i++) {
            const angle = centerAngle + (i * 0.4);
            this.createProjectile(
                this.x + this.width/2,
                this.y + this.height/2,
                Math.cos(angle) * 2.5,
                Math.sin(angle) * 2.5
            );
        }
    }
    
    attackBarrage(player) {
        // Fire multiple projectiles in quick succession
        for (let i = 0; i < 6; i++) {
            setTimeout(() => {
                const angle = Math.atan2(
                    player.y + player.height/2 - (this.y + this.height/2),
                    player.x + player.width/2 - (this.x + this.width/2)
                ) + (Math.random() - 0.5) * 0.5;
                
                this.createProjectile(
                    this.x + this.width/2,
                    this.y + this.height/2,
                    Math.cos(angle) * 4,
                    Math.sin(angle) * 4
                );
            }, i * 100);
        }
    }
    
    createProjectile(x, y, vx, vy) {
        // This will be handled by the weapon system
        this.shouldShoot = true;
        this.projectileData = {
            x: x,
            y: y,
            vx: vx,
            vy: vy,
            damage: 20,
            width: 10,
            height: 10
        };
    }
    
    jump() {
        if (this.grounded) {
            this.vy = this.jumpPower;
            this.grounded = false;
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
        if (this.health < 0) this.health = 0;
        
        console.log(`Boss took ${amount} damage. Health: ${this.health}/${this.maxHealth}`);
        
        // Flash effect or damage reaction could go here
        return this.health <= 0;
    }
    
    isDead() {
        return this.health <= 0;
    }
    
    getPhaseDescription() {
        const phaseNames = ["Patrol Phase", "Aggressive Phase", "Desperate Phase"];
        return phaseNames[this.phase] || "Unknown Phase";
    }
}