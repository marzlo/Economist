import copy
from datetime import date
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
import urllib.error
from unittest.mock import patch

BASE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('weekly', BASE / 'scripts/weekly.py')
weekly = importlib.util.module_from_spec(spec)
spec.loader.exec_module(weekly)


def fixture():
    notes = [
        {'id': 'money-1', 'title': '利率與生活', 'text': '利率變化會影響家庭支出。', 'date': '2026-10-12',
         'statDate': '2026-10-12', 'topics': [{'id': 'economy', 'name': '經濟'}],
         'links': [{'title': '來源一', 'url': 'https://www.youtube.com/watch?v=source1'}]},
        {'id': 'industry-1', 'title': '能源與產業', 'text': '把能源成本與產業政策放在一起觀察。', 'date': '2026-10-15',
         'statDate': '2026-10-15', 'topics': [{'id': 'industry', 'name': '產業'}],
         'links': [{'title': '來源一另一章', 'url': 'https://www.youtube.com/watch?v=source1&t=60s'}]},
        {'id': 'human-1', 'title': '創作與理解', 'text': '我重視創作過程中的理解與探索。', 'date': '2026-10-18',
         'statDate': '2026-10-18', 'topics': [{'id': 'ai', 'name': 'AI'}],
         'links': [{'title': '來源二', 'url': 'https://www.youtube.com/watch?v=source2'}]}
    ]
    chapters = [
        {'id': 'resources', 'name': '資源與生活', 'title': '成本如何影響生活', 'summary': '記事關注利率與能源成本。',
         'observation': '將不同成本並列觀察。', 'question': '如何追蹤成本變化？', 'ids': ['money-1', 'industry-1'],
         'captions': ['利率', '能源', '生活']},
        {'id': 'human', 'name': '創作與理解', 'title': '保留探索的過程', 'summary': '記事表達對理解與探索的重視。',
         'observation': '重視過程。', 'question': '如何記下創作過程？', 'ids': ['human-1'], 'captions': ['創作', '理解']}
    ]
    return notes, {'title': '來源與人的自主', 'subtitle': '測試導讀', 'intro': '依記事測試整理',
                   'chapters': chapters, 'questions': ['接下來怎麼觀察？'],
                   'quote': {'noteId': 'human-1', 'text': '我重視創作過程中的理解與探索。'}}


