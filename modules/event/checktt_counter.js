const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

const CHECKTT_DATA_PATH = path.join(__dirname, "../../data/checktt_data.json");

module.exports.config = {
    name: "checktt_counter",
    // <<< CẬP NHẬT: Thêm "message_reaction" để lắng nghe cảm xúc >>>
    eventType: ["message", "message_reply", "message_reaction"],
    version: "1.1.0",
    credits: "GPT (Cập nhật)",
    description: "Tự động đếm tin nhắn và cảm xúc của người dùng."
};

function readJSON(filePath, defaultValue = {}) {
    if (!fs.existsSync(filePath)) return defaultValue;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

module.exports.handleEvent = async function ({ api, event, Users }) {
    const { threadID } = event;
    const data = readJSON(CHECKTT_DATA_PATH);
    const today = moment.tz("Asia/Ho_Chi_Minh").format("YYYY-MM-DD");

    if (!data[threadID]) data[threadID] = { date: today, members: {} };
    if (data[threadID].date !== today) data[threadID] = { date: today, members: {} };

    // <<< CẬP NHẬT: Phân loại sự kiện để xử lý >>>
    if (event.type === "message" || event.type === "message_reply") {
        const { senderID } = event;
        if (!senderID || senderID == api.getCurrentUserID()) return;

        const userName = await Users.getNameUser(senderID);
        const threadData = data[threadID];

        if (!threadData.members[senderID]) {
            threadData.members[senderID] = { name: userName, count: 0, reactionCount: 0 };
        }
        threadData.members[senderID].count++;
        threadData.members[senderID].name = userName;

    } else if (event.type === "message_reaction") {
        const reactorID = event.userID; // ID của người thả cảm xúc
        if (!reactorID || reactorID == api.getCurrentUserID()) return;

        const reactorName = await Users.getNameUser(reactorID);
        const threadData = data[threadID];

        if (!threadData.members[reactorID]) {
            threadData.members[reactorID] = { name: reactorName, count: 0, reactionCount: 0 };
        }
        threadData.members[reactorID].reactionCount++;
        threadData.members[reactorID].name = reactorName;
    }

    writeJSON(CHECKTT_DATA_PATH, data);
};