const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");
const { createCanvas, loadImage } = require("canvas");

const QTV_SETTINGS_PATH = path.join(__dirname, "../../data/qtv_settings.json");
const CHECKTT_DATA_PATH = path.join(__dirname, "../../data/checktt_data.json");

module.exports.config = {
    name: "qtv",
    version: "1.2.1-silent-gen", // Cập nhật phiên bản
    hasPermssion: 1,
    credits: "GPT",
    description: "Bộ công cụ dành cho Quản trị viên nhóm.",
    commandCategory: "QTV",
    usages: "[only on/off | checktt]",
    cooldowns: 5,
};

function readJSON(filePath, defaultValue = {}) {
    if (!fs.existsSync(filePath)) return defaultValue;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

// --- HÀM VẼ CANVAS CHO CHECKTT ---
async function createCheckttCard(topUsers, threadName) {
    const canvasHeight = 150 + (topUsers.length * 70); // Chiều cao động
    const canvas = createCanvas(1200, canvasHeight);
    const ctx = canvas.getContext("2d");

    // Background
    const backgroundPath = path.join(__dirname, "../../data/pic/top_background.png");
    try {
        const background = await loadImage(backgroundPath);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    } catch (e) {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, "#232526");
        gradient.addColorStop(1, "#414345");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.font = "bold 60px Arial";
    ctx.fillStyle = "#FFD700";
    ctx.textAlign = "center";
    ctx.fillText("BẢNG XẾP HẠNG TƯƠNG TÁC", canvas.width / 2, 80);

    let yOffset = 150;

    for (let i = 0; i < topUsers.length; i++) {
        const user = topUsers[i];
        const medal = (i === 0) ? '🥇' : (i === 1) ? '🥈' : (i === 2) ? '🥉' : `${i + 1}.`;

        ctx.font = "bold 40px Arial";
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "left";
        ctx.fillText(`${medal} ${user.name}`, 150, yOffset);

        ctx.font = "30px Arial";
        ctx.fillStyle = "#ADD8E6";
        ctx.textAlign = "right";
        ctx.fillText(`${user.count} tin nhắn | ${user.reactionCount || 0} cảm xúc`, canvas.width - 100, yOffset);

        yOffset += 70;
    }

    return canvas.toBuffer();
}

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;
    const action = args[0]?.toLowerCase();
    const effectivePrefix = (global.data.threadData.get(String(threadID)) || {}).PREFIX || global.config.prefix;

    switch (action) {
        case "only": {
            // ... (phần code này giữ nguyên)
            const settings = readJSON(QTV_SETTINGS_PATH);
            const status = args[1]?.toLowerCase();
            if (status === 'on') {
                settings[threadID] = { qtvonly: true };
                writeJSON(QTV_SETTINGS_PATH, settings);
                return api.sendMessage("✅ Đã bật chế độ 'chỉ QTV dùng lệnh' trong nhóm này.", threadID, messageID);
            } else if (status === 'off') {
                if (settings[threadID]) {
                    delete settings[threadID];
                    writeJSON(QTV_SETTINGS_PATH, settings);
                }
                return api.sendMessage("🚫 Đã tắt chế độ 'chỉ QTV dùng lệnh'. Mọi thành viên có thể sử dụng bot.", threadID, messageID);
            } else {
                return api.sendMessage(`Dùng: ${effectivePrefix}qtv only [on/off]`, threadID, messageID);
            }
        }

        case "checktt": {
            if (!fs.existsSync(CHECKTT_DATA_PATH)) {
                return api.sendMessage("Chưa có dữ liệu tương tác nào được ghi nhận. Hãy trò chuyện thêm!", threadID, messageID);
            }
            const data = readJSON(CHECKTT_DATA_PATH);
            const today = moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD");
            const threadData = data[threadID];

            if (!threadData || threadData.date !== today || Object.keys(threadData.members).length === 0) {
                return api.sendMessage("Chưa có dữ liệu tương tác cho ngày hôm nay. Hãy trò chuyện thêm!", threadID, messageID);
            }

            const membersArray = Object.values(threadData.members);
            const sortedMembers = membersArray.sort((a, b) => b.count - a.count);
            const topUsers = sortedMembers.slice(0, 10);

            // --- THAY ĐỔI Ở ĐÂY: Bỏ tin nhắn chờ ---
            try {
                const threadInfo = await api.getThreadInfo(threadID);
                const threadName = threadInfo.name || "Nhóm này";

                const imageBuffer = await createCheckttCard(topUsers, threadName);
                const imagePath = path.join(__dirname, `../../cache/checktt_${threadID}.png`);
                fs.writeFileSync(imagePath, imageBuffer);

                return api.sendMessage({
                    body: `Bảng xếp hạng tương tác của nhóm "${threadName}" hôm nay!`,
                    attachment: fs.createReadStream(imagePath)
                }, threadID, () => fs.unlinkSync(imagePath), messageID);
            } catch (e) {
                console.error("[QTV checktt] Lỗi khi tạo ảnh:", e);
                return api.sendMessage("Đã có lỗi xảy ra khi tạo bảng xếp hạng.", threadID, messageID);
            }
            // --- KẾT THÚC THAY ĐỔI ---
        }

        default: {
            const helpMessage = `--- BỘ CÔNG CỤ QTV ---\n` +
                `1. ${effectivePrefix}qtv only [on/off]: Bật/tắt chế độ chỉ QTV dùng lệnh.\n` +
                `2. ${effectivePrefix}qtv checktt: Xem bảng xếp hạng tương tác trong ngày.`;
            return api.sendMessage(helpMessage, threadID, messageID);
        }
    }
};