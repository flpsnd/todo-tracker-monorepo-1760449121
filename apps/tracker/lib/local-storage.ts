const STORAGE_KEY = "subscription-tracker";

export function loadLocalSubscriptions(month: string): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      console.log(`No data found for month ${month}`);
      return new Set();
    }
    
    const parsed = JSON.parse(data);
    console.log(`Full localStorage data:`, parsed);
    console.log(`Data type:`, typeof parsed, Array.isArray(parsed) ? 'array' : 'object');
    
    // Handle legacy data format (array instead of object)
    if (Array.isArray(parsed)) {
      console.log(`Legacy array format detected, clearing localStorage`);
      localStorage.removeItem(STORAGE_KEY);
      return new Set();
    }
    
    // Ensure it's an object
    if (typeof parsed !== 'object' || parsed === null) {
      console.log(`Invalid data format, clearing localStorage`);
      localStorage.removeItem(STORAGE_KEY);
      return new Set();
    }
    
    console.log(`Looking for month ${month} in data:`, parsed[month]);
    const monthData = parsed[month] || [];
    console.log(`Loading data for month ${month}:`, monthData);
    return new Set(monthData);
  } catch (error) {
    console.error("Failed to load local subscriptions:", error);
    // Clear corrupted data
    localStorage.removeItem(STORAGE_KEY);
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
        console.log(`Existing localStorage data:`, parsed);
        
        // Handle legacy data format (array instead of object)
        if (Array.isArray(parsed)) {
          console.log(`Legacy array format detected, starting fresh`);
          parsed = {};
        }
        
        // Ensure it's an object
        if (typeof parsed !== 'object' || parsed === null) {
          console.log(`Invalid data format, starting fresh`);
          parsed = {};
        }
      } catch (e) {
        console.log(`Failed to parse existing data, starting fresh:`, e);
        parsed = {};
      }
    } else {
      console.log(`No existing localStorage data found`);
    }
    
    parsed[month] = Array.from(checkedSlots);
    console.log(`Saving data for month ${month}:`, Array.from(checkedSlots));
    console.log(`Full data structure being saved:`, parsed);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
    
    // Verify what was actually saved
    const verifyData = localStorage.getItem(STORAGE_KEY);
    const verifyParsed = JSON.parse(verifyData);
    console.log(`Verification - what's actually in localStorage:`, verifyParsed);
    console.log(`Verification - data type:`, typeof verifyParsed, Array.isArray(verifyParsed) ? 'array' : 'object');
  } catch (error) {
    console.error("Failed to save local subscriptions:", error);
  }
}

export function clearLocalSubscriptions(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log("Cleared all localStorage data");
  } catch (error) {
    console.error("Failed to clear local subscriptions:", error);
  }
}

// Debug function to inspect localStorage
export function debugLocalStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    console.log("=== localStorage DEBUG ===");
    console.log("Raw data:", data);
    if (data) {
      const parsed = JSON.parse(data);
      console.log("Parsed data:", parsed);
      console.log("Keys:", Object.keys(parsed));
    }
    console.log("=== END DEBUG ===");
  } catch (error) {
    console.error("Failed to debug localStorage:", error);
  }
}
