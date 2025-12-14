// Sistema de anuncios

const AdsSystem = {
    config: {
        dailyLimit: 10,
        rewardPerAd: 10,
        cooldown: 30 // segundos entre anuncios
    },
    
    stats: {
        watchedToday: 0,
        lastWatched: null,
        totalWatched: 0,
        totalEarned: 0
    }
};

// Inicializar sistema de anuncios
function initAdsSystem() {
    console.log('📺 Inicializando sistema de anuncios...');
    
    // Cargar estadísticas
    loadAdStats();
    
    // Configurar botón de anuncios
    const watchAdBtn = document.getElementById('watch-ad-btn');
    if (watchAdBtn) {
        watchAdBtn.addEventListener('click', showAd);
    }
    
    // Actualizar contador
    updateAdButton();
    
    // Verificar límite diario cada minuto
    setInterval(checkDailyLimit, 60000);
}

// Cargar estadísticas de anuncios
function loadAdStats() {
    const saved = localStorage.getItem('crowFarmer_adStats');
    if (saved) {
        const data = JSON.parse(saved);
        
        // Resetear si es un nuevo día
        const today = new Date().toDateString();
        if (data.lastDate !== today) {
            AdsSystem.stats.watchedToday = 0;
        } else {
            AdsSystem.stats.watchedToday = data.watchedToday || 0;
        }
        
        AdsSystem.stats.totalWatched = data.totalWatched || 0;
        AdsSystem.stats.totalEarned = data.totalEarned || 0;
        AdsSystem.stats.lastWatched = data.lastWatched ? new Date(data.lastWatched) : null;
    }
    
    updateAdDisplay();
}

// Guardar estadísticas
function saveAdStats() {
    const data = {
        watchedToday: AdsSystem.stats.watchedToday,
        totalWatched: AdsSystem.stats.totalWatched,
        totalEarned: AdsSystem.stats.totalEarned,
        lastWatched: AdsSystem.stats.lastWatched,
        lastDate: new Date().toDateString()
    };
    
    localStorage.setItem('crowFarmer_adStats', JSON.stringify(data));
}

// Mostrar anuncio
function showAd() {
    const btn = document.getElementById('watch-ad-btn');
    
    // Verificar límite diario
    if (AdsSystem.stats.watchedToday >= AdsSystem.config.dailyLimit) {
        showNotification('📺 Límite diario alcanzado', 'error');
        btn.disabled = true;
        return;
    }
    
    // Verificar cooldown
    if (AdsSystem.stats.lastWatched) {
        const secondsSinceLast = (Date.now() - AdsSystem.stats.lastWatched) / 1000;
        if (secondsSinceLast < AdsSystem.config.cooldown) {
            const remaining = Math.ceil(AdsSystem.config.cooldown - secondsSinceLast);
            showNotification(`⏳ Espera ${remaining}s para el próximo anuncio`, 'info');
            return;
        }
    }
    
    // Simular anuncio (en producción integrarías AdMob/IronSource)
    simulateAd();
}

// Simular anuncio
function simulateAd() {
    const btn = document.getElementById('watch-ad-btn');
    btn.disabled = true;
    btn.textContent = 'Cargando anuncio...';
    
    // Mostrar pantalla de anuncio
    showAdScreen();
    
    // Simular tiempo de anuncio (5 segundos)
    setTimeout(() => {
        completeAd();
        hideAdScreen();
        
        btn.disabled = false;
        btn.textContent = 'Ver Anuncio';
        
        updateAdButton();
    }, 5000);
}

