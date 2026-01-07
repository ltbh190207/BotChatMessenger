// ===============================
// 🧠 BOT FACEBOOK - MAIN INDEX
// ===============================
const login = require("@dongdev/fca-unofficial");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");
const config = require("./config");

// --- BANNER ---
console.log(chalk.blue(`
██████╗ ██████╗ ████████╗  ██████╗ ███████╗██╗   ██╗
██╔════╝ ██╔═══██╗╚══██╔══╝ ██╔═══██╗██╔════╝██║   ██║
██║  ███╗██████╔╝   ██║    ██║   ██║█████╗  ██║   ██║
██║   ██║██╔═══╝    ██║    ██║   ██║██╔══╝  ╚██╗ ██╔╝
╚██████╔╝██║        ██║    ╚██████╔╝███████╗ ╚████╔╝
 ╚═════╝ ╚═╝        ╚═╝     ╚═════╝ ╚══════╝  ╚═══╝
`));

// === CẤU HÌNH TỪ CONFIG ===
const appStatePath = path.join(__dirname, "appstate.json");
const RESTART_DELAY_MS = config.connection.restartDelay;
const KEEPALIVE_INTERVAL = config.connection.keepAliveInterval;
const MQTT_TIMEOUT = config.connection.mqttTimeout;

// Biến theo dõi trạng thái
let lastMessageTime = Date.now();
let keepAliveTimer = null;
let connectionCheckTimer = null;
let isShuttingDown = false;

// --- HÀM LOGGER CUSTOM ---
function log(type, message, data = null) {
    if (!config.logging.enableConsoleLog) return;

    const timestamp = new Date().toLocaleString('vi-VN');
    const prefix = `[${timestamp}]`;

    switch (type) {
        case 'info':
            console.log(chalk.cyan(prefix), message, data || '');
            break;
        case 'success':
            console.log(chalk.green(prefix), message, data || '');
            break;
        case 'warn':
            console.log(chalk.yellow(prefix), message, data || '');
            break;
        case 'error':
            console.error(chalk.red(prefix), message, data || '');
            break;
        case 'debug':
            if (config.logging.logLevel === 'debug') {
                console.log(chalk.gray(prefix), message, data || '');
            }
            break;
    }
}

// --- HÀM CLEAR TIMERS ---
function clearAllTimers() {
    if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
    }
    if (connectionCheckTimer) {
        clearInterval(connectionCheckTimer);
        connectionCheckTimer = null;
    }
}

