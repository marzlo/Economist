"""Refresh the latest uploads with YouTube Data API v3; retain older videos."""
import json
import os
from pathlib import Path
import re
import sys
from datetime import datetime, timezone
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent
CHANNEL = 'UCyQM2qoRd1Ngb4apsbca-aQ'


def request(resource, key, **params):
    url = 'https://www.googleapis.com/youtube/v3/' + resource + '?' + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={'X-Goog-Api-Key': key})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.load(response)
    except urllib.error.HTTPError as error:
        # Never include request headers, the key, or raw response bodies in logs.
        try:
            reason = json.load(error).get('error', {}).get('errors', [{}])[0].get('reason', '')
        except (ValueError, IndexError, AttributeError):
            reason = ''
        if not re.fullmatch(r'[A-Za-z0-9_]+', reason):
            reason = 'unknown'
        raise RuntimeError(f'YouTube API HTTP {error.code} ({reason})；請檢查 API 啟用、金鑰限制與配額') from None


def category(title):
    for pattern, label in [(r'AI|人工智慧|科技|晶片|機器人', '科技與 AI'),
                           (r'川普|特朗普|美國|中國|戰爭|俄|以色列|伊朗|外交|政治', '國際與政治'),
                           (r'經濟|金融|投資|美元|股|市場|銀行|債|通膨', '經濟與市場')]:
        if re.search(pattern, title):
            return label
    return '閱讀與觀點'


def run():
    key = os.environ.get('YOUTUBE_API_KEY')
    if not key:
        raise RuntimeError('請在 GitHub Actions repository secrets 設定 YOUTUBE_API_KEY')
    path = ROOT / 'dist/videos.json'
    old = json.loads(path.read_text(encoding='utf-8-sig'))
    channels = request('channels', key, part='contentDetails', id=CHANNEL)
    uploads = channels['items'][0]['contentDetails']['relatedPlaylists']['uploads']
    playlist = request('playlistItems', key, part='contentDetails', playlistId=uploads, maxResults=50)
    ids = [item['contentDetails']['videoId'] for item in playlist.get('items', [])]
    if not ids:
        raise RuntimeError('YouTube API 未回傳上傳影片，保留舊資料')
    videos = request('videos', key, part='snippet', id=','.join(ids))
    archive = {v['id']: v for v in old['videos']}
    count = 0
    for video in videos.get('items', []):
        snippet = video['snippet']
        if snippet['channelId'] != CHANNEL:
            raise RuntimeError('YouTube API 回傳的影片頻道不符，保留舊資料')
        published = snippet['publishedAt']
        datetime.fromisoformat(published.replace('Z', '+00:00'))
        title = snippet['title']
        thumbnails = snippet.get('thumbnails', {})
        thumbnail = next((thumbnails[size]['url'] for size in ['high', 'medium', 'default'] if size in thumbnails), '')
        ident = video['id']
        archive[ident] = {'id': ident, 'title': title, 'description': snippet.get('description', ''),
                          'published': published, 'category': category(title),
                          'url': 'https://www.youtube.com/watch?v=' + ident, 'thumbnail': thumbnail}
        count += 1
    if not count:
        raise RuntimeError('YouTube API 未回傳可用影片，保留舊資料')
    old.update(updated=datetime.now(timezone.utc).isoformat(), videos=sorted(
        archive.values(), key=lambda v: datetime.fromisoformat(v['published'].replace('Z', '+00:00')), reverse=True))
    temporary = path.with_suffix('.json.tmp')
    try:
        temporary.write_text(json.dumps(old, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)
    print(f'YouTube API 已更新 {count} 部影片，共保留 {len(archive)} 部')


if __name__ == '__main__':
    try:
        run()
    except Exception as error:
        print('更新失敗：' + str(error), file=sys.stderr)
        sys.exit(1)
