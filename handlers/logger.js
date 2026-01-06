// file: handlers/logger.js
const chalk = require("chalk");
const moment = require("moment-timezone");

async function getInfo(api, event) {
    try {
        const [userInfo, threadInfo] = await Promise.all([
            api.getUserInfo(event.senderID),
            api.getThreadInfo(event.threadID)
        ]);
        const userName = userInfo[event.senderID]?.name || `User ID: ${event.senderID}`;
        const threadName = threadInfo.isGroup ? threadInfo.name || `Thread ID: ${event.threadID}` : "Tin nhắn riêng";
        return { userName, threadName };
    } catch (e) {
        return { userName: `User ID: ${event.senderID}`, threadName: `Thread ID: ${event.threadID}` };
    }
}

function formatLog(type, data) {
    const { userName, threadName, commandName, body, time } = data;
    let color;
    switch (type) {
        case "COMMAND": color = chalk.hex("#8A2BE2"); break; // Tím
        case "NOPREFIX": color = chalk.hex("#00BFFF"); break; // Xanh dương
        case "EVENT": color = chalk.hex("#32CD32"); break;    // Xanh lá
        default: color = chalk.white;
    }

    console.log(color(`╭─── 「 ${type} 」`));
    console.log(color(`│`) + ` 🙍‍♂️ User: ${chalk.white(userName)}`);
    console.log(color(`│`) + ` 💬 Group: ${chalk.white(threadName)}`);
    console.log(color(`│`) + ` 📜 Name: ${chalk.white(commandName)}`);
    if (body) {
        console.log(color(`│`) + ` 📖 Body: ${chalk.dim.white(body)}`);
    }
    console.log(color(`│`) + ` 🕒 Time: ${chalk.white(time)}`);
    console.log(color(`╰─────────────────────────────\n`));
}

module.exports = async ({ api, event, commandName, type = "COMMAND" }) => {
    try {
        const time = moment.tz("Asia/Ho_Chi_Minh").format("HH:mm:ss DD/MM/YYYY");
        const { userName, threadName } = await getInfo(api, event);
        const { body } = event;

        formatLog(type, { userName, threadName, commandName, body, time });
    } catch (e) {
        console.error(chalk.red("Lỗi khi ghi log:"), e);
    }
};