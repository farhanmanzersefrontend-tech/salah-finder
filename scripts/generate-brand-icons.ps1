# Raster versions of public/favicon.svg for browser, iOS, and home-screen icons.
Add-Type -AssemblyName System.Drawing
$assetDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public'))
$background = [System.Drawing.ColorTranslator]::FromHtml('#355d57')
$cream = [System.Drawing.ColorTranslator]::FromHtml('#f7f4e6')
$gold = [System.Drawing.ColorTranslator]::FromHtml('#f3ce88')
$sizes = @{ 'favicon.png' = 32; 'apple-touch-icon.png' = 180; 'icon-192.png' = 192; 'icon-512.png' = 512 }

foreach ($entry in $sizes.GetEnumerator()) {
    $size = $entry.Value
    $bitmap = [System.Drawing.Bitmap]::new($size * 4, $size * 4)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $scale = [single]($size * 4 / 64)
    $graphics.ScaleTransform($scale, $scale)
    $bgBrush = [System.Drawing.SolidBrush]::new($background)
    $goldBrush = [System.Drawing.SolidBrush]::new($gold)
    $pen = [System.Drawing.Pen]::new($cream, 3.5)
    $pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $pen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $tile = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $tile.AddArc(0, 0, 28, 28, 180, 90)
    $tile.AddArc(36, 0, 28, 28, 270, 90)
    $tile.AddArc(36, 36, 28, 28, 0, 90)
    $tile.AddArc(0, 36, 28, 28, 90, 90)
    $tile.CloseFigure()
    $graphics.FillPath($bgBrush, $tile)
    $graphics.DrawEllipse($pen, 10, 18, 36, 36)
    $hands = [System.Drawing.PointF[]]@(
        [System.Drawing.PointF]::new(28, 26),
        [System.Drawing.PointF]::new(28, 36),
        [System.Drawing.PointF]::new(36, 41)
    )
    $graphics.DrawLines($pen, $hands)
    $graphics.FillEllipse($goldBrush, 35, 7, 20, 20)
    $graphics.FillEllipse($bgBrush, 40, 4, 18, 18)
    $output = [System.Drawing.Bitmap]::new($size, $size)
    $resizer = [System.Drawing.Graphics]::FromImage($output)
    $resizer.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $resizer.DrawImage($bitmap, 0, 0, $size, $size)
    $output.Save((Join-Path $assetDirectory $entry.Key), [System.Drawing.Imaging.ImageFormat]::Png)
    $resizer.Dispose()
    $output.Dispose()
    $tile.Dispose()
    $pen.Dispose()
    $bgBrush.Dispose()
    $goldBrush.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Output "Created $($entry.Key) ($size x $size)"
}
