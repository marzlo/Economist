$ErrorActionPreference='Stop'
$root=$PSScriptRoot
$channel='UCyQM2qoRd1Ngb4apsbca-aQ'
[xml]$feed=(Invoke-WebRequest -Uri "https://www.youtube.com/feeds/videos.xml?channel_id=$channel").Content
$items=@($feed.feed.entry | ForEach-Object {
 $title=[string]$_.title
 $category=if($title -match 'AI|人工智慧|科技|晶片|機器人'){ '科技與 AI' }elseif($title -match '川普|特朗普|美國|中國|戰爭|俄|以色列|伊朗|外交|政治'){ '國際與政治' }elseif($title -match '經濟|金融|投資|美元|股|市場|銀行|債|通膨'){ '經濟與市場' }else{'閱讀與觀點'}
 @{id=[string]$_.videoId;title=$title;published=[string]$_.published;category=$category;description=[string]$_.group.description;url=[string]$_.link.href;thumbnail=[string]$_.group.thumbnail.url}
})
if($items.Count -eq 0){throw 'RSS 未回傳影片，保留原有資料。'}
@{updated=(Get-Date).ToUniversalTime().ToString('o');channel=$channel;videos=$items} | ConvertTo-Json -Depth 6 | Set-Content -Encoding utf8 (Join-Path $root 'dist/videos.json')
Write-Output "已更新 $($items.Count) 部影片"
