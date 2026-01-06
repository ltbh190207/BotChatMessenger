module.exports.config = {
    name: "autosetname",
    eventType: ["log:subscribe", "log:user-nickname"],
    version: "1.1.0",
    credits: "User",
    description: "Tự động đặt lại biệt danh cho bot theo dạng 『 Tên- Prefix 』."
};

module.exports.handleEvent = async function ({ api, event }) {
    const { logMessageType, logMessageData, threadID } = event;
    const botID = api.getCurrentUserID();

    // Lấy prefix của nhóm (ưu tiên prefix riêng, sau đó đến mặc định)
    const prefix = (global.data.threadData.get(String(threadID)) || {}).PREFIX || global.config.prefix;
    const botName = global.config.botName || "Bot";

    // Tạo ra tên hoàn chỉnh
    const fullBotNickname = `『 ${botName}- ${prefix} 』`;

    switch (logMessageType) {
        // Trường hợp bot được thêm vào nhóm mới
        case "log:subscribe": {
            const wasBotAdded = logMessageData.addedParticipants.some(p => p.userFbId === botID);
            if (wasBotAdded) {
                try {
                    await api.changeNickname(fullBotNickname, threadID, botID);
                } catch (e) {
                    console.error("Lỗi khi tự động đặt biệt danh khi vào nhóm:", e);
                }
            }
            break;
        }

        // Trường hợp có người bị đổi biệt danh trong nhóm
        case "log:user-nickname": {
            // Kiểm tra xem người bị đổi biệt danh có phải là bot không
            if (logMessageData.participant_id === botID) {
                // Kiểm tra xem biệt danh mới có khác với tên mong muốn không
                if (logMessageData.nickname !== fullBotNickname) {
                    try {
                        // Đặt lại biệt danh về đúng định dạng
                        await api.changeNickname(fullBotNickname, threadID, botID);
                    } catch (e) {
                        console.error("Lỗi khi tự động đặt lại biệt danh:", e);
                    }
                }
            }
            break;
        }

        default:
            break;
    }
};