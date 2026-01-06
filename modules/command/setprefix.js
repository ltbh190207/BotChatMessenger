const fs = require("fs");
const path = require("path");

module.exports.config = {
    name: "setprefix",
    version: "2.2.0",
    hasPermssion: 0,
    credits: "User",
    description: "Thay đổi prefix và cập nhật biệt danh cho bot.",
    commandCategory: "Box chat",
    usages: "[prefix mới] hoặc [reset]",
    cooldowns: 5,
};

function savePrefixes(dataMap) {
    try {
        const prefixesPath = path.join(__dirname, "..", "..", "data", "prefixes.json");
        const dataToSave = Object.fromEntries(dataMap);
        fs.writeFileSync(prefixesPath, JSON.stringify(dataToSave, null, 4));
    } catch (error) {
        console.error("Lỗi khi lưu file prefix:", error);
    }
}

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, senderID } = event;
    const botName = global.config.BOTNAME || "Bot";

    // --- KIỂM TRA QUYỀN HẠN ---
    try {
        const threadInfo = await api.getThreadInfo(threadID);
        const isBotAdmin = global.config.adminUID.includes(senderID);
        const isGroupAdmin = threadInfo.adminIDs.some(admin => admin.id === senderID);

        if (!isBotAdmin && !isGroupAdmin) {
            return api.sendMessage("🚫 Bạn không đủ quyền hạn. Yêu cầu là Quản trị viên nhóm hoặc Admin Bot.", threadID, messageID);
        }
    } catch (e) { /* ... */ }

    if (args.length === 0) {
        return api.sendMessage("⚠️ Vui lòng nhập prefix mới hoặc 'reset' để về mặc định.", threadID, messageID);
    }

    const newPrefix = args[0].trim();
    let successMessage = "";
    let dataMap = global.data.threadData;
    let threadSettings = dataMap.get(String(threadID)) || {};

    if (newPrefix === "reset") {
        const defaultPrefix = global.config.prefix;
        delete threadSettings.PREFIX;
        successMessage = `☑️ Đã reset prefix về mặc định của bot: ${defaultPrefix}`;
        try { await api.changeNickname(`『 ${botName}- ${defaultPrefix} 』`, threadID, api.getCurrentUserID()); } catch (e) { /* ... */ }
    } else {
        threadSettings.PREFIX = newPrefix;
        successMessage = `☑️ Đã thay đổi prefix của nhóm thành: ${newPrefix}`;
        try { await api.changeNickname(`『 ${botName}- ${newPrefix} 』`, threadID, api.getCurrentUserID()); } catch (e) { /* ... */ }
    }

    dataMap.set(String(threadID), threadSettings);
    savePrefixes(dataMap); // Lưu thay đổi ra file

    return api.sendMessage(successMessage, threadID, messageID);
};