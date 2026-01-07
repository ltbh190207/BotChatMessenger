module.exports = {
    botName: "AI-DEV",
    prefix: "/",
    language: "vi",
    adminUID: ["100013726992007"],
    GEMINI_API_KEY: "AIzaSyACPX59LfTMEBju9XEGnL05qme0h_BKobU",

    // THÊM PHẦN NÀY VÀO
    connection: {
        keepAliveInterval: 5 * 60 * 1000,
        mqttTimeout: 10 * 60 * 1000,
        restartDelay: 10 * 1000,
        autoReconnect: true,
        updatePresence: true,
        forceLogin: true
    },

    pm2: {
        appName: "AI-DEV-BOT",
        maxMemory: "500M",
        maxRestarts: 10,
        minUptime: "10s",
        restartDelay: 5000,
        autoRestart: true,
        watch: false,
        cronRestart: "0 3 * * *",
        logs: {
            errorFile: "./logs/error.log",
            outFile: "./logs/output.log",
            dateFormat: "YYYY-MM-DD HH:mm:ss",
            mergeLogs: true
        }
    },

    logging: {
        enableConsoleLog: true,
        enableFileLog: true,
        logLevel: "info",
        logRetentionDays: 7
    },

    performance: {
        userInfoCacheTTL: 30 * 60 * 1000,
        threadInfoCacheTTL: 30 * 60 * 1000,
        threadListLimit: 100
    },

    security: {
        maintenanceMode: false,
        bannedThreads: [],
        maxMessageLength: 10000
    }
};
```

### **Bước 4: Kiểm tra cấu trúc thư mục**
```
D: \botchat\
├── config.js               ← Đã cập nhật
├── ecosystem.config.js     ← File mới
├── index.js                ← Đã cập nhật
├── start - pm2.bat           ← File mới(UTF - 8 NO BOM)
├── appstate.json
├── package.json
├── data /
├── modules /
├── handlers /
└── logs /                   ← Tự động tạo