@echo off
cd /d "%~dp0"
where py >nul 2>nul && (py server.py & goto :eof)
where python >nul 2>nul && (python server.py & goto :eof)
echo Python is not installed. Install it from the Microsoft Store (search for "Python 3.12"), then run this file again.
pause
