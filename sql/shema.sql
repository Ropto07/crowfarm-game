-- ============================================
-- ESQUEMA COMPLETO - Crow Farmer Telegram Game
-- Base de datos: PostgreSQL (Supabase)
-- ============================================

-- ============================================
-- 1. USUARIOS PRINCIPALES
-- ============================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    telegram_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(100),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    language VARCHAR(10) DEFAULT 'es',
    
    -- Recursos básicos
    coins BIGINT DEFAULT 3000 CHECK (coins >= 0),
    tickets INT DEFAULT 100 CHECK (tickets >= 0),
    energy INT DEFAULT 1500 CHECK (energy >= 0 AND energy <= 5000),
    max_energy INT DEFAULT 1500,
    
    -- Progreso
    level INT DEFAULT 1,
    xp INT DEFAULT 0,
    farm_level INT DEFAULT 1,
    
    -- Estadísticas
    total_planted INT DEFAULT 0,
    total_harvested INT DEFAULT 0,
    total_crows_collected INT DEFAULT 0,
    total_eggs_opened INT DEFAULT 0,
    total_ads_watched INT DEFAULT 0,
    total_money_spent DECIMAL(10,2) DEFAULT 0.00,
    
    -- Configuración
    settings JSONB DEFAULT '{
        "sound": true,
        "music": true,
        "volume": 0.7,
        "notifications": true,
        "vibration": true,
        "autoHarvest": false,
        "language": "auto"
    }'::jsonb,
    
    -- Seguridad
    is_admin BOOLEAN DEFAULT FALSE,
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_until TIMESTAMP,
    is_cooldown BOOLEAN DEFAULT FALSE,
    cooldown_until TIMESTAMP,
    last_integrity_check TIMESTAMP,
    integrity_checks_passed INT DEFAULT 0,
    integrity_checks_failed INT DEFAULT 0,
    
    -- Auditoría
    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    last_logout TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 2. CULTIVOS (PLANTACIONES ACTIVAS)
-- ============================================
CREATE TABLE crops (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    crop_type VARCHAR(20) NOT NULL,
    position_x INT NOT NULL CHECK (position_x >= 0 AND position_x <= 5),
    position_y INT NOT NULL CHECK (position_y >= 0 AND position_y <= 5),
    
    -- Tiempos (en segundos)
    planted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    grow_time_seconds INT NOT NULL,
    ready_at TIMESTAMP NOT NULL,
    
    -- Estado
    is_ready BOOLEAN DEFAULT FALSE,
    collected BOOLEAN DEFAULT FALSE,
    collected_at TIMESTAMP,
    
    -- Recompensas
    coins_reward INT,
    tickets_reward INT,
    xp_reward INT DEFAULT 10,
    
    -- Metadata
    session_id VARCHAR(50),
    device_info TEXT,
    
    CONSTRAINT unique_user_position UNIQUE(user_id, position_x, position_y)
);

-- ============================================
-- 3. CUERVOS COLECCIONADOS
-- ============================================
CREATE TABLE user_crows (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    crow_name VARCHAR(50) NOT NULL,
    crow_type VARCHAR(30) NOT NULL,
    rarity VARCHAR(15) NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    
    -- Atributos del cuervo (1-10)
    power INT DEFAULT 1 CHECK (power >= 1 AND power <= 10),
    speed INT DEFAULT 1 CHECK (speed >= 1 AND speed <= 10),
    luck INT DEFAULT 1 CHECK (luck >= 1 AND luck <= 10),
    level INT DEFAULT 1 CHECK (level >= 1 AND level <= 100),
    xp INT DEFAULT 0,
    
    -- Información de obtención
    obtained_from VARCHAR(20) CHECK (obtained_from IN ('egg', 'market', 'event', 'reward')),
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Para batallas
    battles_won INT DEFAULT 0,
    battles_lost INT DEFAULT 0,
    total_damage BIGINT DEFAULT 0,
    
    -- Mercado
    is_on_market BOOLEAN DEFAULT FALSE,
    market_price_coins INT,
    market_price_tickets INT,
    listed_at TIMESTAMP,
    sold_at TIMESTAMP,
    buyer_id INT REFERENCES users(id),
    
    -- Favoritos y equipamiento
    is_favorite BOOLEAN DEFAULT FALSE,
    is_equipped BOOLEAN DEFAULT FALSE,
    slot VARCHAR(20),
    
    -- Metadata
    generation INT DEFAULT 1,
    special_traits TEXT[],
    appearance_data JSONB
);

-- ============================================
-- 4. HUEVOS ECLOSIONADOS
-- ============================================
CREATE TABLE egg_hatches (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    
    -- Coste y resultado
    tickets_spent INT NOT NULL CHECK (tickets_spent >= 0),
    crow_obtained VARCHAR(50),
    crow_id INT REFERENCES user_crows(id),
    rarity_obtained VARCHAR(15) NOT NULL CHECK (rarity_obtained IN ('common', 'rare', 'epic', 'legendary')),
    
    -- Metadata
    hatched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_id VARCHAR(50),
    device_hash VARCHAR(100),
    
    -- Estadísticas
    hatch_number INT DEFAULT 1,
    consecutive_hatches INT DEFAULT 1,
    pity_counter INT DEFAULT 0
);

