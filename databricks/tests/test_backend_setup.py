"""Offline checks for the notebook's pure validation helpers. No Databricks calls."""
import ast
import math
from pathlib import Path
import re
import unittest

NOTEBOOK = Path(__file__).resolve().parents[1] / '09_backend_data_access.py'
source = NOTEBOOK.read_text()
module = ast.parse(source)
helpers = ast.Module(body=[node for node in module.body if isinstance(node, ast.FunctionDef) and node.name in {'identifier', 'normalized_vector'}], type_ignores=[])
namespace = {'re': re, 'math': math}
exec(compile(helpers, str(NOTEBOOK), 'exec'), namespace)
identifier = namespace['identifier']
normalized_vector = namespace['normalized_vector']


class BackendSetupTests(unittest.TestCase):
    def test_sql_identifiers_reject_injection_and_wrong_arity(self):
        self.assertEqual(identifier('main.procurement_demo_gold.rag_chunks'), '`main`.`procurement_demo_gold`.`rag_chunks`')
        self.assertEqual(identifier('main.procurement_demo_gold', 2), '`main`.`procurement_demo_gold`')
        for value in ['main.schema.table; DROP TABLE other', 'main.schema', 'main.schema.`table`', 'https://workspace/table', 'main..table']:
            with self.assertRaises(ValueError):
                identifier(value)

    def test_query_vectors_keep_cosine_scale_and_reject_bad_responses(self):
        self.assertEqual(normalized_vector({'data': [{'index': 0, 'embedding': [3, 4]}]}, 2), [0.6, 0.8])
        for response in [
            {}, {'data': [{'index': 1, 'embedding': [3, 4]}]},
            {'data': [{'index': 0, 'embedding': [3]}]},
            {'data': [{'index': 0, 'embedding': [0, 0]}]},
            {'data': [{'index': 0, 'embedding': [float('nan'), 4]}]},
            {'data': [{'index': 0, 'embedding': [True, 4]}]},
        ]:
            with self.assertRaises(ValueError):
                normalized_vector(response, 2)

    def test_inspect_defaults_do_not_run_provisioning_or_query_checks(self):
        # Guard cloud resource mutations and paid query checks behind the documented flags.
        self.assertIn("widget('apply_setup', 'false')", source)
        self.assertIn("widget('run_access_checks', 'false')", source)
        parents = {}
        for parent in ast.walk(module):
            for child in ast.iter_child_nodes(parent):
                parents[child] = parent
        for node in ast.walk(module):
            if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
                continue
            if node.func.attr != 'do' or not node.args or not isinstance(node.args[0], ast.Constant) or node.args[0].value != 'POST':
                continue
            ancestor = node
            gated = False
            while ancestor in parents:
                ancestor = parents[ancestor]
                if isinstance(ancestor, ast.If) and isinstance(ancestor.test, ast.Name) and ancestor.test.id in {'APPLY', 'VERIFY'}:
                    gated = True
            self.assertTrue(gated, 'Every paid/provisioning POST needs an explicit notebook flag.')


if __name__ == '__main__':
    unittest.main()
