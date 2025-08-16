const privacyContent = {
    title: 'Privacy Policy',
    content: (
        <>
            <h2>1. Information We Collect</h2>
            <p>We do not collect, store, or process any personal information on our servers. All data is stored locally in your browser using localStorage.</p>
            
            <h2>2. Local Storage</h2>
            <p>The following information is stored locally in your browser:</p>
            <ul>
                <li>Your Discogs username</li>
                <li>Your Discogs API token (if provided)</li>
                <li>Your playback preferences (autoplay, shuffle, etc.)</li>
                <li>Video ordering preferences for releases</li>
            </ul>
            
            <h2>3. Third-Party APIs</h2>
            <p>This service makes requests to:</p>
            <ul>
                <li><strong>Discogs API:</strong> To fetch your collection and release data</li>
                <li><strong>YouTube:</strong> To embed and play videos</li>
            </ul>
            <p>These services have their own privacy policies and data handling practices.</p>
            
            <h2>4. No Server-Side Data Storage</h2>
            <p>We do not have a backend server that stores user data. All functionality runs in your browser, and your data never leaves your device except when making API calls to Discogs and YouTube.</p>
            
            <h2>5. Cookies</h2>
            <p>We do not use cookies. All preferences are stored using browser localStorage.</p>
            
            <h2>6. Data Security</h2>
            <p>Since we don't store data on servers, your information is as secure as your local browser storage. We recommend keeping your API tokens private and not sharing them.</p>
            
            <h2>7. Changes to This Policy</h2>
            <p>As this is a hobby project, this privacy policy may be updated occasionally. Check this page for any changes.</p>
            
            <p><em>Last updated: August 16, 2025</em></p>
        </>
    )
};