-- ============================================
-- 5. ANUNCIOS VISTOS
-- ============================================
CREATE TABLE ads_watched (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    ad_type VARCHAR(20) NOT NULL CHECK (ad_type IN ('banner', 'interstitial', 'rewarded')),
    ad_provider VARCHAR(30),
    ad_placement VARCHAR(50),
    
    -- Recompensa
    tickets_earned INT NOT NULL DEFAULT 10 CHECK (tickets_earned >= 0),
    coins_earned INT DEFAULT 0,
    
    -- Control de límites
    watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    watch_date DATE DEFAULT CURRENT_DATE,
    watch_hour INT DEFAULT EXTRACT(HOUR FROM CURRENT_TIMESTAMP),
    
    -- Metadata
    session_id VARCHAR(50),
    ad_duration INT,
    completed BOOLEAN DEFAULT TRUE
);

-- ============================================
-- 6. TRANSACCIONES DE PAGOS REALES
-- ============================================
CREATE TABLE real_payments (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    
    -- Información de pago
    payment_id VARCHAR(100) UNIQUE,
    provider VARCHAR(30) NOT NULL CHECK (provider IN ('stripe', 'paypal', 'telegram_stars', 'crypto')),
    provider_transaction_id VARCHAR(200),
    amount DECIMAL(10,2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(10) DEFAULT 'USD',
    exchange_rate DECIMAL(10,6) DEFAULT 1.0,
    
    -- Producto comprado
    product_type VARCHAR(30) NOT NULL CHECK (product_type IN ('tickets_pack', 'energy_boost', 'special_offer', 'subscription')),
    product_id VARCHAR(50),
    product_name VARCHAR(100),
    tickets_received INT NOT NULL CHECK (tickets_received >= 0),
    coins_received INT DEFAULT 0,
    
    -- Estado
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
    completed_at TIMESTAMP,
    refunded_at TIMESTAMP,
    
    -- Información del cliente
    customer_email VARCHAR(255),
    customer_country VARCHAR(2),
    ip_address INET,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 7. MERCADO (P2P)
-- ============================================
CREATE TABLE marketplace_listings (
    id SERIAL PRIMARY KEY,
    crow_id INT REFERENCES user_crows(id) ON DELETE CASCADE,
    seller_id INT REFERENCES users(id) ON DELETE CASCADE,
    
    -- Precio
    price_coins INT CHECK (price_coins >= 0),
    price_tickets INT CHECK (price_tickets >= 0),
    fixed_price BOOLEAN DEFAULT TRUE,
    min_offer_coins INT,
    min_offer_tickets INT,
    
    -- Estado de venta
    is_sold BOOLEAN DEFAULT FALSE,
    buyer_id INT REFERENCES users(id),
    sold_price_coins INT,
    sold_price_tickets INT,
    
    -- Tiempos
    listed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sold_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Visibilidad
    is_active BOOLEAN DEFAULT TRUE,
    is_featured BOOLEAN DEFAULT FALSE,
    views_count INT DEFAULT 0,
    offers_count INT DEFAULT 0,
    
    -- Comisiones
    platform_fee_percent DECIMAL(5,2) DEFAULT 5.00,
    platform_fee_coins INT DEFAULT 0,
    platform_fee_tickets INT DEFAULT 0,
    royalty_percent DECIMAL(5,2) DEFAULT 2.50,
    royalty_recipient_id INT REFERENCES users(id),
    
    -- Metadata
    listing_title VARCHAR(100),
    listing_description TEXT,
    tags TEXT[]
);

-- ============================================
-- 9. EVENTOS Y LOGROS
-- ============================================
CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    achievement_category VARCHAR(30) CHECK (achievement_category IN ('farming', 'collection', 'battle', 'economy', 'social', 'special')),
    
    -- Progreso
    progress_current INT DEFAULT 0 CHECK (progress_current >= 0),
    progress_target INT NOT NULL CHECK (progress_target > 0),
    is_completed BOOLEAN DEFAULT FALSE,
    completed_times INT DEFAULT 0,
    
    -- Recompensa
    reward_coins INT DEFAULT 0,
    reward_tickets INT DEFAULT 0,
    reward_crow_id INT REFERENCES user_crows(id),
    reward_item_type VARCHAR(30),
    
    -- Tiempos
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    last_progress_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Metadata
    achievement_data JSONB,
    
    UNIQUE(user_id, achievement_id)
);

-- ============================================
-- 10. SESIONES DE JUEGO (PARA ANALYTICS)
-- ============================================
CREATE TABLE game_sessions (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    session_uuid UUID DEFAULT gen_random_uuid(),
    
    -- Duración
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    duration_seconds INT CHECK (duration_seconds >= 0),
    
    -- Dispositivo y plataforma
    device_type VARCHAR(20) CHECK (device_type IN ('mobile', 'tablet', 'desktop')),
    platform VARCHAR(20) CHECK (platform IN ('telegram', 'web', 'android', 'ios')),
    os_version VARCHAR(50),
    app_version VARCHAR(20),
    
    -- Acciones realizadas
    crops_planted INT DEFAULT 0,
    crops_collected INT DEFAULT 0,
    eggs_hatched INT DEFAULT 0,
    ads_watched INT DEFAULT 0,
    battles_played INT DEFAULT 0,
    market_actions INT DEFAULT 0,
    
    -- Recursos ganados/gastados
    coins_earned INT DEFAULT 0,
    coins_spent INT DEFAULT 0,
    tickets_earned INT DEFAULT 0,
    tickets_spent INT DEFAULT 0,
    xp_earned INT DEFAULT 0,
    
    -- Rendimiento
    avg_fps INT,
    max_memory_mb INT,
    crashes_count INT DEFAULT 0,
    errors_count INT DEFAULT 0,
    
    -- Metadata
    ip_address INET,
    country_code VARCHAR(2),
    language_setting VARCHAR(10)
);

-- ============================================
-- 11. CONFIGURACIÓN DEL JUEGO (ADMIN)
-- ============================================
CREATE TABLE game_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(50) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    config_type VARCHAR(20) DEFAULT 'string' CHECK (config_type IN ('string', 'number', 'boolean', 'json', 'array')),
    description TEXT,
    category VARCHAR(30) DEFAULT 'general',
    is_public BOOLEAN DEFAULT TRUE,
    min_value TEXT,
    max_value TEXT,
    
    -- Control de cambios
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Versión
    version INT DEFAULT 1,
    deprecated BOOLEAN DEFAULT FALSE,
    deprecated_at TIMESTAMP
);

