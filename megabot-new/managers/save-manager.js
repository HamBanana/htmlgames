class SaveManager {
    constructor() {
        this.storageKey = 'megabot_save';
    }
    
    save(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Failed to save game:', e);
            return false;
        }
    }
    
    load() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Failed to load game:', e);
            return null;
        }
    }
    
    deleteSave() {
        localStorage.removeItem(this.storageKey);
    }
}