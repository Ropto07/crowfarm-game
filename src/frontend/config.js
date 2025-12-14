
// Configuración del juego

const CONFIG = {
    // URLs de API
    API_BASE_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000/api'
        : 'https://tu-backend.onrender.com/api',
    
    // Telegram
    TELEGRAM_BOT_NAME: 'CrowFarmerBot',
    TELEGRAM_CHANNEL: '@CrowFarmerGame',
    
    // Juego
    GAME_NAME: 'Crow Farmer',
    VERSION: '1.0.0',
    DEVELOPER: 'TuNombre',
    
    // Economía
    STARTING_COINS: 3000,
    STARTING_TICKETS: 100,
    STARTING_ENERGY: 1500,
    MAX_ENERGY: 2000,
    
    // Cultivos
    CROPS: {
        trigo: {
            id: 'trigo',
            name: 'Trigo',
            emoji: '🌾',
            cost: 5,
            growTime: 10, // segundos
            reward: 10,
            ticketChance: 0.2,
            xp: 5
        },
        maiz: {
            id: 'maiz',
            name: 'Maíz',
            emoji: '🌽',
            cost: 25,
            growTime: 30,
            reward: 50,
            ticketChance: 0.25,
            xp: 10
        },
        calabaza: {
            id: 'calabaza',
            name: 'Calabaza',
            emoji: '🎃',
            cost: 100,
            growTime: 60,
            reward: 200,
            ticketChance: 0.3,
            xp: 20
        },
        hongo: {
            id: 'hongo',
            name: 'Hongo Mágico',
            emoji: '🍄',
            cost: 500,
            growTime: 120,
            reward: 1000,
            ticketChance: 0.4,
            xp: 50
        }
    },
    
    // Huevos
    EGG_COST: 500,
    EGG_RARITIES: {
        common: { chance: 0.70, name: 'Común', color: '#A0AEC0', emoji: '🐦' },
        rare: { chance: 0.20, name: 'Raro', color: '#4299E1', emoji: '🐦‍⬛' },
        epic: { chance: 0.07, name: 'Épico', color: '#9F7AEA', emoji: '🦅' },
        legendary: { chance: 0.03, name: 'Legendario', color: '#F6AD55', emoji: '🐦‍🔥' }
    },
    
    // Cuervos
    CROW_NAMES: {
        common: ['Gris', 'Negro', 'Marrón', 'Pardo', 'Cenizo'],
        rare: ['Azulado', 'Rojo', 'Verde', 'Plateado', 'Bronce'],
        epic: ['Dorado', 'Púrpura', 'Cristal', 'Fantasma', 'Lunar'],
        legendary: ['Fénix', 'Dragón', 'Trueno', 'Élite', 'Místico']
    },
    
    // Sistema de niveles
    LEVELS: [
        { level: 1, xpRequired: 0, reward: { coins: 0, tickets: 0 } },
        { level: 2, xpRequired: 1000, reward: { coins: 100, tickets: 10 } },
        { level: 3, xpRequired: 2500, reward: { coins: 250, tickets: 25 } },
        { level: 4, xpRequired: 5000, reward: { coins: 500, tickets: 50 } },
        { level: 5, xpRequired: 10000, reward: { coins: 1000, tickets: 100 } },
        { level: 6, xpRequired: 20000, reward: { coins: 2000, tickets: 200 } },
        { level: 7, xpRequired: 40000, reward: { coins: 4000, tickets: 400 } },
        { level: 8, xpRequired: 80000, reward: { coins: 8000, tickets: 800 } },
        { level: 9, xpRequired: 160000, reward: { coins: 16000, tickets: 1600 } },
        { level: 10, xpRequired: 320000, reward: { coins: 32000, tickets: 3200 } }
    ],
    
    // Anuncios
    ADS: {
        dailyLimit: 10,
        rewardPerAd: 10,
        cooldownSeconds: 30
    },
    
    // Tienda
    SHOP_PACKAGES: [
        { id: 'basic', name: 'Básico', tickets: 600, price: 0.99, emoji: '🎁' },
        { id: 'farmer', name: 'Granjero', tickets: 1800, price: 2.99, emoji: '🎁🎁' },
        { id: 'premium', name: 'Premium', tickets: 4000, price: 5.99, emoji: '🎁🎁🎁' },
        { id: 'ultimate', name: 'Ultimate', tickets: 10000, price: 12.99, emoji: '👑' }
    ],
    
    // Colores del tema
    COLORS: {
        primary: '#4C51BF',
        secondary: '#6B46C1',
        success: '#48BB78',
        warning: '#ED8936',
        danger: '#F56565',
        info: '#4299E1',
        dark: '#2D3748',
        light: '#F7FAFC'
    },
    
    // Sonidos (si los agregas después)
    SOUNDS: {
        enabled: false,
        volume: 0.5,
        files: {
            plant: 'sounds/plant.mp3',
            harvest: 'sounds/harvest.mp3',
            hatch: 'sounds/hatch.mp3',
            click: 'sounds/click.mp3'
        }
    }
};