-- ============================================
-- 12. LOGS DE SEGURIDAD
-- ============================================
CREATE TABLE security_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    log_type VARCHAR(50) NOT NULL,
    log_level VARCHAR(10) NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error', 'critical')),
    message TEXT NOT NULL,
    details JSONB,
    
    -- Contexto
    ip_address INET,
    user_agent TEXT,
    device_hash VARCHAR(100),
    session_id VARCHAR(50),
    
    -- Ubicación
    country_code VARCHAR(2),
    region VARCHAR(100),
    city VARCHAR(100),
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMP
);

-- ============================================
-- 13. USUARIOS BLOQUEADOS
-- ============================================
CREATE TABLE blocked_users (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(100) NOT NULL,
    reason_details TEXT,
    block_type VARCHAR(20) NOT NULL CHECK (block_type IN ('temporary', 'permanent', 'shadow', 'cooldown')),
    blocked_by INT REFERENCES users(id),
    
    -- Tiempos
    blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMP,
    unblocked_at TIMESTAMP,
    
    -- Metadatos
    evidence JSONB,
    auto_block BOOLEAN DEFAULT FALSE,
    appeal_allowed BOOLEAN DEFAULT TRUE,
    appeal_deadline TIMESTAMP,
    
    -- Estadísticas
    previous_blocks_count INT DEFAULT 0,
    notes TEXT
);

-- ============================================
-- 14. ACTIVIDAD SOSPECHOSA
-- ============================================
CREATE TABLE suspicious_activity (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL,
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    details JSONB NOT NULL,
    
    -- Acciones tomadas
    action_taken VARCHAR(100),
    action_details JSONB,
    automated_action BOOLEAN DEFAULT FALSE,
    
    -- Contexto
    ip_address INET,
    device_fingerprint VARCHAR(200),
    request_path VARCHAR(500),
    request_method VARCHAR(10),
    request_body TEXT,
    
    -- Análisis
    confidence_score DECIMAL(5,2) CHECK (confidence_score >= 0 AND confidence_score <= 100),
    reviewed_by INT REFERENCES users(id),
    review_notes TEXT,
    false_positive BOOLEAN DEFAULT FALSE,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TIMESTAMP
);

-- ============================================
-- 15. LOGS DE ERRORES
-- ============================================
CREATE TABLE error_logs (
    id SERIAL PRIMARY KEY,
    error_code VARCHAR(50),
    error_type VARCHAR(50) CHECK (error_type IN ('client', 'server', 'database', 'network', 'security')),
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    
    -- Contexto
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    request_path VARCHAR(500),
    request_method VARCHAR(10),
    request_body TEXT,
    query_params JSONB,
    
    -- Entorno
    environment VARCHAR(20) DEFAULT 'production' CHECK (environment IN ('development', 'staging', 'production')),
    app_version VARCHAR(20),
    os_info TEXT,
    browser_info TEXT,
    
    -- Resolución
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by INT REFERENCES users(id),
    resolved_at TIMESTAMP,
    resolution_notes TEXT,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    occurrences_count INT DEFAULT 1
);

