const LAST_UPDATED = 'August 16, 2025';
const CURRENT_YEAR = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', function() {
    const lastUpdatedElement = document.getElementById('last-updated');
    if (lastUpdatedElement) {
        lastUpdatedElement.textContent = `Last updated: ${LAST_UPDATED}`;
    }
    
    const copyrightElement = document.getElementById('copyright-year');
    if (copyrightElement) {
        copyrightElement.textContent = `© ${CURRENT_YEAR} Discogs Video Player`;
    }
});