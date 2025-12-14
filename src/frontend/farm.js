// Sistema de granja

function initFarm() {
    console.log('🌱 Inicializando granja...');
    
    // Crear cuadrícula de cultivos
    const farmGrid = document.getElementById('farm-grid');
    farmGrid.innerHTML = '';
    
    // Inicializar parcelas
    GameState.farm.plots = [];
    
    for (let i = 0; i < GameState.farm.size; i++) {
        const plot = {
            id: i,
            x: i % 3,
            y: Math.floor(i / 3),
            crop: null,
            plantedAt: null,
            readyAt: null
        };
        
        GameState.farm.plots.push(plot);
        
        // Crear elemento HTML
        const plotElement = document.createElement('div');
        plotElement.className = 'farm-plot empty';
        plotElement.dataset.plotId = i;
        plotElement.innerHTML = '🌱';
        
        // Evento para plantar
        plotElement.addEventListener('click', () => openPlantModal(i));
        
        farmGrid.appendChild(plotElement);
    }
    
    // Configurar botones de plantar
    const plantButtons = document.querySelectorAll('.plant-btn');
    plantButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            const cropType = e.target.closest('.crop-item').dataset.crop;
            plantSelectedCrop(cropType);
        });
    });
    
    // Cargar cultivos existentes
    loadExistingCrops();
}

// Abrir modal para plantar
function openPlantModal(plotId) {
    const plot = GameState.farm.plots[plotId];
    
    if (plot.crop) {
        // Si ya hay un cultivo
        if (plot.readyAt && Date.now() >= plot.readyAt) {
            harvestCrop(plotId);
        } else {
            showNotification('⏳ Cultivo en crecimiento...', 'info');
        }
        return;
    }
    
    // Verificar energía
    if (GameState.user.energy <= 0) {
        showNotification('⚡ No tienes suficiente energía', 'error');
        return;
    }
    
    // Mostrar modal de plantación
    const modal = document.getElementById('crop-modal');
    const modalContent = document.getElementById('crop-modal-content');
    
    modalContent.innerHTML = `
        <h4>Seleccionar cultivo para parcela ${plotId + 1}</h4>
        <div class="crop-selection">
            ${Object.entries(GameConfig.CROP_TYPES).map(([key, crop]) => `
                <div class="crop-option" data-crop="${key}">
                    <div class="crop-option-icon">${crop.emoji}</div>
                    <div class="crop-option-info">
                        <div class="crop-option-name">${crop.name}</div>
                        <div class="crop-option-details">
                            <span>💰 ${crop.cost}</span>
                            <span>⏱️ ${crop.time}s</span>
                            <span>🎫 ${Math.round(crop.ticketChance * 100)}%</span>
                        </div>
                    </div>
                    <button class="select-crop-btn" data-crop="${key}">Plantar</button>
                </div>
            `).join('')}
        </div>
    `;
    
    // Eventos para botones de selección
    modalContent.querySelectorAll('.select-crop-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cropType = e.target.dataset.crop;
            plantCrop(plotId, cropType);
            modal.classList.remove('active');
            document.getElementById('modal-overlay').classList.remove('active');
        });
    });
    
    modal.classList.add('active');
    document.getElementById('modal-overlay').classList.add('active');
    
    // Cerrar modal
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.classList.remove('active');
        document.getElementById('modal-overlay').classList.remove('active');
    });
}

// Plantar cultivo seleccionado
function plantSelectedCrop(cropType) {
    // Encontrar primera parcela vacía
    const emptyPlot = GameState.farm.plots.find(plot => !plot.crop);
    
    if (!emptyPlot) {
        showNotification('🏡 No hay parcelas disponibles', 'error');
        return;
    }
    
    plantCrop(emptyPlot.id, cropType);
}

// Plantar cultivo
function plantCrop(plotId, cropType) {
    const plot = GameState.farm.plots[plotId];
    const crop = GameConfig.CROP_TYPES[cropType];
    
    // Verificar si hay suficiente dinero
    if (GameState.user.coins < crop.cost) {
        showNotification('💰 No tienes suficientes monedas', 'error');
        return;
    }
    
    // Verificar energía
    if (GameState.user.energy <= 0) {
        showNotification('⚡ No tienes energía', 'error');
        return;
    }
    
    // Plantar cultivo
    plot.crop = cropType;
    plot.plantedAt = Date.now();
    plot.readyAt = Date.now() + (crop.time * 1000);
    
    // Descontar recursos
    GameState.user.coins -= crop.cost;
    GameState.user.energy -= 1;
    
    // Actualizar UI
    updatePlot(plotId);
    updateUI();
    
    // Guardar en servidor
    saveCrop(plot);
    
    showNotification(`✅ Plantado ${crop.name}`, 'success');
}

