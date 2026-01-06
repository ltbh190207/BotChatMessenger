const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

// <<< THAY ĐỔI: Đường dẫn đến file rank_data.json >>>
const RANK_DATA_PATH = path.join(__dirname, "../../data/rank_data.json");

module.exports.config = {
    name: "rank",
    version: "2.0.0-persistent-exp", // Cập nhật phiên bản
    hasPermssion: 0,
    credits: "GPT",
    description: "Xem thẻ rank dựa trên tổng EXP tương tác trong nhóm.",
    commandCategory: "Tiện ích",
    usages: "[reply/tag]",
    cooldowns: 10,
};

// --- CẤU HÌNH RANK ---
const RANKS = [
    { name: "Sắt", exp: 0, image: "iron.png" },
    { name: "Đồng", exp: 100, image: "bronze.png" },
    { name: "Bạc", exp: 300, image: "silver.png" },
    { name: "Vàng", exp: 600, image: "gold.png" },
    { name: "Bạch Kim", exp: 1000, image: "platinum.png" },
    { name: "Lục Bảo", exp: 1500, image: "emerald.png" },
    { name: "Kim Cương", exp: 2200, image: "diamond.png" },
    { name: "Cao Thủ", exp: 3000, image: "master.png" },
    { name: "Đại Cao Thủ", exp: 4000, image: "grandmaster.png" },
    { name: "Thách Đấu", exp: 5000, image: "challenger.png" }
];

function getRank(exp) {
    for (let i = RANKS.length - 1; i >= 0; i--) {
        if (exp >= RANKS[i].exp) {
            return { current: RANKS[i], next: (i < RANKS.length - 1) ? RANKS[i + 1] : null };
        }
    }
    return { current: RANKS[0], next: RANKS[1] };
}

// --- HÀM VẼ CANVAS (Giữ nguyên) ---
async function createRankCard(userInfo) {
    const { name, exp, rank, threadName } = userInfo;
    const canvas = createCanvas(900, 400);
    const ctx = canvas.getContext("2d");

    const backgroundPath = path.join(__dirname, "../../data/pic/rank_background.png");
    try {
        const background = await loadImage(backgroundPath);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
    } catch (e) {
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        gradient.addColorStop(0, "#232526"); gradient.addColorStop(1, "#414345");
        ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const rankImgPath = path.join(__dirname, "../../data/pic/", rank.current.image);
    try {
        const rankImg = await loadImage(rankImgPath);
        ctx.drawImage(rankImg, 75, 75, 250, 250);
    } catch { }

    ctx.font = "italic 30px Arial"; ctx.fillStyle = "#CCCCCC"; ctx.fillText(threadName, 400, 90);
    ctx.fillStyle = "#FFFFFF"; ctx.font = "bold 50px Arial"; ctx.fillText(name, 400, 150);
    ctx.font = "bold 45px Arial"; ctx.fillStyle = "#FFD700"; ctx.fillText(rank.current.name, 400, 220);

    const expBarWidth = 450, expBarHeight = 40;
    const currentExp = exp, startExp = rank.current.exp, endExp = rank.next ? rank.next.exp : currentExp;
    const progress = (endExp > startExp) ? Math.max(0, Math.min(1, (currentExp - startExp) / (endExp - startExp))) : 1; // Đảm bảo progress từ 0 đến 1

    ctx.fillStyle = "#555555"; ctx.fillRect(400, 270, expBarWidth, expBarHeight);
    const gradient = ctx.createLinearGradient(400, 0, 400 + expBarWidth, 0);
    gradient.addColorStop(0, "#FFD700"); gradient.addColorStop(1, "#FFA500");
    ctx.fillStyle = gradient; ctx.fillRect(400, 270, expBarWidth * progress, expBarHeight);

    ctx.font = "25px Arial"; ctx.fillStyle = "#FFFFFF"; ctx.textAlign = "center";
    ctx.fillText(`${Math.round(currentExp * 10) / 10} / ${rank.next ? endExp : "MAX"} EXP`, 400 + expBarWidth / 2, 300); // Hiển thị EXP làm tròn

    return canvas.toBuffer();
}

// --- HÀM CHÍNH ---
module.exports.run = async function ({ api, event }) {
    const { threadID, messageID, senderID, mentions, type, messageReply } = event;

    let targetID = senderID;
    if (type === "message_reply") targetID = messageReply.senderID;
    else if (Object.keys(mentions).length > 0) targetID = Object.keys(mentions)[0];

    // <<< THAY ĐỔI: Đọc file rank_data.json >>>
    if (!fs.existsSync(RANK_DATA_PATH)) {
        return api.sendMessage("Chưa có dữ liệu rank nào được ghi nhận. Hãy tương tác thêm!", threadID, messageID);
    }
    const data = JSON.parse(fs.readFileSync(RANK_DATA_PATH, "utf8"));

    const threadData = data[threadID];
    if (!threadData || !threadData[targetID]) {
        return api.sendMessage("Người dùng này chưa có dữ liệu rank. Hãy tương tác thêm!", threadID, messageID);
    }

    const userData = threadData[targetID];
    // <<< THAY ĐỔI: Lấy EXP trực tiếp từ userData >>>
    const totalExp = userData.exp || 0;

    const targetName = userData.name; // Lấy tên đã lưu
    const userRank = getRank(totalExp);
    const threadInfo = await api.getThreadInfo(threadID);
    const threadName = threadInfo.name || "Tên nhóm không xác định";

    try {
        const imageBuffer = await createRankCard({
            name: targetName,
            exp: totalExp,
            rank: userRank,
            threadName: threadName
        });
        const imagePath = path.join(__dirname, `../../cache/rank_${targetID}.png`);
        fs.writeFileSync(imagePath, imageBuffer);

        api.sendMessage({
            body: `Thẻ rank của ${targetName}!`,
            attachment: fs.createReadStream(imagePath)
        }, threadID, () => fs.unlinkSync(imagePath), messageID);
    } catch (e) {
        console.error("[RANK] Lỗi khi tạo ảnh:", e);
        api.sendMessage("Đã có lỗi xảy ra khi tạo thẻ rank.", threadID, messageID);
    }
};