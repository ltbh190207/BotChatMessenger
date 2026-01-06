const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");
const axios = require("axios");

const BANNED_THREADS_PATH = path.join(__dirname, "../../data/banned_threads.json");

module.exports.config = {
    name: "autoleave",
    eventType: ["log:subscribe"],
    version: "2.0.0-canvas",
    credits: "GPT",
    description: "Tự động rời khỏi các nhóm đã bị cấm với thông báo bằng ảnh."
};

// --- CÁC HÀM TIỆN ÍCH VẼ CANVAS (Lấy từ outJoin.js) ---
function circleImage(ctx, img, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

// --- HÀM TẠO ẢNH THÔNG BÁO ---
async function createBanNotificationImage(botName, adminAvatarUrl) {
    const canvasWidth = 1200;
    const canvasHeight = 400;
    const canvas = createCanvas(canvasWidth, canvasHeight);
    const ctx = canvas.getContext("2d");

    // Vẽ background
    const backgroundPath = path.join(__dirname, "..", "..", "data", "pic", "background.png");
    try {
        const background = await loadImage(backgroundPath);
        ctx.drawImage(background, 0, 0, canvasWidth, canvasHeight);
    } catch (e) {
        const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
        gradient.addColorStop(0, "#232526");
        gradient.addColorStop(1, "#414345");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Tải avatar của Admin
    const avatar = await loadImage(adminAvatarUrl);
    const avatarSize = 180;
    const avatarX = 60;
    const avatarY = (canvasHeight - avatarSize) / 2;

    // Vẽ avatar admin và viền sáng
    ctx.shadowColor = "rgba(255, 0, 0, 0.8)";
    ctx.shadowBlur = 25;
    ctx.strokeStyle = "#FF4136";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    circleImage(ctx, avatar, avatarX, avatarY, avatarSize);

    // Vẽ hộp text bên phải
    const boxX = avatarX + avatarSize + 40;
    const boxY = 60;
    const boxWidth = canvasWidth - boxX - 60;
    const boxHeight = canvasHeight - 120;

    const boxGradient = ctx.createLinearGradient(boxX, boxY, boxX + boxWidth, boxY + boxHeight);
    boxGradient.addColorStop(0, "rgba(139, 0, 0, 0.8)"); // Đỏ đậm
    boxGradient.addColorStop(1, "rgba(74, 20, 140, 0.8)"); // Tím đậm
    ctx.fillStyle = boxGradient;

    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 20;
    drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, 20);
    ctx.shadowBlur = 0;

    // Vẽ text
    const textX = boxX + 30;
    let textY = boxY + 50;

    ctx.font = "bold 45px Arial";
    ctx.fillStyle = "#FF4136";
    ctx.fillText("THÔNG BÁO HỆ THỐNG", textX, textY);
    textY += 60;

    ctx.font = "normal 32px Arial";
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(`Bot: ${botName}`, textX, textY);
    textY += 45;

    ctx.fillText("Lý do: Nhóm này đã bị cấm sử dụng bot.", textX, textY);
    textY += 45;

    ctx.fillText("Hành động: Tự động rời khỏi nhóm.", textX, textY);
    textY += 60;

    ctx.font = "italic 30px Arial";
    ctx.fillStyle = "#FFD700";
    ctx.fillText("Ghi chú: Vui lòng liên hệ Admin để được gỡ cấm.", textX, textY);
    textY += 45;

    ctx.font = "normal 26px Arial";
    ctx.fillStyle = "#E0E0E0";
    ctx.fillText(`⏰ Lúc: ${moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss - DD/MM/YYYY")}`, textX, textY);

    return canvas.toBuffer();
}

// --- XỬ LÝ SỰ KIỆN CHÍNH ---
module.exports.handleEvent = async function ({ api, event }) {
    const botID = api.getCurrentUserID();
    const wasBotAdded = event.logMessageData.addedParticipants.some(p => p.userFbId === botID);
    const { threadID } = event;

    if (wasBotAdded) {
        if (!fs.existsSync(BANNED_THREADS_PATH)) return;
        const bannedThreads = JSON.parse(fs.readFileSync(BANNED_THREADS_PATH, "utf8"));

        if (bannedThreads.includes(threadID)) {
            try {
                // Lấy thông tin cần thiết để tạo ảnh
                const botName = global.config.botName || "My Bot";
                const adminUID = global.config.adminUID[0]; // Lấy UID của chủ bot
                const adminAvatarUrl = `https://graph.facebook.com/${adminUID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;

                // Tạo ảnh thông báo
                const imageBuffer = await createBanNotificationImage(botName, adminAvatarUrl);
                const imagePath = path.join(__dirname, `../../cache/autoleave_${threadID}.png`);
                fs.writeFileSync(imagePath, imageBuffer);

                // Gửi ảnh rồi mới rời đi
                api.sendMessage({
                    body: "🚫 Nhóm này đã bị cấm sử dụng bot.",
                    attachment: fs.createReadStream(imagePath)
                }, threadID, () => {
                    api.removeUserFromGroup(botID, threadID);
                    fs.unlinkSync(imagePath); // Dọn dẹp file ảnh
                });

            } catch (error) {
                console.error("❌ [AUTOLEAVE] Lỗi khi tạo ảnh thông báo:", error);
                // Fallback: Gửi tin nhắn văn bản nếu tạo ảnh lỗi
                api.sendMessage("Nhóm này đã bị cấm sử dụng bot. Tự động rời đi.", threadID, () => {
                    api.removeUserFromGroup(botID, threadID);
                });
            }
        }
    }
};