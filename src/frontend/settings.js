// Sistema de configuraciones - Crow Farmer

const SettingsSystem = {
    config: {
        sound: true,
        music: true,
        volume: 0.7,
        notifications: true,
        vibration: true,
        autoHarvest: false,
        language: 'auto'
    },
    
    // Inicializar
    init: function() {
        this.loadSettings();
        this.createSettingsModal();
        this.bindEvents();
        
        console.log('⚙️ Sistema de configuraciones inicializado');
    },
    
    // Cargar configuraciones guardadas
    loadSettings: function() {
        const saved = localStorage.getItem('crowFarmer_settings');
        if (saved) {
            this.config = { ...this.config, ...JSON.parse(saved) };
        }
        
        // Aplicar configuraciones
        this.applySettings();
    },
    
    // Guardar configuraciones
    saveSettings: function() {
        localStorage.setItem('crowFarmer_settings', JSON.stringify(this.config));
        this.applySettings();
        showNotification('✅ Configuraciones guardadas', 'success');
    },
    
    // Aplicar configuraciones al juego
    applySettings: function() {
        // Sonido
        if (window.AudioContext) {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            if (!this.config.sound) {
                audioContext.suspend();
            }
        }
        
        // Notificaciones
        if (this.config.notifications && 'Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
        
        // Idioma automático
        if (this.config.language === 'auto' && window.LanguageSystem) {
            const browserLang = navigator.language.split('-')[0];
            LanguageSystem.setLanguage(['es', 'en'].includes(browserLang) ? browserLang : 'es');
        }
    },
    
    // Crear modal de configuraciones
    createSettingsModal: function() {
        const modalHTML = `
        <div id="settings-modal" class="modal">
            <div class="modal-header">
                <h3 data-i18n="settings">⚙️ Configuraciones</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="settings-section">
                    <h4 data-i18n="audio">🎵 Audio</h4>
                    
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-name" data-i18n="soundEffects">Efectos de sonido</span>
                            <span class="setting-desc" data-i18n="soundEffectsDesc">Sonidos al plantar, cosechar, etc.</span>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="sound-toggle" ${this.config.sound ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-name" data-i18n="backgroundMusic">Música de fondo</span>
                            <span class="setting-desc" data-i18n="musicDesc">Música ambiental del juego</span>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="music-toggle" ${this.config.music ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-name" data-i18n="volume">Volumen</span>
                            <span class="setting-desc" data-i18n="volumeDesc">Nivel general de volumen</span>
                        </div>
                        <input type="range" id="volume-slider" min="0" max="100" value="${this.config.volume * 100}" class="volume-slider">
                        <span id="volume-value" class="volume-value">${Math.round(this.config.volume * 100)}%</span>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h4 data-i18n="notifications">🔔 Notificaciones</h4>
                    
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-name" data-i18n="pushNotifications">Notificaciones push</span>
                            <span class="setting-desc" data-i18n="pushDesc">Avisos cuando cultivos están listos</span>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="notifications-toggle" ${this.config.notifications ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-name" data-i18n="vibration">Vibración</span>
                            <span class="setting-desc" data-i18n="vibrationDesc">Vibración en acciones importantes</span>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="vibration-toggle" ${this.config.vibration ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h4 data-i18n="gameplay">🎮 Gameplay</h4>
                    
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-name" data-i18n="autoHarvest">Cosecha automática</span>
                            <span class="setting-desc" data-i18n="autoHarvestDesc">Cosecha cultivos automáticamente cuando están listos</span>
                        </div>
                        <label class="switch">
                            <input type="checkbox" id="auto-harvest-toggle" ${this.config.autoHarvest ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </div>
                    
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-name" data-i18n="language">Idioma</span>
                            <span class="setting-desc" data-i18n="languageDesc">Idioma del juego</span>
                        </div>
                        <select id="language-select" class="language-select">
                            <option value="auto" ${this.config.language === 'auto' ? 'selected' : ''} data-i18n="auto">Auto (Sistema)</option>
                            <option value="es" ${this.config.language === 'es' ? 'selected' : ''}>Español</option>
                            <option value="en" ${this.config.language === 'en' ? 'selected' : ''}>English</option>
                        </select>
                    </div>
                </div>
                
                <div class="settings-section">
                    <h4 data-i18n="account">👤 Cuenta</h4>
                    
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-name" data-i18n="playerId">ID de Jugador</span>
                            <span class="setting-desc">${GameState.user.id || 'No identificado'}</span>
                        </div>
                        <button id="copy-id-btn" class="copy-btn" data-i18n="copy">Copiar</button>
                    </div>
                    
                    <div class="setting-item">
                        <div class="setting-info">
                            <span class="setting-name" data-i18n="gameVersion">Versión del Juego</span>
                            <span class="setting-desc">v${CONFIG.VERSION || '1.0.0'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="settings-actions">
                    <button id="save-settings-btn" class="save-btn" data-i18n="saveSettings">Guardar Configuraciones</button>
                    <button id="reset-settings-btn" class="reset-btn" data-i18n="resetSettings">Restablecer</button>
                    <button id="close-settings-btn" class="close-btn" data-i18n="close">Cerrar</button>
                </div>
            </div>
        </div>
        `;
        
        // Añadir al body si no existe
        if (!document.getElementById('settings-modal')) {
            const modalContainer = document.createElement('div');
            modalContainer.innerHTML = modalHTML;
            document.body.appendChild(modalContainer.firstElementChild);
        }
        
        // Actualizar textos con idioma
        if (window.LanguageSystem) {
            LanguageSystem.updateUI();
        }
    },
    
    // Vincular eventos
    bindEvents: function() {
        // Botón guardar
        document.getElementById('save-settings-btn')?.addEventListener('click', () => {
            this.updateFromUI();
            this.saveSettings();
        });
        
        // Botón reset
        document.getElementById('reset-settings-btn')?.addEventListener('click', () => {
            if (confirm(this.getTranslation('resetConfirm'))) {
                this.resetSettings();
            }
        });
        
        // Botón cerrar
        document.getElementById('close-settings-btn')?.addEventListener('click', () => {
            this.hideSettings();
        });
        
        // Cerrar modal
        document.querySelector('#settings-modal .modal-close')?.addEventListener('click', () => {
            this.hideSettings();
        });
        
        // Copiar ID
        document.getElementById('copy-id-btn')?.addEventListener('click', () => {
            this.copyPlayerId();
        });
        
        // Cambios en tiempo real
        document.getElementById('volume-slider')?.addEventListener('input', (e) => {
            document.getElementById('volume-value').textContent = e.target.value + '%';
        });
    },
    
    // Actualizar desde UI
    updateFromUI: function() {
        this.config.sound = document.getElementById('sound-toggle')?.checked || false;
        this.config.music = document.getElementById('music-toggle')?.checked || false;
        this.config.volume = (document.getElementById('volume-slider')?.value || 70) / 100;
        this.config.notifications = document.getElementById('notifications-toggle')?.checked || false;
        this.config.vibration = document.getElementById('vibration-toggle')?.checked || false;
        this.config.autoHarvest = document.getElementById('auto-harvest-toggle')?.checked || false;
        this.config.language = document.getElementById('language-select')?.value || 'auto';
    },
    
    // Restablecer configuraciones
    resetSettings: function() {
        this.config = {
            sound: true,
            music: true,
            volume: 0.7,
            notifications: true,
            vibration: true,
            autoHarvest: false,
            language: 'auto'
        };
        
        this.saveSettings();
        this.updateUI();
    },
    
    // Actualizar UI con valores actuales
    updateUI: function() {
        const modal = document.getElementById('settings-modal');
        if (!modal) return;
        
        // Actualizar toggles
        document.getElementById('sound-toggle').checked = this.config.sound;
        document.getElementById('music-toggle').checked = this.config.music;
        document.getElementById('notifications-toggle').checked = this.config.notifications;
        document.getElementById('vibration-toggle').checked = this.config.vibration;
        document.getElementById('auto-harvest-toggle').checked = this.config.autoHarvest;
        
        // Actualizar slider de volumen
        document.getElementById('volume-slider').value = this.config.volume * 100;
        document.getElementById('volume-value').textContent = Math.round(this.config.volume * 100) + '%';
        
        // Actualizar selector de idioma
        document.getElementById('language-select').value = this.config.language;
    },
    
    // Mostrar configuraciones
    showSettings: function() {
        this.updateUI();
        document.getElementById('settings-modal').classList.add('active');
        document.getElementById('modal-overlay').classList.add('active');
    },
    
    // Ocultar configuraciones
    hideSettings: function() {
        document.getElementById('settings-modal').classList.remove('active');
        document.getElementById('modal-overlay').classList.remove('active');
    },
    
    // Copiar ID del jugador
    copyPlayerId: function() {
        const playerId = GameState.user.id || 'unknown';
        navigator.clipboard.writeText(playerId).then(() => {
            showNotification('✅ ID copiado al portapapeles', 'success');
        }).catch(() => {
            // Fallback para navegadores antiguos
            const textArea = document.createElement('textarea');
            textArea.value = playerId;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            showNotification('✅ ID copiado', 'success');
        });
    },
    
    // Obtener traducción
    getTranslation: function(key) {
        if (window.t) {
            return t(key);
        }
        return key;
    }
};

// Inicializar cuando esté listo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => SettingsSystem.init(), 1000);
});

// Hacer disponible globalmente
window.SettingsSystem = SettingsSystem;
