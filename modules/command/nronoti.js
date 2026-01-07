// file: modules/command/nronoti.js
module.exports.config = {
    name: "nronoti",
    version: "1.0.0",
    hasPermssion: 1, // QTV nhóm
    credits: "GPT",
    description: "Quản lý thông báo tự động từ NRO Boss Tracker",
    commandCategory: "NRO",
    usages: "[on/off/server/type/interval/status]",
    cooldowns: 5,
};

module.exports.run = async function ({ api, event, args }) {
    // Gọi hàm handleCommand từ event nro_notify
    const nroNotifyEvent = global.events.get("nro_notify");

    if (!nroNotifyEvent || !nroNotifyEvent.handleCommand) {
        return api.sendMessage("❌ Module NRO Notify chưa được load. Vui lòng khởi động lại bot.", event.threadID, event.messageID);
    }

    await nroNotifyEvent.handleCommand(api, event, args);
};