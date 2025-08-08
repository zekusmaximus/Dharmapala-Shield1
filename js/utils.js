const Utils = {
    math: {
        distance(x1, y1, x2, y2) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            return Math.sqrt(dx * dx + dy * dy);
        },

        distanceSquared(x1, y1, x2, y2) {
            const dx = x2 - x1;
            const dy = y2 - y1;
            return dx * dx + dy * dy;
        },

        angle(x1, y1, x2, y2) {
            return Math.atan2(y2 - y1, x2 - x1);
        },

        normalizeAngle(angle) {
            while (angle < 0) angle += Math.PI * 2;
            while (angle >= Math.PI * 2) angle -= Math.PI * 2;
            return angle;
        },

        radToDeg(rad) {
            return rad * (180 / Math.PI);
        },

        degToRad(deg) {
            return deg * (Math.PI / 180);
        },

        lerp(start, end, factor) {
            return start + (end - start) * factor;
        },

        clamp(value, min, max) {
            return Math.min(Math.max(value, min), max);
        },

        randomFloat(min, max) {
            return Math.random() * (max - min) + min;
        },

        randomInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        },

        pointInCircle(px, py, cx, cy, radius) {
            return this.distanceSquared(px, py, cx, cy) <= radius * radius;
        },

        pointInRect(px, py, rx, ry, rw, rh) {
            return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
        },

        circleIntersectsRect(cx, cy, radius, rx, ry, rw, rh) {
            const closestX = Math.max(rx, Math.min(cx, rx + rw));
            const closestY = Math.max(ry, Math.min(cy, ry + rh));
            return this.distanceSquared(cx, cy, closestX, closestY) <= radius * radius;
        }
    },

    dom: {
        $(selector) {
            return document.querySelector(selector);
        },

        $$(selector) {
            return document.querySelectorAll(selector);
        },

        createElement(tag, className, innerHTML) {
            const element = document.createElement(tag);
            if (className) element.className = className;
            if (innerHTML) element.innerHTML = innerHTML;
            return element;
        },

        show(element) {
            if (typeof element === 'string') element = this.$(element);
            if (element) element.style.display = 'block';
        },

        hide(element) {
            if (typeof element === 'string') element = this.$(element);
            if (element) element.style.display = 'none';
        },

        toggle(element) {
            if (typeof element === 'string') element = this.$(element);
            if (element) {
                element.style.display = element.style.display === 'none' ? 'block' : 'none';
            }
        },

        addClass(element, className) {
            if (typeof element === 'string') element = this.$(element);
            if (element) element.classList.add(className);
        },

        removeClass(element, className) {
            if (typeof element === 'string') element = this.$(element);
            if (element) element.classList.remove(className);
        },

        hasClass(element, className) {
            if (typeof element === 'string') element = this.$(element);
            return element ? element.classList.contains(className) : false;
        },

        on(element, event, handler) {
            if (typeof element === 'string') element = this.$(element);
            if (element) element.addEventListener(event, handler);
        },

        off(element, event, handler) {
            if (typeof element === 'string') element = this.$(element);
            if (element) element.removeEventListener(event, handler);
        },

        // Screen Management Utilities
        showMainMenuDirect() {
            console.log('[Utils.dom] Direct main menu display');
            
            try {
                // Hide all screens
                const allScreens = document.querySelectorAll('.screen');
                allScreens.forEach(screen => {
                    screen.style.display = 'none';
                    screen.classList.remove('active');
                });
                
                // Show main menu directly
                const mainMenuScreen = document.getElementById('main-menu-screen');
                if (mainMenuScreen) {
                    mainMenuScreen.style.display = 'flex';
                    mainMenuScreen.classList.add('active');
                    
                    // Apply overflow management for menu screen
                    document.body.style.overflow = 'auto';
                    
                    console.log('[Utils.dom] Main menu shown directly with overflow management');
                    return true;
                } else {
                    console.error('[Utils.dom] Main menu screen element not found!');
                    return false;
                }
            } catch (error) {
                console.error('[Utils.dom] Error in direct main menu display:', error);
                return false;
            }
        }
    },

    game: {
        formatNumber(num) {
            if (num >= 1000000) {
                return (num / 1000000).toFixed(1) + 'M';
            } else if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'K';
            }
            return num.toString();
        },

        formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        },

        formatPercentage(value, total) {
            if (total === 0) return '0%';
            return Math.round((value / total) * 100) + '%';
        },

        generateId() {
            return 'id_' + Math.random().toString(36).substr(2, 9);
        },

        deepClone(obj) {
            if (obj === null || typeof obj !== 'object') return obj;
            if (obj instanceof Date) return new Date(obj.getTime());
            if (obj instanceof Array) return obj.map(item => this.deepClone(item));
            if (obj instanceof Object) {
                const cloned = {};
                for (const key in obj) {
                    if (obj.hasOwnProperty(key)) {
                        cloned[key] = this.deepClone(obj[key]);
                    }
                }
                return cloned;
            }
        },

        throttle(func, limit) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },

        debounce(func, delay) {
            let timeoutId;
            return function() {
                const args = arguments;
                const context = this;
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => func.apply(context, args), delay);
            };
        }
    },

    validation: {
        isNumber(value) {
            return typeof value === 'number' && !isNaN(value);
        },

        isPositiveNumber(value) {
            return this.isNumber(value) && value > 0;
        },

        isInteger(value) {
            return this.isNumber(value) && Number.isInteger(value);
        },

        isString(value) {
            return typeof value === 'string';
        },

        isObject(value) {
            return value !== null && typeof value === 'object' && !Array.isArray(value);
        },

        isArray(value) {
            return Array.isArray(value);
        },

        isFunction(value) {
            return typeof value === 'function';
        },

        inRange(value, min, max) {
            return this.isNumber(value) && value >= min && value <= max;
        },

        hasProperty(obj, prop) {
            return this.isObject(obj) && obj.hasOwnProperty(prop);
        },

        isValidCoordinate(x, y) {
            return this.isNumber(x) && this.isNumber(y);
        }
    },

    color: {
        hexToRgb(hex) {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? {
                r: parseInt(result[1], 16),
                g: parseInt(result[2], 16),
                b: parseInt(result[3], 16)
            } : null;
        },

        rgbToHex(r, g, b) {
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        },

        rgbaToString(r, g, b, a = 1) {
            return `rgba(${r}, ${g}, ${b}, ${a})`;
        },

        interpolateColor(color1, color2, factor) {
            const c1 = this.hexToRgb(color1);
            const c2 = this.hexToRgb(color2);
            if (!c1 || !c2) return color1;

            const r = Math.round(Utils.math.lerp(c1.r, c2.r, factor));
            const g = Math.round(Utils.math.lerp(c1.g, c2.g, factor));
            const b = Math.round(Utils.math.lerp(c1.b, c2.b, factor));

            return this.rgbToHex(r, g, b);
        }
    },

    canvas: {
        getCanvasContext(canvasId) {
            const canvas = Utils.dom.$(canvasId);
            return canvas ? canvas.getContext('2d') : null;
        },

        clearCanvas(ctx) {
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        },

        drawCircle(ctx, x, y, radius, fillColor, strokeColor, strokeWidth = 1) {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            
            if (fillColor) {
                ctx.fillStyle = fillColor;
                ctx.fill();
            }
            
            if (strokeColor) {
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = strokeWidth;
                ctx.stroke();
            }
        },

        drawRect(ctx, x, y, width, height, fillColor, strokeColor, strokeWidth = 1) {
            if (fillColor) {
                ctx.fillStyle = fillColor;
                ctx.fillRect(x, y, width, height);
            }
            
            if (strokeColor) {
                ctx.strokeStyle = strokeColor;
                ctx.lineWidth = strokeWidth;
                ctx.strokeRect(x, y, width, height);
            }
        },

        drawLine(ctx, x1, y1, x2, y2, color, width = 1) {
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.stroke();
        },

        drawText(ctx, text, x, y, font, color, align = 'left') {
            ctx.font = font;
            ctx.fillStyle = color;
            ctx.textAlign = align;
            ctx.fillText(text, x, y);
        }
    },

    audio: {
        createAudioContext() {
            return new (window.AudioContext || window.webkitAudioContext)();
        },

        loadSound(url) {
            return new Promise((resolve, reject) => {
                const audio = new Audio();
                audio.onload = () => resolve(audio);
                audio.onerror = reject;
                audio.src = url;
            });
        },

        playSound(audio, volume = 1, loop = false) {
            if (audio) {
                audio.volume = Utils.math.clamp(volume, 0, 1);
                audio.loop = loop;
                audio.currentTime = 0;
                return audio.play().catch(e => console.warn('Audio play failed:', e));
            }
        }
    },

    storage: {
        set(key, value) {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.warn('localStorage set failed:', e);
                return false;
            }
        },

        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : defaultValue;
            } catch (e) {
                console.warn('localStorage get failed:', e);
                return defaultValue;
            }
        },

        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.warn('localStorage remove failed:', e);
                return false;
            }
        },

        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (e) {
                console.warn('localStorage clear failed:', e);
                return false;
            }
        }
    },

    performance: {
        now() {
            return performance.now();
        },

        createTimer() {
            let startTime = this.now();
            return {
                reset: () => startTime = this.now(),
                elapsed: () => this.now() - startTime
            };
        },

        fps: {
            frameCount: 0,
            lastTime: 0,
            currentFPS: 0,
            
            update() {
                this.frameCount++;
                const now = Utils.performance.now();
                if (now >= this.lastTime + 1000) {
                    this.currentFPS = Math.round((this.frameCount * 1000) / (now - this.lastTime));
                    this.frameCount = 0;
                    this.lastTime = now;
                }
                return this.currentFPS;
            }
        }
    }
};

export default Utils;