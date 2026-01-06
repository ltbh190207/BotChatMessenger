const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

module.exports.config = {
    name: "reload",
    version: "1.0.0",
    hasPermssion: 2, // Chỉ Admin Bot mới dùng được
    credits: "GPT",
    description: "Tải lại tất cả các module từ các thư mục đã định cấu hình.",
    commandCategory: "Admin",
    usages: "reload",
    cooldowns: 5,
};

module.exports.run = async function ({ api, event }) {
    const { threadID } = event;
    const botName = global.config.botName || "Bot";

    // --- 1. Định nghĩa tất cả các thư mục chứa module ---
    const modulePaths = [
        path.join(__dirname, "..", "command"),
        path.join(__dirname, "..", "event")
    ];

    let loadedCount = 0;
    let failedCount = 0;

    api.sendMessage(`🔄 ${botName} đang tiến hành tải lại toàn bộ module...`, threadID);

    try {
        // --- 2. Xóa cache của tất cả các module cũ một cách an toàn ---
        Object.keys(require.cache).forEach(key => {
            // Chỉ xóa cache của các file nằm trong các thư mục module của chúng ta
            if (modulePaths.some(p => key.startsWith(p))) {
                delete require.cache[key];
            }
        });

        // Xóa toàn bộ lệnh cũ khỏi global.commands
        global.commands.clear();

        // --- 3. Tải lại module từ tất cả các thư mục ---
        for (const modulePath of modulePaths) {
            if (!fs.existsSync(modulePath)) continue;

            const files = fs.readdirSync(modulePath).filter(f => f.endsWith(".js"));

            for (const file of files) {
                const filePath = path.join(modulePath, file);
                try {
                    const cmd = require(filePath);

                    if (!cmd.config || !cmd.config.name) {
                        console.log(chalk.yellow(`🟡 Bỏ qua module không hợp lệ khi reload: ${file}`));
                        failedCount++;
                        continue;
                    }

                    global.commands.set(cmd.config.name.toLowerCase(), cmd);
                    if (cmd.config.aliases && Array.isArray(cmd.config.aliases)) {
                        cmd.config.aliases.forEach(alias =>
                            global.commands.set(alias.toLowerCase(), cmd)
                        );
                    }
                    loadedCount++;
                } catch (err) {
                    console.error(chalk.red(`❌ Lỗi khi tải lại module ${file}:`), err);
                    failedCount++;
                }
            }
        }

        api.sendMessage(
            `✅ Đã tải lại module thành công!\n` +
            `🔹 Số module được tải thành công: ${loadedCount}\n` +
            `🔹 Số module bị lỗi: ${failedCount}`,
            threadID
        );

    } catch (error) {
        console.error(chalk.red("❌ Lỗi nghiêm trọng khi reload module:"), error);
        api.sendMessage("❌ Đã xảy ra lỗi nghiêm trọng trong quá trình tải lại module.", threadID);
    }
};