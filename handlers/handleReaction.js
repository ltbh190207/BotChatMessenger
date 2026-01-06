// file: handlers/handleReaction.js
module.exports = async function ({ api, event }) {
    // Chỉ xử lý sự kiện thả cảm xúc
    if (event.type !== "message_reaction") return;

    // Nếu không có handleReaction nào đang chờ, bỏ qua
    if (!global.client.handleReaction || global.client.handleReaction.length === 0) return;

    // Tìm handleReaction phù hợp với messageID của sự kiện
    const handle = global.client.handleReaction.find(h => h.messageID === event.messageID);
    if (!handle) return;

    // Lấy module lệnh đã đăng ký handleReaction này
    const commandModule = global.commands.get(handle.name);
    if (!commandModule) return;

    try {
        // Gọi hàm handleReaction bên trong module lệnh
        if (commandModule.handleReaction) {
            await commandModule.handleReaction({
                api: api,
                event: event,
                handleReaction: handle
            });
        }
    } catch (e) {
        console.error("Lỗi khi thực thi handleReaction:", e);
    }
};