// Mostrar pantalla de anuncio
function showAdScreen() {
    const adScreen = document.createElement('div');
    adScreen.id = 'ad-screen';
    adScreen.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #000;
        z-index: 2000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
    `;
    
    adScreen.innerHTML = `
        <div class="ad-content" style="text-align: center;">
            <div style="font-size: 40px; margin-bottom: 20px;">📺</div>
            <h3 style="margin-bottom: 10px;">Anuncio en reproducción</h3>
            <p style="margin-bottom: 30px; opacity: 0.8;">Por favor espera 5 segundos...</p>
            <div class="ad-timer" style="
                width: 200px;
                height: 4px;
                background: rgba(255,255,255,0.2);
                margin: 0 auto;
                overflow: hidden;
                border-radius: 2px;
            ">
                <div class="ad-timer-fill" style="
                    height: 100%;
                    background: #48BB78;
                    width: 0%;
                    transition: width 5s linear;
                "></div>
            </div>
            <p style="margin-top: 20px; font-size: 14px; opacity: 0.6;">
                Recompensa: ${AdsSystem.config.rewardPerAd} tickets
            </p>
        </div>
        
        <div class="ad-skip" style="
            position: absolute;
            bottom: 30px;
            right: 30px;
            padding: 8px 16px;
            background: rgba(255,255,255,0.1);
            border-radius: 20px;
            font-size: 14px;
            opacity: 0.7;
        ">
            No se puede saltar
        </div>
    `;
    
    document.body.appendChild(adScreen);
    
    // Animar timer
    setTimeout(() => {
        const timerFill = adScreen.querySelector('.ad-timer-fill');
        if (timerFill) {
            timerFill.style.width = '100%';
        }
    }, 100);
}

// Ocultar pantalla de anuncio
function hideAdScreen() {
    const adScreen = document.getElementById('ad-screen');
    if (adScreen) {
        adScreen.style.opacity = '0';
        setTimeout(() => adScreen.remove(), 300);
    }
}

// Completar anuncio
function completeAd() {
    // Actualizar estadísticas
    AdsSystem.stats.watchedToday++;
    AdsSystem.stats.totalWatched++;
    AdsSystem.stats.totalEarned += AdsSystem.config.rewardPerAd;
    AdsSystem.stats.lastWatched = new Date();
    
    // Dar recompensa al usuario
    GameState.user.tickets += AdsSystem.config.rewardPerAd;
    
    // Actualizar UI
    updateUI();
    updateAdDisplay();
    
    // Guardar estadísticas
    saveAdStats();
    
    // Guardar en servidor
    saveAdWatch();
    
    showNotification(`✅ +${AdsSystem.config.rewardPerAd} tickets por ver anuncio`, 'success');
}

// Actualizar botón de anuncios
function updateAdButton() {
    const btn = document.getElementById('watch-ad-btn');
    if (!btn) return;
    
    const adsLeft = AdsSystem.config.dailyLimit - AdsSystem.stats.watchedToday;
    
    if (adsLeft <= 0) {
        btn.disabled = true;
        btn.textContent = 'Límite alcanzado';
        return;
    }
    
    btn.disabled = false;
    btn.textContent = `Ver Anuncio (${adsLeft} restantes)`;
    
    // Verificar cooldown
    if (AdsSystem.stats.lastWatched) {
        const secondsSinceLast = (Date.now() - AdsSystem.stats.lastWatched) / 1000;
        if (secondsSinceLast < AdsSystem.config.cooldown) {
            btn.disabled = true;
            const remaining = Math.ceil(AdsSystem.config.cooldown - secondsSinceLast);
            btn.textContent = `Espera ${remaining}s`;
            
            // Habilitar después del cooldown
            setTimeout(() => {
                if (adsLeft > 0) {
                    btn.disabled = false;
                    btn.textContent = `Ver Anuncio (${adsLeft} restantes)`;
                }
            }, (AdsSystem.config.cooldown - secondsSinceLast) * 1000);
        }
    }
}

// Actualizar display de anuncios
function updateAdDisplay() {
    const adsToday = document.getElementById('ads-today');
    if (adsToday) {
        adsToday.textContent = AdsSystem.stats.watchedToday;
    }
}

// Verificar límite diario
function checkDailyLimit() {
    // Resetear si es un nuevo día
    const saved = localStorage.getItem('crowFarmer_adStats');
    if (saved) {
        const data = JSON.parse(saved);
        const today = new Date().toDateString();
        
        if (data.lastDate !== today && AdsSystem.stats.watchedToday > 0) {
            AdsSystem.stats.watchedToday = 0;
            updateAdDisplay();
            updateAdButton();
            saveAdStats();
        }
    }
}

// Guardar anuncio visto en servidor
async function saveAdWatch() {
    try {
        const adData = {
            userId: GameState.user.id,
            reward: AdsSystem.config.rewardPerAd,
            watchedAt: new Date().toISOString()
        };
        
        await fetch(`${GameConfig.API_URL}/ads`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adData)
        });
    } catch (error) {
        console.log('⚠️  Error guardando anuncio:', error);
    }
}

// Inicializar cuando esté listo
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(initAdsSystem, 1000);
});
