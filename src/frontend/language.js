// Sistema de idiomas - Crow Farmer

const Translations = {
    // Español (default)
    es: {
        // General
        gameName: 'Crow Farmer',
        play: 'Jugar',
        settings: 'Ajustes',
        help: 'Ayuda',
        
        // Recursos
        coins: 'Monedas',
        tickets: 'Tickets',
        energy: 'Energía',
        level: 'Nivel',
        
        // Cultivos
        crops: 'Cultivos',
        plant: 'Plantar',
        harvest: 'Cosechar',
        ready: 'Listo',
        
        // Cuervos
        crows: 'Cuervos',
        common: 'Común',
        rare: 'Raro',
        epic: 'Épico',
        legendary: 'Legendario',
        
        // Huevos
        egg: 'Huevo',
        hatch: 'Eclosionar',
        magicEgg: 'Huevo Mágico',
        
        // Tienda
        shop: 'Tienda',
        buy: 'Comprar',
        watchAd: 'Ver Anuncio',
        dailyLimit: 'Límite diario',
        
        // Mensajes
        welcome: '¡Bienvenido a Crow Farmer!',
        planting: 'Plantando...',
        harvesting: 'Cosechando...',
        hatching: 'Eclosionando...',
        
        // Errores
        noCoins: 'No tienes suficientes monedas',
        noTickets: 'No tienes suficientes tickets',
        noEnergy: 'No tienes energía',
        limitReached: 'Límite alcanzado',
        
        // Éxito
        success: '¡Éxito!',
        cropPlanted: 'Cultivo plantado',
        cropHarvested: 'Cultivo cosechado',
        eggHatched: 'Huevo eclosionado'
    },
    
    // English
    en: {
        // General
        gameName: 'Crow Farmer',
        play: 'Play',
        settings: 'Settings',
        help: 'Help',
        
        // Resources
        coins: 'Coins',
        tickets: 'Tickets',
        energy: 'Energy',
        level: 'Level',
        
        // Crops
        crops: 'Crops',
        plant: 'Plant',
        harvest: 'Harvest',
        ready: 'Ready',
        
        // Crows
        crows: 'Crows',
        common: 'Common',
        rare: 'Rare',
        epic: 'Epic',
        legendary: 'Legendary',
        
        // Eggs
        egg: 'Egg',
        hatch: 'Hatch',
        magicEgg: 'Magic Egg',
        
        // Shop
        shop: 'Shop',
        buy: 'Buy',
        watchAd: 'Watch Ad',
        dailyLimit: 'Daily limit',
        
        // Messages
        welcome: 'Welcome to Crow Farmer!',
        planting: 'Planting...',
        harvesting: 'Harvesting...',
        hatching: 'Hatching...',
        
        // Errors
        noCoins: 'Not enough coins',
        noTickets: 'Not enough tickets',
        noEnergy: 'Not enough energy',
        limitReached: 'Limit reached',
        
        // Success
        success: 'Success!',
        cropPlanted: 'Crop planted',
        cropHarvested: 'Crop harvested',
        eggHatched: 'Egg hatched'
    }
};

// Sistema de idiomas
const LanguageSystem = {
    currentLang: 'es',
    
    // Cambiar idioma
    setLanguage: function(lang) {
        if (Translations[lang]) {
            this.currentLang = lang;
            localStorage.setItem('crowFarmer_language', lang);
            this.updateUI();
            return true;
        }
        return false;
    },
    
    // Obtener traducción
    t: function(key) {
        const lang = Translations[this.currentLang];
        return lang[key] || Translations.es[key] || key;
    },
    
    // Detectar idioma del navegador
    detectLanguage: function() {
        const savedLang = localStorage.getItem('crowFarmer_language');
        if (savedLang) return savedLang;
        
        const browserLang = navigator.language.split('-')[0];
        return ['es', 'en'].includes(browserLang) ? browserLang : 'es';
    },
    
    // Actualizar toda la UI
    updateUI: function() {
        // Actualizar textos dinámicos
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key) {
                element.textContent = this.t(key);
            }
        });
        
        // Actualizar placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            if (key) {
                element.placeholder = this.t(key);
            }
        });
        
        // Actualizar títulos
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            if (key) {
                element.title = this.t(key);
            }
        });
        
        // Actualizar botones de idioma
        document.querySelectorAll('.lang-btn').forEach(btn => {
            const lang = btn.dataset.lang;
            btn.classList.toggle('active', lang === this.currentLang);
        });
    },
    
    // Inicializar
    init: function() {
        this.currentLang = this.detectLanguage();
        this.updateUI();
        
        // Añadir selector de idioma si no existe
        this.addLanguageSelector();
        
        console.log(`🌐 Idioma configurado: ${this.currentLang}`);
    },
    
    // Añadir selector de idioma al UI
    addLanguageSelector: function() {
        // Verificar si ya existe
        if (document.getElementById('language-selector')) return;
        
        const selector = document.createElement('div');
        selector.id = 'language-selector';
        selector.style.cssText = `
            position: fixed;
            bottom: 70px;
            right: 10px;
            background: white;
            border-radius: 20px;
            padding: 5px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            display: flex;
            gap: 5px;
        `;
        
        selector.innerHTML = `
            <button class="lang-btn ${this.currentLang === 'es' ? 'active' : ''}" 
                    data-lang="es" style="
                width: 40px;
                height: 30px;
                border: none;
                border-radius: 15px;
                background: ${this.currentLang === 'es' ? '#4C51BF' : '#E2E8F0'};
                color: ${this.currentLang === 'es' ? 'white' : '#4A5568'};
                font-weight: bold;
                cursor: pointer;
            ">ES</button>
            
            <button class="lang-btn ${this.currentLang === 'en' ? 'active' : ''}" 
                    data-lang="en" style="
                width: 40px;
                height: 30px;
                border: none;
                border-radius: 15px;
                background: ${this.currentLang === 'en' ? '#4C51BF' : '#E2E8F0'};
                color: ${this.currentLang === 'en' ? 'white' : '#4A5568'};
                font-weight: bold;
                cursor: pointer;
            ">EN</button>
        `;
        
        document.body.appendChild(selector);
        
        // Eventos para botones de idioma
        selector.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const lang = e.target.dataset.lang;
                this.setLanguage(lang);
            });
        });
    }
};

// Hacer disponible globalmente
window.LanguageSystem = LanguageSystem;
window.t = (key) => LanguageSystem.t(key);

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    LanguageSystem.init();
});
