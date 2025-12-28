# Docker Build Fixes - Backend Issues

## Issue Fixed: Backend Build Failure ❌ → ✅

### Problem
The backend Docker build was failing with:
```
error TS5058: The specified path does not exist: 'tsconfig.prod.json'
```

### Root Cause
The backend `package.json` had a `postinstall` script that ran `npm run build`, which tried to use `tsconfig.prod.json`. However, in the Docker build process:

1. `COPY backend/package*.json ./` - Only package files copied
2. `RUN npm install --include=dev` - This triggers postinstall script
3. `COPY backend/ ./` - TypeScript configs copied AFTER npm install

So the postinstall script ran before the TypeScript config files were available.

### Solution Applied

#### 1. Removed Problematic Postinstall Script
**File**: `backend/package.json`
- Removed `"postinstall": "npm run build"` script
- This prevents automatic build during npm install

#### 2. Updated Backend Dockerfile
**File**: `backend/Dockerfile`
- Copy TypeScript configs before npm install:
  ```dockerfile
  COPY package*.json ./
  COPY tsconfig*.json ./  # Added this line
  ```
- Run build explicitly after copying all files

#### 3. Updated Main Dockerfile
**File**: `Dockerfile` (root level)
- Same fix applied to the multi-stage build
- Copy configs before npm install in backend-builder stage

#### 4. Updated Node Version Requirements
**File**: `backend/package.json`
- Updated engines from Node 18 to Node 20
- Updated npm requirement to >= 10.0.0

## Additional Notes

### Multer Deprecation Warning ⚠️
The build shows a warning about multer 1.x vulnerabilities:
```
npm warn deprecated multer@1.4.5-lts.2: Multer 1.x is impacted by vulnerabilities, upgrade to 2.x
```

**Status**: Multer 2.0 stable is not yet released (only alpha versions available)
**Action**: Will upgrade when 2.0 stable is available

### Files Modified
- ✅ `backend/package.json` - Removed postinstall, updated engines
- ✅ `backend/Dockerfile` - Copy configs before npm install
- ✅ `Dockerfile` - Updated backend-builder stage
- ✅ All transport button sizes updated to 36px for consistency

## Test Commands
```bash
# Test backend build individually
cd backend && docker build -t backend-test .

# Test full application build
docker build -t band-practice-webapp .

# Test with docker-compose
npm run docker:build
```

The Docker build should now complete successfully without the TypeScript configuration errors.