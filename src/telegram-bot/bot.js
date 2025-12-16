const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
require('dotenv').config();

// Configurar bot
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: false });

const app = express();
app.use(express.json());

// Comandos del bot
const commands = [
    { command: 'start', description: 'Iniciar el juego 🎮' },
    { command: 'play', description: 'Abrir el juego 🐦' },
    { command: 'profile', description: 'Ver tu perfil 👤' },
    { command: 'shop', description: 'Ver tienda 🛒' },
    { command: 'leaderboard', description: 'Ver ranking 🏆' },
    { command: 'help', description: 'Ayuda ❓' }
];

// Configurar comandos
bot.setMyCommands(commands);

// Ruta de inicio
app.get('/', (req, res) => {
    res.json({ 
        status: 'Bot activo', 
        name: 'Crow Farmer Bot',
        commands: commands.map(c => `/${c.command}`)
    });
});

// Webhook de Telegram
app.post('/webhook', (req, res) => {
    bot.processUpdate(req.body);
    res.sendStatus(200);
});

// Manejador de comando /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.first_name;
    
    const welcomeMessage = `🎮 *¡Bienvenido a Crow Farmer, ${username}!* 🐦

*¿Qué es Crow Farmer?*
Es un juego de granja donde:
• 🌱 Plantas cultivos rápidos
• 🥚 Eclosionas huevos mágicos
• 🐦 Coleccionas cuervos únicos
• 🏆 Compites con otros jugadores

*Comandos disponibles:*
/play - Abrir el juego
/profile - Ver tu perfil
/shop - Ver tienda
/leaderboard - Ver ranking
/help - Ayuda

*¡Empieza a jugar ahora!* 👇`;

    const keyboard = {
        inline_keyboard: [[
            {
                text: '🎮 Jugar Ahora',
                web_app: { url: process.env.FRONTEND_URL }
            }
        ], [
            {
                text: '📢 Canal Oficial',
                url: 'https://t.me/CrowFarmerGame'
            },
            {
                text: '👥 Grupo de Jugadores',
                url: 'https://t.me/CrowFarmerCommunity'
            }
        ]]
    };

    bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
});

// Comando /play - Abrir juego
bot.onText(/\/play/, (msg) => {
    const chatId = msg.chat.id;
    
    bot.sendMessage(chatId, '🎮 Abriendo Crow Farmer...', {
        reply_markup: {
            inline_keyboard: [[
                {
                    text: '🎮 Abrir Juego',
                    web_app: { url: process.env.FRONTEND_URL }
                }
            ]]
        }
    });
});

// Comando /profile - Ver perfil
bot.onText(/\/profile/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    
    // Obtener datos del usuario (simulado)
    const userData = {
        name: msg.from.first_name,
        level: 1,
        coins: 3000,
        tickets: 100,
        crows: 0,
        rank: 'Novato'
    };
    
    const profileMessage = `👤 *Perfil de ${userData.name}*

🏆 Nivel: ${userData.level}
💰 Monedas: ${userData.coins.toLocaleString()}
🎫 Tickets: ${userData.tickets}
🐦 Cuervos: ${userData.crows}
📊 Rango: ${userData.rank}

*Progreso:*
▰▰▰▰▰▱▱▱▱▱ 50%

*Próximo nivel en:* 500 XP`;

    bot.sendMessage(chatId, profileMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                { text: '🎮 Seguir jugando', web_app: { url: process.env.FRONTEND_URL } }
            ]]
        }
    });
});

// Comando /shop - Tienda
bot.onText(/\/shop/, (msg) => {
    const chatId = msg.chat.id;
    
    const shopMessage = `🛒 *Tienda Crow Farmer*

*Paquetes de Tickets:*
🎁 Básico - 600 tickets • $0.99
🎁🎁 Granjero - 1,800 tickets • $2.99
🎁🎁🎁 Premium - 4,000 tickets • $5.99
👑 Ultimate - 10,000 tickets • $12.99

*Mejoras de Granja:*
🌱 Parcela Extra - 1,000 monedas
⚡ Energía Extra - 1,500 monedas
🍀 Amuleto de Suerte - 800 tickets

*Compra desde el juego:*`;

    const keyboard = {
        inline_keyboard: [[
            { text: '🎮 Ir a la Tienda', web_app: { url: `${process.env.FRONTEND_URL}#market` } }
        ]]
    };

    bot.sendMessage(chatId, shopMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
    });
});