-- ============================================
-- 16. NOTIFICACIONES
-- ============================================
CREATE TABLE notifications (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(30) NOT NULL CHECK (notification_type IN ('system', 'game', 'market', 'social', 'promo')),
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    
    -- Estado
    is_read BOOLEAN DEFAULT FALSE,
    is_actioned BOOLEAN DEFAULT FALSE,
    priority INT DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
    
    -- Entrega
    delivery_method VARCHAR(20) DEFAULT 'in_app' CHECK (delivery_method IN ('in_app', 'push', 'email', 'telegram')),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at TIMESTAMP,
    actioned_at TIMESTAMP,
    
    -- Expiración
    expires_at TIMESTAMP,
    ttl_seconds INT DEFAULT 604800, -- 7 días
    
    -- Metadata
    sender_id INT REFERENCES users(id),
    campaign_id VARCHAR(50),
    tags TEXT[]
);

-- ============================================
-- 17. AMIGOS E INTERACCIONES SOCIALES
-- ============================================
CREATE TABLE friendships (
    id SERIAL PRIMARY KEY,
    user1_id INT REFERENCES users(id) ON DELETE CASCADE,
    user2_id INT REFERENCES users(id) ON DELETE CASCADE,
    
    -- Estado de la amistad
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'blocked')),
    requested_by INT REFERENCES users(id),
    
    -- Tiempos
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMP,
    rejected_at TIMESTAMP,
    
    -- Metadatos
    notes TEXT,
    
    -- Restricción: una amistad única por par de usuarios
    CONSTRAINT unique_friendship UNIQUE(user1_id, user2_id),
    CONSTRAINT no_self_friendship CHECK (user1_id != user2_id)
);



-- ============================================
-- 19. INVENTARIO DE ITEMS
-- ============================================
CREATE TABLE inventory_items (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    item_type VARCHAR(30) NOT NULL CHECK (item_type IN ('seed', 'fertilizer', 'tool', 'decoration', 'boost', 'consumable')),
    item_id VARCHAR(50) NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    
    -- Cantidad y estado
    quantity INT DEFAULT 1 CHECK (quantity >= 0),
    max_quantity INT DEFAULT 999,
    is_equipped BOOLEAN DEFAULT FALSE,
    slot VARCHAR(20),
    
    -- Atributos del item
    rarity VARCHAR(15) CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic')),
    level INT DEFAULT 1,
    durability INT,
    max_durability INT,
    
    -- Efectos y stats
    effects JSONB,
    stats JSONB,
    
    -- Metadata
    obtained_from VARCHAR(50),
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    
    -- Único por tipo para el usuario
    UNIQUE(user_id, item_type, item_id)
);
-- ============================================
-- 20. HISTORIAL DE TRANSACCIONES ECONÓMICAS
-- ============================================
CREATE TABLE economy_history (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN ('plant', 'harvest', 'hatch', 'ad_watch', 'purchase', 'market_sell', 'market_buy', 'battle_win', 'battle_loss', 'reward', 'penalty', 'admin_adjust')),
    
    -- Recursos involucrados
    coins_change INT NOT NULL,
    tickets_change INT NOT NULL,
    xp_change INT DEFAULT 0,
    
    -- Balance antes/después
    coins_before INT NOT NULL,
    coins_after INT NOT NULL,
    tickets_before INT NOT NULL,
    tickets_after INT NOT NULL,
    
    -- Contexto
    reference_id INT, -- ID de la tabla relacionada
    reference_table VARCHAR(50), -- Nombre de la tabla relacionada
    description TEXT,
    metadata JSONB,
    
    -- Auditoría
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    session_id VARCHAR(50),
    
    -- Verificación
    verified BOOLEAN DEFAULT TRUE,
    verification_hash VARCHAR(64)
);

-- ============================================
-- VISTAS ÚTILES
-- ============================================

-- Vista: Estadísticas de usuarios
CREATE OR REPLACE VIEW user_stats AS
SELECT 
    u.id,
    u.telegram_id,
    u.username,
    u.level,
    u.coins,
    u.tickets,
    u.total_crows_collected,
    u.total_eggs_opened,
    u.total_money_spent,
    COUNT(DISTINCT uc.id) as total_crows,
    COUNT(DISTINCT CASE WHEN uc.rarity = 'legendary' THEN uc.id END) as legendary_crows,
    COUNT(DISTINCT eh.id) as eggs_hatched,
    COUNT(DISTINCT aw.id) as ads_watched,
    COUNT(DISTINCT b.id) as battles_played,
    COUNT(DISTINCT CASE WHEN b.winner_id = u.id THEN b.id END) as battles_won,
    COALESCE(SUM(rp.amount), 0) as total_spent_usd
