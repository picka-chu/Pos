/**
 * VelvetPOS - Admin Dashboard Module
 * Handles admin-specific functionality including analytics, reports, and settings
 */

class AdminManager {
    constructor() {
        this.salesChart = null;
        this.init();
    }
    
    async init() {
        await this.loadDashboardData();
        this.setupEventListeners();
    }
    
    async loadDashboardData() {
        try {
            // Load analytics
            await this.loadAnalytics();
            
            // Load top products
            await this.loadTopProducts();
            
            // Load recent transactions
            await this.loadRecentTransactions();
            
            // Load inventory alerts
            await this.loadInventoryAlerts();
            
            // Load settings
            await this.loadSettings();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }
    
    async loadAnalytics() {
        try {
            const days = document.getElementById('dateRange')?.value || 30;
            const response = await this.apiRequest(`/api/analytics/sales?days=${days}`);
            
            if (response.total_sales !== undefined) {
                document.getElementById('totalSales').textContent = 
                    `$${(response.total_sales || 0).toFixed(2)}`;
                document.getElementById('totalTransactions').textContent = 
                    response.total_transactions || 0;
                document.getElementById('avgTransaction').textContent = 
                    `$${(response.average_transaction_value || 0).toFixed(2)}`;
                
                // Update chart
                this.updateSalesChart(response.daily_breakdown || {});
            }
        } catch (error) {
            console.log('Using demo analytics data');
            this.useDemoAnalytics();
        }
    }
    
    useDemoAnalytics() {
        document.getElementById('totalSales').textContent = '$12,543.67';
        document.getElementById('totalTransactions').textContent = '234';
        document.getElementById('avgTransaction').textContent = '$53.60';
        
        // Demo chart data
        const demoData = {};
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            demoData[date.toISOString().split('T')[0]] = {
                total_sales: Math.random() * 500 + 200,
                transaction_count: Math.floor(Math.random() * 20 + 5)
            };
        }
        this.updateSalesChart(demoData);
    }
    
