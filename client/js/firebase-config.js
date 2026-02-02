/**
 * VelvetPOS - Firebase Configuration
 * 
 * This file handles Firebase initialization and configuration.
 * Edit the config object to match your Firebase project settings.
 */

const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID",
    databaseURL: "https://your-project.firebaseio.com"
};

// Check if we're in demo mode
const isDemoMode = window.location.search.includes('demo=true') || 
                   localStorage.getItem('velvetpos_demo') === 'true';

// Initialize Firebase
let app, auth, database;

try {
    if (isDemoMode) {
        console.log('VelvetPOS: Running in DEMO mode');
        // Set up demo mode
        setupDemoMode();
    } else if (typeof firebase !== 'undefined') {
        // Initialize Firebase
        if (!firebase.apps.length) {
            app = firebase.initializeApp(firebaseConfig);
        } else {
            app = firebase.app();
        }
        
        auth = firebase.auth();
        database = firebase.database();
        
        console.log('VelvetPOS: Firebase initialized successfully');
        
        // Set language
        auth.languageCode = 'en';
    } else {
        console.warn('VelvetPOS: Firebase SDK not loaded, falling back to demo mode');
        setupDemoMode();
    }
} catch (error) {
    console.error('VelvetPOS: Firebase initialization error:', error);
    console.log('VelvetPOS: Falling back to demo mode');
    setupDemoMode();
}

/**
 * Setup Demo Mode - Simulates Firebase functionality for testing
 */
function setupDemoMode() {
    console.log('VelvetPOS: Setting up demo mode...');
    
    // Mark demo mode in localStorage
    localStorage.setItem('velvetpos_demo', 'true');
    
    // Demo data stores
    window.demoData = {
        users: {
            'demo_user_1': {
                uid: 'demo_user_1',
                email: 'admin@velvet.com',
                displayName: 'Admin User',
                role: 'owner',
                store_id: 'default'
            },
            'demo_user_2': {
                uid: 'demo_user_2',
                email: 'staff@velvet.com',
                displayName: 'Staff Member',
                role: 'staff',
                store_id: 'default'
            }
        },
        currentUser: null
    };
    
    // Create demo auth object
    window.demoAuth = {
        currentUser: null,
        
        signInWithEmailAndPassword: function(email, password) {
            return new Promise((resolve, reject) => {
                // Simulate API call delay
                setTimeout(() => {
                    // Find user by email
                    const user = Object.values(window.demoData.users).find(u => u.email === email);
                    
                    if (user) {
                        window.demoAuth.currentUser = user;
                        window.demoData.currentUser = user;
                        resolve({ user: user });
                    } else {
                        // Accept any credentials in demo mode
                        const newUser = {
                            uid: 'demo_' + Date.now(),
                            email: email,
                            displayName: email.split('@')[0],
                            role: 'staff',
                            store_id: 'default'
                        };
                        window.demoAuth.currentUser = newUser;
                        window.demoData.currentUser = newUser;
                        resolve({ user: newUser });
                    }
                }, 500);
            });
        },
        
        signOut: function() {
            return new Promise((resolve) => {
                setTimeout(() => {
                    window.demoAuth.currentUser = null;
                    window.demoData.currentUser = null;
                    resolve();
                }, 300);
            });
        },
        
        onAuthStateChanged: function(callback) {
            // Call immediately with current state
            callback(window.demoAuth.currentUser);
            
            // Store callback for future changes
            if (!window.demoAuth._authStateListeners) {
                window.demoAuth._authStateListeners = [];
            }
            window.demoAuth._authStateListeners.push(callback);
        }
    };
    
    // Create demo database object
    window.demoDatabase = {
        ref: function(path) {
            return new DemoRef(path);
        }
    };
    
    // Demo Reference class
    class DemoRef {
        constructor(path) {
            this.path = path;
            this._listeners = {};
            this._value = null;
        }
        
        get() {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(this._getValue());
                }, 100);
            });
        }
        
        set(value) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    this._setValue(value);
                    resolve(value);
                }, 100);
            });
        }
        
        update(updates) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    const current = this._getValue() || {};
                    const updated = { ...current, ...updates };
                    this._setValue(updated);
                    resolve(updated);
                }, 100);
            });
        }
        
        child(path) {
            return new DemoRef(this.path + '/' + path);
        }
        
        orderByChild(field) {
            return this;
        }
        
        equalTo(value) {
            return this;
        }
        
        limitToLast(n) {
            return this;
        }
        
        on(eventType, callback) {
            if (!this._listeners[eventType]) {
                this._listeners[eventType] = [];
            }
            this._listeners[eventType].push(callback);
            
            // Immediately call with current value
            setTimeout(() => {
                callback(this._getValue());
            }, 50);
        }
        
        off(eventType, callback) {
            if (this._listeners[eventType]) {
                if (callback) {
                    this._listeners[eventType] = this._listeners[eventType].filter(cb => cb !== callback);
                } else {
                    delete this._listeners[eventType];
                }
            }
        }
        
        once(eventType) {
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve(this._getValue());
                }, 100);
            });
        }
        
        push() {
            const newKey = 'key_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            return new DemoRef(this.path + '/' + newKey);
        }
        
        remove() {
            return new Promise((resolve) => {
                setTimeout(() => {
                    this._setValue(null);
                    resolve();
                }, 100);
            });
        }
        
        _getValue() {
            // Navigate the demo data path
            let value = window.demoData;
            const parts = this.path.split('/');
            
            for (const part of parts) {
                if (part && value && typeof value === 'object') {
                    value = value[part];
                } else {
                    return null;
                }
            }
            
            return value || null;
        }
        
        _setValue(val) {
            // Navigate to parent and set value
            const parts = this.path.split('/');
            const key = parts.pop();
            let obj = window.demoData;
            
            for (const part of parts) {
                if (!obj[part]) {
                    obj[part] = {};
                }
                obj = obj[part];
            }
            
            obj[key] = val;
        }
    }
    
    // Assign to global objects
    window.auth = window.demoAuth;
    window.database = window.demoDatabase;
    
    console.log('VelvetPOS: Demo mode initialized');
}

// Export for use in other files
window.isDemoMode = isDemoMode || localStorage.getItem('velvetpos_demo') === 'true';
