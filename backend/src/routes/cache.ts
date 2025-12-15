import express from 'express';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const router = express.Router();

const AUDIO_PROCESSING_SERVICE_URL = process.env.AUDIO_PROCESSING_SERVICE_URL || 'http://localhost:8000';
const BACKEND_TEMP_FOLDER = path.join(__dirname, '../../temp');

/**
 * Clear all cached audio files from the audio processing service
 */
router.post('/clear', async (req, res) => {
  try {
    console.log('🧹 Clearing audio cache...');
    
    // Call the audio processing service to clear cache
    const response = await axios.post(`${AUDIO_PROCESSING_SERVICE_URL}/api/cache/clear`);
    
    console.log('✅ Cache cleared successfully:', response.data);
    
    res.json({
      success: true,
      message: 'Audio cache cleared successfully',
      details: response.data
    });
    
  } catch (error: any) {
    console.error('❌ Error clearing cache:', error);
    
    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({
        success: false,
        error: 'Failed to clear cache from audio processing service',
        details: error.response?.data || error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error while clearing cache'
      });
    }
  }
});

/**
 * Clear only temporary files from both audio processing service and backend
 */
router.post('/clear-temp', async (req, res) => {
  try {
    console.log('🧹 Clearing temp files...');
    
    let totalCleared = 0;
    const results: any = {};
    
    // Clear temp files from audio processing service
    try {
      const audioServiceResponse = await axios.post(`${AUDIO_PROCESSING_SERVICE_URL}/api/cache/clear-temp`);
      results.audioService = audioServiceResponse.data;
      totalCleared += audioServiceResponse.data.cleared_files || 0;
      console.log('✅ Audio service temp cleared:', audioServiceResponse.data);
    } catch (error) {
      console.error('⚠️ Failed to clear audio service temp files:', error);
      results.audioService = { error: 'Failed to clear audio service temp files' };
    }
    
    // Clear temp files from backend
    let backendCleared = 0;
    try {
      if (fs.existsSync(BACKEND_TEMP_FOLDER)) {
        const files = fs.readdirSync(BACKEND_TEMP_FOLDER);
        for (const file of files) {
          const filePath = path.join(BACKEND_TEMP_FOLDER, file);
          const stat = fs.statSync(filePath);
          
          if (stat.isFile()) {
            fs.unlinkSync(filePath);
            backendCleared++;
          } else if (stat.isDirectory()) {
            fs.rmSync(filePath, { recursive: true, force: true });
            backendCleared++;
          }
        }
      }
      
      results.backend = {
        message: 'Backend temp cleared successfully',
        cleared_files: backendCleared,
        folder: BACKEND_TEMP_FOLDER
      };
      totalCleared += backendCleared;
      console.log(`✅ Backend temp cleared: ${backendCleared} files`);
      
    } catch (error) {
      console.error('⚠️ Failed to clear backend temp files:', error);
      results.backend = { error: 'Failed to clear backend temp files' };
    }
    
    res.json({
      success: true,
      message: 'Temp files cleared successfully',
      total_cleared_files: totalCleared,
      details: results
    });
    
  } catch (error: any) {
    console.error('❌ Error clearing temp files:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error while clearing temp files'
    });
  }
});

/**
 * Get cache status information
 */
router.get('/status', async (req, res) => {
  try {
    console.log('📊 Getting cache status...');
    
    // Get status from audio processing service
    const audioServiceResponse = await axios.get(`${AUDIO_PROCESSING_SERVICE_URL}/api/cache/status`);
    
    // Get backend temp folder status
    let backendTempStats = {
      files: 0,
      size_mb: 0
    };
    
    try {
      if (fs.existsSync(BACKEND_TEMP_FOLDER)) {
        const files = fs.readdirSync(BACKEND_TEMP_FOLDER);
        let totalSize = 0;
        
        for (const file of files) {
          const filePath = path.join(BACKEND_TEMP_FOLDER, file);
          const stat = fs.statSync(filePath);
          if (stat.isFile()) {
            backendTempStats.files++;
            totalSize += stat.size;
          }
        }
        
        backendTempStats.size_mb = Math.round((totalSize / (1024 * 1024)) * 100) / 100;
      }
    } catch (error) {
      console.error('Error getting backend temp stats:', error);
    }
    
    res.json({
      success: true,
      status: {
        ...audioServiceResponse.data,
        backend_temp: {
          folder: BACKEND_TEMP_FOLDER,
          ...backendTempStats
        }
      }
    });
    
  } catch (error: any) {
    console.error('❌ Error getting cache status:', error);
    
    if (axios.isAxiosError(error)) {
      res.status(error.response?.status || 500).json({
        success: false,
        error: 'Failed to get cache status from audio processing service',
        details: error.response?.data || error.message
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Internal server error while getting cache status'
      });
    }
  }
});

export default router;