const chalk = require("chalk");

module.exports = async ({ api, event }) => {
    if (event.type !== "message_reply" || !global.client.handleReply) return;

    const handleReply = global.client.handleReply.find(h => h.messageID === event.messageReply.messageID);
    if (!handleReply) return;

    const commandModule = global.commands.get(handleReply.name);
    if (!commandModule || typeof commandModule.handleReply !== 'function') {
        return;
    }

    try {
        await commandModule.handleReply({ api, event, handleReply });
    } catch (e) {
        console.error(chalk.red(`❌ Lỗi khi chạy handleReply cho "${handleReply.name}":`), e);
    }
};