module.exports.config = {
    name: "listbox",
    version: "1.2.0",
    hasPermssion: 2,
    credits: "GPT & Tên bạn",
    description: "Hiển thị danh sách các nhóm bot đang tham gia và cho phép admin out nhóm qua reply.",
    commandCategory: "Admin",
    usages: "",
    cooldowns: 5
};

module.exports.run = async function ({ api, event }) {
    try {
        const list = await api.getThreadList(100, null, ["INBOX"]);
        const groups = list.filter(thread => thread.isGroup);

        if (groups.length === 0) {
            return api.sendMessage("Bot không tham gia nhóm nào.", event.threadID, event.messageID);
        }

        let msg = "📝 Dưới đây là danh sách tất cả các nhóm mà bot đang tham gia:\n\n";
        let count = 1;
        const threadsInfo = [];

        for (const group of groups) {
            msg += `${count}. ${group.name || "Không có tên"}\n🆔 ID: ${group.threadID}\n\n`;
            threadsInfo.push({
                name: group.name || "Không có tên",
                threadID: group.threadID
            });
            count++;
        }

        msg += "👉 Vui lòng reply tin nhắn này với 'out + số thứ tự' để rời nhóm tương ứng.";

        api.sendMessage(msg, event.threadID, (error, info) => {
            if (error) return console.error(error);
            // Sử dụng đúng global.client.handleReply
            global.client.handleReply.push({
                name: this.config.name,
                messageID: info.messageID,
                author: event.senderID,
                threadsInfo: threadsInfo
            });
        }, event.messageID);

    } catch (e) {
        console.error(e);
        api.sendMessage("Đã xảy ra lỗi khi lấy danh sách nhóm.", event.threadID, event.messageID);
    }
};

// Đổi tên hàm thành handleReply để khớp với file handleReply.js
module.exports.handleReply = async function ({ api, event, handleReply }) {
    // Tên biến `onReply` trong các code cũ giờ sẽ là `handleReply`
    if (event.senderID != handleReply.author) {
        return api.sendMessage("⚠️ Bạn không phải là người đã gọi lệnh, không thể thực hiện hành động này.", event.threadID, event.messageID);
    }

    const input = event.body.trim().split(" ");

    if (input[0].toLowerCase() !== "out") {
        return api.sendMessage("Cú pháp không hợp lệ. Vui lòng reply với 'out + số thứ tự'.", event.threadID, event.messageID);
    }

    const stt = parseInt(input[1]);

    if (isNaN(stt) || stt <= 0 || stt > handleReply.threadsInfo.length) {
        return api.sendMessage(`Số thứ tự không hợp lệ. Vui lòng chọn một số từ 1 đến ${handleReply.threadsInfo.length}.`, event.threadID, event.messageID);
    }

    const targetGroup = handleReply.threadsInfo[stt - 1];

    try {
        await api.sendMessage(`Bot đã nhận lệnh rời khỏi nhóm từ admin. Tạm biệt!`, targetGroup.threadID);
        await api.removeUserFromGroup(api.getCurrentUserID(), targetGroup.threadID);
        api.sendMessage(`✅ Đã rời khỏi nhóm "${targetGroup.name}" thành công.`, event.threadID, event.messageID);
    } catch (e) {
        console.error("Lỗi khi rời nhóm:", e);
        api.sendMessage(`❌ Đã xảy ra lỗi khi cố gắng rời khỏi nhóm "${targetGroup.name}".\nLý do có thể: Bot không phải là quản trị viên hoặc đã bị kick trước đó.`, event.threadID, event.messageID);
    }
};