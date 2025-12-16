/**
 * Track URL Checker - Helper to verify if tracks have unique audio URLs
 */

export function checkTrackUrls(tracks: any[]): void {
  console.group('🔍 Track URL Analysis');
  
  const urlMap = new Map<string, string[]>();
  
  tracks.forEach(track => {
    const url = track.audioUrl;
    if (!urlMap.has(url)) {
      urlMap.set(url, []);
    }
    urlMap.get(url)!.push(track.name);
  });
  
  console.log(`Total tracks: ${tracks.length}`);
  console.log(`Unique URLs: ${urlMap.size}`);
  
  if (urlMap.size < tracks.length) {
    console.warn('⚠️ DUPLICATE URLs DETECTED:');
    urlMap.forEach((trackNames, url) => {
      if (trackNames.length > 1) {
        console.warn(`URL: ${url}`);
        console.warn(`Used by tracks: ${trackNames.join(', ')}`);
      }
    });
  } else {
    console.log('✅ All tracks have unique URLs');
  }
  
  console.table(tracks.map(track => ({
    name: track.name,
    id: track.id,
    url: track.audioUrl
  })));
  
  console.groupEnd();
}

// Make it available globally for easy debugging
(window as any).checkTrackUrls = checkTrackUrls;