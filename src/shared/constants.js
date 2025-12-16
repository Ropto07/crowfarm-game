// Constantes compartidas entre frontend y backend

module.exports = {
    // Configuración del juego
    GAME_CONFIG: {
        NAME: 'Crow Farmer',
        VERSION: '1.0.0',
        MAX_LEVEL: 100,
        ENERGY_REFRESH_HOURS: 24
    },
    
    // Economía
    ECONOMY: {
        STARTING_COINS: 3000,
        STARTING_TICKETS: 100,
        STARTING_ENERGY: 1500,
        MAX_ENERGY: 2000,
        EGG_COST: 500,
        
        // Recompensas por nivel
        LEVEL_REWARDS: {
            1: { coins: 0, tickets: 0 },
            2: { coins: 100, tickets: 10 },
            3: { coins: 250, tickets: 25 },
            4: { coins: 500, tickets: 50 },
            5: { coins: 1000, tickets: 100 },
            10: { coins: 5000, tickets: 500 }
        },
        
        // XP requerido por nivel
        XP_PER_LEVEL: 1000,
        
        // Multiplicador de XP
        XP_MULTIPLIER: 1.5
    },
    
    // Cultivos
    CROPS: {
        TRIGO: {
            id: 'trigo',
            name: 'Trigo',
            cost: 5,
            growTime: 10, // segundos
            reward: 10,
            ticketChance: 0.20,
            xp: 5,
            emoji: '🌾'
        },
        MAIZ: {
            id: 'maiz',
            name: 'Maíz',
            cost: 25,
            growTime: 30,
            reward: 50,
            ticketChance: 0.25,
            xp: 10,
            emoji: '🌽'
        },
        CALABAZA: {
            id: 'calabaza',
            name: 'Calabaza',
            cost: 100,
            growTime: 60,
            reward: 200,
            ticketChance: 0.30,
            xp: 20,
            emoji: '🎃'
        },
        HONGO: {
            id: 'hongo',
            name: 'Hongo Mágico',
            cost: 500,
            growTime: 120,
            reward: 1000,
            ticketChance: 0.40,
            xp: 50,
            emoji: '🍄'
        }
    },
    
    // Huevos y cuervos
    EGGS: {
        COST: 500,
        RARITIES: {
            COMMON: {
                name: 'Común',
                chance: 0.70,
                color: '#A0AEC0',
                emoji: '🐦',
                statRange: { min: 1, max: 4 }
            },
            RARE: {
                name: 'Raro',
                chance: 0.20,
                color: '#4299E1',
                emoji: '🐦‍⬛',
                statRange: { min: 3, max: 6 }
            },
            EPIC: {
                name: 'Épico',
                chance: 0.07,
                color: '#9F7AEA',
                emoji: '🦅',
                statRange: { min: 5, max: 8 }
            },
            LEGENDARY: {
                name: 'Legendario',
                chance: 0.03,
                color: '#F6AD55',
                emoji: '🐦‍🔥',
                statRange: { min: 7, max: 10 }
            }
        }
    },
    
    // Nombres de cuervos por rareza
    CROW_NAMES: {
        COMMON: [
            'Gris', 'Negro', 'Marrón', 'Pardo', 'Cenizo', 
            'Pizarra', 'Carbón', 'Noche', 'Sombra', 'Cuervo'
        ],
        RARE: [
            'Azulado', 'Rojo', 'Verde', 'Plateado', 'Bronce',
            'Cobre', 'Esmeralda', 'Zafiro', 'Rubí', 'Ámbar'
        ],
        EPIC: [
            'Dorado', 'Púrpura', 'Cristal', 'Fantasma', 'Lunar',
            'Solar', 'Estelar', 'Galáctico', 'Cósmico', 'Real'
        ],
        LEGENDARY: [
            'Fénix', 'Dragón', 'Trueno', 'Élite', 'Místico',
            'Divino', 'Inmortal', 'Legendario', 'Épico', 'Supremo'
        ]
    },
    
    // Sufijos para nombres de cuervos
    CROW_SUFFIXES: [
        'Nocturno', 'Veloz', 'Sagaz', 'Místico', 'Real',
        'Astuto', 'Sabio', 'Feroz', 'Noble', 'Valiente',
        'Audaz', 'Poderoso', 'Glorioso', 'Magnífico', 'Soberbio'
    ],
    
    // Anuncios
    ADS: {
        DAILY_LIMIT: 10,
        REWARD_PER_AD: 10,
        COOLDOWN_SECONDS: 30,
        TYPES: {
            BANNER: 'banner',
            INTERSTITIAL: 'interstitial',
            REWARDED: 'rewarded'
        }
    },
    
    // Tienda
    SHOP: {
        TICKET_PACKAGES: [
            { id: 'basic', name: 'Básico', tickets: 600, price: 0.99 },
            { id: 'farmer', name: 'Granjero', tickets: 1800, price: 2.99 },
            { id: 'premium', name: 'Premium', tickets: 4000, price: 5.99 },
            { id: 'ultimate', name: 'Ultimate', tickets: 10000, price: 12.99 }
        ],
        
        UPGRADES: {
            EXTRA_PLOT: {
                id: 'extra_plot',
                name: 'Parcela Extra',
                description: 'Desbloquea una parcela adicional',
                cost: 1000,
                currency: 'coins',
                maxLevel: 3
            },
            FASTER_GROWTH: {
                id: 'faster_growth',
                name: 'Crecimiento Rápido',
                description: 'Los cultivos crecen 10% más rápido',
                cost: 500,
                currency: 'tickets',
                maxLevel: 5
            },
            LUCKY_CHARM: {
                id: 'lucky_charm',
                name: 'Amuleto de Suerte',
                description: 'Aumenta probabilidad de tickets en 5%',
                cost: 800,
                currency: 'tickets',
                maxLevel: 4
            },
            ENERGY_BOOST: {
                id: 'energy_boost',
                name: 'Energía Extra',
                description: '+200 energía máxima diaria',
                cost: 1500,
                currency: 'coins',
                maxLevel: 2
            }
        }
    },
    
    // Base de datos
    DATABASE: {
        TABLES: {
            USERS: 'users',
            CROPS: 'crops',
            USER_CROWS: 'user_crows',
            EGG_HATCHES: 'egg_hatches',
            ADS_WATCHED: 'ads_watched',
            REAL_PAYMENTS: 'real_payments',
            MARKETPLACE_LISTINGS: 'marketplace_listings',
            BATTLES: 'battles',
            USER_ACHIEVEMENTS: 'user_achievements'
        }
    },
    
    // Errores
    ERRORS: {
        INVALID_USER: 'Usuario no válido',
        INSUFFICIENT_FUNDS: 'Fondos insuficientes',
        INSUFFICIENT_ENERGY: 'Energía insuficiente',
        DAILY_LIMIT_REACHED: 'Límite diario alcanzado',
        COOLDOWN_ACTIVE: 'Enfriamiento activo',
        NOT_FOUND: 'Recurso no encontrado',
        DATABASE_ERROR: 'Error de base de datos'
    },
    
    // Mensajes de éxito
    SUCCESS: {
        CROP_PLANTED: 'Cultivo plantado exitosamente',
        CROP_HARVESTED: 'Cultivo cosechado exitosamente',
        EGG_HATCHED: 'Huevo eclosionado exitosamente',
        AD_WATCHED: 'Anuncio visto exitosamente',
        PURCHASE_COMPLETE: 'Compra completada exitosamente',
        UPGRADE_APPLIED: 'Mejora aplicada exitosamente'
    },
    
    // Colores
    COLORS: {
        PRIMARY: '#4C51BF',
        SECONDARY: '#6B46C1',
        SUCCESS: '#48BB78',
        WARNING: '#ED8936',
        DANGOR: '#F56565',
        INFO: '#4299E1',
        DARK: '#2D3748',
        LIGHT: '#F7FAFC',
        
        // Rarezas
        COMMON: '#A0AEC0',
        RARE: '#4299E1',
        EPIC: '#9F7AEA',
        LEGENDARY: '#F6AD55'
    },
    
    // URLs
    URLS: {
        GITHUB: 'https://github.com/tuusuario/crow-farmer-telegram',
        TELEGRAM_CHANNEL: 'https://t.me/CrowFarmerGame',
        TELEGRAM_GROUP: 'https://t.me/CrowFarmerCommunity',
        SUPPORT_EMAIL: 'crowfarmer@example.com'
    },
    
    // Fechas y tiempos
    TIME: {
        SECOND: 1000,
        MINUTE: 60 * 1000,
        HOUR: 60 * 60 * 1000,
        DAY: 24 * 60 * 60 * 1000,
        
        CROP_CHECK_INTERVAL: 1000, // 1 segundo
        ENERGY_CHECK_INTERVAL: 60000, // 1 minuto
        LEADERBOARD_REFRESH: 300000 // 5 minutos
    },
    
    // Validación
    VALIDATION: {
        USERNAME_MIN_LENGTH: 3,
        USERNAME_MAX_LENGTH: 20,
        MIN_COINS: 0,
        MAX_COINS: 999999999,
        MIN_TICKETS: 0,
        MAX_TICKETS: 999999,
        MIN_ENERGY: 0,
        MAX_ENERGY: 5000,
        MIN_LEVEL: 1,
        MAX_LEVEL: 100
    }
};

// Funciones de utilidad
const Utils = {
    // Formatear número
    formatNumber: (num) => {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    },
    
    // Formatear tiempo
    formatTime: (seconds) => {
        if (seconds < 60) {
            return `${seconds}s`;
        } else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return `${minutes}m ${remainingSeconds}s`;
        } else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            return `${hours}h ${minutes}m`;
        }
    },
    
    // Generar ID único
    generateId: () => {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // Calcular XP para nivel
    calculateXPForLevel: (level) => {
        return level * 1000;
    },
    
    // Verificar si está en Telegram
    isTelegram: () => {
        return typeof window !== 'undefined' && window.Telegram && Telegram.WebApp;
    },
    
    // Obtener parámetros de URL
    getUrlParams: () => {
        if (typeof window === 'undefined') return {};
        
        const params = new URLSearchParams(window.location.search);
        const result = {};
        
        for (const [key, value] of params.entries()) {
            result[key] = value;
        }
        
        return result;
    }
};

// Exportar todo
module.exports.Utils = Utils;
