const moment = require("moment-timezone");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

function toBoldText(text) {
    const boldMap = {
        // Tiếng Việt (lowercase)
        'á': '𝗮́', 'à': '𝗮̀', 'ả': '𝗮̉', 'ã': '𝗮̃', 'ạ': '𝗮̣',
        'ă': '𝗮̆', 'ắ': '𝗮̆́', 'ằ': '𝗮̆̀', 'ẳ': '𝗮̆̉', 'ẵ': '𝗮̆̃', 'ặ': '𝗮̣̆',
        'â': '𝗮̂', 'ấ': '𝗮̂́', 'ầ': '𝗮̂̀', 'ẩ': '𝗮̂̉', 'ẫ': '𝗮̂̃', 'ậ': '𝗮̣̂',
        'đ': 'đ', 'é': '𝗲́', 'è': '𝗲̀', 'ẻ': '𝗲̉', 'ẽ': '𝗲̃', 'ẹ': '𝗲̣',
        'ê': '𝗲̂', 'ế': '𝗲̂́', 'ề': '𝗲̂̀', 'ể': '𝗲̂̉', 'ễ': '𝗲̂̃', 'ệ': '𝗲̣̂',
        'í': '𝗶́', 'ì': '𝗶̀', 'ỉ': '𝗶̉', 'ĩ': '𝗶̃', 'ị': '𝗶̣',
        'ó': '𝗼́', 'ò': '𝗼̀', 'ỏ': '𝗼̉', 'õ': '𝗼̃', 'ọ': '𝗼̣',
        'ô': '𝗼̂', 'ố': '𝗼̂́', 'ồ': '𝗼̂̀', 'ổ': '𝗼̂̉', 'ỗ': '𝗼̂̃', 'ộ': '𝗼̣̂',
        'ơ': '𝗼̛', 'ớ': '𝗼̛́', 'ờ': '𝗼̛̀', 'ở': '𝗼̛̉', 'ỡ': '𝗼̛̃', 'ợ': '𝗼̛̣',
        'ú': '𝘂́', 'ù': '𝘂̀', 'ủ': '𝘂̉', 'ũ': '𝘂̃', 'ụ': '𝘂̣',
        'ư': '𝘂̛', 'ứ': '𝘂̛́', 'ừ': '𝘂̛̀', 'ử': '𝘂̛̉', 'ữ': '𝘂̛̃', 'ự': '𝘂̛̣',
        'ý': '𝘆́', 'ỳ': '𝘆̀', 'ỷ': '𝘆̉', 'ỹ': '𝘆̃', 'ỵ': '𝘆̣',
        // Tiếng Việt (uppercase)
        'Á': '𝗔́', 'À': '𝗔̀', 'Ả': '𝗔̉', 'Ã': '𝗔̃', 'Ạ': '𝗔̣',
        'Ă': '𝗔̆', 'Ắ': '𝗔̆́', 'Ằ': '𝗔̆̀', 'Ẳ': '𝗔̆̉', 'Ẵ': '𝗔̆̃', 'Ặ': '𝗔̣̆',
        'Â': '𝗔̂', 'Ấ': '𝗔̂́', 'Ầ': '𝗔̂̀', 'Ẩ': '𝗔̂̉', 'Ẫ': '𝗔̂̃', 'Ậ': '𝗔̣̂',
        'Đ': 'Đ', 'É': '𝗘́', 'È': '𝗘̀', 'Ẻ': '𝗘̉', 'Ẽ': '𝗘̃', 'Ẹ': '𝗘̣',
        'Ê': '𝗘̂', 'Ế': '𝗘̂́', 'Ề': '𝗘̂̀', 'Ể': '𝗘̂̉', 'Ễ': '𝗘̂̃', 'Ệ': '𝗘̣̂',
        'Í': '𝗜́', 'Ì': '𝗜̀', 'Ỉ': '𝗜̉', 'Ĩ': '𝗜̃', 'Ị': '𝗜̣',
        'Ó': '𝗢́', 'Ò': '𝗢̀', 'Ỏ': '𝗢̉', 'Õ': '𝗢̃', 'Ọ': '𝗢̣',
        'Ô': '𝗢̂', 'Ố': '𝗢̂́', 'Ồ': '𝗢̂̀', 'Ổ': '𝗢̂̉', 'Ỗ': '𝗢̂̃', 'Ộ': '𝗢̣̂',
        'Ơ': '𝗢̛', 'Ớ': '𝗢̛́', 'Ờ': '𝗢̛̀', 'Ở': '𝗢̛̉', 'Ỡ': '𝗢̛̃', 'Ợ': '𝗢̛̣',
        'Ú': '𝗨́', 'Ù': '𝗨̀', 'Ủ': '𝗨̉', 'Ũ': '𝗨̃', 'Ụ': '𝗨̣',
        'Ư': '𝗨̛', 'Ứ': '𝗨̛́', 'Ừ': '𝗨̛̀', 'Ử': '𝗨̛̉', 'Ữ': '𝗨̛̃', 'Ự': '𝗨̛̣',
        'Ý': '𝗬́', 'Ỳ': '𝗬̀', 'Ỷ': '𝗬̉', 'Ỹ': '𝗬̃', 'Ỵ': '𝗬̣',
        // Tiếng Anh (lowercase)
        'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷', 'k': '𝗸', 'l': '𝗹', 'm': '𝗺',
        'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '𝗾', 'r': '𝗿', 's': '𝘀', 't': '𝘁', 'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
        // Tiếng Anh (uppercase)
        'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝', 'K': '𝗞', 'L': '𝗟', 'M': '𝗠',
        'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧', 'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
        // Số
        '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
    };
    // Nếu ký tự không có trong map, giữ nguyên ký tự gốc
    return text.split('').map(char => boldMap[char] || char).join('');
}