// Actualizar parcela en UI
function updatePlot(plotId) {
    const plot = GameState.farm.plots[plotId];
    const plotElement = document.querySelector(`[data-plot-id="${plotId}"]`);
    
    if (!plot.crop) {
        plotElement.className = 'farm-plot empty';
        plotElement.innerHTML = '🌱';
        return;
    }
    
    const crop = GameConfig.CROP_TYPES[plot.crop];
    const now = Date.now();
    
    if (now >= plot.readyAt) {
        // Listo para cosechar
        plotElement.className = 'farm-plot ready';
        plotElement.innerHTML = `${crop.emoji}✨`;
    } else {
        // En crecimiento
        plotElement.className = 'farm-plot planted';
        plotElement.innerHTML = crop.emoji;
        
        // Mostrar tiempo restante
        const timeLeft = Math.ceil((plot.readyAt - now) / 1000);
        if (timeLeft < 60) {
            plotElement.title = `${timeLeft}s`;
        }
    }
}

// Cosechar cultivo
function harvestCrop(plotId) {
    const plot = GameState.farm.plots[plotId];
    const crop = GameConfig.CROP_TYPES[plot.crop];
    
    // Calcular recompensa
    let coinsEarned = crop.reward;
    let ticketsEarned = 0;
    
    // Chance de ticket
    if (Math.random() < crop.ticketChance) {
        ticketsEarned = crop.ticketChance < 0.25 ? 1 : 
                       crop.ticketChance < 0.35 ? 2 : 
                       crop.ticketChance < 0.45 ? 3 : 5;
    }
    
    // Dar recompensa
    GameState.user.coins += coinsEarned;
    GameState.user.tickets += ticketsEarned;
    GameState.user.xp += crop.ticketChance * 10;
    
    // Subir de nivel
    checkLevelUp();
    
    // Resetear parcela
    plot.crop = null;
    plot.plantedAt = null;
    plot.readyAt = null;
    
    // Actualizar
    updatePlot(plotId);
    updateUI();
    
    // Mostrar recompensa
    let rewardMsg = `✅ Cosechado ${crop.name}: +${coinsEarned}💰`;
    if (ticketsEarned > 0) {
        rewardMsg += ` +${ticketsEarned}🎫`;
    }
    showNotification(rewardMsg, 'success');
    
    // Guardar estadísticas
    saveHarvest(plotId, coinsEarned, ticketsEarned);
}

// Verificar cultivos listos
function checkReadyCrops() {
    GameState.farm.plots.forEach((plot, index) => {
        if (plot.crop && plot.readyAt && Date.now() >= plot.readyAt) {
            updatePlot(index);
        }
    });
}

// Subir de nivel
function checkLevelUp() {
    const xpNeeded = GameState.user.level * 1000;
    
    if (GameState.user.xp >= xpNeeded) {
        GameState.user.level++;
        GameState.user.xp = GameState.user.xp - xpNeeded;
        
        showNotification(`🎉 ¡Subiste al nivel ${GameState.user.level}!`, 'success');
        
        // Recompensa por subir de nivel
        GameState.user.coins += GameState.user.level * 100;
        GameState.user.tickets += GameState.user.level * 10;
        GameState.user.energy = GameConfig.ENERGY_PER_DAY;
        
        updateUI();
    }
}

// Cargar cultivos existentes
async function loadExistingCrops() {
    try {
        if (GameState.user.id) {
            const response = await fetch(`${GameConfig.API_URL}/crops/${GameState.user.id}`);
            if (response.ok) {
                const crops = await response.json();
                
                crops.forEach(cropData => {
                    const plot = GameState.farm.plots[cropData.plotIndex];
                    if (plot) {
                        plot.crop = cropData.type;
                        plot.plantedAt = new Date(cropData.plantedAt).getTime();
                        plot.readyAt = new Date(cropData.readyAt).getTime();
                        updatePlot(cropData.plotIndex);
                    }
                });
            }
        }
    } catch (error) {
        console.log('⚠️  Error cargando cultivos:', error);
    }
}

// Guardar cultivo en servidor
async function saveCrop(plot) {
    try {
        const cropData = {
            userId: GameState.user.id,
            plotIndex: plot.id,
            type: plot.crop,
            plantedAt: new Date(plot.plantedAt).toISOString(),
            readyAt: new Date(plot.readyAt).toISOString()
        };
        
        await fetch(`${GameConfig.API_URL}/crops`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cropData)
        });
    } catch (error) {
        console.log('⚠️  Error guardando cultivo:', error);
    }
}

// Guardar cosecha en servidor
async function saveHarvest(plotId, coins, tickets) {
    try {
        const harvestData = {
            userId: GameState.user.id,
            plotIndex: plotId,
            coins: coins,
            tickets: tickets,
            harvestedAt: new Date().toISOString()
        };
        
        await fetch(`${GameConfig.API_URL}/harvest`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(harvestData)
        });
    } catch (error) {
        console.log('⚠️  Error guardando cosecha:', error);
    }
}