    updateSalesChart(data) {
        const ctx = document.getElementById('salesChart');
        if (!ctx) return;
        
        const labels = Object.keys(data).slice(-14);
        const values = labels.map(date => data[date]?.total_sales || 0);
        
        if (this.salesChart) {
            this.salesChart.destroy();
        }
        
        this.salesChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels.map(d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
                datasets: [{
                    label: 'Sales',
                    data: values,
                    borderColor: '#D4AF37',
                    backgroundColor: 'rgba(212, 175, 55, 0.1)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            maxTicksLimit: 7
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            callback: value => '$' + value.toFixed(0)
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }
    
    async loadTopProducts() {
        try {
            const response = await this.apiRequest('/api/analytics/top-products?limit=5');
            const products = response.top_products || [];
            
            this.renderTopProducts(products);
        } catch (error) {
            console.log('Using demo top products');
            this.renderTopProducts([
                { name: 'Matte Ruby Lipstick', quantity_sold: 145, revenue: 3623.55 },
                { name: 'Naked Palette Eyeshadow', quantity_sold: 89, revenue: 4894.11 },
                { name: 'Silk Foundation - Beige', quantity_sold: 67, revenue: 2879.33 },
                { name: 'Hydrating Face Serum', quantity_sold: 45, revenue: 3104.55 },
                { name: 'Velvet Rose Lipstick', quantity_sold: 98, revenue: 2645.02 }
            ]);
        }
    }
    
    renderTopProducts(products) {
        const list = document.getElementById('topProductsList');
        if (!list) return;
        
        if (products.length === 0) {
            list.innerHTML = '<li class="empty-state"><p>No sales data available</p></li>';
            return;
        }
        
        list.innerHTML = products.map((product, index) => `
            <li class="top-product-item">
                <span class="top-product-rank">${index + 1}</span>
                <div class="top-product-info">
                    <div class="top-product-name">${product.name}</div>
                    <div class="top-product-stats">${product.quantity_sold} sold</div>
                </div>
                <span class="top-product-revenue">$${product.revenue.toFixed(2)}</span>
            </li>
        `).join('');
    }
    
    async loadRecentTransactions() {
        try {
            const response = await this.apiRequest('/api/transactions?limit=5');
            const transactions = response.transactions ? Object.values(response.transactions) : [];
            
            this.renderRecentTransactions(transactions);
        } catch (error) {
            console.log('Using demo transactions');
            this.renderRecentTransactions([
                { id: 'tx_001', total: 89.99, items: [{ name: 'Matte Ruby Lipstick' }, { name: 'Naked Palette' }], payment_method: 'card' },
                { id: 'tx_002', total: 54.99, items: [{ name: 'Silk Foundation' }], payment_method: 'cash' },
                { id: 'tx_003', total: 124.50, items: [{ name: 'Hydrating Face Serum' }, { name: 'Professional Brush Set' }], payment_method: 'card' }
            ]);
        }
    }
    
    renderRecentTransactions(transactions) {
        const list = document.getElementById('recentTransactionsList');
        if (!list) return;
        
        if (transactions.length === 0) {
            list.innerHTML = '<li class="empty-state"><p>No recent transactions</p></li>';
            return;
        }
        
        list.innerHTML = transactions.slice(0, 5).map(tx => `
            <li class="transaction-item">
                <div class="transaction-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                        <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                </div>
                <div class="transaction-info">
                    <div class="transaction-title">${tx.items.map(i => i.name).join(', ')}</div>
                    <div class="transaction-meta">${tx.date || 'Today'} • ${tx.payment_method || 'card'}</div>
                </div>
                <span class="transaction-amount">$${(tx.total || 0).toFixed(2)}</span>
            </li>
        `).join('');
    }
    
    async loadInventoryAlerts() {
        try {
            const response = await this.apiRequest('/api/inventory');
            const products = response.inventory ? Object.values(response.inventory) : [];
            
            const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5);
            const outOfStock = products.filter(p => p.stock <= 0);
            
            this.renderInventoryAlerts(lowStock.length, outOfStock.length);
        } catch (error) {
            this.renderInventoryAlerts(5, 2);
        }
    }
    
    renderInventoryAlerts(lowStock, outOfStock) {
        const list = document.getElementById('inventoryAlertsList');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (outOfStock > 0) {
            list.innerHTML += `
                <li class="alert-item out-of-stock">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"/>
                        <line x1="15" y1="9" x2="9" y2="15"/>
                        <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                    <div class="alert-content">
                        <span class="alert-title">Out of Stock</span>
                        <span class="alert-description">${outOfStock} products are out of stock</span>
                    </div>
                </li>
            `;
        }
        
        if (lowStock > 0) {
            list.innerHTML += `
                <li class="alert-item low-stock">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    <div class="alert-content">
                        <span class="alert-title">Low Stock Warning</span>
                        <span class="alert-description">${lowStock} products need restocking</span>
                    </div>
                </li>
            `;
        }
        
        if (outOfStock === 0 && lowStock === 0) {
            list.innerHTML = `
                <li class="alert-item" style="background: rgba(39, 174, 96, 0.1);">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--success-color);">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <div class="alert-content">
                        <span class="alert-title">All Good!</span>
                        <span class="alert-description">All products are well stocked</span>
                    </div>
                </li>
            `;
        }
    }
    
    async loadSettings() {
        try {
            const response = await this.apiRequest('/api/store/config');
            const config = response.config || {};
            
            // Populate form fields
            document.getElementById('storeNameInput').value = config.name || '';
            document.getElementById('storeCurrency').value = config.currency || 'USD';
            document.getElementById('storeTaxRate').value = (config.tax_rate * 100) || 8;
            document.getElementById('storeTimezone').value = config.timezone || 'America/New_York';
            document.getElementById('themeColor').value = config.theme_color || '#D4AF37';
            document.getElementById('themeColorPicker').value = config.theme_color || '#D4AF37';
            document.getElementById('logoUrl').value = config.logo_url || '';
            document.getElementById('storeTagline').value = config.tagline || '';
        } catch (error) {
            console.log('Using default settings');
        }
    }
    
    async saveSettings() {
        const settings = {
            name: document.getElementById('storeNameInput').value,
            currency: document.getElementById('storeCurrency').value,
            tax_rate: parseFloat(document.getElementById('storeTaxRate').value) / 100,
            timezone: document.getElementById('storeTimezone').value,
            theme_color: document.getElementById('themeColor').value,
            logo_url: document.getElementById('logoUrl').value,
            tagline: document.getElementById('storeTagline').value
        };
        
        try {
            const response = await this.apiRequest('/api/store/config', 'PUT', settings);
            
            if (response.success) {
                showToast('Settings saved successfully', 'success');
                
                // Apply branding
                this.applyBranding(settings);
            }
        } catch (error) {
            showToast(error.message || 'Failed to save settings', 'error');
        }
    }
    
    applyBranding(settings) {
        if (settings.theme_color) {
            document.documentElement.style.setProperty('--primary-color', settings.theme_color);
        }
        
        if (settings.name) {
            document.getElementById('storeName').textContent = settings.name;
        }
        
        if (settings.logo_url) {
            const logoEl = document.getElementById('storeLogo');
            if (logoEl) {
                logoEl.innerHTML = `<img src="${settings.logo_url}" alt="Store Logo" style="width: 100%; height: 100%; object-fit: contain;">`;
            }
        }
    }
    
    async loadStaff() {
        try {
            const response = await this.apiRequest('/api/staff');
            const staff = response.staff ? Object.values(response.staff) : [];
            
            this.renderStaffTable(staff);
        } catch (error) {
            console.log('Using demo staff data');
            this.renderStaffTable([
                { name: 'Admin User', email: 'admin@velvet.com', role: 'owner', active: true, created_at: '2024-01-01' },
                { name: 'Sarah Johnson', email: 'sarah@velvet.com', role: 'manager', active: true, created_at: '2024-01-15' },
                { name: 'Mike Chen', email: 'mike@velvet.com', role: 'staff', active: true, created_at: '2024-02-01' },
                { name: 'Emily Davis', email: 'emily@velvet.com', role: 'staff', active: false, created_at: '2024-02-10' }
            ]);
        }
    }
    
    renderStaffTable(staff) {
        const tbody = document.getElementById('staffTableBody');
        if (!tbody) return;
        
        tbody.innerHTML = staff.map(member => `
            <tr>
                <td>${member.name}</td>
                <td>${member.email}</td>
                <td><span class="role-badge ${member.role}">${member.role}</span></td>
                <td><span class="status-badge ${member.active ? 'active' : 'inactive'}">${member.active ? 'Active' : 'Inactive'}</span></td>
                <td>${member.created_at?.split('T')[0] || '-'}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit" onclick="adminManager.editStaff('${member.uid || member.email}')">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
    
    async createStaff() {
        const modal = document.getElementById('staffModal');
        document.getElementById('staffModalTitle').textContent = 'Add Staff Member';
        document.getElementById('staffForm').reset();
        document.getElementById('staffId').value = '';
        modal.classList.add('active');
    }
    
    async saveStaff() {
        const staffData = {
            name: document.getElementById('staffName').value,
            email: document.getElementById('staffEmail').value,
            password: document.getElementById('staffPassword').value,
            role: document.getElementById('staffRole').value
        };
        
        if (!staffData.password && !document.getElementById('staffId').value) {
            showToast('Password is required for new staff members', 'warning');
            return;
        }
        
        try {
            const response = await this.apiRequest('/api/auth/create-user', 'POST', staffData);
            
            if (response.success) {
                document.getElementById('staffModal').classList.remove('active');
                showToast('Staff member created successfully', 'success');
                await this.loadStaff();
            }
        } catch (error) {
            showToast(error.message || 'Failed to create staff member', 'error');
        }
    }
    
    async apiRequest(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        const user = authManager.getCurrentUser();
        if (user && !window.isDemoMode) {
            try {
                const token = await auth.currentUser.getIdToken();
                options.headers['Authorization'] = `Bearer ${token}`;
            } catch (e) {
                console.warn('Could not get auth token');
            }
        }
        
        if (data) {
            options.body = JSON.stringify(data);
        }
        
        const response = await fetch(endpoint, options);
        
        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || `HTTP ${response.status}`);
        }
        
        return response.json();
    }
    
    setupEventListeners() {
        // Date range filter
        const dateRange = document.getElementById('dateRange');
        if (dateRange) {
            dateRange.addEventListener('change', () => this.loadAnalytics());
        }
        
        // Save settings button
        const saveSettingsBtn = document.getElementById('saveSettingsBtn');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', () => this.saveSettings());
        }
        
        // Theme color picker
        const themeColorPicker = document.getElementById('themeColorPicker');
        const themeColor = document.getElementById('themeColor');
        if (themeColorPicker && themeColor) {
            themeColorPicker.addEventListener('input', (e) => {
                themeColor.value = e.target.value;
            });
            themeColor.addEventListener('input', (e) => {
                themeColorPicker.value = e.target.value;
            });
        }
        
        // Add staff button
        const addStaffBtn = document.getElementById('addStaffBtn');
        if (addStaffBtn) {
            addStaffBtn.addEventListener('click', () => this.createStaff());
        }
        
        // Staff form
        document.getElementById('closeStaffModal')?.addEventListener('click', () => {
            document.getElementById('staffModal').classList.remove('active');
        });
        document.getElementById('cancelStaffBtn')?.addEventListener('click', () => {
            document.getElementById('staffModal').classList.remove('active');
        });
        document.getElementById('staffForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveStaff();
        });
        
        // Add product button (shared with POS)
        const addProductBtn = document.getElementById('addProductBtn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => {
                document.getElementById('productModalTitle').textContent = 'Add Product';
                document.getElementById('productForm').reset();
                document.getElementById('productId').value = '';
                document.getElementById('productModal').classList.add('active');
            });
        }
        
        // Add customer button
        const addCustomerBtn = document.getElementById('addCustomerBtn');
        if (addCustomerBtn) {
            addCustomerBtn.addEventListener('click', () => {
                document.getElementById('customerModalTitle').textContent = 'Add Customer';
                document.getElementById('customerForm').reset();
                document.getElementById('customerId').value = '';
                document.getElementById('customerModal').classList.add('active');
            });
        }
        
        // Product modal
        document.getElementById('closeProductModal')?.addEventListener('click', () => {
            document.getElementById('productModal').classList.remove('active');
        });
        document.getElementById('cancelProductBtn')?.addEventListener('click', () => {
            document.getElementById('productModal').classList.remove('active');
        });
        
        // Customer modal
        document.getElementById('closeCustomerModal')?.addEventListener('click', () => {
            document.getElementById('customerModal').classList.remove('active');
        });
        document.getElementById('cancelCustomerBtn')?.addEventListener('click', () => {
            document.getElementById('customerModal').classList.remove('active');
        });
        
        // Inventory filters
        const inventorySearch = document.getElementById('inventorySearch');
        if (inventorySearch) {
            inventorySearch.addEventListener('input', () => this.filterInventory());
        }
        
        const inventoryCategoryFilter = document.getElementById('inventoryCategoryFilter');
        if (inventoryCategoryFilter) {
            inventoryCategoryFilter.addEventListener('change', () => this.filterInventory());
        }
    }
    
    filterInventory() {
        // Implement filtering logic
        console.log('Filtering inventory...');
    }
}

// Initialize admin manager
let adminManager;
document.addEventListener('DOMContentLoaded', function() {
    adminManager = new AdminManager();
    
    // Update user display
    const user = authManager.getCurrentUser();
    if (user) {
        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');
        const userAvatarEl = document.getElementById('userAvatar');
        
        if (userNameEl) userNameEl.textContent = user.name || user.email;
        if (userRoleEl) userRoleEl.textContent = user.role || 'Administrator';
        if (userAvatarEl) userAvatarEl.textContent = (user.name || user.email || 'A').charAt(0).toUpperCase();
    }
    
    // Setup navigation
    setupAdminNavigation();
});

function setupAdminNavigation() {
    document.querySelectorAll('.sidebar .nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            document.querySelectorAll('.sidebar .nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            const page = item.dataset.page;
            showAdminPage(page);
        });
    });
}

function showAdminPage(page) {
    // Hide all views
    document.querySelectorAll('.dashboard-view, .inventory-view, .admin-pos-view, .customers-view, .staff-view, .reports-view, .settings-view').forEach(view => {
        view.classList.add('hidden');
    });
    
    // Show selected view
    switch (page) {
        case 'dashboard':
            document.getElementById('dashboardView')?.classList.remove('hidden');
            if (adminManager) adminManager.loadAnalytics();
            break;
        case 'inventory':
            document.getElementById('inventoryView')?.classList.remove('hidden');
            if (posManager) posManager.loadInventoryTable();
            break;
        case 'pos':
            document.getElementById('adminPosView')?.classList.remove('hidden');
            // Reuse POS view
            break;
        case 'customers':
            document.getElementById('customersView')?.classList.remove('hidden');
            if (posManager) posManager.loadCustomersTable();
            break;
        case 'staff':
            document.getElementById('staffView')?.classList.remove('hidden');
            if (adminManager) adminManager.loadStaff();
            break;
        case 'reports':
            document.getElementById('reportsView')?.classList.remove('hidden');
            break;
        case 'settings':
            document.getElementById('settingsView')?.classList.remove('hidden');
            break;
    }
}
