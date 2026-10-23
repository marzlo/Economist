import ast, json, re, sys, urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CHANNEL = 'UCyQM2qoRd1Ngb4apsbca-aQ'
def fetch(url, mobile=True):
    agent='Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36' if mobile else 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36'
    req = urllib.request.Request(url, headers={'User-Agent':agent,'Cookie':'SOCS=CAI; CONSENT=YES+cb','Accept-Language':'en-US,en;q=0.9'})
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read().decode('utf-8')
def extract(html, name):
    match = re.search(r'(?:var\s+)?'+name+r'\s*=\s*', html)
    if not match:
        raise ValueError('Missing '+name+'; page title='+str(re.findall(r'<title>(.*?)</title>',html)[:1]))
    rest=html[match.end():]
    if rest.startswith("'"):
        literal=re.match(r"'(?:\\.|[^'\\])*'",rest).group()
        return json.loads(ast.literal_eval(literal.replace(r'\/', '/')))
    return json.JSONDecoder().raw_decode(rest)[0]
def walk(value):
    if isinstance(value,dict):
        for key,item in value.items():
            if key in ('videoRenderer','compactVideoRenderer'):
                yield item
            yield from walk(item)
    elif isinstance(value,list):
        for item in value: yield from walk(item)
def text(value):
    return value.get('simpleText') or ''.join(r.get('text','') for r in value.get('runs',[]))
def run(fixture=None):
    path=ROOT/'dist/videos.json'
    old=json.loads(path.read_text(encoding='utf-8-sig'))
    archive={v['id']:v for v in old['videos']}
    data=extract(Path(fixture).read_text(encoding='utf-8') if fixture else fetch('https://www.youtube.com/channel/'+CHANNEL+'/videos'),'ytInitialData')
    found={v['videoId']:v for v in walk(data) if v.get('videoId')}
    if not found: raise ValueError('頻道頁沒有可辨識的影片，保留舊資料')
    if fixture:
        print('Parsed',len(found),'videos'); return
    failures=[]
    updated=0
    for ident, renderer in list(found.items())[:15]:
        prior=archive.get(ident)
        if prior and prior.get('description'): continue
        try:
            player=extract(fetch('https://www.youtube.com/watch?v='+ident, mobile=False),'ytInitialPlayerResponse')
            details=player.get('videoDetails')
            if not details:
                status=player.get('playabilityStatus',{})
                reason=status.get('reason') or '; '.join(status.get('messages',[])) or 'YouTube 未提供影片詳細資料'
                raise ValueError(f"{status.get('status','UNKNOWN')}: {reason}")
            meta=player.get('microformat',{}).get('playerMicroformatRenderer',{})
            published=meta.get('publishDate') or meta.get('uploadDate')
            if not published: raise ValueError('沒有發布日期')
            datetime.fromisoformat(published.replace('Z','+00:00'))
            if not details.get('shortDescription'): raise ValueError('沒有影片說明，等待下次重試')
            title=details['title']
            category=next((label for pattern,label in [(r'AI|人工智慧|科技|晶片|機器人','科技與 AI'),(r'川普|特朗普|美國|中國|戰爭|俄|以色列|伊朗|外交|政治','國際與政治'),(r'經濟|金融|投資|美元|股|市場|銀行|債|通膨','經濟與市場')] if re.search(pattern,title)),'閱讀與觀點')
            archive[ident]={'id':ident,'title':title,'description':details.get('shortDescription',''),'published':published if 'T' in published else published+'T00:00:00+08:00','url':'https://www.youtube.com/watch?v='+ident,'thumbnail':'https://i.ytimg.com/vi/'+ident+'/hqdefault.jpg','category':category}
            updated+=1
        except Exception as error:
            failures.append(ident)
            print('警告：略過影片 '+ident+'，保留原資料；原因：'+str(error),file=sys.stderr)
    if failures and not updated:
        raise RuntimeError('本次待更新影片全部抓取失敗，保留原資料：'+', '.join(failures))
    if not updated:
        print('頻道頁檢查完成，沒有待更新影片；保留原資料')
        return
    old.update(updated=datetime.now(timezone.utc).isoformat(),videos=sorted(archive.values(),key=lambda v:datetime.fromisoformat(v['published'].replace('Z','+00:00')),reverse=True))
    path.write_text(json.dumps(old,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('頻道頁備援完成，更新',updated,'部，略過',len(failures),'部，共',len(archive),'部影片')
if __name__=='__main__': run(sys.argv[1] if len(sys.argv)>1 else None)



