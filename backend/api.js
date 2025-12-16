const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const CONSTANTS = require('../shared/constants');

// Configurar Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware para validar usuario
const validateUser = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'] || req.body.userId;
        
        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }
        
        // Validar formato del ID
        if (!CONSTANTS.SECURITY.USER_ID_REGEX.test(userId)) {
            return res.status(400).json({ error: 'ID de usuario inválido' });
        }
        
        // Buscar usuario
        const { data: user, error } = await supabase
            .from('users')
            .select('id, telegram_id, username, coins, tickets, energy, level, xp, is_blocked')
            .eq('telegram_id', userId)
            .single();
        
        if (error) {
            // Si no existe, crearlo
            const newUser = {
                telegram_id: userId,
                coins: CONSTANTS.ECONOMY.STARTING_COINS,
                tickets: CONSTANTS.ECONOMY.STARTING_TICKETS,
                energy: CONSTANTS.ECONOMY.STARTING_ENERGY,
                level: 1,
                xp: 0,
                created_at: new Date().toISOString()
            };
            
            const { data: createdUser, error: createError } = await supabase
                .from('users')
                .insert([newUser])
                .select()
                .single();
            
            if (createError) throw createError;
            
            req.userId = userId;
            req.userData = createdUser;
        } else {
            if (user.is_blocked) {
                return res.status(403).json({ error: 'Cuenta bloqueada temporalmente' });
            }
            
            req.userId = userId;
            req.userData = user;
        }
        
        next();
    } catch (error) {
        console.error('Error en validación de usuario:', error);
        res.status(500).json({ error: 'Error de autenticación' });
    }
};

// Middleware para verificar recursos
const validateResources = (req, res, next) => {
    const { coins, tickets, energy } = req.body;
    
    if (coins !== undefined) {
        if (coins < 0 || coins > CONSTANTS.SECURITY.MAX_COINS) {
            return res.status(400).json({ error: 'Cantidad de monedas inválida' });
        }
    }
    
    if (tickets !== undefined) {
        if (tickets < 0 || tickets > CONSTANTS.SECURITY.MAX_TICKETS) {
            return res.status(400).json({ error: 'Cantidad de tickets inválida' });
        }
    }
    
    if (energy !== undefined) {
        if (energy < 0 || energy > CONSTANTS.ECONOMY.MAX_ENERGY) {
            return res.status(400).json({ error: 'Cantidad de energía inválida' });
        }
    }
    
    next();
};

// ============================================
// ENDPOINTS DE USUARIO
// ============================================

// Obtener usuario
router.get('/user/:telegramId', async (req, res) => {
    try {
        const { telegramId } = req.params;
        
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', telegramId)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                // Crear usuario si no existe
                const newUser = {
                    telegram_id: telegramId,
                    coins: CONSTANTS.ECONOMY.STARTING_COINS,
                    tickets: CONSTANTS.ECONOMY.STARTING_TICKETS,
                    energy: CONSTANTS.ECONOMY.STARTING_ENERGY,
                    level: 1,
                    xp: 0,
                    created_at: new Date().toISOString()
                };
                
                const { data: createdUser, error: createError } = await supabase
                    .from('users')
                    .insert([newUser])
                    .select()
                    .single();
                
                if (createError) throw createError;
                
                return res.json(createdUser);
            }
            throw error;
        }
        
        res.json(user);
    } catch (error) {
        console.error('Error en GET /user:', error);
        res.status(500).json({ error: 'Error obteniendo usuario' });
    }
});

// Actualizar usuario
router.post('/user/update', validateUser, validateResources, async (req, res) => {
    try {
        const updates = req.body;
        delete updates.id; // No permitir actualizar ID
        
        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('telegram_id', req.userId)
            .select()
            .single();
        
        if (error) throw error;
        
        res.json({ success: true, user: data });
    } catch (error) {
        console.error('Error en POST /user/update:', error);
        res.status(500).json({ error: 'Error actualizando usuario' });
    }
});

// ============================================
// ENDPOINTS DE CULTIVOS
// ============================================

