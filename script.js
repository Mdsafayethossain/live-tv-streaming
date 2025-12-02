class LiveTVStreamer {
    constructor() {
        this.channels = [];
        this.currentChannel = null;
        this.currentCategory = 'all';
        this.storageKey = 'liveTVChannels';
        this.init();
    }

    async init() {
        await this.loadChannels();
        this.setupEventListeners();
        this.renderChannels();
        this.updateStats();
    }

    async loadChannels() {
        try {
            // Try to load from localStorage first
            const savedChannels = localStorage.getItem(this.storageKey);
            
            if (savedChannels) {
                this.channels = JSON.parse(savedChannels);
            } else {
                // Load initial channels from JSON file
                const response = await fetch('channels.json');
                if (response.ok) {
                    this.channels = await response.json();
                    // Save to localStorage
                    localStorage.setItem(this.storageKey, JSON.stringify(this.channels));
                } else {
                    // If no JSON file, use default channels
                    this.loadDefaultChannels();
                }
            }
        } catch (error) {
            console.error('Error loading channels:', error);
            this.loadDefaultChannels();
        }
    }

    loadDefaultChannels() {
        this.channels = [
            {
                id: 1,
                name: "Lofi Girl",
                url: "https://www.youtube.com/embed/jfKfPfyJRdk",
                type: "youtube",
                category: "music",
                description: "24/7 lofi hip hop radio - beats to relax/study to",
                status: "active",
                createdAt: new Date().toISOString()
            },
            {
                id: 2,
                name: "NASA Live",
                url: "https://www.youtube.com/embed/21X5lGlDOfg",
                type: "youtube",
                category: "education",
                description: "NASA's official live stream from the International Space Station",
                status: "active",
                createdAt: new Date().toISOString()
            },
            {
                id: 3,
                name: "BBC World News",
                url: "https://www.youtube.com/embed/HN_2I4W2g14",
                type: "youtube",
                category: "news",
                description: "24/7 international news coverage",
                status: "active",
                createdAt: new Date().toISOString()
            },
            {
                id: 4,
                name: "Relaxing Nature",
                url: "https://www.youtube.com/embed/4KZ_1d5Sghc",
                type: "youtube",
                category: "entertainment",
                description: "Beautiful nature scenes with relaxing music",
                status: "active",
                createdAt: new Date().toISOString()
            }
        ];
        
        // Save to localStorage
        localStorage.setItem(this.storageKey, JSON.stringify(this.channels));
    }

    setupEventListeners() {
        // Category filter
        document.getElementById('categorySelect').addEventListener('change', (e) => {
            this.currentCategory = e.target.value;
            this.renderChannels();
        });

        // Search functionality
        document.getElementById('searchBtn').addEventListener('click', () => this.searchChannels());
        document.getElementById('searchInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchChannels();
        });

        // Fullscreen button
        document.getElementById('fullscreenBtn').addEventListener('click', () => this.toggleFullscreen());

        // Share button
        document.getElementById('shareBtn').addEventListener('click', () => this.showShareModal());

        // Share modal
        document.getElementById('closeShare').addEventListener('click', () => {
            document.getElementById('shareModal').style.display = 'none';
        });

        // Copy link button
        document.getElementById('copyBtn').addEventListener('click', () => this.copyShareLink());

        // Close modal when clicking outside
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('shareModal');
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.getElementById('shareModal').style.display = 'none';
            }
        });
    }

    renderChannels() {
        const container = document.getElementById('channelsGrid');
        
        if (!this.channels.length) {
            container.innerHTML = `
                <div class="no-channels">
                    <i class="fas fa-tv"></i>
                    <h3>No channels available</h3>
                    <p>Add channels from the admin panel</p>
                    <a href="admin.html" class="control-btn">
                        <i class="fas fa-user-cog"></i> Go to Admin Panel
                    </a>
                </div>
            `;
            return;
        }

        const filteredChannels = this.channels.filter(channel => {
            if (this.currentCategory === 'all') return true;
            return channel.category === this.currentCategory;
        });

        if (!filteredChannels.length) {
            container.innerHTML = `
                <div class="no-channels">
                    <i class="fas fa-filter"></i>
                    <h3>No channels in this category</h3>
                    <p>Try selecting a different category</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredChannels.map(channel => `
            <div class="channel-card ${this.currentChannel?.id === channel.id ? 'active' : ''}" 
                 data-id="${channel.id}"
                 onclick="tvStreamer.playChannel(${channel.id})">
                <div class="channel-header">
                    <div class="channel-name">
                        <i class="fab fa-${channel.type === 'youtube' ? 'youtube' : 'facebook'}"></i>
                        ${channel.name}
                    </div>
                    <span class="channel-category">${channel.category}</span>
                </div>
                <div class="channel-description">${channel.description}</div>
                <div class="channel-footer">
                    <small><i class="fas fa-calendar"></i> Added: ${new Date(channel.createdAt).toLocaleDateString()}</small>
                </div>
            </div>
        `).join('');
    }

    playChannel(channelId) {
        const channel = this.channels.find(c => c.id === channelId);
        if (!channel) return;

        this.currentChannel = channel;

        // Update UI
        document.getElementById('currentChannel').textContent = channel.name;
        document.getElementById('currentCategory').textContent = 
            `${channel.category.charAt(0).toUpperCase() + channel.category.slice(1)} • ${channel.type.toUpperCase()}`;

        // Remove active class from all cards
        document.querySelectorAll('.channel-card').forEach(card => {
            card.classList.remove('active');
        });

        // Add active class to selected card
        document.querySelector(`[data-id="${channel.id}"]`)?.classList.add('active');

        // Show player
        const placeholder = document.getElementById('playerPlaceholder');
        const container = document.getElementById('streamContainer');
        const player = document.getElementById('streamPlayer');

        placeholder.style.display = 'none';
        container.style.display = 'block';
        
        // Get embed URL
        const embedUrl = this.getEmbedUrl(channel.url, channel.type);
        player.src = embedUrl;

        // Update share URL
        this.updateShareUrl(channel);
    }

    getEmbedUrl(url, type) {
        // If it's already an embed URL, use it directly
        if (url.includes('/embed/') || url.includes('youtube.com/embed')) {
            return url;
        }

        try {
            if (type === 'youtube') {
                // Extract video ID from various YouTube URL formats
                const patterns = [
                    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
                    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
                    /(?:youtube\.com\/v\/)([^&\n?#]+)/
                ];

                for (const pattern of patterns) {
                    const match = url.match(pattern);
                    if (match && match[1]) {
                        return `https://www.youtube.com/embed/${match[1]}?autoplay=1&rel=0`;
                    }
                }
            } else if (type === 'facebook') {
                // Facebook video URL handling
                if (url.includes('facebook.com') && url.includes('/videos/')) {
                    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=1`;
                }
            }

            // Return original URL if no embed pattern matched
            return url;
        } catch (error) {
            console.error('Error getting embed URL:', error);
            return url;
        }
    }

    searchChannels() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        
        if (!searchTerm) {
            this.renderChannels();
            return;
        }

        const filteredChannels = this.channels.filter(channel => 
            channel.name.toLowerCase().includes(searchTerm) ||
            channel.description.toLowerCase().includes(searchTerm) ||
            channel.category.toLowerCase().includes(searchTerm)
        );

        const container = document.getElementById('channelsGrid');
        
        if (!filteredChannels.length) {
            container.innerHTML = `
                <div class="no-channels">
                    <i class="fas fa-search"></i>
                    <h3>No channels found</h3>
                    <p>Try different search terms</p>
                </div>
            `;
            return;
        }

        container.innerHTML = filteredChannels.map(channel => `
            <div class="channel-card ${this.currentChannel?.id === channel.id ? 'active' : ''}" 
                 data-id="${channel.id}"
                 onclick="tvStreamer.playChannel(${channel.id})">
                <div class="channel-header">
                    <div class="channel-name">
                        <i class="fab fa-${channel.type === 'youtube' ? 'youtube' : 'facebook'}"></i>
                        ${channel.name}
                    </div>
                    <span class="channel-category">${channel.category}</span>
                </div>
                <div class="channel-description">${channel.description}</div>
            </div>
        `).join('');
    }

    toggleFullscreen() {
        const player = document.getElementById('streamPlayer');
        if (!player.src) return;

        if (!document.fullscreenElement) {
            if (player.requestFullscreen) {
                player.requestFullscreen();
            } else if (player.webkitRequestFullscreen) {
                player.webkitRequestFullscreen();
            } else if (player.msRequestFullscreen) {
                player.msRequestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            }
        }
    }

    showShareModal() {
        if (!this.currentChannel) {
            alert('Please select a channel first');
            return;
        }

        const modal = document.getElementById('shareModal');
        modal.style.display = 'flex';
    }

    updateShareUrl(channel) {
        const baseUrl = window.location.origin + window.location.pathname;
        const shareUrl = `${baseUrl}?channel=${channel.id}`;
        
        document.getElementById('shareUrl').value = shareUrl;
        
        // Update social share links
        const text = `Watch ${channel.name} on Live TV Stream`;
        const encodedUrl = encodeURIComponent(shareUrl);
        const encodedText = encodeURIComponent(text);
        
        document.getElementById('whatsappShare').href = 
            `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        
        document.getElementById('facebookShare').href = 
            `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
    }

    async copyShareLink() {
        const shareUrl = document.getElementById('shareUrl');
        
        try {
            await navigator.clipboard.writeText(shareUrl.value);
            
            const originalText = document.getElementById('copyBtn').innerHTML;
            document.getElementById('copyBtn').innerHTML = '<i class="fas fa-check"></i> Copied!';
            document.getElementById('copyBtn').style.background = 'var(--success-color)';
            
            setTimeout(() => {
                document.getElementById('copyBtn').innerHTML = originalText;
                document.getElementById('copyBtn').style.background = '';
            }, 2000);
        } catch (err) {
            // Fallback for older browsers
            shareUrl.select();
            document.execCommand('copy');
            alert('Link copied to clipboard!');
        }
    }

    updateStats() {
        // Update any statistics if needed
        const stats = {
            totalChannels: this.channels.length,
            youtubeChannels: this.channels.filter(c => c.type === 'youtube').length,
            facebookChannels: this.channels.filter(c => c.type === 'facebook').length,
            categories: [...new Set(this.channels.map(c => c.category))].length
        };

        // You can display these stats somewhere if needed
        console.log('Channel Stats:', stats);
    }

    // Load channel from URL parameter
    loadChannelFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const channelId = urlParams.get('channel');
        
        if (channelId) {
            const channel = this.channels.find(c => c.id == channelId);
            if (channel) {
                this.playChannel(channel.id);
            }
        }
    }
}

// Initialize the app
const tvStreamer = new LiveTVStreamer();
window.tvStreamer = tvStreamer;

// Load channel from URL when page loads
window.addEventListener('DOMContentLoaded', () => {
    tvStreamer.loadChannelFromUrl();
});