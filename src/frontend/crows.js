// Sistema de cuervos

function initCrows() {
    console.log('🐦 Inicializando sistema de cuervos...');
    
    // Cargar cuervos existentes
    loadUserCrows();
}

// Cargar cuervos del usuario
async function loadUserCrows() {
    try {
        if (GameState.user.id) {
            const response = await fetch(`${GameConfig.API_URL}/crows/${GameState.user.id}`);
            if (response.ok) {
                const crows = await response.json();
                GameState.crows = crows;
                updateCrowsSection();
            }
        }
    } catch (error) {
        console.log('⚠️  Error cargando cuervos:', error);
    }
}

// Actualizar sección de cuervos
function updateCrowsSection() {
    const crowsGrid = document.getElementById('crows-grid');
    const totalCollected = document.getElementById('total-collected');
    const rareCrows = document.getElementById('rare-crows');
    const epicCrows = document.getElementById('epic-crows');
    
    // Actualizar estadísticas
    totalCollected.textContent = GameState.crows.length;
    rareCrows.textContent = GameState.crows.filter(c => c.rarity === 'rare').length;
    epicCrows.textContent = GameState.crows.filter(c => c.rarity === 'epic' || c.rarity === 'legendary').length;
    
    if (GameState.crows.length === 0) {
        crowsGrid.innerHTML = `
            <div class="empty-collection">
                <div class="empty-icon">🥚</div>
                <p>¡Aún no tienes cuervos!</p>
                <p>Eclosiona un huevo para comenzar tu colección.</p>
            </div>
        `;
        return;
    }
    
    // Ordenar cuervos por rareza
    const sortedCrows = [...GameState.crows].sort((a, b) => {
        const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
        return rarityOrder[a.rarity] - rarityOrder[b.rarity];
    });
    
    // Generar grid de cuervos
    crowsGrid.innerHTML = sortedCrows.map(crow => createCrowCard(crow)).join('');
    
    // Agregar eventos a las tarjetas
    document.querySelectorAll('.crow-card').forEach(card => {
        card.addEventListener('click', () => showCrowDetails(card.dataset.crowId));
    });
}

// Crear tarjeta de cuervo
function createCrowCard(crow) {
    const rarityData = GameConfig.CROW_RARITIES[crow.rarity];
    
    return `
        <div class="crow-card ${crow.rarity}" data-crow-id="${crow.id}">
            <div class="crow-icon">${getCrowEmoji(crow.rarity)}</div>
            <div class="crow-name">${crow.name}</div>
            <div class="crow-rarity ${crow.rarity}">${rarityData.name}</div>
            <div class="crow-level">Nivel ${crow.level || 1}</div>
            <div class="crow-stats-small">
                <span>💪 ${crow.power}</span>
                <span>⚡ ${crow.speed}</span>
                <span>🍀 ${crow.luck}</span>
            </div>
        </div>
    `;
}

// Mostrar detalles del cuervo
function showCrowDetails(crowId) {
    const crow = GameState.crows.find(c => c.id == crowId);
    if (!crow) return;
    
    const rarityData = GameConfig.CROW_RARITIES[crow.rarity];
    
    const modal = document.getElementById('crow-modal');
    const modalContent = document.getElementById('crow-modal-content');
    
    modalContent.innerHTML = `
        <div class="crow-details">
            <div class="crow-detail-header ${crow.rarity}">
                <div class="crow-detail-icon">${getCrowEmoji(crow.rarity)}</div>
                <div class="crow-detail-name">${crow.name}</div>
                <div class="crow-detail-rarity ${crow.rarity}">${rarityData.name}</div>
            </div>
            
            <div class="crow-detail-stats">
                <h4>Estadísticas</h4>
                <div class="detail-stat">
                    <span class="stat-label">Fuerza</span>
                    <div class="stat-bar-large">
                        <div class="stat-fill-large" style="width: ${crow.power * 10}%"></div>
                    </div>
                    <span class="stat-value">${crow.power}/10</span>
                </div>
                <div class="detail-stat">
                    <span class="stat-label">Velocidad</span>
                    <div class="stat-bar-large">
                        <div class="stat-fill-large" style="width: ${crow.speed * 10}%"></div>
                    </div>
                    <span class="stat-value">${crow.speed}/10</span>
                </div>
                <div class="detail-stat">
                    <span class="stat-label">Suerte</span>
                    <div class="stat-bar-large">
                        <div class="stat-fill-large" style="width: ${crow.luck * 10}%"></div>
                    </div>
                    <span class="stat-value">${crow.luck}/10</span>
                </div>
            </div>
            
            <div class="crow-detail-info">
                <div class="info-item">
                    <span class="info-label">Nivel</span>
                    <span class="info-value">${crow.level || 1}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Obtenido</span>
                    <span class="info-value">${new Date(crow.obtainedAt).toLocaleDateString()}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Batallas</span>
                    <span class="info-value">${crow.battlesWon || 0}✅ ${crow.battlesLost || 0}❌</span>
                </div>
            </div>
            
            <div class="crow-actions">
                <button class="crow-action-btn" onclick="putOnMarket(${crow.id})" style="background: #ED8936;">
                    🛒 Vender
                </button>
                <button class="crow-action-btn" onclick="startTraining(${crow.id})" style="background: #38A169;">
                    🏋️‍♂️ Entrenar
                </button>
                <button class="crow-action-btn" onclick="setAsFavorite(${crow.id})" style="background: #9F7AEA;">
                    ⭐ Favorito
                </button>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
    document.getElementById('modal-overlay').classList.add('active');
    
    // Cerrar modal
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.classList.remove('active');
        document.getElementById('modal-overlay').classList.remove('active');
    });
}

// Poner en mercado (placeholder)
function putOnMarket(crowId) {
    showNotification('🛒 Función de mercado en desarrollo', 'info');
}

// Entrenar cuervo (placeholder)
function startTraining(crowId) {
    showNotification('🏋️‍♂️ Sistema de entrenamiento en desarrollo', 'info');
}

// Marcar como favorito (placeholder)
function setAsFavorite(crowId) {
    showNotification('⭐ Cuervo marcado como favorito', 'success');
                                                             }
