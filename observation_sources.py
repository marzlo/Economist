"""Public source parsers for the reading dashboard. No API keys or estimated values."""
import calendar
import csv
import io
import json
import re
from datetime import date, timedelta

COMPANIES = {
    'msft': ('微軟', '0000789019'), 'goog': ('Alphabet', '0001652044'),
    'meta': ('Meta', '0001326801'), 'amzn': ('Amazon', '0001018724'),
}
FOOD_URL = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=CPIUFDNS'
ECB_URL = 'https://data-api.ecb.europa.eu/service/data/IRS/M.FR+DE.L.L40.CI.0000.EUR.N.Z?format=csvdata'
MOF_URLS = [
    'https://www.mof.go.jp/jgbs/reference/interest_rate/jgbcm_all.csv',
    'https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/jgbcme.csv',
    'https://www.mof.go.jp/jgbs/reference/interest_rate/jgbcm.csv',
]


def finite(value):
    import math
    result = float(str(value).strip().replace(',', ''))
    if not math.isfinite(result):
        raise ValueError('來源包含非有限數值')
    return result


def month_end(value):
    year, month = map(int, value[:7].split('-'))
    return date(year, month, calendar.monthrange(year, month)[1]).isoformat()


def parse_food(raw):
    levels = {}
    for row in csv.DictReader(io.StringIO(raw)):
        value = row.get('CPIUFDNS')
        if value in ('', '.', None):
            continue
        day = row.get('observation_date') or row.get('DATE')
        date.fromisoformat(day)
        value = finite(value)
        if value <= 0:
            raise ValueError('CPI 指數必須大於零')
        levels[day[:7]] = value
    points = []
    for month, value in sorted(levels.items()):
        previous = f'{int(month[:4])-1}{month[4:]}'
        if previous in levels:
            points.append({'date': month_end(month), 'label': month,
                           'value': round((value / levels[previous] - 1) * 100, 6),
                           'index': value, 'yearAgoIndex': levels[previous]})
    if not points:
        raise ValueError('食品 CPI 缺少同月前一年可比較資料')
    return points


def food(download):
    return {'points': parse_food(download(FOOD_URL).decode('utf-8-sig')), 'unit': '%',
            'source': 'BLS 美國食品 CPI（FRED CPIUFDNS）', 'sourceUrl': 'https://fred.stlouisfed.org/series/CPIUFDNS',
            'definition': '美國城市消費者食品 CPI，未季調指數，包含在家及外食食品；當月指數 ÷ 去年同月指數減 1，再乘 100%。不是整體 CPI，也不是月增率。',
            'frequency': '每月', 'periodType': 'monthly'}


def japanese_day(text):
    text = text.strip().replace('\ufeff', '')
    match = re.fullmatch(r'(令和|平成|昭和|R|H|S)\s*(\d+)[./年](\d+)[./月](\d+)日?', text, re.I)
    if match:
        era, year, month, day = match.groups()
        offset = {'令和': 2018, '平成': 1988, '昭和': 1925, 'R': 2018, 'H': 1988, 'S': 1925}[era.upper()]
        return date(offset + int(year), int(month), int(day)).isoformat()
    match = re.fullmatch(r'(\d{4})[-/ .](\d{1,2})[-/ .](\d{1,2})', text)
    if not match:
        raise ValueError('日期格式不符')
    return date(*map(int, match.groups())).isoformat()


def parse_japan(raw):
    rows = list(csv.reader(io.StringIO(raw)))
    column, header = None, None
    for index, row in enumerate(rows):
        for n, cell in enumerate(row):
            clean = re.sub(r'[\s\-]', '', cell).lower().replace('\ufeff', '')
            if clean in ('10年', '10年債', '10y', '10year', '10years'):
                column, header = n, index
                break
        if column is not None:
            break
    if column is None:
        raise ValueError('無法辨識日本財務省十年期欄位；表頭：' + str(rows[:3])[:240])
    points = {}
    for row in rows[header+1:]:
        if len(row) <= column or row[column].strip() in ('', '-', '--', '.', 'N/A'):
            continue
        try:
            day = japanese_day(row[0])
        except ValueError:
            continue  # Notes and repeated headers, never interpreted as observations.
        value = finite(row[column])
        if not -10 <= value <= 100:
            raise ValueError('日本十年期殖利率超出合理單位範圍')
        points[day] = {'date': day, 'label': day, 'value': value}
    if not points:
        raise ValueError('日本財務省未提供有效的十年期殖利率')
    return [points[k] for k in sorted(points)]


