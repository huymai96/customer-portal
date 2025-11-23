# Automated Vercel Deployment Script
Write-Host "Starting Vercel Deployment Process..." -ForegroundColor Cyan
Write-Host ""

# Check if Vercel CLI is installed
Write-Host "Checking Vercel CLI..." -ForegroundColor Yellow
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "Vercel CLI not found. Installing..." -ForegroundColor Red
    npm install -g vercel
    Write-Host "Vercel CLI installed!" -ForegroundColor Green
} else {
    Write-Host "Vercel CLI already installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "Step 1: Login to Vercel" -ForegroundColor Cyan
Write-Host "This will open your browser. Please login and come back here." -ForegroundColor Gray
Write-Host ""
vercel login

Write-Host ""
Write-Host "Step 2: Navigate to project directory" -ForegroundColor Cyan
Set-Location C:\customer-portal

Write-Host ""
Write-Host "Step 3: Deploy to Vercel (Preview)" -ForegroundColor Cyan
Write-Host "Answer the prompts:" -ForegroundColor Gray
Write-Host "- Set up and deploy? -> y" -ForegroundColor Gray
Write-Host "- Which scope? -> Select your account" -ForegroundColor Gray
Write-Host "- Link to existing project? -> N" -ForegroundColor Gray
Write-Host "- Project name? -> customer-portal" -ForegroundColor Gray
Write-Host "- Directory? -> ./ (press Enter)" -ForegroundColor Gray
Write-Host "- Override settings? -> N" -ForegroundColor Gray
Write-Host ""

$deploy = Read-Host "Ready to deploy? (y/n)"

if ($deploy -eq 'y') {
    vercel
    
    Write-Host ""
    Write-Host "Preview deployment complete!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Step 4: Add Environment Variables" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "You need to add environment variables before production deployment." -ForegroundColor Yellow
    Write-Host "Options:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Option A: Use Vercel Dashboard (Recommended)" -ForegroundColor White
    Write-Host "1. Visit: https://vercel.com/dashboard" -ForegroundColor Gray
    Write-Host "2. Go to your project -> Settings -> Environment Variables" -ForegroundColor Gray
    Write-Host "3. Copy variables from your .env.local file" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option B: Use CLI (for each variable)" -ForegroundColor White
    Write-Host "vercel env add VARIABLE_NAME production" -ForegroundColor Gray
    Write-Host ""
    
    $addEnvVars = Read-Host "Have you added environment variables? (y/n)"
    
    if ($addEnvVars -eq 'y') {
        Write-Host ""
        Write-Host "Step 5: Deploy to Production" -ForegroundColor Cyan
        $deployProd = Read-Host "Deploy to production now? (y/n)"
        
        if ($deployProd -eq 'y') {
            vercel --prod
            
            Write-Host ""
            Write-Host "SUCCESS! Your app is now live on Vercel!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Next Steps:" -ForegroundColor Cyan
            Write-Host "1. Run database migrations on production" -ForegroundColor White
            Write-Host "2. Sync product catalog" -ForegroundColor White
            Write-Host "3. Set up cron jobs for automatic syncing" -ForegroundColor White
            Write-Host ""
            Write-Host "Useful Links:" -ForegroundColor Cyan
            Write-Host "- Dashboard: https://vercel.com/dashboard" -ForegroundColor White
            Write-Host "- GitHub: https://github.com/huymai96/customer-portal" -ForegroundColor White
            Write-Host ""
            Write-Host "All future pushes to main will auto-deploy!" -ForegroundColor Green
        }
    } else {
        Write-Host ""
        Write-Host "Deployment paused. Add environment variables then run: vercel --prod" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "Deployment cancelled. Run this script again when ready." -ForegroundColor Yellow
}

Write-Host ""