// Funciones de utilidad de configuración
const ConfigUtils = {
    // Obtener cultivo por ID
    getCrop: (cropId) => CONFIG.CROPS[cropId] || CONFIG.CROPS.trigo,
    
    // Calcular XP para subir de nivel
    getXPForNextLevel: (currentLevel) => {
        const nextLevel = CONFIG.LEVELS.find(l => l.level === currentLevel + 1);
        return nextLevel ? nextLevel.xpRequired : 0;
    },
    
    // Obtener recompensa de nivel
    getLevelReward: (level) => {
        const levelData = CONFIG.LEVELS.find(l => l.level === level);
        return levelData ? levelData.reward : { coins: 0, tickets: 0 };
    },
    
    // Generar nombre de cuervo
    generateCrowName: (rarity) => {
        const prefixes = CONFIG.CROW_NAMES[rarity] || CONFIG.CROW_NAMES.common;
        const suffixes = ['Nocturno', 'Veloz', 'Sagaz', 'Místico', 'Real', 'Astuto'];
        
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        
        return `${prefix} ${suffix}`;
    },
    
    // Formatear tiempo
    formatTime: (seconds) => {
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            return `${Math.floor(seconds / 60)}m`;
        } else {
            return `${Math.floor(seconds / 3600)}h`;
        }
    },
    
    // Formatear número
    formatNumber: (num) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    },
    
    // Verificar si es móvil
    isMobile: () => {
        return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    },
    
    // Verificar si está en Telegram
    isTelegram: () => {
        return window.Telegram && Telegram.WebApp;
    },
    
    // Inicializar Telegram Web App
    initTelegram: () => {
        if (ConfigUtils.isTelegram()) {
            Telegram.WebApp.ready();
            Telegram.WebApp.expand();
            Telegram.WebApp.setHeaderColor(CONFIG.COLORS.primary);
            Telegram.WebApp.setBackgroundColor(CONFIG.COLORS.light);
            
            return Telegram.WebApp.initDataUnsafe.user;
        }
        return null;
    },
    
    // Guardar en localStorage
    saveToStorage: (key, data) => {
        try {
            localStorage.setItem(`crowFarmer_${key}`, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error guardando en localStorage:', error);
            return false;
        }
    },
    
    // Cargar de localStorage
    loadFromStorage: (key, defaultValue = null) => {
        try {
            const data = localStorage.getItem(`crowFarmer_${key}`);
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Error cargando de localStorage:', error);
            return defaultValue;
        }
    },
    
    // Limpiar datos locales (para desarrollo)
    clearStorage: () => {
        const keys = Object.keys(localStorage).filter(key => key.startsWith('crowFarmer_'));
        keys.forEach(key => localStorage.removeItem(key));
        console.log('🧹 Datos locales limpiados');
    }
};

// Hacer disponible globalmente
window.CONFIG = CONFIG;
window.ConfigUtils = ConfigUtils;

// Inicialización automática
(function() {
    console.log(`🎮 ${CONFIG.GAME_NAME} v${CONFIG.VERSION}`);
    console.log('🌍 Entorno:', window.location.hostname);
    console.log('📱 Móvil:', ConfigUtils.isMobile());
    console.log('🤖 Telegram:', ConfigUtils.isTelegram());
    
    // Configurar tema según dispositivo
    if (ConfigUtils.isTelegram()) {
        document.documentElement.style.setProperty('--tg-theme-bg-color', CONFIG.COLORS.light);
    }
})();
