import asyncio
import unittest
from unittest.mock import MagicMock, AsyncMock, patch
import sys
import logging

# Mock fastapi and other missing dependencies before importing app
mock_fastapi = MagicMock()
sys.modules["fastapi"] = mock_fastapi
sys.modules["fastapi.templating"] = MagicMock()
sys.modules["fastapi.responses"] = MagicMock()

# Now we can safely import app
import app

class TestBotInitializationFailure(unittest.IsolatedAsyncioTestCase):
    """
    Test suite for verifying that the Gemini Bot initialization failure
    is correctly handled in app.py.
    """

    async def asyncSetUp(self):
        # Reset the global bot instance before each test
        app.bot = None

    @patch("app.GeminiBot")
    async def test_get_bot_initialization_failure(self, MockBot):
        """
        Verify that get_bot() raises the correct exception and doesn't
        persist a broken bot instance when initialization fails.
        """
        # Configure the mock to simulate an initialization error
        instance = MockBot.return_value
        instance.initialize = AsyncMock(side_effect=Exception("Simulated Connection Error"))

        # 1. Assert that the customized Exception is raised
        with self.assertRaises(Exception) as cm:
            await app.get_bot()

        expected_error = "Failed to initialize bot. Ensure Chrome profile path is valid."
        self.assertEqual(str(cm.exception), expected_error)

        # 2. Verify that the global bot remains None on failure
        self.assertIsNone(app.bot, "Global bot should remain None if initialization fails.")

    @patch("app.GeminiBot")
    async def test_get_bot_initialization_success(self, MockBot):
        """
        Verify that get_bot() correctly initializes and returns the bot on success.
        """
        # Configure the mock for success
        instance = MockBot.return_value
        instance.initialize = AsyncMock()

        bot = await app.get_bot()

        # 1. Verify initialization was called
        instance.initialize.assert_awaited_once()

        # 2. Verify the global bot is now set
        self.assertIsNotNone(app.bot)
        self.assertEqual(bot, instance)

if __name__ == "__main__":
    unittest.main()
