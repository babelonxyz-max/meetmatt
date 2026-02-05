// Devin API Client
// Documentation: https://docs.devin.ai/api-reference

const DEVIN_API_KEY = process.env.DEVIN_API_KEY
const DEVIN_API_URL = process.env.DEVIN_API_URL || 'https://api.devin.ai/v1'

interface CreateSessionRequest {
  prompt: string
  name?: string
  idempotent?: boolean
  maxIterations?: number
}

interface DevinSession {
  session_id: string
  url: string
  status: 'running' | 'blocked' | 'stopped'
}

// Check if we have a real API key
const hasRealApiKey = DEVIN_API_KEY && !DEVIN_API_KEY.includes('your-devin')

export async function createDevinSession(config: {
  name: string
  purpose: string
  features: string[]
  tier: string
}): Promise<DevinSession> {
  const prompt = buildPrompt(config)
  
  if (!hasRealApiKey) {
    console.log('Using mock Devin API (no real API key)')
    return mockCreateSession(config)
  }

  try {
    const response = await fetch(`${DEVIN_API_URL}/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DEVIN_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        name: config.name,
        idempotent: false,
      } as CreateSessionRequest),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Devin API error: ${error}`)
    }

    const session: DevinSession = await response.json()
    return session
  } catch (error) {
    console.error('Failed to create Devin session:', error)
    throw error
  }
}

export async function getDevinSession(sessionId: string): Promise<DevinSession> {
  if (!hasRealApiKey) {
    return mockGetSession(sessionId)
  }

  const response = await fetch(`${DEVIN_API_URL}/sessions/${sessionId}`, {
    headers: {
      'Authorization': `Bearer ${DEVIN_API_KEY}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to get Devin session')
  }

  return response.json()
}

function buildPrompt(config: {
  name: string
  purpose: string
  features: string[]
}): string {
  return `You are ${config.name}, an AI assistant created for the following purpose:

PURPOSE: ${config.purpose}

CAPABILITIES:
${config.features.map(f => `- ${f}`).join('\n')}

INSTRUCTIONS:
- Always introduce yourself as ${config.name}
- Be helpful, professional, and efficient
- Use your capabilities to best serve the user's needs
- Ask clarifying questions when needed

Start by greeting the user and offering to help with their project.`
}

// Mock implementations for testing without real API key
function mockCreateSession(config: { name: string }): Promise<DevinSession> {
  const sessionId = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`
  
  return Promise.resolve({
    session_id: sessionId,
    url: `https://app.devin.ai/sessions/${sessionId}`,
    status: 'running',
  })
}

function mockGetSession(sessionId: string): Promise<DevinSession> {
  return Promise.resolve({
    session_id: sessionId,
    url: `https://app.devin.ai/sessions/${sessionId}`,
    status: 'running',
  })
}
