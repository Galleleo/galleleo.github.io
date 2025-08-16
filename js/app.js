const { useState, useEffect, useCallback, useRef } = React;

const DEBUG_MODE = false; // Set to true to show test button

function App() {
    const [username, setUsername] = useState(localStorage.getItem('discogs-username') || 'Galleleo');
    const [token, setToken] = useState(localStorage.getItem('discogs-token') || '');
    const [status, setStatus] = useState('');
    const [release, setRelease] = useState(null);
    const [videos, setVideos] = useState([]);
    const [collectionItem, setCollectionItem] = useState(null);
    const [loading, setLoading] = useState(false);
    const [collectionCache, setCollectionCache] = useState(null);
    const [rating, setRating] = useState(0);
    const [ratingStatus, setRatingStatus] = useState('');
    const [players, setPlayers] = useState([]);
    const playersRef = useRef([]);
    const [autoplay, setAutoplay] = useState(localStorage.getItem('autoplay') === 'true' || localStorage.getItem('autoplay') === null);
    const [shuffle, setShuffle] = useState(localStorage.getItem('shuffle') === 'true');
    const [continuousPlay, setContinuousPlay] = useState(localStorage.getItem('continuousPlay') === 'true');
    const [randomNext, setRandomNext] = useState(localStorage.getItem('randomNext') === 'true');
    const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
    const [playedVideos, setPlayedVideos] = useState(new Set());
    const [mode, setMode] = useState(localStorage.getItem('discogs-collection-type') || 'collection'); // 'collection' or 'wantlist'
    const [modalContent, setModalContent] = useState(null);
    const [warningModal, setWarningModal] = useState(null);
    const [marketplaceData, setMarketplaceData] = useState(null);
    const [imageModal, setImageModal] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [currentReleaseMode, setCurrentReleaseMode] = useState(null);

    const handleVideoEnd = useCallback(() => {
        console.log('handleVideoEnd called, currentVideoIndex:', currentVideoIndex, 'videos.length:', videos.length);
        console.log('Shuffle:', shuffle, 'Random Next:', randomNext);
        
        let nextIndex;
        if (shuffle) {
            const newPlayedVideos = new Set(playedVideos);
            newPlayedVideos.add(currentVideoIndex);
            setPlayedVideos(newPlayedVideos);
            
            if (newPlayedVideos.size >= videos.length) {
                // All videos played with shuffle
                if (randomNext) {
                    getRandomReleaseWithVideos();
                    return;
                } else {
                    setPlayedVideos(new Set());
                    nextIndex = Math.floor(Math.random() * videos.length);
                }
            } else {
                const unplayedVideos = videos.map((_, i) => i).filter(i => !newPlayedVideos.has(i));
                nextIndex = unplayedVideos[Math.floor(Math.random() * unplayedVideos.length)];
            }
        } else {
            // Sequential play
            nextIndex = currentVideoIndex + 1;
            if (nextIndex >= videos.length) {
                // We're at the last video
                if (randomNext) {
                    getRandomReleaseWithVideos();
                    return;
                } else {
                    nextIndex = 0; // Loop back to first video
                }
            }
        }
        
        console.log('Next video index:', nextIndex, 'players available:', playersRef.current.length);
        if (nextIndex !== undefined && playersRef.current[nextIndex]) {
            setCurrentVideoIndex(nextIndex);
            setTimeout(() => {
                console.log('Playing next video at index:', nextIndex);
                playersRef.current[nextIndex].playVideo();
            }, 500);
        }
    }, [currentVideoIndex, videos, playedVideos, shuffle, randomNext]);

    useEffect(() => {
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = 'https://www.youtube.com/iframe_api';
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
            
            window.onYouTubeIframeAPIReady = () => {
                initializePlayers();
            };
        } else {
            initializePlayers();
        }
    }, [videos]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (imageModal) setImageModal(null);
                if (modalContent) setModalContent(null);
                if (warningModal) setWarningModal(null);
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [imageModal, modalContent, warningModal]);

    const initializePlayers = () => {
        const newPlayers = [];
        videos.forEach((video, index) => {
            const iframeId = `iframe-${video.id}`;
            if (document.getElementById(iframeId)) {
                const player = new window.YT.Player(iframeId, {
                    events: {
                        'onStateChange': (event) => {
                            if (event.data === window.YT.PlayerState.PLAYING) {
                                // Update current video index
                                const playingIndex = videos.findIndex(v => `iframe-${v.id}` === event.target.getIframe().id);
                                if (playingIndex !== -1) setCurrentVideoIndex(playingIndex);
                                
                                newPlayers.forEach((p) => {
                                    if (p.getPlayerState() === window.YT.PlayerState.PLAYING && 
                                        p.getIframe().id !== event.target.getIframe().id) {
                                        p.pauseVideo();
                                    }
                                });
                            } else if (event.data === window.YT.PlayerState.ENDED) {
                                console.log('Video ended, continuous play:', continuousPlay);
                                if (continuousPlay) {
                                    handleVideoEnd();
                                }
                            }
                        }
                    }
                });
                newPlayers.push(player);
            }
        });
        setPlayers(newPlayers);
        playersRef.current = newPlayers;
        
        // Auto-start first video if autoplay is enabled
        if (autoplay && newPlayers.length > 0 && videos.length > 0) {
            setTimeout(() => {
                const startIndex = shuffle ? Math.floor(Math.random() * videos.length) : 0;
                setCurrentVideoIndex(startIndex);
                newPlayers[startIndex]?.playVideo();
            }, 1000);
        }
    };

    const fetchDiscogs = async (url, token = null, retries = 3) => {
        const headers = { 'User-Agent': 'DiscogsCollectionVideoPlayer/1.0' };
        if (token) headers['Authorization'] = `Discogs token=${token}`;
        
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, { headers });
                
                if (response.status === 429) {
                    const delay = Math.pow(2, i) * 1000; // Exponential backoff
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return response.json();
            } catch (error) {
                if (error.message.includes('CORS') || error.message.includes('Cross-Origin')) {
                    throw new Error('CORS error: Please use a token or try from a different browser/network');
                }
                
                if (i === retries - 1) throw error;
                
                const delay = Math.pow(2, i) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    };

    const getCollectionInfo = async (username, token, isWantlist = false) => {
        const url = isWantlist 
            ? `https://api.discogs.com/users/${username}/wants?per_page=100`
            : `https://api.discogs.com/users/${username}/collection/folders/0/releases?per_page=100`;
        const data = await fetchDiscogs(url, token);
        return {
            totalItems: data.pagination.items,
            totalPages: data.pagination.pages
        };
    };
    const getRandomPage = async (username, token, totalPages, isWantlist = false) => {
        const randomPage = Math.floor(Math.random() * totalPages) + 1;
        const url = isWantlist 
            ? `https://api.discogs.com/users/${username}/wants?per_page=100&page=${randomPage}`
            : `https://api.discogs.com/users/${username}/collection/folders/0/releases?per_page=100&page=${randomPage}`;
        const data = await fetchDiscogs(url, token);
        return isWantlist ? data.wants : data.releases;
    };

    const getReleaseDetails = async (releaseId, token) => {
        const url = `https://api.discogs.com/releases/${releaseId}`;
        return fetchDiscogs(url, token);
    };

    const getMarketplaceData = async (releaseId, token) => {
        try {
            const stats = await fetchDiscogs(`https://api.discogs.com/marketplace/stats/${releaseId}`, token);
            return {
                forSale: stats.num_for_sale || 0,
                lowestPrice: stats.lowest_price,
                medianPrice: stats.median_price,
                highestPrice: stats.highest_price,
                blocked: stats.blocked_from_sale
            };
        } catch (error) {
            console.error('Error fetching marketplace data:', error);
            return { forSale: 0, lowestPrice: null, medianPrice: null, highestPrice: null, blocked: false };
        }
    };

    const extractYouTubeVideos = (release) => {
        const videos = [];
        const seenIds = new Set();
        if (release.videos) {
            release.videos.forEach(video => {
                if (video.uri && video.uri.includes('youtube.com')) {
                    const videoId = video.uri.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
                    if (videoId && !seenIds.has(videoId[1])) {
                        seenIds.add(videoId[1]);
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
    };

    const getRandomReleaseWithVideos = async () => {
        if (!username.trim()) {
            setStatus({ type: 'error', message: 'Please enter a username' });
            return;
        }
        
        if (mode === 'wantlist' && !token.trim()) {
            showWarningModal('API token required for wantlist access. Get yours at https://www.discogs.com/settings/developers');
            return;
        }

        setLoading(true);
        setRelease(null);
        setVideos([]);
        document.body.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';

        try {
            const isWantlist = mode === 'wantlist';
            let cache = collectionCache;
            if (!cache) {
                setStatus({ type: 'loading', message: `Loading ${mode} info...` });
                cache = await getCollectionInfo(username, token || null, isWantlist);
                setCollectionCache(cache);
                
                if (cache.totalItems === 0) {
                    setStatus({ type: 'error', message: `No releases found in ${mode}` });
                    setLoading(false);
                    return;
                }
            }

            setStatus({ type: 'loading', message: 'Finding release with videos...' });

            let attempts = 0;
            const maxAttempts = 10;

            while (attempts < maxAttempts) {
                const randomPage = await getRandomPage(username, token || null, cache.totalPages, isWantlist);
                const randomIndex = Math.floor(Math.random() * randomPage.length);
                const randomRelease = randomPage[randomIndex];

                const releaseDetails = await getReleaseDetails(randomRelease.id || randomRelease.basic_information?.id, token || null);
                const extractedVideos = extractYouTubeVideos(releaseDetails);

                if (extractedVideos.length > 0) {
                    setRelease(releaseDetails);
                    setVideos(loadSavedOrder(extractedVideos, releaseDetails.id));
                    setCollectionItem(randomRelease);
                    setRating(randomRelease.rating || 0);
                    setCurrentVideoIndex(0);
                    setPlayedVideos(new Set());
                    setCurrentReleaseMode(isWantlist ? 'wantlist' : 'collection');
                    
                    // Fetch marketplace data for wantlist items
                    if (isWantlist && token) {
                        const marketplace = await getMarketplaceData(releaseDetails.id, token);
                        setMarketplaceData(marketplace);
                    } else {
                        setMarketplaceData(null);
                    }
                    
                    setStatus({ type: '', message: '' });
                    setLoading(false);
                    
                    // Trigger autoplay for new release
                    if (autoplay) {
                        setTimeout(() => {
                            const startIndex = shuffle ? Math.floor(Math.random() * extractedVideos.length) : 0;
                            setCurrentVideoIndex(startIndex);
                        }, 100);
                    }
                    return;
                }

                attempts++;
                setStatus({ type: 'loading', message: `Finding release with videos... (attempt ${attempts}/${maxAttempts})` });
            }

            setStatus({ type: 'error', message: 'No releases with YouTube videos found after 10 attempts' });
        } catch (error) {
            setStatus({ type: 'error', message: `Error: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    const refreshCurrentRelease = async () => {
        if (!release) return;
        
        setLoading(true);
        setStatus({ type: 'loading', message: 'Refreshing release data...' });
        
        try {
            const releaseDetails = await getReleaseDetails(release.id, token || null);
            const extractedVideos = extractYouTubeVideos(releaseDetails);
            
            setRelease(releaseDetails);
            setVideos(loadSavedOrder(extractedVideos, releaseDetails.id));
            setRating(collectionItem?.rating || 0);
            setStatus({ type: '', message: '' });
        } catch (error) {
            setStatus({ type: 'error', message: `Error refreshing: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getConditionValue = (notes, fieldId) => {
        if (!notes || !Array.isArray(notes)) return 'Not specified';
        const note = notes.find(n => n.field_id === fieldId);
        return note ? note.value : 'Not specified';
    };

    const getNotes = (notes) => {
        if (!notes || !Array.isArray(notes)) return '';
        const note = notes.find(n => n.field_id === 3);
        return note ? note.value : '';
    };

    const getUniqueFormats = (formats) => {
        if (!formats) return 'Unknown';
        const formatInfo = [];
        
        formats.forEach(format => {
            let formatStr = format.name;
            
            // Add vinyl size information
            if (format.descriptions) {
                const size = format.descriptions.find(desc => desc === '12"' || desc === '7"');
                if (size) {
                    formatStr += ` (${size})`;
                }
                
                // Check for white label
                const whiteLabel = format.descriptions.find(desc => desc.toLowerCase().includes('white label'));
                if (whiteLabel) {
                    formatStr += ' - White Label';
                }
            }
            
            formatInfo.push(formatStr);
        });
        
        const uniqueFormats = [...new Set(formatInfo)];
        return uniqueFormats.join(', ');
    };

    const matchVideoToTrack = (videoTitle, tracklist) => {
        if (!tracklist || !videoTitle || !release) return null;
        
        // Clean video title: remove Audiosurf prefix and file extensions
        let cleanedTitle = videoTitle
            .replace(/^audiosurf:\s*/i, '')
            .replace(/\.(mp4|avi|mov|wmv|flv|webm)$/i, '')
            .trim();
        
        // For Various Artists releases, try to match individual track artists
        const isVariousArtists = release.artists && release.artists.some(a => a.name.toLowerCase().includes('various'));
        
        let bestMatch = null;
        let bestScore = 0;
        
        tracklist.forEach(track => {
            if (!track.title) return;
            
            // For Various Artists, use track-specific artist if available (raw names for matching)
            let expectedTitle;
            if (isVariousArtists && track.artists && track.artists.length > 0) {
                const trackArtist = track.artists.map(a => a.name).join(' Vs. ');
                expectedTitle = `${trackArtist} - ${track.title}`;
                

            } else {
                const releaseArtist = release.artists ? release.artists.map(a => a.name).join(', ') : '';
                expectedTitle = `${releaseArtist} - ${track.title}`;
            }
            
            // Normalize both titles and handle Vs./slash/versus variations
            const normalizeForMatching = (str) => {
                return str.toLowerCase()
                    .replace(/_/g, ' ')                           // Replace underscores with spaces
                    .replace(/\s*\/\s*/g, ' ')                    // Remove slashes
                    .replace(/\s+versus\s+/g, ' ')                // Remove versus
                    .replace(/\s+vs\.?\s+/g, ' ')                 // Remove vs variations
                    .replace(/\(official\s+(audio|video)\)/g, '') // Remove (Official Audio/Video)
                    .replace(/\[official\s+video\]/g, '')         // Remove [Official Video]
                    .replace(/\((cd|vinyl\s+rip|rip)\)/g, '')     // Remove (CD), (Vinyl RIP), (RIP)
                    .replace(/\([^)]*\)/g, '')                    // Remove remaining parentheses content
                    .replace(/\[[^\]]*\]/g, '')                   // Remove square brackets content
                    .replace(/\b(the|a|an)\s+/g, '')             // Remove filler words
                    .replace(/'/g, '')                            // Remove apostrophes (trippin' = trippin)
                    .replace(/\s+/g, ' ')                         // Normalize spaces
                    .trim();
            };
            
            const normalizedVideo = normalizeForMatching(cleanedTitle);
            const normalizedExpected = normalizeForMatching(expectedTitle);
            
            // Exact match
            if (normalizedVideo === normalizedExpected) {
                bestScore = 1.0;
                bestMatch = track;
                return;
            }
            
            // Normalize accents and clean
            const normalizeAccents = (str) => {
                return str.normalize('NFD')
                    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
                    .replace(/[^a-z0-9\s]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
            };
            
            // Fuzzy match for remixes - remove feat/featuring and remix info
            const fuzzyCleanVideo = normalizeForMatching(cleanedTitle);
            const fuzzyCleanExpected = normalizeForMatching(expectedTitle);
            
            const cleanTitle = normalizeAccents(normalizedVideo);
            const cleanExpected = normalizeAccents(normalizedExpected);
            const fuzzyVideoNorm = normalizeAccents(fuzzyCleanVideo);
            const fuzzyExpectedNorm = normalizeAccents(fuzzyCleanExpected);
            
            if (cleanTitle === cleanExpected) {
                bestScore = 0.95;
                bestMatch = track;
                return;
            }
            
            // Check if video contains track title and artist
            const cleanTrack = track.title.toLowerCase()
                .replace(/[^a-z0-9\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            // Extract artist from expected title for better matching
            const artistPart = expectedTitle.split(' - ')[0].toLowerCase()
                .replace(/[^a-z0-9\s]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            
            // Check if video contains both artist and track title
            if (cleanTitle.includes(cleanTrack) && cleanTitle.includes(artistPart)) {
                bestScore = 0.9;
                bestMatch = track;
                return;
            }
            
            if (fuzzyVideoNorm === fuzzyExpectedNorm) {
                bestScore = 0.7;
                bestMatch = { ...track, isUncertain: true };
                return;
            }
            
            // For Various Artists, try matching just the track title without artist
            if (isVariousArtists) {
                const trackOnlyFuzzy = normalizeAccents(track.title.toLowerCase()
                    .replace(/\([^)]*remix[^)]*\)/gi, '')
                    .replace(/\([^)]*mix[^)]*\)/gi, '')
                    .trim());
                
                if (fuzzyVideoNorm === trackOnlyFuzzy) {
                    bestScore = 0.65;
                    bestMatch = { ...track, isUncertain: true };
                    return;
                }
            }
            
            // Fallback: check if video contains track title
            if (cleanTitle.includes(cleanTrack) || cleanTrack.includes(cleanTitle)) {
                const score = Math.min(cleanTrack.length, cleanTitle.length) / Math.max(cleanTrack.length, cleanTitle.length) * 0.8;
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = track;
                }
            }
        });
        
        return bestScore > 0.5 ? bestMatch : null;
    };

    const reorderVideos = (startIndex, endIndex) => {
        const newVideos = [...videos];
        const [removed] = newVideos.splice(startIndex, 1);
        newVideos.splice(endIndex, 0, removed);
        setVideos(newVideos);
    };

    const saveVideoOrder = () => {
        if (!release?.id) return;
        localStorage.setItem(`video-order-${release.id}`, JSON.stringify(videos.map(v => v.id)));
        setStatus({ type: 'loading', message: 'Video order saved!' });
        setTimeout(() => setStatus({ type: '', message: '' }), 2000);
    };

    const updateRating = async (newRating) => {
        if (!collectionItem?.instance_id || !token) {
            showWarningModal('Token required to update rating. Get yours at https://www.discogs.com/settings/developers');
            return;
        }

        try {
            const url = `https://api.discogs.com/users/${username}/collection/folders/0/releases/${collectionItem.id}/instances/${collectionItem.instance_id}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'User-Agent': 'DiscogsCollectionVideoPlayer/1.0',
                    'Authorization': `Discogs token=${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ rating: newRating })
            });

            if (response.ok) {
                setRating(newRating);
                setRatingStatus('Rating saved!');
                setTimeout(() => setRatingStatus(''), 2000);
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        } catch (error) {
            setRatingStatus(`Failed to save: ${error.message}`);
            setTimeout(() => setRatingStatus(''), 3000);
        }
    };

    const updateCondition = async (fieldId, value) => {
        if (!collectionItem?.instance_id || !token) {
            showWarningModal('Token required to update conditions. Get yours at https://www.discogs.com/settings/developers');
            return;
        }
        
        try {
            const url = `https://api.discogs.com/users/${username}/collection/folders/0/releases/${collectionItem.id}/instances/${collectionItem.instance_id}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'User-Agent': 'DiscogsCollectionVideoPlayer/1.0',
                    'Authorization': `Discogs token=${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ [`notes[${fieldId}]`]: value })
            });

            if (response.ok) {
                // Update local state
                const updatedNotes = [...(collectionItem.notes || [])];
                const noteIndex = updatedNotes.findIndex(n => n.field_id === fieldId);
                if (noteIndex >= 0) {
                    updatedNotes[noteIndex].value = value;
                } else {
                    updatedNotes.push({ field_id: fieldId, value });
                }
                setCollectionItem({ ...collectionItem, notes: updatedNotes });
            }
        } catch (error) {
            console.error('Failed to update condition:', error);
        }
    };

    const conditionOptions = ['Generic', 'No Cover', 'Mint (M)', 'Near Mint (NM or M-)', 'Very Good Plus (VG+)', 'Very Good (VG)', 'Good Plus (G+)', 'Good (G)', 'Fair (F)', 'Poor (P)', 'Not specified'];

    const loadSavedOrder = (extractedVideos, releaseId) => {
        if (!releaseId) return extractedVideos;
        const savedOrder = localStorage.getItem(`video-order-${releaseId}`);
        if (!savedOrder) return extractedVideos;
        
        try {
            const orderIds = JSON.parse(savedOrder);
            const orderedVideos = [];
            const remainingVideos = [...extractedVideos];
            
            orderIds.forEach(id => {
                const videoIndex = remainingVideos.findIndex(v => v.id === id);
                if (videoIndex !== -1) {
                    orderedVideos.push(remainingVideos.splice(videoIndex, 1)[0]);
                }
            });
            
            return [...orderedVideos, ...remainingVideos];
        } catch {
            return extractedVideos;
        }
    };

    const formatArtistName = (artists) => {
        if (!artists || !Array.isArray(artists)) return 'Unknown Artist';
        
        return artists.map(artist => {
            const name = artist.anv || artist.name;
            const join = artist.join || '';
            return join ? `${name} ${join}` : name;
        }).join(' ').trim();
    };

    const modalData = {
        terms: termsContent,
        privacy: privacyContent,
        legal: legalContent
    };

    const openModal = (type) => {
        setModalContent(modalData[type]);
    };

    const closeModal = () => {
        setModalContent(null);
    };

    const showWarningModal = (message) => {
        setWarningModal(message);
    };

    const closeWarningModal = () => {
        setWarningModal(null);
    };

    const testMarketplaceAPI = async () => {
        console.log('Testing marketplace search API for release 183002...');
        try {
            const search = await fetchDiscogs('https://api.discogs.com/marketplace/search?release_id=183002', token || null);
            console.log('Marketplace search response:', JSON.stringify(search, null, 2));
        } catch (error) {
            console.error('API test failed:', error);
        }
    };

    const loadTestRelease = async () => {
        setLoading(true);
        setRelease(null);
        setVideos([]);
        setStatus({ type: 'loading', message: 'Loading test release...' });
        
        try {
            const releaseDetails = await getReleaseDetails(24100004, token || null);
            const extractedVideos = extractYouTubeVideos(releaseDetails);
            
            setRelease(releaseDetails);
            setVideos(loadSavedOrder(extractedVideos, releaseDetails.id));
            setCollectionItem({ rating: 0, notes: [] });
            setRating(0);
            setStatus({ type: '', message: '' });
        } catch (error) {
            setStatus({ type: 'error', message: `Error loading test release: ${error.message}` });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
        <div className="container">
            <div className="header">
                <div className="header-controls">
                    <h1 style={{whiteSpace: 'nowrap'}}>🎵 Discogs Video Player</h1>
                    <div className="controls">
                        <div className="user-row">
                            <div className="input-group">
                                <label htmlFor="username">Username:</label>
                                <input
                                    type="text"
                                    id="username"
                                    value={username}
                                    onChange={(e) => {
                                        setUsername(e.target.value);
                                        localStorage.setItem('discogs-username', e.target.value);
                                    }}
                                    placeholder="Username"
                                />
                            </div>
                        <button 
                            className="btn" 
                            onClick={getRandomReleaseWithVideos}
                            disabled={loading}
                        >
                            {loading ? '🔄 Searching...' : '🎲 Random'}
                        </button>
                    </div>
                    <div className="mode-row">
                        <div className="button-group" style={{display: 'flex', gap: '8px'}}>
                            <button 
                                className={`toggle-btn ${mode === 'collection' ? 'active' : ''}`}
                                onClick={() => {setMode('collection'); localStorage.setItem('discogs-collection-type', 'collection'); setCollectionCache(null);}}
                                disabled={loading}
                            >
                                📚 Collection
                            </button>
                            <button 
                                className={`toggle-btn ${mode === 'wantlist' ? 'active' : ''}`}
                                onClick={() => {setMode('wantlist'); localStorage.setItem('discogs-collection-type', 'wantlist'); setCollectionCache(null);}}
                                disabled={loading}
                            >
                                ❤️ Wantlist
                            </button>
                        </div>
                        </div>
                        <div className="token-row" style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                            <label htmlFor="token" style={{fontSize: '0.75rem', fontWeight: '600', color: '#555', whiteSpace: 'nowrap'}}>API Token:</label>
                            <input
                                type="text"
                                id="token"
                                value={token}
                                onChange={(e) => {
                                    setToken(e.target.value);
                                    localStorage.setItem('discogs-token', e.target.value);
                                }}
                                placeholder="Token"
                                style={{width: '110px', padding: '4px 6px', border: '1px solid #e1e5e9', borderRadius: '4px', fontSize: '10px'}}
                            />
                        </div>
                        {mode === 'wantlist' && !token.trim() && (
                            <div style={{fontSize: '0.7rem', color: '#e74c3c', textAlign: 'center', marginTop: '4px'}}>
                                ⚠️ Token required for wantlist - <a href="https://www.discogs.com/settings/developers" target="_blank" rel="noopener noreferrer" style={{color: '#e74c3c', textDecoration: 'underline'}}>Get token</a>
                            </div>
                        )}
                        {DEBUG_MODE && (
                            <div className="button-row">
                                <button 
                                    className="btn" 
                                    onClick={loadTestRelease}
                                    disabled={loading}
                                    style={{background: '#e67e22'}}
                                >
                                    🧪 Test
                                </button>
                                <button 
                                    className="btn" 
                                    onClick={testMarketplaceAPI}
                                    disabled={loading}
                                    style={{background: '#3498db', marginLeft: '5px'}}
                                >
                                    📊 API Test
                                </button>
                            </div>
                        )}
                        <div className="options-row">
                            <div className="checkbox-group">
                                <input 
                                    type="checkbox" 
                                    id="autoplay" 
                                    checked={autoplay} 
                                    onChange={(e) => {
                                        setAutoplay(e.target.checked);
                                        localStorage.setItem('autoplay', e.target.checked);
                                    }}
                                />
                                <label htmlFor="autoplay">Autoplay</label>
                            </div>
                            <div className="checkbox-group">
                                <input 
                                    type="checkbox" 
                                    id="shuffle" 
                                    checked={shuffle} 
                                    onChange={(e) => {
                                        setShuffle(e.target.checked);
                                        localStorage.setItem('shuffle', e.target.checked);
                                    }}
                                />
                                <label htmlFor="shuffle">Shuffle</label>
                            </div>
                            <div className="checkbox-group">
                                <input 
                                    type="checkbox" 
                                    id="continuous" 
                                    checked={continuousPlay} 
                                    onChange={(e) => {
                                        setContinuousPlay(e.target.checked);
                                        localStorage.setItem('continuousPlay', e.target.checked);
                                    }}
                                />
                                <label htmlFor="continuous">Continuous</label>
                            </div>
                            <div className="checkbox-group">
                                <input 
                                    type="checkbox" 
                                    id="randomNext" 
                                    checked={randomNext} 
                                    onChange={(e) => {
                                        setRandomNext(e.target.checked);
                                        localStorage.setItem('randomNext', e.target.checked);
                                    }}
                                />
                                <label htmlFor="randomNext">Random Next</label>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="header-release">
                    {release ? (
                        <div className="header-release-title">
                            <span style={{color: '#667eea', fontWeight: '500'}}>
                                {formatArtistName(release.artists)}
                            </span>
                            <span style={{margin: '0 8px', color: '#999'}}> - </span>
                            <span>
                                {release.title || 'Unknown Title'}
                            </span>
                            <div style={{fontSize: '0.9rem', color: '#888', marginTop: '4px'}}>
                                {release.year || 'Unknown Year'} • {release.labels ? release.labels.map(l => `${l.name}${l.catno ? ` (${l.catno})` : ''}`).join(', ') : 'Unknown Label'}
                            </div>
                        </div>
                    ) : (
                        <div className="header-release-title" style={{color: '#999'}}>
                            No release selected
                        </div>
                    )}
                    {status.message && (
                        <div className={`status ${status.type}`} style={{textAlign: 'center', marginTop: '10px', color: '#333'}}>
                            {status.message}
                        </div>
                    )}
                </div>
                
                <div className="header-cover">
                    {release && release.images && release.images.length > 0 ? (
                        <img 
                            src={release.images[0].uri} 
                            alt="Release cover"
                            className="cover-art"
                            onClick={() => {
                                setImageModal(release.images);
                                setCurrentImageIndex(0);
                            }}
                            onLoad={() => {
                                // Create new background element
                                const newBgElement = document.createElement('div');
                                newBgElement.className = 'blurred-background';
                                newBgElement.style.cssText = `
                                    position: fixed;
                                    top: -10%;
                                    left: -10%;
                                    width: 120%;
                                    height: 120%;
                                    background-image: url(${release.images[0].uri});
                                    background-size: cover;
                                    background-position: center;
                                    background-repeat: no-repeat;
                                    filter: blur(20px);
                                    z-index: -2;
                                    pointer-events: none;
                                    opacity: 0;
                                `;
                                document.body.appendChild(newBgElement);
                                
                                // Fade in new background
                                setTimeout(() => {
                                    newBgElement.style.opacity = '1';
                                }, 50);
                                
                                // Remove old background after transition
                                const existingBgs = document.querySelectorAll('.blurred-background');
                                if (existingBgs.length > 1) {
                                    setTimeout(() => {
                                        existingBgs[0].remove();
                                    }, 1000);
                                }
                                
                                // Add overlay for better readability
                                const overlay = document.querySelector('.background-overlay') || document.createElement('div');
                                overlay.className = 'background-overlay';
                                overlay.style.cssText = `
                                    position: fixed;
                                    top: 0;
                                    left: 0;
                                    width: 100%;
                                    height: 100%;
                                    background: rgba(0, 0, 0, 0.4);
                                    z-index: -1;
                                    pointer-events: none;
                                `;
                                if (!document.querySelector('.background-overlay')) {
                                    document.body.appendChild(overlay);
                                }
                                
                                // Reset body styles
                                document.body.style.background = 'transparent';
                                document.body.style.filter = 'none';
                                document.body.style.transform = 'none';
                            }}
                        />
                    ) : (
                        <div className="cover-placeholder">
                            No Cover
                        </div>
                    )}
                </div>
            </div>

            {release && (
                <div className="release-card">

                    <div className="release-content">
                        <div className="release-info">
                            <div className="info-section">
                                <h3>Release Details</h3>
                                <div className="info-item">
                                    <span className="info-label">Format:</span>
                                    <span className="info-value">{getUniqueFormats(release.formats)}</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Country:</span>
                                    <span className="info-value">{release.country || 'Unknown'}</span>
                                </div>
                                {release.styles && release.styles.length > 0 && (
                                    <div className="info-item">
                                        <span className="info-label">Styles:</span>
                                        <div className="styles-list">
                                            {release.styles.map((style, index) => (
                                                <span key={index} className="style-tag">{style}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="info-item">
                                    <span className="info-label">Discogs:</span>
                                    <span className="info-value">
                                        <a href={`https://www.discogs.com/release/${release.id}`} target="_blank" rel="noopener noreferrer" className="discogs-link">
                                            View on Discogs
                                        </a>
                                    </span>
                                </div>
                            </div>

                            {currentReleaseMode === 'wantlist' ? (
                                <div className="info-section">
                                    <h3>Wantlist Info</h3>
                                    <div className="info-item">
                                        <span className="info-label">Added:</span>
                                        <span className="info-value">{collectionItem?.date_added ? new Date(collectionItem.date_added).toLocaleDateString() : 'Unknown'}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">For Sale:</span>
                                        <span className="info-value">
                                            {marketplaceData !== null ? (
                                                marketplaceData.blocked ? 'Blocked from sale' :
                                                marketplaceData.forSale > 0 ? (
                                                    <>
                                                        <a href={`https://www.discogs.com/sell/release/${release.id}`} target="_blank" rel="noopener noreferrer" className="discogs-link">
                                                            {marketplaceData.forSale} copies
                                                        </a>
                                                        {marketplaceData.lowestPrice && (
                                                            <> from {marketplaceData.lowestPrice.value.toFixed(2)} ({marketplaceData.lowestPrice.currency})</>
                                                        )}
                                                    </>
                                                ) : 'Not currently for sale'
                                            ) : 'Loading...'}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="info-section">
                                    <h3>Collection Info</h3>
                                    <div className="info-item">
                                        <span className="info-label">Media:</span>
                                        <select 
                                            className={`condition-select ${getConditionValue(collectionItem?.notes, 1) === 'Not specified' ? 'not-specified' : ''}`}
                                            value={getConditionValue(collectionItem?.notes, 1)}
                                            onChange={(e) => updateCondition(1, e.target.value)}
                                        >
                                            {conditionOptions.map(option => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Sleeve:</span>
                                        <select 
                                            className={`condition-select ${getConditionValue(collectionItem?.notes, 2) === 'Not specified' ? 'not-specified' : ''}`}
                                            value={getConditionValue(collectionItem?.notes, 2)}
                                            onChange={(e) => updateCondition(2, e.target.value)}
                                        >
                                            {conditionOptions.map(option => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {getNotes(collectionItem?.notes) && (
                                        <div className="info-item">
                                            <span className="info-label">Notes:</span>
                                            <span className="info-value">{getNotes(collectionItem?.notes)}</span>
                                        </div>
                                    )}
                                    <div className="info-item">
                                        <span className="info-label">Rating:</span>
                                        <div className="rating-container">
                                            <div className="rating-row">
                                                <div className={`star-rating ${rating === 0 ? 'no-rating' : ''}`}>
                                                    {[1, 2, 3, 4, 5].map(star => (
                                                        <span
                                                            key={star}
                                                            className={`star ${star <= rating ? 'filled' : ''}`}
                                                            onClick={() => updateRating(star)}
                                                        >
                                                            ★
                                                        </span>
                                                    ))}
                                                </div>
                                                <span className="info-value">({rating}/5)</span>
                                            </div>
                                            <div className="rating-status">{ratingStatus}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {release.tracklist && release.tracklist.length > 0 && (
                                <div className="info-section">
                                    <h3>Tracklist</h3>
                                    <ul className="tracklist">
                                        {release.tracklist.map((track, index) => (
                                            <li key={index}>
                                                <div>
                                                    <span className="track-position">{track.position}</span>
                                                    <span className="track-title">
                                                        {track.artists && track.artists.length > 0 
                                                            ? `${formatArtistName(track.artists)} - ${track.title}`
                                                            : track.title
                                                        }
                                                    </span>
                                                </div>
                                                {track.duration && (
                                                    <span className="track-duration">{track.duration}</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {videos.length > 0 && (
                            <div className="videos-section">
                                <div className="videos-header">
                                    <h3>🎥 Videos ({videos.length})</h3>
                                    <div>
                                        <button 
                                            className="save-order-btn" 
                                            onClick={saveVideoOrder}
                                        >
                                            💾 Save Order
                                        </button>
                                        <button 
                                            className="refresh-btn" 
                                            onClick={refreshCurrentRelease}
                                            disabled={loading}
                                        >
                                            🔄 Refresh
                                        </button>
                                    </div>
                                </div>
                                <div className="video-grid">
                                    {videos.map((video, index) => {
                                        const matchedTrack = matchVideoToTrack(video.title, release.tracklist);
                                        return (
                                            <div 
                                                key={video.id} 
                                                className="video-item"
                                                draggable
                                                onDragStart={(e) => {
                                                    e.dataTransfer.setData('text/plain', index);
                                                    e.currentTarget.classList.add('dragging');
                                                }}
                                                onDragEnd={(e) => {
                                                    e.currentTarget.classList.remove('dragging');
                                                }}
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.currentTarget.classList.add('drag-over');
                                                }}
                                                onDragLeave={(e) => {
                                                    e.currentTarget.classList.remove('drag-over');
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    e.currentTarget.classList.remove('drag-over');
                                                    const dragIndex = parseInt(e.dataTransfer.getData('text/plain'));
                                                    if (dragIndex !== index) {
                                                        reorderVideos(dragIndex, index);
                                                    }
                                                }}
                                            >
                                                <div className="video-header">
                                                    <div className="video-title">{video.title}</div>
                                                    <div className="track-match">
                                                        {matchedTrack ? (
                                                            <span style={{color: matchedTrack.isUncertain ? '#ff9800' : '#667eea'}}>
                                                                {matchedTrack.isUncertain ? '❓ ' : '♪ '}
                                                                {matchedTrack.position} - {matchedTrack.artists && matchedTrack.artists.length > 0 
                                                                    ? `${formatArtistName(matchedTrack.artists)} - ${matchedTrack.title}`
                                                                    : matchedTrack.title
                                                                }
                                                            </span>
                                                        ) : (
                                                            <span style={{visibility: 'hidden'}}>♪ Placeholder</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <iframe
                                                    id={`iframe-${video.id}`}
                                                    className="video-iframe"
                                                    src={`https://www.youtube.com/embed/${video.id}?enablejsapi=1&origin=${encodeURIComponent(window.location.protocol + '//' + window.location.host)}`}
                                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                    allowFullScreen
                                                ></iframe>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
        
        <footer className="footer">
            <div className="footer-content">
                <span id="copyright-year">© 2025 Discogs Video Player</span>
                <span>•</span>
                <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); openModal('terms'); }}>Terms of Service</a>
                <span>•</span>
                <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); openModal('privacy'); }}>Privacy Policy</a>
                <span>•</span>
                <a href="#" className="footer-link" onClick={(e) => { e.preventDefault(); openModal('legal'); }}>Legal</a>
            </div>
        </footer>
        
        {modalContent && (
            <div className="modal-overlay" onClick={closeModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h1 className="modal-title">{modalContent.title}</h1>
                        <button className="modal-close" onClick={closeModal}>×</button>
                    </div>
                    <div className="modal-body">
                        {modalContent.content}
                    </div>
                </div>
            </div>
        )}
        
        {warningModal && (
            <div className="modal-overlay" onClick={closeWarningModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '500px'}}>
                    <div className="modal-header">
                        <h1 className="modal-title">⚠️ Token Required</h1>
                        <button className="modal-close" onClick={closeWarningModal}>×</button>
                    </div>
                    <div className="modal-body">
                        <p>
                            {warningModal.replace(' Get yours at https://www.discogs.com/settings/developers', '')} Get yours at{' '}
                            <a href="https://www.discogs.com/settings/developers" target="_blank" rel="noopener noreferrer">
                                https://www.discogs.com/settings/developers
                            </a>
                        </p>
                        <div style={{textAlign: 'center', marginTop: '20px'}}>
                            <button className="btn" onClick={closeWarningModal}>OK</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        {imageModal && (
            <div className="modal-overlay" onClick={() => setImageModal(null)}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{width: '40%', maxHeight: '90vh', padding: '0', position: 'relative'}}>
                    <div className="modal-header" style={{padding: '15px'}}>
                        <button className="modal-close" onClick={() => setImageModal(null)}>×</button>
                    </div>
                    <img src={imageModal[currentImageIndex].uri} alt="Release cover" style={{width: '100%', height: 'auto', display: 'block'}} />
                    {imageModal.length > 1 && (
                        <>
                            <button 
                                onClick={() => setCurrentImageIndex(prev => prev > 0 ? prev - 1 : imageModal.length - 1)}
                                style={{position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', padding: '10px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px'}}
                            >
                                ←
                            </button>
                            <button 
                                onClick={() => setCurrentImageIndex(prev => prev < imageModal.length - 1 ? prev + 1 : 0)}
                                style={{position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none', padding: '10px', borderRadius: '50%', cursor: 'pointer', fontSize: '18px'}}
                            >
                                →
                            </button>
                        </>
                    )}
                </div>
            </div>
        )}
        </>
    );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);