FROM users u
LEFT JOIN user_crows uc ON u.id = uc.user_id
LEFT JOIN egg_hatches eh ON u.id = eh.user_id
LEFT JOIN ads_watched aw ON u.id = aw.user_id
LEFT JOIN battles b ON u.id IN (b.player1_id, b.player2_id)
LEFT JOIN real_payments rp ON u.id = rp.user_id AND rp.status = 'completed'
GROUP BY u.id;

-- Vista: Cultivos listos para cosechar
CREATE OR REPLACE VIEW ready_to_harvest AS
SELECT 
    u.telegram_id,
    u.username,
    c.crop_type,
    COUNT(c.id) as ready_count,
    MIN(c.ready_at) as oldest_ready
FROM crops c
JOIN users u ON c.user_id = u.id
WHERE c.is_ready = TRUE 
AND c.collected = FALSE
GROUP BY u.telegram_id, u.username, c.crop_type;

-- Vista: Top jugadores por cuervos legendarios
CREATE OR REPLACE VIEW leaderboard_legendary AS
SELECT 
    u.username,
    COUNT(uc.id) as legendary_count,
    u.level,
    u.coins,
    ROW_NUMBER() OVER (ORDER BY COUNT(uc.id) DESC, u.level DESC, u.coins DESC) as rank
FROM users u
JOIN user_crows uc ON u.id = uc.user_id
WHERE uc.rarity = 'legendary'
AND u.is_blocked = FALSE
GROUP BY u.id
ORDER BY legendary_count DESC, u.level DESC, u.coins DESC;

-- Vista: Market activo
CREATE OR REPLACE VIEW active_market_listings AS
SELECT 
    ml.id,
    ml.crow_id,
    ml.seller_id,
    u.username as seller_name,
    uc.crow_name,
    uc.rarity,
    uc.level,
    ml.price_coins,
    ml.price_tickets,
    ml.listed_at,
    ml.expires_at
FROM marketplace_listings ml
JOIN users u ON ml.seller_id = u.id
JOIN user_crows uc ON ml.crow_id = uc.id
WHERE ml.is_active = TRUE
AND ml.is_sold = FALSE
AND (ml.expires_at IS NULL OR ml.expires_at > CURRENT_TIMESTAMP)
ORDER BY 
    CASEis_featured THEN 0 ELSE 1 END,
    ml.listed_at DESC;

-- Vista: Estadísticas de seguridad diarias
CREATE OR REPLACE VIEW daily_security_stats AS
SELECT 
    DATE(created_at) as date,
    log_level,
    COUNT(*) as count,
    COUNT(DISTINCT user_id) as affected_users,
    COUNT(DISTINCT ip_address) as unique_ips
FROM security_logs
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at), log_level
ORDER BY date DESC, log_level;

-- Vista: Economía del juego (resumen diario)
CREATE OR REPLACE VIEW daily_economy_summary AS
SELECT 
    DATE(created_at) as date,
    SUM(CASE WHEN coins_change > 0 THEN coins_change ELSE 0 END) as coins_injected,
    SUM(CASE WHEN coins_change < 0 THEN ABS(coins_change) ELSE 0 END) as coins_sinked,
    SUM(CASE WHEN tickets_change > 0 THEN tickets_change ELSE 0 END) as tickets_injected,
    SUM(CASE WHEN tickets_change < 0 THEN ABS(tickets_change) ELSE 0 END) as tickets_sinked,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) as transactions_count
FROM economy_history
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
-- ============================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================

-- Usuarios
CREATE INDEX idx_users_telegram ON users(telegram_id);
CREATE INDEX idx_users_last_active ON users(last_active DESC);
CREATE INDEX idx_users_level ON users(level DESC);
CREATE INDEX idx_users_coins ON users(coins DESC);
CREATE INDEX idx_users_is_blocked ON users(is_blocked) WHERE is_blocked = TRUE;

-- Cultivos
CREATE INDEX idx_crops_user_ready ON crops(user_id, is_ready) WHERE NOT collected;
CREATE INDEX idx_crops_ready_at ON crops(ready_at) WHERE NOT collected AND NOT is_ready;
CREATE INDEX idx_crops_user_collected ON crops(user_id, collected);
CREATE INDEX idx_crops_planted_at ON crops(planted_at DESC);

-- Cuervos
CREATE INDEX idx_crows_user_rarity ON user_crows(user_id, rarity);
CREATE INDEX idx_crows_market ON user_crows(is_on_market) WHERE is_on_market = TRUE;
CREATE INDEX idx_crows_rarity_level ON user_crows(rarity, level DESC);
CREATE INDEX idx_crows_obtained_at ON user_crows(obtained_at DESC);

