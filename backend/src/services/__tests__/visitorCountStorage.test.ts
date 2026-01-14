import fs from 'fs';
import path from 'path';
import { readVisitorCount, writeVisitorCount, incrementVisitorCount } from '../visitorCountStorage';

const TEST_DATA_DIR = path.join(process.cwd(), 'data');
const TEST_STORAGE_FILE = path.join(TEST_DATA_DIR, 'visitor-count.json');

describe('Visitor Count Storage', () => {
  // Clean up before and after tests
  beforeEach(() => {
    // Remove test file if it exists
    if (fs.existsSync(TEST_STORAGE_FILE)) {
      fs.unlinkSync(TEST_STORAGE_FILE);
    }
  });

  afterEach(() => {
    // Clean up test file
    if (fs.existsSync(TEST_STORAGE_FILE)) {
      fs.unlinkSync(TEST_STORAGE_FILE);
    }
  });

  describe('readVisitorCount', () => {
    it('should return 0 when file does not exist', () => {
      const count = readVisitorCount();
      expect(count).toBe(0);
    });

    it('should read existing count from file', () => {
      // Create test file
      if (!fs.existsSync(TEST_DATA_DIR)) {
        fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(
        TEST_STORAGE_FILE,
        JSON.stringify({ count: 42, lastUpdated: new Date().toISOString() }),
        'utf-8'
      );

      const count = readVisitorCount();
      expect(count).toBe(42);
    });

    it('should return 0 for corrupted file', () => {
      // Create corrupted test file
      if (!fs.existsSync(TEST_DATA_DIR)) {
        fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(TEST_STORAGE_FILE, 'invalid json', 'utf-8');

      const count = readVisitorCount();
      expect(count).toBe(0);
    });

    it('should return 0 for invalid count values', () => {
      // Create file with invalid count
      if (!fs.existsSync(TEST_DATA_DIR)) {
        fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(
        TEST_STORAGE_FILE,
        JSON.stringify({ count: -5, lastUpdated: new Date().toISOString() }),
        'utf-8'
      );

      const count = readVisitorCount();
      expect(count).toBe(0);
    });

    it('should return 0 for count exceeding maximum', () => {
      // Create file with count exceeding maximum
      if (!fs.existsSync(TEST_DATA_DIR)) {
        fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(
        TEST_STORAGE_FILE,
        JSON.stringify({ count: 1000000, lastUpdated: new Date().toISOString() }),
        'utf-8'
      );

      const count = readVisitorCount();
      expect(count).toBe(0);
    });
  });

  describe('writeVisitorCount', () => {
    it('should write count to file', () => {
      writeVisitorCount(100);

      expect(fs.existsSync(TEST_STORAGE_FILE)).toBe(true);
      const content = fs.readFileSync(TEST_STORAGE_FILE, 'utf-8');
      const data = JSON.parse(content);
      expect(data.count).toBe(100);
      expect(data.lastUpdated).toBeDefined();
    });

    it('should not write invalid count values', () => {
      writeVisitorCount(-10);
      expect(fs.existsSync(TEST_STORAGE_FILE)).toBe(false);
    });

    it('should not write count exceeding maximum', () => {
      writeVisitorCount(1000000);
      expect(fs.existsSync(TEST_STORAGE_FILE)).toBe(false);
    });

    it('should handle maximum count (999,999)', () => {
      writeVisitorCount(999999);

      expect(fs.existsSync(TEST_STORAGE_FILE)).toBe(true);
      const content = fs.readFileSync(TEST_STORAGE_FILE, 'utf-8');
      const data = JSON.parse(content);
      expect(data.count).toBe(999999);
    });
  });

  describe('incrementVisitorCount', () => {
    it('should increment count and persist', () => {
      const newCount = incrementVisitorCount(50);
      expect(newCount).toBe(51);

      // Verify persistence
      const readCount = readVisitorCount();
      expect(readCount).toBe(51);
    });

    it('should not increment beyond maximum', () => {
      const newCount = incrementVisitorCount(999999);
      expect(newCount).toBe(999999);
    });

    it('should handle increment from 0', () => {
      const newCount = incrementVisitorCount(0);
      expect(newCount).toBe(1);

      // Verify persistence
      const readCount = readVisitorCount();
      expect(readCount).toBe(1);
    });
  });

  describe('atomic write operations', () => {
    it('should use temp file for atomic writes', () => {
      const tempFile = `${TEST_STORAGE_FILE}.tmp`;
      
      // Ensure temp file doesn't exist before
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }

      writeVisitorCount(123);

      // Temp file should not exist after write (it gets renamed)
      expect(fs.existsSync(tempFile)).toBe(false);
      // Final file should exist
      expect(fs.existsSync(TEST_STORAGE_FILE)).toBe(true);
    });
  });

  describe('round-trip persistence', () => {
    it('should maintain count through write and read cycle', () => {
      const testCounts = [0, 1, 42, 999, 50000, 999999];

      testCounts.forEach(count => {
        writeVisitorCount(count);
        const readBack = readVisitorCount();
        expect(readBack).toBe(count);
      });
    });
  });
});
