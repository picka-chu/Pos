/**
 * VelvetPOS - Authentication Module
 * Handles user authentication and session management
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.storeConfig = null;
        this.init();
    }
    
    init() {
        // Listen for auth state changes
        if (auth) {
            auth.onAuthStateChanged((user) => {
                this.handleAuthStateChange(user);
            });
        }
    }
    
    handleAuthStateChange(user) {
        if (user) {
            // User is signed in
            this.currentUser = user;
            this.fetchStoreConfig(user);
        } else {
            // User is signed out
            this.currentUser = null;
            this.storeConfig = null;
            
            // Redirect to login if not already there
            if (!window.location.pathname.includes('login')) {
                window.location.href = '/login';
            }
        }
    }
    
    async fetchStoreConfig(user) {
        try {
            const idToken = await user.getIdToken();
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ idToken })
            });
            
            if (response.ok) {
                const data = await response.json();
                this.storeConfig = data.store_config;
                
                // Apply store branding
                this.applyStoreBranding(this.storeConfig);
                
                // Store user info
                localStorage.setItem('velvetpos_user', JSON.stringify({
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName || data.user?.name,
                    role: data.user?.role,
                    storeId: data.user?.store_id
                }));
            }
        } catch (error) {
            console.error('Error fetching store config:', error);
        }
    }
    
    applyStoreBranding(config) {
        if (!config) return;
        
        // Apply theme color
        if (config.theme_color) {
            document.documentElement.style.setProperty('--primary-color', config.theme_color);
            document.documentElement.style.setProperty('--primary-dark', this.adjustColor(config.theme_color, -20));
        }
        
        // Apply store name
        if (config.name) {
            const storeNameEl = document.getElementById('storeName');
            if (storeNameEl) {
                storeNameEl.textContent = config.name;
            }
        }
        
        // Apply logo
        if (config.logo_url) {
            const storeLogoEl = document.getElementById('storeLogo');
            if (storeLogoEl) {
                storeLogoEl.innerHTML = `<img src="${config.logo_url}" alt="Store Logo" style="width: 100%; height: 100%;">`;
            }
        }
    }
    
    adjustColor(color, amount) {
        // Simple color adjustment
        const hex = color.replace('#', '');
        const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount));
        const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount));
        const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
    
    async login(email, password) {
        try {
            showLoading('loginBtn');
            
            // Sign in with Firebase Auth
            let userCredential;
            
            if (window.isDemoMode) {
                userCredential = await auth.signInWithEmailAndPassword(email, password);
            } else {
                userCredential = await auth.signInWithEmailAndPassword(email, password);
            }
            
            const user = userCredential.user;
            
            // Get ID token
            const idToken = await user.getIdToken();
            
            // Verify with backend
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ idToken })
            });
            
            if (response.status === 404) {
                const data = await response.json();
                if (data.needs_setup) {
                    // User exists in Auth but not in DB - create basic entry
                    await this.createInitialUser(user);
                }
            } else if (!response.ok) {
                throw new Error('Authentication verification failed');
            }
            
            // Success - redirect based on role
            const userData = await this.getUserData(user.uid);
            this.redirectUser(userData);
            
            hideLoading('loginBtn');
            showToast('Login successful!', 'success');
            
        } catch (error) {
            hideLoading('loginBtn');
            console.error('Login error:', error);
            showError(error.message || 'Login failed. Please try again.');
        }
    }
    
    async createInitialUser(user) {
        // Create basic user entry in database
        try {
            const idToken = await user.getIdToken();
            await fetch('/api/auth/create-user', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    email: user.email,
                    password: 'temp_password_123', // Temp password, should be changed
                    name: user.displayName || user.email.split('@')[0],
                    role: 'owner'
                })
            });
        } catch (error) {
            console.error('Error creating initial user:', error);
        }
    }
    
    async getUserData(uid) {
        try {
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch('/api/auth/verify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ idToken })
            });
            
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error getting user data:', error);
        }
        return null;
    }
    
    redirectUser(userData) {
        if (!userData || !userData.user) {
            // Default to POS page
            window.location.href = '/';
            return;
        }
        
        const role = userData.user.role;
        
        // Redirect based on role
        if (role === 'owner' || role === 'admin') {
            window.location.href = '/admin';
        } else {
            window.location.href = '/';
        }
    }
    
    async logout() {
        try {
            showToast('Logging out...', 'info');
            
            await auth.signOut();
            
            // Clear local storage
            localStorage.removeItem('velvetpos_user');
            localStorage.removeItem('velvetpos_demo');
            
            // Redirect to login
            window.location.href = '/login';
            
        } catch (error) {
            console.error('Logout error:', error);
            showError('Logout failed. Please try again.');
        }
    }
    
    isAuthenticated() {
        return auth && auth.currentUser !== null;
    }
    
    getCurrentUser() {
        return auth?.currentUser || JSON.parse(localStorage.getItem('velvetpos_user') || 'null');
    }
    
    hasRole(requiredRoles) {
        const user = this.getCurrentUser();
        if (!user) return false;
        
        const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
        return roles.includes(user.role);
    }
}

// Initialize auth manager
const authManager = new AuthManager();

// Login form handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            await authManager.login(email, password);
        });
    }
    
    // Logout button handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            authManager.logout();
        });
    }
});

// Helper functions
function showLoading(buttonId) {
    const btn = document.getElementById(buttonId);
    if (btn) {
        btn.disabled = true;
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');
        if (btnText) btnText.style.display = 'none';
        if (btnLoader) btnLoader.style.display = 'inline-flex';
    }
}

function hideLoading(buttonId) {
    const btn = document.getElementById(buttonId);
    if (btn) {
        btn.disabled = false;
        const btnText = btn.querySelector('.btn-text');
        const btnLoader = btn.querySelector('.btn-loader');
        if (btnText) btnText.style.display = 'inline';
        if (btnLoader) btnLoader.style.display = 'none';
    }
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            errorEl.style.display = 'none';
        }, 5000);
    } else {
        showToast(message, 'error');
    }
}

function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
    `;
    
    // Add to container
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        document.body.appendChild(container);
    }
    container.appendChild(toast);
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Export for use in other modules
window.authManager = authManager;
