# 下一章閱讀｜新聞與議題整理

GitHub Pages 網址：https://marzlo.github.io/Economist/

頁面原始碼位於 `dist/`。GitHub Actions 在推送 main、手動執行，以及每天台灣時間 06:00 更新 YouTube RSS 並部署。排程可能因 GitHub 系統負載延後。RSS 失敗時保留既有影片資料。

右側可編輯議題、狀態、判斷，並新增帶日期的記事、自訂連結與影片附件。資料存在本機瀏覽器，可匯出 JSON；不同網域與裝置不會自動同步。

在 Settings → Pages 使用 GitHub Actions 作為部署來源。工作流程會嘗試啟用 Pages；若權限不足，repo 管理員需手動設定。
