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

已發布週報為當時記事的閱讀快照，編輯 `issues.json`、更新影片或新聞不會自動改寫週報；後續週報由每週一排程或管理入口產生草稿，預覽確認後才發布。新增一期時建立新的日期資料夾、更新 `dist/weekly/index.json` 與首頁卡片，再執行 `node test-weekly.cjs`，確認日期、篇數、章節對應、引句與下載資源一致。來源篇數使用網站原有歸週方式（建立日期換算台灣時間；無建立時間則採記事日期），同篇跨議題記事先去重。週報獨立路由可返回首頁；開啟過的週報資源由 service worker 按需快取。


### 自動草稿與人工發布

首頁「每週回望 → 管理週報草稿」可選擇週一日期產生草稿，預設上個完整週，也可選本週（截至目前）。每週一台灣時間 09:10 的排程同樣只產生上週草稿；GitHub 排程可能延遲。空白週不呼叫 AI、不覆寫舊草稿。

先在本儲存庫 **Settings → Secrets and variables → Actions → Repository secrets** 設定 `WEEKLY_AI_API_KEY`，值為 OpenAI API 金鑰。金鑰僅交給 GitHub Actions 的文字生成步驟，不進入網頁、原記事、提示或草稿。若已有 repository secret `OPENAI_API_KEY`，也可沿用，不必重建。API 用量由你的 OpenAI 專案計費，與 ChatGPT 訂閱分開。可選的 repository variable `WEEKLY_AI_MODEL` 預設為 `gpt-5-mini`，須支援 Responses API 與 JSON schema。瀏覽器沿用原有 GitHub 權杖（Contents、Actions 的 Read and write），不需把 AI 金鑰輸入網站。

1. 按「產生週報草稿」，等待工作流程完成，再開啟草稿。
2. 展開修改欄位，可調整標題、導讀、分類名稱、章節敘事、概念圖與問題；引句只能逐字摘取原記事。重新預覽後按「儲存草稿」。
3. 按「發布這一期」並確認，才會建立正式 HTML、原記事快照、Markdown 與 PDF，更新首頁和歷次週報清單並部署。重新產生或跨裝置編輯後，舊版預覽的發布請求會被拒絕，避免誤發未看過的版本。

`_weekly/drafts/` 保存草稿，`_weekly/published/` 保存已發布的版本識別；這是公開儲存庫，草稿原始檔也公開，但尚未列入正式週報。發布可替換同一期，較早一期的重新發布不會把首頁從最新一期倒退。排程、生成錯誤或缺少金鑰都不會更新正式週報。

`scripts/weekly.py` 呼叫文字 AI 並驗證每篇記事恰好分入一章、沒有虛構記事 ID，引用逐字符合原文，篇數與來源數皆由程式計算。無法驗證的 AI 回覆至多修正重試一次，失敗保留現有資料。記事過多會明確報錯，不截斷或靜默漏掉。網頁預覽使用隔離 iframe，AI 字串以文字呈現；封面先共用現有概念插畫，不會另外呼叫付費圖片生成。發布步驟用 Playwright 1.62.1 與 Chrome/Chromium 建立 PDF，工作流程自動準備套件及中文字型。正式發布與既有 Pages 工作流程共用部署佇列。

驗證：`python3 -B test-weekly-generator.py`、`node test-weekly-drafts.cjs`，以及原有 `node test-weekly.cjs`。`weekly.yml` 支援手動 `generate` / `publish`；發布必須提供確切的已審閱草稿 `revision`。開發驗證提交訊息可用 `[weekly-draft]` 觸發一次真實生成，仍不會自動發布。
