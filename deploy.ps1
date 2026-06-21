$ErrorActionPreference = 'Stop'
$TOKEN = $env:GITHUB_TOKEN # Use environment variable
$USER = "x-tahosin"
$REPO_NAME = "solstice-runner"
$CWD = "c:\Users\xtaho\Desktop\Dev Engine\turing's-solstice"

Set-Location $CWD

Write-Host "Installing dependencies..."
npm install

Write-Host "Building project..."
npm run build

Write-Host "Setting up git for main branch..."
git config --global user.name "Tahosin"
git config --global user.email "tahosin@example.com"

if (-not (Test-Path .git)) {
    git init
    git checkout -b main
    git add .
    git commit -m "Initial commit for solstice-runner"
} else {
    git add .
    git commit -m "Update"
}

Write-Host "Creating GitHub repo via API..."
$body = @{ name = $REPO_NAME; private = $false; description = "Solstice Runner Game" } | ConvertTo-Json
try {
    Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers @{ Authorization = "token $TOKEN" } -Body $body -ContentType "application/json"
    Write-Host "Repo created successfully."
} catch {
    Write-Host "Repo might already exist or API error: $_"
}

Write-Host "Pushing to main..."
git remote remove origin -ErrorAction SilentlyContinue
git remote add origin "https://$USER`:$TOKEN@github.com/$USER/$REPO_NAME.git"
git push -u origin main

Write-Host "Deploying to gh-pages branch..."
Set-Location "$CWD\dist"
if (Test-Path .git) { Remove-Item -Recurse -Force .git }
git init
git checkout -b gh-pages
git add .
git commit -m "Deploy to GitHub Pages"
git remote add origin "https://$USER`:$TOKEN@github.com/$USER/$REPO_NAME.git"
git push -u origin gh-pages --force

Write-Host "Deployment complete. URL will be: https://$USER.github.io/$REPO_NAME/"
