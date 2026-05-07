@echo off
REM ─────────────────────────────────────────────────────────────
REM LUXE Ecommerce — Windows Setup Script
REM Double-click this file or run: setup.bat
REM ─────────────────────────────────────────────────────────────

echo.
echo  ===================================================
echo   LUXE Ecommerce - Windows Setup
echo  ===================================================
echo.

REM Check Node.js
node --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo  [ERROR] Node.js not found!
  echo  Download from: https://nodejs.org
  pause & exit /b 1
)
echo  [OK] Node.js found: 
node --version

REM Check npm
npm --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
  echo  [ERROR] npm not found. Reinstall Node.js.
  pause & exit /b 1
)
echo  [OK] npm found

echo.
echo  Step 1: Installing backend dependencies...
call npm install --legacy-peer-deps
IF %ERRORLEVEL% NEQ 0 (
  echo  [ERROR] Backend install failed.
  pause & exit /b 1
)
echo  [OK] Backend dependencies installed

echo.
echo  Step 2: Installing frontend dependencies...
cd frontend
call npm install --legacy-peer-deps
IF %ERRORLEVEL% NEQ 0 (
  echo  [ERROR] Frontend install failed.
  cd ..
  pause & exit /b 1
)
cd ..
echo  [OK] Frontend dependencies installed

echo.
echo  Step 3: Setting up .env file...
IF NOT EXIST .env (
  copy .env.example .env
  echo  [OK] Created .env - Please edit it with your database credentials!
  echo.
  echo  ─────────────────────────────────────────────────
  echo   IMPORTANT: Edit .env file before continuing!
  echo   Set these values:
  echo     DB_HOST=localhost
  echo     DB_PORT=5432
  echo     DB_NAME=luxe_ecommerce
  echo     DB_USER=postgres
  echo     DB_PASSWORD=your_password
  echo     RAZORPAY_KEY_ID=rzp_test_...
  echo     RAZORPAY_KEY_SECRET=...
  echo  ─────────────────────────────────────────────────
  echo.
  echo  After editing .env, run these commands manually:
  echo    npm run setup:db
  echo    npm run seed
  echo    npm run dev:full
  notepad .env
  pause & exit /b 0
) ELSE (
  echo  [OK] .env already exists
)

echo.
echo  Step 4: Creating database tables...
node backend/config/setupDb.js
IF %ERRORLEVEL% NEQ 0 (
  echo  [ERROR] Database setup failed. Check .env credentials.
  echo  Make sure PostgreSQL is running and database exists:
  echo    createdb luxe_ecommerce
  pause & exit /b 1
)
echo  [OK] Tables created

echo.
echo  Step 5: Seeding sample data...
node backend/config/seed.js
IF %ERRORLEVEL% NEQ 0 (
  echo  [WARN] Seeding failed - you can retry with: npm run seed
) ELSE (
  echo  [OK] Sample data added
)

echo.
echo  ===================================================
echo   Setup Complete!
echo  ===================================================
echo.
echo  To start the app, run in TWO separate terminals:
echo.
echo    Terminal 1: npm run dev
echo    Terminal 2: cd frontend ^&^& npm start
echo.
echo   OR use: npm run dev:full (needs concurrently)
echo.
echo  Open in browser:
echo    http://localhost:3000         (Store)
echo    http://localhost:3000/admin   (Admin)
echo.
echo  Login credentials:
echo    Admin:    admin@luxe.com / Admin@123
echo    Customer: customer@luxe.com / Customer@123
echo.
pause
