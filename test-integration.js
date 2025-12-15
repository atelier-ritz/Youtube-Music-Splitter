// Quick test to verify the audio processing service integration
const fs = require('fs');
const FormData = require('form-data');

async function testAudioProcessing() {
  try {
    console.log('🧪 Testing audio processing service integration...');
    
    // Check if service is running
    const healthResponse = await fetch('http://localhost:8000/api/health');
    if (!healthResponse.ok) {
      throw new Error('Audio processing service is not running');
    }
    
    console.log('✅ Audio processing service is running');
    
    // Create a small test audio file (just for testing the upload)
    const testAudioBuffer = Buffer.from('fake audio data for testing');
    
    // Create FormData
    const formData = new FormData();
    formData.append('audio_file', testAudioBuffer, {
      filename: 'test.mp3',
      contentType: 'audio/mpeg'
    });
    
    // Test upload
    console.log('📤 Testing file upload...');
    const uploadResponse = await fetch('http://localhost:8000/api/process', {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        ...formData.getHeaders()
      }
    });
    
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      throw new Error(`Upload failed: ${uploadResponse.status} ${errorText}`);
    }
    
    const result = await uploadResponse.json();
    console.log('✅ Upload successful, job ID:', result.jobId);
    
    // Check job status
    const statusResponse = await fetch(`http://localhost:8000/api/process/${result.jobId}`);
    const status = await statusResponse.json();
    console.log('📊 Job status:', status);
    
    console.log('🎉 Integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
  }
}

testAudioProcessing();