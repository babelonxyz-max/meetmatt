// Verification Code System for Meet Matt
// Handles code generation, validation, and user ownership assignment

import { VerificationRequest } from "./types";

// In-memory store for verification codes (would use Redis in production)
const verificationStore = new Map<string, VerificationRequest>();

// Code expiration time (10 minutes)
const CODE_EXPIRATION_MS = 10 * 60 * 1000;

/**
 * Generate a secure verification code
 */
export function generateVerificationCode(): string {
  // 6-digit alphanumeric code (easy to type)
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars (0,O,1,I)
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new verification request
 */
export function createVerificationRequest(instanceId: string): VerificationRequest {
  const code = generateVerificationCode();
  const request: VerificationRequest = {
    instanceId,
    code,
    telegramUserId: 0, // Will be set when user sends code to bot
    expiresAt: new Date(Date.now() + CODE_EXPIRATION_MS),
  };
  
  verificationStore.set(instanceId, request);
  return request;
}

/**
 * Verify a code submitted by user
 */
export function verifyCode(
  instanceId: string, 
  code: string, 
  telegramUserId: number
): { valid: boolean; error?: string } {
  const request = verificationStore.get(instanceId);
  
  if (!request) {
    return { valid: false, error: "No verification request found" };
  }
  
  if (new Date() > request.expiresAt) {
    verificationStore.delete(instanceId);
    return { valid: false, error: "Verification code expired" };
  }
  
  if (request.code.toUpperCase() !== code.toUpperCase()) {
    return { valid: false, error: "Invalid verification code" };
  }
  
  // Update with telegram user ID
  request.telegramUserId = telegramUserId;
  verificationStore.set(instanceId, request);
  
  return { valid: true };
}

/**
 * Get verification request by instance ID
 */
export function getVerificationRequest(instanceId: string): VerificationRequest | undefined {
  return verificationStore.get(instanceId);
}

/**
 * Clear verification request after successful verification
 */
export function clearVerificationRequest(instanceId: string): void {
  verificationStore.delete(instanceId);
}

/**
 * Generate the verification message to show user
 */
export function generateVerificationMessage(code: string, botUsername: string): string {
  return `Your AI agent is ready!

To activate your bot, send this code to @${botUsername}:

**${code}**

This code expires in 10 minutes.

After verification, you'll be set as the owner and your bot will be fully activated.`;
}

/**
 * Generate bot response for verification code handling
 */
export function generateVerificationBotCode(): string {
  return `
# Verification handler for the bot
async def handle_verification(event, code: str):
    """Handle verification code from user"""
    user_id = event.sender_id
    
    # Check if this is a valid verification code
    # This would call back to Meet Matt API to verify
    verification_url = os.environ.get('MEETMATT_API_URL', 'https://meetmatt.vercel.app')
    instance_id = os.environ.get('INSTANCE_ID', '')
    
    try:
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: requests.post(
                f'{verification_url}/api/verify',
                json={
                    'instanceId': instance_id,
                    'code': code,
                    'telegramUserId': user_id
                }
            )
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('valid'):
                # Set user as owner
                with open('/home/ubuntu/bot-data/owner.json', 'w') as f:
                    json.dump({'ownerId': user_id, 'verifiedAt': datetime.now().isoformat()}, f)
                
                await event.reply("Verification successful! You are now the owner of this bot. Start chatting!")
                return True
            else:
                await event.reply(f"Verification failed: {data.get('error', 'Unknown error')}")
        else:
            await event.reply("Verification service unavailable. Please try again.")
    except Exception as e:
        await event.reply(f"Error during verification: {str(e)}")
    
    return False
`;
}
