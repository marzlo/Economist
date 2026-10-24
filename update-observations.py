"""Fetch free public time series. Each source fails independently; never erase history."""
import concurrent.futures
import csv
import io
import json
import math
import re
import calendar
from html.parser import HTMLParser
import os
import time
import urllib.parse
import urllib.request
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEST = ROOT / 'dist' / 'observations.json'
DIESEL = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=GASDESW'
TREASURY = 'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_9'
UA = 'Economist reading tracker (https://github.com/marzlo/Economist)'


def download(url):
    error = None
    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept': '*/*'})
            with urllib.request.urlopen(req, timeout=35) as response:
                return response.read()
        except Exception as exc:
            error = exc
            if attempt < 2:
                time.sleep(attempt + 1)
    raise RuntimeError('公開來源暫時無法取得：' + str(error))


def number(value):
    result = float(str(value).replace(',', ''))
    if not math.isfinite(result):
        raise ValueError('資料包含無效數值')
    return result


def parse_diesel(raw):
    points = []
    for row in csv.DictReader(io.StringIO(raw)):
        if row.get('GASDESW') in ('', '.', None):
            continue
        day = row.get('observation_date') or row.get('DATE')
        date.fromisoformat(day)
        value = number(row['GASDESW'])
        if value <= 0:
            raise ValueError('柴油價格必須大於零')
        points.append({'date': day, 'label': day, 'value': value})
    if not points:
        raise ValueError('柴油來源未提供有效資料')
    return points


def diesel():
    return {'points': parse_diesel(download(DIESEL).decode('utf-8-sig')), 'unit': 'USD／加侖',
            'source': 'EIA（由 FRED 提供 GASDESW）', 'sourceUrl': 'https://fred.stlouisfed.org/series/GASDESW',
            'definition': 'EIA 全美公路柴油含稅零售價，美元／美制加侖；每週一的統計值。',
            'frequency': '每週', 'periodType': 'weekly'}


def parse_treasury(rows):
    monthly = {}
    for row in rows:
        if row.get('classification_desc', '').strip().lower() != 'net interest':
            continue
        day = row['record_date']
        value = number(row['current_month_rcpt_outly_amt'])
        if day in monthly and monthly[day] != value:
            raise ValueError('同月淨利息資料不一致')
        monthly[day] = value
    dates = sorted(monthly)
    if len(dates) < 12:
        raise ValueError('淨利息資料不足 12 個月')
    points = []
    for end in range(11, len(dates)):
        window = dates[end-11:end+1]
        months = [int(d[:4]) * 12 + int(d[5:7]) for d in window]
        if months[-1] - months[0] != 11:
            raise ValueError('淨利息資料缺月，保留原資料')
        points.append({'date': window[-1], 'label': window[-1][:7],
                       'value': round(sum(monthly[d] for d in window) / 1e9, 6),
                       'monthlyAmountUSD': monthly[window[-1]]})
    return points


def treasury():
    params = urllib.parse.urlencode({'filter': 'classification_desc:eq:Net Interest,record_date:gte:2015-01-01',
                                     'sort': 'record_date', 'page[size]': '1000'})
    url = TREASURY + '?' + params
    data = json.loads(download(url))
    if int(data.get('meta', {}).get('total-pages', 1)) != 1:
        raise ValueError('淨利息 API 分頁增加，需更新抓取方式')
    return {'points': parse_treasury(data['data']), 'unit': '十億美元',
            'source': '美國財政部 MTS Table 9 · Net Interest', 'sourceUrl': url,
            'definition': '聯邦淨利息支出，依 MTS Table 9 每月實際值加總最近連續 12 個月；單位為十億美元，非單月或財政年度累計。',
            'frequency': '每月', 'periodType': 'monthly'}


class ReportRows(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows, self.row, self.cell = [], None, None
    def handle_starttag(self, tag, attrs):
        if tag == 'tr':
            self.row = []
        elif tag in ('td', 'th') and self.row is not None:
            self.cell = []
    def handle_data(self, text):
        if self.cell is not None:
            self.cell.append(text)
    def handle_endtag(self, tag):
        if tag in ('td', 'th') and self.cell is not None:
            if self.row is not None:
                self.row.append(' '.join(self.cell).strip())
            self.cell = None
        elif tag == 'tr' and self.row is not None:
            self.rows.append(self.row)
            self.row = None


def parse_mops(raw, year, quarter):
    if not re.search(r'2330\s+' + str(year) + 'Q' + str(quarter), raw):
        raise ValueError('公開觀測站報表公司或季度不符')
    if not re.search(r'新[臺台]幣仟元|NT\$ thousands', raw):
        raise ValueError('無法確認財報為新臺幣仟元')
    parser = ReportRows()
    parser.feed(raw)
    def financial_row(code, description):
        found = [row for row in parser.rows if row and row[0] == code and description in ' '.join(row[:2])]
        if len(found) != 1:
            raise ValueError('無法唯一辨識財報欄位 ' + code)
        return found[0]
    revenue = financial_row('4000', '營業收入')
    capex = financial_row('B02700', '不動產')
    def amount(cell):
        text = re.sub(r'\s+', '', cell).replace(',', '')
        if re.fullmatch(r'\([0-9.]+\)', text):
            text = '-' + text[1:-1]
        return number(text) * 1000  # report in NT$ thousands
    # Q2/Q3 income statements show current quarter, prior-year quarter,
    # current YTD, prior-year YTD; cash flows are always YTD.
    revenue_ytd = amount(revenue[4 if quarter in (2, 3) else 2])
    capex_ytd = amount(capex[2])
    if revenue_ytd <= 0 or capex_ytd > 0:
        raise ValueError('財報營收或設備購置現金流符號不符')
    return {'revenueYTD': revenue_ytd, 'capexYTD': -capex_ytd}


def quarterly_point(year, quarter, current, previous=None):
    if quarter != 1 and previous is None:
        raise ValueError('缺少同年度前一季累計財報')
    revenue = current['revenueYTD'] - (previous['revenueYTD'] if previous else 0)
    capex = current['capexYTD'] - (previous['capexYTD'] if previous else 0)
    if revenue <= 0 or capex < 0:
        raise ValueError('季度差分為無效營收或負數設備支出')
    month = quarter * 3
    day = date(year, month, calendar.monthrange(year, month)[1]).isoformat()
    return {'date': day, 'label': f'{year} Q{quarter}', 'value': round(capex / revenue * 100, 6),
            'capitalExpenditureTWD': capex, 'revenueTWD': revenue}


def report_url(year, quarter):
    params = urllib.parse.urlencode({'step': 1, 'CO_ID': '2330', 'SYEAR': year, 'SSEASON': quarter, 'REPORT_ID': 'C'})
    return 'https://mopsov.twse.com.tw/server-java/t164sb01?' + params


def tsmc(previous=None):
    rows = json.loads(download('https://openapi.twse.com.tw/v1/opendata/t187ap06_L_ci'))
    rows = [r for r in rows if r.get('公司代號') == '2330']
    if len(rows) != 1:
        raise ValueError('無法唯一辨識台積電最新財報季度')
    year, quarter = int(rows[0]['年度']), int(rows[0]['季別'])
    if year < 1911:
        year += 1911
    if quarter not in (1, 2, 3, 4):
        raise ValueError('財報季度無效')
    # Bootstrap three years; thereafter refresh this and last year so revisions
    # and YTD differencing remain consistent, retaining older archived points.
    start_year = year - (1 if (previous or {}).get('points') else 2)
    points = []
    for y in range(start_year, year + 1):
        prior = None
        for q in range(1, (quarter if y == year else 4) + 1):
            raw = download(report_url(y, q))
            try:
                text = raw.decode('utf-8-sig')
            except UnicodeDecodeError:
                text = raw.decode('cp950')
            current = parse_mops(text, y, q)
            point = quarterly_point(y, q, current, prior)
            point['sourceUrl'] = report_url(y, q)
            points.append(point)
            prior = current
            time.sleep(.3)
    return {'points': points, 'unit': '%', 'source': '公開資訊觀測站 · 台積電合併財報',
            'sourceUrl': report_url(year, quarter),
            'definition': '以財報現金流量表 B02700「取得不動產、廠房及設備」現金支出 ÷ 營業收入合計（4000）× 100%。同年度累計差分成單季，皆為新臺幣；不含無形資產及非現金交易，可能與公司公布的資本預算口徑不同。',
            'frequency': '每季（以公開觀測站申報為準）', 'periodType': 'quarterly'}


def merge_points(old, new, today=None):
    today = today or date.today().isoformat()
    merged = {}
    for point in [*old, *new]:
        day = point['date']
        date.fromisoformat(day)
        if day > today:
            raise ValueError('來源包含未來統計日期')
        number(point['value'])
        merged[day] = point
    return [merged[k] for k in sorted(merged)]


def refresh(old, fetchers, now=None):
    now = now or datetime.now(timezone.utc).isoformat()
    output = {'version': 1, 'checkedAt': now, 'series': dict(old.get('series', {}))}
    def one(pair):
        key, fetch = pair
        previous = output['series'].get(key, {})
        try:
            result = fetch()
            if not result.get('points'):
                raise ValueError('來源未提供有效資料')
            # Do not mix different measurement definitions under the same history.
            if previous.get('definition') and previous['definition'] != result['definition']:
                raise ValueError('資料口徑已改變，需核對後才能更新')
            if previous.get('points') and max(p['date'] for p in result['points']) < max(p['date'] for p in previous['points']):
                raise ValueError('來源最新期間倒退，保留原資料')
            points = merge_points(previous.get('points', []), result['points'])
            return key, {**result, 'points': points, 'checkedAt': now, 'lastSuccess': now, 'error': None}
        except Exception as exc:
            return key, {**previous, 'checkedAt': now, 'error': str(exc)[:600]}
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for key, result in pool.map(one, fetchers.items()):
            output['series'][key] = result
            print(key + ': ' + ('保留舊資料；' + result['error'] if result.get('error') else str(len(result['points'])) + ' 筆'))
    return output


def main():
    old = json.loads(DEST.read_text()) if DEST.exists() else {}
    output = refresh(old, {'diesel': diesel, 'treasury': treasury, 'tsmc': lambda: tsmc(old.get('series', {}).get('tsmc', {}))})
    temp = DEST.with_suffix('.tmp')
    temp.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n')
    os.replace(temp, DEST)


if __name__ == '__main__':
    main()
