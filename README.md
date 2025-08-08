# Discogs Collection Video Player

A web application that randomly selects releases from your Discogs collection and plays their corresponding YouTube videos with automated playback controls.

## Features

- Random release selection from your Discogs collection
- YouTube video integration with single-video playback control
- Automated playback options (Autoplay, Shuffle, Continuous Play, Random Next)
- Rating system and condition tracking
- Drag-and-drop video ordering with persistent storage
- Artist name formatting with proper ANV (Artist Name Variation) support
- Responsive design optimized for laptop screens
- Persistent user preferences (username, token, playback settings)
- Smooth crossfade background transitions using release cover art
- Fixed-size buttons prevent UI jumping during state changes
- Musical notes favicon (🎵)

## Setup

1. Open [https://galleleo.github.io](https://galleleo.github.io/) in a web browser
2. Enter your Discogs username
3. (Optional) Add your Discogs API token from [https://www.discogs.com/settings/developers](https://www.discogs.com/settings/developers) for rating/condition updates
4. Configure playback options:
   - **Autoplay**: Start playing immediately when loading a release
   - **Shuffle**: Play videos in random order
   - **Continuous**: Auto-advance to next video when current ends
   - **Random Next**: Load new random release when playlist ends
5. Click "Random" to select a release or "Test" for demo content
6. Rate releases and update media/sleeve conditions
7. Drag videos to reorder and save custom arrangements

## Playback Controls

- Only one video plays at a time (prevents audio overlap)
- Sequential or shuffle playback modes
- Automatic release switching with Random Next enabled
- All preferences saved locally and persist between sessions

## Technical Features

- Blurred, scaled cover art backgrounds with smooth transitions
- React 18 with createRoot API
- YouTube iframe API integration with cross-origin support
- localStorage persistence for all user settings
- Comprehensive error handling and loading states

## Security

- No hardcoded API tokens (safe for public hosting)
- Comprehensive .gitignore with security patterns
- Pre-commit hooks prevent accidental secret commits
- Automated git template setup for all new repositories
