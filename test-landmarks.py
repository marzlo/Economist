import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from PIL import Image
from email.message import Message

spec = importlib.util.spec_from_file_location('landmarks', Path(__file__).with_name('fetch-landmarks.py'))
landmarks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(landmarks)


class Response(io.BytesIO):
    headers = Message()
    headers['Content-Type'] = 'image/png'


class LandmarkTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.folder = self.root / 'dist/landmarks'
        self.folder.mkdir(parents=True)
        (self.folder / 'catalog.json').write_text(json.dumps({'臺北市': {'name': '台北101', 'article': '台北101'}}))
        self.info = {'thumburl': 'https://thumb.wikimedia.org/photo.png', 'url': 'https://upload.wikimedia.org/photo.png',
                     'descriptionurl': 'https://commons.wikimedia.org/wiki/File:Photo.png',
                     'extmetadata': {'LicenseShortName': {'value': 'CC BY-SA 4.0'},
                                     'Artist': {'value': '<a>Photographer</a>'},
                                     'LicenseUrl': {'value': 'https://creativecommons.org/licenses/by-sa/4.0/'}}}

    def api(self, host, **params):
        if host == 'zh.wikipedia.org':
            return {'query': {'pages': {'1': {'pageimage': 'Photo.png'}}}}
        return {'query': {'pages': {'1': {'imageinfo': [self.info]}}}}

    def test_new_thumbnail_host_and_attribution(self):
        buf = io.BytesIO()
        Image.new('RGB', (2000, 1200), 'green').save(buf, 'PNG')
        with patch.object(landmarks, 'ROOT', self.root), patch.object(landmarks, 'api', side_effect=self.api), \
             patch.object(landmarks.urllib.request, 'urlopen', return_value=Response(buf.getvalue())), \
             patch.object(landmarks.time, 'sleep'):
            landmarks.run()
        credit = json.loads((self.folder / 'credits.json').read_text())['臺北市']
        self.assertEqual(credit['author'], 'Photographer')
        self.assertEqual(credit['license'], 'CC BY-SA 4.0')
        with Image.open(self.root / 'dist' / credit['file']) as photo:
            self.assertEqual(photo.format, 'JPEG')
            self.assertLessEqual(photo.width, 1400)

    def test_nonfree_license_is_rejected(self):
        self.info['extmetadata']['LicenseShortName']['value'] = 'All rights reserved'
        with patch.object(landmarks, 'ROOT', self.root), patch.object(landmarks, 'api', side_effect=self.api), \
             patch.object(landmarks.urllib.request, 'urlopen') as request, patch.object(landmarks.time, 'sleep'):
            with self.assertRaises(RuntimeError):
                landmarks.run()
            request.assert_not_called()
        self.assertEqual(json.loads((self.folder / 'credits.json').read_text()), {})

    def test_logos_are_not_used_as_landmark_photographs(self):
        with patch.object(landmarks, 'ROOT', self.root), \
             patch.object(landmarks, 'api', return_value={'query': {'pages': {'1': {'pageimage': 'logo.svg'}}}}), \
             patch.object(landmarks.time, 'sleep'):
            with self.assertRaises(RuntimeError):
                landmarks.run()
        self.assertIn('標誌', json.loads((self.folder / 'fetch-report.json').read_text())['臺北市'])


if __name__ == '__main__':
    unittest.main()
