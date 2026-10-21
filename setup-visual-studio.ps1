$ErrorActionPreference = "Stop"

$vswhere = "${env:ProgramFiles(x86)}\Microsoft Visual Studio\Installer\vswhere.exe"
if (-not (Test-Path -LiteralPath $vswhere)) {
    throw "Visual Studio Installer (vswhere.exe) was not found."
}

$installationPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Workload.Node -property installationPath
if (-not $installationPath) {
    throw "Install the Node.js development workload in Visual Studio Installer."
}

$nodeTools = Join-Path $installationPath "MSBuild\Microsoft\VisualStudio\NodeJs"
$npm = Join-Path $nodeTools "npm.cmd"
if (-not (Test-Path -LiteralPath $npm)) {
    throw "Visual Studio's npm.cmd was not found at $npm."
}

$web = Join-Path $PSScriptRoot "web"
$envFile = Join-Path $web ".env"
if (-not (Test-Path -LiteralPath $envFile)) {
    $example = Get-Content -LiteralPath (Join-Path $web ".env.example") -Raw
    $local = $example.Replace(
        "https://saxodemo.dotpro.ch/oauth/callback",
        "http://localhost:3000/oauth/callback"
    )
    Set-Content -LiteralPath $envFile -Value $local -Encoding utf8
    Write-Host "Created web\.env with local callback and placeholder credentials."
}

$previousPath = $env:PATH
try {
    $env:PATH = "$nodeTools;$previousPath"
    Push-Location $web
    try {
        & $npm ci --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) {
            throw "npm ci failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }
}
finally {
    $env:PATH = $previousPath
}

Write-Host "Ready. Open openAPI_saxo.sln in Visual Studio 2026."
