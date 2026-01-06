const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

const dataPath = path.join(__dirname, "..", "..", "data", "bank.json");

module.exports.config = {
    name: "bank",
    version: "3.2.2-prefix-fix",
    hasPermssion: 0,
    credits: "GPT & Tên bạn",
    description: "Quản lý tài khoản ngân hàng (VNĐ): xem thông tin, chuyển tiền.",
    commandCategory: "Kinh tế",
    usages: "[trade/chuyen] [UID/@tag] [số tiền]\n[trade/chuyen] [số tiền] (khi reply)",
    cooldowns: 10
};

// --- CÁC HÀM TIỆN ÍCH VẼ CANVAS ---
function circleImage(ctx, img, x, y, size) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(img, x, y, size, size);
    ctx.restore();
}

async function drawBackground(ctx, canvas) {
    const backgroundPath = path.join(__dirname, "..", "..", "data", "pic", "bank_background.png");
    try {
        const background = await loadImage(backgroundPath);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    } catch (e) {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, "#0F2027");
        gradient.addColorStop(0.5, "#203A43");
        gradient.addColorStop(1, "#2C5364");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

async function drawSuccessCanvas(senderName, recipientName, amount, newBalance) {
    const canvas = createCanvas(1200, 675);
    const ctx = canvas.getContext("2d");
    await drawBackground(ctx, canvas);

    ctx.fillStyle = "#4CAF50";
    ctx.font = "bold 70px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GIAO DỊCH THÀNH CÔNG", canvas.width / 2, 120);

    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "left";
    ctx.font = "normal 45px Arial";
    ctx.fillText("Người gửi:", 100, 220);
    ctx.font = "bold 50px Arial";
    ctx.fillText(senderName, 100, 280);

    ctx.font = "normal 45px Arial";
    ctx.fillText("Người nhận:", 700, 220);
    ctx.font = "bold 50px Arial";
    ctx.fillText(recipientName, 700, 280);

    ctx.font = "bold 90px Arial";
    ctx.fillText("→", 550, 265);

    ctx.font = "normal 50px Arial";
    ctx.fillText("Số tiền chuyển:", 100, 450);
    ctx.font = "bold 70px Arial";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(`${amount.toLocaleString('vi-VN')} VNĐ`, 100, 520);

    ctx.font = "normal 40px Arial";
    ctx.fillStyle = "#E0E0E0";
    ctx.fillText(`Số dư còn lại: ${newBalance.toLocaleString('vi-VN')} VNĐ`, 100, 600);

    return canvas.toBuffer();
}

async function drawErrorCanvas(errorMessage) {
    const canvas = createCanvas(1200, 675);
    const ctx = canvas.getContext("2d");
    await drawBackground(ctx, canvas);

    ctx.fillStyle = "#FF4136";
    ctx.font = "bold 70px Arial";
    ctx.textAlign = "center";
    ctx.fillText("GIAO DỊCH THẤT BẠI", canvas.width / 2, 120);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "normal 50px Arial";
    const lines = errorMessage.split('\n');
    let y = 350;
    for (const line of lines) {
        ctx.fillText(line, canvas.width / 2, y);
        y += 60;
    }

    return canvas.toBuffer();
}


