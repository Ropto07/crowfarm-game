// Configuración principal del juego
const GameConfig = {
    VERSION: '1.0.0',
    API_URL: 'https://tu-backend.onrender.com/api',
    ENERGY_PER_DAY: 1500,
    EGG_COST: 500,
    CROP_TYPES: {
        trigo: { name: 'Trigo', cost: 5, time: 10, reward: 10, ticketChance: 0.2, emoji: '🌾' },
        maiz: { name: 'Maíz', cost: 25, time: 30, reward: 50, ticketChance: 0.25, emoji: '🌽' },
        calabaza: { name: 'Calabaza', cost: 100, time: 60, reward: 200, ticketChance: 0.3, emoji: '🎃' },
        hongo: { name: 'Hongo Mágico', cost: 500, time: 120, reward: 1000, ticketChance: 0.4, emoji: '🍄' }
    },
    CROW_RARITIES: {
        common: { name: 'Común', color: '#A0AEC0', chance: 0.7 },
        rare: { name: 'Raro', color: '#4299E1', chance: 0.2 },
        epic: { name: 'Épico', color: '#9F7AEA', chance: 0.07 },
        legendary: { name: 'Legendario', color: '#F6AD55', chance: 0.03 }
    }
};

// Estado global del juego
const GameState = {
    user: {
        id: null,
        coins: 3000,
        tickets: 100,
        energy: 1500,
        level: 1,
        xp: 0
    },
    farm: {
        plots: [],
        size: 9
    },
    crows: [],
    eggsHatched: 0,
    adsWatchedToday: 0
};

// Inicializar la aplicación
async function initGame() {
    console.log('🎮 Inicializando Crow Farmer...');
    
    // Configurar Telegram Web App
    if (window.Telegram && Telegram.WebApp) {
        Telegram.WebApp.ready();
        Telegram.WebApp.expand();
        GameState.user.id = Telegram.WebApp.initDataUnsafe.user?.id;
        console.log('🤖 Usuario de Telegram:', GameState.user.id);
    } else {
        // Modo desarrollo sin Telegram
        GameState.user.id = 'dev_' + Date.now();
        console.log('🛠️  Modo desarrollo activado');
    }
    
    // Cargar datos del usuario
    await loadUserData();
    
    // Inicializar secciones
    initNavigation();
    initFarm();
    initEggSection();
    initMarket();
    initCrows();
    
    // Actualizar UI
    updateUI();
    
    // Iniciar loop del juego
    setInterval(gameLoop, 1000);
    
    console.log('✅ Juego inicializado');
}

// Cargar datos del usuario
async function loadUserData() {
    try {
        if (GameState.user.id) {
            const response = await fetch(`${GameConfig.API_URL}/user/${GameState.user.id}`);
            if (response.ok) {
                const data = await response.json();
                GameState.user = { ...GameState.user, ...data };
            }
        }
    } catch (error) {
        console.log('⚠️  No se pudo cargar datos del servidor, usando datos locales');
    }
}

// Actualizar UI
function updateUI() {
    // Actualizar recursos
    document.getElementById('coins').textContent = formatNumber(GameState.user.coins);
    document.getElementById('tickets').textContent = GameState.user.tickets;
    document.getElementById('energy').textContent = `${GameState.user.energy}/${GameConfig.ENERGY_PER_DAY}`;
    document.getElementById('level').textContent = GameState.user.level;
    
    // Actualizar XP bar
    const xpNeeded = GameState.user.level * 1000;
    const xpPercent = (GameState.user.xp / xpNeeded) * 100;
    document.getElementById('xp-fill').style.width = `${Math.min(xpPercent, 100)}%`;
    
    // Actualizar botón de huevo
    const hatchBtn = document.getElementById('hatch-btn');
    hatchBtn.disabled = GameState.user.tickets < GameConfig.EGG_COST;
    
    // Actualizar anuncios
    document.getElementById('available-tickets').textContent = GameState.user.tickets;
    document.getElementById('ads-today').textContent = GameState.adsWatchedToday;
}

// Formatear números
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Navegación
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.game-section');
    
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sectionId = button.dataset.section;
            
            // Actualizar botones activos
            navButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Mostrar sección correspondiente
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === `${sectionId}-section`) {
                    section.classList.add('active');
                }
            });
        });
    });
}

// Loop principal del juego
function gameLoop() {
    // Verificar cultivos listos
    checkReadyCrops();
    
    // Actualizar tiempo del servidor
    updateServerTime();
}

// Actualizar hora del servidor
function updateServerTime() {
    const now = new Date();
    document.getElementById('server-time').textContent = 
        `🕐 ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
}

// Mostrar notificación
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#48BB78' : type === 'error' ? '#F56565' : '#4299E1'};
        color: white;
        padding: 15px;
        border-radius: 8px;
        z-index: 1002;
        animation: slideIn 0.3s;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Animaciones CSS para notificaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initGame);

// Exportar para otros módulos
window.GameState = GameState;
window.GameConfig = GameConfig;
window.showNotification = showNotification;
