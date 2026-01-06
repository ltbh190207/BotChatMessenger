const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const moment = require("moment-timezone");

module.exports.config = {
    name: "onJoin",
    eventType: ["log:subscribe"],
    version: "9.0.0-modern-design",
    credits: "GPT & Tên bạn",
    description: "Tạo ảnh chào mừng với layout hiện đại."
};

function circleImage(ctx, img, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
}

function wrapText(ctx, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const testLine = currentLine + ' ' + words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth) {
            lines.push(currentLine);
            currentLine = words[i];
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine);
    return lines;
}

module.exports.handleEvent = async function ({ api, event }) {
    const { logMessageData, threadID } = event;
    const { addedParticipants } = logMessageData;

    if (!addedParticipants || addedParticipants.length === 0) return;

    let threadInfo;
    try {
        threadInfo = await api.getThreadInfo(threadID);
    } catch (e) {
        console.error("❌ [ONJOIN] Lỗi khi lấy thông tin nhóm:", e);
        return;
    }

    for (const participant of addedParticipants) {
        if (participant.userFbId === api.getCurrentUserID()) continue;

        const userID = participant.userFbId;
        const userName = participant.fullName;
        const joinTime = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss - DD/MM/YYYY");

        try {
            // Tạo canvas
            const canvasWidth = 1200;
            const canvasHeight = 400;
            const canvas = createCanvas(canvasWidth, canvasHeight);
            const ctx = canvas.getContext("2d");

            // Vẽ background
            const backgroundPath = path.join(__dirname, "..", "..", "data", "pic", "background.png");
            let background;
            try {
                background = await loadImage(backgroundPath);
                ctx.drawImage(background, 0, 0, canvasWidth, canvasHeight);
            } catch (e) {
                // Nếu không có background, tạo gradient
                const gradient = ctx.createLinearGradient(0, 0, canvasWidth, canvasHeight);
                gradient.addColorStop(0, "#1a1a2e");
                gradient.addColorStop(0.5, "#16213e");
                gradient.addColorStop(1, "#0f3460");
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            }

            // Load avatar
            const avatarUrl = `https://graph.facebook.com/${userID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
            const avatar = await loadImage(avatarUrl);

            // Vị trí avatar
            const avatarSize = 180;
            const avatarX = 60;
            const avatarY = (canvasHeight - avatarSize) / 2;

            // Vẽ viền sáng cho avatar
            ctx.shadowColor = "rgba(0, 255, 255, 0.8)";
            ctx.shadowBlur = 25;
            ctx.beginPath();
            ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2);
            ctx.strokeStyle = "#00ffff";
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.shadowBlur = 0;

            // Vẽ avatar tròn
            circleImage(ctx, avatar, avatarX, avatarY, avatarSize);

            // --- VẼ HỘP TEXT BÊN PHẢI ---
            const boxX = avatarX + avatarSize + 40;
            const boxY = 60;
            const boxWidth = canvasWidth - boxX - 60;
            const boxHeight = canvasHeight - 120;

            // Vẽ hộp nền gradient
            const boxGradient = ctx.createLinearGradient(boxX, boxY, boxX + boxWidth, boxY + boxHeight);
            boxGradient.addColorStop(0, "rgba(0, 150, 136, 0.8)"); // Xanh lá đậm
            boxGradient.addColorStop(1, "rgba(0, 100, 200, 0.8)"); // Xanh dương

            ctx.fillStyle = boxGradient;
            ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
            ctx.shadowBlur = 20;
            ctx.shadowOffsetX = 5;
            ctx.shadowOffsetY = 5;

            // Bo tròn góc
            const radius = 20;
            ctx.beginPath();
            ctx.moveTo(boxX + radius, boxY);
            ctx.lineTo(boxX + boxWidth - radius, boxY);
            ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
            ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
            ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
            ctx.lineTo(boxX + radius, boxY + boxHeight);
            ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
            ctx.lineTo(boxX, boxY + radius);
            ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
            ctx.closePath();
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;

            // --- VẼ TEXT ---
            const textX = boxX + 30;
            let textY = boxY + 55;

            // Dòng 1: "Welcome, [Tên]"
            ctx.font = "bold 50px Arial";
            ctx.fillStyle = "#FFD700"; // Vàng
            const welcomeText = "Welcome,";
            ctx.fillText(welcomeText, textX, textY);

            const welcomeWidth = ctx.measureText(welcomeText).width;
            ctx.fillStyle = "#FFFFFF"; // Trắng
            ctx.fillText(` ${userName}`, textX + welcomeWidth, textY);

            textY += 70;

            // Dòng 2: "Chào mừng bạn đến với [nhóm]"
            ctx.font = "normal 32px Arial";
            ctx.fillStyle = "#FFFFFF";
            const groupName = threadInfo.threadName || "nhóm";
            const line2 = `Chào mừng bạn đến với ${groupName}`;
            const lines2 = wrapText(ctx, line2, boxWidth - 60);

            for (const line of lines2) {
                ctx.fillText(line, textX, textY);
                textY += 40;
            }

            textY += 20;

            // Dòng 3: "Hãy chăm chỉ tương tác!"
            ctx.font = "italic 30px Arial";
            ctx.fillStyle = "#FFEB3B"; // Vàng chanh
            ctx.fillText("Hãy chăm chỉ tương tác !", textX, textY);

            textY += 55;

            // Dòng 4: Thời gian
            ctx.font = "normal 26px Arial";
            ctx.fillStyle = "#E0E0E0"; // Xám sáng
            ctx.fillText(`⏰ Thời gian tham gia: ${joinTime}`, textX, textY);

            // --- GỬI ẢNH ---
            const imageBuffer = canvas.toBuffer();
            const imagePath = path.join(__dirname, `../../cache/onJoin_${userID}.png`);
            fs.writeFileSync(imagePath, imageBuffer);

            const msg = {
                body: `🎉 Chào mừng ${userName} đã đến với ${threadInfo.threadName || "nhóm"}!`,
                mentions: [{ tag: userName, id: userID }],
                attachment: fs.createReadStream(imagePath)
            };

            api.sendMessage(msg, threadID, () => fs.unlinkSync(imagePath));

            console.log(`✅ [ONJOIN] Đã tạo ảnh chào mừng cho ${userName}`);

        } catch (error) {
            console.error(`❌ [ONJOIN] Lỗi khi tạo ảnh cho ${userName}:`, error);
            api.sendMessage(`Chào mừng ${userName} đã đến với nhóm!`, threadID);
        }
    }
};