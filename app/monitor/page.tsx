"use client";

import { useEffect, useState, useRef } from "react";

interface Event {
  timestamp: string;
  event: string;
  data: any;
}

export default function MonitorPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastKeystroke, setLastKeystroke] = useState<string>("");
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Connect to SSE stream
    const eventSource = new EventSource("/api/monitor?stream=true");
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setEvents((prev) => [data, ...prev].slice(0, 50));
        
        // Track latest keystroke
        if (data.event === "keystroke" && data.data?.field === "agent_name") {
          setLastKeystroke(data.data.value);
        }
      } catch (e) {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  // Filter for name-related events
  const nameEvents = events.filter(
    (e) =>
      e.data?.field === "agent_name" ||
      e.event === "agent_name_submitted" ||
      e.event === "keystroke"
  );

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <span className={connected ? "text-green-400" : "text-red-400"}>
            ●
          </span>
          Live Input Monitor {connected ? "(Connected)" : "(Disconnected)"}
        </h1>

        {/* Current Input */}
        <div className="bg-gray-900 border border-green-700 rounded-lg p-4 mb-4">
          <h2 className="text-sm text-gray-400 mb-2">CURRENT INPUT (Agent Name)</h2>
          <div className="text-3xl font-bold text-white min-h-[40px]">
            {lastKeystroke || "_"}
          </div>
        </div>

        {/* Event Log */}
        <div className="bg-gray-900 border border-green-700 rounded-lg p-4">
          <h2 className="text-sm text-gray-400 mb-2">EVENT LOG</h2>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {nameEvents.length === 0 ? (
              <div className="text-gray-500">Waiting for input...</div>
            ) : (
              nameEvents.map((e, i) => (
                <div
                  key={i}
                  className="text-sm border-b border-gray-800 pb-1"
                >
                  <span className="text-gray-500">
                    {new Date(e.timestamp).toLocaleTimeString()}
                  </span>{" "}
                  <span
                    className={
                      e.event === "keystroke"
                        ? "text-yellow-400"
                        : e.event === "agent_name_submitted"
                        ? "text-green-400 font-bold"
                        : "text-blue-400"
                    }
                  >
                    {e.event}
                  </span>{" "}
                  {e.data?.value && (
                    <span className="text-white">"{e.data.value}"</span>
                  )}
                  {e.data?.name && (
                    <span className="text-white font-bold">"{e.data.name}"</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Raw Events */}
        <div className="mt-4 bg-gray-900 border border-gray-700 rounded-lg p-4">
          <h2 className="text-sm text-gray-400 mb-2">ALL EVENTS</h2>
          <div className="space-y-1 max-h-[300px] overflow-y-auto text-xs">
            {events.slice(0, 20).map((e, i) => (
              <div key={i} className="text-gray-500 border-b border-gray-800 pb-1">
                {e.event}: {JSON.stringify(e.data).slice(0, 100)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
