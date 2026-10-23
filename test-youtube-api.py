import importlib.util
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
import urllib.error
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('api', Path(__file__).with_name('fetch-youtube-api.py'))
api = importlib.util.module_from_spec(spec)
spec.loader.exec_module(api)


class ApiTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        (self.root / 'dist').mkdir()
        self.path = self.root / 'dist/videos.json'
        self.old = {'updated': 'old', 'videos': [{'id': 'old', 'published': '2026-10-01T00:00:00Z', 'description': 'retain'}]}
        self.path.write_text(json.dumps(self.old))
        self.before = self.path.read_bytes()
        self.responses = [
            {'items': [{'contentDetails': {'relatedPlaylists': {'uploads': 'uploads'}}}]},
            {'items': [{'contentDetails': {'videoId': 'new'}}]},
            {'items': [{'id': 'new', 'snippet': {'channelId': api.CHANNEL, 'title': 'AI 新片',
                'description': '00:00 Intro\n01:00 Chapter', 'publishedAt': '2026-10-23T01:00:00Z',
                'thumbnails': {'high': {'url': 'https://example.com/image.jpg'}}}}]}]

    def run_mock(self):
        with patch.object(api, 'ROOT', self.root), patch.dict(os.environ, {'YOUTUBE_API_KEY': 'test-only'}):
            with patch.object(api, 'request', side_effect=self.responses) as req:
                api.run()
                return req

    def test_update_preserves_archive_and_chapters(self):
        req = self.run_mock()
        result = json.loads(self.path.read_text())
        self.assertEqual([v['id'] for v in result['videos']], ['new', 'old'])
        self.assertEqual(result['videos'][1], self.old['videos'][0])
        self.assertIn('01:00 Chapter', result['videos'][0]['description'])
        self.assertEqual(result['videos'][0]['category'], '科技與 AI')
        self.assertEqual(req.call_count, 3)

    def test_empty_result_leaves_original_untouched(self):
        self.responses[2] = {'items': []}
        with self.assertRaisesRegex(RuntimeError, '未回傳可用影片'):
            self.run_mock()
        self.assertEqual(self.path.read_bytes(), self.before)

    def test_wrong_channel_leaves_original_untouched(self):
        self.responses[2]['items'][0]['snippet']['channelId'] = 'wrong'
        with self.assertRaisesRegex(RuntimeError, '頻道不符'):
            self.run_mock()
        self.assertEqual(self.path.read_bytes(), self.before)

    def test_missing_key(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaisesRegex(RuntimeError, 'YOUTUBE_API_KEY'):
                api.run()

    def test_http_error_does_not_expose_key(self):
        error = urllib.error.HTTPError('https://example.com', 403, 'Forbidden', {},
            io.BytesIO(b'{"error":{"errors":[{"reason":"quotaExceeded"}]}}'))
        with patch.object(api.urllib.request, 'urlopen', side_effect=error):
            with self.assertRaisesRegex(RuntimeError, 'quotaExceeded') as raised:
                api.request('videos', 'private-test-key', part='snippet')
        self.assertNotIn('private-test-key', str(raised.exception))


if __name__ == '__main__':
    unittest.main()
