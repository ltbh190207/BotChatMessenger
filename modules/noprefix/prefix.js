// file: modules/noprefix/prefix.js

const moment = require("moment-timezone");

module.exports.config = {
    name: "prefix",
    version: "1.0.0",
    credits: "GPT",
    description: "Lệnh noprefix để xem prefix.",
    // keywords: các từ khóa để kích hoạt lệnh này
    keywords: ["prefix", "dấu lệnh", "prefix là gì"]
};

module.exports.run = function ({ api, event }) {
    const { threadID, messageID } = event;
    const defaultPrefix = global.config.prefix;
    const groupPrefix = global.data.threadData.get(String(threadID))?.PREFIX || "Chưa được cài đặt";
    const currentTime = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss - DD/MM/YYYY");

    const msg = `╭─── •(PREFIX)• ───╮\n` +
        `│ P𝗿𝗲𝗳𝗶𝘅 𝗵𝗲̣̂ 𝘁𝗵𝗼̂́𝗻𝗴: ${defaultPrefix}\n` +
        `│ P𝗿𝗲𝗳𝗶𝘅 𝗻𝗵𝗼́𝗺: ${groupPrefix}\n` +
        `╰──────────────╯\n` +
        `⏰ Bây giờ là: ${currentTime}`;

    api.sendMessage(msg, threadID, messageID);
}