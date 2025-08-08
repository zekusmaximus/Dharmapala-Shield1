(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))i(r);new MutationObserver(r=>{for(const o of r)if(o.type==="childList")for(const n of o.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&i(n)}).observe(document,{childList:!0,subtree:!0});function t(r){const o={};return r.integrity&&(o.integrity=r.integrity),r.referrerPolicy&&(o.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?o.credentials="include":r.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function i(r){if(r.ep)return;r.ep=!0;const o=t(r);fetch(r.href,o)}})();const f="modulepreload",h=function(c){return"/"+c},u={},y=function(e,t,i){let r=Promise.resolve();if(t&&t.length>0){document.getElementsByTagName("link");const n=document.querySelector("meta[property=csp-nonce]"),s=(n==null?void 0:n.nonce)||(n==null?void 0:n.getAttribute("nonce"));r=Promise.allSettled(t.map(a=>{if(a=h(a),a in u)return;u[a]=!0;const l=a.endsWith(".css"),p=l?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${a}"]${p}`))return;const d=document.createElement("link");if(d.rel=l?"stylesheet":f,l||(d.as="script"),d.crossOrigin="",d.href=a,s&&d.setAttribute("nonce",s),document.head.appendChild(d),l)return new Promise((g,m)=>{d.addEventListener("load",g),d.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${a}`)))})}))}function o(n){const s=new Event("vite:preloadError",{cancelable:!0});if(s.payload=n,window.dispatchEvent(s),!s.defaultPrevented)throw n}return r.then(n=>{for(const s of n||[])s.status==="rejected"&&o(s.reason);return e().catch(o)})};class w{constructor(){this.loadingScreen=null}show(){const e=document.getElementById("game-screen"),t=document.getElementById("loading-screen");e&&(e.style.display="none"),t&&(t.classList.remove("fade-out","hidden"),t.classList.add("active"),t.style.display="flex",t.offsetHeight,t.classList.add("fade-in"),this.loadingScreen=t)}hide(){if(!this.loadingScreen)return;this.loadingScreen.classList.remove("fade-in"),this.loadingScreen.classList.add("fade-out");const e=this.getTransitionDuration(this.loadingScreen)||500;setTimeout(()=>{this.loadingScreen&&(this.loadingScreen.style.display="none",this.loadingScreen.classList.remove("active","fade-out"),this.loadingScreen.classList.add("hidden"))},e)}getTransitionDuration(e){try{const i=window.getComputedStyle(e).transitionDuration;if(i&&i!=="0s"){const r=parseFloat(i.replace("s",""));return Math.round(r*1e3)}}catch{}return null}}class x{constructor(){this.backgroundProgress={total:4,completed:0,steps:["Assets","Systems","Game Core","Finalization"]}}show(){const e=document.createElement("div");e.id="background-progress-indicator",e.innerHTML=`
            <div class="progress-content">
                <div class="progress-text">Initializing background systems...</div>
                <div class="progress-bar">
                    <div class="progress-fill"></div>
                </div>
                <div class="progress-step">Step 0 of 4</div>
            </div>
        `,e.style.cssText=`
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 12px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
            min-width: 280px;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s ease;
        `;const t=e.querySelector(".progress-bar");t&&(t.style.cssText=`
                width: 100%;
                height: 6px;
                background: rgba(255, 255, 255, 0.2);
                border-radius: 3px;
                margin: 8px 0 4px 0;
                overflow: hidden;
            `);const i=e.querySelector(".progress-fill");i&&(i.style.cssText=`
                height: 100%;
                background: linear-gradient(90deg, #4CAF50, #8BC34A);
                width: 0%;
                transition: width 0.5s ease;
                border-radius: 3px;
            `);const r=e.querySelector(".progress-text");r&&(r.style.cssText=`
                margin-bottom: 4px;
                font-weight: 500;
            `);const o=e.querySelector(".progress-step");o&&(o.style.cssText=`
                font-size: 10px;
                opacity: 0.7;
                margin-top: 2px;
            `),document.body.appendChild(e),requestAnimationFrame(()=>{e.style.opacity="1",e.style.transform="translateY(0)"})}update(e,t){const i=document.getElementById("background-progress-indicator");if(!i)return;const r=i.querySelector(".progress-text"),o=i.querySelector(".progress-fill"),n=i.querySelector(".progress-step");if(r&&(r.textContent=e),o)if(t===-1)o.style.background="linear-gradient(90deg, #f44336, #ff5722)",o.style.width="100%";else{const s=Math.max(0,Math.min(100,t/this.backgroundProgress.total*100));o.style.width=`${s}%`,o.style.background="linear-gradient(90deg, #4CAF50, #8BC34A)"}n&&(t===-1?n.textContent="Error occurred":n.textContent=`Step ${t} of ${this.backgroundProgress.total}`)}hide(){const e=document.getElementById("background-progress-indicator");if(!e)return;e.style.opacity="0",e.style.transform="translateY(20px)";const t=this.getTransitionDuration(e)||300;setTimeout(()=>{e.parentNode&&e.parentNode.removeChild(e)},t)}getTransitionDuration(e){try{const i=window.getComputedStyle(e).transitionDuration;if(i&&i!=="0s"){const r=parseFloat(i.replace("s",""));return Math.round(r*1e3)}}catch{}return null}}class b{loadCriticalAssets(){return Promise.resolve()}loadScript(e){return new Promise((t,i)=>{const r=document.createElement("script");r.src=e,r.async=!0,r.onload=()=>t(),r.onerror=o=>i(o),document.head.appendChild(r)})}loadCSS(e){return new Promise((t,i)=>{const r=document.createElement("link");r.rel="stylesheet",r.href=e,r.onload=()=>t(),r.onerror=o=>i(o),document.head.appendChild(r)})}}class S{showError(e){var o,n;const t=document.createElement("div");t.className="error-notification",t.innerHTML=`
            <div class="error-content">
                <strong>Initialization Error</strong>
                <p>${e&&e.message?e.message:"An error occurred"}</p>
                <button id="error-reload-btn">Reload</button>
                <button id="error-dismiss-btn">Dismiss</button>
            </div>
        `,t.style.cssText=`
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(244, 67, 54, 0.9);
            color: white;
            padding: 16px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10001;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `,document.body.appendChild(t);const i=()=>window.location.reload(),r=()=>t.remove();(o=t.querySelector("#error-reload-btn"))==null||o.addEventListener("click",i),(n=t.querySelector("#error-dismiss-btn"))==null||n.addEventListener("click",r),setTimeout(()=>{t.parentNode&&t.remove()},1e4)}showCriticalError(e){console.error("[ErrorNotificationManager] Critical error - cannot show menu:",e),document.body.innerHTML=`
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; 
                        background: linear-gradient(135deg, #1a1a2e, #16213e); color: #00d4ff; 
                        font-family: Arial, sans-serif; text-align: center;">
                <div style="max-width: 600px; padding: 40px;">
                    <h1 style="font-size: 2.5rem; margin-bottom: 20px; text-shadow: 0 0 10px rgba(0, 212, 255, 0.5);">
                        Dharmapala Shield
                    </h1>
                    <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 10px; margin-bottom: 20px;">
                        <h2 style="color: #ff6b6b; margin-bottom: 10px;">Critical Startup Error</h2>
                        <p style="font-size: 1.1rem; margin-bottom: 15px;">
                            ${e.message}
                        </p>
                        <p style="font-size: 0.9rem; opacity: 0.8;">
                            The game encountered a critical error during initialization and cannot continue.
                        </p>
                    </div>
                    <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
                        <button onclick="location.reload()" 
                                style="padding: 12px 24px; margin: 5px; background: #00d4ff; 
                                       color: #1a1a2e; border: none; border-radius: 8px; cursor: pointer;
                                       font-size: 1rem; font-weight: 500; transition: all 0.2s ease;
                                       box-shadow: 0 4px 15px rgba(0, 212, 255, 0.3);"
                                onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 20px rgba(0, 212, 255, 0.4)';"
                                onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 15px rgba(0, 212, 255, 0.3)';">
                            🔄 Reload Game
                        </button>
                        <button onclick="window.open('https://github.com/zekusmaximus/Dharmapala-Shield1/issues', '_blank')" 
                                style="padding: 12px 24px; margin: 5px; background: rgba(255, 255, 255, 0.1); 
                                       color: #00d4ff; border: 2px solid #00d4ff; border-radius: 8px; cursor: pointer;
                                       font-size: 1rem; font-weight: 500; transition: all 0.2s ease;"
                                onmouseover="this.style.background='rgba(0, 212, 255, 0.1)'"
                                onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'">
                            🐛 Report Issue
                        </button>
                    </div>
                    <div style="margin-top: 30px; padding: 15px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
                        <h3 style="margin-bottom: 10px; font-size: 1.1rem;">Troubleshooting Tips:</h3>
                        <ul style="text-align: left; font-size: 0.9rem; opacity: 0.9;">
                            <li>Try refreshing the page (Ctrl+F5 or Cmd+Shift+R)</li>
                            <li>Clear your browser cache and cookies</li>
                            <li>Disable browser extensions temporarily</li>
                            <li>Try using an incognito/private browsing window</li>
                            <li>Check your internet connection</li>
                        </ul>
                    </div>
                    <p style="margin-top: 20px; font-size: 0.8rem; opacity: 0.6;">
                        Error ID: ${Date.now().toString(36)}-${Math.random().toString(36).substr(2,9)}
                    </p>
                </div>
            </div>
        `}showWarningNotification(e,t=5e3){const i=document.createElement("div");i.className="warning-notification",i.id=`warning-notification-${++this.notificationCount}`,i.innerHTML=`
            <div class="warning-content">
                <strong>⚠️ Warning</strong>
                <p>${e}</p>
                <button onclick="this.parentElement.parentElement.remove()">Dismiss</button>
            </div>
        `,i.style.cssText=`
            position: fixed;
            top: ${20+(this.notificationCount-1)*80}px;
            right: 20px;
            background: rgba(255, 152, 0, 0.9);
            color: white;
            padding: 16px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: ${10001+this.notificationCount};
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;const r=i.querySelector("button");r&&(r.style.cssText=`
                margin-top: 5px;
                padding: 5px 10px;
                border: none;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                background: rgba(255, 255, 255, 0.2);
                color: white;
                transition: background 0.2s ease;
            `),document.body.appendChild(i),requestAnimationFrame(()=>{i.style.opacity="1",i.style.transform="translateX(0)"}),setTimeout(()=>{i.parentNode&&(i.style.opacity="0",i.style.transform="translateX(100%)",setTimeout(()=>{i.parentNode&&i.remove()},300))},t),console.log("[ErrorNotificationManager] Warning notification displayed:",e)}showSuccessNotification(e,t=3e3){const i=document.createElement("div");i.className="success-notification",i.id=`success-notification-${++this.notificationCount}`,i.innerHTML=`
            <div class="success-content">
                <strong>✅ Success</strong>
                <p>${e}</p>
            </div>
        `,i.style.cssText=`
            position: fixed;
            top: ${20+(this.notificationCount-1)*80}px;
            right: 20px;
            background: rgba(76, 175, 80, 0.9);
            color: white;
            padding: 16px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: ${10001+this.notificationCount};
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `,document.body.appendChild(i),requestAnimationFrame(()=>{i.style.opacity="1",i.style.transform="translateX(0)"}),setTimeout(()=>{i.parentNode&&(i.style.opacity="0",i.style.transform="translateX(100%)",setTimeout(()=>{i.parentNode&&i.remove()},300))},t),console.log("[ErrorNotificationManager] Success notification displayed:",e)}clearAllNotifications(){document.querySelectorAll(".error-notification, .warning-notification, .success-notification").forEach(t=>{t.style.opacity="0",t.style.transform="translateX(100%)",setTimeout(()=>{t.parentNode&&t.remove()},300)}),this.notificationCount=0,console.log("[ErrorNotificationManager] All notifications cleared")}}class v{constructor(){this.loadingScreen=null,this.game=null,this.screenManager=null,this.initialized=!1,this.progressIndicator=null,this.backgroundProgress={total:4,completed:0,steps:["Assets","Systems","Game Core","Finalization"]},this.devicePerformance=this.assessDevicePerformance(),this.loadingScreenManager=new w,this.progressIndicatorManager=new x,this.assetLoader=new b,this.errorNotificationManager=new S}applyConfigurationOverrides(){}assessDevicePerformance(){const e={score:1,factors:{}};try{if(navigator.hardwareConcurrency){const t=navigator.hardwareConcurrency;e.factors.cores=t,t>=8?e.score+=.3:t>=4?e.score+=.1:t<=2&&(e.score-=.2)}if(navigator.deviceMemory){const t=navigator.deviceMemory;e.factors.memory=t,t>=8?e.score+=.2:t>=4?e.score+=.1:t<=2&&(e.score-=.3)}return e}catch{return e}}async init(){this.showLoadingScreen();try{typeof window.ScreenManager<"u"&&(this.screenManager=new window.ScreenManager),this.ensureMenuVisible("Normal initialization"),this.showBackgroundProgressIndicator(),await this.initializeBackgroundSystems(),this.hideBackgroundProgressIndicator()}catch(e){console.error("[GameBootstrap] Initialization failed:",e),this.showErrorNotification(e),this.ensureMenuVisible("Error initialization path",e)}finally{this.hideLoadingScreen()}}async initializeBackgroundSystems(){try{this.updateBackgroundProgress("Loading critical assets...",1),await this.preloadCriticalAssets(),this.updateBackgroundProgress("Initializing game systems...",2),await this.initializeGame(),this.updateBackgroundProgress("Finalizing systems...",3),await new Promise(e=>setTimeout(e,200)),this.updateBackgroundProgress("Ready!",4)}catch(e){throw this.updateBackgroundProgress(`Failed: ${e.message}`,-1),this.showErrorNotification(e),e}}ensureMenuVisible(){this.hideLoadingScreen();const e=this.screenManager||this.game&&this.game.screenManager;if(e&&typeof e.showScreen=="function")try{e.showScreen("main-menu");return}catch{}const t=document.getElementById("loading-screen");t&&(t.style.display="none",t.classList.remove("active"));const i=document.getElementById("main-menu-screen");i&&(i.style.display="flex",i.classList.add("active"))}showLoadingScreen(){var e,t;(t=(e=this.loadingScreenManager).show)==null||t.call(e)}hideLoadingScreen(){var e,t;(t=(e=this.loadingScreenManager).hide)==null||t.call(e)}showBackgroundProgressIndicator(){var e,t;(t=(e=this.progressIndicatorManager).show)==null||t.call(e)}hideBackgroundProgressIndicator(){var e,t;(t=(e=this.progressIndicatorManager).hide)==null||t.call(e)}updateBackgroundProgress(e,t){var i,r;(r=(i=this.progressIndicatorManager).update)==null||r.call(i,e,t,this.backgroundProgress.total)}showErrorNotification(e){var t,i;(i=(t=this.errorNotificationManager).showError)==null||i.call(t,e)}async preloadCriticalAssets(){return this.assetLoader.loadCriticalAssets()}loadScript(e){return this.assetLoader.loadScript(e)}loadStylesheet(e){return this.assetLoader.loadCSS(e)}async initializeGame(){const{default:e}=await y(async()=>{const{default:r}=await import("./game-DxOe2hu1.js");return{default:r}},[]),t=document.getElementById("gameCanvas");if(!t)throw new Error("Game canvas not found in DOM");if(this.setupResponsiveCanvas(t),this.game=new e(t),window.game=this.game,!window.camera&&typeof window.Camera<"u"?window.camera=new window.Camera(t):window.camera&&typeof window.camera.setCanvas=="function"&&window.camera.setCanvas(t),this.screenManager&&(this.game.screenManager=this.screenManager),this.setupCanvasResizeHandler(t),await this.game.initialize()===!1)throw new Error("Game initialization returned false");this.initialized=!0}setupResponsiveCanvas(e){try{let t=800,i=600;typeof window.CONFIG<"u"&&window.CONFIG.CANVAS_WIDTH&&window.CONFIG.CANVAS_HEIGHT&&(typeof window.CONFIG.CANVAS_WIDTH=="number"&&window.CONFIG.CANVAS_WIDTH>0&&window.CONFIG.CANVAS_WIDTH<=4096&&(t=window.CONFIG.CANVAS_WIDTH),typeof window.CONFIG.CANVAS_HEIGHT=="number"&&window.CONFIG.CANVAS_HEIGHT>0&&window.CONFIG.CANVAS_HEIGHT<=4096&&(i=window.CONFIG.CANVAS_HEIGHT));const r=e.parentElement;if(r){const o=r.clientWidth,n=r.clientHeight,s=t/i,a=o/n;o>0&&n>0&&(a>s?(i=Math.min(i,n),t=i*s):(t=Math.min(t,o),i=t/s))}e.width=Math.floor(t),e.height=Math.floor(i),e.style.width=t+"px",e.style.height=i+"px"}catch{}}setupCanvasResizeHandler(e){window.addEventListener("resize",()=>{this.setupResponsiveCanvas(e),this.game&&typeof this.game.handleResize=="function"&&this.game.handleResize()})}}window.addEventListener("DOMContentLoaded",()=>{new v().init()});
