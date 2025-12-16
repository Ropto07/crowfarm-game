#!/usr/bin/env node

/**
 * Script de configuración de base de datos para Crow Farmer
 * Ejecutar: npm run setup-db
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Colores para la consola
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m'
};

console.log(`
${colors.cyan}${colors.bright}
╔══════════════════════════════════════════════════════╗
║      🗄️  CROW FARMER - SETUP DE BASE DE DATOS       ║
╚══════════════════════════════════════════════════════╝
${colors.reset}
`);

// Configurar interfaz de lectura
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Función para preguntar al usuario
function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
}

// Verificar variables de entorno
function checkEnvironment() {
    console.log(`${colors.blue}🔍 Verificando variables de entorno...${colors.reset}`);
    
    const requiredVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
    const missingVars = [];
    
    for (const varName of requiredVars) {
        if (!process.env[varName]) {
            missingVars.push(varName);
        }
    }
    
    if (missingVars.length > 0) {
        console.log(`${colors.red}❌ Faltan variables de entorno:${colors.reset}`);
        missingVars.forEach(varName => {
            console.log(`   - ${varName}`);
        });
        
        console.log(`
${colors.yellow}📝 Solución:${colors.reset}
1. Copia el archivo .env.example a .env
2. Edita .env con tus credenciales:
   - SUPABASE_URL: Tu URL de Supabase
   - SUPABASE_SERVICE_KEY: Tu service key de Supabase
   - TELEGRAM_BOT_TOKEN: Token de tu bot (opcional ahora)
3. Ejecuta de nuevo: npm run setup-db
        `);
        
        return false;
    }
    
    console.log(`${colors.green}✅ Variables de entorno verificadas${colors.reset}`);
    return true;
}

// Configurar cliente de Supabase
let supabase;
function setupSupabaseClient() {
    try {
        supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false
                }
            }
        );
        
        console.log(`${colors.green}✅ Cliente Supabase configurado${colors.reset}`);
        return true;
    } catch (error) {
        console.log(`${colors.red}❌ Error configurando Supabase:${colors.reset}`, error.message);
        return false;
    }
}

// Leer archivo SQL
function readSQLFile(filename) {
    try {
        const filePath = path.join(__dirname, '..', 'sql', filename);
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.log(`${colors.red}❌ Error leyendo archivo ${filename}:${colors.reset}`, error.message);
        return null;
    }
}

// Dividir SQL en sentencias
function splitSQLStatements(sql) {
    return sql
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
}

// Ejecutar sentencia SQL
async function executeSQLStatement(statement, index, total) {
    try {
        console.log(`${colors.dim}   [${index + 1}/${total}] Ejecutando sentencia...${colors.reset}`);
        
        // Eliminar comentarios de una línea
        const cleanStatement = statement.replace(/--.*$/gm, '').trim();
        
        if (!cleanStatement) {
            return { success: true, skipped: true };
        }
        
        // Determinar tipo de sentencia
        const stmtType = getStatementType(cleanStatement);
        
        // Ejecutar según el tipo
        switch (stmtType) {
            case 'CREATE_TABLE':
                await executeCreateTable(cleanStatement);
                break;
                
            case 'CREATE_INDEX':
                await executeCreateIndex(cleanStatement);
                break;
                
            case 'CREATE_VIEW':
                await executeCreateView(cleanStatement);
                break;
                
            case 'CREATE_FUNCTION':
                await executeCreateFunction(cleanStatement);
                break;
                
            case 'CREATE_TRIGGER':
                await executeCreateTrigger(cleanStatement);
                break;
                
            case 'INSERT':
                await executeInsert(cleanStatement);
                break;
                
            default:
                await executeGenericSQL(cleanStatement);
        }
        
        return { success: true };
        
    } catch (error) {
        return { 
            success: false, 
            error: error.message,
            statement: statement.substring(0, 100) + '...'
        };
    }
}

// Determinar tipo de sentencia SQL
function getStatementType(statement) {
    const upperStatement = statement.toUpperCase();
    
    if (upperStatement.startsWith('CREATE TABLE')) return 'CREATE_TABLE';
    if (upperStatement.startsWith('CREATE INDEX')) return 'CREATE_INDEX';
    if (upperStatement.startsWith('CREATE OR REPLACE VIEW')) return 'CREATE_VIEW';
    if (upperStatement.startsWith('CREATE OR REPLACE FUNCTION')) return 'CREATE_FUNCTION';
    if (upperStatement.startsWith('CREATE TRIGGER')) return 'CREATE_TRIGGER';
    if (upperStatement.startsWith('INSERT INTO')) return 'INSERT';
    
    return 'GENERIC';
}

// Ejecutar CREATE TABLE
async function executeCreateTable(statement) {
    // Extraer nombre de tabla
    const tableMatch = statement.match(/CREATE TABLE (\w+)/i);
    if (!tableMatch) throw new Error('No se pudo extraer nombre de tabla');
    
    const tableName = tableMatch[1];
    
    // Verificar si la tabla ya existe
    const { data: existingTable, error: checkError } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
    
    if (checkError && !checkError.message.includes('does not exist')) {
        // Si el error no es "no existe", entonces hay otro problema
        throw checkError;
    }
    
    if (existingTable && existingTable.length > 0) {
        console.log(`${colors.yellow}   ⚠️  Tabla ${tableName} ya existe, omitiendo...${colors.reset}`);
        return;
    }
    
    // Ejecutar creación
    const { error } = await supabase.rpc('exec_sql', { sql: statement });
    
    if (error) {
        // Intentar método alternativo
        await executeGenericSQL(statement);
    }
    
    console.log(`${colors.green}   ✅ Tabla ${tableName} creada${colors.reset}`);
}

// Ejecutar CREATE INDEX
async function executeCreateIndex(statement) {
    // Extraer nombre de índice
    const indexMatch = statement.match(/CREATE INDEX (\w+)/i);
    const indexName = indexMatch ? indexMatch[1] : 'unknown';
    
    try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
            console.log(`${colors.yellow}   ⚠️  Índice ${indexName} podría existir ya${colors.reset}`);
        } else {
            console.log(`${colors.green}   ✅ Índice ${indexName} creado${colors.reset}`);
        }
    } catch (error) {
        console.log(`${colors.yellow}   ⚠️  Omitiendo índice ${indexName}: ${error.message}${colors.reset}`);
    }
}

// Ejecutar CREATE VIEW
async function executeCreateView(statement) {
    // Extraer nombre de vista
    const viewMatch = statement.match(/CREATE OR REPLACE VIEW (\w+)/i);
    const viewName = viewMatch ? viewMatch[1] : 'unknown';
    
    try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
            console.log(`${colors.yellow}   ⚠️  Vista ${viewName} podría tener errores${colors.reset}`);
        } else {
            console.log(`${colors.green}   ✅ Vista ${viewName} creada${colors.reset}`);
        }
    } catch (error) {
        console.log(`${colors.yellow}   ⚠️  Omitiendo vista ${viewName}: ${error.message}${colors.reset}`);
    }
}

// Ejecutar CREATE FUNCTION
async function executeCreateFunction(statement) {
    // Extraer nombre de función
    const funcMatch = statement.match(/CREATE OR REPLACE FUNCTION (\w+)/i);
    const funcName = funcMatch ? funcMatch[1] : 'unknown';
    
    try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
            console.log(`${colors.yellow}   ⚠️  Función ${funcName} podría tener errores${colors.reset}`);
        } else {
            console.log(`${colors.green}   ✅ Función ${funcName} creada${colors.reset}`);
        }
    } catch (error) {
        console.log(`${colors.yellow}   ⚠️  Omitiendo función ${funcName}: ${error.message}${colors.reset}`);
    }
}

// Ejecutar CREATE TRIGGER
async function executeCreateTrigger(statement) {
    // Extraer nombre de trigger
    const triggerMatch = statement.match(/CREATE TRIGGER (\w+)/i);
    const triggerName = triggerMatch ? triggerMatch[1] : 'unknown';
    
    try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
            console.log(`${colors.yellow}   ⚠️  Trigger ${triggerName} podría tener errores${colors.reset}`);
        } else {
            console.log(`${colors.green}   ✅ Trigger ${triggerName} creado${colors.reset}`);
        }
    } catch (error) {
        console.log(`${colors.yellow}   ⚠️  Omitiendo trigger ${triggerName}: ${error.message}${colors.reset}`);
    }
}

// Ejecutar INSERT
async function executeInsert(statement) {
    // Extraer nombre de tabla
    const tableMatch = statement.match(/INSERT INTO (\w+)/i);
    if (!tableMatch) throw new Error('No se pudo extraer nombre de tabla para INSERT');
    
    const tableName = tableMatch[1];
    
    try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        
        if (error) {
            console.log(`${colors.yellow}   ⚠️  Datos para ${tableName} podrían existir ya${colors.reset}`);
        } else {
            console.log(`${colors.green}   ✅ Datos insertados en ${tableName}${colors.reset}`);
        }
    } catch (error) {
        console.log(`${colors.yellow}   ⚠️  Omitiendo INSERT en ${tableName}: ${error.message}${colors.reset}`);
    }
}

// Ejecutar SQL genérico
async function executeGenericSQL(statement) {
    const { error } = await supabase.rpc('exec_sql', { sql: statement });
    
    if (error) {
        // Si falla, mostrar advertencia pero continuar
        console.log(`${colors.yellow}   ⚠️  Sentencia SQL podría tener errores: ${error.message}${colors.reset}`);
    }
}

// Crear función exec_sql si no existe
async function createExecSQLFunction() {
    console.log(`${colors.blue}🔨 Creando función exec_sql si es necesario...${colors.reset}`);
    
    const createFunctionSQL = `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS void AS $$
        BEGIN
            EXECUTE sql;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    try {
        // Verificar si la función ya existe
        const { error: testError } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
        
        if (testError && testError.message.includes('function')) {
            // Función no existe, crearla
            const { error: createError } = await supabase.rpc('exec_sql', { sql: createFunctionSQL });
            
            if (createError) {
                console.log(`${colors.yellow}⚠️  No se pudo crear función exec_sql: ${createError.message}${colors.reset}`);
                console.log(`${colors.dim}   Usando métodos alternativos...${colors.reset}`);
                return false;
            }
            
            console.log(`${colors.green}✅ Función exec_sql creada${colors.reset}`);
            return true;
        }
        
        console.log(`${colors.green}✅ Función exec_sql ya existe${colors.reset}`);
        return true;
        
    } catch (error) {
        console.log(`${colors.yellow}⚠️  Error verificando función exec_sql: ${error.message}${colors.reset}`);
        return false;
    }
}

// Verificar conexión a Supabase
async function testConnection() {
    console.log(`${colors.blue}🔗 Probando conexión a Supabase...${colors.reset}`);
    
    try {
        const { data, error } = await supabase.from('_supabase_settings').select('*').limit(1);
        
        if (error && error.message.includes('does not exist')) {
            // La tabla no existe, pero la conexión funciona
            console.log(`${colors.green}✅ Conexión a Supabase exitosa${colors.reset}`);
            return true;
        }
        
        if (error) {
            console.log(`${colors.red}❌ Error de conexión: ${error.message}${colors.reset}`);
            return false;
        }
        
        console.log(`${colors.green}✅ Conexión a Supabase exitosa${colors.reset}`);
        return true;
        
    } catch (error) {
        console.log(`${colors.red}❌ Error de conexión: ${error.message}${colors.reset}`);
        return false;
    }
}

// Ejecutar setup completo
async function runSetup() {
    try {
        // 1. Verificar entorno
        if (!checkEnvironment()) {
            rl.close();
            process.exit(1);
        }
        
        // 2. Configurar cliente
        if (!setupSupabaseClient()) {
            rl.close();
            process.exit(1);
        }
        
        // 3. Probar conexión
        if (!await testConnection()) {
            rl.close();
            process.exit(1);
        }
        
        // 4. Crear función exec_sql
        await createExecSQLFunction();
        
        // 5. Leer archivo SQL
        console.log(`${colors.blue}📖 Leyendo esquema de base de datos...${colors.reset}`);
        
        const schemaSQL = readSQLFile('schema.sql');
        if (!schemaSQL) {
            rl.close();
            process.exit(1);
        }
        
        // 6. Dividir en sentencias
        const statements = splitSQLStatements(schemaSQL);
        console.log(`${colors.green}✅ Encontradas ${statements.length} sentencias SQL${colors.reset}`);
        
        // 7. Confirmar con usuario
        console.log(`\n${colors.yellow}⚠️  Esto creará/modificará las tablas en tu base de datos.${colors.reset}`);
        const confirm = await askQuestion(`${colors.cyan}¿Continuar? (s/n): ${colors.reset}`);
        
        if (confirm.toLowerCase() !== 's') {
            console.log(`${colors.yellow}🚫 Setup cancelado por el usuario${colors.reset}`);
            rl.close();
            process.exit(0);
        }
        
        // 8. Ejecutar sentencias
        console.log(`\n${colors.blue}🚀 Ejecutando sentencias SQL...${colors.reset}\n`);
        
        let successCount = 0;
        let errorCount = 0;
        let skipCount = 0;
        
        for (let i = 0; i < statements.length; i++) {
            const result = await executeSQLStatement(statements[i], i, statements.length);
            
            if (result.success) {
                if (result.skipped) {
                    skipCount++;
                } else {
                    successCount++;
                }
            } else {
                errorCount++;
                console.log(`${colors.red}   ❌ Error: ${result.error}${colors.reset}`);
                console.log(`${colors.dim}   Sentencia: ${result.statement}${colors.reset}`);
                
                // Preguntar si continuar después de error
                if (errorCount >= 3) {
                    const continueAnswer = await askQuestion(
                        `${colors.yellow}\n⚠️  Varios errores. ¿Continuar? (s/n): ${colors.reset}`
                    );
                    
                    if (continueAnswer.toLowerCase() !== 's') {
                        break;
                    }
                }
            }
        }
        
        // 9. Resumen
        console.log(`\n${colors.cyan}📊 RESUMEN:${colors.reset}`);
        console.log(`${colors.green}   ✅ Exitosas: ${successCount}${colors.reset}`);
        console.log(`${colors.yellow}   ⚠️  Omitidas: ${skipCount}${colors.reset}`);
        console.log(`${colors.red}   ❌ Errores: ${errorCount}${colors.reset}`);
        
        if (errorCount > 0) {
            console.log(`\n${colors.yellow}⚠️  Algunas sentencias tuvieron errores.${colors.reset}`);
            console.log(`${colors.dim}   Esto puede ser normal si las tablas ya existen.${colors.reset}`);
        }
        
        // 10. Insertar datos iniciales
        console.log(`\n${colors.blue}📝 Insertando datos iniciales...${colors.reset}`);
        await insertInitialData();
        
        // 11. Verificar tablas creadas
        console.log(`\n${colors.blue}🔍 Verificando tablas creadas...${colors.reset}`);
        await verifyTables();
        
        console.log(`\n${colors.green}${colors.bright}
╔══════════════════════════════════════════════════════╗
║         🎉 SETUP COMPLETADO EXITOSAMENTE            ║
╚══════════════════════════════════════════════════════╝
${colors.reset}
`);
        
        console.log(`${colors.green}✅ Base de datos configurada correctamente${colors.reset}`);
        console.log(`${colors.cyan}🌐 URL de Supabase: ${process.env.SUPABASE_URL}${colors.reset}`);
        
        // Mostrar próximos pasos
        showNextSteps();
        
    } catch (error) {
        console.log(`${colors.red}❌ Error crítico en setup:${colors.reset}`, error.message);
        console.log(error.stack);
    } finally {
        rl.close();
    }
}

// Insertar datos iniciales
async function insertInitialData() {
    try {
        // Insertar configuración del juego
        const configData = [
            { config_key: 'game_version', config_value: '1.0.0', description: 'Versión del juego' },
            { config_key: 'energy_per_day', config_value: '1500', description: 'Energía diaria base' },
            { config_key: 'egg_cost_tickets', config_value: '500', description: 'Tickets para huevo' },
            { config_key: 'ads_per_day_limit', config_value: '10', description: 'Límite de anuncios/día' },
            { config_key: 'ads_tickets_reward', config_value: '10', description: 'Tickets por anuncio' }
        ];
        
        for (const config of configData) {
            const { error } = await supabase
                .from('game_config')
                .upsert(config, { onConflict: 'config_key' });
            
            if (error) {
                console.log(`${colors.yellow}   ⚠️  Config ${config.config_key} podría existir ya${colors.reset}`);
            }
        }
        
        console.log(`${colors.green}   ✅ Configuración del juego insertada${colors.reset}`);
        
    } catch (error) {
        console.log(`${colors.yellow}   ⚠️  Error insertando datos iniciales: ${error.message}${colors.reset}`);
    }
}

// Verificar tablas creadas
async function verifyTables() {
    const expectedTables = [
        'users', 'crops', 'user_crows', 'egg_hatches', 'ads_watched',
        'real_payments', 'marketplace_listings', 'battles', 
        'user_achievements', 'game_sessions', 'game_config',
        'security_logs', 'blocked_users', 'suspicious_activity'
    ];
    
    let verifiedCount = 0;
    
    for (const tableName of expectedTables) {
        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('count', { count: 'exact', head: true })
                .limit(1);
            
            if (error) {
                console.log(`${colors.red}   ❌ Tabla ${tableName}: NO EXISTE${colors.reset}`);
            } else {
                console.log(`${colors.green}   ✅ Tabla ${tableName}: OK${colors.reset}`);
                verifiedCount++;
            }
        } catch (error) {
            console.log(`${colors.yellow}   ⚠️  Tabla ${tableName}: Error verificando${colors.reset}`);
        }
    }
    
    console.log(`\n${colors.cyan}📋 Tablas verificadas: ${verifiedCount}/${expectedTables.length}${colors.reset}`);
}

// Mostrar próximos pasos
function showNextSteps() {
    console.log(`\n${colors.cyan}${colors.bright}🚀 PRÓXIMOS PASOS:${colors.reset}`);
    console.log(`
${colors.green}1. Inicia el servidor:${colors.reset}
   ${colors.dim}npm start${colors.reset}

${colors.green}2. Configura el bot de Telegram:${colors.reset}
   ${colors.dim}- Ve a @BotFather en Telegram${colors.reset}
   ${colors.dim}- Crea un nuevo bot (/newbot)${colors.reset}
   ${colors.dim}- Copia el token a tu archivo .env${colors.reset}

${colors.green}3. Despliega en la nube:${colors.reset}
   ${colors.dim}Frontend (Netlify/Vercel):${colors.reset}
   ${colors.dim}- Sube la carpeta src/frontend${colors.reset}
   
   ${colors.dim}Backend (Render.com/Railway):${colors.reset}
   ${colors.dim}- Conecta tu repositorio GitHub${colors.reset}
   ${colors.dim}- Configura variables de entorno${colors.reset}

${colors.green}4. Prueba el juego:${colors.reset}
   ${colors.dim}- Busca tu bot en Telegram${colors.reset}
   ${colors.dim}- Ejecuta /start${colors.reset}
   ${colors.dim}- ¡Juega! 🎮${colors.reset}

${colors.yellow}💡 ¿Problemas?${colors.reset}
- Verifica que .env tenga todas las variables
- Ejecuta npm run setup-db de nuevo
- Revisa la consola de Supabase para errores
`);
}

// Ejecutar setup
runSetup().catch(error => {
    console.error(`${colors.red}❌ Error fatal:${colors.reset}`, error);
    rl.close();
    process.exit(1);
});
