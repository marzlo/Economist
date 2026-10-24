import concurrent.futures,json,urllib.request
from pathlib import Path
URLS={
 'sec':'https://data.sec.gov/api/xbrl/companyfacts/CIK0001046179.json',
 'diesel':'https://fred.stlouisfed.org/graph/fredgraph.csv?id=GASDESW',
 'treasury':'https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v1/accounting/mts/mts_table_3?sort=-record_date&page%5Bsize%5D=80',
 'twse_income':'https://openapi.twse.com.tw/v1/opendata/t187ap06_L_ci',
 'twse_cash':'https://openapi.twse.com.tw/v1/opendata/t187ap08_L_ci',
}
def get(pair):
 name,url=pair
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Economist reading tracker contact https://github.com/marzlo/Economist','Accept':'application/json,text/csv,*/*'})
  raw=urllib.request.urlopen(req,timeout=40).read().decode('utf-8-sig')
  if name=='diesel':return name,{'sample':raw[:400],'tail':raw[-400:]}
  data=json.loads(raw)
  if name=='sec':
   facts=data['facts'];return name,{ns:{tag:{'label':v.get('label'),'units':{u:a[-5:] for u,a in v['units'].items()}} for tag,v in tags.items() if any(t in tag.lower() for t in ['revenue','propertyplant','capitalexpend'])} for ns,tags in facts.items()}
  if name.startswith('twse'):return name,[r for r in data if '2330' in r.values()]
  return name,data
 except Exception as e:return name,{'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=5) as p:results=dict(p.map(get,URLS.items()))
Path('_observations').mkdir(exist_ok=True)
Path('_observations/source-check.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
for k,v in results.items():print(k, 'failed' if isinstance(v,dict) and 'error' in v else 'received')
