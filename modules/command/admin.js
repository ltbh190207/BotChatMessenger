const fs = require("fs");
const path = require("path");

const ADMIN_SETTINGS_PATH = path.join(__dirname, "../../data/admin_settings.json");
const BANNED_THREADS_PATH = path.join(__dirname, "../../data/banned_threads.json");
const BANK_DATA_PATH = path.join(__dirname, "../../data/bank.json");

module.exports.config = {
    name: "admin",
    version: "1.0.0",
    hasPermssion: 2, // Chỉ chủ bot (UID đầu tiên trong adminUID) mới dùng được
    credits: "GPT",
    description: "Công cụ quản lý toàn diện dành cho admin bot.",
    commandCategory: "Admin",
    usages: "[only/ban/unban/bank]",
    cooldowns: 5,
};

// Hàm tiện ích để đọc file JSON
function readJSON(filePath, defaultValue = {}) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 4));
        return defaultValue;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

// Hàm tiện ích để ghi file JSON
function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

// Hàm xử lý số tiền (1k, 1m, all)
function parseBetAmount(raw) {
    if (!raw) return NaN;
    raw = String(raw).toLowerCase().replace(/,/g, "");
    if (/^\d+(\.\d+)?m$/.test(raw)) return Math.floor(parseFloat(raw) * 1000000);
    if (/^\d+(\.\d+)?k$/.test(raw)) return Math.floor(parseFloat(raw) * 1000);
    if (/^\d+$/.test(raw)) return parseInt(raw);
    return NaN;
}

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, senderID, type, messageReply } = event;
    const action = args[0]?.toLowerCase();
    const effectivePrefix = (global.data.threadData.get(String(threadID)) || {}).PREFIX || global.config.prefix;

    switch (action) {
        case "only": {
            const settings = readJSON(ADMIN_SETTINGS_PATH);
            const status = args[1]?.toLowerCase();
            if (status === 'on') {
                settings[threadID] = { only: true };
                writeJSON(ADMIN_SETTINGS_PATH, settings);
                return api.sendMessage("✅ Đã bật chế độ 'chỉ admin dùng lệnh' trong nhóm này.", threadID, messageID);
            } else if (status === 'off') {
                delete settings[threadID];
                writeJSON(ADMIN_SETTINGS_PATH, settings);
                return api.sendMessage("🚫 Đã tắt chế độ 'chỉ admin dùng lệnh'. Mọi người có thể sử dụng bot.", threadID, messageID);
            } else {
                return api.sendMessage(`Dùng: ${effectivePrefix}admin only [on/off]`, threadID, messageID);
            }
        }

        case "ban": {
            const bannedThreads = readJSON(BANNED_THREADS_PATH, []);
            if (!bannedThreads.includes(threadID)) {
                bannedThreads.push(threadID);
                writeJSON(BANNED_THREADS_PATH, bannedThreads);
            }
            await api.sendMessage(`Đã thêm nhóm này vào danh sách cấm. Bot sẽ rời đi ngay bây giờ.`, threadID);
            return api.removeUserFromGroup(api.getCurrentUserID(), threadID);
        }

        case "unban": {
            const targetThreadID = args[1];
            if (!targetThreadID) return api.sendMessage(`Vui lòng nhập ID của nhóm cần gỡ cấm.`, threadID, messageID);

            let bannedThreads = readJSON(BANNED_THREADS_PATH, []);
            if (bannedThreads.includes(targetThreadID)) {
                bannedThreads = bannedThreads.filter(id => id !== targetThreadID);
                writeJSON(BANNED_THREADS_PATH, bannedThreads);
                return api.sendMessage(`✅ Đã gỡ cấm nhóm có ID: ${targetThreadID}`, threadID, messageID);
            } else {
                return api.sendMessage(`Nhóm có ID: ${targetThreadID} không có trong danh sách cấm.`, threadID, messageID);
            }
        }

        case "bank": {
            let recipientID, amount;

            if (type === "message_reply") {
                recipientID = messageReply.senderID;
                amount = parseBetAmount(args[1]);
            } else if (Object.keys(event.mentions).length > 0) {
                recipientID = Object.keys(event.mentions)[0];
                amount = parseBetAmount(args[args.length - 1]);
            } else {
                recipientID = args[1];
                amount = parseBetAmount(args[2]);
            }

            if (!recipientID || isNaN(amount) || amount <= 0) {
                return api.sendMessage(`⚠️ **Sai cú pháp!**\nDùng: ${effectivePrefix}admin bank [@tag/UID/reply] [số tiền]`, threadID, messageID);
            }

            const bankData = readJSON(BANK_DATA_PATH);
            if (!bankData[recipientID]) {
                return api.sendMessage("❌ Người dùng này chưa có tài khoản ngân hàng.", threadID, messageID);
            }

            bankData[recipientID].balance += amount;
            writeJSON(BANK_DATA_PATH, bankData);

            const recipientName = bankData[recipientID].name;
            return api.sendMessage(`✅ Đã cộng thành công ${amount.toLocaleString('vi-VN')} VNĐ vào tài khoản của ${recipientName}.\n- Số dư mới: ${bankData[recipientID].balance.toLocaleString('vi-VN')} VNĐ`, threadID, messageID);
        }

        default: {
            const helpMessage = `--- ADMIN TOOLKIT ---\n` +
                `1. ${effectivePrefix}admin only [on/off]: Bật/tắt chế độ chỉ admin dùng lệnh.\n` +
                `2. ${effectivePrefix}admin ban: Cấm nhóm hiện tại.\n` +
                `3. ${effectivePrefix}admin unban [ID nhóm]: Gỡ cấm nhóm.\n` +
                `4. ${effectivePrefix}admin bank [@tag/UID/reply] [số tiền]: Cộng tiền vào tài khoản bank.`;
            return api.sendMessage(helpMessage, threadID, messageID);
        }
    }
};