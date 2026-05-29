import os
import sys
import unittest

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from scripts import quality_gate  # noqa: E402


class QualityGateTest(unittest.TestCase):
    def test_backend_pytest_env_disables_plugin_autoload(self):
        env = quality_gate.backend_pytest_env({"PYTEST_DISABLE_PLUGIN_AUTOLOAD": "0"})

        self.assertEqual(env["PYTEST_DISABLE_PLUGIN_AUTOLOAD"], "1")

    def test_backend_pytest_command_uses_project_venv_and_backend_tests(self):
        command = quality_gate.backend_pytest_command()

        self.assertTrue(command[0].endswith(("python.exe", "python")))
        self.assertEqual(command[1:4], ["-m", "pytest", "-q"])
        self.assertIn("backend/tests", command[-1].replace("\\", "/"))


if __name__ == "__main__":
    unittest.main()
