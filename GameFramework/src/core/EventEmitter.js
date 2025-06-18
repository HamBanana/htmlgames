// GameFramework/src/core/EventEmitter.js
/**
 * EventEmitter - Core event system for the framework
 * @class EventEmitter
 */
export class EventEmitter {
    constructor() {
        this.events = new Map();
        this.onceEvents = new Map();
    }
    
    /**
     * Register an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {EventEmitter} - Returns this for chaining
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
        return this;
    }
    
    /**
     * Register a one-time event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function
     * @returns {EventEmitter} - Returns this for chaining
     */
    once(event, callback) {
        const onceWrapper = (...args) => {
            this.off(event, onceWrapper);
            callback(...args);
        };
        onceWrapper.originalCallback = callback;
        this.on(event, onceWrapper);
        return this;
    }
    
    /**
     * Remove an event listener
     * @param {string} event - Event name
     * @param {Function} callback - Callback function to remove
     * @returns {EventEmitter} - Returns this for chaining
     */
    off(event, callback) {
        if (this.events.has(event)) {
            const callbacks = this.events.get(event);
            const index = callbacks.findIndex(cb => 
                cb === callback || cb.originalCallback === callback
            );
            if (index > -1) {
                callbacks.splice(index, 1);
            }
            if (callbacks.length === 0) {
                this.events.delete(event);
            }
        }
        return this;
    }
    
    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {...any} args - Arguments to pass to callbacks
     * @returns {EventEmitter} - Returns this for chaining
     */
    emit(event, ...args) {
        if (this.events.has(event)) {
            const callbacks = [...this.events.get(event)];
            callbacks.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                    console.error(`Error in event handler for '${event}':`, error);
                }
            });
        }
        return this;
    }
    
    /**
     * Remove all listeners for an event or all events
     * @param {string} [event] - Event name (optional)
     * @returns {EventEmitter} - Returns this for chaining
     */
    removeAllListeners(event) {
        if (event) {
            this.events.delete(event);
        } else {
            this.events.clear();
        }
        return this;
    }
    
    /**
     * Get listener count for an event
     * @param {string} event - Event name
     * @returns {number} - Number of listeners
     */
    listenerCount(event) {
        return this.events.has(event) ? this.events.get(event).length : 0;
    }
    
    /**
     * Get all event names
     * @returns {string[]} - Array of event names
     */
    eventNames() {
        return Array.from(this.events.keys());
    }
}