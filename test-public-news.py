import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('news', Path(__file__).with_name('update-public-news.py'))
news = importlib.util.module_from_spec(spec)
spec.loader.exec_module(news)


class NewsTests(unittest.TestCase):
    def test_rss_filters_deduplicates_and_keeps_source_and_date(self):
        body = '''<rss><channel>
        <item><title>台北松山機場新消息</title><link>https://example.com/a</link><source>公視</source><pubDate>Sat, 24 Oct 2026 00:00:00 GMT</pubDate></item>
        <item><title>松山機場重複</title><link>https://example.com/a</link></item>
        <item><title>松山機場惡意連結</title><link>javascript:alert(1)</link></item>
        <item><title>其他新聞</title><link>https://example.com/b</link></item>
        </channel></rss>'''
        result = news.parse_feed(body, ['松山機場'])
        self.assertEqual(len(result), 1)
        self.assertEqual(result[0]['source'], '公視')
        self.assertEqual(result[0]['published'], '2026-10-24T00:00:00+00:00')

    def test_invalid_feed_is_error_not_empty_success(self):
        with self.assertRaises(ValueError):
            news.parse_feed('<html>Unavailable</html>', ['松山機場'])

    def test_independent_failures_preserve_previous_results(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'dist').mkdir()
            topics = [{'id': 'a', 'kind': 'civic', 'name': 'a', 'keys': ['a']},
                      {'id': 'b', 'kind': 'civic', 'name': 'b', 'keys': ['b']},
                      {'id': 'c', 'kind': 'civic', 'name': 'c', 'keys': ['c'], 'status': '已結案'}]
            (root / 'issues.json').write_text(json.dumps(topics + [{'id': 'unrelated'}]))
            path = root / 'dist/public-news.json'
            old = {'items': [{'title': 'Saved'}], 'updated': '2026-10-01'}
            path.write_text(json.dumps({'results': {'a': old}}))
            def fetch(topic):
                if topic['id'] == 'a':
                    raise OSError('unavailable')
                return [{'title': 'New'}]
            with patch.object(news, 'ROOT', root), patch.object(news, 'fetch_topic', side_effect=fetch) as mocked:
                news.run()
            result = json.loads(path.read_text())
            self.assertEqual(len(result['topics']), 3)
            self.assertEqual(result['results']['a']['items'], old['items'])
            self.assertEqual(result['results']['a']['updated'], old['updated'])
            self.assertTrue(result['results']['a']['error'])
            self.assertEqual(result['results']['b']['items'][0]['title'], 'New')
            self.assertEqual(mocked.call_count, 2)


if __name__ == '__main__':
    unittest.main()
