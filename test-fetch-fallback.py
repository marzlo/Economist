import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('fallback', Path(__file__).with_name('fetch-fallback.py'))
fallback = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fallback)


class FallbackTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'dist').mkdir()
        self.path = self.root / 'dist/videos.json'
        self.old = {'updated': '2026-10-01', 'videos': [
            {'id': 'old', 'title': 'Existing', 'description': 'Keep me', 'published': '2026-10-01T00:00:00Z'}]}
        self.path.write_text(json.dumps(self.old))
        self.original = self.path.read_bytes()

    def run_feed(self, players):
        def fetch(url, mobile=True):
            if '/channel/' in url:
                return 'var ytInitialData = ' + json.dumps({'contents': [
                    {'videoRenderer': {'videoId': ident}} for ident in players]})
            return 'var ytInitialPlayerResponse = ' + json.dumps(players[url.split('v=')[1]])
        with patch.object(fallback, 'ROOT', self.root), patch.object(fallback, 'fetch', side_effect=fetch):
            fallback.run()

    def test_partial_failure_keeps_archive_and_continues(self):
        self.run_feed({'blocked': {'playabilityStatus': {'status': 'LOGIN_REQUIRED', 'reason': 'Sign in'}},
                       'good': {'videoDetails': {'title': 'New', 'shortDescription': 'Chapters'},
                                'microformat': {'playerMicroformatRenderer': {'publishDate': '2026-10-23'}}}})
        videos = json.loads(self.path.read_text())['videos']
        self.assertEqual([v['id'] for v in videos], ['good', 'old'])
        self.assertEqual(videos[1], self.old['videos'][0])

    def test_all_failed_preserves_file_and_reports_failure(self):
        with self.assertRaisesRegex(RuntimeError, '全部抓取失敗'):
            self.run_feed({'blocked': {'playabilityStatus': {'status': 'LOGIN_REQUIRED'}}})
        self.assertEqual(self.path.read_bytes(), self.original)

    def test_existing_complete_video_is_not_replaced(self):
        self.run_feed({'old': {}})
        self.assertEqual(self.path.read_bytes(), self.original)

    def test_missing_description_is_retried_later(self):
        with self.assertRaises(RuntimeError):
            self.run_feed({'empty': {'videoDetails': {'title': 'Empty'},
                                    'microformat': {'playerMicroformatRenderer': {'publishDate': '2026-10-23'}}}})
        self.assertEqual(self.path.read_bytes(), self.original)

    def test_escaped_slashes_in_embedded_json(self):
        self.assertEqual(fallback.extract(r'''var ytInitialData = '{"url":"https:\/\/example.com"}';''',
                                          'ytInitialData'), {'url': 'https://example.com'})


if __name__ == '__main__':
    unittest.main()
