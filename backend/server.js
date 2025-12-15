require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

// Inicializar Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configurar Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configurar bot de Telegram
let bot;
if (process.env.TELEGRAM_BOT_TOKEN) {
    bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
} else {
    console.warn('⚠️ TELEGRAM_BOT_TOKEN no configurado. Bot desactivado.');
}

// ============================================
// MIDDLEWARE DE SEGURIDAD
// ============================================

// Helmet.js - Headers de seguridad
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            connectSrc: [
                "'self'", 
                supabaseUrl,
                "https://api.telegram.org",
                "https://checkout.stripe.com"
            ],
            frameSrc: ["'self'", "https://js.stripe.com"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS seguro
const allowedOrigins = [
    'https://tu-frontend.netlify.app',
    'https://tu-frontend.vercel.app',
    'http://localhost:3000',
    'http://localhost:8080',
    'https://web.telegram.org'
].filter(Boolean);

app.use(cors({
    origin: function(origin, callback) {
        // Permitir requests sin origen (como mobile apps o curl)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'El origen CORS no está permitido';
            console.warn(`⚠️ CORS bloqueado: ${origin}`);
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-User-ID',
        'X-Requested-With',
        'X-Security-Token'
    ],
    credentials: true,
    maxAge: 86400 // 24 horas
}));

// Rate limiting global
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Límite por IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { 
        error: 'Demasiadas peticiones desde esta IP. Intenta de nuevo en 15 minutos.' 
    },
    skip: (req) => {
        // Saltar rate limiting para health checks
        return req.path === '/api/health';
    }
});
app.use(limiter);

// Rate limiting para endpoints sensibles
const sensitiveLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 30,
    message: { error: 'Demasiadas acciones. Espera unos minutos.' }
});

// Parsear JSON con límite de tamaño
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ============================================
// MIDDLEWARE PERSONALIZADO
// ============================================

