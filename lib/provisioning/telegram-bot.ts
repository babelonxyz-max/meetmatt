// Telegram Bot Creation via Telethon
// Automates BotFather interaction to create new bots

import { ProvisioningConfig } from "./types";

export interface TelegramBotConfig {
  name: string;
  username: string;
  description?: string;
  aboutText?: string;
  profilePhoto?: string;
}

export interface CreatedBot {
  token: string;
  username: string;
  botId: number;
}

// BotFather commands for bot creation
const BOTFATHER_USERNAME = "BotFather";

/**
 * Generate a unique bot username based on the agent name
 */
export function generateBotUsername(agentName: string): string {
  // Clean the name: remove special chars, lowercase
  const cleanName = agentName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
  
  // Add timestamp suffix for uniqueness
  const suffix = Date.now().toString(36).slice(-4);
  
  // Bot usernames must end with "bot"
  return `${cleanName}${suffix}_bot`;
}

/**
 * Generate Telethon script for creating a bot via BotFather
 * This script will be executed on the provisioned server
 */
export function generateBotCreationScript(config: TelegramBotConfig): string {
  return `#!/usr/bin/env python3
"""
Telegram Bot Creation Script
Creates a new bot via BotFather using Telethon
"""

import asyncio
import json
import sys
from telethon import TelegramClient, events
from telethon.tl.types import User

# Configuration - these will be injected
API_ID = int(os.environ.get('TELEGRAM_API_ID', ''))
API_HASH = os.environ.get('TELEGRAM_API_HASH', '')
PHONE = os.environ.get('TELEGRAM_PHONE', '')
SESSION_FILE = os.environ.get('TELEGRAM_SESSION', '/home/ubuntu/.telegram_session')

BOT_NAME = "${config.name}"
BOT_USERNAME = "${config.username}"
BOT_DESCRIPTION = "${config.description || 'AI-powered assistant'}"
BOT_ABOUT = "${config.aboutText || 'Created with Meet Matt'}"

async def create_bot():
    """Create a new bot via BotFather"""
    client = TelegramClient(SESSION_FILE, API_ID, API_HASH)
    await client.start(phone=PHONE)
    
    # Find BotFather
    botfather = await client.get_entity('BotFather')
    
    result = {
        "success": False,
        "token": None,
        "username": None,
        "error": None
    }
    
    try:
        # Step 1: Send /newbot command
        await client.send_message(botfather, '/newbot')
        await asyncio.sleep(2)
        
        # Step 2: Send bot name
        await client.send_message(botfather, BOT_NAME)
        await asyncio.sleep(2)
        
        # Step 3: Send bot username
        await client.send_message(botfather, BOT_USERNAME)
        await asyncio.sleep(3)
        
        # Get the response with the token
        messages = await client.get_messages(botfather, limit=5)
        
        for msg in messages:
            if msg.text and 'token' in msg.text.lower():
                # Extract token from message
                # Format: "Use this token to access the HTTP API: 123456:ABC-DEF..."
                lines = msg.text.split('\\n')
                for line in lines:
                    if ':' in line and len(line) > 40:
                        # This looks like a token line
                        parts = line.strip().split()
                        for part in parts:
                            if ':' in part and len(part) > 40:
                                result["token"] = part
                                result["username"] = BOT_USERNAME
                                result["success"] = True
                                break
        
        if result["success"]:
            # Set bot description
            await client.send_message(botfather, '/setdescription')
            await asyncio.sleep(1)
            await client.send_message(botfather, f'@{BOT_USERNAME}')
            await asyncio.sleep(1)
            await client.send_message(botfather, BOT_DESCRIPTION)
            await asyncio.sleep(1)
            
            # Set about text
            await client.send_message(botfather, '/setabouttext')
            await asyncio.sleep(1)
            await client.send_message(botfather, f'@{BOT_USERNAME}')
            await asyncio.sleep(1)
            await client.send_message(botfather, BOT_ABOUT)
        
    except Exception as e:
        result["error"] = str(e)
    
    await client.disconnect()
    
    # Output result as JSON
    print(json.dumps(result))
    return result

if __name__ == "__main__":
    import os
    asyncio.run(create_bot())
`;
}

