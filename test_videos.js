// Test script to demonstrate the duplicate video issue

// Old function without Set
function extractYouTubeVideosOld(release) {
    const videos = [];
    if (release.videos) {
        release.videos.forEach(video => {
            if (video.uri && video.uri.includes('youtube.com')) {
                const videoId = video.uri.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                if (videoId) {
                    videos.push({
                        id: videoId[1],
                        title: video.title || 'Untitled',
                        description: video.description || ''
                    });
                }
            }
        });
    }
    return videos;
}

// Fetch release 80545 data
fetch('https://api.discogs.com/releases/80545', {
    headers: {
        'User-Agent': 'DiscogsCollectionVideoPlayer/1.0',
        'Authorization': 'Discogs token=YOUR_DISCOGS_TOKEN'
    }
})
.then(response => response.json())
.then(release => {
    console.log('Raw videos data:', release.videos);
    console.log('Videos count:', release.videos.length);
    
    const extractedVideos = extractYouTubeVideosOld(release);
    console.log('Extracted videos (old function):', extractedVideos);
    console.log('Extracted count:', extractedVideos.length);
    
    // Show video IDs to identify duplicates
    const videoIds = extractedVideos.map(v => v.id);
    console.log('Video IDs:', videoIds);
    console.log('Unique IDs:', [...new Set(videoIds)]);
});