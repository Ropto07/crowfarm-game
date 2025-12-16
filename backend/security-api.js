const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const CONSTANTS = require('../shared/constants');

// Configurar Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Rate limiting estricto para seguridad
const securityLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 50, // 50 peticiones por IP
    message: { 
        error: 'Demasiadas peticiones de seguridad. Intenta de nuevo en 5 minutos.' 
    },
    standardHeaders: true,
    legacyHeaders: false
});

// Middleware de seguridad
const securityMiddleware = (req, res, next) => {
    // Verificar headers requeridos
    const userAgent = req.headers['user-agent'];
    if (!userAgent || userAgent.includes('bot') || userAgent.includes('crawler')) {
        logSecurityEvent('blocked_bot', req.ip, { userAgent });
        return res.status(403).json({ error: 'Acceso no autorizado' });
    }
    
    // Verificar origen
    const origin = req.headers['origin'];
    const allowedOrigins = [
        'https://tu-frontend.netlify.app',
        'https://tu-frontend.vercel.app',
        'http://localhost:3000'
    ];
    
    if (origin && !allowedOrigins.includes(origin)) {
        logSecurityEvent('invalid_origin', req.ip, { origin });
        return res.status(403).json({ error: 'Origen no permitido' });
    }
    
    // Verificar contenido para métodos que envían datos
    if (req.method === 'POST' || req.method === 'PUT') {
        const contentType = req.headers['content-type'];
        if (!contentType || !contentType.includes('application/json')) {
            return res.status(400).json({ error: 'Content-Type debe ser application/json' });
        }
    }
    
    next();
};

// Middleware para validar usuario
const validateUser = (req, res, next) => {
    const userId = req.headers['x-user-id'] || req.body.userId;
    
    if (!userId) {
        return res.status(401).json({ error: 'Usuario no autenticado' });
    }
    
    // Validar formato de ID
    if (!CONSTANTS.SECURITY.USER_ID_REGEX.test(userId)) {
        logSecurityEvent('invalid_user_id', req.ip, { userId });
        return res.status(400).json({ error: 'ID de usuario inválido' });
    }
    
    // Verificar caracteres peligrosos
    const dangerousChars = /[<>'"\\\/;]/;
    if (dangerousChars.test(userId)) {
        logSecurityEvent('dangerous_user_id', req.ip, { userId });
        return res.status(400).json({ error: 'ID de usuario contiene caracteres inválidos' });
    }
    
    req.userId = userId;
    next();
};

// Endpoint para reportar actividad sospechosa
router.post('/report', securityLimiter, securityMiddleware, validateUser, async (req, res) => {
    try {
        const { type, details } = req.body;
        
        if (!type || !details) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }
        
        // Tipos de actividad válidos
        const validTypes = [
            'coin_manipulation',
            'ticket_manipulation',
            'bot_detected',
            'time_manipulation',
            'speed_hack',
            'memory_tampering',
            'integrity_failure'
        ];
        
        if (!validTypes.includes(type)) {
            return res.status(400).json({ error: 'Tipo de actividad inválido' });
        }
        
        // Loggear en base de datos
        await logSuspiciousActivity(req.userId, type, details, req.ip);
        
        // Tomar acciones según el tipo
        let actionTaken = '';
        switch (type) {
            case 'coin_manipulation':
            case 'ticket_manipulation':
                await correctUserResources(req.userId);
                actionTaken = 'resources_corrected';
                break;
                
            case 'bot_detected':
                await applyUserCooldown(req.userId, 300000); // 5 minutos
                actionTaken = 'cooldown_applied';
                break;
                
            case 'time_manipulation':
            case 'speed_hack':
            case 'memory_tampering':
                await blockUserTemporarily(req.userId, 3600000); // 1 hora
                actionTaken = 'user_blocked';
                break;
        }
        
        res.json({ 
            success: true, 
            message: 'Reporte recibido',
            action_taken: actionTaken 
        });
    } catch (error) {
        console.error('Error en reporte de seguridad:', error);
        logSecurityEvent('report_error', req.ip, { error: error.message });
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Endpoint para verificar integridad del juego
router.post('/integrity-check', securityLimiter, securityMiddleware, validateUser, async (req, res) => {
    try {
        const { checksum, version, data } = req.body;
        
        if (!checksum || !version || !data) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }
        
        // Verificar versión del juego
        if (version !== process.env.GAME_VERSION) {
            await logSuspiciousActivity(
                req.userId, 
                'outdated_version', 
                { version, expected: process.env.GAME_VERSION },
                req.ip
            );
            return res.status(400).json({ error: 'Versión del juego desactualizada' });
        }
        
        // Verificar checksum
        const expectedChecksum = calculateChecksum(data);
        if (checksum !== expectedChecksum) {
            await logSuspiciousActivity(
                req.userId, 
                'integrity_failure', 
                { checksum, expectedChecksum },
                req.ip
            );
            return res.status(400).json({ 
                error: 'Integridad del juego comprometida',
                requires_update: true 
            });
        }
        
        // Verificar frecuencia de checks (máximo 1 por hora)
        const lastCheck = await getLastIntegrityCheck(req.userId);
        if (lastCheck && (Date.now() - new Date(lastCheck).getTime()) < 3600000) {
            return res.status(429).json({ error: 'Checks demasiado frecuentes' });
        }
        
        // Registrar check exitoso
        await recordIntegrityCheck(req.userId, true);
        
        res.json({ 
            success: true, 
            verified: true,
            timestamp: new Date().toISOString() 
        });
    } catch (error) {
        console.error('Error en verificación de integridad:', error);
        res.status(500).json({ error: 'Error en verificación de integridad' });
    }
});

// Endpoint para obtener reglas de seguridad
router.get('/rules', securityLimiter, securityMiddleware, (req, res) => {
    const rules = {
        max_coins: CONSTANTS.SECURITY.MAX_COINS,
        max_tickets: CONSTANTS.SECURITY.MAX_TICKETS,
        max_level: CONSTANTS.SECURITY.MAX_LEVEL,
        max_energy: CONSTANTS.ECONOMY.MAX_ENERGY,
        actions_per_minute: CONSTANTS.GAME_RULES.MAX_CROPS_PER_DAY / 24 / 60, // Estimado
        request_size_limit: 10000, // 10KB
        allowed_origins: [
            'https://tu-frontend.netlify.app',
            'https://tu-frontend.vercel.app',
            'http://localhost:3000'
        ],
        security_features: [
            'rate_limiting',
            'input_validation',
            'integrity_checks',
            'cheat_detection',
            'activity_monitoring'
        ]
    };
    
    res.json(rules);
});

// Endpoint para verificar estado de seguridad del usuario
router.get('/user-status/:userId', securityLimiter, securityMiddleware, validateUser, async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Verificar si está bloqueado
        const { data: blockedUser } = await supabase
            .from('blocked_users')
            .select('*')
            .eq('user_id', userId)
            .gt('blocked_until', new Date().toISOString())
            .single();
        
        // Obtener actividad reciente
        const { data: recentActivity } = await supabase
            .from('suspicious_activity')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);
        
        // Obtener estadísticas de seguridad
        const { data: securityStats } = await supabase
            .from('security_logs')
            .select('log_type, count')
            .eq('user_id', userId)
            .group('log_type');
        
        const status = {
            user_id: userId,
            is_blocked: !!blockedUser,
            block_info: blockedUser || null,
            recent_suspicious_activity: recentActivity || [],
            security_stats: securityStats || [],
            last_check: new Date().toISOString()
        };
        
        res.json(status);
    } catch (error) {
        console.error('Error obteniendo estado de seguridad:', error);
        res.status(500).json({ error: 'Error obteniendo estado' });
    }
});