def japan(download):
    errors = []
    for url in MOF_URLS:
        try:
            raw = download(url)
            try:
                text = raw.decode('utf-8-sig')
            except UnicodeDecodeError:
                text = raw.decode('cp932')
            points = parse_japan(text)
            cutoff = f'{date.today().year-5}-01-01'
            return {'points': [p for p in points if p['date'] >= cutoff], 'unit': '%',
                    'source': '日本財務省 · 國債金利情報',
                    'sourceUrl': 'https://www.mof.go.jp/english/policy/jgbs/reference/interest_rate/index.htm',
                    'definition': '日本財務省十年期固定期限國債殖利率，年率百分比；為市場殖利率指標，非政府全部國債的平均付息成本，也非新債單次標售利率。',
                    'frequency': '每日（日本營業日）', 'periodType': 'daily'}
        except Exception as exc:
            errors.append(str(exc))
    raise ValueError('日本財務省來源失敗：' + '；'.join(errors)[:480])


def parse_spread(raw):
    countries = {'FR': {}, 'DE': {}}
    for row in csv.DictReader(io.StringIO(raw)):
        area, month = row.get('REF_AREA'), row.get('TIME_PERIOD', '')
        if area not in countries or not re.fullmatch(r'\d{4}-\d{2}', month):
            continue
        if row.get('OBS_VALUE') in ('', '.', None):
            continue
        if row.get('UNIT_MULT') not in (None, '', '0'):
            raise ValueError('ECB 利率倍率不符，不能直接計算利差')
        value = finite(row['OBS_VALUE'])
        if month in countries[area] and countries[area][month] != value:
            raise ValueError('ECB 同月同國資料衝突')
        countries[area][month] = value
    common = sorted(countries['FR'].keys() & countries['DE'].keys())
    if not common:
        raise ValueError('ECB 缺少法德同月可比較利率；欄位或資料格式不符')
    return [{'date': month_end(m), 'label': m,
             'value': round((countries['FR'][m] - countries['DE'][m]) * 100, 6),
             'franceYield': countries['FR'][m], 'germanyYield': countries['DE'][m]} for m in common]


def spread(download):
    return {'points': parse_spread(download(ECB_URL).decode('utf-8-sig')), 'unit': '基點',
            'source': 'ECB · 各國趨同標準長期利率（IRS）', 'sourceUrl': ECB_URL,
            'definition': 'ECB 趨同標準十年期長期利率月資料：法國年率百分比減德國同期年率百分比，再乘 100 轉為基點；100 基點等於 1 個百分點。兩國使用相同月份與資料系列，不混用單日或不同期限。',
            'frequency': '每月（月平均口徑）', 'periodType': 'monthly'}


