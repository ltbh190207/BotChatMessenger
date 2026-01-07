// file: modules/event/nro_notify.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const moment = require("moment-timezone");

const SETTINGS_PATH = path.join(__dirname, "../../data/nro_notify_settings.json");
const NOTIFIED_IDS_PATH = path.join(__dirname, "../../data/nro_notified_ids.json");
const API_BASE_URL = "http://localhost:8000"; // Thay đổi nếu API chạy ở port khác

module.exports.config = {
    name: "nro_notify",
    eventType: ["message"], // Chỉ dùng để lắng nghe lệnh cấu hình
    version: "1.0.0",
    credits: "GPT",
    description: "Tự động thông báo NRO Boss Tracker theo server và loại thông báo"
};

// Hàm đọc/ghi file JSON
function readJSON(filePath, defaultValue = {}) {
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 4));
        return defaultValue;
    }
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

// Icon theo category
const CATEGORY_ICONS = {
    'BOSS': '👹',
    'REWARD': '🎁',
    'CRYSTALLIZE': '💎',
    'UPGRADE': '⚡',
    'DIVINE_ITEM': '⚔️',
    'SYSTEM': '⚙️'
};

// Danh sách loại thông báo có thể chọn
const NOTIFICATION_TYPES = {
    'all': 'Tất cả',
    'boss': 'Boss xuất hiện/bị tiêu diệt',
    'boss_alive': 'Chỉ boss còn sống',
    'reward': 'Phần thưởng từ hộp quà',
    'crystallize': 'Pha lê hóa thành công',
    'upgrade': 'Nâng cấp thành công',
    'divine_item': 'Vật phẩm thần',
    'system': 'Thông báo hệ thống'
};

// Hàm format tin nhắn thông báo
function formatNotification(item) {
    const icon = CATEGORY_ICONS[item.category] || '📢';
    const time = moment(item.time, "YYYY-MM-DD HH:mm:ss").tz("Asia/Ho_Chi_Minh").format("HH:mm:ss - DD/MM/YYYY");

    let message = `${icon} ${item.value}\n`;
    message += `🌟 Server: ${item.server}\n`;
    message += `⏰ Thời gian: ${time}\n`;
    message += `📂 Loại: ${item.category}`;

    if (item.category === 'BOSS') {
        const status = item.isKilled ? "❌ Đã bị tiêu diệt" : "✅ Đang còn sống";
        message += `\n${status}`;
        if (item.killerName) {
            message += ` bởi ${item.killerName}`;
        }
    }

    return message;
}

// Hàm kiểm tra xem notification có nên được gửi không
function shouldNotify(item, notifyTypes) {
    if (notifyTypes.includes('all')) return true;

    const category = item.category;

    if (notifyTypes.includes('boss') && category === 'BOSS') return true;
    if (notifyTypes.includes('boss_alive') && category === 'BOSS' && !item.isKilled) return true;
    if (notifyTypes.includes('reward') && category === 'REWARD') return true;
    if (notifyTypes.includes('crystallize') && category === 'CRYSTALLIZE') return true;
    if (notifyTypes.includes('upgrade') && category === 'UPGRADE') return true;
    if (notifyTypes.includes('divine_item') && category === 'DIVINE_ITEM') return true;
    if (notifyTypes.includes('system') && category === 'SYSTEM') return true;

    return false;
}

// Hàm lấy thông báo mới từ API
async function fetchNewNotifications(server, lastId = 0) {
    try {
        const response = await axios.post(`${API_BASE_URL}/notifications/filter`, {
            server: server,
            limit: 20
        });

        if (response.data.success) {
            // Lọc các thông báo mới hơn lastId
            const newNotifications = response.data.data.filter(item => item.id > lastId);
            return newNotifications.sort((a, b) => a.id - b.id); // Sắp xếp tăng dần
        }
        return [];
    } catch (error) {
        console.error("[NRO_NOTIFY] Lỗi khi lấy thông báo:", error.message);
        return [];
    }
}

