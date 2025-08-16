# Discogs Collection Video Player

A web application that randomly selects releases from your Discogs collection and plays their corresponding YouTube videos with automated playback controls.

## Features

- Random release selection from your Discogs collection and wantlist
- YouTube video integration with single-video playback control
- Automated playback options (Autoplay, Shuffle, Continuous Play, Random Next)
- Rating system and condition tracking (collection only)
- Wantlist support with date added information
- Drag-and-drop video ordering with persistent storage
- Artist name formatting with proper ANV (Artist Name Variation) support
- Responsive design optimized for laptop screens
- Persistent user preferences (username, token, playback settings)
- Smooth crossfade background transitions using release cover art
- Fixed-size buttons prevent UI jumping during state changes
- Musical notes favicon (🎵)
- Modal overlays for legal pages (Terms, Privacy, Legal) that don't interrupt playback
- Warning modals for token-required actions with direct links to get API tokens

## Setup

1. Open [https://galleleo.github.io](https://galleleo.github.io/) in a web browser
2. Enter your Discogs username
3. (Optional) Add your Discogs API token from [https://www.discogs.com/settings/developers](https://www.discogs.com/settings/developers) for:
   - Rating and condition updates (collection mode)
   - Wantlist access (required for wantlist mode)
4. Choose mode: Collection or Wantlist
5. Configure playback options:
   - **Autoplay**: Start playing immediately when loading a release
   - **Shuffle**: Play videos in random order
   - **Continuous**: Auto-advance to next video when current ends
   - **Random Next**: Load new random release when playlist ends
6. Click "Random" to select a release or "Test" for demo content
7. Rate releases and update media/sleeve conditions (collection mode)
8. Drag videos to reorder and save custom arrangements

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
- Advanced track matching with fuzzy logic for remixes and bootlegs
- Intelligent title normalization (removes filler words, apostrophes, vs/versus variations)
- Support for Various Artists releases with individual track artist matching
- Uncertainty indicators for questionable matches (❓ in orange vs ♪ in blue)
- Modular CSS architecture with organized file structure
- Separate legal content files for easy maintenance

## Project Structure

```bash
├── css/
│   ├── main.css        # Core styles (body, header, footer)
│   ├── controls.css    # Buttons, inputs, checkboxes
│   ├── release.css     # Release cards, info sections
│   ├── videos.css      # Video grid, player styles
│   ├── modal.css       # Modal overlay styles
│   └── responsive.css  # Media queries
├── js/
│   ├── app.js          # Main React application
│   ├── test_videos.js  # Test video data
│   └── legal-config.js # Legal configuration
├── legal/
│   ├── terms.js        # Terms of Service content
│   ├── privacy.js      # Privacy Policy content
│   └── legal.js        # Legal Information content
└── index.html          # Main HTML file
```

## Security

- No hardcoded API tokens (safe for public hosting)
- Comprehensive .gitignore with security patterns
- Pre-commit hooks prevent accidental secret commits
- Automated git template setup for all new repositories

## Author

Created by Alexander Gallwitz - [github.com/galleleo](https://github.com/galleleo)
