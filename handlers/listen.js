const chalk = require("chalk");
const logger = require("./logger");
const fs = require("fs"); // Thêm fs
const path = require("path"); // Thêm path

// Thêm đường dẫn đến file cài đặt của QTV
const QTV_SETTINGS_PATH = path.join(__dirname, "../data/qtv_settings.json");

module.exports = async ({ api, event }) => {
    if (!event.body || typeof event.body !== 'string') return;

    const { threadID, senderID, body } = event;

    // --- XÁC ĐỊNH QUYỀN HẠN CỦA NGƯỜỜI DÙNG ---
    const isBotAdmin = global.config.adminUID.includes(senderID);
    // Lấy danh sách QTV nhóm từ event (nếu có)
    const adminIDs = (event.adminIDs || []).map(admin => admin.id);
    const isGroupAdmin = adminIDs.includes(senderID);
    // --- KẾT THÚC XÁC ĐỊNH QUYỀN HẠN ---

    const groupPrefix = (global.data.threadData.get(String(threadID)) || {}).PREFIX;
    const defaultPrefix = global.config.prefix;
    let usedPrefix = null;

    const effectivePrefix = groupPrefix || defaultPrefix;
    if (body.startsWith(effectivePrefix)) usedPrefix = effectivePrefix;
    if (isBotAdmin && usedPrefix === null && body.startsWith(defaultPrefix)) usedPrefix = defaultPrefix;

    if (usedPrefix === null) return;

    const args = body.slice(usedPrefix.length).trim().split(/\s+/);
    const commandName = args.shift()?.toLowerCase();
    if (!commandName) return;

    const command = global.commands.get(commandName);
    if (!command) return;

    // --- TÍCH HỢP CHẾ ĐỘ QTV ONLY ---
    // Kiểm tra xem chế độ qtvonly có đang bật không
    if (fs.existsSync(QTV_SETTINGS_PATH)) {
        const settings = JSON.parse(fs.readFileSync(QTV_SETTINGS_PATH, "utf8"));
        // Nếu chế độ qtvonly bật VÀ người dùng không phải QTV nhóm VÀ cũng không phải admin bot
        if (settings[threadID]?.qtvonly && !isGroupAdmin && !isBotAdmin) {
            return; // Im lặng bỏ qua lệnh của người thường
        }
    }
    // --- KẾT THÚC TÍCH HỢP ---

    // --- SỬA LỖI KIỂM TRA QUYỀN HẠN ---
    // hasPermssion: 1 là QTV nhóm, hasPermssion: 2 là admin bot
    if (command.config.hasPermssion === 1 && !isGroupAdmin && !isBotAdmin) {
        return api.sendMessage("🚫 Lệnh này chỉ dành cho Quản trị viên nhóm.", threadID, event.messageID);
    }
    if (command.config.hasPermssion === 2 && !isBotAdmin) {
        return api.sendMessage("🚫 Lệnh này chỉ dành cho chủ bot.", threadID, event.messageID);
    }
    // --- KẾT THÚC SỬA LỖI ---

    logger({ api, event, commandName, type: 'COMMAND' });

    try {
        await command.run({ api, event, args });
    } catch (e) {
        console.error(chalk.red(`❌ Lỗi khi chạy lệnh "${commandName}":`), e);
        api.sendMessage(`⚠️ Đã có lỗi xảy ra khi thực thi lệnh "${commandName}".`, threadID, event.messageID);
    }
};