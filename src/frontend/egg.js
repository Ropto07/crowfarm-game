// Sistema de huevos

function initEggSection() {
    console.log('🥚 Inicializando sistema de huevos...');
    
    const hatchBtn = document.getElementById('hatch-btn');
    hatchBtn.addEventListener('click', hatchEgg);
    
    // Cargar historial de eclosiones
    loadHatchHistory();
}

// Eclosionar huevo
async function hatchEgg() {
    if (GameState.user.tickets < GameConfig.EGG_COST) {
        showNotification('🎫 No tienes suficientes tickets', 'error');
        return;
    }
    
    const hatchBtn = document.getElementById('hatch-btn');
    hatchBtn.disabled = true;
    hatchBtn.textContent = 'Eclosionando...';
    
    // Animación del huevo
    const egg = document.getElementById('main-egg');
    egg.style.animation = 'shake 0.5s ease-in-out infinite';
    
    // Esperar 2 segundos para la animación
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Determinar rareza
    const rarity = determineRarity();
    const crowName = generateCrowName(rarity);
    
    // Crear cuervo
    const newCrow = {
        id: Date.now(),
        name: crowName,
        type: crowName.toLowerCase().replace(' ', '_'),
        rarity: rarity,
        power: getRandomStat(),
        speed: getRandomStat(),
        luck: getRandomStat(),
        obtainedAt: new Date().toISOString()
    };
    
    // Añadir a la colección
    GameState.crows.push(newCrow);
    GameState.eggsHatched++;
    GameState.user.tickets -= GameConfig.EGG_COST;
    
    // Actualizar UI
    updateUI();
    updateCrowsSection();
    addToHatchHistory(newCrow);
    
    // Detener animación y mostrar resultado
    egg.style.animation = '';
    
    // Mostrar modal con el nuevo cuervo
    showCrowModal(newCrow);
    
    hatchBtn.disabled = false;
    hatchBtn.textContent = 'Eclosionar Huevo';
    
    // Guardar en servidor
    saveCrow(newCrow);
}

// Determinar rareza
function determineRarity() {
    const rand = Math.random();
    let cumulative = 0;
    
    for (const [rarity, data] of Object.entries(GameConfig.CROW_RARITIES)) {
        cumulative += data.chance;
        if (rand <= cumulative) {
            return rarity;
        }
    }
    
    return 'common';
}

// Generar nombre de cuervo
function generateCrowName(rarity) {
    const prefixes = {
        common: ['Gris', 'Negro', 'Marrón', 'Común'],
        rare: ['Azul', 'Rojo', 'Verde', 'Plateado'],
        epic: ['Dorado', 'Púrpura', 'Cristal', 'Fantasma'],
        legendary: ['Fénix', 'Dragón', 'Trueno', 'Élite']
    };
    
    const suffixes = ['Nocturno', 'Veloz', 'Sagaz', 'Místico', 'Real'];
    
    const prefix = prefixes[rarity][Math.floor(Math.random() * prefixes[rarity].length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
    
    return `${prefix} ${suffix}`;
}

// Obtener estadística aleatoria
function getRandomStat() {
    return Math.floor(Math.random() * 10) + 1;
}

// Mostrar modal del cuervo
function showCrowModal(crow) {
    const modal = document.getElementById('crow-modal');
    const modalContent = document.getElementById('crow-modal-content');
    const rarityData = GameConfig.CROW_RARITIES[crow.rarity];
    
    modalContent.innerHTML = `
        <div class="crow-modal-result">
            <div class="crow-result-icon ${crow.rarity}" style="font-size: 60px; margin: 20px 0;">
                ${getCrowEmoji(crow.rarity)}
            </div>
            <h3 style="color: ${rarityData.color}; margin: 10px 0;">${crow.name}</h3>
            <div class="crow-rarity ${crow.rarity}" style="margin: 10px 0;">
                ${rarityData.name}
            </div>
            
            <div class="crow-stats">
                <div class="stat-row">
                    <span>Fuerza:</span>
                    <div class="stat-bar">
                        <div class="stat-fill" style="width: ${crow.power * 10}%"></div>
                    </div>
                    <span>${crow.power}/10</span>
                </div>
                <div class="stat-row">
                    <span>Velocidad:</span>
                    <div class="stat-bar">
                        <div class="stat-fill" style="width: ${crow.speed * 10}%"></div>
                    </div>
                    <span>${crow.speed}/10</span>
                </div>
                <div class="stat-row">
                    <span>Suerte:</span>
                    <div class="stat-bar">
                        <div class="stat-fill" style="width: ${crow.luck * 10}%"></div>
                    </div>
                    <span>${crow.luck}/10</span>
                </div>
            </div>
            
            <p style="margin-top: 20px; color: #718096;">
                ¡Felicidades! Este cuervo se ha unido a tu colección.
            </p>
            
            <button id="close-crow-modal" style="
                margin-top: 20px;
                padding: 10px 20px;
                background: ${rarityData.color};
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: bold;
                width: 100%;
            ">
                ¡Genial!
            </button>
        </div>
    `;
    
    modal.classList.add('active');
    document.getElementById('modal-overlay').classList.add('active');
    
    // Cerrar modal
    const closeBtn = document.getElementById('close-crow-modal');
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        document.getElementById('modal-overlay').classList.remove('active');
    });
    
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.classList.remove('active');
        document.getElementById('modal-overlay').classList.remove('active');
    });
}

// Obtener emoji según rareza
function getCrowEmoji(rarity) {
    const emojis = {
        common: '🐦',
        rare: '🐦‍⬛',
        epic: '🦅',
        legendary: '🐦‍🔥'
    };
    return emojis[rarity] || '🐦';
}

// Añadir al historial
function addToHatchHistory(crow) {
    const hatchesList = document.getElementById('hatches-list');
    const rarityData = GameConfig.CROW_RARITIES[crow.rarity];
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const hatchItem = document.createElement('div');
    hatchItem.className = `hatch-item ${crow.rarity}`;
    hatchItem.innerHTML = `
        <div class="hatch-time">${time}</div>
        <div class="hatch-crow">${getCrowEmoji(crow.rarity)} ${crow.name}</div>
        <div class="hatch-rarity ${crow.rarity}">${rarityData.name}</div>
    `;
    
    hatchesList.prepend(hatchItem);
    
    // Limitar a 10 elementos
    while (hatchesList.children.length > 10) {
        hatchesList.removeChild(hatchesList.lastChild);
    }
}

// Cargar historial de eclosiones
async function loadHatchHistory() {
    try {
        if (GameState.user.id) {
            const response = await fetch(`${GameConfig.API_URL}/hatches/${GameState.user.id}`);
            if (response.ok) {
                const hatches = await response.json();
                hatches.forEach(addToHatchHistory);
            }
        }
    } catch (error) {
        console.log('⚠️  Error cargando historial:', error);
    }
}

// Guardar cuervo en servidor
async function saveCrow(crow) {
    try {
        const crowData = {
            userId: GameState.user.id,
            ...crow
        };
        
        await fetch(`${GameConfig.API_URL}/crows`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(crowData)
        });
    } catch (error) {
        console.log('⚠️  Error guardando cuervo:', error);
    }
}
