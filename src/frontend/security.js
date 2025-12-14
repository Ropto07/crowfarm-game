// Sistema de seguridad - Crow Farmer

const SecuritySystem = {
    config: {
        maxRequestsPerMinute: 60,
        maxActionsPerSecond: 10,
        cooldownCheatDetection: 5000,
        validationEnabled: true,
        logLevel: 'warn' // 'debug', 'info', 'warn', 'error'
    },
    
    stats: {
        requests: 0,
        lastRequest: null,
        suspiciousActions: 0,
        blockedUsers: [],
        requestHistory: []
    },
    
    // Inicializar
    init: function() {
        this.loadStats();
        this.setupInterceptors();
        this.startMonitoring();
        
        console.log('🔒 Sistema de seguridad inicializado');
        this.log('info', 'Security system started');
    },
    
    // Cargar estadísticas
    loadStats: function() {
        const saved = localStorage.getItem('crowFarmer_security');
        if (saved) {
            this.stats = { ...this.stats, ...JSON.parse(saved) };
        }
    },
    
    // Guardar estadísticas
    saveStats: function() {
        localStorage.setItem('crowFarmer_security', JSON.stringify(this.stats));
    },
    
    // Configurar interceptores
    setupInterceptors: function() {
        // Interceptar fetch
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
            const startTime = Date.now();
            
            // Validar antes de enviar
            if (!this.validateRequest(args)) {
                throw new Error('Request blocked by security system');
            }
            
            try {
                const response = await originalFetch(...args);
                const endTime = Date.now();
                
                this.logRequest({
                    url: args[0],
                    method: args[1]?.method || 'GET',
                    status: response.status,
                    duration: endTime - startTime,
                    timestamp: new Date().toISOString()
                });
                
                return response;
            } catch (error) {
                this.log('error', `Fetch error: ${error.message}`);
                throw error;
            }
        };
        
        // Interceptar WebSocket si existe
        if (window.WebSocket) {
            const originalWebSocket = window.WebSocket;
            window.WebSocket = function(...args) {
                const ws = new originalWebSocket(...args);
                SecuritySystem.monitorWebSocket(ws);
                return ws;
            };
        }
        
        // Proteger localStorage
        this.protectLocalStorage();
        
        // Detectar herramientas de desarrollo
        this.detectDevTools();
    },
    
    // Validar petición
    validateRequest: function(fetchArgs) {
        if (!this.config.validationEnabled) return true;
        
        const url = fetchArgs[0];
        const options = fetchArgs[1] || {};
        
        // 1. Rate limiting
        if (!this.checkRateLimit()) {
            this.log('warn', 'Rate limit exceeded');
            return false;
        }
        
        // 2. Validar URL
        if (!this.validateURL(url)) {
            this.log('warn', `Invalid URL: ${url}`);
            return false;
        }
        
        // 3. Validar método HTTP
        if (!this.validateMethod(options.method)) {
            this.log('warn', `Invalid method: ${options.method}`);
            return false;
        }
        
        // 4. Validar datos enviados
        if (options.body) {
            if (!this.validateBody(options.body)) {
                this.log('warn', 'Invalid request body');
                return false;
            }
        }
        
        // 5. Verificar cooldown
        const now = Date.now();
        if (this.stats.lastRequest && (now - this.stats.lastRequest) < 100) {
            this.log('warn', 'Request too fast - possible bot');
            this.stats.suspiciousActions++;
            return false;
        }
        
        this.stats.lastRequest = now;
        this.stats.requests++;
        
        return true;
    },
    
    // Rate limiting
    checkRateLimit: function() {
        const now = Date.now();
        const minuteAgo = now - 60000;
        
        // Limpiar historial viejo
        this.stats.requestHistory = this.stats.requestHistory.filter(
            req => req.timestamp > minuteAgo
        );
        
        // Verificar límite
        if (this.stats.requestHistory.length >= this.config.maxRequestsPerMinute) {
            this.log('error', 'Rate limit exceeded');
            return false;
        }
        
        // Añadir a historial
        this.stats.requestHistory.push({
            timestamp: now,
            type: 'request'
        });
        
        return true;
    },
    
    // Validar URL
    validateURL: function(url) {
        if (typeof url !== 'string') return false;
        
        // Solo permitir URLs del juego
        const allowedDomains = [
            'localhost:3000',
            'tu-backend.onrender.com',
            'tu-backend.herokuapp.com',
            'supabase.co'
        ];
        
        const urlObj = new URL(url, window.location.origin);
        const hostname = urlObj.hostname;
        
        return allowedDomains.some(domain => hostname.includes(domain));
    },
    
    // Validar método HTTP
    validateMethod: function(method) {
        const allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'];
        return !method || allowedMethods.includes(method.toUpperCase());
    },
    
    // Validar cuerpo de petición
    validateBody: function(body) {
        try {
            // Si es string, verificar que sea JSON válido
            if (typeof body === 'string') {
                const parsed = JSON.parse(body);
                return this.validateJSON(parsed);
            }
            
            // Si es FormData, verificar tamaño
            if (body instanceof FormData) {
                return this.validateFormData(body);
            }
            
            return true;
        } catch (error) {
            return false;
        }
    },
    
    // Validar JSON
    validateJSON: function(data) {
        // Limitar tamaño máximo
        const jsonString = JSON.stringify(data);
        if (jsonString.length > 10000) { // 10KB máximo
            this.log('warn', 'JSON too large');
            return false;
        }
        
        // Verificar estructura básica
        if (data.userId && typeof data.userId !== 'string') {
            return false;
        }
        
        // Prevenir inyección
        const stringFields = ['userId', 'username', 'action'];
        for (const field of stringFields) {
            if (data[field] && typeof data[field] === 'string') {
                if (this.containsMaliciousCode(data[field])) {
                    this.log('error', `Malicious code detected in field: ${field}`);
                    return false;
                }
            }
        }
        
        return true;
    },
    
    // Validar FormData
    validateFormData: function(formData) {
        let totalSize = 0;
        
        for (const [key, value] of formData.entries()) {
            if (value instanceof File) {
                // Limitar tamaño de archivos
                if (value.size > 5 * 1024 * 1024) { // 5MB máximo
                    return false;
                }
                totalSize += value.size;
            } else if (typeof value === 'string') {
                totalSize += value.length;
                
                // Verificar inyección
                if (this.containsMaliciousCode(value)) {
                    return false;
                }
            }
            
            // Limitar tamaño total
            if (totalSize > 10 * 1024 * 1024) { // 10MB máximo
                return false;
            }
        }
        
        return true;
    },
    
    // Detectar código malicioso
    containsMaliciousCode: function(text) {
        if (typeof text !== 'string') return false;
        
        const patterns = [
            /<script\b[^>]*>/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /eval\s*\(/i,
            /document\./i,
            /window\./i,
            /alert\s*\(/i,
            /fromCharCode/i,
            /\\x[0-9a-f]{2}/i,
            /\\u[0-9a-f]{4}/i
        ];
        
        return patterns.some(pattern => pattern.test(text));
    },
    
    // Monitorear WebSocket
    monitorWebSocket: function(websocket) {
        const originalSend = websocket.send;
        const originalClose = websocket.close;
        
        websocket.send = function(data) {
            if (!SecuritySystem.validateWebSocketData(data)) {
                SecuritySystem.log('error', 'Invalid WebSocket data blocked');
                return;
            }
            
            originalSend.call(this, data);
            SecuritySystem.log('info', 'WebSocket message sent');
        };
        
        websocket.close = function(...args) {
            SecuritySystem.log('info', 'WebSocket closed');
            originalClose.call(this, ...args);
        };
        
        websocket.addEventListener('message', (event) => {
            SecuritySystem.validateWebSocketMessage(event.data);
        });
    },
    
    // Validar datos WebSocket
    validateWebSocketData: function(data) {
        try {
            const parsed = JSON.parse(data);
            
            // Limitar tamaño
            if (JSON.stringify(parsed).length > 5000) {
                return false;
            }
            
            // Validar estructura
            if (parsed.type && typeof parsed.type !== 'string') {
                return false;
            }
            
            return !this.containsMaliciousCode(data);
        } catch (error) {
            return false;
        }
    },
    
    // Proteger localStorage
    protectLocalStorage: function() {
        const originalSetItem = localStorage.setItem;
        const originalGetItem = localStorage.getItem;
        const originalRemoveItem = localStorage.removeItem;
        
        // Interceptar setItem
        localStorage.setItem = function(key, value) {
            if (key.startsWith('crowFarmer_')) {
                // Validar datos antes de guardar
                if (!SecuritySystem.validateLocalStorageData(key, value)) {
                    SecuritySystem.log('error', `Invalid localStorage data for key: ${key}`);
                    return;
                }
            }
            
            originalSetItem.call(this, key, value);
        };
        
        // Interceptar getItem
        localStorage.getItem = function(key) {
            const value = originalGetItem.call(this, key);
            
            // Verificar integridad
            if (key.startsWith('crowFarmer_')) {
                if (!SecuritySystem.verifyLocalStorageData(key, value)) {
                    SecuritySystem.log('warn', `Tampered localStorage data: ${key}`);
                    SecuritySystem.handleTampering(key);
                    return null;
                }
            }
            
            return value;
        };
    },
    
    // Validar datos localStorage
    validateLocalStorageData: function(key, value) {
        try {
            const parsed = JSON.parse(value);
            
            // Verificar estructura según la key
            switch (key) {
                case 'crowFarmer_user':
                    return this.validateUserData(parsed);
                case 'crowFarmer_settings':
                    return this.validateSettingsData(parsed);
                case 'crowFarmer_crows':
                    return this.validateCrowsData(parsed);
                default:
                    return true;
            }
        } catch (error) {
            return false;
        }
    },
    
    // Verificar integridad de datos
    verifyLocalStorageData: function(key, value) {
        if (!value) return true;
        
        try {
            const data = JSON.parse(value);
            
            // Añadir checksum simple
            if (data._checksum) {
                const checksum = data._checksum;
                delete data._checksum;
                
                const calculated = this.calculateChecksum(JSON.stringify(data));
                if (checksum !== calculated) {
                    return false;
                }
            }
            
            return true;
        } catch (error) {
            return false;
        }
    },
    
    // Calcular checksum
    calculateChecksum: function(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(16);
    },
    
    // Detectar DevTools
    detectDevTools: function() {
        // Detectar consola abierta
        const element = new Image();
        Object.defineProperty(element, 'id', {
            get: () => {
                this.log('warn', 'Console was opened');
                this.stats.suspiciousActions++;
            }
        });
        
        console.log('%c', element);
        
        // Detectar debugger
        const debuggerCheck = () => {
            const startTime = Date.now();
            debugger;
            const endTime = Date.now();
            
            if (endTime - startTime > 100) {
                this.log('warn', 'Debugger detected');
                this.stats.suspiciousActions++;
            }
        };
        
        // Ejecutar periódicamente
        setInterval(debuggerCheck, 10000);
    },
    
    // Monitoreo continuo
    startMonitoring: function() {
        setInterval(() => {
            this.monitorGameState();
            this.detectCheats();
            this.saveStats();
        }, 30000); // Cada 30 segundos
    },
    
    // Monitorear estado del juego
    monitorGameState: function() {
        const user = GameState.user;
        
        // Verificar valores imposibles
        if (user.coins > 999999999 || user.coins < 0) {
            this.log('error', `Suspicious coin amount: ${user.coins}`);
            this.handleSuspiciousActivity('coin_manipulation');
        }
        
        if (user.tickets > 999999 || user.tickets < 0) {
            this.log('error', `Suspicious ticket amount: ${user.tickets}`);
            this.handleSuspiciousActivity('ticket_manipulation');
        }
        
        if (user.level > 100 || user.level < 1) {
            this.log('error', `Suspicious level: ${user.level}`);
            this.handleSuspiciousActivity('level_manipulation');
        }
        
        // Verificar velocidad de acciones
        const actionsPerMinute = this.calculateActionsPerMinute();
        if (actionsPerMinute > 100) {
            this.log('warn', `High action rate: ${actionsPerMinute}/minute`);
            this.handleSuspiciousActivity('bot_detected');
        }
    },
    
    // Detectar trampas
    detectCheats: function() {
        // Detectar tiempo alterado
        const realTime = Date.now();
        const gameTime = GameState.lastActionTime || realTime;
        
        if (Math.abs(realTime - gameTime) > 60000) { // 1 minuto de diferencia
            this.log('error', 'System time manipulation detected');
            this.handleSuspiciousActivity('time_manipulation');
        }
        
        // Detectar velocidad de juego
        const gameSpeed = this.calculateGameSpeed();
        if (gameSpeed > 2) { // 2x velocidad normal
            this.log('error', 'Game speed hack detected');
            this.handleSuspiciousActivity('speed_hack');
        }
        
        // Verificar memoria
        this.checkMemoryTampering();
    },
    
    // Calcular velocidad de juego
    calculateGameSpeed: function() {
        // Implementar según tu juego
        return 1;
    },
    
    // Verificar manipulación de memoria
    checkMemoryTampering: function() {
        // Verificar que GameState no haya sido modificado directamente
        if (GameState.__isTampered) {
            this.log('error', 'GameState tampering detected');
            this.handleSuspiciousActivity('memory_tampering');
        }
        
        // Proteger GameState
        Object.freeze(GameState.user);
        Object.seal(GameState.farm);
    },
    
    // Manejar actividad sospechosa
    handleSuspiciousActivity: function(type) {
        this.stats.suspiciousActions++;
        
        switch (type) {
            case 'coin_manipulation':
            case 'ticket_manipulation':
                this.correctResources();
                break;
                
            case 'bot_detected':
            case 'speed_hack':
                this.applyCooldown(30000); // 30 segundos
                break;
                
            case 'time_manipulation':
            case 'memory_tampering':
                this.blockUserTemporarily();
                break;
        }
        
        this.log('error', `Suspicious activity: ${type}`);
        
        // Reportar al servidor
        this.reportToServer(type);
    },
    
    // Corregir recursos
    correctResources: function() {
        const user = GameState.user;
        
        // Limitar valores
        user.coins = Math.max(0, Math.min(user.coins, 999999999));
        user.tickets = Math.max(0, Math.min(user.tickets, 999999));
        user.level = Math.max(1, Math.min(user.level, 100));
        
        this.log('info', 'Resources corrected due to manipulation');
    },
    
    // Aplicar cooldown
    applyCooldown: function(ms) {
        this.config.cooldownCheatDetection = ms;
        
        setTimeout(() => {
            this.config.cooldownCheatDetection = 5000;
        }, ms);
        
        showNotification('⚠️ Actividad sospechosa detectada. Cooldown aplicado.', 'warning');
    },
    
    // Bloquear usuario temporalmente
    blockUserTemporarily: function() {
        this.stats.blockedUsers.push({
            userId: GameState.user.id,
            timestamp: Date.now(),
            reason: 'cheating'
        });
        
        localStorage.setItem('crowFarmer_blocked', 'true');
        
        setTimeout(() => {
            localStorage.removeItem('crowFarmer_blocked');
        }, 3600000); // 1 hora
        
        showNotification('🚫 Cuenta bloqueada temporalmente por actividad sospechosa', 'error');
    },
    
    // Reportar al servidor
    reportToServer: async function(type) {
        try {
            await fetch(`${CONFIG.API_BASE_URL}/security/report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Security-Token': this.generateSecurityToken()
                },
                body: JSON.stringify({
                    userId: GameState.user.id,
                    type: type,
                    timestamp: new Date().toISOString(),
                    details: this.stats
                })
            });
        } catch (error) {
            this.log('error', `Failed to report to server: ${error.message}`);
        }
    },
    
    // Generar token de seguridad
    generateSecurityToken: function() {
        const timestamp = Date.now();
        const data = `${GameState.user.id}_${timestamp}_${CONFIG.VERSION}`;
        return btoa(data);
    },
    
    // Loggear eventos
      log: function(level, message) {
        if (!this.shouldLog(level)) return;
        
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        
        switch (level) {
            case 'error':
                console.error(`🔴 ${logEntry}`);
                break;
            case 'warn':
                console.warn(`🟡 ${logEntry}`);
                break;
            case 'info':
                console.info(`🔵 ${logEntry}`);
                break;
            case 'debug':
                console.debug(`🟣 ${logEntry}`);
                break;
        }
        
        // Guardar en historial
        this.stats.requestHistory.push({
            timestamp: Date.now(),
            type: 'log',
            level: level,
            message: message
        });
    },
    
    // Determinar si debe loggear
    shouldLog: function(level) {
        const levels = {
            debug: 0,
            info: 1,
            warn: 2,
            error: 3
        };
        
        return levels[level] >= levels[this.config.logLevel];
    },
    
    // Loggear petición
    logRequest: function(request) {
        this.log('debug', `Request: ${request.method} ${request.url} - ${request.status} (${request.duration}ms)`);
    },
    
    // Calcular acciones por minuto
    calculateActionsPerMinute: function() {
        const minuteAgo = Date.now() - 60000;
        const recentActions = this.stats.requestHistory.filter(
            req => req.timestamp > minuteAgo && req.type === 'request'
        );
        return recentActions.length;
    },
    
    // Validar datos de usuario
    validateUserData: function(data) {
        return data && 
               typeof data.coins === 'number' &&
               typeof data.tickets === 'number' &&
               typeof data.level === 'number' &&
               data.coins >= 0 &&
               data.tickets >= 0 &&
               data.level >= 1;
    },
    
    // Validar datos de configuraciones
    validateSettingsData: function(data) {
        return data && 
               typeof data.sound === 'boolean' &&
               typeof data.music === 'boolean' &&
               typeof data.volume === 'number' &&
               data.volume >= 0 && data.volume <= 1;
    },
    
    // Validar datos de cuervos
    validateCrowsData: function(data) {
        if (!Array.isArray(data)) return false;
        
        for (const crow of data) {
            if (!crow.id || !crow.name || !crow.rarity) {
                return false;
            }
        }
        
        return true;
    }
};

// Inicializar cuando esté listo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => SecuritySystem.init(), 2000);
});

// Hacer disponible globalmente
window.SecuritySystem = SecuritySystem