/**
 * Generate the OpenClaw gateway bot script
 * This runs on the provisioned server and handles messages
 */
export function generateGatewayBotScript(config: ProvisioningConfig): string {
  return `#!/usr/bin/env python3
"""
OpenClaw Gateway Bot
Handles Telegram messages and routes them to OpenClaw
"""

import asyncio
import json
import os
import sys
from datetime import datetime, timedelta
from collections import defaultdict

# Rate limiting storage
message_counts = defaultdict(list)
RATE_LIMIT_WINDOW = 86400  # 24 hours in seconds

# Load limits from config
with open('/home/ubuntu/bot-data/limits.json', 'r') as f:
    LIMITS = json.load(f)

MESSAGES_PER_DAY = LIMITS.get('messagesPerDay', 100)
MAX_CONTEXT_TOKENS = LIMITS.get('maxContextTokens', 8000)
RESPONSE_TIMEOUT = LIMITS.get('responseTimeoutMs', 60000) / 1000

def check_rate_limit(user_id: int) -> tuple[bool, int]:
    """Check if user is within rate limits. Returns (allowed, remaining)"""
    if MESSAGES_PER_DAY == -1:  # Unlimited
        return True, -1
    
    now = datetime.now()
    cutoff = now - timedelta(seconds=RATE_LIMIT_WINDOW)
    
    # Clean old entries
    message_counts[user_id] = [
        ts for ts in message_counts[user_id] 
        if ts > cutoff
    ]
    
    count = len(message_counts[user_id])
    remaining = MESSAGES_PER_DAY - count
    
    if count >= MESSAGES_PER_DAY:
        return False, 0
    
    message_counts[user_id].append(now)
    return True, remaining - 1

async def get_openclaw_response(message: str, user_id: int) -> str:
    """Get response from OpenClaw"""
    try:
        cmd = [
            '/home/ubuntu/.npm-global/bin/openclaw',
            'agent',
            '--session-id', f'user_{user_id}',
            '--message', message,
            '--json'
        ]
        
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            env={
                'PATH': '/home/ubuntu/.npm-global/bin:/usr/local/bin:/usr/bin:/bin',
                'HOME': '/home/ubuntu'
            }
        )
        
        stdout, stderr = await asyncio.wait_for(
            proc.communicate(), 
            timeout=RESPONSE_TIMEOUT
        )
        
        if proc.returncode == 0 and stdout:
            data = json.loads(stdout.decode('utf-8'))
            if 'result' in data and 'payloads' in data['result']:
                payloads = data['result']['payloads']
                if payloads:
                    return payloads[0].get('text', '')
        
        return None
        
    except asyncio.TimeoutError:
        return "Sorry, the request timed out. Please try again."
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return None

# Main bot code will be added when we have the token
print("Gateway bot script generated")
`;
}

/**
 * Sanitize user input to prevent injection attacks
 */
export function sanitizeInput(input: string): string {
  // Remove potential command injection characters
  let sanitized = input
    .replace(/[\\$\`]/g, "")  // Remove shell special chars
    .replace(/<script[^>]*>.*?<\\/script>/gi, "")  // Remove script tags
    .replace(/javascript:/gi, "")  // Remove javascript: URLs
    .trim();
  
  // Limit length
  if (sanitized.length > 4000) {
    sanitized = sanitized.slice(0, 4000);
  }
  
  return sanitized;
}

/**
 * Validate bot username format
 */
export function isValidBotUsername(username: string): boolean {
  // Must be 5-32 chars, alphanumeric + underscore, end with "bot"
  const pattern = /^[a-zA-Z][a-zA-Z0-9_]{3,30}bot$/i;
  return pattern.test(username);
}