// Hàm xử lý lệnh cấu hình (gọi từ command)
async function handleCommand(api, event, args) {
    const { threadID, messageID, senderID } = event;
    const action = args[0]?.toLowerCase();

    // Kiểm tra quyền (QTV hoặc Admin)
    try {
        const threadInfo = await api.getThreadInfo(threadID);
        const isBotAdmin = global.config.adminUID.includes(senderID);
        const isGroupAdmin = threadInfo.adminIDs.some(admin => admin.id === senderID);

        if (!isBotAdmin && !isGroupAdmin) {
            return api.sendMessage("🚫 Chỉ QTV nhóm hoặc Admin Bot mới có thể sử dụng lệnh này.", threadID, messageID);
        }
    } catch (e) {
        return api.sendMessage("❌ Không thể kiểm tra quyền hạn.", threadID, messageID);
    }

    const settings = readJSON(SETTINGS_PATH);

    if (!settings[threadID]) {
        settings[threadID] = {
            enabled: false,
            server: "1 sao",
            notifyTypes: ['all'],
            interval: 30 // Kiểm tra mỗi 30 giây
        };
    }

    const effectivePrefix = (global.data.threadData.get(String(threadID)) || {}).PREFIX || global.config.prefix;

    switch (action) {
        case "on": {
            settings[threadID].enabled = true;
            writeJSON(SETTINGS_PATH, settings);

            // Khởi tạo lastId nếu chưa có
            const notifiedIds = readJSON(NOTIFIED_IDS_PATH);
            if (!notifiedIds[threadID]) {
                notifiedIds[threadID] = 0;
            }
            writeJSON(NOTIFIED_IDS_PATH, notifiedIds);

            return api.sendMessage(
                `✅ Đã bật thông báo NRO Boss Tracker!\n` +
                `🌟 Server: ${settings[threadID].server}\n` +
                `📢 Loại: ${settings[threadID].notifyTypes.map(t => NOTIFICATION_TYPES[t]).join(", ")}\n` +
                `⏱️ Kiểm tra mỗi ${settings[threadID].interval} giây`,
                threadID, messageID
            );
        }

        case "off": {
            settings[threadID].enabled = false;
            writeJSON(SETTINGS_PATH, settings);
            return api.sendMessage("🚫 Đã tắt thông báo NRO Boss Tracker.", threadID, messageID);
        }

        case "server": {
            const serverName = args.slice(1).join(" ");
            if (!serverName) {
                // Hiển thị danh sách servers
                try {
                    const response = await axios.get(`${API_BASE_URL}/servers`);
                    if (response.data.success) {
                        const servers = response.data.servers.slice(0, 20); // Lấy 20 servers đầu
                        let msg = "📋 Danh sách servers:\n\n";
                        servers.forEach((s, i) => {
                            msg += `${i + 1}. ${s}\n`;
                        });
                        msg += `\nDùng: ${effectivePrefix}nronoti server [tên server]`;
                        return api.sendMessage(msg, threadID, messageID);
                    }
                } catch (error) {
                    return api.sendMessage("❌ Không thể lấy danh sách servers.", threadID, messageID);
                }
            }

            settings[threadID].server = serverName;
            writeJSON(SETTINGS_PATH, settings);

            // Reset lastId khi đổi server
            const notifiedIds = readJSON(NOTIFIED_IDS_PATH);
            notifiedIds[threadID] = 0;
            writeJSON(NOTIFIED_IDS_PATH, notifiedIds);

            return api.sendMessage(`✅ Đã đổi server thành: ${serverName}`, threadID, messageID);
        }

        case "type": {
            const types = args.slice(1);
            if (types.length === 0) {
                let msg = "📢 Các loại thông báo có thể chọn:\n\n";
                Object.entries(NOTIFICATION_TYPES).forEach(([key, value]) => {
                    msg += `• ${key}: ${value}\n`;
                });
                msg += `\n✅ Đang chọn: ${settings[threadID].notifyTypes.join(", ")}\n`;
                msg += `\nDùng: ${effectivePrefix}nronoti type [loại1] [loại2] ...`;
                return api.sendMessage(msg, threadID, messageID);
            }

            // Validate types
            const validTypes = types.filter(t => NOTIFICATION_TYPES.hasOwnProperty(t));
            if (validTypes.length === 0) {
                return api.sendMessage("❌ Không có loại thông báo hợp lệ nào.", threadID, messageID);
            }

            settings[threadID].notifyTypes = validTypes;
            writeJSON(SETTINGS_PATH, settings);

            return api.sendMessage(
                `✅ Đã cập nhật loại thông báo:\n${validTypes.map(t => `• ${NOTIFICATION_TYPES[t]}`).join("\n")}`,
                threadID, messageID
            );
        }

        case "interval": {
            const interval = parseInt(args[1]);
            if (!interval || interval < 10) {
                return api.sendMessage("❌ Thời gian kiểm tra phải >= 10 giây.", threadID, messageID);
            }

            settings[threadID].interval = interval;
            writeJSON(SETTINGS_PATH, settings);
            return api.sendMessage(`✅ Đã đổi thời gian kiểm tra thành ${interval} giây.`, threadID, messageID);
        }

        case "status": {
            const status = settings[threadID];
            let msg = "📊 TRẠNG THÁI THÔNG BÁO NRO\n\n";
            msg += `🔔 Trạng thái: ${status.enabled ? "✅ Đang bật" : "🚫 Đang tắt"}\n`;
            msg += `🌟 Server: ${status.server}\n`;
            msg += `📢 Loại: ${status.notifyTypes.map(t => NOTIFICATION_TYPES[t]).join(", ")}\n`;
            msg += `⏱️ Kiểm tra mỗi: ${status.interval} giây`;
            return api.sendMessage(msg, threadID, messageID);
        }

        default: {
            const helpMessage = `--- NRO AUTO NOTIFICATION ---\n\n` +
                `${effectivePrefix}nronoti on: Bật thông báo\n` +
                `${effectivePrefix}nronoti off: Tắt thông báo\n` +
                `${effectivePrefix}nronoti server [tên]: Đổi server\n` +
                `${effectivePrefix}nronoti type [loại]: Chọn loại thông báo\n` +
                `${effectivePrefix}nronoti interval [giây]: Đổi tần suất kiểm tra\n` +
                `${effectivePrefix}nronoti status: Xem trạng thái\n\n` +
                `💡 Ví dụ:\n` +
                `${effectivePrefix}nronoti server 1 sao\n` +
                `${effectivePrefix}nronoti type boss_alive reward`;
            return api.sendMessage(helpMessage, threadID, messageID);
        }
    }
}

