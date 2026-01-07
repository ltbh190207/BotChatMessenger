const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

module.exports.config = {
    name: "nrodata",
    version: "1.3.0",
    hasPermssion: 0,
    credits: "GPT",
    description: "Tra cứu thông tin vật phẩm NRO (Server1)",
    commandCategory: "NRO",
    usages: "[tên vật phẩm] [publisher]",
    cooldowns: 5,
};

const API_BASE = "http://localhost:8080";
const DEFAULT_SERVER = "Server1";

// Hàm tìm kiếm vật phẩm
function searchItem(items, keyword) {
    const lowerKeyword = keyword.toLowerCase().trim();

    // Tìm tất cả kết quả khớp (bao gồm cả exact match và partial match)
    const results = items.filter(item =>
        item.name.toLowerCase().includes(lowerKeyword)
    );

    // Sắp xếp: exact match lên đầu, sau đó các match khác
    results.sort((a, b) => {
        const aExact = a.name.toLowerCase() === lowerKeyword;
        const bExact = b.name.toLowerCase() === lowerKeyword;

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        // Nếu cùng loại (cùng exact hoặc cùng partial), sắp xếp theo ID
        return a.id - b.id;
    });

    return results.slice(0, 10);
}

// Hàm tải ảnh từ API
async function downloadImage(publisher, iconId, itemId) {
    try {
        // Sử dụng endpoint ảnh mới từ API
        const imageUrl = `${API_BASE}/icons/${publisher}/${iconId}`;

        console.log(`[INFO] Đang tải ảnh từ: ${imageUrl}`);

        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 10000,
            validateStatus: (status) => status === 200
        });

        const imagePath = path.join(__dirname, `../../cache/nro_item_${itemId}.png`);

        // Đảm bảo thư mục cache tồn tại
        const cacheDir = path.join(__dirname, '../../cache');
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }

        fs.writeFileSync(imagePath, response.data);
        console.log(`[SUCCESS] Đã lưu ảnh vào: ${imagePath}`);
        return imagePath;
    } catch (error) {
        if (error.response && error.response.status === 404) {
            console.error(`[WARN] Không tìm thấy ảnh icon ${iconId} cho publisher ${publisher}`);
        } else {
            console.error(`[ERROR] Lỗi tải ảnh ${imageUrl}:`, error.message);
        }
        return null;
    }
}

// Hàm format thông tin vật phẩm
function formatItemInfo(item) {
    let info = `🎮 THÔNG TIN VẬT PHẨM\n`;
    info += `━━━━━━━━━━━━━━━━━━━━\n`;
    info += `📦 Tên: ${item.name}\n`;
    info += `🆔 ID: ${item.id}\n`;

    // Type
    const types = {
        0: "Trang bị",
        1: "Vật phẩm sử dụng",
        2: "Trang sức",
        5: "Ngọc rồng",
        6: "Thú cưỡi",
        7: "Đậu thần"
    };
    info += `⭐ Loại: ${types[item.type] || item.type}\n`;

    // Gender
    if (item.gender !== undefined) {
        const genders = { 0: "Trái Đất", 1: "Namek", 2: "Xayda", 3: "Mọi hành tinh" };
        info += `👤 Hành tinh: ${genders[item.gender] || item.gender}\n`;
    }

    // Level
    if (item.level) {
        info += `🎯 Cấp độ: ${item.level}\n`;
    }

    // Require
    if (item.strRequire) {
        info += `💪 Yêu cầu sức mạnh: ${item.strRequire.toLocaleString()}\n`;
    }

    // Description
    if (item.description) {
        info += `📝 Mô tả: ${item.description}\n`;
    }

    // Icon ID
    if (item.iconID !== undefined || item.icon !== undefined) {
        const iconId = item.iconID || item.icon;
        info += `🖼️ Icon ID: ${iconId}\n`;
    }

    return info;
}

