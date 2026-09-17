# Builds installer\vox.ico from web\public\icon.png: pads the picture to a
# square, scales it to the standard icon sizes and wraps the PNGs in an ICO
# container. Needs only Windows PowerShell (System.Drawing), no other tools.
#
#   powershell -ExecutionPolicy Bypass -File installer\make-icon.ps1
param(
    [string]$Source = (Join-Path $PSScriptRoot '..\web\public\icon.png'),
    [string]$Out    = (Join-Path $PSScriptRoot 'vox.ico')
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$src  = [System.Drawing.Image]::FromFile((Resolve-Path $Source))
$side = [Math]::Max($src.Width, $src.Height)
$square = New-Object System.Drawing.Bitmap $side, $side
$g = [System.Drawing.Graphics]::FromImage($square)
$g.Clear([System.Drawing.Color]::Transparent)
$g.DrawImage($src, [int](($side - $src.Width) / 2), [int](($side - $src.Height) / 2), $src.Width, $src.Height)
$g.Dispose()

$sizes = 256, 128, 64, 48, 32, 16
$pngs = foreach ($s in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $s, $s
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode  = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode      = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode    = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($square, 0, 0, $s, $s)
    $g.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    ,$ms.ToArray()
}

# ICO layout: a 6-byte header, a 16-byte directory entry per image, then the
# image data. Entries may hold PNG data directly (Windows Vista and later).
$count  = $sizes.Count
$offset = 6 + 16 * $count
$w = New-Object System.IO.BinaryWriter ([System.IO.File]::Create($Out))
$w.Write([uint16]0); $w.Write([uint16]1); $w.Write([uint16]$count)
for ($i = 0; $i -lt $count; $i++) {
    $s = $sizes[$i]
    $dim = if ($s -ge 256) { 0 } else { $s }      # 0 stands for 256
    $w.Write([byte]$dim); $w.Write([byte]$dim)
    $w.Write([byte]0);    $w.Write([byte]0)       # palette size, reserved
    $w.Write([uint16]1);  $w.Write([uint16]32)    # colour planes, bits per pixel
    $w.Write([uint32]$pngs[$i].Length); $w.Write([uint32]$offset)
    $offset += $pngs[$i].Length
}
foreach ($p in $pngs) { $w.Write($p) }
$w.Close()
$square.Dispose(); $src.Dispose()
Write-Host "wrote $Out ($((Get-Item $Out).Length) bytes)"
