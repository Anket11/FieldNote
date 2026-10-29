"""Offline tests for Bronze request URL recovery; no Databricks execution."""
import ast
import collections
import json
from pathlib import Path
import tempfile
import unittest
from urllib.parse import urlsplit

source = Path(__file__).resolve().parents[1] / '01_inventory_validation.py'
module = ast.parse(source.read_text())
helpers = ast.Module(body=[node for node in module.body if isinstance(node, ast.FunctionDef) and node.name == 'recorded_source_urls'], type_ignores=[])
namespace = {'collections': collections, 'json': json, 'Path': Path, 'urlsplit': urlsplit}
exec(compile(helpers, str(source), 'exec'), namespace)
recorded_source_urls = namespace['recorded_source_urls']


class InventoryURLTests(unittest.TestCase):
    def test_exact_paths_deduplicate_and_keep_conflicts_explicit(self):
        with tempfile.TemporaryDirectory() as folder:
            run = Path(folder) / '_runs' / 'run1'
            run.mkdir(parents=True)
            path = '/Volumes/main/raw/projects/P1/structured_data/contracts/run1/page_00000.json'
            url = 'https://search.worldbank.org/api/contractdata?projectid=P1'
            (run / 'source_pages.json').write_text(json.dumps([
                {'bronze_path': path, 'url': url},
                {'bronze_path': 'dbfs:' + path, 'url': url},
                {'bronze_path': path + '-other', 'url': 'javascript:alert(1)'},
                {'bronze_path': path + '-conflict', 'url': url},
                {'bronze_path': path + '-conflict', 'url': url + '&rows=1'},
            ]))
            urls = recorded_source_urls(folder)
            self.assertEqual(urls[path], {url})
            self.assertNotIn(path + '-other', urls)
            self.assertEqual(len(urls[path + '-conflict']), 2)
            self.assertNotIn(path.replace('P1', 'P2'), urls)

    def test_missing_or_malformed_logs_do_not_invent_urls(self):
        with tempfile.TemporaryDirectory() as folder:
            self.assertEqual(dict(recorded_source_urls(folder)), {})
            run = Path(folder) / '_runs' / 'run1'
            run.mkdir(parents=True)
            (run / 'source_pages.json').write_text('{}')
            with self.assertRaises(ValueError):
                recorded_source_urls(folder)


if __name__ == '__main__':
    unittest.main()
