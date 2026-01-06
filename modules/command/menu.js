const moment = require("moment-timezone");

function toBoldText(text) {
    const boldMap = {
        'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
        'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧', 'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
        '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
        // Thêm các ký tự tiếng Việt có dấu nếu cần
    };
    return text.split('').map(char => boldMap[char] || char).join('');
}

module.exports.config = {
    name: "menu",
    version: "1.3.0", // Cập nhật phiên bản
    hasPermssion: 0,
    credits: "User & GPT",
    description: "Hiển thị menu lệnh, có phân quyền admin.",
    commandCategory: "User",
    usages: "menu",
    cooldowns: 5,
};

module.exports.run = function ({ api, event }) {
    const { threadID, messageID, senderID } = event;

    // Kiểm tra xem người dùng có phải là admin trong config không
    const isAdmin = global.config.adminUID.includes(senderID);

    const prefix = (global.data.threadData.get(String(threadID)) || {}).PREFIX || global.config.prefix;

    const userCommands = [];
    const adminCommands = [];

    // Lọc và phân loại các lệnh
    for (const [name, cmd] of global.commands.entries()) {
        if (name !== cmd.config.name || !cmd.config.description) continue;

        const commandLine = toBoldText(prefix + cmd.config.name);

        // Giả sử hasPermssion: 1 là lệnh admin, 0 là lệnh user
        if (cmd.config.hasPermssion === 2) {
            adminCommands.push(commandLine);
        } else if (cmd.config.hasPermssion === 0) {
            userCommands.push(commandLine);
        }
    }

    userCommands.sort();
    adminCommands.sort();

    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");

    // Bắt đầu xây dựng tin nhắn
    let menuText = `»»»»» ${toBoldText(global.config.botName)} «««««\n` +
        `──────────────\n` +
        `📜 ${toBoldText('LỆNH NGƯỜI DÙNG')} (${userCommands.length} lệnh):\n` +
        `${userCommands.join('\n')}`;

    // Chỉ thêm phần lệnh admin nếu người dùng là admin và có lệnh admin để hiển thị
    if (isAdmin && adminCommands.length > 0) {
        menuText += `\n\n` +
            `🛠️ ${toBoldText('LỆNH ADMIN')} (${adminCommands.length} lệnh):\n` +
            `${adminCommands.join('\n')}`;
    }

    // Thêm phần cuối của tin nhắn
    menuText += `\n──────────────\n` +
        `» ${toBoldText('Prefix hiện tại của nhóm:')} ${toBoldText(prefix)}\n` +
        `» Thời gian hiện tại: ${time}`;

    api.sendMessage(menuText, threadID, messageID);
};