// Comando /leaderboard - Ranking
bot.onText(/\/leaderboard/, async (msg) => {
    const chatId = msg.chat.id;
    
    // Datos de ejemplo
    const topPlayers = [
        { name: '👑 FarmerPro', level: 25, crows: 89 },
        { name: '🐦 CrowMaster', level: 22, crows: 76 },
        { name: '🌱 PlantLover', level: 20, crows: 65 },
        { name: '💰 RichCrow', level: 18, crows: 54 },
        { name: '⚡ FastGrower', level: 16, crows: 43 }
    ];
    
    let leaderboardText = `🏆 *Ranking Global - Crow Farmer*\n\n`;
    
    topPlayers.forEach((player, index) => {
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        leaderboardText += `${medal} *${player.name}*\n`;
        leaderboardText += `   Nivel ${player.level} • ${player.crows} cuervos\n\n`;
    });
    
    leaderboardText += `*Tu posición:* #127\n`;
    leaderboardText += `*Actualizado:* Hoy a las 15:30`;
    
    bot.sendMessage(chatId, leaderboardText, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                { text: '🎮 Unirme al ranking', web_app: { url: process.env.FRONTEND_URL } }
            ]]
        }
    });
});

// Comando /help - Ayuda
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    
    const helpMessage = `❓ *Ayuda - Crow Farmer*

*¿Cómo jugar?*
1. Planta cultivos con /play
2. Gana monedas y tickets
3. Eclosiona huevos mágicos
4. Colecciona cuervos raros
5. Compite en el ranking

*Comandos disponibles:*
/start - Iniciar el bot
/play - Abrir el juego
/profile - Ver tu perfil
/shop - Ver tienda
/leaderboard - Ver ranking
/help - Esta ayuda

*Soporte y Contacto:*
📢 Canal oficial: @CrowFarmerGame
👥 Comunidad: @CrowFarmerCommunity
📧 Soporte: crowfarmer@example.com

*Problemas comunes:*
• Si el juego no carga, verifica tu conexión
• Para reportar bugs, contacta soporte
• Las compras pueden tardar unos minutos`;

    bot.sendMessage(chatId, helpMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
            inline_keyboard: [[
                { text: '🎮 Ir al Juego', web_app: { url: process.env.FRONTEND_URL } }
            ]]
        }
    });
});

// Manejar mensajes de texto normales
bot.on('message', (msg) => {
    if (!msg.text?.startsWith('/')) {
        const chatId = msg.chat.id;
        
        bot.sendMessage(chatId, '🤖 Escribe /help para ver los comandos disponibles', {
            reply_markup: {
                keyboard: [[{ text: '/play 🎮' }, { text: '/shop 🛒' }]],
                resize_keyboard: true,
                one_time_keyboard: false
            }
        });
    }
});

// Manejar callback queries (botones inline)
bot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    
    if (data === 'refresh_leaderboard') {
        bot.answerCallbackQuery(callbackQuery.id, { text: 'Actualizando ranking...' });
        // Aquí actualizarías el mensaje del ranking
    }
});

// Manejar errores
bot.on('polling_error', (error) => {
    console.error('Error en polling:', error);
});

// Iniciar servidor
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`🤖 Bot corriendo en puerto ${PORT}`);
    console.log(`🌐 Webhook URL: ${process.env.WEBHOOK_URL}`);
    console.log(`🎮 Frontend: ${process.env.FRONTEND_URL}`);
    
    // Configurar webhook
    if (process.env.WEBHOOK_URL) {
        bot.setWebHook(`${process.env.WEBHOOK_URL}/webhook`)
            .then(() => console.log('✅ Webhook configurado'))
            .catch(err => console.error('❌ Error configurando webhook:', err));
    }
});

module.exports = bot;
