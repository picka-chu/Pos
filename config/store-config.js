/**
 * VelvetPOS - Store Configuration Template
 * 
 * This file contains the default configuration that can be customized
 * for different store clients. Copy this file and modify as needed.
 * 
 * TO CREATE A NEW STORE:
 * 1. Copy this file to store-config-[storename].js
 * 2. Modify the configuration values below
 * 3. Load this config file in the HTML pages
 * 
 * CONFIGURATION OPTIONS:
 */

// ==================== STORE IDENTIFICATION ====================

const STORE_CONFIG = {
    // Unique store identifier (used in database paths)
    storeId: 'default',
    
    // Display name for the store
    storeName: 'Velvet Beauty Boutique',
    
    // Short tagline or slogan
    tagline: 'Enhancing Your Natural Beauty',
    
    // Store website URL
    website: 'https://www.velvetbeauty.com',
    
    // Contact information
    contact: {
        email: 'contact@velvetbeauty.com',
        phone: '+1 (555) 123-4567',
        address: '123 Beauty Lane, New York, NY 10001'
    },
    
    // ==================== BRANDING ====================
    
    branding: {
        // Primary brand color (affects buttons, accents)
        primaryColor: '#D4AF37',  // Gold for luxury feel
        
        // Alternative colors
        secondaryColor: '#2C3E50',  // Dark blue for contrast
        accentColor: '#E1C6D0',     // Dusty pink for cosmetics
        
        // Font choices
        displayFont: 'Playfair Display',  // Serif for headings
        bodyFont: 'Inter',                 // Sans-serif for UI
        
        // Logo URL (can be overridden per store)
        logoUrl: '',
        
        // Favicon URL
        faviconUrl: '/favicon.ico'
    },
    
    // ==================== REGIONAL SETTINGS ====================
    
    regional: {
        // Currency code and symbol
        currency: 'USD',
        currencySymbol: '$',
        
        // Tax rate (decimal format, e.g., 0.08 for 8%)
        taxRate: 0.08,
        
        // Timezone for reports
        timezone: 'America/New_York',
        
        // Date format
        dateFormat: 'MM/DD/YYYY',
        
        // Number format
        numberFormat: {
            decimals: 2,
            thousandsSeparator: ',',
            decimalSeparator: '.'
        }
    },
    
    // ==================== RECEIPT SETTINGS ====================
    
    receipt: {
        // Text displayed at the top of receipts
        header: 'Thank you for shopping at Velvet Beauty!',
        
        // Text displayed at the bottom of receipts
        footer: 'We look forward to seeing you again soon!',
        
        // Show loyalty points on receipt
        showLoyaltyPoints: true,
        
        // Show barcode on receipt
        showBarcode: true,
        
        // Barcode type
        barcodeType: 'CODE128',
        
        // Return policy text
        returnPolicy: 'Returns accepted within 30 days with receipt.'
    },
    
    // ==================== LOYALTY PROGRAM ====================
    
    loyalty: {
        // Enable/disable loyalty program
        enabled: true,
        
        // Points earned per dollar spent
        pointsPerDollar: 10,
        
        // Tier thresholds
        tiers: {
            bronze: { minPoints: 0, discount: 0, name: 'Bronze' },
            silver: { minPoints: 500, discount: 5, name: 'Silver' },
            gold: { minPoints: 1500, discount: 10, name: 'Gold' },
            platinum: { minPoints: 5000, discount: 15, name: 'Platinum' }
        },
        
        // Points expiration (in months, 0 = never)
        expirationMonths: 12
    },
    
    // ==================== PRODUCT CATEGORIES ====================
    
    categories: [
        { id: 'cat_lipstick', name: 'Lipstick', sortOrder: 1, color: '#E74C3C' },
        { id: 'cat_foundation', name: 'Foundation', sortOrder: 2, color: '#F39C12' },
        { id: 'cat_eyeshadow', name: 'Eyeshadow', sortOrder: 3, color: '#9B59B6' },
        { id: 'cat_skincare', name: 'Skincare', sortOrder: 4, color: '#3498DB' },
        { id: 'cat_mascara', name: 'Mascara', sortOrder: 5, color: '#1ABC9C' },
        { id: 'cat_accessories', name: 'Accessories', sortOrder: 6, color: '#E91E63' }
    ],
    
    // ==================== PAYMENT OPTIONS ====================
    
    payment: {
        // Accepted payment methods
        methods: {
            cash: { enabled: true, label: 'Cash' },
            card: { enabled: true, label: 'Credit/Debit Card' },
            mobile: { enabled: true, label: 'Mobile Payment' },
            giftCard: { enabled: false, label: 'Gift Card' }
        },
        
        // Cash handling
        cash: {
            enableQuickCashButtons: true,
            quickCashAmounts: [10, 20, 50, 100],
            defaultCashDrawer: 200
        },
        
        // Card processing (integrate with Stripe, Square, etc.)
        card: {
            provider: 'stripe',  // stripe, square, clover
            testMode: true,
            terminalEnabled: false
        }
    },
    
    // ==================== RECEIPT PRINTER ====================
    
    printer: {
        // Enable receipt printing
        enabled: false,
        
        // Printer type
        type: 'network',  // network, usb, bluetooth
        
        // Network printer settings
        network: {
            ip: '192.168.1.100',
            port: 9100
        },
        
        // Receipt template
        template: {
            width: 48,  // Characters per line
            encoding: 'UTF-8',
            cutAfter: true
        }
    },
    
    // ==================== RECEIPT EMAIL ====================
    
    email: {
        // Enable email receipts
        enabled: false,
        
        // Email settings
        smtp: {
            host: 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: {
                user: 'your-email@gmail.com',
                pass: 'your-app-password'
            }
        },
        
        // Email template
        from: 'Velvet Beauty <noreply@velvetbeauty.com>',
        subject: 'Your Receipt from Velvet Beauty'
    },
    
    // ==================== INVENTORY SETTINGS ====================
    
    inventory: {
        // Low stock threshold
        lowStockThreshold: 5,
        
        // Out of stock threshold
        outOfStockThreshold: 0,
        
        // Enable negative inventory (allow overselling)
        allowNegativeStock: false,
        
        // Auto-reorder settings
        autoReorder: {
            enabled: false,
            reorderPoint: 10,
            reorderQuantity: 50
        },
        
        // Barcode scanner settings
        scanner: {
            enabled: true,
            beepOnScan: true,
            focusSearchOnScan: true
        }
    },
    
    // ==================== RECEIPT & DISCOUNTS ====================
    
    discounts: {
        // Enable percentage discounts
        percentageDiscounts: true,
        
        // Enable fixed amount discounts
        fixedDiscounts: true,
        
        // Maximum discount percentage
        maxDiscountPercent: 50,
        
        // Require manager approval for discounts
        requireApproval: false,
        
        // Common discount presets
        presets: [
            { name: 'Employee Discount', type: 'percentage', value: 20 },
            { name: 'Manager Special', type: 'fixed', value: 10 },
            { name: 'Clearance', type: 'percentage', value: 30 }
        ]
    },
    
    // ==================== RECEIPT EXTRAS ====================
    
    extras: {
        // Show product images on receipt
        showProductImages: false,
        
        // Enable customer notes
        allowCustomerNotes: true,
        
        // Enable staff notes
        allowStaffNotes: true,
        
        // Suggest related products
        suggestRelatedProducts: true,
        
        // Quick add frequently used products
        quickAddProducts: ['prod_lipstick_001', 'prod_mascara_001']
    },
    
    // ==================== REPORTING ====================
    
    reporting: {
        // Default date range for reports
        defaultDateRange: 30,
        
        // Generate daily reports
        dailyReports: {
            enabled: true,
            sendToEmail: 'manager@velvetbeauty.com'
        },
        
        // Sales goals
        goals: {
            dailySales: 1000,
            monthlySales: 30000,
            transactionCount: 50
        }
    },
    
    // ==================== USER INTERFACE ====================
    
    ui: {
        // Enable dark mode
        darkMode: false,
        
        // Compact mode for smaller screens
        compactMode: false,
        
        // Show confirmations
        confirmations: {
            onCheckout: true,
            onClearCart: true,
            onDeleteItem: false
        },
        
        // Animations
        animations: {
            enabled: true,
            reducedMotion: false
        },
        
        // Keyboard shortcuts
        shortcuts: {
            enabled: true,
            mappings: {
                'F1': 'help',
                'F2': 'newSale',
                'F3': 'search',
                'F8': 'checkout',
                'Escape': 'cancel',
                'Ctrl+Enter': 'hold'
            }
        }
    },
    
    // ==================== OFFLINE MODE ====================
    
    offline: {
        // Enable offline functionality
        enabled: true,
        
        // Cache products locally
        cacheProducts: true,
        
        // Sync transactions when back online
        syncTransactions: true,
        
        // Maximum offline transactions
        maxOfflineTransactions: 100
    },
    
    // ==================== CUSTOM CSS ====================
    
    // Custom CSS overrides (applied after main styles)
    customCSS: `
        /* Add store-specific CSS here */
        /*
        .product-card {
            border-radius: 12px;
        }
        
        .btn-primary {
            background: linear-gradient(135deg, var(--primary-color), var(--primary-dark));
        }
        */
    `
};

