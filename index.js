// ===============================
// 🧠 BOT FACEBOOK - MAIN INDEX (FIXED)
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

// === Cấu hình ===
const appStatePath = path.join(__dirname, "appstate.json");
const RESTART_DELAY_MS = 10000;
const KEEPALIVE_INTERVAL = 5 * 60 * 1000; // 5 phút
const MQTT_TIMEOUT = 10 * 60 * 1000; // 10 phút

// Biến theo dõi trạng thái
let lastMessageTime = Date.now();
let keepAliveTimer = null;
let connectionCheckTimer = null;

// --- HÀM KHỞI ĐỘNG CHÍNH ---
function startBot() {
    console.log(chalk.yellow("🔄 Đang kiểm tra và khởi động bot..."));

    if (!fs.existsSync(appStatePath)) {
        console.log(chalk.red("⚠️ Không tìm thấy file appstate.json! Vui lòng tạo file này trước."));
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
        } catch (e) { console.log(chalk.red("❌ Không thể tải dữ liệu prefix:", e)); }
    }
    global.data = { threadData, userData: new Map(), userNameCache: new Map(), threadInfoCache: new Map() };

    global.commands = new Map();
    global.events = new Map();
    global.noprefix = new Map();

    const modulePaths = {
        command: path.join(__dirname, "modules/command"),
        event: path.join(__dirname, "modules/event"),
        noprefix: path.join(__dirname, "modules/noprefix")
    };
    console.log(chalk.cyan("🔄 Đang tải các module..."));
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
            } catch (e) { console.log(chalk.red(`❌ Lỗi khi tải module ${file}:`), e); }
        }
    }
    console.log(chalk.green(`✅ Đã tải ${global.commands.size} lệnh, ${global.events.size} sự kiện, và ${global.noprefix.size} lệnh noprefix.`));

    login({ appState }, (err, api) => {
        if (err) {
            console.error(chalk.red("❌ Lỗi đăng nhập:"), err);
            setTimeout(startBot, RESTART_DELAY_MS);
            return;
        }

        global.client.api = api;
        
        // CẤU HÌNH API VỚI RECONNECT
        api.setOptions({
            listenEvents: true,
            selfListen: false,
            logLevel: "silent",
            updatePresence: true,
            forceLogin: true,
            autoReconnect: true // Bật tự động kết nối lại
        });

        console.log(chalk.green(`\n🤖 Bot ${config.botName} đã đăng nhập thành công!`));
        console.log(chalk.cyan(`📢 Prefix mặc định: ${config.prefix}`));

        console.log(chalk.cyan("🔄 Khởi động các module onLoad..."));
        for (const [name, module] of [...global.commands, ...global.events]) {
            if (module.onLoad && typeof module.onLoad === 'function') {
                try {
                    module.onLoad({ api });
                    console.log(chalk.green(`  > onLoad của "${name}" đã chạy`));
                } catch (e) {
                    console.error(chalk.red(`  > Lỗi khi gọi onLoad của "${name}":`), e.message);
                }
            }
        }
        console.log(chalk.cyan("✅ Hoàn tất khởi động.\n"));
        console.log(chalk.gray("💬 Bot đang lắng nghe tin nhắn...\n"));

        // === CƠ CHẾ KEEP-ALIVE ===
        keepAliveTimer = setInterval(() => {
            try {
                // Gửi request đơn giản để giữ kết nối
                api.getThreadList(1, null, ["INBOX"], (err) => {
                    if (err) {
                        console.log(chalk.yellow("⚠️ Keep-alive check failed, reconnecting..."));
                    } else {
                        console.log(chalk.gray(`💓 Keep-alive: ${new Date().toLocaleTimeString()}`));
                    }
                });
            } catch (e) {
                console.error(chalk.red("❌ Keep-alive error:"), e);
            }
        }, KEEPALIVE_INTERVAL);

        // === KIỂM TRA TIMEOUT ===
        connectionCheckTimer = setInterval(() => {
            const timeSinceLastMessage = Date.now() - lastMessageTime;
            if (timeSinceLastMessage > MQTT_TIMEOUT) {
                console.error(chalk.red(`❌ Không nhận tin nhắn trong ${MQTT_TIMEOUT/60000} phút. Khởi động lại...`));
                clearInterval(keepAliveTimer);
                clearInterval(connectionCheckTimer);
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
                console.error(chalk.red("❌ MQTT Error:"), err);
                
                // Nếu lỗi nghiêm trọng, khởi động lại
                if (err.error === "Connection closed." || err.error === "Connection refused: Not authorized") {
                    console.error(chalk.red("❌ Mất kết nối MQTT nghiêm trọng. Khởi động lại sau 10 giây..."));
                    clearInterval(keepAliveTimer);
                    clearInterval(connectionCheckTimer);
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
                console.error(chalk.red("❌ Lỗi khi xử lý event:"), e);
            }
        });

        // === XỬ LÝ TÍN HIỆU THOÁT ===
        process.on('SIGINT', () => {
            console.log(chalk.yellow("\n👋 Đang tắt bot..."));
            clearInterval(keepAliveTimer);
            clearInterval(connectionCheckTimer);
            if (listenMqtt && typeof listenMqtt.stopListening === 'function') {
                listenMqtt.stopListening();
            }
            process.exit(0);
        });
    });
}

// Xử lý lỗi chưa được bắt
process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('❌ Unhandled Rejection at:'), promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error(chalk.red('❌ Uncaught Exception:'), error);
    console.log(chalk.yellow('🔄 Khởi động lại bot sau 5 giây...'));
    setTimeout(startBot, 5000);
});

startBot();