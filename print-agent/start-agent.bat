@echo off
title Royal Paan Print Agent
cd /d "%~dp0"

REM =====================================================================
REM  SETTINGS - sirf yeh lines badlo
REM =====================================================================
REM Website ka address (live site ho to https://... wala address daalo)
set SERVER_URL=http://localhost:3000
REM Wahi key jo server ki .env.local mein PRINT_AGENT_KEY hai
set PRINT_AGENT_KEY=15646aa0407da18b0f3327db760dd8f3
REM Printer ka IP address (printer ki self-test slip par likha hota hai)
set PRINTER_IP=192.168.192.168
REM Printer ka port - Epson LAN printer ke liye 9100 hi rehne do
set PRINTER_PORT=9100
REM Ek line mein kitne akshar aate hain (TM-U220 par 40)
set PRINTER_COLUMNS=40
REM Printer mein auto-cutter hai to yes, nahi hai to no
set PRINTER_CUTTER=yes
REM =====================================================================

:loop
node agent.js
echo Agent band ho gaya, 5 second mein dobara shuru ho raha hai...
timeout /t 5 /nobreak >nul
goto loop
