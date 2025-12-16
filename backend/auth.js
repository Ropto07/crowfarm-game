// Sistema de autenticación y autorización - Crow Farmer

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
const CONSTANTS = require('../shared/constants');

// Configurar Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Clave secreta para JWT
const JWT_SECRET = process.env.JWT_SECRET || 'crow-farmer-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d'; // 7 días

// Middleware para verificar JWT
const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
        return res.status(401).json({ error: 'Token de autenticación requerido' });
    }
    
    const token = authHeader.split(' ')[1]; // Formato: Bearer <token>
    
    if (!token) {
        return res.status(401).json({ error: 'Formato de token inválido' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado' });
        }
        return res.status(403).json({ error: 'Token inválido' });
    }
};

// Middleware para verificar permisos de administrador
const requireAdmin = async (req, res, next) => {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }
        
        const { data: user } = await supabase
            .from('users')
            .select('is_admin')
            .eq('telegram_id', req.user.userId)
            .single();
        
        if (!user || !user.is_admin) {
            return res.status(403).json({ error: 'Se requieren permisos de administrador' });
        }
        
        next();
    } catch (error) {
        console.error('Error verificando permisos de admin:', error);
        res.status(500).json({ error: 'Error de autorización' });
    }
};

// Generar token JWT
function generateToken(userId, isAdmin = false) {
    const payload = {
        userId: userId,
        isAdmin: isAdmin,
        iat: Math.floor(Date.now() / 1000)
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Verificar token de Telegram
async function verifyTelegramAuth(authData) {
    try {
        // Para Mini Apps de Telegram, validar los datos de initData
        const { hash, ...data } = authData;
        
        // En producción, deberías validar el hash con el token del bot
        // Esto es una implementación simplificada
        
        if (!data.user || !data.user.id) {
            throw new Error('Datos de usuario de Telegram inválidos');
        }
        
        const userId = data.user.id.toString();
        
        // Verificar/crear usuario en la base de datos
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('telegram_id', userId)
            .single();
        
        if (error && error.code === 'PGRST116') {
            // Crear nuevo usuario
            const newUser = {
                telegram_id: userId,
                username: data.user.username || `user_${userId}`,
                first_name: data.user.first_name || '',
                last_name: data.user.last_name || '',
                coins: CONSTANTS.ECONOMY.STARTING_COINS,
                tickets: CONSTANTS.ECONOMY.STARTING_TICKETS,
                energy: CONSTANTS.ECONOMY.STARTING_ENERGY,
                level: 1,
                xp: 0,
                language_code: data.user.language_code || 'es',
                created_at: new Date().toISOString()
            };
            
            const { data: createdUser, error: createError } = await supabase
                .from('users')
                .insert([newUser])
                .select()
                .single();
            
            if (createError) throw createError;
            
            return {
                user: createdUser,
                token: generateToken(userId, false)
            };
        }
        
        if (error) throw error;
        
        // Actualizar última vez activo
        await supabase
            .from('users')
            .update({ last_active: new Date().toISOString() })
            .eq('id', user.id);
        
        return {
            user: user,
            token: generateToken(userId, user.is_admin || false)
        };
        
    } catch (error) {
        console.error('Error en verifyTelegramAuth:', error);
        throw error;
    }
}

// Autenticación para desarrolladores (solo en desarrollo)
async function developerAuth(apiKey) {
    if (process.env.NODE_ENV !== 'development') {
        throw new Error('Autenticación de desarrollador solo disponible en desarrollo');
    }
    
    const validApiKeys = process.env.DEVELOPER_API_KEYS 
        ? process.env.DEVELOPER_API_KEYS.split(',') 
        : [];
    
    if (!validApiKeys.includes(apiKey)) {
        throw new Error('API Key de desarrollador inválida');
    }
    
    // Crear usuario de desarrollador
    const devUser = {
        telegram_id: `dev_${Date.now()}`,
        username: 'developer',
        is_admin: true,
        coins: 999999,
        tickets: 99999,
        energy: 5000,
        level: 100
    };
    
    return {
        user: devUser,
        token: generateToken(devUser.telegram_id, true)
    };
}

// Validar sesión
async function validateSession(userId, token) {
    try {
        // Verificar token JWT
        const decoded = jwt.verify(token, JWT_SECRET);
        
        if (decoded.userId !== userId) {
            throw new Error('ID de usuario no coincide con el token');
        }
        
        // Verificar que el usuario existe y no está bloqueado
        const { data: user } = await supabase
            .from('users')
            .select('id, is_blocked, is_cooldown, cooldown_until')
            .eq('telegram_id', userId)
            .single();
        
        if (!user) {
            throw new Error('Usuario no encontrado');
        }
        
        if (user.is_blocked) {
            throw new Error('Cuenta bloqueada');
        }
        
        if (user.is_cooldown && user.cooldown_until > new Date().toISOString()) {
            throw new Error('Cuenta en cooldown');
        }
        
        return {
            valid: true,
            user: decoded,
            expiresAt: new Date(decoded.exp * 1000)
        };
        
    } catch (error) {
        return {
            valid: false,
            error: error.message
        };
    }
}

// Renovar token
async function refreshToken(oldToken) {
    try {
        const decoded = jwt.verify(oldToken, JWT_SECRET, { ignoreExpiration: true });
        
        // Verificar que el usuario aún existe
        const { data: user } = await supabase
            .from('users')
            .select('id, is_blocked')
            .eq('telegram_id', decoded.userId)
            .single();
        
        if (!user || user.is_blocked) {
            throw new Error('Usuario no válido para renovación');
        }
        
        // Generar nuevo token
        const newToken = generateToken(decoded.userId, decoded.isAdmin || false);
        
        return {
            token: newToken,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días
        };
        
    } catch (error) {
        throw new Error(`Error renovando token: ${error.message}`);
    }
}

// Cerrar sesión (invalidar token)
async function logout(userId, token) {
    try {
        // En una implementación real, podrías agregar el token a una blacklist
        // Para simplificar, solo actualizamos last_logout
        await supabase
            .from('users')
            .update({ last_logout: new Date().toISOString() })
            .eq('telegram_id', userId);
        
        return { success: true, message: 'Sesión cerrada' };
    } catch (error) {
        throw new Error(`Error cerrando sesión: ${error.message}`);
    }
}

// Obtener información de sesión
async function getSessionInfo(userId) {
    try {
        const { data: user } = await supabase
            .from('users')
            .select(`
                id,
                telegram_id,
                username,
                is_admin,
                is_blocked,
                is_cooldown,
                cooldown_until,
                last_active,
                last_login,
                created_at
            `)
            .eq('telegram_id', userId)
            .single();
        
        if (!user) {
            throw new Error('Usuario no encontrado');
        }
        
        return {
            user_id: user.telegram_id,
            username: user.username,
            is_admin: user.is_admin || false,
            is_blocked: user.is_blocked || false,
            is_cooldown: user.is_cooldown || false,
            cooldown_until: user.cooldown_until,
            last_active: user.last_active,
            account_age: Math.floor((Date.now() - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24)),
            created_at: user.created_at
        };
    } catch (error) {
        throw new Error(`Error obteniendo información de sesión: ${error.message}`);
    }
}

// Verificar permisos para una acción específica
async function checkPermission(userId, permission) {
    try {
        const { data: user } = await supabase
            .from('users')
            .select('is_admin, is_blocked, is_cooldown')
            .eq('telegram_id', userId)
            .single();
        
        if (!user) {
            return { allowed: false, reason: 'Usuario no encontrado' };
        }
        
        if (user.is_blocked) {
            return { allowed: false, reason: 'Cuenta bloqueada' };
        }
        
        if (user.is_cooldown) {
            return { allowed: false, reason: 'Cuenta en cooldown' };
        }
        
        // Permisos especiales para administradores
        if (user.is_admin) {
            return { allowed: true, reason: 'Administrador' };
        }
        
        // Verificar permisos específicos
        const permissions = {
            'plant_crop': true, // Todos pueden plantar
            'hatch_egg': true,  // Todos pueden eclosionar
            'watch_ad': true,   // Todos pueden ver anuncios
            'buy_tickets': true, // Todos pueden comprar
            'trade_crows': true, // Todos pueden intercambiar
            'admin_panel': false, // Solo admin
            'manage_users': false, // Solo admin
            'view_logs': false    // Solo admin
        };
        
        const allowed = permissions[permission] || false;
        
        return {
            allowed: allowed,
            reason: allowed ? 'Permiso concedido' : 'Permiso denegado'
        };
        
    } catch (error) {
        return { allowed: false, reason: `Error verificando permisos: ${error.message}` };
    }
}

// Exportar todas las funciones
module.exports = {
    authenticateJWT,
    requireAdmin,
    verifyTelegramAuth,
    developerAuth,
    validateSession,
    refreshToken,
    logout,
    getSessionInfo,
    checkPermission,
    generateToken
};
