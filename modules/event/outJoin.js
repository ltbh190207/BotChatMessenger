const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");
const axios = require("axios");

module.exports.config = {
    name: "outJoin",
    eventType: ["log:unsubscribe"],
    version: "2.0.0-modern-design",
    credits: "GPT & Tên bạn",
    description: "Tạo ảnh thông báo khi thành viên rời nhóm (tự out hoặc bị kick)."
};

// --- CÁC HÀM TIỆN ÍCH ---
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

// --- XỬ LÝ SỰ KIỆN ---
module.exports.handleEvent = async function ({ api, event }) {
    const { logMessageData, threadID, author } = event;
    const leftParticipantFbId = logMessageData.leftParticipantFbId;

    if (leftParticipantFbId === api.getCurrentUserID()) return;

    try {
        const [userInfo, authorInfo] = await Promise.all([
            api.getUserInfo(leftParticipantFbId),
            api.getUserInfo(author)
        ]);

        const userName = userInfo[leftParticipantFbId]?.name || "Một thành viên";
        const authorName = authorInfo[author]?.name || "Một người dùng";
        const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss - DD/MM/YYYY");

        let eventType, title, mainText, titleColor, boxGradient;

        // Xác định sự kiện và thiết lập nội dung tương ứng
        if (author === leftParticipantFbId) {
            eventType = "leave";
            title = "Tạm biệt,";
            mainText = `${userName} đã rời khỏi nhóm.`;
            titleColor = "#FFA500"; // Cam
            boxGradient = ["#4A4A4A", "#2C3E50"]; // Gradient Xám -> Xanh đậm
        } else {
            eventType = "kick";
            title = "Đã bị xóa,";
            mainText = `${userName} bởi QTV ${authorName}.`;
            titleColor = "#FF4136"; // Đỏ
            boxGradient = ["#8B0000", "#4A148C"]; // Gradient Đỏ đậm -> Tím đậm
        }

        // --- BẮT ĐẦU TẠO ẢNH ---
        const canvasWidth = 1200;
        const canvasHeight = 400;
        const canvas = createCanvas(canvasWidth, canvasHeight);
        const ctx = canvas.getContext("2d");

        // Vẽ background (có fallback gradient)
        const backgroundPath = path.join(__dirname, "..", "..", "data", "pic", "background.png");
        try {
            const background = await loadImage(backgroundPath);
            ctx.drawImage(background, 0, 0, canvasWidth, canvasHeight);
        } catch (e) {
            const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
            gradient.addColorStop(0, "#1a1a2e");
            gradient.addColorStop(1, "#0f3460");
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        // Tải avatar
        const avatarUrl = `https://graph.facebook.com/${leftParticipantFbId}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const avatar = await loadImage(avatarUrl);

        const avatarSize = 180;
        const avatarX = 60;
        const avatarY = (canvasHeight - avatarSize) / 2;

        // Vẽ avatar và viền sáng
        ctx.shadowColor = (eventType === "leave") ? "rgba(255, 165, 0, 0.8)" : "rgba(255, 0, 0, 0.8)";
        ctx.shadowBlur = 25;
        ctx.strokeStyle = (eventType === "leave") ? "#FFA500" : "#FF4136";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        circleImage(ctx, avatar, avatarX, avatarY, avatarSize);

        // --- VẼ HỘP TEXT BÊN PHẢI ---
        const boxX = avatarX + avatarSize + 40;
        const boxY = 60;
        const boxWidth = canvasWidth - boxX - 60;
        const boxHeight = canvasHeight - 120;
        const radius = 20;

        const bgBoxGradient = ctx.createLinearGradient(boxX, boxY, boxX + boxWidth, boxY + boxHeight);
        bgBoxGradient.addColorStop(0, boxGradient[0]);
        bgBoxGradient.addColorStop(1, boxGradient[1]);
        ctx.fillStyle = bgBoxGradient;

        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        drawRoundedRect(ctx, boxX, boxY, boxWidth, boxHeight, radius);
        ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;

        // --- VẼ TEXT ---
        const textX = boxX + 30;
        let textY = boxY + 70;

        ctx.font = "bold 60px Arial";
        ctx.fillStyle = titleColor;
        ctx.fillText(title, textX, textY);
        textY += 80;

        ctx.font = "normal 40px Arial";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(mainText, textX, textY);
        textY += 100;

        ctx.font = "normal 28px Arial";
        ctx.fillStyle = "#E0E0E0";
        ctx.fillText(`⏰ Lúc: ${time}`, textX, textY);

        // --- GỬI ẢNH ---
        const imageBuffer = canvas.toBuffer();
        const imagePath = path.join(__dirname, `../../cache/onOut_${leftParticipantFbId}.png`);
        fs.writeFileSync(imagePath, imageBuffer);

        const msgBody = (eventType === "leave")
            ? `👋 ${userName} đã rời khỏi nhóm.`
            : `🚫 ${userName} đã bị xóa khỏi nhóm.`;

        const msg = {
            body: msgBody,
            mentions: [{ tag: userName, id: leftParticipantFbId }],
            attachment: fs.createReadStream(imagePath)
        };

        api.sendMessage(msg, threadID, () => fs.unlinkSync(imagePath));
        console.log(`✅ [OUTJOIN] Đã tạo ảnh thông báo rời nhóm cho ${userName}`);

    } catch (error) {
        console.error("❌ [OUTJOIN] Lỗi khi xử lý sự kiện rời nhóm:", error);
        api.sendMessage(`👋 Một thành viên vừa rời khỏi nhóm.`, threadID); // Fallback đơn giản
    }
};