// ==================== FACTORY FUNCTION ====================

/**
 * Create a store configuration for a new client
 * @param {Object} overrides - Configuration values to override
 * @returns {Object} Complete store configuration
 */
function createStoreConfig(overrides = {}) {
    return {
        ...STORE_CONFIG,
        ...overrides,
        branding: { ...STORE_CONFIG.branding, ...overrides.branding },
        contact: { ...STORE_CONFIG.contact, ...overrides.contact },
        regional: { ...STORE_CONFIG.regional, ...overrides.regional },
        receipt: { ...STORE_CONFIG.receipt, ...overrides.receipt },
        loyalty: { ...STORE_CONFIG.loyalty, ...overrides.loyalty },
        payment: { ...STORE_CONFIG.payment, ...overrides.payment },
        printer: { ...STORE_CONFIG.printer, ...overrides.printer },
        inventory: { ...STORE_CONFIG.inventory, ...overrides.inventory },
        reporting: { ...STORE_CONFIG.reporting, ...overrides.reporting },
        ui: { ...STORE_CONFIG.ui, ...overrides.ui },
        offline: { ...STORE_CONFIG.offline, ...overrides.offline }
    };
}

// ==================== EXAMPLE STORE CONFIGS ====================

/**
 * Example: Luxury cosmetics store
 */
