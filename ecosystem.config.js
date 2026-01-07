// Load cấu hình từ config.js
const config = require('./config');

module.exports = {
    apps: [{
        name: config.pm2.appName,
        script: 'index.js',
        autorestart: config.pm2.autoRestart,
        watch: config.pm2.watch,
        max_memory_restart: config.pm2.maxMemory,
        max_restarts: config.pm2.maxRestarts,
        min_uptime: config.pm2.minUptime,
        restart_delay: config.pm2.restartDelay,
        error_file: config.pm2.logs.errorFile,
        out_file: config.pm2.logs.outFile,
        log_date_format: config.pm2.logs.dateFormat,
        merge_logs: config.pm2.logs.mergeLogs,
        env: {
            NODE_ENV: 'production'
        },
        cron_restart: config.pm2.cronRestart,
        log_type: 'json',
        autoDump: false,
        kill_timeout: 30000,
        listen_timeout: 10000,
        exec_mode: 'fork',
        instances: 1
    }]
};