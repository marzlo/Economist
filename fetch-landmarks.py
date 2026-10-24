"""Vendor reusable Commons landmark photographs and preserve licensing metadata."""
import html
import io
from PIL import Image, ImageOps
import json
from pathlib import Path
import re
import time
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent
HEADERS = {'User-Agent': 'EconomistPublicWatch/1.0 (https://github.com/marzlo/Economist; landmark photography attribution)'}


def api(host, **params):
    url = 'https://' + host + '/w/api.php?' + urllib.parse.urlencode({'format': 'json', 'action': 'query', **params})
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=45) as response:
        value = json.load(response)
    if 'error' in value:
        raise ValueError(value['error'].get('code', 'Wiki API error'))
    return value


def clean(value):
    return html.unescape(re.sub('<[^>]*>', '', value)).strip()


def run():
    folder = ROOT / 'dist/landmarks'
    catalog = json.loads((folder / 'catalog.json').read_text())
    credits_path = folder / 'credits.json'
    credits = json.loads(credits_path.read_text()) if credits_path.exists() else {}
    failures = []
    report = {}
    for index, (scope, landmark) in enumerate(catalog.items()):
        if landmark.get('illustration'):
            continue
        existing = credits.get(scope, {})
        if existing.get('file') and (ROOT / 'dist' / existing['file']).exists():
            continue
        try:
            page = next(iter(api('zh.wikipedia.org', titles=landmark['article'], redirects=1,
                                 prop='pageimages', piprop='name|original', pilicense='free')['query']['pages'].values()))
            filename = page.get('pageimage')
            if not filename:
                raise ValueError('百科條目沒有可用的自由授權圖片')
            info = next(iter(api('commons.wikimedia.org', titles='File:' + filename, prop='imageinfo',
                                iiprop='url|extmetadata', iiurlwidth=1280)['query']['pages'].values()))['imageinfo'][0]
            metadata = info['extmetadata']
            license_name = clean(metadata.get('LicenseShortName', {}).get('value', ''))
            if not (license_name.startswith(('CC BY', 'CC0')) or license_name == 'Public domain'):
                raise ValueError('圖片授權需另行審查：' + license_name)
            url = urllib.parse.urljoin('https://commons.wikimedia.org', info.get('thumburl') or info['url'])
            if not (urllib.parse.urlsplit(url).hostname or '').endswith('.wikimedia.org'):
                url = info['url']
            if not (urllib.parse.urlsplit(url).hostname or '').endswith('.wikimedia.org'):
                raise ValueError('不是 Commons 圖片主機：' + repr(url))
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=45) as response:
                content_type = response.headers.get_content_type()
                extension = {'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp'}.get(content_type)
                if not extension:
                    raise ValueError('背景不是可用的靜態照片：' + content_type)
                image = response.read(32 * 1024 * 1024 + 1)
            if len(image) > 32 * 1024 * 1024:
                raise ValueError('圖片過大')
            relative = 'landmarks/landmark-' + str(index).zfill(2) + '.jpg'
            with Image.open(io.BytesIO(image)) as photo:
                photo = ImageOps.exif_transpose(photo).convert('RGB')
                photo.thumbnail((1400, 1000))
                photo.save(ROOT / 'dist' / relative, 'JPEG', quality=84, optimize=True)
            credits[scope] = {'name': landmark['name'], 'file': relative, 'originalFile': filename,
                             'author': clean(metadata.get('Artist', {}).get('value', 'Wikimedia Commons contributor')),
                             'license': license_name, 'licenseUrl': metadata.get('LicenseUrl', {}).get('value', ''),
                             'source': info['descriptionurl'], 'changes': 'Resized and converted to JPEG; displayed cropped with a translucent overlay.'}
            print(scope, landmark['name'], license_name, len(image), flush=True)
        except Exception as error:
            failures.append(scope)
            report[scope] = type(error).__name__ + ': ' + str(error)
            print('Landmark unavailable:', scope, type(error).__name__, str(error), flush=True)
        time.sleep(1)
    (folder / 'fetch-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
    credits_path.write_text(json.dumps(credits, ensure_ascii=False, indent=2) + '\n')
    if failures:
        raise RuntimeError('Missing landmark photographs: ' + ', '.join(failures))


if __name__ == '__main__':
    run()