// Logging de todas las peticiones
app.use((req, res, next) => {
    const startTime = Date.now();
    const ip = req.ip || req.connection.remoteAddress;
    
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms - IP: ${ip}`;
        
        if (res.statusCode >= 400) {
            console.error(`🔴 ${logMessage}`);
            
            // Loggear errores en Supabase
            if (res.statusCode >= 500) {
                logErrorToSupabase(req, res, duration, ip);
            }
        } else {
            console.log(`🟢 ${logMessage}`);
        }
    });
    
    next();
});

// Validación básica de peticiones
app.use((req, res, next) => {
    // Bloquear user agents sospechosos
    const userAgent = req.headers['user-agent'];
    if (!userAgent || userAgent.includes('bot') || userAgent.includes('crawler')) {
        return res.status(403).json({ error: 'Acceso no autorizado' });
    }
    
    // Validar tamaño de petición para métodos que envían datos
    if (req.method === 'POST' || req.method === 'PUT') {
        const contentLength = parseInt(req.headers['content-length'], 10);
        if (contentLength > 10000) { // 10KB máximo
            return res.status(413).json({ error: 'Payload demasiado grande' });
        }
    }
    
    next();
});

// Middleware para validar usuario
const validateUser = async (req, res, next) => {
    try {
        const userId = req.headers['x-user-id'] || req.body.userId;
        
        if (!userId) {
            return res.status(401).json({ error: 'Usuario no autenticado' });
        }
        
        // Validar formato
        if (typeof userId !== 'string' || userId.length > 100) {
            return res.status(400).json({ error: 'ID de usuario inválido' });
        }
        
        // Verificar caracteres peligrosos
        const dangerousPattern = /[<>'"\\\/;]/;
        if (dangerousPattern.test(userId)) {
            return res.status(400).json({ error: 'ID contiene caracteres inválidos' });
        }
        
        // Verificar si usuario existe en Supabase
        const { data: user, error } = await supabase
            .from('users')
            .select('id, telegram_id, is_blocked')
            .eq('telegram_id', userId)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no encontrado
            console.error('Error verificando usuario:', error);
        }
        
        // Verificar si está bloqueado
        if (user && user.is_blocked) {
            return res.status(403).json({ error: 'Cuenta bloqueada temporalmente' });
        }
        
        req.userId = userId;
        req.userData = user;
        next();
    } catch (error) {
        console.error('Error en validación de usuario:', error);
        res.status(500).json({ error: 'Error de autenticación' });
    }
};

// ============================================
// RUTAS PÚBLICAS
// ============================================

// Ruta principal
app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        game: 'Crow Farmer', 
        version: '1.0.0',
        endpoints: [
            '/api/health',
            '/api/user/:id',
            '/api/leaderboard',
            '/webhook'
        ],
        security: 'enabled',
        uptime: process.uptime()
    });
});

// Health check
app.get('/api/health', (req, res) => {
    const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        database: 'checking...',
        bot: bot ? 'connected' : 'disabled'
    };
    
    // Verificar conexión a Supabase
    supabase.from('users').select('count', { count: 'exact', head: true })
        .then(() => {
            health.database = 'connected';
            res.json(health);
        })
        .catch(err => {
            health.database = 'disconnected';
            health.error = err.message;
            res.status(503).json(health);
        });
});

// ============================================
// RUTAS DE API (PROTEGIDAS)
// ============================================

// Importar rutas de API
const apiRoutes = require('./api');
const securityRoutes = require('./security-api');

// Usar rutas con prefijo /api
app.use('/api', apiRoutes);
app.use('/api/security', securityRoutes);

// ============================================
// WEBHOOK DE TELEGRAM
// ============================================

// Webhook para Telegram
app.post('/webhook', (req, res) => {
    if (!bot) {
        return res.status(503).json({ error: 'Bot no configurado' });
    }
    
    try {
        bot.processUpdate(req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error procesando webhook:', error);
        res.status(500).json({ error: 'Error interno' });
    }
});

// Configurar webhook de Telegram
async function setupTelegramWebhook() {
    if (!bot || !process.env.WEBHOOK_URL) {
        console.warn('⚠️ Webhook no configurado. Faltan variables.');
        return;
    }
    
    try {
        const webhookUrl = `${process.env.WEBHOOK_URL}/webhook`;
        await bot.setWebHook(webhookUrl);
        
        // Configurar comandos del bot
        await bot.setMyCommands([
            { command: 'start', description: 'Iniciar el juego 🎮' },
            { command: 'play', description: 'Abrir el juego 🐦' },
            { command: 'profile', description: 'Ver perfil 👤' },
            { command: 'shop', description: 'Ver tienda 🛒' },
            { command: 'leaderboard', description: 'Ver ranking 🏆' },
            { command: 'help', description: 'Ayuda ❓' }
        ]);
        
        console.log(`✅ Webhook configurado en: ${webhookUrl}`);
    } catch (error) {
        console.error('❌ Error configurando webhook:', error);
    }
}

// ============================================
// MANEJO DE ERRORES
// ============================================

// 404 - Ruta no encontrada
app.use((req, res) => {
    res.status(404).json({ 
        error: 'Ruta no encontrada',
        path: req.path,
        method: req.method
    });
});

// Manejo de errores global
app.use((err, req, res, next) => {
    console.error('🔥 Error global:', err.stack);
    
    const errorResponse = {
        error: 'Error interno del servidor',
        timestamp: new Date().toISOString(),
        path: req.path
    };
    
    // En desarrollo, incluir detalles del error
    if (process.env.NODE_ENV === 'development') {
        errorResponse.details = err.message;
        errorResponse.stack = err.stack;
    }
    
    res.status(500).json(errorResponse);
});

// ============================================
// FUNCIONES AUXILIARES
// ============================================

// Loggear errores en Supabase
async function logErrorToSupabase(req, res, duration, ip) {
    try {
        await supabase.from('error_logs').insert([{
            path: req.path,
            method: req.method,
            status_code: res.statusCode,
            duration_ms: duration,
            ip_address: ip,
            user_agent: req.headers['user-agent'],
            error_message: res.statusMessage,
            created_at: new Date().toISOString()
        }]);
    } catch (error) {
        console.error('Error guardando log en Supabase:', error);
    }
}

// Verificar y crear tablas necesarias
async function checkDatabaseTables() {
    const requiredTables = ['users', 'crops', 'user_crows', 'security_logs'];
    
    for (const table of requiredTables) {
        try {
            const { error } = await supabase
                .from(table)
                .select('count', { count: 'exact', head: true })
                .limit(1);
            
            if (error) {
                console.warn(`⚠️ Tabla ${table} no encontrada. Ejecuta npm run setup-db`);
                return false;
            }
        } catch (error) {
            console.error(`❌ Error verificando tabla ${table}:`, error.message);
            return false;
        }
    }
    
    console.log('✅ Todas las tablas verificadas');
    return true;
}

// ============================================
// INICIAR SERVIDOR
// ============================================

async function startServer() {
    try {
        // Verificar variables de entorno
        const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            console.error(`❌ Faltan variables de entorno: ${missingVars.join(', ')}`);
            console.log('💡 Copia .env.example a .env y configura los valores');
            process.exit(1);
        }
        
        // Verificar base de datos
        console.log('🔍 Verificando conexión a base de datos...');
        const dbOk = await checkDatabaseTables();
        
        if (!dbOk) {
            console.log('📋 Ejecuta: npm run setup-db');
        }
        
        // Configurar webhook de Telegram
        await setupTelegramWebhook();
        
        // Iniciar servidor
        app.listen(PORT, () => {
            console.log(`
    🚀 ========================================
    🚀    CROW FARMER - SERVER INICIADO
    🚀 ========================================
    🌐 URL: http://localhost:${PORT}
    📁 Entorno: ${process.env.NODE_ENV || 'development'}
    🤖 Bot: ${bot ? '✅ Conectado' : '❌ Desactivado'}
    🗄️  Database: ${dbOk ? '✅ Conectado' : '⚠️ Verificar'}
    🔒 Seguridad: ✅ Activada
    ⏰ Hora: ${new Date().toLocaleString()}
    🚀 ========================================
            `);
        });
        
    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

// Manejar cierre limpio
process.on('SIGTERM', () => {
    console.log('🛑 Recibida señal SIGTERM. Cerrando servidor...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 Recibida señal SIGINT. Cerrando servidor...');
    process.exit(0);
});

// Iniciar servidor
startServer();

module.exports = app;
