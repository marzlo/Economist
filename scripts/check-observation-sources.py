import concurrent.futures,json,urllib.request
from pathlib import Path
URLS={
 'html_mops':'https://mopsov.twse.com.tw/server-java/t164sb01?step=1&CO_ID=2330&SYEAR=2026&SSEASON=2&REPORT_ID=C',
 'html_tsmc':'https://pr.tsmc.com/english/news',
 'html_stock':'https://stockanalysis.com/stocks/tsm/financials/cash-flow/?p=quarterly',
 'html_yahoo':'https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/TSM?type=quarterlyCapitalExpenditure,quarterlyTotalRevenue&period1=1577836800&period2=1792886400',
 'swagger':'https://openapi.twse.com.tw/v1/swagger.json',
}

def get(pair):
 name,url=pair
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Economist reading tracker contact https://github.com/marzlo/Economist','Accept':'application/json,text/csv,*/*'})
  raw=urllib.request.urlopen(req,timeout=40).read().decode('utf-8-sig')
  if name.startswith('html_'):
   import re
   return name,{'links':re.findall(r'href=[\"\']([^\"\']+)',raw),'text':re.sub('<[^>]+>',' ',raw)[:100000]}
  if name=='diesel':return name,{'sample':raw[:400],'tail':raw[-400:]}
  data=json.loads(raw)
  if name=='swagger':return name,{k:v for k,v in data.get('paths',{}).items() if any(t in str(v) for t in ['現金','財務','財報','資本'])}
  if name=='sec':
   facts=data['facts'];return name,{ns:{tag:{'label':v.get('label'),'units':{u:a[-5:] for u,a in v['units'].items()}} for tag,v in tags.items() if any(t in tag.lower() for t in ['revenue','propertyplant','capitalexpend'])} for ns,tags in facts.items()}
  if name.startswith('twse'):return name,[r for r in data if '2330' in r.values()]
  return name,data
 except Exception as e:return name,{'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as p:results=dict(p.map(get,URLS.items()))
Path('_observations').mkdir(exist_ok=True)
Path('_observations/source-check.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
for k,v in results.items():print(k, 'failed' if isinstance(v,dict) and 'error' in v else 'received')
