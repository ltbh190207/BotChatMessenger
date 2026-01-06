const chalk = require("chalk");
const logger = require("./logger");

module.exports = async ({ api, event }) => {
    if (!event) return;

    // <<< TIỆN ÍCH MỚI: Tự động lấy và cache tên >>>
    const Users = {
        getNameUser: async (userID) => {
            try {
                // Nếu chưa có cache, tạo mới
                if (!global.data.userNameCache) global.data.userNameCache = new Map();
                // Nếu tên đã có trong cache, lấy ra
                if (global.data.userNameCache.has(userID)) {
                    return global.data.userNameCache.get(userID);
                }
                // Nếu chưa có, gọi API
                const userInfo = await api.getUserInfo(userID);
                const name = userInfo[userID]?.name || `User ID: ${userID}`;
                // Lưu vào cache cho lần sau
                global.data.userNameCache.set(userID, name);
                return name;
            } catch (e) {
                // Trả về ID nếu có lỗi
                return `User ID: ${userID}`;
            }
        }
    };

    const Threads = {
        getInfo: async (threadID) => {
            try {
                if (!global.data.threadInfoCache) global.data.threadInfoCache = new Map();
                if (global.data.threadInfoCache.has(threadID)) {
                    return global.data.threadInfoCache.get(threadID);
                }
                const threadInfo = await api.getThreadInfo(threadID);
                global.data.threadInfoCache.set(threadID, threadInfo);
                return threadInfo;
            } catch (e) {
                return { name: `Thread ID: ${threadID}`, isGroup: false };
            }
        }
    };
    // <<< KẾT THÚC TIỆN ÍCH MỚI >>>

    try {
        // --- 1. XỬ LÝ SỰ KIỆN TỪ THƯ MỤC /EVENT ---
        for (const [name, eventModule] of global.events.entries()) {
            const { eventType } = eventModule.config;
            if (eventType && (eventType.includes(event.logMessageType) || eventType.includes(event.type))) {

                if (event.type === "message" || event.type === "message_reply") {
                    logger({ api, event, commandName: name, type: 'EVENT' });
                }

                // <<< CẬP NHẬT: Truyền thêm Users và Threads vào module >>>
                await eventModule.handleEvent({ api, event, Users, Threads });
            }
        }

        // --- 2. XỬ LÝ SỰ KIỆN TỪ CÁC LỆNH (hasEvent: true) ---
        if (event.type === "message" || event.type === "message_reply") {
            for (const [name, command] of global.commands.entries()) {
                if (command.config.hasEvent === true && typeof command.handleEvent === 'function') {
                    logger({ api, event, commandName: name, type: 'EVENT' });

                    // <<< CẬP NHẬT: Truyền thêm Users và Threads vào module >>>
                    await command.handleEvent({ api, event, Users, Threads });
                }
            }
        }
    } catch (e) {
        console.error(chalk.red("❌ Lỗi nghiêm trọng trong handleEvent:"), e);
    }
};