"""Build public-topic snapshots and RSS recommendations for the static site."""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path
import json
import re
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parent


def normalize(text):
    return text.lower().replace('台', '臺')


def parse_feed(body, keys):
    root = ET.fromstring(body)
    if root.tag != 'rss' or root.find('channel') is None:
        raise ValueError('來源不是有效的 RSS 新聞清單')
    items, seen = [], set()
    terms = [normalize(k) for k in keys if k.strip()]
    for item in root.findall('./channel/item'):
        title = item.findtext('title', '').strip()
        url = item.findtext('link', '').strip()
        if urllib.parse.urlsplit(url).scheme not in ('http', 'https') or url in seen:
            continue
        description = re.sub('<[^>]*>', ' ', item.findtext('description', ''))
        if not title or not any(term in normalize(title + ' ' + description) for term in terms):
            continue
        try:
            published = parsedate_to_datetime(item.findtext('pubDate', '')).astimezone(timezone.utc).isoformat()
        except (ValueError, TypeError, OverflowError):
            published = ''
        seen.add(url)
        items.append({'title': title, 'url': url, 'source': item.findtext('source', '公開新聞'),
                      'published': published, 'type': '文章', 'description': ''})
    return sorted(items, key=lambda item: item['published'], reverse=True)[:15]


def fetch_topic(topic):
    # Keep each topic's OR search specific; do not use expensive YouTube search API calls.
    keys = [k.strip() for k in topic['keys'] if k.strip()][:8]
    if not keys:
        raise ValueError('議題尚未設定關鍵字')
    query = '(' + ' OR '.join('"' + key.replace('"', '') + '"' for key in keys) + ') when:90d'
    url = 'https://news.google.com/rss/search?' + urllib.parse.urlencode({
        'q': query, 'hl': 'zh-TW', 'gl': 'TW', 'ceid': 'TW:zh-Hant'})
    req = urllib.request.Request(url, headers={'User-Agent': 'Economist-Public-Watch/1.0'})
    with urllib.request.urlopen(req, timeout=25) as response:
        return parse_feed(response.read(), keys)


def run():
    issues = json.loads((ROOT / 'issues.json').read_text(encoding='utf-8-sig'))
    topics = [i for i in issues if i.get('kind') == 'civic']
    path = ROOT / 'dist/public-news.json'
    previous = json.loads(path.read_text()) if path.exists() else {'results': {}}
    now = datetime.now(timezone.utc).isoformat()

    def refresh(topic):
        if topic.get('status') in ('已結案', '暫停追蹤'):
            return topic['id'], previous.get('results', {}).get(topic['id'], {'items': []})
        try:
            return topic['id'], {'items': fetch_topic(topic), 'updated': now, 'checkedAt': now,
                                 'keys': topic['keys'], 'error': False}
        except Exception:
            # Fail per topic, preserving the last successful result and its timestamp.
            old = previous.get('results', {}).get(topic['id'], {'items': []})
            print('新聞抓取失敗，保留先前推薦：' + topic['name'])
            return topic['id'], {**old, 'checkedAt': now, 'error': True}

    with ThreadPoolExecutor(max_workers=4) as pool:
        results = dict(pool.map(refresh, topics))
    output = {'updated': now, 'topics': topics, 'results': results}
    temp = path.with_suffix('.json.tmp')
    try:
        temp.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
        temp.replace(path)
    finally:
        temp.unlink(missing_ok=True)
    failed = sum(bool(result.get('error')) for result in results.values())
    print(f'公共議題：{len(topics)}，新聞推薦抓取失敗：{failed}；失敗時保留原資料，不影響既有影片更新。')


if __name__ == '__main__':
    run()
