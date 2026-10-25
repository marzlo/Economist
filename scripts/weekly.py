"""Save manually prepared weekly drafts; publish only an explicitly reviewed revision."""
import argparse
from datetime import date, datetime, timedelta
from functools import partial
import hashlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import html
import json
from pathlib import Path
import re
import shutil
import subprocess
import threading
import uuid
from zoneinfo import ZoneInfo

TOOLS = Path(__file__).resolve().parent
ROOT = TOOLS.parent
PALETTE = ['#ad754a', '#507d79', '#697b45', '#a16265', '#6c7891', '#8a755d']

def today():
    return datetime.now(ZoneInfo('Asia/Taipei')).date()

def week_start(value):
    return value - timedelta(days=(value.weekday() + 1) % 7)

def selected_week(value=None):
    start = date.fromisoformat(value) if value else week_start(today()) - timedelta(days=7)
    if start.weekday() != 6 or start > week_start(today()):
        raise ValueError('請選擇本週或更早一週的星期日')
    return start

def read_json(path, default=None):
    return json.loads(path.read_text(encoding='utf-8-sig')) if path.exists() else default

def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix('.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temp.replace(path)

def text_field(value, name, limit):
    if not isinstance(value, str) or not value.strip() or len(value) > limit:
        raise ValueError('週報欄位格式不正確：' + name)
    return value.strip()

def validate_comparison(value, notes):
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError('跨週比較格式不正確')
    start, end = date.fromisoformat(value['start']), date.fromisoformat(value['end'])
    if end != start + timedelta(days=6):
        raise ValueError('比較週必須為七天')
    previous = value.get('notes', [])
    if not previous or len({n['id'] for n in previous}) != len(previous):
        raise ValueError('比較週記事不可空白或重複')
    if any(not start.isoformat() <= n.get('statDate', '') <= end.isoformat() for n in previous):
        raise ValueError('比較記事不在前週範圍')
    prior_ids, current_ids = {n['id'] for n in previous}, {n['id'] for n in notes}
    if prior_ids & current_ids:
        raise ValueError('兩週記事不得重複計算')
    items = value.get('items', [])
    if not 1 <= len(items) <= 6:
        raise ValueError('請提供 1–6 項跨週比較')
    clean = []
    for item in items:
        text = {k: text_field(item.get(k), k, limit) for k, limit in
                [('title', 100), ('kind', 12), ('previous', 700), ('current', 900), ('meaning', 700), ('next', 300)]}
        before, after = item.get('priorIds'), item.get('currentIds')
        if not isinstance(before, list) or not isinstance(after, list) or not after:
            raise ValueError('比較需標明前週與本週記事')
        if not set(before) <= prior_ids or not set(after) <= current_ids:
            raise ValueError('比較引用了不存在的記事')
        if not before and text['kind'] != '新增':
            raise ValueError('沒有前週來源的項目應標示新增')
        clean.append({**text, 'priorIds': before, 'currentIds': after})
    return {'start': start.isoformat(), 'end': end.isoformat(), 'notes': previous, 'items': clean,
            'note': text_field(value.get('note'), 'comparison note', 900)}


def validate_narrative(value, notes):
    if not isinstance(value, dict):
        raise ValueError('週報文字格式不正確')
    by_id = {n['id']: n for n in notes}
    if not notes or len(by_id) != len(notes):
        raise ValueError('來源記事不可空白或重複')
    clean = {key: text_field(value.get(key), key, limit) for key, limit in
             [('title', 70), ('subtitle', 180), ('intro', 1200)]}
    chapters = value.get('chapters')
    if not isinstance(chapters, list) or not 1 <= len(chapters) <= min(6, len(notes)):
        raise ValueError('週報章節數量不正確')
    used, chapter_ids, clean_chapters = [], set(), []
    for index, chapter in enumerate(chapters):
        cid = chapter.get('id', '')
        if not isinstance(cid, str) or not re.fullmatch(r'[a-z][a-z0-9-]{0,29}', cid) or cid in chapter_ids or cid in {'top','report','days','chapters','archive','my-voice','filters','notes','archive-search'} or cid.startswith(('weekly-', 'note-')):
            raise ValueError('週報章節識別碼不正確')
        chapter_ids.add(cid)
        item = {key: text_field(chapter.get(key), key, limit) for key, limit in
                [('name', 30), ('title', 100), ('summary', 1500), ('observation', 600), ('question', 300)]}
        ids = chapter.get('ids')
        if not isinstance(ids, list) or not ids or any(not isinstance(i, str) or i not in by_id for i in ids):
            raise ValueError('章節引用了不存在的記事')
        captions = chapter.get('captions')
        if not isinstance(captions, list) or not 2 <= len(captions) <= 4:
            raise ValueError('關係圖需提供 2–4 個概念')
        item.update(id=cid, ids=ids, captions=[text_field(c, 'caption', 45) for c in captions],
                    number=str(index + 1).zfill(2), color=PALETTE[index])
        used.extend(ids)
        clean_chapters.append(item)
    if sorted(used) != sorted(by_id) or len(set(used)) != len(used):
        raise ValueError('每篇記事必須恰好分入一個章節，不能遺漏或重複')
    quote = value.get('quote')
    if quote is not None:
        if not isinstance(quote, dict) or quote.get('noteId') not in by_id:
            raise ValueError('引句沒有對應原記事')
        quote = {'noteId': quote['noteId'], 'text': text_field(quote.get('text'), 'quote', 260)}
        if quote['text'] not in by_id[quote['noteId']]['text']:
            raise ValueError('引句必須逐字出自原記事，不可改寫成使用者原話')
    questions = value.get('questions')
    if not isinstance(questions, list) or not 1 <= len(questions) <= 4:
        raise ValueError('請提供 1–4 個延伸問題')
    comparison = validate_comparison(value.get('comparison'), notes)
    if comparison:
        clean['comparison'] = comparison
    clean.update(chapters=clean_chapters, quote=quote,
                 questions=[text_field(q, 'question', 300) for q in questions])
    return clean


def video_ids(notes):
    from urllib.parse import urlparse, parse_qs
    ids = set()
    for note in notes:
        for link in note.get('links', []):
            u = urlparse(link.get('url', ''))
            if u.hostname in ('www.youtube.com', 'youtube.com', 'm.youtube.com'):
                ident = parse_qs(u.query).get('v', [''])[0]
                if ident:
                    ids.add(ident)
            elif u.hostname == 'youtu.be' and u.path.strip('/'):
                ids.add(u.path.strip('/'))
    return ids

def make_draft(start, notes, narrative):
    clean = validate_narrative(narrative, notes)
    if clean.get('comparison') and clean['comparison']['start'] != (start - timedelta(days=7)).isoformat():
        raise ValueError('比較週必須緊接本週之前')
    if any(not start.isoformat() <= n.get('statDate', '') <= min(today(), start + timedelta(days=6)).isoformat() for n in notes):
        raise ValueError('來源記事不在所選週次範圍內')
    assigned = {ident: c['id'] for c in clean['chapters'] for ident in c['ids']}
    sources = [{**n, 'chapter': assigned[n['id']]} for n in notes]
    return {**clean, 'start': start.isoformat(), 'end': (start + timedelta(days=6)).isoformat(),
            'compiledAt': today().isoformat(), 'inProgress': start + timedelta(days=6) > today(), 'notes': sources,
            'topicCount': len({t['id'] for n in notes for t in n.get('topics', [])}),
            'videoCount': len(video_ids(notes)), 'revision': str(uuid.uuid4()), 'status': 'draft',
            'sourceHash': hashlib.sha256(json.dumps(notes, ensure_ascii=False, sort_keys=True).encode()).hexdigest(),
            'editorial': {'method': 'manual-review'}}


def update_draft_index():
    records = []
    for path in (ROOT / '_weekly/drafts').glob('????-??-??.json'):
        data = read_json(path)
        records.append({key: data[key] for key in ['start', 'end', 'revision', 'compiledAt']})
    write_json(ROOT / '_weekly/drafts/index.json', sorted(records, key=lambda x: x['start'], reverse=True))

def markdown(data):
    parts = ['# 每週回望｜' + data['start'] + '—' + data['end'], '', '# ' + data['title'], '', data['intro'], '']
    if data.get('comparison'):
        comp = data['comparison']
        parts += ['## 與再上一週的呼應｜' + comp['start'] + '—' + comp['end'], '', comp['note'], '']
        for item in comp['items']:
            parts += ['### ' + item['kind'] + '｜' + item['title'], '', '再上一週：' + item['previous'], '', '本週：' + item['current'], '', '呼應與變化：' + item['meaning'], '', '繼續追問：' + item['next'], '']
    for c in data['chapters']:
        parts += ['## ' + c['name'] + '｜' + c['title'], '', c['summary'], '', c['observation'], '',
                  '下次閱讀的問題：' + c['question'], '']
    if data.get('quote'):
        parts += ['## 我的聲音', '', '> ' + data['quote']['text'], '']
    parts += ['## 原始記事與來源', '']
    for n in data['notes']:
        parts += ['### ' + n['statDate'] + '｜' + n.get('title', '記事'), '', n.get('text', ''), '']
        for link in n.get('links', []):
            from urllib.parse import urlparse
            if urlparse(link.get('url', '')).scheme in ('http', 'https'):
                parts.append('- [' + link.get('title', link['url']).replace('[', '（').replace(']', '）') + '](' + link['url'] + ')')
        parts += ['']
    if data.get('comparison'):
        parts += ['## 比較用前週記事（不計入本期記事數）', '']
        for n in data['comparison']['notes']:
            parts += ['### ' + n['statDate'] + '｜' + n.get('title', '記事'), '', n.get('text', ''), '']
    return '\n'.join(parts) + '\n'

def render(data):
    template = (ROOT / 'dist/weekly/template.html').read_text()
    values = {'__TITLE__': html.escape(data['title']), '__DATA__': json.dumps(data, ensure_ascii=False).replace('<', '\\u003c')}
    page = re.sub(r'__TITLE__|__DATA__', lambda match: values[match.group()], template)
    if data.get('cover', {}).get('file') == 'weekly-hero.png':
        page = page.replace('src="../weekly-hero.png"', 'src="weekly-hero.png"', 1)
        page = page.replace('alt="紙張拼貼概念插畫：能源船、制度與城市之橋，連到吉他、筆記與思考的人"', 'alt="' + html.escape(data['cover'].get('alt', ''), quote=True) + '"', 1)
    return page

def pdf(path):
    browser = next((shutil.which(name) for name in ['google-chrome', 'chromium', 'chromium-browser'] if shutil.which(name)), None)
    handler = partial(SimpleHTTPRequestHandler, directory=str(ROOT / 'dist'))
    server = ThreadingHTTPServer(('127.0.0.1', 0), handler)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        url = f'http://127.0.0.1:{server.server_port}/weekly/{path.parent.name}/'
        subprocess.run(['node', str(TOOLS / 'weekly-pdf.cjs'), browser or '', url, str(path)],
                       check=True, timeout=90, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
        if not path.exists() or path.stat().st_size < 1000:
            raise RuntimeError('PDF 產生失敗')
    finally:
        server.shutdown()
        server.server_close()


def home_card(data):
    esc = lambda value: html.escape(str(value), quote=True)
    target = 'weekly/' + data['start'] + '/'
    image = 'weekly/' + data['start'] + '/weekly-hero.png' if data.get('cover', {}).get('file') == 'weekly-hero.png' else 'weekly/weekly-hero.png'
    image_alt = data.get('cover', {}).get('alt', '能源、制度與人的創作，概念拼貼插畫')
    tags = ''.join('<span>' + esc(c['name']) + ' · ' + str(len(c['ids'])) + '</span>' for c in data['chapters'])
    quote = ('<blockquote>「' + esc(data['quote']['text']) + '」<small>— 記事原文</small></blockquote>') if data.get('quote') else ''
    return f'''<article class="weekly-digest"><a class="weekly-digest-image" href="{target}" aria-label="閱讀每週回望"><img src="{image}" width="1942" height="809" alt="{esc(image_alt)}" loading="lazy" decoding="async"><span>AI 生成概念插畫</span></a><div class="weekly-digest-copy"><div class="weekly-eyebrow">每週回望 / {data['start']}—{data['end']}</div><h3><a href="{target}">{esc(data['title'])}</a></h3><p>{esc(data['subtitle'])}</p><div class="weekly-digest-tags">{tags}</div>{quote}<div class="weekly-digest-bottom"><span>{len(data['notes'])} 篇記事 · {data['topicCount']} 個議題 · {data['videoCount']} 部影片</span><a class="weekly-read" href="{target}">閱讀這期整理 →</a></div></div></article>'''

def publish(start, revision):
    data = read_json(ROOT / '_weekly/drafts' / (start.isoformat() + '.json'))
    if not data or data.get('revision') != revision:
        raise ValueError('草稿已變更或不存在；請重新預覽後再發布')
    clean = validate_narrative(data, data['notes'])
    if data['start'] != start.isoformat() or data['end'] != (start + timedelta(days=6)).isoformat():
        raise ValueError('草稿日期不正確')
    # Derived metrics and chapter ownership are recomputed, never taken from edited counts.
    data = {**make_draft(start, data['notes'], clean),
            'revision': revision, 'compiledAt': data['compiledAt'], 'status': 'published',
            **({'cover': data['cover']} if data.get('cover') else {})}
    target = ROOT / 'dist/weekly' / start.isoformat()
    if data.get('cover', {}).get('file') == 'weekly-hero.png' and not (target / 'weekly-hero.png').is_file():
        raise ValueError('本期封面圖片不存在，請先準備封面再發布')
    previous = {p.name: p.read_bytes() for p in target.iterdir()} if target.exists() else None
    target.mkdir(parents=True, exist_ok=True)
    try:
        write_json(target / 'report-data.json', data)
        (target / 'index.html').write_text(render(data))
        (target / 'weekly-review.md').write_text(markdown(data))
        pdf(target / 'weekly-review.pdf')
    except Exception:
        shutil.rmtree(target)
        if previous is not None:
            target.mkdir()
            for name, content in previous.items():
                (target / name).write_bytes(content)
        raise
    catalog_path = ROOT / 'dist/weekly/index.json'
    catalog = read_json(catalog_path, {'issues': []})
    record = {'id': data['start'], 'start': data['start'], 'end': data['end'], 'compiledAt': data['compiledAt'],
              'title': data['title'], 'path': 'weekly/' + data['start'] + '/', 'notes': len(data['notes']),
              'topics': data['topicCount'], 'videos': data['videoCount'],
              'chapters': [{'name': c['name'], 'notes': len(c['ids'])} for c in data['chapters']]}
    entries = sorted([r for r in catalog['issues'] if r['id'] != data['start']] + [record], key=lambda r: r['start'], reverse=True)
    write_json(catalog_path, {'latest': entries[0]['id'], 'issues': entries})
    if entries[0]['id'] == data['start']:
        path = ROOT / 'dist/index.html'
        page = path.read_text()
        page, count = re.subn(r'<article class="weekly-digest">[\s\S]*?</article>', lambda _: home_card(data), page, count=1)
        if count != 1:
            raise ValueError('找不到首頁每週回望卡片')
        page = re.sub(r'<a class="weekly-date"[^>]*>.*?</a>',
                      '<a class="weekly-date" href="weekly/' + data['start'] + '/">' + data['start'] + '—' + data['end'] + ' ↗</a>', page, count=1)
        path.write_text(page)
    write_json(ROOT / '_weekly/published' / (data['start'] + '.json'), {'revision': revision, 'publishedAt': datetime.now(ZoneInfo('Asia/Taipei')).isoformat()})
    print('已建立正式週報 ' + data['start'] + '；等待部署')

def create_draft(start, narrative_path):
    notes = json.loads(subprocess.check_output(['node', str(TOOLS / 'weekly-notes.cjs'),
                      start.isoformat(), today().isoformat()], cwd=ROOT, text=True))
    if not notes:
        raise ValueError('這週沒有已同步記事，未改動現有草稿或週報')
    narrative = read_json(Path(narrative_path))
    draft = make_draft(start, notes, narrative)
    write_json(ROOT / '_weekly/drafts' / (start.isoformat() + '.json'), draft)
    update_draft_index()
    print(f'已儲存人工整理草稿 {start}，{len(notes)} 篇記事；尚未發布，不會呼叫任何 AI API')

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('operation', choices=['draft', 'publish'])
    parser.add_argument('--week', default='')
    parser.add_argument('--revision', default='')
    parser.add_argument('--narrative', default='')
    args = parser.parse_args()
    try:
        start = selected_week(args.week or None)
        if args.operation == 'draft':
            if not args.narrative:
                raise ValueError('請提供已人工整理的 --narrative JSON 檔案')
            create_draft(start, args.narrative)
        else:
            publish(start, args.revision)
    except Exception as error:
        message = type(error).__name__ + ': ' + str(error)
        print('::error title=Weekly reflection::' + message.replace('%', '%25').replace('\r', '%0D').replace('\n', '%0A'))
        raise SystemExit(1)
