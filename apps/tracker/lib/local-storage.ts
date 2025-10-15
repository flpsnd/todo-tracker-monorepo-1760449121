const STORAGE_KEY = "subscription-tracker";

export function loadLocalSubscriptions(month: string): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return new Set();
    
    const parsed = JSON.parse(data);
    const monthData = parsed[month] || [];
    return new Set(monthData);
  } catch (error) {
    console.error("Failed to load local subscriptions:", error);
    return new Set();
  }
}

export function saveLocalSubscriptions(month: string, checkedSlots: Set<number>): void {
  if (typeof window === "undefined") return;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    let parsed = {};
    
    if (data) {
      try {
        parsed = JSON.parse(data);
      } catch (e) {
        parsed = {};
      }
    }
    
    parsed[month] = Array.from(checkedSlots);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
  } catch (error) {
    console.error("Failed to save local subscriptions:", error);
  }
}

export function clearLocalSubscriptions(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear local subscriptions:", error);
  }
}
