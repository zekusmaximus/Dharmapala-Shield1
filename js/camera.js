class Camera {
    constructor(canvas) {
        this.canvas = canvas;
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.targetZoom = 1;
        this.minZoom = 0.5;
        this.maxZoom = 3.0;
        this.zoomSpeed = 0.1;
        
        this.width = canvas ? canvas.width : 800;
        this.height = canvas ? canvas.height : 600;
        
        this.bounds = {
            left: -Infinity,
            top: -Infinity,
            right: Infinity,
            bottom: Infinity
        };
        
        this.following = null;
        this.followSpeed = 0.1;
        this.followOffset = { x: 0, y: 0 };
        
        this.shaking = false;
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeDecay = 0.9;
        this.shakeOffset = { x: 0, y: 0 };
        
        this.setupResizeHandler();
    }

    setupResizeHandler() {
        if (typeof window !== 'undefined') {
            window.addEventListener('resize', () => this.handleResize());
        }
    }

    handleResize() {
        if (this.canvas) {
            this.updateDimensions();
        }
    }

    updateDimensions() {
        if (!this.canvas) return;
        
        this.width = this.canvas.width;
        this.height = this.canvas.height;
    }

    setCanvas(canvas) {
        this.canvas = canvas;
        this.updateDimensions();
    }

    setPosition(x, y) {
        this.x = x;
        this.y = y;
        this.constrainToBounds();
    }

    move(dx, dy) {
        this.x += dx;
        this.y += dy;
        this.constrainToBounds();
    }

    setZoom(zoom) {
        this.targetZoom = Utils.math.clamp(zoom, this.minZoom, this.maxZoom);
    }

    zoomIn(factor = 1.2) {
        this.setZoom(this.targetZoom * factor);
    }

    zoomOut(factor = 0.8) {
        this.setZoom(this.targetZoom * factor);
    }

    zoomToPoint(x, y, zoomFactor) {
        const worldX = this.screenToWorldX(x);
        const worldY = this.screenToWorldY(y);
        
        const oldZoom = this.zoom;
        this.setZoom(this.zoom * zoomFactor);
        const newZoom = this.targetZoom;
        
        const zoomRatio = newZoom / oldZoom;
        this.x = worldX - (worldX - this.x) * zoomRatio;
        this.y = worldY - (worldY - this.y) * zoomRatio;
        
        this.constrainToBounds();
    }

    setBounds(left, top, right, bottom) {
        this.bounds.left = left;
        this.bounds.top = top;
        this.bounds.right = right;
        this.bounds.bottom = bottom;
        this.constrainToBounds();
    }

    constrainToBounds() {
        const halfWidth = (this.width / 2) / this.zoom;
        const halfHeight = (this.height / 2) / this.zoom;
        
        if (this.bounds.left !== -Infinity && this.bounds.right !== Infinity) {
            const minX = this.bounds.left + halfWidth;
            const maxX = this.bounds.right - halfWidth;
            this.x = Utils.math.clamp(this.x, minX, maxX);
        }
        
        if (this.bounds.top !== -Infinity && this.bounds.bottom !== Infinity) {
            const minY = this.bounds.top + halfHeight;
            const maxY = this.bounds.bottom - halfHeight;
            this.y = Utils.math.clamp(this.y, minY, maxY);
        }
    }

    follow(target, speed = 0.1, offsetX = 0, offsetY = 0) {
        this.following = target;
        this.followSpeed = speed;
        this.followOffset.x = offsetX;
        this.followOffset.y = offsetY;
    }

    stopFollowing() {
        this.following = null;
    }

    shake(intensity, duration) {
        this.shaking = true;
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
    }

    update(deltaTime) {
        this.updateZoom(deltaTime);
        this.updateFollowing(deltaTime);
        this.updateShake(deltaTime);
    }

    updateZoom(deltaTime) {
        if (Math.abs(this.zoom - this.targetZoom) > 0.01) {
            const zoomDiff = this.targetZoom - this.zoom;
            this.zoom += zoomDiff * this.zoomSpeed;
            
            if (Math.abs(zoomDiff) < 0.01) {
                this.zoom = this.targetZoom;
            }
        }
    }

    updateFollowing(deltaTime) {
        if (!this.following) return;
        
        const targetX = this.following.x + this.followOffset.x;
        const targetY = this.following.y + this.followOffset.y;
        
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        
        this.x += dx * this.followSpeed;
        this.y += dy * this.followSpeed;
        
        this.constrainToBounds();
    }

    updateShake(deltaTime) {
        if (!this.shaking) return;
        
        this.shakeDuration -= deltaTime;
        
        if (this.shakeDuration <= 0) {
            this.shaking = false;
            this.shakeOffset.x = 0;
            this.shakeOffset.y = 0;
            return;
        }
        
        const intensity = this.shakeIntensity * (this.shakeDuration / 1000);
        this.shakeOffset.x = (Math.random() - 0.5) * intensity * 2;
        this.shakeOffset.y = (Math.random() - 0.5) * intensity * 2;
    }

    applyTransform(ctx) {
        ctx.save();
        
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        
        ctx.translate(centerX, centerY);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x + this.shakeOffset.x, -this.y + this.shakeOffset.y);
        
        return () => ctx.restore();
    }

    screenToWorldX(screenX) {
        const centerX = this.width / 2;
        return (screenX - centerX) / this.zoom + this.x;
    }

    screenToWorldY(screenY) {
        const centerY = this.height / 2;
        return (screenY - centerY) / this.zoom + this.y;
    }

    screenToWorld(screenX, screenY) {
        return {
            x: this.screenToWorldX(screenX),
            y: this.screenToWorldY(screenY)
        };
    }

    worldToScreenX(worldX) {
        const centerX = this.width / 2;
        return (worldX - this.x) * this.zoom + centerX;
    }

    worldToScreenY(worldY) {
        const centerY = this.height / 2;
        return (worldY - this.y) * this.zoom + centerY;
    }

    worldToScreen(worldX, worldY) {
        return {
            x: this.worldToScreenX(worldX),
            y: this.worldToScreenY(worldY)
        };
    }

    isPointVisible(worldX, worldY, margin = 0) {
        const screenPos = this.worldToScreen(worldX, worldY);
        return screenPos.x >= -margin && 
               screenPos.x <= this.width + margin && 
               screenPos.y >= -margin && 
               screenPos.y <= this.height + margin;
    }

    isRectVisible(worldX, worldY, width, height, margin = 0) {
        const left = this.worldToScreenX(worldX);
        const right = this.worldToScreenX(worldX + width);
        const top = this.worldToScreenY(worldY);
        const bottom = this.worldToScreenY(worldY + height);
        
        return right >= -margin && 
               left <= this.width + margin && 
               bottom >= -margin && 
               top <= this.height + margin;
    }

    getVisibleBounds(margin = 0) {
        const topLeft = this.screenToWorld(-margin, -margin);
        const bottomRight = this.screenToWorld(this.width + margin, this.height + margin);
        
        return {
            left: topLeft.x,
            top: topLeft.y,
            right: bottomRight.x,
            bottom: bottomRight.y,
            width: bottomRight.x - topLeft.x,
            height: bottomRight.y - topLeft.y
        };
    }

    centerOn(worldX, worldY) {
        this.setPosition(worldX, worldY);
    }

    fitToRect(worldX, worldY, width, height, padding = 50) {
        const paddedWidth = width + padding * 2;
        const paddedHeight = height + padding * 2;
        
        const zoomX = this.width / paddedWidth;
        const zoomY = this.height / paddedHeight;
        const newZoom = Math.min(zoomX, zoomY);
        
        this.setZoom(newZoom);
        this.centerOn(worldX + width / 2, worldY + height / 2);
    }

    reset() {
        this.x = 0;
        this.y = 0;
        this.zoom = 1;
        this.targetZoom = 1;
        this.shaking = false;
        this.shakeOffset.x = 0;
        this.shakeOffset.y = 0;
        this.following = null;
    }

    getState() {
        return {
            x: this.x,
            y: this.y,
            zoom: this.zoom,
            targetZoom: this.targetZoom
        };
    }

    setState(state) {
        this.x = state.x || 0;
        this.y = state.y || 0;
        this.zoom = state.zoom || 1;
        this.targetZoom = state.targetZoom || this.zoom;
        this.constrainToBounds();
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = Camera;
} else {
    window.Camera = Camera;
}