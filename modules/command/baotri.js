// file: modules/command/baotri.js
module.exports.config = {
    name: "baotri",
    version: "1.0.3",
    hasPermssion: 2, // Nên đặt là 2 cho các lệnh hệ thống quan trọng
    credits: "GPT (sửa lỗi)",
    description: "Khởi động lại Bot và thông báo bảo trì đến tất cả nhóm.",
    commandCategory: "Admin",
    usages: "baotri",
    cooldowns: 20,
};

// Sửa ở đây: Bỏ 'config' khỏi danh sách tham số
module.exports.run = async function ({ api, event }) {
    const { threadID } = event;

    // Sửa ở đây: Lấy tên bot từ global.config thay vì config cục bộ
    const botName = global.config.botName || "Bot";

    const announcement = `🤖 ${botName} sẽ tiến hành bảo trì hệ thống ngay bây giờ, vui lòng không sử dụng bot trong giây lát!`;
    const restartMessage = `⚙️ Đã gửi thông báo bảo trì thành công! Bot sẽ khởi động lại ngay...`;

    let successCount = 0;
    const threadList = [];

    try {
        // Lấy danh sách tất cả các thread trước
        const allThreads = await api.getThreadList(200, null, ["INBOX"]);
        for (const thread of allThreads) {
            if (thread.isGroup) {
                threadList.push(thread.threadID);
            }
        }

        // Gửi thông báo đến tất cả các nhóm
        for (const tid of threadList) {
            await new Promise(resolve => {
                api.sendMessage(announcement, tid, (err) => {
                    if (!err) successCount++;
                    resolve(); // Luôn tiếp tục dù có lỗi
                });
            });
        }

        // Gửi thông báo kết quả và khởi động lại
        api.sendMessage(
            `${restartMessage}\nĐã thông báo đến ${successCount}/${threadList.length} nhóm.`,
            threadID,
            () => {
                // Khởi động lại (yêu cầu bot được chạy bằng PM2)
                setTimeout(() => {
                    process.exit(1);
                }, 2000);
            }
        );

    } catch (err) {
        console.error("❌ Lỗi khi thực hiện lệnh baotri:", err);
        api.sendMessage(`⚠️ Lỗi: Không thể hoàn tất quá trình bảo trì. Chi tiết: ${err.message}`, threadID);
    }
};