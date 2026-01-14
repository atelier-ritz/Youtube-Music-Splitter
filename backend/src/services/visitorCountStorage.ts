import fs from 'fs';
import path from 'path';

const STORAGE_FILE = path.join(process.cwd(), 'data', 'visitor-count.json');
const MAX_VISITOR_COUNT = 999999;

interface VisitorCountData {
  count: number;
  lastUpdated: string;
}

/**
 * Ensures the data directory exists
 */
function ensureDataDirectory(): void {
  const dataDir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Reads the visitor count from storage
 * Returns 0 if file doesn't exist or is corrupted
 * Implements fallback to in-memory counting on storage failures
 */
export function readVisitorCount(): number {
  try {
    ensureDataDirectory();
    
    // If file doesn't exist, initialize to zero
    if (!fs.existsSync(STORAGE_FILE)) {
      console.log('Visitor count file does not exist, initializing to 0');
      return 0;
    }
    
    // Read and parse the file
    const fileContent = fs.readFileSync(STORAGE_FILE, 'utf-8');
    const data: VisitorCountData = JSON.parse(fileContent);
    
    // Validate the count
    if (typeof data.count !== 'number' || data.count < 0 || data.count > MAX_VISITOR_COUNT) {
      console.error('Invalid visitor count in storage:', data.count, '- resetting to 0');
      console.error('Data validation failed: count must be a number between 0 and', MAX_VISITOR_COUNT);
      return 0;
    }
    
    console.log('Loaded visitor count from storage:', data.count);
    return data.count;
    
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error('Corrupted visitor count file detected (invalid JSON):', error.message);
      console.error('Resetting visitor count to 0 and continuing with in-memory counting');
    } else {
      console.error('Error reading visitor count from storage:', error);
      console.error('Falling back to in-memory counting with count reset to 0');
    }
    return 0;
  }
}

/**
 * Writes the visitor count to storage using atomic write operation
 * Uses temp file + rename pattern to prevent corruption
 * Falls back to in-memory counting if write fails
 */
export function writeVisitorCount(count: number): void {
  try {
    ensureDataDirectory();
    
    // Validate count before writing
    if (typeof count !== 'number' || count < 0 || count > MAX_VISITOR_COUNT) {
      console.error('Invalid count value, not writing to storage:', count);
      console.error('Count must be a number between 0 and', MAX_VISITOR_COUNT);
      return;
    }
    
    // Log warning if maximum count is reached
    if (count === MAX_VISITOR_COUNT) {
      console.warn('⚠️  Maximum visitor count reached:', MAX_VISITOR_COUNT);
      console.warn('Visitor count will not increment beyond this value');
    }
    
    // Prepare data to write
    const data: VisitorCountData = {
      count,
      lastUpdated: new Date().toISOString()
    };
    
    // Atomic write: write to temp file first, then rename
    const tempFile = `${STORAGE_FILE}.tmp`;
    fs.writeFileSync(tempFile, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempFile, STORAGE_FILE);
    
    console.log('Visitor count written to storage:', count);
    
  } catch (error) {
    console.error('❌ Error writing visitor count to storage:', error);
    console.error('Application will continue with in-memory counting');
    console.error('Visitor count may not persist across server restarts');
    // Don't throw - allow the application to continue with in-memory counting
  }
}

/**
 * Increments the visitor count and persists it
 * Returns the new count
 * Handles maximum count limit gracefully
 */
export function incrementVisitorCount(currentCount: number): number {
  // Handle maximum count limit
  if (currentCount >= MAX_VISITOR_COUNT) {
    console.warn('⚠️  Visitor count at maximum (', MAX_VISITOR_COUNT, '), not incrementing');
    return currentCount;
  }
  
  const newCount = currentCount + 1;
  writeVisitorCount(newCount);
  return newCount;
}
