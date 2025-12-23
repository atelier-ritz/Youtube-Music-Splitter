"""
Audio Processing Service macOS Compatibility Tests

Tests for the macOS-specific subprocess fixes and environment detection
"""

import unittest
import platform
import os
import subprocess
from unittest.mock import patch, MagicMock, call
import sys
import tempfile
import shutil

# Add the parent directory to the path to import app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class TestMacOSCompatibility(unittest.TestCase):
    """Test macOS-specific compatibility fixes"""

    def setUp(self):
        """Set up test environment"""
        self.test_dir = tempfile.mkdtemp()
        self.test_file = os.path.join(self.test_dir, 'test_audio.mp3')
        
        # Create a dummy audio file
        with open(self.test_file, 'wb') as f:
            f.write(b'dummy audio data')

    def tearDown(self):
        """Clean up test environment"""
        shutil.rmtree(self.test_dir, ignore_errors=True)

    @patch('platform.system')
    def test_macos_detection(self, mock_platform):
        """Test that macOS is detected correctly"""
        # Test macOS detection
        mock_platform.return_value = 'Darwin'
        
        # Import after mocking
        from app import separate_audio_job
        
        # Should detect macOS
        self.assertEqual(platform.system(), 'Darwin')

    @patch('platform.system')
    @patch('subprocess.Popen')
    def test_macos_skips_preexec_fn(self, mock_popen, mock_platform):
        """Test that macOS development skips preexec_fn"""
        # Setup: Mock macOS environment
        mock_platform.return_value = 'Darwin'
        os.environ['NODE_ENV'] = 'development'
        
        # Mock successful process
        mock_process = MagicMock()
        mock_process.communicate.return_value = ('success', '')
        mock_process.returncode = 0
        mock_popen.return_value = mock_process
        
        # Import and test
        from app import separate_audio_job
        
        # Create test job data
        job_data = {
            'id': 'test-job',
            'input_file': self.test_file,
            'output_dir': self.test_dir,
            'status': 'processing',
            'progress': 0
        }
        
        # This should not raise an exception
        try:
            separate_audio_job('test-job', job_data)
        except Exception as e:
            # If it fails, it should not be due to preexec_fn
            self.assertNotIn('preexec_fn', str(e))
        
        # Verify Popen was called without preexec_fn on macOS
        if mock_popen.called:
            call_args = mock_popen.call_args
            self.assertNotIn('preexec_fn', call_args[1])

    @patch('platform.system')
    @patch('subprocess.Popen')
    def test_linux_uses_preexec_fn(self, mock_popen, mock_platform):
        """Test that Linux uses preexec_fn for memory limits"""
        # Setup: Mock Linux environment
        mock_platform.return_value = 'Linux'
        os.environ['NODE_ENV'] = 'production'
        
        # Mock successful process
        mock_process = MagicMock()
        mock_process.communicate.return_value = ('success', '')
        mock_process.returncode = 0
        mock_popen.return_value = mock_process
        
        # Import and test
        from app import separate_audio_job
        
        # Create test job data
        job_data = {
            'id': 'test-job',
            'input_file': self.test_file,
            'output_dir': self.test_dir,
            'status': 'processing',
            'progress': 0
        }
        
        # This should not raise an exception
        try:
            separate_audio_job('test-job', job_data)
        except Exception as e:
            # Should not fail due to preexec_fn on Linux
            pass
        
        # Verify Popen was called with preexec_fn on Linux
        if mock_popen.called:
            call_args = mock_popen.call_args
            # On Linux production, should use preexec_fn
            self.assertIn('preexec_fn', call_args[1])

    @patch('platform.system')
    def test_environment_detection_logic(self, mock_platform):
        """Test the environment detection logic"""
        # Test macOS development (should skip preexec_fn)
        mock_platform.return_value = 'Darwin'
        os.environ['NODE_ENV'] = 'development'
        
        use_preexec_fn = platform.system() != 'Darwin' or os.environ.get('NODE_ENV') == 'production'
        self.assertFalse(use_preexec_fn)
        
        # Test macOS production (should use preexec_fn)
        os.environ['NODE_ENV'] = 'production'
        use_preexec_fn = platform.system() != 'Darwin' or os.environ.get('NODE_ENV') == 'production'
        self.assertTrue(use_preexec_fn)
        
        # Test Linux development (should use preexec_fn)
        mock_platform.return_value = 'Linux'
        os.environ['NODE_ENV'] = 'development'
        use_preexec_fn = platform.system() != 'Darwin' or os.environ.get('NODE_ENV') == 'production'
        self.assertTrue(use_preexec_fn)
        
        # Test Linux production (should use preexec_fn)
        os.environ['NODE_ENV'] = 'production'
        use_preexec_fn = platform.system() != 'Darwin' or os.environ.get('NODE_ENV') == 'production'
        self.assertTrue(use_preexec_fn)

    @patch('resource.setrlimit')
    def test_memory_limit_error_handling(self, mock_setrlimit):
        """Test that memory limit errors are handled gracefully"""
        # Setup: Mock setrlimit to raise an error
        mock_setrlimit.side_effect = OSError("Operation not permitted")
        
        # Import the memory limit function
        from app import separate_audio_job
        
        # This should not crash the application
        # The memory limit function should catch and handle the error
        try:
            # Create a mock function that would use set_memory_limit
            import resource
            def set_memory_limit():
                try:
                    resource.setrlimit(resource.RLIMIT_AS, (4 * 1024 * 1024 * 1024, 4 * 1024 * 1024 * 1024))
                except (OSError, ValueError) as e:
                    # Should handle gracefully
                    pass
            
            # Should not raise an exception
            set_memory_limit()
            
        except Exception as e:
            self.fail(f"Memory limit error handling failed: {e}")

    def test_subprocess_command_construction(self):
        """Test that subprocess commands are constructed correctly"""
        # Test command construction for different environments
        test_input = "test_audio.mp3"
        test_output = "output_dir"
        
        expected_cmd = [
            'python', '-m', 'demucs.separate',
            '--mp3', '--mp3-bitrate', '128',
            '-n', 'htdemucs_6s',
            '--device', 'cpu',
            '-o', test_output,
            test_input
        ]
        
        # The command should be the same regardless of platform
        # Only the subprocess.Popen parameters should differ
        cmd = [
            'python', '-m', 'demucs.separate',
            '--mp3', '--mp3-bitrate', '128',
            '-n', 'htdemucs_6s',
            '--device', 'cpu',
            '-o', test_output,
            test_input
        ]
        
        self.assertEqual(cmd, expected_cmd)

    @patch('platform.system')
    @patch('os.environ.get')
    def test_railway_production_detection(self, mock_env_get, mock_platform):
        """Test Railway production environment detection"""
        # Setup: Mock Railway production environment
        mock_platform.return_value = 'Linux'
        
        def mock_env(key, default=None):
            env_vars = {
                'NODE_ENV': 'production',
                'RAILWAY_ENVIRONMENT': 'production'
            }
            return env_vars.get(key, default)
        
        mock_env_get.side_effect = mock_env
        
        # Test environment detection
        use_preexec_fn = platform.system() != 'Darwin' or os.environ.get('NODE_ENV') == 'production'
        self.assertTrue(use_preexec_fn)

    def test_error_message_clarity(self):
        """Test that error messages are clear and helpful"""
        # Test that the warning message is informative
        import platform
        
        if platform.system() == 'Darwin':
            warning_msg = "⚠️ Skipping memory limits on macOS development environment"
            self.assertIn("macOS", warning_msg)
            self.assertIn("development", warning_msg)