module.exports.config = {
    name: "noti",
    version: "1.3.1",
    hasPermssion: 2,
    credits: "User",
    description: "Gửi thông báo từ Admin đến tất cả các nhóm.",
    commandCategory: "Admin",
    usages: "noti [nội dung thông báo]",
    cooldowns: 10,
};

module.exports.run = async function ({ api, event, args }) {
    const { threadID, senderID } = event;
    const content = args.join(" ");
    const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss - DD/MM/YYYY");

    if (!content) {
        return api.sendMessage("Bạn cần nhập nội dung thông báo.", threadID, event.messageID);
    }

    try {
        const adminInfo = await api.getUserInfo(senderID);
        const adminName = adminInfo[senderID]?.name || "Admin";

        const allThreads = await api.getThreadList(200, null, ["INBOX"]);
        const groupThreads = allThreads.filter(thread => thread.isGroup);

        if (groupThreads.length === 0) {
            return api.sendMessage("Bot không tham gia nhóm nào để thông báo.", threadID, event.messageID);
        }

        const boldContent = toBoldText(content);

        const notification = `『 ADMIN THÔNG BÁO 』\n\n` +
            `👤 Admin: ${adminName}\n` +
            `📝 Nội dung:\n${boldContent}\n\n` +
            `⏰ Thời gian: ${time}\n\n` +
            `» Mọi thắc mắc xin liên hệ Admin.`;

        let sentCount = 0;
        let errorCount = 0;

        api.sendMessage(`Bắt đầu gửi thông báo đến ${groupThreads.length} nhóm...`, threadID);

        for (const group of groupThreads) {
            try {
                await api.sendMessage(notification, group.threadID);
                sentCount++;
            } catch (e) {
                errorCount++;
                console.error(`Lỗi gửi đến nhóm ${group.threadID}:`, e.message);
            }
            await sleep(500);
        }

        api.sendMessage(`✅ Gửi thông báo hoàn tất!\n- Thành công: ${sentCount} nhóm\n- Thất bại: ${errorCount} nhóm`, threadID);

    } catch (error) {
        console.error("Lỗi khi thực hiện lệnh noti:", error);
        api.sendMessage("Có lỗi xảy ra trong quá trình gửi thông báo.", threadID);
    }
};