def cash_quarters(records, today=None):
    today = today or date.today().isoformat()
    periods = {}
    for r in records:
        if r.get('form') not in ('10-Q', '10-K', '10-Q/A', '10-K/A'):
            continue
        start, end, filed = r.get('start', ''), r.get('end', ''), r.get('filed', '')
        if not start or not end or not filed or end > today or filed > today:
            continue
        days = (date.fromisoformat(end) - date.fromisoformat(start)).days + 1
        if not 55 <= days <= 380:
            continue
        key = start, end
        item = {'start': start, 'end': end, 'filed': filed, 'accn': r.get('accn', ''), 'value': finite(r['val'])}
        if key not in periods or (filed, item['accn']) > (periods[key]['filed'], periods[key]['accn']):
            periods[key] = item
    quarters = {}
    for (start, end), current in sorted(periods.items()):
        days = (date.fromisoformat(end) - date.fromisoformat(start)).days + 1
        if days <= 125:
            candidate = dict(current)
        else:
            previous = [v for (s, e), v in periods.items() if s == start and e < end
                        and 55 <= (date.fromisoformat(end) - date.fromisoformat(e)).days <= 125]
            if not previous:
                continue
            before = max(previous, key=lambda v: v['end'])
            candidate = {**current, 'start': (date.fromisoformat(before['end']) + timedelta(days=1)).isoformat(),
                         'value': current['value'] - before['value']}
        if end not in quarters or (candidate['filed'], candidate['start']) > (quarters[end]['filed'], quarters[end]['start']):
            quarters[end] = candidate
    return quarters


def parse_company(data, today=None):
    facts = data.get('facts', {}).get('us-gaap', {})
    try:
        capex = cash_quarters(facts['PaymentsToAcquirePropertyPlantAndEquipment']['units']['USD'], today)
        operating = cash_quarters(facts['NetCashProvidedByUsedInOperatingActivities']['units']['USD'], today)
    except KeyError as exc:
        raise ValueError('SEC 缺少統一現金流欄位：' + str(exc)) from exc
    dates = sorted(capex.keys() & operating.keys())
    quarters = []
    for end in dates:
        if capex[end]['start'] != operating[end]['start']:
            continue
        if capex[end]['value'] < 0:
            raise ValueError('設備現金支出差分為負，需核對財報重編')
        quarters.append({'start': capex[end]['start'], 'end': end,
                         'capex': capex[end]['value'], 'operating': operating[end]['value'],
                         'accn': operating[end]['accn']})
    points = []
    for n in range(3, len(quarters)):
        window = quarters[n-3:n+1]
        if any(date.fromisoformat(b['start']) != date.fromisoformat(a['end']) + timedelta(days=1)
               for a, b in zip(window, window[1:])):
            continue
        days = (date.fromisoformat(window[-1]['end']) - date.fromisoformat(window[0]['start'])).days + 1
        if not 350 <= days <= 380:
            continue
        numerator = sum(p['capex'] for p in window)
        denominator = sum(p['operating'] for p in window)
        if denominator <= 0:
            if n == len(quarters)-1:
                raise ValueError('最新近四季營業現金流不為正，比例不適合直接比較')
            continue
        end = window[-1]['end']
        if end >= '2018-01-01':
            points.append({'date': end, 'label': '近4季截至 ' + end,
                           'value': round(numerator / denominator * 100, 6),
                           'capitalExpenditureUSD': numerator, 'operatingCashFlowUSD': denominator,
                           'freeCashFlowUSD': denominator - numerator, 'periodStart': window[0]['start'],
                           'filingAccession': window[-1]['accn']})
    if not points:
        raise ValueError('SEC 缺少連續四季可比較現金流；未以缺季或預估資料補齊')
    return points


def company(download, key):
    name, cik = COMPANIES[key]
    data = json.loads(download('https://data.sec.gov/api/xbrl/companyfacts/CIK' + cik + '.json'))
    if str(data.get('cik', '')).lstrip('0') != cik.lstrip('0'):
        raise ValueError('SEC 公司代碼不符')
    return {'points': parse_company(data), 'unit': '%', 'source': name + ' · SEC XBRL 公司財報',
            'sourceUrl': 'https://www.sec.gov/edgar/browse/?CIK=' + str(int(cik)),
            'definition': name + '近連續四季現金購置不動產、廠房及設備支出合計 ÷ 同期營業現金流合計 × 100%。以 SEC us-gaap 現金流量表累計差分成單季，再加總四季；不含非現金租賃添置，不採公司自行調整的資本支出數字。不是全部 AI 投資，也不是單季比例平均。',
            'frequency': '每季（近四季合計）', 'periodType': 'quarterly'}
