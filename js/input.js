class InputManager {
    constructor() {
        this.mouse = {
            x: 0,
            y: 0,
            worldX: 0,
            worldY: 0,
            down: false,
            pressed: false,
            released: false,
            button: -1
        };

        this.touch = {
            active: false,
            x: 0,
            y: 0,
            worldX: 0,
            worldY: 0,
            startX: 0,
            startY: 0,
            deltaX: 0,
            deltaY: 0
        };

        this.keyboard = {
            keys: new Set(),
            pressed: new Set(),
            released: new Set()
        };

        this.canvas = null;
        this.camera = null;
        this.listeners = new Map();
        this.eventQueue = [];
        
        this.setupEventListeners();
    }

    setCanvas(canvas) {
        if (this.canvas) {
            this.removeCanvasListeners();
        }
        
        this.canvas = canvas;
        if (canvas) {
            this.setupCanvasListeners();
        }
    }

    setCamera(camera) {
        this.camera = camera;
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
        document.addEventListener('keyup', (e) => this.onKeyUp(e));
        
        window.addEventListener('blur', () => this.onWindowBlur());
        window.addEventListener('focus', () => this.onWindowFocus());
    }

    setupCanvasListeners() {
        if (!this.canvas) return;

        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
        this.canvas.addEventListener('mouseleave', (e) => this.onMouseLeave(e));
        this.canvas.addEventListener('wheel', (e) => this.onWheel(e));

        this.canvas.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.canvas.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.canvas.addEventListener('touchend', (e) => this.onTouchEnd(e));
        this.canvas.addEventListener('touchcancel', (e) => this.onTouchEnd(e));

        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    removeCanvasListeners() {
        if (!this.canvas) return;

        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('mouseup', this.onMouseUp);
        this.canvas.removeEventListener('mouseleave', this.onMouseLeave);
        this.canvas.removeEventListener('wheel', this.onWheel);
        this.canvas.removeEventListener('touchstart', this.onTouchStart);
        this.canvas.removeEventListener('touchmove', this.onTouchMove);
        this.canvas.removeEventListener('touchend', this.onTouchEnd);
        this.canvas.removeEventListener('touchcancel', this.onTouchEnd);
    }

    onMouseDown(e) {
        e.preventDefault();
        this.updateMousePosition(e);
        this.mouse.down = true;
        this.mouse.pressed = true;
        this.mouse.button = e.button;
        
        this.queueEvent('mousedown', {
            x: this.mouse.x,
            y: this.mouse.y,
            worldX: this.mouse.worldX,
            worldY: this.mouse.worldY,
            button: e.button
        });
    }

    onMouseMove(e) {
        this.updateMousePosition(e);
        
        this.queueEvent('mousemove', {
            x: this.mouse.x,
            y: this.mouse.y,
            worldX: this.mouse.worldX,
            worldY: this.mouse.worldY
        });
    }

    onMouseUp(e) {
        e.preventDefault();
        this.updateMousePosition(e);
        this.mouse.down = false;
        this.mouse.released = true;
        this.mouse.button = -1;
        
        this.queueEvent('mouseup', {
            x: this.mouse.x,
            y: this.mouse.y,
            worldX: this.mouse.worldX,
            worldY: this.mouse.worldY,
            button: e.button
        });
    }

    onMouseLeave(e) {
        this.mouse.down = false;
        this.mouse.button = -1;
    }

    onWheel(e) {
        e.preventDefault();
        
        this.queueEvent('wheel', {
            x: this.mouse.x,
            y: this.mouse.y,
            deltaY: e.deltaY,
            deltaX: e.deltaX
        });
    }

    onTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        if (!touch) return;

        this.updateTouchPosition(touch);
        this.touch.active = true;
        this.touch.startX = this.touch.x;
        this.touch.startY = this.touch.y;
        this.touch.deltaX = 0;
        this.touch.deltaY = 0;

        this.queueEvent('touchstart', {
            x: this.touch.x,
            y: this.touch.y,
            worldX: this.touch.worldX,
            worldY: this.touch.worldY
        });
    }

    onTouchMove(e) {
        e.preventDefault();
        const touch = e.touches[0];
        if (!touch || !this.touch.active) return;

        const oldX = this.touch.x;
        const oldY = this.touch.y;
        
        this.updateTouchPosition(touch);
        this.touch.deltaX = this.touch.x - this.touch.startX;
        this.touch.deltaY = this.touch.y - this.touch.startY;

        this.queueEvent('touchmove', {
            x: this.touch.x,
            y: this.touch.y,
            worldX: this.touch.worldX,
            worldY: this.touch.worldY,
            deltaX: this.touch.deltaX,
            deltaY: this.touch.deltaY,
            moveX: this.touch.x - oldX,
            moveY: this.touch.y - oldY
        });
    }

    onTouchEnd(e) {
        e.preventDefault();
        
        if (this.touch.active) {
            this.queueEvent('touchend', {
                x: this.touch.x,
                y: this.touch.y,
                worldX: this.touch.worldX,
                worldY: this.touch.worldY,
                deltaX: this.touch.deltaX,
                deltaY: this.touch.deltaY
            });
        }

        this.touch.active = false;
        this.touch.deltaX = 0;
        this.touch.deltaY = 0;
    }

    onKeyDown(e) {
        const key = e.key.toLowerCase();
        
        if (!this.keyboard.keys.has(key)) {
            this.keyboard.pressed.add(key);
        }
        this.keyboard.keys.add(key);

        this.queueEvent('keydown', {
            key: key,
            code: e.code,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey
        });
    }

    onKeyUp(e) {
        const key = e.key.toLowerCase();
        
        this.keyboard.keys.delete(key);
        this.keyboard.released.add(key);

        this.queueEvent('keyup', {
            key: key,
            code: e.code,
            ctrlKey: e.ctrlKey,
            shiftKey: e.shiftKey,
            altKey: e.altKey
        });
    }

    onWindowBlur() {
        this.keyboard.keys.clear();
        this.mouse.down = false;
        this.touch.active = false;
    }

    onWindowFocus() {
        this.keyboard.pressed.clear();
        this.keyboard.released.clear();
    }

    updateMousePosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        
        this.updateWorldCoordinates();
    }

    updateTouchPosition(touch) {
        const rect = this.canvas.getBoundingClientRect();
        this.touch.x = touch.clientX - rect.left;
        this.touch.y = touch.clientY - rect.top;
        
        this.touch.worldX = this.touch.x;
        this.touch.worldY = this.touch.y;
        
        if (this.camera) {
            this.touch.worldX = this.camera.screenToWorldX(this.touch.x);
            this.touch.worldY = this.camera.screenToWorldY(this.touch.y);
        }
    }

    updateWorldCoordinates() {
        this.mouse.worldX = this.mouse.x;
        this.mouse.worldY = this.mouse.y;
        
        if (this.camera) {
            this.mouse.worldX = this.camera.screenToWorldX(this.mouse.x);
            this.mouse.worldY = this.camera.screenToWorldY(this.mouse.y);
        }
    }

    queueEvent(type, data) {
        this.eventQueue.push({ type, data, timestamp: Utils.performance.now() });
    }

    update() {
        this.mouse.pressed = false;
        this.mouse.released = false;
        this.keyboard.pressed.clear();
        this.keyboard.released.clear();
    }

    processEvents() {
        const events = [...this.eventQueue];
        this.eventQueue.length = 0;
        
        for (const event of events) {
            this.dispatchEvent(event.type, event.data);
        }
    }

    addEventListener(type, callback) {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, []);
        }
        this.listeners.get(type).push(callback);
    }

    removeEventListener(type, callback) {
        if (this.listeners.has(type)) {
            const callbacks = this.listeners.get(type);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    dispatchEvent(type, data) {
        if (this.listeners.has(type)) {
            const callbacks = this.listeners.get(type);
            for (const callback of callbacks) {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in input event handler for ${type}:`, error);
                }
            }
        }
    }

    isKeyDown(key) {
        return this.keyboard.keys.has(key.toLowerCase());
    }

    isKeyPressed(key) {
        return this.keyboard.pressed.has(key.toLowerCase());
    }

    isKeyReleased(key) {
        return this.keyboard.released.has(key.toLowerCase());
    }

    isMouseDown(button = 0) {
        return this.mouse.down && (button === -1 || this.mouse.button === button);
    }

    isMousePressed() {
        return this.mouse.pressed;
    }

    isMouseReleased() {
        return this.mouse.released;
    }

    isTouchActive() {
        return this.touch.active;
    }

    getMousePosition() {
        return { x: this.mouse.x, y: this.mouse.y };
    }

    getMouseWorldPosition() {
        return { x: this.mouse.worldX, y: this.mouse.worldY };
    }

    getTouchPosition() {
        return { x: this.touch.x, y: this.touch.y };
    }

    getTouchWorldPosition() {
        return { x: this.touch.worldX, y: this.touch.worldY };
    }

    destroy() {
        this.removeCanvasListeners();
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        window.removeEventListener('blur', this.onWindowBlur);
        window.removeEventListener('focus', this.onWindowFocus);
        
        this.listeners.clear();
        this.eventQueue.length = 0;
    }
}

const inputManager = new InputManager();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = InputManager;
} else {
    window.InputManager = InputManager;
    window.inputManager = inputManager;
}