// Obtener cultivos del usuario
router.get('/crops/:userId', validateUser, async (req, res) => {
    try {
        const { userId } = req.params;
        
        const { data: crops, error } = await supabase
            .from('crops')
            .select('*')
            .eq('user_id', req.userData.id)
            .eq('collected', false)
            .order('planted_at', { ascending: true });
        
        if (error) throw error;
        
        res.json(crops || []);
    } catch (error) {
        console.error('Error en GET /crops:', error);
        res.status(500).json({ error: 'Error obteniendo cultivos' });
    }
});

// Plantar cultivo
router.post('/crops', validateUser, async (req, res) => {
    try {
        const { plotIndex, cropType, plantedAt, readyAt } = req.body;
        
        // Validar tipo de cultivo
        const validCrops = ['trigo', 'maiz', 'calabaza', 'hongo'];
        if (!validCrops.includes(cropType)) {
            return res.status(400).json({ error: 'Tipo de cultivo inválido' });
        }
        
        // Calcular posición
        const positionX = plotIndex % 3;
        const positionY = Math.floor(plotIndex / 3);
        
        // Crear cultivo
        const cropData = {
            user_id: req.userData.id,
            crop_type: cropType,
            position_x: positionX,
            position_y: positionY,
            planted_at: plantedAt,
            grow_time_seconds: getGrowTime(cropType),
            ready_at: readyAt,
            is_ready: false,
            collected: false
        };
        
        const { data, error } = await supabase
            .from('crops')
            .insert([cropData])
            .select()
            .single();
        
        if (error) throw error;
        
        // Actualizar estadísticas del usuario
        await supabase
            .from('users')
            .update({
                total_planted: supabase.rpc('increment', {
                    x: 1,
                    row_id: req.userData.id,
                    column_name: 'total_planted'
                }),
                energy: req.userData.energy - 1
            })
            .eq('id', req.userData.id);
        
        res.json({ success: true, crop: data });
    } catch (error) {
        console.error('Error en POST /crops:', error);
        res.status(500).json({ error: 'Error plantando cultivo' });
    }
});

// Cosechar cultivo
router.post('/harvest', validateUser, async (req, res) => {
    try {
        const { plotIndex, coins, tickets } = req.body;
        
        // Calcular posición
        const positionX = plotIndex % 3;
        const positionY = Math.floor(plotIndex / 3);
        
        // Actualizar cultivo como cosechado
        const { error: cropError } = await supabase
            .from('crops')
            .update({ 
                collected: true,
                collected_at: new Date().toISOString(),
                coins_reward: coins,
                tickets_reward: tickets
            })
            .eq('user_id', req.userData.id)
            .eq('position_x', positionX)
            .eq('position_y', positionY)
            .eq('collected', false);
        
        if (cropError) throw cropError;
        
        // Actualizar usuario
        const { error: userError } = await supabase
            .from('users')
            .update({
                coins: req.userData.coins + coins,
                tickets: req.userData.tickets + tickets,
                xp: req.userData.xp + 10,
                total_planted: supabase.rpc('increment', {
                    x: 1,
                    row_id: req.userData.id,
                    column_name: 'total_harvested'
                })
            })
            .eq('id', req.userData.id);
        
        if (userError) throw userError;
        
        // Verificar nivel
        await checkLevelUp(req.userData.id);
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error en POST /harvest:', error);
        res.status(500).json({ error: 'Error cosechando cultivo' });
    }
});

// ============================================
// ENDPOINTS DE CUERVOS
// ============================================

// Obtener cuervos del usuario
router.get('/crows/:userId', validateUser, async (req, res) => {
    try {
        const { data: crows, error } = await supabase
            .from('user_crows')
            .select('*')
            .eq('user_id', req.userData.id)
            .order('obtained_at', { ascending: false });
        
        if (error) throw error;
        
        res.json(crows || []);
    } catch (error) {
        console.error('Error en GET /crows:', error);
        res.status(500).json({ error: 'Error obteniendo cuervos' });
    }
});

