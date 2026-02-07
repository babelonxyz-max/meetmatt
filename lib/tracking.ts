// Simple analytics tracking for user interactions

interface TrackEvent {
  event: string;
  properties?: Record<string, any>;
  userId?: string;
  sessionId: string;
  timestamp: number;
}

// Queue events to batch send
const eventQueue: TrackEvent[] = [];
let flushTimeout: NodeJS.Timeout | null = null;

/**
 * Track an event - queues and batches sends
 */
export function track(event: string, properties?: Record<string, any>) {
  const sessionId = getSessionId();
  const userId = getUserId();
  
  const trackEvent: TrackEvent = {
    event,
    properties,
    userId,
    sessionId,
    timestamp: Date.now(),
  };
  
  eventQueue.push(trackEvent);
  
  // Flush after 5 seconds or if queue has 10+ events
  if (eventQueue.length >= 10) {
    flushEvents();
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(flushEvents, 5000);
  }
}

/**
 * Track immediately (for important events like name input)
 */
export function trackImmediate(event: string, properties?: Record<string, any>) {
  const sessionId = getSessionId();
  const userId = getUserId();
  
  const trackEvent: TrackEvent = {
    event,
    properties,
    userId,
    sessionId,
    timestamp: Date.now(),
  };
  
  // Send immediately
  sendEvent(trackEvent);
}

/**
 * Track input field changes (with debouncing)
 */
export function createInputTracker(fieldName: string, delay = 2000) {
  let timeout: NodeJS.Timeout | null = null;
  let lastValue = '';
  
  return (value: string) => {
    // Only track if value changed and is meaningful (>2 chars)
    if (value === lastValue || value.length < 2) return;
    lastValue = value;
    
    // Send real-time keystroke to monitor immediately
    sendToMonitor('keystroke', {
      field: fieldName,
      value: value,
      valueLength: value.length,
      timestamp: Date.now(),
    });
    
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      trackImmediate('input_changed', {
        field: fieldName,
        value: value.slice(0, 100), // Limit length
        valueLength: value.length,
      });
    }, delay);
  };
}

/**
 * Send to real-time monitor (no batching)
 */
async function sendToMonitor(event: string, data: any) {
  if (typeof window === 'undefined') return;
  
  try {
    await fetch('/api/monitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data }),
      keepalive: true,
    });
  } catch (e) {
    // Silent fail - monitor is optional
  }
}

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  
  let sessionId = localStorage.getItem('matt_session_id');
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem('matt_session_id', sessionId);
  }
  return sessionId;
}

function getUserId(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  
  // Try to get from Privy if available
  const privyUser = (window as any).__privyUser;
  if (privyUser?.id) return privyUser.id;
  
  return localStorage.getItem('matt_user_id') || undefined;
}

async function flushEvents() {
  if (eventQueue.length === 0) return;
  
  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }
  
  const events = [...eventQueue];
  eventQueue.length = 0;
  
  try {
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events }),
      keepalive: true,
    });
  } catch (e) {
    // Silent fail - analytics shouldn't break the app
    console.debug('Track failed:', e);
  }
}

async function sendEvent(event: TrackEvent) {
  // Always send to monitor for real-time viewing
  try {
    await fetch('/api/monitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: event.event, data: event }),
      keepalive: true,
    });
  } catch (e) {
    // Silent fail
  }
  
  try {
    // Try main API first
    await fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: [event] }),
      keepalive: true,
    });
  } catch (e) {
    // Fallback to local logging
    try {
      await fetch('/api/track-local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
        keepalive: true,
      });
    } catch (e2) {
      console.debug('Track failed:', e2);
    }
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    if (eventQueue.length > 0) {
      flushEvents();
    }
  });
}
