const os = require("os");

module.exports.config = {
    name: "upt",
    version: "1.1.0",
    hasPermssion: 0,
    credits: "GPT & Tên bạn",
    description: "Hiển thị thời gian hoạt động và thông tin hệ thống của bot.",
    commandCategory: "Hệ thống",
    cooldowns: 5
};

function formatUptime(uptime) {
    const seconds = Math.floor(uptime % 60);
    const minutes = Math.floor((uptime / 60) % 60);
    const hours = Math.floor((uptime / (60 * 60)) % 24);
    const days = Math.floor(uptime / (60 * 60 * 24));

    return `${days} ngày, ${hours} giờ, ${minutes} phút, ${seconds} giây`;
}

module.exports.run = async function ({ api, event }) {
    // <<< THÊM DÒNG NÀY ĐỂ SỬA LỖI
    const startTime = Date.now();

    try {
        // Lấy tên bot một cách an toàn, có fallback
        const botName = global.config?.botName || "Bot";

        // Lấy thời gian hoạt động
        const uptime = process.uptime();
        const formattedUptime = formatUptime(uptime);

        // Lấy thông tin hệ thống
        const cpuInfo = os.cpus()[0];
        const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const freeMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
        const usedMemory = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

        // Tính toán thời gian xử lý lệnh
        const processingTime = Date.now() - startTime;

        const msg =
            `======  ${botName} ======\n` +
            `⏱️ Thời gian hoạt động: ${formattedUptime}\n` +
            `----------------------------------\n` +
            `💻 Hệ điều hành: ${os.type()} ${os.release()} (${os.arch()})\n` +
            `🤖 CPU Model: ${cpuInfo.model}\n` +
            `✅ Tốc độ CPU: ${cpuInfo.speed} MHz\n` +
            `💾 Tổng RAM: ${totalMemory} GB\n` +
            `📈 RAM trống: ${freeMemory} GB\n` +
            `📊 RAM bot đang dùng: ${usedMemory} MB\n` +
            `✨ Ping: ${processingTime}ms`;

        api.sendMessage(msg, event.threadID, event.messageID);

    } catch (e) {
        console.error("Lỗi trong lệnh uptime:", e);
        api.sendMessage("Đã có lỗi xảy ra khi lấy thông tin uptime.", event.threadID);
    }
};