// --- HÀM KHỞI ĐỘNG CHÍNH ---
function startBot() {
    if (isShuttingDown) return;

    log('info', "🔄 Đang kiểm tra và khởi động bot...");

    // Kiểm tra chế độ bảo trì
    if (config.security.maintenanceMode) {
        log('warn', "⚠️ Bot đang trong chế độ bảo trì!");
        return;
    }

    if (!fs.existsSync(appStatePath)) {
        log('error', "⚠️ Không tìm thấy file appstate.json!");
        process.exit(1);
    }

    const appState = JSON.parse(fs.readFileSync(appStatePath, "utf8"));

    global.client = { handleReply: [], handleReaction: [] };
    global.config = config;

    const dataPath = path.join(__dirname, "data");
    if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });
    const cachePath = path.join(__dirname, "cache");
    if (!fs.existsSync(cachePath)) fs.mkdirSync(cachePath, { recursive: true });

    const prefixesPath = path.join(dataPath, "prefixes.json");
    let threadData = new Map();
    if (fs.existsSync(prefixesPath)) {
        try {
            const rawData = fs.readFileSync(prefixesPath, "utf8");
            if (rawData) threadData = new Map(Object.entries(JSON.parse(rawData)));
        } catch (e) {
            log('error', "❌ Không thể tải dữ liệu prefix:", e.message);
        }
    }

    global.data = {
        threadData,
        userData: new Map(),
        userNameCache: new Map(),
        threadInfoCache: new Map()
    };

    global.commands = new Map();
    global.events = new Map();
    global.noprefix = new Map();

    const modulePaths = {
        command: path.join(__dirname, "modules/command"),
        event: path.join(__dirname, "modules/event"),
        noprefix: path.join(__dirname, "modules/noprefix")
    };

    log('info', "🔄 Đang tải các module...");

    for (const type in modulePaths) {
        const modulePath = modulePaths[type];
        if (!fs.existsSync(modulePath)) continue;
        for (const file of fs.readdirSync(modulePath)) {
            if (!file.endsWith(".js")) continue;
            try {
                delete require.cache[require.resolve(path.join(modulePath, file))];
                const module = require(path.join(modulePath, file));
                if (!module.config || !module.config.name) continue;
                const { name } = module.config;
                if (type === 'command') global.commands.set(name, module);
                else if (type === 'event') global.events.set(name, module);
                else if (type === 'noprefix') global.noprefix.set(name, module);
            } catch (e) {
                log('error', `❌ Lỗi khi tải module ${file}:`, e.message);
            }
        }
    }

    log('success', `✅ Đã tải ${global.commands.size} lệnh, ${global.events.size} sự kiện, ${global.noprefix.size} lệnh noprefix`);

    login({ appState }, (err, api) => {
        if (err) {
            log('error', "❌ Lỗi đăng nhập:", err);
            setTimeout(startBot, RESTART_DELAY_MS);
            return;
        }

        global.client.api = api;

        // CẤU HÌNH API TỪ CONFIG
        api.setOptions({
            listenEvents: true,
            selfListen: false,
            logLevel: "silent",
            updatePresence: config.connection.updatePresence,
            forceLogin: config.connection.forceLogin,
            autoReconnect: config.connection.autoReconnect
        });

        log('success', `\n🤖 Bot ${config.botName} đã đăng nhập thành công!`);
        log('info', `📢 Prefix mặc định: ${config.prefix}`);

        log('info', "🔄 Khởi động các module onLoad...");
        for (const [name, module] of [...global.commands, ...global.events]) {
            if (module.onLoad && typeof module.onLoad === 'function') {
                try {
                    module.onLoad({ api });
                    log('debug', `  > onLoad của "${name}" đã chạy`);
                } catch (e) {
                    log('error', `  > Lỗi khi gọi onLoad của "${name}":`, e.message);
                }
            }
        }

        log('success', "✅ Hoàn tất khởi động.\n");
        log('info', "💬 Bot đang lắng nghe tin nhắn...\n");

        // === CƠ CHẾ KEEP-ALIVE ===
        keepAliveTimer = setInterval(() => {
            if (isShuttingDown) return;

            try {
                api.getThreadList(1, null, ["INBOX"], (err) => {
                    if (err) {
                        log('warn', "⚠️ Keep-alive check failed");
                    } else {
                        log('debug', `💓 Keep-alive: ${new Date().toLocaleTimeString()}`);
                    }
                });
            } catch (e) {
                log('error', "❌ Keep-alive error:", e.message);
            }
        }, KEEPALIVE_INTERVAL);

        // === KIỂM TRA TIMEOUT ===
        connectionCheckTimer = setInterval(() => {
            if (isShuttingDown) return;

            const timeSinceLastMessage = Date.now() - lastMessageTime;
            if (timeSinceLastMessage > MQTT_TIMEOUT) {
                log('error', `❌ Không nhận tin nhắn trong ${MQTT_TIMEOUT / 60000} phút`);
                log('warn', "🔄 Khởi động lại bot...");
                clearAllTimers();
                setTimeout(startBot, RESTART_DELAY_MS);
            }
        }, 60000); // Kiểm tra mỗi phút

        const handleEvent = require("./handlers/handleEvent");
        const handleReply = require("./handlers/handleReply");
        const handleReaction = require("./handlers/handleReaction");
        const handleNoprefix = require("./handlers/handleNoprefix");
        const listen = require("./handlers/listen");

        // === LISTEN MQTT VỚI ERROR HANDLING ===
        const listenMqtt = api.listenMqtt(async (err, event) => {
            if (err) {
                log('error', "❌ MQTT Error:", err.error || err);

                // Nếu lỗi nghiêm trọng, khởi động lại
                if (err.error === "Connection closed." ||
                    err.error === "Connection refused: Not authorized" ||
                    err.error === "read ECONNRESET") {
                    log('error', "❌ Mất kết nối MQTT nghiêm trọng");
                    log('warn', `🔄 Khởi động lại sau ${RESTART_DELAY_MS / 1000} giây...`);
                    clearAllTimers();
                    if (listenMqtt && typeof listenMqtt.stopListening === 'function') {
                        listenMqtt.stopListening();
                    }
                    setTimeout(startBot, RESTART_DELAY_MS);
                }
                return;
            }

            if (!event) return;

            // CẬP NHẬT THỜI GIAN NHẬN TIN NHẮN CUỐI
            lastMessageTime = Date.now();

            try {
                await handleEvent({ api, event });
                await handleReply({ api, event });
                await handleReaction({ api, event });
                await handleNoprefix({ api, event });
                await listen({ api, event });
            } catch (e) {
                log('error', "❌ Lỗi khi xử lý event:", e.message);
            }
        });

        // === XỬ LÝ TÍN HIỆU THOÁT ===
        process.on('SIGINT', () => {
            isShuttingDown = true;
            log('warn', "\n👋 Đang tắt bot...");
            clearAllTimers();
            if (listenMqtt && typeof listenMqtt.stopListening === 'function') {
                listenMqtt.stopListening();
            }
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            isShuttingDown = true;
            log('warn', "\n👋 Nhận tín hiệu SIGTERM, đang tắt bot...");
            clearAllTimers();
            if (listenMqtt && typeof listenMqtt.stopListening === 'function') {
                listenMqtt.stopListening();
            }
            process.exit(0);
        });
    });
}

// Xử lý lỗi chưa được bắt
process.on('unhandledRejection', (reason, promise) => {
    log('error', '❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    log('error', '❌ Uncaught Exception:', error.message);
    log('warn', '🔄 Khởi động lại bot sau 5 giây...');
    clearAllTimers();
    setTimeout(startBot, 5000);
});

startBot();