module.exports.run = async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    // Kiểm tra từ khóa
    if (args.length === 0) {
        return api.sendMessage(
            "⚠️ Vui lòng nhập tên vật phẩm!\n\n" +
            "📖 Cú pháp:\n" +
            "/nrodata [tên vật phẩm] [publisher]\n\n" +
            "📌 Ví dụ:\n" +
            "• /nrodata áo\n" +
            "• /nrodata găng tay TeaMobi\n" +
            "• /nrodata rada HSNR\n\n" +
            "🏢 Publishers:\n" +
            "• TeaMobi (mặc định)\n" +
            "• HSNR\n" +
            "• BlueFake\n" +
            "• ILoveNRO\n\n" +
            "🌐 Server: Luôn lấy Server1",
            threadID, messageID
        );
    }

    // Parse arguments
    let keyword, publisher;

    // Tìm publisher trong args
    const validPublishers = ["TeaMobi", "HSNR", "BlueFake", "ILoveNRO"];
    const publisherArg = args.find(arg =>
        validPublishers.some(p => p.toLowerCase() === arg.toLowerCase())
    );

    if (publisherArg) {
        publisher = validPublishers.find(p => p.toLowerCase() === publisherArg.toLowerCase());
        keyword = args.filter(arg => arg.toLowerCase() !== publisherArg.toLowerCase()).join(" ");
    } else {
        // Mặc định TeaMobi
        publisher = "TeaMobi";
        keyword = args.join(" ");
    }

    const server = DEFAULT_SERVER;

    try {
        // Gửi tin nhắn chờ
        const waitMsg = await api.sendMessage(
            `🔍 Đang tìm kiếm "${keyword}" trên ${publisher}/${server}...`,
            threadID
        );

        // Lấy dữ liệu từ API
        const response = await axios.get(`${API_BASE}/items/${publisher}/${server}`, {
            timeout: 15000
        });

        if (!response.data || !Array.isArray(response.data)) {
            throw new Error("Dữ liệu không hợp lệ từ API");
        }

        const items = response.data;
        const results = searchItem(items, keyword);

        // Xóa tin nhắn chờ
        api.unsendMessage(waitMsg.messageID);

        if (results.length === 0) {
            return api.sendMessage(
                `❌ Không tìm thấy vật phẩm nào với từ khóa "${keyword}"\n\n` +
                `📍 Publisher: ${publisher}\n` +
                `🌐 Server: ${server}`,
                threadID, messageID
            );
        }

        // Nếu tìm thấy 1 kết quả duy nhất - hiển thị luôn chi tiết
        if (results.length === 1) {
            const item = results[0];
            const iconId = item.iconID || item.icon || item.id;

            // Tải ảnh từ API
            const imagePath = await downloadImage(publisher, iconId, item.id);

            let message = formatItemInfo(item);
            message += `\n📍 Nguồn: ${publisher}/${server}`;

            // Gửi kèm ảnh nếu tải được
            if (imagePath && fs.existsSync(imagePath)) {
                return api.sendMessage({
                    body: message,
                    attachment: fs.createReadStream(imagePath)
                }, threadID, () => {
                    // Xóa file tạm sau khi gửi
                    try {
                        fs.unlinkSync(imagePath);
                    } catch (e) {
                        console.error(`[ERROR] Không thể xóa file tạm: ${e.message}`);
                    }
                }, messageID);
            } else {
                message += `\n\n⚠️ Không thể tải ảnh vật phẩm (Icon ID: ${iconId})`;
                return api.sendMessage(message, threadID, messageID);
            }
        }

        // Nếu tìm thấy nhiều kết quả - hiển thị danh sách
        let listMessage = `🔎 Tìm thấy ${results.length} kết quả cho "${keyword}":\n\n`;

        results.forEach((item, index) => {
            // Thêm thông tin hành tinh để dễ phân biệt
            const genders = { 0: "🌍", 1: "🟢", 2: "⭐", 3: "🌐" };
            const genderIcon = genders[item.gender] || "";
            listMessage += `${index + 1}. ${genderIcon} ${item.name} (ID: ${item.id})\n`;
        });

        listMessage += `\n📌 Reply tin nhắn này với số thứ tự để xem chi tiết`;
        listMessage += `\n📍 Nguồn: ${publisher}/${server}`;

        return api.sendMessage(listMessage, threadID, (err, info) => {
            if (err) return;

            global.client.handleReply.push({
                name: this.config.name,
                messageID: info.messageID,
                author: event.senderID,
                results: results,
                publisher: publisher,
                server: server
            });
        }, messageID);

    } catch (error) {
        console.error("[NRODATA] Lỗi:", error);

        let errorMsg = "❌ Đã có lỗi xảy ra!\n\n";

        if (error.code === "ECONNREFUSED") {
            errorMsg += "⚠️ Không thể kết nối đến API.\n" +
                "📌 Đảm bảo API đang chạy: python apidata.py\n" +
                "📌 Kiểm tra port: http://localhost:8080";
        } else if (error.response) {
            errorMsg += `⚠️ API trả về lỗi: ${error.response.status}\n`;
            if (error.response.data?.detail) {
                errorMsg += `Chi tiết: ${error.response.data.detail}`;
            }
        } else {
            errorMsg += `⚠️ ${error.message}`;
        }

        return api.sendMessage(errorMsg, threadID, messageID);
    }
};

// Xử lý reply
module.exports.handleReply = async function ({ api, event, handleReply }) {
    const { threadID, messageID, senderID, body } = event;

    if (senderID !== handleReply.author) {
        return api.sendMessage(
            "⚠️ Chỉ người gọi lệnh mới có thể chọn!",
            threadID, messageID
        );
    }

    const choice = parseInt(body);

    if (isNaN(choice) || choice < 1 || choice > handleReply.results.length) {
        return api.sendMessage(
            `⚠️ Vui lòng nhập số từ 1 đến ${handleReply.results.length}`,
            threadID, messageID
        );
    }

    const item = handleReply.results[choice - 1];
    const iconId = item.iconID || item.icon || item.id;

    try {
        const waitMsg = await api.sendMessage("⏳ Đang tải thông tin...", threadID);

        const imagePath = await downloadImage(handleReply.publisher, iconId, item.id);

        api.unsendMessage(waitMsg.messageID);

        let message = formatItemInfo(item);
        message += `\n📍 Nguồn: ${handleReply.publisher}/${handleReply.server}`;

        if (imagePath && fs.existsSync(imagePath)) {
            api.sendMessage({
                body: message,
                attachment: fs.createReadStream(imagePath)
            }, threadID, () => {
                try {
                    fs.unlinkSync(imagePath);
                } catch (e) {
                    console.error(`[ERROR] Không thể xóa file tạm: ${e.message}`);
                }
            }, messageID);
        } else {
            message += `\n\n⚠️ Không thể tải ảnh vật phẩm (Icon ID: ${iconId})`;
            api.sendMessage(message, threadID, messageID);
        }

        // Xóa handleReply
        const index = global.client.handleReply.findIndex(
            h => h.messageID === handleReply.messageID
        );
        if (index !== -1) {
            global.client.handleReply.splice(index, 1);
        }

        api.unsendMessage(handleReply.messageID);

    } catch (error) {
        console.error("[NRODATA] Lỗi khi xử lý reply:", error);
        api.sendMessage("❌ Có lỗi khi tải thông tin vật phẩm!", threadID, messageID);
    }
};