// Guardar cuervo obtenido
router.post('/crows', validateUser, async (req, res) => {
    try {
        const { name, type, rarity, power, speed, luck, obtainedAt } = req.body;
        
        // Validar rareza
        const validRarities = ['common', 'rare', 'epic', 'legendary'];
        if (!validRarities.includes(rarity)) {
            return res.status(400).json({ error: 'Rareza inválida' });
        }
        
        // Crear cuervo
        const crowData = {
            user_id: req.userData.id,
            crow_name: name,
            crow_type: type,
            rarity: rarity,
            power: power || 1,
            speed: speed || 1,
            luck: luck || 1,
            level: 1,
            obtained_from: 'egg',
            obtained_at: obtainedAt || new Date().toISOString()
        };
        
        const { data, error } = await supabase
            .from('user_crows')
            .insert([crowData])
            .select()
            .single();
        
        if (error) throw error;
        
        // Actualizar estadísticas del usuario
        await supabase
            .from('users')
            .update({
                total_crows_collected: supabase.rpc('increment', {
                    x: 1,
                    row_id: req.userData.id,
                    column_name: 'total_crows_collected'
                })
            })
            .eq('id', req.userData.id);
        
        res.json({ success: true, crow: data });
    } catch (error) {
        console.error('Error en POST /crows:', error);
        res.status(500).json({ error: 'Error guardando cuervo' });
    }
});

// ============================================
// ENDPOINTS DE HUEVOS
// ============================================

// Obtener eclosiones del usuario
router.get('/hatches/:userId', validateUser, async (req, res) => {
    try {
        const { data: hatches, error } = await supabase
            .from('egg_hatches')
            .select('*')
            .eq('user_id', req.userData.id)
            .order('hatched_at', { ascending: false })
            .limit(10);
        
        if (error) throw error;
        
        res.json(hatches || []);
    } catch (error) {
        console.error('Error en GET /hatches:', error);
        res.status(500).json({ error: 'Error obteniendo eclosiones' });
    }
});