-- Market
CREATE INDEX idx_market_active ON marketplace_listings(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_market_price_coins ON marketplace_listings(price_coins) WHERE is_active = TRUE AND price_coins IS NOT NULL;
CREATE INDEX idx_market_price_tickets ON marketplace_listings(price_tickets) WHERE is_active = TRUE AND price_tickets IS NOT NULL;
CREATE INDEX idx_market_seller ON marketplace_listings(seller_id, listed_at DESC);
CREATE INDEX idx_market_expires ON marketplace_listings(expires_at) WHERE is_active = TRUE AND expires_at IS NOT NULL;

-- Batallas
CREATE INDEX idx_battles_players ON battles(player1_id, player2_id);
CREATE INDEX idx_battles_winner ON battles(winner_id);
CREATE INDEX idx_battles_started_at ON battles(started_at DESC);
CREATE INDEX idx_battles_type ON battles(battle_type);

-- Transacciones
CREATE INDEX idx_payments_user ON real_payments(user_id, created_at DESC);
CREATE INDEX idx_payments_status ON real_payments(status);
CREATE INDEX idx_payments_provider ON payments(provider, provider_transaction_id);

-- Seguridad
CREATE INDEX idx_security_logs_user ON security_logs(user_id, created_at DESC);
CREATE INDEX idx_security_logs_type ON security_logs(log_type, created_at DESC);
CREATE INDEX idx_security_logs_level ON security_logs(log_level, created_at DESC) WHERE log_level IN ('error', 'critical');
CREATE INDEX idx_blocked_users_active ON blocked_users(user_id) WHERE blocked_until > CURRENT_TIMESTAMP OR blocked_until IS NULL;
CREATE INDEX idx_suspicious_activity_user ON suspicious_activity(user_id, created_at DESC);
CREATE INDEX idx_suspicious_activity_severity ON suspicious_activity(severity, created_at DESC) WHERE severity IN ('high', 'critical');

-- Analytics
CREATE INDEX idx_sessions_user ON game_sessions(user_id, start_time DESC);
CREATE INDEX idx_sessions_duration ON game_sessions(duration_seconds) WHERE duration_seconds > 60;
CREATE INDEX idx_ads_user_date ON ads_watched(user_id, watch_date DESC);
CREATE INDEX idx_hatches_user ON egg_hatches(user_id, hatched_at DESC);

-- Economía
CREATE INDEX idx_economy_user ON economy_history(user_id, created_at DESC);
CREATE INDEX idx_economy_type ON economy_history(transaction_type, created_at DESC);

-- Notificaciones
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;
CREATE INDEX idx_notifications_expires ON notifications(expires_at) WHERE expires_at IS NOT NULL;



-- ============================================
-- FUNCIONES DE BASE DE DATOS
-- ============================================

-- Función: Refrescar energía diaria
CREATE OR REPLACE FUNCTION refresh_daily_energy()
RETURNS TRIGGER AS $$
BEGIN
    -- Si ha pasado más de 24 horas desde el último refresh
    IF NEW.last_active < CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN
        NEW.energy := NEW.max_energy;
        NEW.last_active := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para refrescar energía
CREATE TRIGGER check_energy_refresh
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION refresh_daily_energy();

-- Función: Verificar límite diario de anuncios
CREATE OR REPLACE FUNCTION check_daily_ads_limit()
RETURNS TRIGGER AS $$
DECLARE
    ads_today INT;
    max_ads INT;
BEGIN
    -- Obtener límite de anuncios desde config
    SELECT config_value::INT INTO max_ads 
    FROM game_config 
    WHERE config_key = 'ads_per_day_limit';
    
    -- Valor por defecto si no existe
    IF max_ads IS NULL THEN
        max_ads := 10;
    END IF;
    
    -- Contar anuncios hoy para este usuario
    SELECT COUNT(*) INTO ads_today
    FROM ads_watched
    WHERE user_id = NEW.user_id 
    AND watch_date = CURRENT_DATE;
    
    -- Verificar límite (contando el nuevo)
    IF ads_today >= max_ads THEN
        RAISE EXCEPTION 'Límite diario de anuncios alcanzado (%)', max_ads;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para límite de anuncios
CREATE TRIGGER enforce_ads_limit
BEFORE INSERT ON ads_watched
FOR EACH ROW
EXECUTE FUNCTION check_daily_ads_limit();

-- Función: Actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_game_config_updated_at BEFORE UPDATE ON game_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_real_payments_updated_at BEFORE UPDATE ON real_payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tournaments_updated_at BEFORE UPDATE ON tournaments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función: Calcular edad de la cuenta en días
CREATE OR REPLACE FUNCTION account_age_days(user_id INT)
RETURNS INT AS $$
DECLARE
    age_days INT;
BEGIN
    SELECT EXTRACT(DAY FROM (CURRENT_TIMESTAMP - created_at)) INTO age_days
    FROM users WHERE id = user_id;
    
    RETURN COALESCE(age_days, 0);
END;
$$ LANGUAGE plpgsql;

-- Función: Obtener balance total en USD aproximado
CREATE OR REPLACE FUNCTION get_user_balance_usd(user_id INT)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    coins_value DECIMAL(10,2);
    tickets_value DECIMAL(10,2);
    real_money DECIMAL(10,2);
BEGIN
    -- Valor aproximado: 1000 monedas = $1, 100 tickets = $1
    SELECT COALESCE(coins, 0) / 1000.0 INTO coins_value FROM users WHERE id = user_id;
    SELECT COALESCE(tickets, 0) / 100.0 INTO tickets_value FROM users WHERE id = user_id;
    SELECT COALESCE(SUM(amount), 0) INTO real_money FROM real_payments WHERE user_id = user_id AND status = 'completed';
    
    RETURN COALESCE(coins_value, 0) + COALESCE(tickets_value, 0) + COALESCE(real_money, 0);
END;
$$ LANGUAGE plpgsql;

-- Función: Generar reporte de usuario para admin
CREATE OR REPLACE FUNCTION generate_user_report(user_id INT)
RETURNS TABLE(
    username VARCHAR,
    level INT,
    total_coins BIGINT,
    total_tickets INT,
    crows_count BIGINT,
    legendary_crows BIGINT,
    eggs_opened BIGINT,
    ads_watched BIGINT,
    money_spent DECIMAL,
    account_age_days INT,
    last_active TIMESTAMP,
    is_blocked BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.username,
        u.level,
        u.coins,
        u.tickets,
        COUNT(uc.id),
        COUNT(CASE WHEN uc.rarity = 'legendary' THEN 1 END),
        u.total_eggs_opened,
        u.total_ads_watched,
        u.total_money_spent,
        account_age_days(user_id),
        u.last_active,
        u.is_blocked
    FROM users u
    LEFT JOIN user_crows uc ON u.id = uc.user_id
    WHERE u.id = user_id
    GROUP BY u.id;
END;
$$ LANGUAGE plpgsql;

-- Función: Limpiar datos antiguos (mantenimiento)
CREATE OR REPLACE FUNCTION cleanup_old_data(days_to_keep INT DEFAULT 30)
RETURNS TABLE(
    table_name VARCHAR,
    deleted_count BIGINT
) AS $$
DECLARE
    cutoff_date TIMESTAMP := CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL;
BEGIN
    -- Limpiar sesiones antiguas
    DELETE FROM game_sessions WHERE end_time < cutoff_date;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    table_name := 'game_sessions';
    RETURN NEXT;
    
    -- Limpiar logs de seguridad antiguos (excepto errores/críticos)
    DELETE FROM security_logs 
    WHERE created_at < cutoff_date 
    AND log_level NOT IN ('error', 'critical');
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    table_name := 'security_logs';
    RETURN NEXT;
    
    -- Limpiar notificaciones leídas y expiradas
    DELETE FROM notifications 
    WHERE (is_read = TRUE AND read_at < cutoff_date - INTERVAL '7 days')
    OR (expires_at IS NOT NULL AND expires_at < CURRENT_TIMESTAMP);
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    table_name := 'notifications';
    RETURN NEXT;
    
    -- Limpiar cultivos cosechados antiguos
    DELETE FROM crops 
    WHERE collected = TRUE 
    AND collected_at < cutoff_date;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    table_name := 'crops';
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql
-- ============================================
-- INSERTAR CONFIGURACIÓN INICIAL
-- ============================================
INSERT INTO game_config (config_key, config_value, config_type, description, category) VALUES
-- Economía
('energy_per_day', '1500', 'number', 'Energía diaria base', 'economy'),
('energy_refresh_hours', '24', 'number', 'Horas para refrescar energía', 'economy'),
('egg_cost_tickets', '500', 'number', 'Tickets necesarios para eclosionar huevo', 'economy'),
('ads_per_day_limit', '10', 'number', 'Límite de anuncios por día', 'economy'),
('ads_tickets_reward', '10', 'number', 'Tickets por anuncio visto', 'economy'),
('max_coins', '999999999', 'number', 'Máximo de monedas por usuario', 'economy'),
('max_tickets', '999999', 'number', 'Máximo de tickets por usuario', 'economy'),
('max_energy', '5000', 'number', 'Energía máxima', 'economy'),

-- Cultivos
('crop_trigo_grow_time', '10', 'number', 'Tiempo de crecimiento trigo (segundos)', 'crops'),
('crop_trigo_coins', '10', 'number', 'Monedas por trigo', 'crops'),
('crop_trigo_ticket_chance', '20', 'number', '% chance de ticket por trigo', 'crops'),

('crop_maiz_grow_time', '30', 'number', 'Tiempo de crecimiento maíz (segundos)', 'crops'),
('crop_maiz_coins', '50', 'number', 'Monedas por maíz', 'crops'),
('crop_maiz_ticket_chance', '25', 'number', '% chance de ticket por maíz', 'crops'),

('crop_calabaza_grow_time', '60', 'number', 'Tiempo de crecimiento calabaza (segundos)', 'crops'),
('crop_calabaza_coins', '200', 'number', 'Monedas por calabaza', 'crops'),
('crop_calabaza_ticket_chance', '30', 'number', '% chance de ticket por calabaza', 'crops'),

('crop_hongo_grow_time', '120', 'number', 'Tiempo de crecimiento hongo (segundos)', 'crops'),
('crop_hongo_coins', '1000', 'number', 'Monedas por hongo', 'crops'),
('crop_hongo_ticket_chance', '40', 'number', '% chance de ticket por hongo', 'crops'),

-- Huevos (probabilidades en %)
('egg_common_chance', '70', 'number', 'Probabilidad cuervo común', 'eggs'),
('egg_rare_chance', '20', 'number', 'Probabilidad cuervo raro', 'eggs'),
('egg_epic_chance', '7', 'number', 'Probabilidad cuervo épico', 'eggs'),
('egg_legendary_chance', '3', 'number', 'Probabilidad cuervo legendário', 'eggs'),

-- Suministros limitados
('crow_hielo_total', '50000', 'number', 'Total cuervos de hielo disponibles', 'crows'),
('crow_pirata_total', '30000', 'number', 'Total cuervos pirata disponibles', 'crows'),
('crow_elfico_total', '10000', 'number', 'Total cuervos élficos disponibles', 'crows'),
('crow_anillo_total', '5000', 'number', 'Total cuervos anillo disponibles', 'crows'),
('crow_alien_total', '1000', 'number', 'Total cuervos alien disponibles', 'crows'),
('crow_golem_total', '2500', 'number', 'Total cuervos golem disponibles', 'crows'),

-- Precios de paquetes (USD)
('pack_basic_price', '0.99', 'number', 'Precio paquete básico (USD)', 'shop'),
('pack_basic_tickets', '600', 'number', 'Tickets paquete básico', 'shop'),
('pack_medium_price', '2.99', 'number', 'Precio paquete medio (USD)', 'shop'),
('pack_medium_tickets', '1800', 'number', 'Tickets paquete medio', 'shop'),
('pack_premium_price', '5.99', 'number', 'Precio paquete premium (USD)', 'shop'),
('pack_premium_tickets', '4000', 'number', 'Tickets paquete premium', 'shop'),
('pack_ultimate_price', '12.99', 'number', 'Precio paquete ultimate (USD)', 'shop'),
('pack_ultimate_tickets', '10000', 'number', 'Tickets paquete ultimate', 'shop'),

-- Seguridad
('max_requests_per_minute', '60', 'number', 'Máximo de peticiones por minuto', 'security'),
('max_actions_per_second', '10', 'number', 'Máximo de acciones por segundo', 'security'),
('cooldown_cheat_detection', '5000', 'number', 'Cooldown tras detección de trampas (ms)', 'security'),
('temp_block_duration', '3600000', 'number', 'Duración bloqueo temporal (ms)', 'security'),
('rate_limit_window', '60000', 'number', 'Ventana de rate limiting (ms)', 'security'),

-- Juego
('game_version', '1.0.0', 'string', 'Versión actual del juego', 'system'),
('maintenance_mode', 'false', 'boolean', 'Modo mantenimiento activo', 'system'),
('new_registrations', 'true', 'boolean', 'Permitir nuevos registros', 'system'),
('telegram_bot_username', 'CrowFarmerBot', 'string', 'Username del bot de Telegram', 'system');

-- ============================================
-- POLÍTICAS RLS (ROW LEVEL SECURITY) PARA SUPABASE
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_crows ENABLE ROW LEVEL SECURITY;
ALTER TABLE egg_hatches ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads_watched ENABLE ROW LEVEL SECURITY;
ALTER TABLE real_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE suspicious_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE economy_history ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (para producción ajustar según necesidades)
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (telegram_id = current_user OR is_admin = TRUE);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (telegram_id = current_user OR is_admin = TRUE);

CREATE POLICY "Users can manage own crops" ON crops FOR ALL USING (user_id IN (SELECT id FROM users WHERE telegram_id = current_user) OR (SELECT is_admin FROM users WHERE telegram_id = current_user));

CREATE POLICY "Users can manage own crows" ON user_crows FOR ALL USING (user_id IN (SELECT id FROM users WHERE telegram_id = current_user) OR (SELECT is_admin FROM users WHERE telegram_id = current_user));

CREATE POLICY "Public can view active market listings" ON marketplace_listings FOR SELECT USING (is_active = TRUE AND is_sold = FALSE);
CREATE POLICY "Users can manage own market listings" ON marketplace_listings FOR ALL USING (seller_id IN (SELECT id FROM users WHERE telegram_id = current_user) OR (SELECT is_admin FROM users WHERE telegram_id = current_user));

CREATE POLICY "Public can view leaderboard" ON users FOR SELECT USING (is_blocked = FALSE);
CREATE POLICY "Admins can view all security data" ON security_logs FOR SELECT USING ((SELECT is_admin FROM users WHERE telegram_id = current_user) = TRUE);
