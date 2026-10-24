import copy
import importlib.util
import json
import unittest
from datetime import date
from pathlib import Path

spec = importlib.util.spec_from_file_location('observations', Path(__file__).with_name('update-observations.py'))
M = importlib.util.module_from_spec(spec)
spec.loader.exec_module(M)


def financials(year=2025, quarter=2, revenue=200, capex=-60):
    return f'''<title>2330 {year}Q{quarter} Financial report</title><p>單位：新臺幣仟元</p>
    <table><tr><td>4000</td><td>營業收入合計</td><td>100</td><td>80</td><td>{revenue}</td><td>160</td></tr>
    <tr><td>B02700</td><td>取得不動產、廠房及設備</td><td>({abs(capex)})</td><td>(40)</td></tr></table>'''


class Observations(unittest.TestCase):
    def test_diesel_missing_and_precision(self):
        points = M.parse_diesel('observation_date,GASDESW\n2025-01-06,3.503\n2025-01-13,.\n')
        self.assertEqual(points, [{'date': '2025-01-06', 'label': '2025-01-06', 'value': 3.503}])
        for value in ['nan', '-3', '0', 'inf']:
            with self.assertRaises(ValueError):
                M.parse_diesel('DATE,GASDESW\n2025-01-06,' + value + '\n')

    def test_tsmc_ytd_differencing_and_unit(self):
        current = M.parse_mops(financials(), 2025, 2)
        self.assertEqual(current, {'revenueYTD': 200000, 'capexYTD': 60000})
        previous = {'revenueYTD': 100000, 'capexYTD': 20000}
        self.assertEqual(M.quarterly_point(2025, 2, current, previous)['value'], 40)
        self.assertEqual(M.quarterly_point(2025, 1, previous)['value'], 20)
        for raw in [financials(year=2024), financials().replace('新臺幣仟元', '美元'), financials().replace('B02700', 'B02800')]:
            with self.assertRaises(ValueError):
                M.parse_mops(raw, 2025, 2)
        with self.assertRaises(ValueError):
            M.quarterly_point(2025, 2, current)
        with self.assertRaises(ValueError):
            M.quarterly_point(2025, 2, current, {'revenueYTD': 300000, 'capexYTD': 20000})
        q4 = M.parse_mops(financials(quarter=4), 2025, 4)
        self.assertEqual(q4['revenueYTD'], 100000)

    def test_interest_share_uses_matching_12_month_sums(self):
        rows = []
        for m in range(1, 13):
            for code, label, seq, value in [('320', 'Net Interest', '2.18', m * 1e9), ('120', 'Total', '1.8', m * 10e9), ('340', 'Total', '2.20', 999999999999)]:
                rows.append({'line_code_nbr': code, 'classification_desc': label, 'sequence_number_cd': seq,
                             'record_date': f'2024-{m:02d}-28', 'current_month_rcpt_outly_amt': str(value),
                             'current_fytd_rcpt_outly_amt': '999999999999'})
        point = M.parse_treasury(rows)[0]
        self.assertEqual(point['value'], 10)
        self.assertEqual(point['netInterestUSD'], 78e9)
        self.assertEqual(point['receiptsUSD'], 780e9)
        # The required ratio is of sums, not a simple average of monthly ratios.
        varied = copy.deepcopy(rows)
        next(r for r in varied if r['line_code_nbr'] == '120')['current_month_rcpt_outly_amt'] = '100000000000'
        self.assertAlmostEqual(M.parse_treasury(varied)[0]['value'], 78 / 870 * 100, places=6)
        missing = [r for r in rows if not (r['line_code_nbr'] == '120' and r['record_date'] == '2024-06-28')]
        with self.assertRaises(ValueError):
            M.parse_treasury(missing)
        gap = [r for r in rows if r['record_date'] != '2024-06-28']
        with self.assertRaises(ValueError):
            M.parse_treasury(gap)
        zero = copy.deepcopy(rows)
        for r in zero:
            if r['line_code_nbr'] == '120':
                r['current_month_rcpt_outly_amt'] = '0'
        with self.assertRaises(ValueError):
            M.parse_treasury(zero)

    def test_merge_preserves_history_and_revisions(self):
        self.assertEqual(M.merge_points([{'date': '2024-01-01', 'value': 3}], [{'date': '2024-01-01', 'value': 4}, {'date': '2024-02-01', 'value': 5}]),
                         [{'date': '2024-01-01', 'value': 4}, {'date': '2024-02-01', 'value': 5}])
        with self.assertRaises(ValueError):
            M.merge_points([], [{'date': '2099-01-01', 'value': 5}])

    def test_independent_failure_keeps_old_value_and_success_time(self):
        old = {'series': {'a': {'definition': 'same', 'points': [{'date': '2024-01-01', 'value': 1}], 'lastSuccess': 'yesterday'}}}
        before = copy.deepcopy(old)
        def fail():
            raise RuntimeError('offline')
        out = M.refresh(old, {'a': fail, 'b': lambda: {'definition': 'new', 'points': [{'date': '2024-02-01', 'value': 2}]}}, 'now')
        self.assertEqual(old, before)
        self.assertEqual(out['series']['a']['points'], old['series']['a']['points'])
        self.assertEqual(out['series']['a']['lastSuccess'], 'yesterday')
        self.assertIn('offline', out['series']['a']['error'])
        self.assertEqual(out['series']['b']['lastSuccess'], 'now')

    def test_definition_change_is_not_silently_merged(self):
        out = M.refresh({'series': {'a': {'definition': 'annual', 'points': [{'date': '2024-01-01', 'value': 1}]}}},
                        {'a': lambda: {'definition': 'quarterly', 'points': [{'date': '2024-02-01', 'value': 3}]}}, 'now')
        self.assertEqual(out['series']['a']['points'][0]['value'], 1)
        self.assertIn('口徑', out['series']['a']['error'])


if __name__ == '__main__':
    unittest.main()