// Registrar eclosión
router.post('/hatches', validateUser, async (req, res) => {
    try {
        const { ticketsSpent, crowObtained, rarityObtained } = req.body;
        
        // Validar tickets gastados
        if (ticketsSpent < 0 || ticketsSpent > 10000) {
            return res.status(400).json({ error: 'Cantidad de tickets inválida' });
        }
        
        const hatchData = {
            user_id: req.userData.id,
            tickets_spent: ticketsSpent,
            crow_obtained: crowObtained,
            rarity_obtained: rarityObtained,
            hatched_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
            .from('egg_hatches')
            .insert([hatchData])
            .select()
            .single();
        
        if (error) throw error;
        
        // Descontar tickets del usuario
        await supabase
            .from('users')
            .update({
                tickets: req.userData.tickets - ticketsSpent
            })
            .eq('id', req.userData.id);
        
        res.json({ success: true, hatch: data });
    } catch (error) {
        console.error('Error en POST /hatches:', error);
        res.status(500).json({ error: 'Error registrando eclosión' });
    }
});

// ============================================
// ENDPOINTS DE ANUNCIOS
// ============================================

// Registrar anuncio visto
router.post('/ads', validateUser, async (req, res) => {
    try {
        const { reward, watchedAt } = req.body;
        
        // Validar recompensa
        if (reward < 0 || reward > 100) {
            return res.status(400).json({ error: 'Recompensa inválida' });
        }
        
        const adData = {
            user_id: req.userData.id,
            ad_type: 'rewarded',
            tickets_earned: reward,
            watched_at: watchedAt || new Date().toISOString(),
            watch_date: new Date().toISOString().split('T')[0]
        };
        
        const { data, error } = await supabase
            .from('ads_watched')
            .insert([adData])
            .select()
            .single();
        
        if (error) throw error;
        
        // Añadir tickets al usuario
        await supabase
            .from('users')
            .update({
                tickets: req.userData.tickets + reward,
                total_ads_watched: supabase.rpc('increment', {
                    x: 1,
                    row_id: req.userData.id,
                    column_name: 'total_ads_watched'
                })
            })
            .eq('id', req.userData.id);
        
        res.json({ success: true, ad: data });
    } catch (error) {
        console.error('Error en POST /ads:', error);
        res.status(500).json({ error: 'Error registrando anuncio' });
    }
});

// ============================================
// ENDPOINTS DE TRANSACCIONES
// ============================================

// Registrar transacción
router.post('/transactions', validateUser, async (req, res) => {
    try {
        const { product, tickets, price } = req.body;
        
        const transactionData = {
            user_id: req.userData.id,
            product_type: product,
            tickets_received: tickets,
            amount: price,
            currency: 'USD',
            status: 'completed',
            completed_at: new Date().toISOString()
        };
        
        const { data, error } = await supabase
            .from('real_payments')
            .insert([transactionData])
            .select()
            .single();
        
        if (error) throw error;
        
        // Añadir tickets al usuario
        await supabase
            .from('users')
            .update({
                tickets: req.userData.tickets + tickets,
                total_money_spent: supabase.rpc('increment', {
                    x: price,
                    row_id: req.userData.id,
                    column_name: 'total_money_spent'
                })
            })
            .eq('id', req.userData.id);
        
        res.json({ success: true, transaction: data });
    } catch (error) {
        console.error('Error en POST /transactions:', error);
        res.status(500).json({ error: 'Error registrando transacción' });
    }
});

// ============================================
// ENDPOINTS DE RANKING
// ============================================

// Obtener ranking
router.get('/leaderboard', async (req, res) => {
    try {
        const { data: users, error } = await supabase
            .from('users')
            .select('username, level, total_crows_collected, coins, created_at')
            .order('level', { ascending: false })
            .order('total_crows_collected', { ascending: false })
            .limit(100);
        
        if (error) throw error;
        
        res.json(users || []);
    } catch (error) {
        console.error('Error en GET /leaderboard:', error);
        res.status(500).json({ error: 'Error obteniendo ranking' });
    }
});

// ============================================
// ENDPOINTS DE OFERTAS
// ============================================

// Obtener ofertas especiales
router.get('/offers', async (req, res) => {
    // Ofertas de ejemplo (en producción vendrían de la BD)
    const offers = [
        {
            id: 1,
            name: 'Oferta de Lanzamiento',
            description: '¡Doble tickets por tiempo limitado!',
            originalPrice: 4.99,
            discountedPrice: 2.49,
            tickets: 1200,
            featured: true,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
            id: 2,
            name: 'Pack Granjero Pro',
            description: 'Incluye energía extra y amuleto de suerte',
            originalPrice: 9.99,
            discountedPrice: 6.99,
            tickets: 2500,
            featured: false,
            expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
        }
    ];
    
    res.json(offers);
});

// ============================================
// FUNCIONES AUXILIARES
// ============================================

// Obtener tiempo de crecimiento
function getGrowTime(cropType) {
    const growTimes = {
        trigo: 10,
        maiz: 30,
        calabaza: 60,
        hongo: 120
    };
    return growTimes[cropType] || 10;
}

// Verificar subida de nivel
async function checkLevelUp(userId) {
    try {
        const { data: user } = await supabase
            .from('users')
            .select('level, xp')
            .eq('id', userId)
            .single();
        
        if (!user) return;
        
        const xpNeeded = user.level * 1000;
        
        if (user.xp >= xpNeeded) {
            const newLevel = user.level + 1;
            const remainingXP = user.xp - xpNeeded;
            
                // Recompensa por subir de nivel
            const levelReward = CONSTANTS.ECONOMY.LEVEL_REWARDS[newLevel] || 
                               { coins: newLevel * 100, tickets: newLevel * 10 };
            
            await supabase
                .from('users')
                .update({
                    level: newLevel,
                    xp: remainingXP,
                    coins: supabase.rpc('increment', {
                        x: levelReward.coins,
                        row_id: userId,
                        column_name: 'coins'
                    }),
                    tickets: supabase.rpc('increment', {
                        x: levelReward.tickets,
                        row_id: userId,
                        column_name: 'tickets'
                    }),
                    energy: CONSTANTS.ECONOMY.MAX_ENERGY
                })
                .eq('id', userId);
        }
    } catch (error) {
        console.error('Error en checkLevelUp:', error);
    }
}

module.exports = router;
  