// Endpoint para limpieza de seguridad (solo admin)
router.post('/cleanup', securityLimiter, securityMiddleware, async (req, res) => {
    try {
        const { admin_token } = req.headers;
        
        // Verificar token de admin
        if (!admin_token || admin_token !== process.env.ADMIN_SECRET) {
            logSecurityEvent('unauthorized_cleanup', req.ip, { admin_token });
            return res.status(403).json({ error: 'No autorizado' });
        }
        
        // Limpiar logs antiguos (más de 30 días)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        
        const { error: logsError } = await supabase
            .from('security_logs')
            .delete()
            .lt('created_at', thirtyDaysAgo);
        
        if (logsError) throw logsError;
        
        // Limpiar actividad sospechosa antigua
        const { error: activityError } = await supabase
            .from('suspicious_activity')
            .delete()
            .lt('created_at', thirtyDaysAgo);
        
        if (activityError) throw activityError;
        
        // Desbloquear usuarios con bloqueos expirados
        const { error: unblockError } = await supabase
            .from('blocked_users')
            .update({ 
                unblocked_at: new Date().toISOString(),
                notes: 'Auto-desbloqueado por expiración'
            })
            .lt('blocked_until', new Date().toISOString())
            .is('unblocked_at', null);
        
        if (unblockError) throw unblockError;
        
        res.json({ 
            success: true, 
            message: 'Limpieza de seguridad completada',
            cleaned: {
                old_logs: '30+ días',
                old_activity: '30+ días',
                expired_blocks: 'auto-desbloqueados'
            }
        });
    } catch (error) {
        console.error('Error en limpieza de seguridad:', error);
        res.status(500).json({ error: 'Error en limpieza' });
    }
});

// ============================================
// FUNCIONES AUXILIARES
// ============================================

