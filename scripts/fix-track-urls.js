#!/usr/bin/env node

/**
 * Script to fix track URLs in existing jobs to use the correct server IP
 * Usage: node fix-track-urls.js <server-ip>
 * Example: node fix-track-urls.js 192.168.4.78
 */

const fs = require('fs');
const path = require('path');

const serverIP = process.argv[2];
if (!serverIP) {
  console.error('Usage: node fix-track-urls.js <server-ip>');
  console.error('Example: node fix-track-urls.js 192.168.4.78');
  process.exit(1);
}

const jobsFile = path.join(__dirname, '../backend/temp/processing-jobs.json');

if (!fs.existsSync(jobsFile)) {
  console.error('Jobs file not found:', jobsFile);
  process.exit(1);
}

try {
  // Read the jobs file
  const jobsData = fs.readFileSync(jobsFile, 'utf8');
  const jobs = JSON.parse(jobsData);
  
  let updatedCount = 0;
  
  // Update URLs in each job
  jobs.forEach(job => {
    if (job.tracks) {
      job.tracks.forEach(track => {
        if (track.audioUrl && track.audioUrl.includes('localhost:3001')) {
          const oldUrl = track.audioUrl;
          track.audioUrl = track.audioUrl.replace('localhost:3001', `${serverIP}:3001`);
          console.log(`Updated: ${oldUrl} -> ${track.audioUrl}`);
          updatedCount++;
        }
      });
    }
  });
  
  if (updatedCount > 0) {
    // Write back the updated jobs
    fs.writeFileSync(jobsFile, JSON.stringify(jobs, null, 2));
    console.log(`\nSuccessfully updated ${updatedCount} track URLs to use ${serverIP}:3001`);
    console.log('Restart the backend server to pick up the changes.');
  } else {
    console.log('No URLs needed updating.');
  }
  
} catch (error) {
  console.error('Error updating track URLs:', error.message);
  process.exit(1);
}