export interface TimerSession {
  id: string
  name: string
  duration: number // milliseconds
  completedAt: number // timestamp
}

export interface CurrentTimer {
  name: string
  initialTime: number // milliseconds
  timeRemaining: number // milliseconds
  isRunning: boolean
  startedAt?: number // timestamp when timer was started (for pause/resume)
}

const SESSIONS_KEY = "timer-sessions";
const CURRENT_TIMER_KEY = "timer-current";

export function loadLocalSessions(): TimerSession[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(SESSIONS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to load local sessions:", error);
    return [];
  }
}

export function saveLocalSessions(sessions: TimerSession[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error("Failed to save local sessions:", error);
  }
}

export function addSession(session: TimerSession): void {
  const sessions = loadLocalSessions();
  const updatedSessions = [session, ...sessions];
  saveLocalSessions(updatedSessions);
}

export function deleteSession(sessionId: string): void {
  const sessions = loadLocalSessions();
  const filteredSessions = sessions.filter(session => session.id !== sessionId);
  saveLocalSessions(filteredSessions);
}

export function loadCurrentTimer(): CurrentTimer | null {
  if (typeof window === "undefined") return null;
  try {
    const data = localStorage.getItem(CURRENT_TIMER_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Failed to load current timer:", error);
    return null;
  }
}

export function saveCurrentTimer(timer: CurrentTimer): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CURRENT_TIMER_KEY, JSON.stringify(timer));
  } catch (error) {
    console.error("Failed to save current timer:", error);
  }
}

export function clearCurrentTimer(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CURRENT_TIMER_KEY);
  } catch (error) {
    console.error("Failed to clear current timer:", error);
  }
}

// Helper function to format time for display
export function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Helper function to parse time input (HH:MM or MM:SS)
export function parseTimeInput(input: string): number | null {
  const trimmed = input.trim();
  
  // Match HH:MM format
  const hhmmMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) {
    const hours = parseInt(hhmmMatch[1], 10);
    const minutes = parseInt(hhmmMatch[2], 10);
    
    if (hours >= 0 && hours <= 99 && minutes >= 0 && minutes <= 59) {
      return hours * 3600000 + minutes * 60000;
    }
  }
  
  // Match MM:SS format
  const mmssMatch = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (mmssMatch) {
    const minutes = parseInt(mmssMatch[1], 10);
    const seconds = parseInt(mmssMatch[2], 10);
    
    if (minutes >= 0 && minutes <= 99 && seconds >= 0 && seconds <= 59) {
      return minutes * 60000 + seconds * 1000;
    }
  }
  
  return null;
}

// Helper function to get time input placeholder based on current time
export function getTimeInputPlaceholder(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  
  if (hours > 0) {
    return "HH:MM";
  }
  return "MM:SS";
}