// Export hàm handleCommand để command có thể gọi
module.exports.handleCommand = handleCommand;

// Hàm chính - chạy định kỳ
let checkInterval = null;

module.exports.onLoad = function ({ api }) {
    console.log("✅ [NRO_NOTIFY] Module đã được load!");

    // Khởi động interval để kiểm tra thông báo
    if (checkInterval) {
        clearInterval(checkInterval);
    }

    checkInterval = setInterval(async () => {
        const settings = readJSON(SETTINGS_PATH);
        const notifiedIds = readJSON(NOTIFIED_IDS_PATH);

        for (const [threadID, config] of Object.entries(settings)) {
            if (!config.enabled) continue;

            try {
                const lastId = notifiedIds[threadID] || 0;
                const newNotifications = await fetchNewNotifications(config.server, lastId);

                if (newNotifications.length > 0) {
                    for (const item of newNotifications) {
                        // Kiểm tra xem có nên thông báo không
                        if (shouldNotify(item, config.notifyTypes)) {
                            const message = formatNotification(item);
                            await api.sendMessage(message, threadID);

                            // Delay nhỏ để tránh spam
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }

                        // Cập nhật lastId
                        notifiedIds[threadID] = Math.max(notifiedIds[threadID] || 0, item.id);
                    }

                    writeJSON(NOTIFIED_IDS_PATH, notifiedIds);
                }
            } catch (error) {
                console.error(`[NRO_NOTIFY] Lỗi khi xử lý thông báo cho thread ${threadID}:`, error.message);
            }
        }
    }, 10000); // Kiểm tra mỗi 10 giây (có thể điều chỉnh)
};

// Lắng nghe sự kiện để xử lý lệnh (không cần thiết nếu dùng command riêng)
module.exports.handleEvent = function () {
    // Event này chỉ để module hoạt động, logic chính ở onLoad
};