// Loggear actividad sospechosa
async function logSuspiciousActivity(userId, type, details, ip) {
    try {
        // Primero obtener el ID interno del usuario
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('telegram_id', userId)
            .single();
        
        if (!user) return;
        
        const severity = getSeverityLevel(type);
        
        const activityData = {
            user_id: user.id,
            activity_type: type,
            severity: severity,
            details: details || {},
            ip_address: ip,
            user_agent: 'security-system',
            created_at: new Date().toISOString()
        };
        
        const { error } = await supabase
            .from('suspicious_activity')
            .insert([activityData]);
        
        if (error) {
            console.error('Error loggeando actividad sospechosa:', error);
        }
        
        // También loggear en security_logs
        const logData = {
            user_id: user.id,
            log_type: 'suspicious_activity',
            log_level: severity === 'high' ? 'error' : 'warn',
            message: `Actividad sospechosa: ${type}`,
            details: details,
            ip_address: ip,
            user_agent: 'security-system',
            created_at: new Date().toISOString()
        };
        
        await supabase.from('security_logs').insert([logData]);
        
    } catch (error) {
        console.error('Error en logSuspiciousActivity:', error);
    }
}

// Loggear evento de seguridad
async function logSecurityEvent(eventType, ip, details) {
    try {
        const logData = {
            log_type: eventType,
            log_level: 'warn',
            message: `Evento de seguridad: ${eventType}`,
            details: details || {},
            ip_address: ip,
            user_agent: 'security-system',
            created_at: new Date().toISOString()
        };
        
        await supabase.from('security_logs').insert([logData]);
    } catch (error) {
        console.error('Error loggeando evento de seguridad:', error);
    }
}

// Corregir recursos del usuario
async function correctUserResources(userId) {
    try {
        const { data: user } = await supabase
            .from('users')
            .select('coins, tickets, level')
            .eq('telegram_id', userId)
            .single();
        
        if (!user) return;
        
        // Corregir valores fuera de rango
        const correctedCoins = Math.max(
            CONSTANTS.SECURITY.MIN_COINS, 
            Math.min(user.coins, CONSTANTS.SECURITY.MAX_COINS)
        );
        
        const correctedTickets = Math.max(
            CONSTANTS.SECURITY.MIN_TICKETS, 
            Math.min(user.tickets, CONSTANTS.SECURITY.MAX_TICKETS)
        );
        
        const correctedLevel = Math.max(
            CONSTANTS.SECURITY.MIN_LEVEL, 
            Math.min(user.level, CONSTANTS.SECURITY.MAX_LEVEL)
        );
        
        await supabase
            .from('users')
            .update({
                coins: correctedCoins,
                tickets: correctedTickets,
                level: correctedLevel
            })
            .eq('telegram_id', userId);
        
    } catch (error) {
        console.error('Error corrigiendo recursos:', error);
    }
}

// Aplicar cooldown al usuario
async function applyUserCooldown(userId, duration) {
    try {
        const cooldownUntil = new Date(Date.now() + duration).toISOString();
        
        await supabase
            .from('users')
            .update({
                is_cooldown: true,
                cooldown_until: cooldownUntil
            })
            .eq('telegram_id', userId);
        
    } catch (error) {
        console.error('Error aplicando cooldown:', error);
    }
}

// Bloquear usuario temporalmente
async function blockUserTemporarily(userId, duration) {
    try {
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('telegram_id', userId)
            .single();
        
        if (!user) return;
        
        const blockedUntil = new Date(Date.now() + duration).toISOString();
        
        // Bloquear en users
        await supabase
            .from('users')
            .update({
                is_blocked: true,
                blocked_until: blockedUntil
            })
            .eq('id', user.id);
        
        // Registrar en blocked_users
        const blockData = {
            user_id: user.id,
            reason: 'cheating_detected',
            block_type: 'temporary',
            blocked_until: blockedUntil,
            blocked_at: new Date().toISOString()
        };
        
        await supabase.from('blocked_users').insert([blockData]);
        
    } catch (error) {
        console.error('Error bloqueando usuario:', error);
    }
}

// Obtener último check de integridad
async function getLastIntegrityCheck(userId) {
    try {
        const { data: user } = await supabase
            .from('users')
            .select('last_integrity_check')
            .eq('telegram_id', userId)
            .single();
        
        return user?.last_integrity_check;
    } catch (error) {
        return null;
    }
}

// Registrar check de integridad
async function recordIntegrityCheck(userId, success) {
    try {
        await supabase
            .from('users')
            .update({
                last_integrity_check: new Date().toISOString(),
                integrity_checks_passed: supabase.rpc('increment', {
                    x: success ? 1 : 0,
                    row_id: userId,
                    column_name: 'integrity_checks_passed'
                }),
                integrity_checks_failed: supabase.rpc('increment', {
                    x: success ? 0 : 1,
                    row_id: userId,
                    column_name: 'integrity_checks_failed'
                })
            })
            .eq('telegram_id', userId);
    } catch (error) {
        console.error('Error registrando check de integridad:', error);
    }
}

// Calcular checksum
function calculateChecksum(data) {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return hash.toString(16);
}

// Obtener nivel de severidad
function getSeverityLevel(type) {
    const highSeverity = [
        'coin_manipulation',
        'ticket_manipulation',
        'time_manipulation',
        'memory_tampering'
    ];
    
    const mediumSeverity = [
        'bot_detected',
        'speed_hack',
        'integrity_failure'
    ];
    
    if (highSeverity.includes(type)) return 'high';
    if (mediumSeverity.includes(type)) return 'medium';
    return 'low';
}

module.exports = router;