class WeeklyTests(unittest.TestCase):
    def setUp(self):
        self.notes, self.narrative = fixture()
        self.clock = patch.object(weekly, 'today', return_value=date(2026, 10, 24))
        self.clock.start()
        self.addCleanup(self.clock.stop)

    def test_default_week_is_previous_complete_taipei_week(self):
        self.assertEqual(weekly.selected_week(), date(2026, 10, 12))
        self.assertEqual(weekly.selected_week('2026-10-19'), date(2026, 10, 19))
        with self.assertRaises(ValueError):
            weekly.selected_week('2026-10-20')
        with self.assertRaises(ValueError):
            weekly.selected_week('2026-10-26')

    def test_coverage_quote_and_counts_are_verified(self):
        data = weekly.make_draft(date(2026, 10, 12), self.notes, self.narrative, 'test-fixture')
        self.assertEqual(len(data['notes']), 3)
        self.assertEqual(data['videoCount'], 2)
        self.assertEqual(data['topicCount'], 3)
        self.assertEqual(data['status'], 'draft')
        self.assertEqual([len(c['ids']) for c in data['chapters']], [2, 1])

    def test_missing_and_duplicate_notes_are_rejected(self):
        bad = copy.deepcopy(self.narrative)
        bad['chapters'][0]['ids'].pop()
        with self.assertRaisesRegex(ValueError, '遺漏'):
            weekly.validate_narrative(bad, self.notes)
        bad = copy.deepcopy(self.narrative)
        bad['chapters'][0]['ids'].append(bad['chapters'][1]['ids'][0])
        with self.assertRaisesRegex(ValueError, '重複'):
            weekly.validate_narrative(bad, self.notes)

    def test_rewritten_quote_is_rejected(self):
        bad = copy.deepcopy(self.narrative)
        bad['quote']['text'] = '這不是使用者原話'
        with self.assertRaisesRegex(ValueError, '逐字'):
            weekly.validate_narrative(bad, self.notes)

    def test_outside_week_notes_are_rejected(self):
        with self.assertRaisesRegex(ValueError, '範圍'):
            weekly.make_draft(date(2026, 10, 19), self.notes, self.narrative, 'test-fixture')

    def test_api_failure_never_prints_key(self):
        error = urllib.error.HTTPError('https://api.openai.com/v1/responses', 401, 'Unauthorized', {},
                                      io.BytesIO(b'{"error":{"code":"invalid_api_key"}}'))
        with patch.object(weekly.urllib.request, 'urlopen', side_effect=error):
            with self.assertRaisesRegex(RuntimeError, 'invalid_api_key') as caught:
                weekly.request_narrative(self.notes, 'gpt-5-mini', 'TEST_PRIVATE_SECRET')
        self.assertNotIn('TEST_PRIVATE_SECRET', str(caught.exception))

    def test_empty_week_never_calls_ai(self):
        with patch.object(weekly.subprocess, 'check_output', return_value='[]'), patch.object(weekly, 'request_narrative') as request:
            weekly.generate(date(2026, 10, 12))
            request.assert_not_called()

    def test_bad_model_output_is_retried_then_saved_only_as_draft(self):
        root, before = self.make_root()
        invalid = copy.deepcopy(self.narrative)
        invalid['quote']['text'] = '非原文'
        with patch.object(weekly, 'ROOT', root), patch.object(weekly.subprocess, 'check_output', return_value=json.dumps(self.notes)), \
             patch.dict(weekly.os.environ, {'WEEKLY_AI_API_KEY': 'test-only'}), \
             patch.object(weekly, 'request_narrative', side_effect=[invalid, self.narrative]) as request:
            weekly.generate(date(2026, 10, 12))
        self.assertEqual(request.call_count, 2)
        self.assertEqual((root / 'dist/index.html').read_text(), '<article class="weekly-digest">OLD</article><a class="weekly-date" href="old">old</a>')
        draft = json.loads((root / '_weekly/drafts/2026-10-12.json').read_text())
        self.assertEqual(draft['status'], 'draft')
        self.assertNotEqual(draft['revision'], before['revision'])

    def test_missing_key_preserves_previous_draft(self):
        root, data = self.make_root()
        previous = (root / '_weekly/drafts/2026-10-12.json').read_bytes()
        with patch.object(weekly, 'ROOT', root), patch.object(weekly.subprocess, 'check_output', return_value=json.dumps(self.notes)), \
             patch.dict(weekly.os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, 'WEEKLY_AI_API_KEY'):
                weekly.generate(date(2026, 10, 12))
        self.assertEqual((root / '_weekly/drafts/2026-10-12.json').read_bytes(), previous)

    def make_root(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        root = Path(temp.name)
        (root / 'dist/weekly').mkdir(parents=True)
        (root / 'dist/weekly/template.html').write_text((BASE / 'dist/weekly/template.html').read_text())
        (root / 'dist/index.html').write_text('<article class="weekly-digest">OLD</article><a class="weekly-date" href="old">old</a>')
        weekly.write_json(root / 'dist/weekly/index.json', {'latest': '', 'issues': []})
        data = weekly.make_draft(date(2026, 10, 12), self.notes, self.narrative, 'test-fixture')
        weekly.write_json(root / '_weekly/drafts/2026-10-12.json', data)
        return root, data

    def test_publish_requires_exact_reviewed_revision(self):
        root, data = self.make_root()
        before = (root / 'dist/index.html').read_text()
        with patch.object(weekly, 'ROOT', root):
            with self.assertRaisesRegex(ValueError, '已變更'):
                weekly.publish(date(2026, 10, 12), 'stale-revision')
        self.assertEqual((root / 'dist/index.html').read_text(), before)

    def test_publish_updates_catalog_and_home_only_after_validation(self):
        root, data = self.make_root()
        def fake_pdf(path):
            path.write_bytes(b'%PDF-test-fixture' * 100)
        with patch.object(weekly, 'ROOT', root), patch.object(weekly, 'pdf', side_effect=fake_pdf):
            weekly.publish(date(2026, 10, 12), data['revision'])
        result = json.loads((root / 'dist/weekly/index.json').read_text())
        self.assertEqual(result['latest'], '2026-10-12')
        self.assertIn(data['title'], (root / 'dist/index.html').read_text())
        self.assertTrue((root / '_weekly/published/2026-10-12.json').exists())
        report = (root / 'dist/weekly/2026-10-12/index.html').read_text()
        self.assertIn('const DATA=', report)
        self.assertNotIn('__DATA__', report)

    def test_pdf_failure_preserves_existing_report(self):
        root, data = self.make_root()
        target = root / 'dist/weekly/2026-10-12'
        target.mkdir()
        (target / 'index.html').write_text('Previous approved edition')
        with patch.object(weekly, 'ROOT', root), patch.object(weekly, 'pdf', side_effect=RuntimeError('test failure')):
            with self.assertRaises(RuntimeError):
                weekly.publish(date(2026, 10, 12), data['revision'])
        self.assertEqual((target / 'index.html').read_text(), 'Previous approved edition')
        self.assertEqual(json.loads((root / 'dist/weekly/index.json').read_text())['issues'], [])


if __name__ == '__main__':
    unittest.main()