// --- HÀM CHÍNH ---
module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID, senderID, type, messageReply } = event;
    const command = args[0]?.toLowerCase();

    // --- XÁC ĐỊNH PREFIX HIỆU LỰC CHO PHẦN HƯỚNG DẪN ---
    const groupPrefix = (global.data.threadData.get(String(threadID)) || {}).PREFIX;
    const defaultPrefix = global.config.prefix;
    const effectivePrefix = groupPrefix || defaultPrefix;
    // --- KẾT THÚC XÁC ĐỊNH PREFIX ---

    // --- LOGIC CHUYỂN TIỀN ---
    if (command === "trade" || command === "chuyen") {
        let recipientID, amount;

        if (type === "message_reply") {
            recipientID = messageReply.senderID;
            amount = parseInt(args[1]);
        } else if (Object.keys(event.mentions).length > 0) {
            recipientID = Object.keys(event.mentions)[0];
            amount = parseInt(args[args.length - 1]);
        } else if (args.length > 2) {
            recipientID = args[1];
            amount = parseInt(args[2]);
        }

        if (!recipientID || !amount || isNaN(amount)) {
            const usageMessage = `⚠️ **Sai cú pháp!**\n\nĐể chuyển tiền, hãy dùng:\n` +
                `1. Gõ: \`${effectivePrefix}bank trade [@tag] [số tiền]\`\n` + // Sử dụng prefix động
                `2. Reply tin nhắn rồi gõ: \`${effectivePrefix}bank trade [số tiền]\``; // Sử dụng prefix động
            return api.sendMessage(usageMessage, threadID, messageID);
        }

        let errorMsg = "";
        if (amount < 1000) errorMsg = "Số tiền chuyển tối thiểu là 1,000 VNĐ";
        else if (recipientID == senderID) errorMsg = "Bạn không thể tự chuyển tiền cho chính mình.";

        if (errorMsg) {
            const errorBuffer = await drawErrorCanvas(errorMsg);
            const imagePath = path.join(__dirname, `../../cache/trade_error_${senderID}.png`);
            fs.writeFileSync(imagePath, errorBuffer);
            return api.sendMessage({ attachment: fs.createReadStream(imagePath) }, threadID, () => fs.unlinkSync(imagePath), messageID);
        }

        let bankData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

        if (!bankData[senderID]) errorMsg = "Bạn chưa có tài khoản ngân hàng.\nDùng /bank để đăng ký.";
        else if (!bankData[recipientID]) errorMsg = "Người nhận chưa có tài khoản ngân hàng.";
        else if (bankData[senderID].balance < amount) errorMsg = `Số dư của bạn không đủ.\nBạn còn thiếu ${(amount - bankData[senderID].balance).toLocaleString('vi-VN')} VNĐ`;

        if (errorMsg) {
            const errorBuffer = await drawErrorCanvas(errorMsg);
            const imagePath = path.join(__dirname, `../../cache/trade_error_${senderID}.png`);
            fs.writeFileSync(imagePath, errorBuffer);
            return api.sendMessage({ attachment: fs.createReadStream(imagePath) }, threadID, () => fs.unlinkSync(imagePath), messageID);
        }

        bankData[senderID].balance -= amount;
        bankData[recipientID].balance += amount;
        fs.writeFileSync(dataPath, JSON.stringify(bankData, null, 4));

        const senderName = bankData[senderID].name;
        const recipientName = bankData[recipientID].name;

        const successBuffer = await drawSuccessCanvas(senderName, recipientName, amount, bankData[senderID].balance);
        const imagePath = path.join(__dirname, `../../cache/trade_success_${senderID}.png`);
        fs.writeFileSync(imagePath, successBuffer);
        return api.sendMessage({ body: `✅ Giao dịch thành công!`, attachment: fs.createReadStream(imagePath) }, threadID, () => fs.unlinkSync(imagePath), messageID);
    }

    // --- LOGIC XEM THÔNG TIN CÁ NHÂN ---
    try {
        let bankData;
        if (!fs.existsSync(dataPath)) {
            fs.writeFileSync(dataPath, JSON.stringify({}));
            bankData = {};
        } else {
            bankData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        }

        const canvas = createCanvas(1200, 675);
        const ctx = canvas.getContext("2d");
        await drawBackground(ctx, canvas);

        const avatarUrl = `https://graph.facebook.com/${senderID}/picture?width=720&height=720&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
        const avatar = await loadImage(avatarUrl);
        circleImage(ctx, avatar, 890, 75, 230);

        let isNewUser = false;
        if (!bankData.hasOwnProperty(senderID)) {
            isNewUser = true;
            const [userInfo, threadInfo] = await Promise.all([api.getUserInfo(senderID), api.getThreadInfo(threadID)]);
            const userName = userInfo[senderID]?.name || `User ID: ${senderID}`;
            const threadName = threadInfo.name || `Group ID: ${threadID}`;

            bankData[senderID] = { name: userName, userID: senderID, balance: 100000, registeredIn: { threadName, threadID } };
            fs.writeFileSync(dataPath, JSON.stringify(bankData, null, 4));

            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 60px Arial"; ctx.fillText("CHÀO MỪNG ĐẾN VỚI AI-BANK", 75, 200);
            ctx.font = "normal 45px Arial"; ctx.fillText(`Tài khoản của ${userName} đã được tạo!`, 75, 300);
            ctx.font = "normal 40px Arial"; ctx.fillText("Số dư khởi đầu:", 75, 450);
            ctx.font = "bold 80px Arial"; ctx.fillStyle = "#4CAF50"; ctx.fillText(`100,000 VNĐ`, 70, 540);
        } else {
            const userData = bankData[senderID];
            const formattedBalance = userData.balance.toLocaleString('vi-VN');

            ctx.fillStyle = "#FFFFFF";
            ctx.font = "bold 65px Arial"; ctx.fillText("AI-BANK", 75, 150);
            ctx.font = "normal 40px Arial"; ctx.fillText("Chủ tài khoản:", 75, 250);
            ctx.font = "bold 50px Arial"; ctx.fillText(userData.name, 75, 310);
            ctx.font = "normal 40px Arial"; ctx.fillText("UID:", 75, 380);
            ctx.font = "bold 50px Arial"; ctx.fillText(userData.userID, 75, 440);
            ctx.font = "normal 45px Arial"; ctx.fillText("Số dư:", 75, 550);
            ctx.font = "bold 80px Arial"; ctx.fillStyle = "#4CAF50"; ctx.fillText(`${formattedBalance} VNĐ`, 70, 630);

            ctx.font = "italic 30px Arial";
            ctx.fillStyle = "#FFD700";
            ctx.textAlign = "right";
            ctx.fillText(`Chuyển tiền? Gõ: ${effectivePrefix}bank trade ... →`, canvas.width - 50, canvas.height - 40); // Sử dụng prefix động
            ctx.textAlign = "left";
        }

        const imageBuffer = canvas.toBuffer();
        const imagePath = path.join(__dirname, `../../cache/bank_${senderID}.png`);
        fs.writeFileSync(imagePath, imageBuffer);

        const replyMessage = isNewUser ? `🎉 Chào mừng bạn! Tài khoản đã được tạo.` : `🏦 Chào mừng bạn đến với AI-BANK`;

        api.sendMessage({ body: replyMessage, attachment: fs.createReadStream(imagePath) }, threadID, () => fs.unlinkSync(imagePath), messageID);

    } catch (e) {
        console.error("[BANK CANVAS] Đã xảy ra lỗi:", e);
        api.sendMessage("❌ Có lỗi xảy ra với hệ thống ngân hàng.", threadID, messageID);
    }
};