const LUXE_STORE_CONFIG = createStoreConfig({
    storeId: 'luxe_beauty',
    storeName: 'Luxe Beauty',
    tagline: 'Where Luxury Meets Beauty',
    branding: {
        primaryColor: '#C9A961',
        secondaryColor: '#1A1A1A',
        accentColor: '#D4AF37'
    }
});

/**
 * Example: Budget-friendly cosmetics store
 */
const BUDGET_STORE_CONFIG = createStoreConfig({
    storeId: 'budget_beauty',
    storeName: 'Budget Beauty',
    tagline: 'Beauty for Everyone',
    branding: {
        primaryColor: '#FF6B6B',
        secondaryColor: '#4A4A4A',
        accentColor: '#FFE66D'
    },
    regional: {
        currency: 'USD',
        currencySymbol: '$',
        taxRate: 0.06  // Lower tax for budget store
    }
});

/**
 * Example: European cosmetics store
 */
const EU_STORE_CONFIG = createStoreConfig({
    storeId: 'europe_beauty',
    storeName: 'Euro Beauty',
    tagline: 'Natural Beauty, European Style',
    branding: {
        primaryColor: '#9B59B6',
        secondaryColor: '#2C3E50',
        accentColor: '#1ABC9C'
    },
    regional: {
        currency: 'EUR',
        currencySymbol: '€',
        taxRate: 0.19,  // German VAT
        timezone: 'Europe/Berlin',
        dateFormat: 'DD.MM.YYYY'
    }
});

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        STORE_CONFIG,
        createStoreConfig,
        LUXE_STORE_CONFIG,
        BUDGET_STORE_CONFIG,
        EU_STORE_CONFIG
    };
}

window.STORE_CONFIG = STORE_CONFIG;
window.createStoreConfig = createStoreConfig;
