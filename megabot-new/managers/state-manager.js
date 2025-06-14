// ===== state-manager.js =====
class StateManager {
    constructor() {
        this.states = new Map();
        this.currentState = null;
    }
    
    addState(name, state) {
        this.states.set(name, state);
    }
    
    changeState(name) {
        if (this.currentState && this.currentState.exit) {
            this.currentState.exit();
        }
        
        this.currentState = this.states.get(name);
        
        if (this.currentState && this.currentState.enter) {
            this.currentState.enter();
        }
    }
    
    update(deltaTime) {
        if (this.currentState && this.currentState.update) {
            this.currentState.update(deltaTime);
        }
    }
}