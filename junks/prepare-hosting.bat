@echo off
echo.
echo ================================
echo   Preparing for Web Hosting
echo ================================
echo.

echo Creating deployment folder...
if exist "deploy" rmdir /s /q deploy
mkdir deploy

echo Copying files...
xcopy "index.html" "deploy\" /Y > nul
xcopy "css" "deploy\css\" /E /I /Y > nul
xcopy "js" "deploy\js\" /E /I /Y > nul
xcopy "netlify.toml" "deploy\" /Y > nul
xcopy "_redirects" "deploy\" /Y > nul
xcopy "offline-tracker.html" "deploy\" /Y > nul
xcopy "README.md" "deploy\" /Y > nul

echo.
echo ✅ Files ready for hosting in 'deploy' folder!
echo.
echo Next steps:
echo 1. Go to https://netlify.com
echo 2. Sign up (free)
echo 3. Drag the 'deploy' folder to the deploy area
echo 4. Get your live URL!
echo.
pause
