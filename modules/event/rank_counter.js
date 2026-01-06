// file: modules/events/rank_counter.js
const fs = require("fs");
const path = require("path");

const RANK_DATA_PATH = path.join(__dirname, "../../data/rank_data.json");

module.exports.config = {
    name: "rank_counter",
    eventType: ["message", "message_reply", "message_reaction"],
    version: "1.0.0",
    credits: "GPT",
    description: "Tự động tính và lưu trữ điểm EXP lâu dài cho lệnh rank."
};

function readJSON(filePath, defaultValue = {}) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 4));
        return defaultValue;
    }
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch (e) {
        console.error(`Lỗi đọc file ${filePath}:`, e);
        return defaultValue; // Trả về giá trị mặc định nếu đọc lỗi
    }
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

module.exports.handleEvent = async function ({ api, event, Users }) {
    const data = readJSON(RANK_DATA_PATH);
    const { threadID } = event;

    // Khởi tạo dữ liệu nhóm nếu chưa có
    if (!data[threadID]) data[threadID] = {};

    let userID, userName, expToAdd = 0;

    if (event.type === "message" || event.type === "message_reply") {
        // Chỉ tính tin nhắn hợp lệ (>1 ký tự) và không phải của bot
        if (!event.body || event.senderID == api.getCurrentUserID() || event.body.length < 2) return;
        userID = event.senderID;
        userName = await Users.getNameUser(userID);
        expToAdd = 1; // 1 tin nhắn = +1 EXP

    } else if (event.type === "message_reaction") {
        userID = event.userID;
        if (!userID || userID == api.getCurrentUserID()) return;
        userName = await Users.getNameUser(userID);
        expToAdd = 0.5; // 1 react = +0.5 EXP
    }

    if (userID && expToAdd > 0) {
        // Khởi tạo dữ liệu người dùng nếu chưa có
        if (!data[threadID][userID]) {
            data[threadID][userID] = { name: userName, exp: 0 };
        }

        // Cộng EXP và làm tròn
        data[threadID][userID].exp = Math.round((data[threadID][userID].exp + expToAdd) * 10) / 10; // Làm tròn đến 1 chữ số thập phân
        data[threadID][userID].name = userName; // Cập nhật tên

        writeJSON(RANK_DATA_PATH, data);
    }
};