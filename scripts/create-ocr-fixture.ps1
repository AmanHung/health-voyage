param([switch]$English)
Add-Type -AssemblyName System.Drawing
$fixtureBitmap = [System.Drawing.Bitmap]::new(800, 600)
$fixtureGraphics = [System.Drawing.Graphics]::FromImage($fixtureBitmap)
$fixtureFont = [System.Drawing.Font]::new('Microsoft JhengHei', 40)
try {
  $fixtureGraphics.Clear([System.Drawing.Color]::White)
  $stepLabel = if ($English) { 'Steps 3500' } else { '步數 3500' }
  $timeLabel = if ($English) { 'Exercise 30 min' } else { '運動時間 30 分鐘' }
  $fixtureGraphics.DrawString($stepLabel, $fixtureFont, [System.Drawing.Brushes]::Black, 40, 80)
  $fixtureGraphics.DrawString($timeLabel, $fixtureFont, [System.Drawing.Brushes]::Black, 40, 250)
  $fixtureBitmap.Save((Join-Path $PWD 'work/ocr-fixture.png'), [System.Drawing.Imaging.ImageFormat]::Png)
} finally { $fixtureFont.Dispose(); $fixtureGraphics.Dispose(); $fixtureBitmap.Dispose() }
