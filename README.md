# 下一章閱讀｜新聞與議題整理

GitHub Pages 網址：https://marzlo.github.io/Economist/

頁面原始碼位於 `dist/`。GitHub Actions 在推送 main、手動執行，以及每天台灣時間 08:17、12:17、18:17 更新 YouTube Data API 資料與公共議題新聞推薦並部署。排程可能因 GitHub 系統負載延後。影片更新失敗時保留既有影片資料；新聞 RSS 按議題獨立更新，失敗保留先前推薦。

右側可編輯議題、狀態、判斷，並新增帶日期的記事、自訂連結與影片附件。資料先存本機瀏覽器，設定 GitHub 權杖後同步至 `issues.json`，也可匯出 JSON。

在 Settings → Pages 使用 GitHub Actions 作為部署來源。工作流程會嘗試啟用 Pages；若權限不足，repo 管理員需手動設定。


## 台灣公共議題追蹤

頁面底部依中央、國際及 22 縣市分類，支援新增議題、關鍵字、觀察指標、狀態、帶日期的進展與手動文章／影片連結。先以松山機場示範三個待查證指標，並不表示政府尚未執行。標記「已達成」需附佐證連結；歷史進度會留在時間軸。記事可透過既有編輯器關聯多個議題，與原有 GitHub 同步、匯出共用，不另設密鑰。

`update-public-news.py` 依 `issues.json` 中 `kind: civic` 的議題關鍵字讀取 Google News 公開 RSS（近 90 天），產生 `dist/public-news.json`。排程、手動更新及推送皆更新新聞；每題最多保留 15 筆推薦，網站再與現有影片合併比對。新聞失敗時保留上次結果並在頁面標示；暫停／已結案的議題不再抓新新聞。新增議題的新聞會在下一次更新後出現。這是來源推薦，未自動判斷進展或做事實查核。需要 egress 到 `news.google.com`，不需要新增金鑰。

測試：`node test-civic.cjs`、`python3 -B test-public-news.py`，以及原有 `test-*.cjs` 與影片更新測試。靜態開發使用 `python3 -m http.server 8000 --directory dist`。


### 縣市閱讀介面與地標背景

公共議題區採「範圍分頁 → 議題標籤 → 單一閱讀卡片」，推薦預設收合，已收錄的文章／影片與個人理解分開呈現。縣市背景使用 Commons 自由授權地標照片，檔案與作者、授權、來源記錄於 `dist/landmarks/`；頁尾提供署名、授權連結與裁切淡化註記。圖片在本網站提供，不依賴瀏覽器連到外部圖床。

`fetch-landmarks.py` 與 `dist/landmarks/catalog.json` 維護對應地標；修改任一檔案會啟動 `landmarks.yml` 下載尚缺的照片並保存署名。已備妥照片不重複下載，不影響每日新聞／影片更新。下載腳本需 `Pillow==12.3.0`，工作流程會自動安裝並先執行 `test-landmarks.py`；所有照片縮小並轉為 JPEG。新增圖片需先確認內容與自由授權。原圖依各自授權使用，網站顯示時會裁切並加上淡色遮罩。
