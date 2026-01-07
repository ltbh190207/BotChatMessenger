@echo off
chcp 65001 >nul
title AI-DEV Bot Manager
color 0A

echo.
echo ╔═══════════════════════════════════════╗
echo ║     AI-DEV BOT - PM2 MANAGER          ║
echo ╚═══════════════════════════════════════╝
echo.

REM Kiểm tra PM2 đã cài chưa
where pm2 >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] PM2 chưa được cài đặt!
    echo.
    echo Đang cài đặt PM2...
    call npm install -g pm2
    if %errorlevel% neq 0 (
        echo [ERROR] Cài đặt PM2 thất bại!
        echo Vui lòng chạy lệnh: npm install -g pm2
        pause
        exit /b 1
    )
    echo [SUCCESS] PM2 đã được cài đặt!
    echo.
)

REM Tạo thư mục logs nếu chưa có
if not exist logs mkdir logs

REM Kiểm tra file config
if not exist config.js (
    echo [ERROR] Không tìm thấy file config.js!
    pause
    exit /b 1
)

if not exist ecosystem.config.js (
    echo [ERROR] Không tìm thấy file ecosystem.config.js!
    pause
    exit /b 1
)

REM Hiển thị menu
echo ════════════════════════════════════════
echo   Chọn hành động:
echo ════════════════════════════════════════
echo   [1] Khởi động bot
echo   [2] Khởi động lại bot
echo   [3] Dừng bot
echo   [4] Xóa bot
echo   [5] Xem log real-time
echo   [6] Xem trạng thái
echo   [7] Monitor CPU/RAM
echo   [8] Cấu hình tự khởi động
echo   [9] Xóa tất cả log
echo   [0] Thoát
echo ════════════════════════════════════════
echo.

set /p choice="Nhập lựa chọn (0-9): "

if "%choice%"=="1" goto start
if "%choice%"=="2" goto restart
if "%choice%"=="3" goto stop
if "%choice%"=="4" goto delete
if "%choice%"=="5" goto logs
if "%choice%"=="6" goto status
if "%choice%"=="7" goto monitor
if "%choice%"=="8" goto startup
if "%choice%"=="9" goto flush
if "%choice%"=="0" goto exit
goto invalid

:start
echo.
echo [1/3] Đang kiểm tra bot cũ...
pm2 describe AI-DEV-BOT >nul 2>nul
if %errorlevel% equ 0 (
    echo [INFO] Bot đang chạy, đang dừng...
    pm2 delete AI-DEV-BOT
)

echo [2/3] Đang khởi động bot...
pm2 start ecosystem.config.js
if %errorlevel% neq 0 (
    echo [ERROR] Khởi động bot thất bại!
    pause
    exit /b 1
)

echo [3/3] Đang lưu cấu hình...
pm2 save
echo.
echo [SUCCESS] Bot đã khởi động thành công!
echo.
goto show_status

:restart
echo.
echo Đang khởi động lại bot...
pm2 restart AI-DEV-BOT
if %errorlevel% neq 0 (
    echo [ERROR] Bot chưa được khởi động!
    echo Vui lòng chọn [1] để khởi động bot.
    pause
    exit /b 1
)
echo [SUCCESS] Đã khởi động lại bot!
goto show_status

:stop
echo.
echo Đang dừng bot...
pm2 stop AI-DEV-BOT
echo [SUCCESS] Đã dừng bot!
goto show_status

:delete
echo.
echo CẢNH BÁO: Bạn có chắc muốn xóa bot?
set /p confirm="Nhập 'yes' để xác nhận: "
if not "%confirm%"=="yes" (
    echo Đã hủy thao tác.
    pause
    exit /b 0
)
pm2 delete AI-DEV-BOT
pm2 save
echo [SUCCESS] Đã xóa bot!
pause
exit /b 0

:logs
echo.
echo Đang mở log real-time...
echo (Nhấn Ctrl+C để thoát)
timeout /t 2 >nul
pm2 logs AI-DEV-BOT
goto end

:status
goto show_status

:monitor
echo.
echo Đang mở monitor...
echo (Nhấn Ctrl+C để thoát)
timeout /t 2 >nul
pm2 monit
goto end

:startup
echo.
echo ════════════════════════════════════════
echo   CẤU HÌNH TỰ KHỞI ĐỘNG
echo ════════════════════════════════════════
echo.
echo Lưu ý: Cần chạy CMD/PowerShell với quyền Administrator!
echo.
echo [1] Cài đặt startup
echo [2] Gỡ startup
echo [0] Quay lại
echo.
set /p startup_choice="Nhập lựa chọn: "

if "%startup_choice%"=="1" (
    echo.
    echo Đang cài đặt startup...
    pm2 startup
    echo.
    echo QUAN TRỌNG: Hãy copy và chạy lệnh bên trên với quyền Administrator!
    echo Sau đó chạy: pm2 save
    pause
    goto end
)

if "%startup_choice%"=="2" (
    echo.
    echo Đang gỡ startup...
    pm2 unstartup
    echo [SUCCESS] Đã gỡ startup!
    pause
    goto end
)

goto end

:flush
echo.
echo CẢNH BÁO: Bạn có chắc muốn xóa tất cả log?
set /p confirm="Nhập 'yes' để xác nhận: "
if not "%confirm%"=="yes" (
    echo Đã hủy thao tác.
    pause
    exit /b 0
)
pm2 flush
echo [SUCCESS] Đã xóa tất cả log!
pause
exit /b 0

:invalid
echo.
echo [ERROR] Lựa chọn không hợp lệ!
timeout /t 2 >nul
cls
goto start

:show_status
echo.
echo ════════════════════════════════════════
echo   TRẠNG THÁI BOT
echo ════════════════════════════════════════
pm2 status
echo.
echo ════════════════════════════════════════
echo   CÁC LỆNH HỮU ÍCH
echo ════════════════════════════════════════
echo   pm2 logs          - Xem log real-time
echo   pm2 monit         - Monitor RAM/CPU
echo   pm2 restart all   - Khởi động lại
echo   pm2 stop all      - Dừng bot
echo   pm2 flush         - Xóa log
echo ════════════════════════════════════════
echo.
pause
exit /b 0

:exit
echo.
echo Tạm biệt!
timeout /t 1 >nul
exit /b 0

:end
exit /b 0