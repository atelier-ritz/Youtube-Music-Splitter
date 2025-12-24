// Audio Debug Script for Cloud Version
// Run this in the browser console to diagnose audio issues

console.log('🔧 Audio Debug Script Starting...');

// 1. Check AudioContext support
console.log('1. AudioContext Support:');
const AudioContextClass = window.AudioContext || window.webkitAudioContext;
if (AudioContextClass) {
  console.log('✅ AudioContext supported');
  
  // Test creating AudioContext
  try {
    const testContext = new AudioContextClass();
    console.log('✅ AudioContext creation successful');
    console.log('   State:', testContext.state);
    console.log('   Sample Rate:', testContext.sampleRate);
    
    // Test resume
    if (testContext.state === 'suspended') {
      console.log('⚠️ AudioContext is suspended - testing resume...');
      testContext.resume().then(() => {
        console.log('✅ AudioContext resume successful, state:', testContext.state);
        testContext.close();
      }).catch(error => {
        console.error('❌ AudioContext resume failed:', error);
      });
    } else {
      console.log('✅ AudioContext is already running');
      testContext.close();
    }
  } catch (error) {
    console.error('❌ AudioContext creation failed:', error);
  }
} else {
  console.error('❌ AudioContext not supported');
}

// 2. Check if AudioPlayer exists
console.log('\n2. AudioPlayer Instance:');
if (window.audioPlayer) {
  console.log('✅ AudioPlayer instance found');
  console.log('   Is Playing:', window.audioPlayer.getIsPlaying());
  console.log('   Tracks Loaded:', window.audioPlayer.getAllTracks().length);
} else {
  console.log('❌ AudioPlayer instance not found');
}

// 3. Test basic HTML5 Audio
console.log('\n3. HTML5 Audio Test:');
const testAudio = new Audio();
testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
console.log('   Testing basic audio playback...');

testAudio.play().then(() => {
  console.log('✅ HTML5 Audio works');
}).catch(error => {
  console.error('❌ HTML5 Audio failed:', error);
  if (error.message.includes('user agent') || error.message.includes('autoplay')) {
    console.log('   This is likely an autoplay policy issue');
  }
});

// 4. Check browser and environment
console.log('\n4. Browser Environment:');
console.log('   User Agent:', navigator.userAgent);
console.log('   Protocol:', window.location.protocol);
console.log('   Host:', window.location.host);
console.log('   Is HTTPS:', window.location.protocol === 'https:');
console.log('   Is iOS:', /iPad|iPhone|iPod/.test(navigator.userAgent));

// 5. Check for errors in console
console.log('\n5. Recent Console Errors:');
console.log('   Check the console above for any red error messages');

// 6. Test track URLs if available
console.log('\n6. Track URL Test:');
if (window.audioPlayer && window.audioPlayer.getAllTracks().length > 0) {
  const tracks = window.audioPlayer.getAllTracks();
  console.log('   Testing first track URL...');
  const firstTrack = tracks[0];
  
  fetch(firstTrack.audioUrl, { method: 'HEAD' })
    .then(response => {
      if (response.ok) {
        console.log('✅ Track URL accessible:', firstTrack.audioUrl);
        console.log('   Content-Type:', response.headers.get('content-type'));
        console.log('   Content-Length:', response.headers.get('content-length'));
      } else {
        console.error('❌ Track URL not accessible:', response.status, firstTrack.audioUrl);
      }
    })
    .catch(error => {
      console.error('❌ Track URL fetch failed:', error, firstTrack.audioUrl);
    });
} else {
  console.log('   No tracks loaded to test');
}

console.log('\n🔧 Audio Debug Script Complete');
console.log('📋 Copy the output above and share it for diagnosis');