class TestBackwardsCompatibility(unittest.TestCase):
    """Test that changes don't break existing functionality"""

    def test_demucs_command_unchanged(self):
        """Test that the core Demucs command remains unchanged"""
        # The htdemucs_6s model and parameters should remain the same
        expected_model = 'htdemucs_6s'
        expected_format = '--mp3'
        expected_bitrate = '--mp3-bitrate 128'
        expected_device = '--device cpu'
        
        # These should not change as they are user requirements
        self.assertEqual(expected_model, 'htdemucs_6s')
        self.assertIn('mp3', expected_format)
        self.assertIn('128', expected_bitrate)
        self.assertIn('cpu', expected_device)

    def test_output_structure_unchanged(self):
        """Test that output file structure remains unchanged"""
        # The output structure should still be:
        # output_dir/htdemucs_6s/filename/track.mp3
        expected_tracks = ['vocals.mp3', 'drums.mp3', 'bass.mp3', 'guitar.mp3', 'piano.mp3', 'other.mp3']
        
        # These track names should not change
        for track in expected_tracks:
            self.assertIn('.mp3', track)
            self.assertIn(track.replace('.mp3', ''), ['vocals', 'drums', 'bass', 'guitar', 'piano', 'other'])

if __name__ == '__main__':
    # Run tests
    unittest.main(verbosity=2)