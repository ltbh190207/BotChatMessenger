// file: handlers/handleNoprefix.js
const chalk = require("chalk");
const logger = require("./logger"); // Gọi logger mới

module.exports = async ({ api, event }) => {
    if (!event.body || typeof event.body !== 'string') return;

    const messageContent = event.body.toLowerCase().trim();

    for (const command of global.noprefix.values()) {
        if (command.config.keywords.some(keyword => messageContent === keyword.toLowerCase())) {
            const commandName = command.config.name;

            // Gọi logger
            logger({ api, event, commandName, type: 'NOPREFIX' });

            try {
                await command.run({ api, event });
                return;
            } catch (e) {
                console.error(chalk.red(`❌ Lỗi khi chạy noprefix "${commandName}":`), e);
            }
        }
    }
};