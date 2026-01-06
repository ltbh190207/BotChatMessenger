// file: modules/events/autorep.js

const autoReplyData = require("../../data/autorep.json");
const fs = require("fs"); // Thêm thư viện file system
const path = require("path"); // Thêm thư viện path

const userCooldowns = new Map();
const COOLDOWN_DURATION = 15 * 60 * 1000;

module.exports.config = {
    name: "autorep",
    eventType: ["message", "message_reply"],
    version: "1.4.0", // Nâng cấp phiên bản
    credits: "GPT",
    description: "Tự động trả lời tin nhắn (hỗ trợ ảnh cục bộ) với cooldown."
};

module.exports.handleEvent = async function ({ api, event }) {
    if (!event.body || event.senderID == api.getCurrentUserID()) return;

    const { senderID, threadID, messageID } = event;
    const message = event.body.toLowerCase();
    const now = Date.now();

    if (!userCooldowns.has(senderID)) {
        userCooldowns.set(senderID, new Map());
    }
    const userSpecificCooldowns = userCooldowns.get(senderID);

    for (const rule of autoReplyData) {
        for (const keyword of rule.keywords) {
            const lowercasedKeyword = keyword.toLowerCase();

            if (message.includes(lowercasedKeyword)) {

                const lastReplyTime = userSpecificCooldowns.get(lowercasedKeyword);
                if (lastReplyTime && (now - lastReplyTime < COOLDOWN_DURATION)) {
                    continue;
                }

                // --- LOGIC MỚI: XỬ LÝ ẢNH CỤC BỘ ---
                if (rule.image) {
                    try {
                        // Tạo đường dẫn tuyệt đối đến file ảnh
                        const imagePath = path.join(__dirname, '..', '..', rule.image);

                        // Kiểm tra xem file có tồn tại không
                        if (fs.existsSync(imagePath)) {
                            // Tạo stream từ file cục bộ
                            const imageStream = fs.createReadStream(imagePath);
                            const msg = {
                                body: rule.reply,
                                attachment: imageStream
                            };
                            api.sendMessage(msg, threadID, messageID);
                        } else {
                            // Nếu file không tồn tại, báo lỗi và chỉ gửi text
                            console.error(`[AUTOREP] File ảnh không tồn tại: ${imagePath}`);
                            api.sendMessage(rule.reply, threadID, messageID);
                        }
                    } catch (e) {
                        console.error("[AUTOREP] Lỗi khi xử lý ảnh cục bộ:", e);
                        api.sendMessage(rule.reply, threadID, messageID);
                    }
                } else {
                    // Gửi tin nhắn văn bản như cũ
                    api.sendMessage(rule.reply, threadID, messageID);
                }

                userSpecificCooldowns.set(lowercasedKeyword, now);
                return;
            }
        }
    }
};