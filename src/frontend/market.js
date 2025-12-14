// Sistema de tienda y mercado

function initMarket() {
    console.log('🛒 Inicializando sistema de tienda...');
    
    // Configurar pestañas de la tienda
    const shopTabs = document.querySelectorAll('.shop-tab');
    const shopContents = document.querySelectorAll('.shop-tab-content');
    
    shopTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.dataset.tab;
            
            // Actualizar pestañas activas
            shopTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Mostrar contenido correspondiente
            shopContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `${tabId}-tab`) {
                    content.classList.add('active');
                }
            });
        });
    });
    
    // Configurar botones de compra
    const buyButtons = document.querySelectorAll('.buy-btn');
    buyButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            const product = e.target.dataset.product;
            handleProductPurchase(product);
        });
    });
    
    // Cargar ofertas especiales
    loadSpecialOffers();
}

// Manejar compra de producto
function handleProductPurchase(product) {
    const products = {
        basic: { tickets: 600, price: 0.99, name: 'Paquete Básico' },
        farmer: { tickets: 1800, price: 2.99, name: 'Paquete Granjero' },
        premium: { tickets: 4000, price: 5.99, name: 'Paquete Premium' },
        ultimate: { tickets: 10000, price: 12.99, name: 'Paquete Ultimate' }
    };
    
    const productData = products[product];
    if (!productData) return;
    
    // Mostrar confirmación
    if (confirm(`¿Comprar ${productData.name} por $${productData.price}?\nObtendrás ${productData.tickets} tickets.`)) {
        processPayment(product, productData);
    }
}

// Procesar pago
async function processPayment(product, productData) {
    try {
        showNotification('💳 Procesando pago...', 'info');
        
        // Simular pago (en producción usarías Stripe/PayPal)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Dar tickets al usuario
        GameState.user.tickets += productData.tickets;
        
        // Actualizar UI
        updateUI();
        
        // Guardar transacción
        saveTransaction(productData);
        
        showNotification(`✅ Compra exitosa: +${productData.tickets} tickets`, 'success');
        
    } catch (error) {
        console.error('Error en pago:', error);
        showNotification('❌ Error procesando el pago', 'error');
    }
}

// Guardar transacción
async function saveTransaction(productData) {
    try {
        const transaction = {
            userId: GameState.user.id,
            product: productData.name,
            tickets: productData.tickets,
            price: productData.price,
            date: new Date().toISOString()
        };
        
        await fetch(`${GameConfig.API_URL}/transactions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(transaction)
        });
    } catch (error) {
        console.log('⚠️  Error guardando transacción:', error);
    }
}

// Cargar ofertas especiales
async function loadSpecialOffers() {
    try {
        const response = await fetch(`${GameConfig.API_URL}/offers`);
        if (response.ok) {
            const offers = await response.json();
            displaySpecialOffers(offers);
        }
    } catch (error) {
        console.log('⚠️  Error cargando ofertas:', error);
    }
}

// Mostrar ofertas especiales
function displaySpecialOffers(offers) {
    const offersContainer = document.getElementById('offers-container');
    if (!offersContainer) return;
    
    if (offers.length === 0) {
        offersContainer.innerHTML = `
            <div class="no-offers">
                <p>No hay ofertas especiales en este momento.</p>
                <p>¡Vuelve pronto!</p>
            </div>
        `;
        return;
    }
    
    offersContainer.innerHTML = offers.map(offer => `
        <div class="special-offer ${offer.featured ? 'featured' : ''}">
            <div class="offer-badge">🔥 OFERTA</div>
            <div class="offer-content">
                <h4>${offer.name}</h4>
                <p>${offer.description}</p>
                <div class="offer-price">
                    <span class="old-price">$${offer.originalPrice}</span>
                    <span class="new-price">$${offer.discountedPrice}</span>
                </div>
                <button class="buy-offer-btn" data-offer-id="${offer.id}">
                    Comprar Ahora
                </button>
            </div>
        </div>
    `).join('');
}

// Mejoras de granja
const FARM_UPGRADES = {
    extra_plot: {
        name: 'Parcela Extra',
        description: 'Desbloquea una parcela adicional para cultivar',
        cost: 1000,
        type: 'coins',
        maxLevel: 3
    },
    faster_growth: {
        name: 'Crecimiento Rápido',
        description: 'Los cultivos crecen 10% más rápido',
        cost: 500,
        type: 'tickets',
        maxLevel: 5
    },
    lucky_charm: {
        name: 'Amuleto de Suerte',
        description: 'Aumenta la probabilidad de tickets en 5%',
        cost: 800,
        type: 'tickets',
        maxLevel: 4
    },
    energy_boost: {
        name: 'Energía Extra',
        description: '+200 energía máxima diaria',
        cost: 1500,
        type: 'coins',
        maxLevel: 2
    }
};

// Comprar mejora
function buyUpgrade(upgradeId) {
    const upgrade = FARM_UPGRADES[upgradeId];
    if (!upgrade) return;
    
    // Verificar si puede comprar
    if (upgrade.type === 'coins' && GameState.user.coins < upgrade.cost) {
        showNotification('💰 No tienes suficientes monedas', 'error');
        return;
    }
    
    if (upgrade.type === 'tickets' && GameState.user.tickets < upgrade.cost) {
        showNotification('🎫 No tienes suficientes tickets', 'error');
        return;
    }
    
    // Aplicar mejora
    applyUpgrade(upgradeId, upgrade);
    
    // Descontar recursos
    if (upgrade.type === 'coins') {
        GameState.user.coins -= upgrade.cost;
    } else {
        GameState.user.tickets -= upgrade.cost;
    }
    
    updateUI();
    showNotification(`✅ Mejora aplicada: ${upgrade.name}`, 'success');
}

// Aplicar mejora
function applyUpgrade(upgradeId, upgrade) {
    switch (upgradeId) {
        case 'extra_plot':
            GameState.farm.size = Math.min(GameState.farm.size + 1, 36);
            initFarm(); // Recrear la granja
            break;
            
        case 'faster_growth':
            // Reducir tiempos de cultivo (implementar en farm.js)
            console.log('Cultivos 10% más rápidos');
            break;
            
        case 'lucky_charm':
            // Aumentar probabilidad de tickets
            console.log('+5% probabilidad de tickets');
            break;
            
        case 'energy_boost':
            GameConfig.ENERGY_PER_DAY += 200;
            GameState.user.energy = GameConfig.ENERGY_PER_DAY;
            break;
    }
}

// Mostrar mejoras disponibles
function displayUpgrades() {
    const upgradesContainer = document.getElementById('upgrades-container');
    if (!upgradesContainer) return;
    
    upgradesContainer.innerHTML = Object.entries(FARM_UPGRADES).map(([id, upgrade]) => `
        <div class="upgrade-item">
            <div class="upgrade-info">
                <h4>${upgrade.name}</h4>
                <p>${upgrade.description}</p>
                <div class="upgrade-cost">
                    Costo: 
                    ${upgrade.type === 'coins' ? '💰' : '🎫'} 
                    ${upgrade.cost}
                </div>
            </div>
            <button class="buy-upgrade-btn" data-upgrade="${id}">
                Comprar
            </button>
        </div>
    `).join('');
    
    // Agregar eventos a los botones
    document.querySelectorAll('.buy-upgrade-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const upgradeId = e.target.dataset.upgrade;
            buyUpgrade(upgradeId);
        });
    });
}
