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

// === Cấu hình ===
const appStatePath = path.join(__dirname, "appstate.json");
const RESTART_DELAY_MS = 10000;

// --- HÀM KHỞI ĐỘNG CHÍNH ---
function startBot() {
    console.log(chalk.yellow("🔄 Đang kiểm tra và khởi động bot..."));

    if (!fs.existsSync(appStatePath)) {
        console.log(chalk.red("⚠️ Không tìm thấy file appstate.json! Vui lòng tạo file này trước."));
        process.exit(1);
    }
    const appState = JSON.parse(fs.readFileSync(appStatePath, "utf8"));

    // <<< CẬP NHẬT 1: Khởi tạo handleReaction >>>
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
                // Xóa cache để có thể reload module mà không cần khởi động lại bot
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
        api.setOptions({ listenEvents: true, selfListen: false, logLevel: "silent" });

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

        // ... (Phần tác vụ định kỳ giữ nguyên) ...

        const handleEvent = require("./handlers/handleEvent");
        const handleReply = require("./handlers/handleReply");
        const handleReaction = require("./handlers/handleReaction"); // Gọi handler mới
        const handleNoprefix = require("./handlers/handleNoprefix");
        const listen = require("./handlers/listen");

        api.listenMqtt(async (err, event) => {
            if (err) {
                console.error(chalk.red("❌ Mất kết nối MQTT:"), err);
                setTimeout(startBot, RESTART_DELAY_MS);
                return;
            }
            if (!event) return;

            // <<< CẬP NHẬT 2: Thêm handleReaction vào luồng sự kiện >>>
            await handleEvent({ api, event });
            await handleReply({ api, event });
            await handleReaction({ api, event });
            await handleNoprefix({ api, event });
            await listen({ api, event });
        });
    });
}

startBot();