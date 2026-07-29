[CmdletBinding()]
param(
    [switch]$Local
)

$ErrorActionPreference = "Stop"
$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$SqlPath = Join-Path $PSScriptRoot "product-metrics.sql"
$Wrangler = Join-Path $RepoRoot "node_modules\.bin\wrangler.cmd"
$Target = if ($Local) { "--local" } else { "--remote" }
$Sql = (Get-Content $SqlPath) -join " "

$Output = & $Wrangler d1 execute maigo-poster $Target --json --command $Sql
if ($LASTEXITCODE -ne 0) {
    throw "D1 metrics query failed with exit code $LASTEXITCODE"
}

$Payload = ($Output -join [Environment]::NewLine) | ConvertFrom-Json
$Row = $Payload[0].results[0]
if (-not $Row) {
    throw "D1 metrics query returned no result"
}

function Get-Percent {
    param([int]$Numerator, [int]$Denominator)
    if ($Denominator -eq 0) { return $null }
    return [Math]::Round(($Numerator / $Denominator) * 100, 1)
}

$Users = [int]$Row.users
$Creators = [int]$Row.creators
$Viewers = [int]$Row.viewers
$Printers = [int]$Row.printers
$Sharers = [int]$Row.sharers

[ordered]@{
    generated_at = (Get-Date).ToUniversalTime().ToString("o")
    service = "maigo-poster"
    environment = if ($Local) { "local" } else { "production" }
    funnel = [ordered]@{
        users = $Users
        creators = $Creators
        campaigns_created = [int]$Row.campaigns_created
        active_campaigns = [int]$Row.active_campaigns
        viewers = $Viewers
        printers = $Printers
        sharers = $Sharers
        sighting_reporters = [int]$Row.reporters
        sightings = [int]$Row.sightings
        owners_checked = [int]$Row.owners_checked
        resolved_campaigns = [int]$Row.resolved_campaigns
        returned_users = [int]$Row.returned_users
        users_7d = [int]$Row.users_7d
        creators_7d = [int]$Row.creators_7d
        reporters_7d = [int]$Row.reporters_7d
    }
    rates = [ordered]@{
        exposure_to_creator_percent = Get-Percent $Creators $Users
        creator_to_print_percent = Get-Percent $Printers $Creators
        creator_to_share_percent = Get-Percent $Sharers $Creators
        viewer_to_report_percent = Get-Percent ([int]$Row.reporters) $Viewers
        campaign_to_resolution_percent = Get-Percent ([int]$Row.resolved_campaigns) ([int]$Row.campaigns_created)
        return_percent = Get-Percent ([int]$Row.returned_users) $Users
    }
    safety = [ordered]@{
        reports = [int]$Row.reports
        hidden_campaigns = [int]$Row.hidden_campaigns
    }
} | ConvertTo-Json -Depth 4
