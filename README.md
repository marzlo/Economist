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


### 關鍵字建議

公共議題編輯器按「推薦關鍵字」即可在頁面中挑選建議，依議題名稱、縣市與觀察方向，透過常見別稱及詞彙規則產生搜尋詞。不需要開啟外部服務、貼回內容或設定 API 金鑰。合併保留手動輸入並去除重複，儲存議題前不會寫入 GitHub。這是搜尋輔助，沒有推論事件真偽或進展。

測試：`node test-civic-keywords.cjs`。


## 每週回望

首頁「每週回望」呈現圖文卡片，連到 `dist/weekly/2026-10-12/` 的完整週報。第一期收錄 2026/10/12–10/18 的 18 篇不重複記事，依四條閱讀線整理，保留原文、來源影片、篩選與搜尋，並提供圖文 PDF、Markdown 及資料下載。圖像為 AI 生成的概念插畫。

已發布週報為當時記事的閱讀快照，編輯 `issues.json`、更新影片或新聞不會自動改寫週報；後續週報採對話中人工整理、確認後再發布，不會自動呼叫付費 AI API。新增一期時建立新的日期資料夾、更新 `dist/weekly/index.json` 與首頁卡片，再執行 `node test-weekly.cjs`，確認日期、篇數、章節對應、引句與下載資源一致。來源篇數使用網站原有歸週方式（建立日期換算台灣時間；無建立時間則採記事日期），同篇跨議題記事先去重。週報獨立路由可返回首頁；開啟過的週報資源由 service worker 按需快取。


### 不使用付費 API 的週報流程

週報採對話中整理、預覽確認後再發布：在這個對話中提出「幫我整理上週記事」，產出並確認敘事內容後，可加入 `_weekly/drafts/` 供首頁「管理週報草稿」預覽、修改與發布。此流程不需要 AI API 金鑰，沒有每週自動生成排程，也沒有呼叫文字或圖片生成 API 的程式。聊天本身依使用者既有方案及用量限制使用。

`scripts/weekly.py draft --week YYYY-MM-DD --narrative /path/to/editorial.json` 可將已整理的結構化文字與該週原記事組成草稿；它只讀本機檔案，驗證每篇記事歸入一章、引句逐字符合原文，再保存版本識別。所有草稿都保存在公開儲存庫，但不會直接更新正式週報。沒有稿件時保留現有內容，不用範例文字充當生成結果。

首頁管理入口沿用既有 GitHub 權杖（Contents、Actions 的 Read and write）。可預覽、修改、儲存已整理稿件，再按「發布這一期」；舊版本預覽的發布請求會被拒絕。`.github/workflows/weekly.yml` 只有手動 `publish`，必須提供所選週次與確切的已審閱草稿 `revision`，不接受生成操作。發布會建立正式 HTML、原記事快照、Markdown 與圖文 PDF，並更新首頁及歷次週報；現有封面插畫可重用，沒有額外圖片 API 呼叫。

`_weekly/drafts/` 保存草稿，`_weekly/published/` 保存已發布版本；編輯記事或更新影片不會自動改寫已發布週報。較早一期重新發布不會把首頁從最新一期倒退。發布失敗保留正式站原版，並與既有 Pages 更新共用部署佇列。PDF 使用 Playwright 1.62.1 與 Chrome/Chromium，工作流程自動準備套件與中文字型。

驗證：`python3 -B test-weekly-publisher.py`、`node test-weekly-drafts.cjs`、`node test-weekly.cjs`。
