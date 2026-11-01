import copy
import importlib.util
from datetime import date
from pathlib import Path
import unittest
import observation_sources as S

spec = importlib.util.spec_from_file_location('observations', Path(__file__).with_name('update-observations.py'))
M = importlib.util.module_from_spec(spec)
spec.loader.exec_module(M)


def facts(capex=(20, 40, 60, 80, 60), operating=(100, 200, 300, 400, 150)):
    periods = [('2024-01-01','2024-03-31'),('2024-01-01','2024-06-30'),
               ('2024-01-01','2024-09-30'),('2024-01-01','2024-12-31'),('2025-01-01','2025-03-31')]
    def records(values):
        return [dict(start=s,end=e,val=value,filed='2025-05-01',form='10-K' if i==3 else '10-Q',accn='filing')
                for i,((s,e),value) in enumerate(zip(periods,values))]
    return {'facts':{'us-gaap':{tag:{'units':{'USD':records(values)}} for tag,values in
            [('PaymentsToAcquirePropertyPlantAndEquipment',capex),('NetCashProvidedByUsedInOperatingActivities',operating)]}}}


class PublicSources(unittest.TestCase):
    def test_tsmc_duplicate_periods_choose_latest_not_last_row(self):
        rows=[{'公司代號':'2330','年度':'115','季別':'03'},
              {'公司代號':2330,'年度':'2026','季別':'3'},
              {'公司代號':'2330','年度':'115','季別':'2'},
              {'公司代號':'1234','年度':'115','季別':'4'}]
        self.assertEqual(M.latest_tsmc_period(rows,date(2026,11,1)),(2026,3))
        self.assertEqual(M.latest_tsmc_period(rows,date(2026,8,1)),(2026,2))
        with self.assertRaises(ValueError):M.latest_tsmc_period([],date(2026,11,1))

    def test_food_exact_year_ago_not_previous_available_row(self):
        raw='observation_date,CPIUFDNS\n2023-01-01,100\n2023-03-01,110\n2024-01-01,105\n2024-02-01,108\n2024-03-01,99\n'
        result=S.parse_food(raw)
        self.assertEqual([p['label'] for p in result],['2024-01','2024-03'])
        self.assertEqual(result[0]['value'],5)
        self.assertEqual(result[1]['value'],-10)
        self.assertEqual(S.month_end('2024-02'),'2024-02-29')
        with self.assertRaises(ValueError):S.parse_food('DATE,CPIUFDNS\n2024-01-01,0\n')

    def test_japan_headers_eras_and_negative_yields(self):
        raw='国債金利情報\n基準日,1年,10年,30年\nR6.1.5,0,-0.12,1.8\n2024/1/9,0,0.5,2\nR6.1.10,0,-,2\n'
        result=S.parse_japan(raw)
        self.assertEqual(result,[{'date':'2024-01-05','label':'2024-01-05','value':-.12},
                                 {'date':'2024-01-09','label':'2024-01-09','value':.5}])
        self.assertEqual(S.japanese_day('H31.4.30'),'2019-04-30')
        self.assertEqual(S.japanese_day('2026/01/05'),'2026-01-05')
        with self.assertRaises(ValueError):S.parse_japan('Date,1Y\n2024/1/5,1\n')

    def test_same_month_spread_and_basis_points(self):
        raw='REF_AREA,TIME_PERIOD,OBS_VALUE,UNIT_MULT\nFR,2024-01,3.5,0\nDE,2024-01,2.2,0\nFR,2024-02,3.6,0\n'
        p=S.parse_spread(raw)[0]
        self.assertEqual(p['value'],130)
        self.assertEqual(p['date'],'2024-01-31')
        self.assertEqual(p['franceYield'],3.5)
        with self.assertRaises(ValueError):S.parse_spread(raw+'FR,2024-01,3.7,0\n')
        with self.assertRaises(ValueError):S.parse_spread(raw.replace(',0\n',',2\n'))

    def test_cashflow_ytd_difference_then_ttm_ratio_of_sums(self):
        result=S.parse_company(facts(),today='2025-05-02')
        self.assertEqual(result[0]['value'],20)
        self.assertEqual(result[1]['capitalExpenditureUSD'],120)
        self.assertEqual(result[1]['operatingCashFlowUSD'],450)
        self.assertEqual(result[1]['freeCashFlowUSD'],330)
        self.assertAlmostEqual(result[1]['value'],120/450*100,places=6)
        self.assertEqual(result[1]['periodStart'],'2024-04-01')

    def test_fiscal_year_52_weeks_not_calendar_year(self):
        rows=[dict(start='2023-07-02',end=e,val=v,form='10-Q',filed='2024-08-01') for e,v in
              [('2023-09-30',10),('2023-12-30',30),('2024-03-30',60),('2024-06-29',100)]]
        q=S.cash_quarters(rows,today='2024-09-01')
        self.assertEqual([q[e]['value'] for e in sorted(q)],[10,20,30,40])
        self.assertEqual(q['2024-06-29']['start'],'2024-03-31')

    def test_missing_quarters_and_nonpositive_cashflow_do_not_invent_ratio(self):
        data=facts()
        for tag in data['facts']['us-gaap'].values():del tag['units']['USD'][1]
        with self.assertRaises(ValueError):S.parse_company(data,today='2025-05-02')
        with self.assertRaises(ValueError):S.parse_company(facts(operating=(-100,-200,-300,-400,-150)),today='2025-05-02')
        with self.assertRaises(ValueError):S.parse_company(facts(capex=(20,40,30,80,60)),today='2025-05-02')
        with self.assertRaises(ValueError):S.parse_company(facts(),today='2025-04-30')

    def test_latest_filing_revisions_win_future_filings_ignored(self):
        records=[dict(start='2024-01-01',end='2024-03-31',val=1,form='10-Q',filed='2024-05-01'),
                 dict(start='2024-01-01',end='2024-03-31',val=2,form='10-Q/A',filed='2024-06-01'),
                 dict(start='2024-01-01',end='2024-03-31',val=99,form='10-Q/A',filed='2025-06-01')]
        self.assertEqual(S.cash_quarters(records,today='2025-01-01')['2024-03-31']['value'],2)


if __name__=='__main__':unittest.main()
