// 📱 UTILITAIRE DE DEBUG MOBILE

class MobileDebugger {
  constructor() {
    this.logs = [];
    this.errors = [];
    this.warnings = [];
    this.init();
  }

  init() {
    // 📊 Capturer tous les logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args) => {
      this.logs.push({ time: new Date(), data: args });
      originalLog.apply(console, args);
      this.updateDebugPanel();
    };

    console.error = (...args) => {
      this.errors.push({ time: new Date(), data: args });
      originalError.apply(console, args);
      this.updateDebugPanel();
    };

    console.warn = (...args) => {
      this.warnings.push({ time: new Date(), data: args });
      originalWarn.apply(console, args);
      this.updateDebugPanel();
    };

    // 📱 Informations sur l'appareil
    this.logDeviceInfo();
    
    // 🔄 Erreurs globales
    window.addEventListener('error', (e) => {
      this.errors.push({ 
        time: new Date(), 
        type: 'javascript_error',
        message: e.message,
        filename: e.filename,
        line: e.lineno,
        column: e.colno
      });
      this.updateDebugPanel();
    });

    window.addEventListener('unhandledrejection', (e) => {
      this.errors.push({ 
        time: new Date(), 
        type: 'promise_rejection',
        reason: e.reason
      });
      this.updateDebugPanel();
    });

    // ✅ Créer le panneau de debug
    this.createDebugPanel();
  }

  logDeviceInfo() {
    const info = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screen: {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth
      },
      window: {
        width: window.innerWidth,
        height: window.innerHeight,
        outerWidth: window.outerWidth,
        outerHeight: window.outerHeight
      },
      viewport: {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight
      },
      touchSupport: 'ontouchstart' in window,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt
      } : null
    };

    console.log('📱 INFO APPAREIL:', info);
    return info;
  }

  createDebugPanel() {
    // Créer le bouton de debug
    const debugButton = document.createElement('div');
    debugButton.id = 'mobile-debug-button';
    debugButton.innerHTML = '🐛 DEBUG';
    debugButton.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 999999;
      background: #ff4757;
      color: white;
      padding: 8px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
    `;

    debugButton.addEventListener('click', () => this.toggleDebugPanel());
    document.body.appendChild(debugButton);

    // Créer le panneau
    const panel = document.createElement('div');
    panel.id = 'mobile-debug-panel';
    panel.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(15, 23, 42, 0.95);
      color: white;
      z-index: 999998;
      display: none;
      overflow-y: auto;
      font-family: monospace;
      font-size: 12px;
    `;

    document.body.appendChild(panel);
  }

  toggleDebugPanel() {
    const panel = document.getElementById('mobile-debug-panel');
    const button = document.getElementById('mobile-debug-button');
    
    if (panel.style.display === 'none') {
      this.showDebugPanel();
      button.style.background = '#00d2d3';
    } else {
      panel.style.display = 'none';
      button.style.background = '#ff4757';
    }
  }

  showDebugPanel() {
    const panel = document.getElementById('mobile-debug-panel');
    
    const content = `
      <div style="padding: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #00d2d3;">🐛 MOBILE DEBUG PANEL</h2>
          <button onclick="document.getElementById('mobile-debug-panel').style.display='none'; document.getElementById('mobile-debug-button').style.background='#ff4757'" style="background: #ff4757; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">✖</button>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #ffd93d; margin-bottom: 10px;">📊 INFOS APPAREIL</h3>
          <pre style="background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px; overflow-x: auto; white-space: pre-wrap;">${JSON.stringify(this.logDeviceInfo(), null, 2)}</pre>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #6bcf7f; margin-bottom: 10px;">✅ LOGS (${this.logs.length})</h3>
          <div style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px;">
            ${this.logs.slice(-20).map(log => `<div style="margin-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">[${log.time.toLocaleTimeString()}] ${JSON.stringify(log.data)}</div>`).join('')}
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #ff6b6b; margin-bottom: 10px;">❌ ERREURS (${this.errors.length})</h3>
          <div style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px;">
            ${this.errors.slice(-10).map(error => `<div style="margin-bottom: 10px; padding: 10px; background: rgba(255,0,0,0.2); border-radius: 5px;">[${error.time.toLocaleTimeString()}] ${error.type || 'error'}: ${error.message || JSON.stringify(error)}</div>`).join('')}
          </div>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #ffd93d; margin-bottom: 10px;">⚠️ WARNINGS (${this.warnings.length})</h3>
          <div style="max-height: 200px; overflow-y: auto; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px;">
            ${this.warnings.slice(-10).map(warning => `<div style="margin-bottom: 5px; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 5px;">[${warning.time.toLocaleTimeString()}] ${JSON.stringify(warning.data)}</div>`).join('')}
          </div>
        </div>
        
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button onclick="window.location.reload()" style="background: #00d2d3; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">🔄 RECHARGER</button>
          <button onclick="localStorage.clear(); window.location.reload()" style="background: #ff6b6b; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">🗑️ VIDER CACHE</button>
          <button onclick="navigator.clipboard.writeText(JSON.stringify({logs: this.logs, errors: this.errors, warnings: this.warnings}, null, 2))" style="background: #6bcf7f; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">📋 COPIER LOGS</button>
        </div>
      </div>
    `;
    
    panel.innerHTML = content;
    panel.style.display = 'block';
  }

  updateDebugPanel() {
    const panel = document.getElementById('mobile-debug-panel');
    if (panel && panel.style.display !== 'none') {
      this.showDebugPanel();
    }
  }
}

// 🚀 Initialiser le debugger
if (typeof window !== 'undefined') {
  window.mobileDebugger = new MobileDebugger();
  console.log('🐛 Mobile Debugger initialisé!');
}
