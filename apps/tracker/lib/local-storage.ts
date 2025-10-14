const STORAGE_KEY = "subscription-tracker";

export function loadLocalSubscriptions(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? new Set(JSON.parse(data)) : new Set();
  } catch (error) {
    console.error("Failed to load local subscriptions:", error);
    return new Set();
  }
}

export function saveLocalSubscriptions(checkedSlots: Set<number>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(checkedSlots)));
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
