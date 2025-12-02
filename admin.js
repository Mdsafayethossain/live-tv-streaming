class AdminPanel {
    constructor() {
        this.channels = [];
        this.editingChannelId = null;
        this.storageKey = 'liveTVChannels';
        this.activityKey = 'adminActivity';
        this.backupKey = 'backupHistory';
        this.init();
    }

    init() {
        this.loadChannels();
        this.setupEventListeners();
        this.showPage('dashboard');
        this.updateStats();
        this.setupValidation();
    }

    loadChannels() {
        try {
            const savedChannels = localStorage.getItem(this.storageKey);
            this.channels = savedChannels ? JSON.parse(savedChannels) : [];
            this.updateChannelCount();
        } catch (error) {
            console.error('Error loading channels:', error);
            this.channels = [];
            this.showMessage('Error loading channels', 'error');
        }
    }

    saveChannels() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.channels));
            this.updateChannelCount();
            this.logActivity('Channels updated', 'Channels were successfully saved');
            return true;
        } catch (error) {
            console.error('Error saving channels:', error);
            this.showMessage('Error saving channels', 'error');
            return false;
        }
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const page = e.currentTarget.dataset.page;
                this.showPage(page);
            });
        });

        // Channel form
        document.getElementById('channelForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveChannel();
        });

        // Search and filter
        document.getElementById('searchChannels').addEventListener('input', () => this.filterChannels());
        document.getElementById('filterCategory').addEventListener('change', () => this.filterChannels());
        document.getElementById('filterType').addEventListener('change', () => this.filterChannels());

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                window.location.href = 'index.html';
            }
        });

        // Menu toggle for mobile
        document.querySelector('.menu-toggle')?.addEventListener('click', () => {
            document.querySelector('.sidebar').classList.toggle('active');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 1024) {
                const sidebar = document.querySelector('.sidebar');
                const menuToggle = document.querySelector('.menu-toggle');
                
                if (sidebar.classList.contains('active') && 
                    !sidebar.contains(e.target) && 
                    !menuToggle.contains(e.target)) {
                    sidebar.classList.remove('active');
                }
            }
        });

        // Import file change
        document.getElementById('importFile').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.previewImportFile(file);
            }
        });
    }

    setupValidation() {
        const channelUrl = document.getElementById('channelUrl');
        if (channelUrl) {
            channelUrl.addEventListener('blur', () => {
                this.validateUrl(channelUrl.value);
            });
        }
    }

    validateUrl(url) {
        if (!url) return true;
        
        // YouTube URL patterns
        const youtubePatterns = [
            /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/,
            /^https?:\/\/www\.youtube\.com\/embed\/[^/]+/,
            /^https?:\/\/youtu\.be\/[^/]+/
        ];

        // Facebook URL patterns
        const facebookPatterns = [
            /^(https?:\/\/)?(www\.)?facebook\.com\/.+/,
            /^https?:\/\/www\.facebook\.com\/plugins\/video\.php\?.+/
        ];

        const isYouTube = youtubePatterns.some(pattern => pattern.test(url));
        const isFacebook = facebookPatterns.some(pattern => pattern.test(url));

        if (!isYouTube && !isFacebook) {
            this.showMessage('Please enter a valid YouTube or Facebook URL', 'warning');
            return false;
        }

        return true;
    }

    showPage(pageName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.page === pageName) {
                item.classList.add('active');
            }
        });

        // Update pages
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        document.getElementById(pageName).classList.add('active');

        // Update page title
        const titles = {
            'dashboard': 'Dashboard',
            'channels': 'Manage Channels',
            'add-channel': 'Add Channel',
            'settings': 'Settings',
            'backup': 'Backup & Restore'
        };
        document.getElementById('pageTitle').textContent = titles[pageName] || 'Admin Panel';

        // Load page data
        switch (pageName) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'channels':
                this.renderChannelsTable();
                break;
            case 'backup':
                this.loadBackupHistory();
                break;
        }
    }

    updateDashboard() {
        this.updateStats();
        this.loadRecentActivity();
    }

    updateStats() {
        const youtubeCount = this.channels.filter(c => c.type === 'youtube').length;
        const facebookCount = this.channels.filter(c => c.type === 'facebook').length;
        const categories = [...new Set(this.channels.map(c => c.category))].length;
        
        document.getElementById('youtubeStats').textContent = youtubeCount;
        document.getElementById('facebookStats').textContent = facebookCount;
        document.getElementById('categoryStats').textContent = categories;
        document.getElementById('totalStats').textContent = this.channels.length;
    }

    updateChannelCount() {
        const badge = document.getElementById('channelCount');
        if (badge) {
            badge.textContent = this.channels.length;
        }
    }

    loadRecentActivity() {
        const container = document.getElementById('activityList');
        const activities = JSON.parse(localStorage.getItem(this.activityKey) || '[]');
        
        if (!activities.length) {
            container.innerHTML = '<div class="empty-state">No recent activity</div>';
            return;
        }

        const activityItems = activities.slice(-5).reverse().map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="fas fa-${activity.icon || 'bell'}"></i>
                </div>
                <div class="activity-info">
                    <h4>${activity.title}</h4>
                    <p>${activity.description}</p>
                    <small>${new Date(activity.timestamp).toLocaleString()}</small>
                </div>
            </div>
        `).join('');

        container.innerHTML = activityItems;
    }

    logActivity(title, description, icon = 'bell') {
        const activities = JSON.parse(localStorage.getItem(this.activityKey) || '[]');
        
        activities.push({
            title,
            description,
            icon,
            timestamp: new Date().toISOString()
        });

        // Keep only last 50 activities
        if (activities.length > 50) {
            activities.splice(0, activities.length - 50);
        }

        localStorage.setItem(this.activityKey, JSON.stringify(activities));
        this.loadRecentActivity();
    }

    renderChannelsTable() {
        const container = document.getElementById('channelsTableBody');
        const searchTerm = document.getElementById('searchChannels').value.toLowerCase();
        const categoryFilter = document.getElementById('filterCategory').value;
        const typeFilter = document.getElementById('filterType').value;

        let filteredChannels = this.channels.filter(channel => {
            const matchesSearch = !searchTerm || 
                channel.name.toLowerCase().includes(searchTerm) ||
                channel.description?.toLowerCase().includes(searchTerm);
            
            const matchesCategory = categoryFilter === 'all' || channel.category === categoryFilter;
            const matchesType = typeFilter === 'all' || channel.type === typeFilter;
            
            return matchesSearch && matchesCategory && matchesType;
        });

        if (!filteredChannels.length) {
            container.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-tv"></i>
                        <p>No channels found</p>
                    </td>
                </tr>
            `;
            return;
        }

        const rows = filteredChannels.map(channel => `
            <tr>
                <td>
                    <div class="channel-info">
                        <strong>${channel.name}</strong>
                        <small>${channel.description || 'No description'}</small>
                    </div>
                </td>
                <td>
                    <span class="channel-type ${channel.type}">
                        <i class="fab fa-${channel.type === 'youtube' ? 'youtube' : 'facebook'}"></i>
                        ${channel.type}
                    </span>
                </td>
                <td>
                    <span class="channel-category">${channel.category}</span>
                </td>
                <td>
                    <span class="status-badge status-${channel.status || 'active'}">
                        ${channel.status || 'Active'}
                    </span>
                </td>
                <td>
                    ${new Date(channel.createdAt).toLocaleDateString()}
                </td>
                <td>
                    <div class="table-actions">
                        <button class="btn-edit" onclick="adminPanel.editChannel(${channel.id})">
                            <i class="fas fa-edit"></i> Edit
                        </button>
                        <button class="btn-delete" onclick="adminPanel.confirmDelete(${channel.id})">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        container.innerHTML = rows;
    }

    filterChannels() {
        this.renderChannelsTable();
    }

    saveChannel() {
        const channelData = {
            id: this.editingChannelId || Date.now(),
            name: document.getElementById('channelName').value.trim(),
            url: document.getElementById('channelUrl').value.trim(),
            type: document.getElementById('channelType').value,
            category: document.getElementById('channelCategory').value,
            description: document.getElementById('channelDescription').value.trim(),
            status: document.getElementById('channelStatus').value,
            createdAt: this.editingChannelId 
                ? this.channels.find(c => c.id === this.editingChannelId)?.createdAt 
                : new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Validate URL
        if (!this.validateUrl(channelData.url)) {
            return;
        }

        if (this.editingChannelId) {
            // Update existing channel
            const index = this.channels.findIndex(c => c.id === this.editingChannelId);
            if (index !== -1) {
                this.channels[index] = channelData;
            }
            this.logActivity('Channel Updated', `Updated channel: ${channelData.name}`, 'edit');
            this.showMessage('Channel updated successfully!', 'success');
        } else {
            // Add new channel
            this.channels.push(channelData);
            this.logActivity('Channel Added', `Added new channel: ${channelData.name}`, 'plus-circle');
            this.showMessage('Channel added successfully!', 'success');
        }

        // Save to storage
        if (this.saveChannels()) {
            // Reset form and update UI
            this.resetForm();
            this.updateStats();
            this.renderChannelsTable();
            this.showPage('channels');
        }
    }

    editChannel(channelId) {
        const channel = this.channels.find(c => c.id === channelId);
        if (!channel) return;

        this.editingChannelId = channelId;
        
        // Fill form
        document.getElementById('channelName').value = channel.name;
        document.getElementById('channelUrl').value = channel.url;
        document.getElementById('channelType').value = channel.type;
        document.getElementById('channelCategory').value = channel.category;
        document.getElementById('channelDescription').value = channel.description || '';
        document.getElementById('channelStatus').value = channel.status || 'active';

        // Update form title
        document.querySelector('#add-channel h2').innerHTML = 
            '<i class="fas fa-edit"></i> Edit Channel';

        // Show add-channel page
        this.showPage('add-channel');
    }

    confirmDelete(channelId) {
        this.channelToDelete = channelId;
        const modal = document.getElementById('deleteModal');
        modal.style.display = 'flex';
        
        // Set up delete confirmation
        document.getElementById('confirmDelete').onclick = () => {
            this.deleteChannel(this.channelToDelete);
            modal.style.display = 'none';
        };
    }

    deleteChannel(channelId) {
        const channel = this.channels.find(c => c.id === channelId);
        if (!channel) return;

        this.channels = this.channels.filter(c => c.id !== channelId);
        
        if (this.saveChannels()) {
            this.logActivity('Channel Deleted', `Deleted channel: ${channel.name}`, 'trash');
            this.showMessage('Channel deleted successfully!', 'success');
            this.updateStats();
            this.renderChannelsTable();
        }
    }

    resetForm() {
        document.getElementById('channelForm').reset();
        this.editingChannelId = null;
        document.querySelector('#add-channel h2').innerHTML = 
            '<i class="fas fa-plus-circle"></i> Add New Channel';
    }

    showAddChannel() {
        this.resetForm();
        this.showPage('add-channel');
    }

    exportChannels() {
        const dataStr = JSON.stringify(this.channels, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `channels-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        this.logActivity('Data Exported', 'All channels exported to JSON file', 'download');
        this.showMessage('Channels exported successfully!', 'success');
    }

    importChannels() {
        document.getElementById('importFile').click();
    }

    previewImportFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const importedChannels = JSON.parse(e.target.result);
                
                if (!Array.isArray(importedChannels)) {
                    throw new Error('Invalid file format');
                }
                
                // Validate each channel
                const validChannels = importedChannels.filter(channel => 
                    channel.name && channel.url && channel.type && channel.category
                );
                
                if (validChannels.length === 0) {
                    throw new Error('No valid channels found in file');
                }
                
                // Show confirmation
                if (confirm(`Import ${validChannels.length} channels? This will replace your current channels.`)) {
                    this.channels = validChannels;
                    if (this.saveChannels()) {
                        this.logActivity('Data Imported', `Imported ${validChannels.length} channels from file`, 'upload');
                        this.showMessage(`${validChannels.length} channels imported successfully!`, 'success');
                        this.updateStats();
                        this.renderChannelsTable();
                        this.saveBackupRecord(validChannels.length);
                    }
                }
            } catch (error) {
                this.showMessage('Error importing file: ' + error.message, 'error');
            }
        };
        
        reader.readAsText(file);
    }

    importFromFile() {
        const fileInput = document.getElementById('importFile');
        if (fileInput.files.length > 0) {
            this.previewImportFile(fileInput.files[0]);
        }
    }

    backupData() {
        // Create backup in localStorage
        const backup = {
            channels: this.channels,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        
        localStorage.setItem('channelBackup', JSON.stringify(backup));
        
        this.logActivity('Data Backed Up', 'Local backup created successfully', 'save');
        this.showMessage('Backup created successfully!', 'success');
    }

    backupToCloud() {
        // This is a placeholder for cloud backup functionality
        // In a real implementation, you would connect to a cloud storage service
        this.showMessage('Cloud backup functionality would be implemented here', 'info');
    }

    saveBackupRecord(channelCount) {
        const history = JSON.parse(localStorage.getItem(this.backupKey) || '[]');
        
        history.push({
            type: 'import',
            channels: channelCount,
            timestamp: new Date().toISOString()
        });
        
        // Keep only last 10 records
        if (history.length > 10) {
            history.splice(0, history.length - 10);
        }
        
        localStorage.setItem(this.backupKey, JSON.stringify(history));
        this.loadBackupHistory();
    }

    loadBackupHistory() {
        const container = document.getElementById('backupHistory');
        const history = JSON.parse(localStorage.getItem(this.backupKey) || '[]');
        
        if (!history.length) {
            container.innerHTML = '<div class="empty-state">No backup history</div>';
            return;
        }

        const historyItems = history.reverse().map(record => `
            <div class="history-item">
                <div>
                    <strong>${record.type === 'import' ? 'Import' : 'Export'}</strong>
                    <small>${record.channels} channels</small>
                </div>
                <div>
                    ${new Date(record.timestamp).toLocaleString()}
                </div>
            </div>
        `).join('');

        container.innerHTML = historyItems;
    }

    clearAllData() {
        if (confirm('Are you sure you want to clear ALL data? This cannot be undone!')) {
            localStorage.removeItem(this.storageKey);
            localStorage.removeItem(this.activityKey);
            localStorage.removeItem(this.backupKey);
            
            this.channels = [];
            this.updateStats();
            this.renderChannelsTable();
            this.loadRecentActivity();
            this.loadBackupHistory();
            
            this.logActivity('Data Cleared', 'All data was cleared from storage', 'trash');
            this.showMessage('All data cleared successfully!', 'success');
        }
    }

    refreshData() {
        this.loadChannels();
        this.updateDashboard();
        this.showMessage('Data refreshed successfully!', 'success');
    }

    showMessage(message, type = 'info') {
        const title = type.charAt(0).toUpperCase() + type.slice(1);
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 
                    type === 'warning' ? 'exclamation-triangle' : 'info-circle';
        
        document.getElementById('messageTitle').innerHTML = 
            `<i class="fas fa-${icon}"></i> ${title}`;
        document.getElementById('messageText').textContent = message;
        document.getElementById('messageModal').style.display = 'flex';
    }

    closeMessage() {
        document.getElementById('messageModal').style.display = 'none';
    }

    closeModal() {
        document.getElementById('deleteModal').style.display = 'none';
        this.channelToDelete = null;
    }
}

// Initialize admin panel
const adminPanel = new AdminPanel();
window.adminPanel = adminPanel;

// Add global helper functions
window.validateYouTubeUrl = (url) => {
    const patterns = [
        /^(https?:\/\/)?(www\.)?youtube\.com\/watch\?v=[^&]+/,
        /^(https?:\/\/)?(www\.)?youtu\.be\/[^&]+/,
        /^(https?:\/\/)?(www\.)?youtube\.com\/embed\/[^&]+/
    ];
    return patterns.some(pattern => pattern.test(url));
};

window.validateFacebookUrl = (url) => {
    const patterns = [
        /^(https?:\/\/)?(www\.)?facebook\.com\/[^/]+\/videos\/[^/]+\//,
        /^(https?:\/\/)?(www\.)?facebook\.com\/video\.php\?v=\d+/
    ];
    return patterns.some(pattern => pattern.test(url));
};