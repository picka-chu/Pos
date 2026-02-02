/**
 * VelvetPOS - Point of Sale Module
 * Handles the main POS interface functionality
 */

class POSManager {
    constructor() {
        this.cart = [];
        this.products = [];
        this.categories = [];
        this.customers = [];
        this.taxRate = 0.08;
        this.currencySymbol = '$';
        
        this.init();
    }
    
    async init() {
        await this.loadStoreConfig();
        await this.loadProducts();
        await this.loadCategories();
        await this.loadCustomers();
        this.setupEventListeners();
        this.updateCartDisplay();
    }
    
    async loadStoreConfig() {
        try {
            const response = await this.apiRequest('/api/store/config');
            if (response.config) {
                this.taxRate = parseFloat(response.config.tax_rate) || 0.08;
                this.currencySymbol = response.config.currency_symbol || '$';
                
                // Apply branding
                if (response.config.theme_color) {
                    document.documentElement.style.setProperty('--primary-color', response.config.theme_color);
                }
            }
        } catch (error) {
            console.log('Using default store config');
        }
    }
    
    async loadProducts() {
        try {
            const response = await this.apiRequest('/api/inventory');
            this.products = response.inventory ? Object.values(response.inventory) : [];
            this.renderProductGrid();
        } catch (error) {
            console.error('Error loading products:', error);
            // Use demo products if available
            this.products = Object.values(window.DEMO_INVENTORY || {});
            this.renderProductGrid();
        }
    }
    
    async loadCategories() {
        try {
            const response = await this.apiRequest('/api/categories');
            this.categories = response.categories ? Object.values(response.categories) : [];
            this.renderCategoryFilters();
        } catch (error) {
            console.log('Using default categories');
            this.categories = Object.values(window.DEMO_CATEGORIES || {});
            this.renderCategoryFilters();
        }
    }
    
    async loadCustomers() {
        try {
            const response = await this.apiRequest('/api/customers');
            this.customers = response.customers ? Object.values(response.customers) : [];
            this.renderCustomerSelect();
        } catch (error) {
            console.log('Using demo customers');
            this.customers = Object.values(window.DEMO_CUSTOMERS || {});
            this.renderCustomerSelect();
        }
    }
    
    renderProductGrid(filter = 'all', search = '') {
        const grid = document.getElementById('productGrid');
        if (!grid) return;
        
        // Filter products
        let filteredProducts = this.products;
        
        if (filter !== 'all') {
            filteredProducts = filteredProducts.filter(p => p.category === filter);
        }
        
        if (search) {
            const searchLower = search.toLowerCase();
            filteredProducts = filteredProducts.filter(p => 
                p.name.toLowerCase().includes(searchLower) ||
                p.sku.toLowerCase().includes(searchLower)
            );
        }
        
        // Clear grid
        grid.innerHTML = '';
        
        // Render products
        if (filteredProducts.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1 / -1;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                        <line x1="3" y1="6" x2="21" y2="6"/>
                        <path d="M16 10a4 4 0 0 1-8 0"/>
                    </svg>
                    <h3>No products found</h3>
                    <p>Try adjusting your search or filter</p>
                </div>
            `;
            return;
        }
        
        filteredProducts.forEach(product => {
            const card = document.createElement('div');
            card.className = `product-card ${product.stock <= 0 ? 'out-of-stock' : ''}`;
            card.innerHTML = `
                <div class="product-card-image">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                    </svg>
                </div>
                <div class="product-card-info">
                    <div class="product-card-name">${product.name}</div>
                    <div class="product-card-price">${this.currencySymbol}${product.price.toFixed(2)}</div>
                    <div class="product-card-stock">${product.stock > 0 ? `Stock: ${product.stock}` : 'Out of Stock'}</div>
                </div>
            `;
            
            if (product.stock > 0) {
                card.addEventListener('click', () => this.addToCart(product));
            }
            
            grid.appendChild(card);
        });
    }
    
    renderCategoryFilters() {
        const container = document.getElementById('categoryFilters');
        if (!container) return;
        
        // Clear existing (keep "All" button)
        container.innerHTML = `
            <button class="category-btn active" data-category="all">All</button>
        `;
        
        // Add category buttons
        this.categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'category-btn';
            btn.dataset.category = cat.name;
            btn.textContent = cat.name;
            container.appendChild(btn);
        });
        
        // Add click listeners
        container.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                container.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.renderProductGrid(e.target.dataset.category);
            });
        });
    }
    
    renderCustomerSelect() {
        const select = document.getElementById('customerSelect');
        if (!select) return;
        
        // Keep first option
        select.innerHTML = '<option value="">Walk-in Customer</option>';
        
        this.customers.forEach(customer => {
            const option = document.createElement('option');
            option.value = customer.id;
            option.textContent = `${customer.name} (${customer.phone})`;
            select.appendChild(option);
        });
    }
    
    addToCart(product) {
        const existingItem = this.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            if (existingItem.quantity < product.stock) {
                existingItem.quantity++;
                showToast(`Updated ${product.name} quantity`, 'success');
            } else {
                showToast('Not enough stock available', 'warning');
                return;
            }
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1,
                maxStock: product.stock
            });
            showToast(`Added ${product.name} to cart`, 'success');
        }
        
        this.updateCartDisplay();
    }
    
    updateCartItemQuantity(productId, change) {
        const item = this.cart.find(i => i.id === productId);
        if (!item) return;
        
        const newQuantity = item.quantity + change;
        
        if (newQuantity <= 0) {
            this.removeFromCart(productId);
        } else if (newQuantity <= item.maxStock) {
            item.quantity = newQuantity;
            this.updateCartDisplay();
        } else {
            showToast('Not enough stock available', 'warning');
        }
    }
    
    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.updateCartDisplay();
        showToast('Item removed from cart', 'info');
    }
    
    clearCart() {
        this.cart = [];
        this.updateCartDisplay();
        showToast('Cart cleared', 'info');
    }
    
    updateCartDisplay() {
        const cartItems = document.getElementById('cartItems');
        const checkoutBtn = document.getElementById('checkoutBtn');
        
        if (!cartItems) return;
        
        if (this.cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <circle cx="9" cy="21" r="1"/>
                        <circle cx="20" cy="21" r="1"/>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
                    </svg>
                    <p>No items in cart</p>
                </div>
            `;
            if (checkoutBtn) checkoutBtn.disabled = true;
            this.updateTotals();
            return;
        }
        
        cartItems.innerHTML = this.cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-image">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                    </svg>
                </div>
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">${this.currencySymbol}${item.price.toFixed(2)} each</div>
                </div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="posManager.updateCartItemQuantity('${item.id}', -1)">-</button>
                    <span class="quantity-value">${item.quantity}</span>
                    <button class="quantity-btn" onclick="posManager.updateCartItemQuantity('${item.id}', 1)">+</button>
                </div>
                <button class="cart-item-remove" onclick="posManager.removeFromCart('${item.id}')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
        `).join('');
        
        if (checkoutBtn) checkoutBtn.disabled = false;
        this.updateTotals();
    }
    
    updateTotals() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discount = parseFloat(document.getElementById('discountInput')?.value) || 0;
        const taxableAmount = subtotal - discount;
        const tax = taxableAmount * this.taxRate;
        const total = taxableAmount + tax;
        
        const subtotalEl = document.getElementById('cartSubtotal');
        const taxEl = document.getElementById('cartTax');
        const totalEl = document.getElementById('cartTotal');
        
        if (subtotalEl) subtotalEl.textContent = `${this.currencySymbol}${subtotal.toFixed(2)}`;
        if (taxEl) taxEl.textContent = `${this.currencySymbol}${tax.toFixed(2)}`;
        if (totalEl) totalEl.textContent = `${this.currencySymbol}${total.toFixed(2)}`;
        
        // Update change due if cash payment
        this.updateChangeDue();
    }
    
    updateChangeDue() {
        const cashReceived = parseFloat(document.getElementById('cashReceived')?.value) || 0;
        const total = this.calculateTotal();
        const change = Math.max(0, cashReceived - total);
        
        const changeEl = document.getElementById('changeDue');
        if (changeEl) {
            changeEl.textContent = `${this.currencySymbol}${change.toFixed(2)}`;
        }
    }
    
    calculateTotal() {
        const subtotal = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const discount = parseFloat(document.getElementById('discountInput')?.value) || 0;
        const taxableAmount = subtotal - discount;
        const tax = taxableAmount * this.taxRate;
        return taxableAmount + tax;
    }
    
    async checkout() {
        if (this.cart.length === 0) {
            showToast('Cart is empty', 'warning');
            return;
        }
        
        const customerId = document.getElementById('customerSelect')?.value || '';
        const paymentMethod = document.querySelector('input[name="payment"]:checked')?.value || 'cash';
        const cashAmount = paymentMethod === 'cash' ? (parseFloat(document.getElementById('cashReceived')?.value) || 0) : 0;
        const cardAmount = paymentMethod === 'card' ? this.calculateTotal() : 0;
        const discount = parseFloat(document.getElementById('discountInput')?.value) || 0;
        
        if (paymentMethod === 'cash' && cashAmount < this.calculateTotal()) {
            showToast('Insufficient cash amount', 'warning');
            return;
        }
        
        const user = authManager.getCurrentUser();
        
        const transactionData = {
            items: this.cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity
            })),
            customer_id: customerId,
            payment_method: paymentMethod,
            cash_amount: cashAmount,
            card_amount: cardAmount,
            discount: discount,
            staff_name: user?.name || 'Staff'
        };
        
        try {
            showLoading('checkoutBtn');
            
            const response = await this.apiRequest('/api/transactions', 'POST', transactionData);
            
            if (response.success) {
                showToast('Transaction completed successfully!', 'success');
                
                // Show change due if applicable
                if (response.change_due > 0) {
                    showToast(`Change due: ${this.currencySymbol}${response.change_due.toFixed(2)}`, 'info');
                }
                
                // Clear cart and reload products
                this.clearCart();
                await this.loadProducts();
            } else {
                throw new Error(response.error || 'Transaction failed');
            }
            
        } catch (error) {
            console.error('Checkout error:', error);
            showToast(error.message || 'Transaction failed. Please try again.', 'error');
        } finally {
            hideLoading('checkoutBtn');
        }
    }
    
    async apiRequest(endpoint, method = 'GET', data = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };
        
        // Add auth token
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
        // Product search
        const searchInput = document.getElementById('productSearch');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    const activeCategory = document.querySelector('.category-btn.active')?.dataset.category || 'all';
                    this.renderProductGrid(activeCategory, e.target.value);
                }, 300);
            });
        }
        
        // Clear cart button
        const clearCartBtn = document.getElementById('clearCartBtn');
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', () => this.clearCart());
        }
        
        // Discount input
        const discountInput = document.getElementById('discountInput');
        if (discountInput) {
            discountInput.addEventListener('input', () => this.updateTotals());
        }
        
        // Cash received
        const cashReceived = document.getElementById('cashReceived');
        if (cashReceived) {
            cashReceived.addEventListener('input', () => this.updateChangeDue());
        }
        
        // Payment method change
        document.querySelectorAll('input[name="payment"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const cashSection = document.getElementById('cashPayment');
                if (cashSection) {
                    cashSection.style.display = e.target.value === 'cash' ? 'block' : 'none';
                }
            });
        });
        
        // Checkout button
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', () => this.checkout());
        }
        
        // Add customer button
        const addCustomerBtn = document.getElementById('addCustomerBtn');
        if (addCustomerBtn) {
            addCustomerBtn.addEventListener('click', () => this.showCustomerModal());
        }
        
        // Product modal
        this.setupProductModal();
        
        // Customer modal
        this.setupCustomerModal();
    }
    
    setupProductModal() {
        const modal = document.getElementById('productModal');
        if (!modal) return;
        
        document.getElementById('closeProductModal')?.addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        document.getElementById('cancelProductBtn')?.addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        document.getElementById('addProductBtn')?.addEventListener('click', () => {
            document.getElementById('productModalTitle').textContent = 'Add Product';
            document.getElementById('productForm').reset();
            document.getElementById('productId').value = '';
            modal.classList.add('active');
        });
        
        document.getElementById('productForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveProduct();
        });
    }
    
    async saveProduct() {
        const productData = {
            name: document.getElementById('productName').value,
            sku: document.getElementById('productSku').value,
            price: parseFloat(document.getElementById('productPrice').value),
            stock: parseInt(document.getElementById('productStock').value) || 0,
            category: document.getElementById('productCategory').value,
            description: document.getElementById('productDescription').value
        };
        
        try {
            const isEdit = document.getElementById('productId').value;
            const endpoint = isEdit ? `/api/inventory/${isEdit}` : '/api/inventory';
            const method = isEdit ? 'PUT' : 'POST';
            
            const response = await this.apiRequest(endpoint, method, productData);
            
            if (response.success) {
                document.getElementById('productModal').classList.remove('active');
                showToast(isEdit ? 'Product updated successfully' : 'Product added successfully', 'success');
                await this.loadProducts();
            }
        } catch (error) {
            showToast(error.message || 'Failed to save product', 'error');
        }
    }
    
    setupCustomerModal() {
        const modal = document.getElementById('customerModal');
        if (!modal) return;
        
        document.getElementById('closeCustomerModal')?.addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        document.getElementById('cancelCustomerBtn')?.addEventListener('click', () => {
            modal.classList.remove('active');
        });
        
        document.getElementById('addCustomerBtn')?.addEventListener('click', () => {
            this.showCustomerModal();
        });
        
        document.getElementById('addCustomerViewBtn')?.addEventListener('click', () => {
            this.showCustomerModal();
        });
        
        document.getElementById('customerForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.saveCustomer();
        });
    }
    
    showCustomerModal() {
        document.getElementById('customerModalTitle').textContent = 'Add Customer';
        document.getElementById('customerForm').reset();
        document.getElementById('customerId').value = '';
        document.getElementById('customerModal').classList.add('active');
    }
    
    async saveCustomer() {
        const customerData = {
            name: document.getElementById('customerName').value,
            phone: document.getElementById('customerPhone').value,
            email: document.getElementById('customerEmail').value,
            notes: document.getElementById('customerNotes').value
        };
        
        try {
            const response = await this.apiRequest('/api/customers', 'POST', customerData);
            
            if (response.success) {
                document.getElementById('customerModal').classList.remove('active');
                showToast('Customer added successfully', 'success');
                await this.loadCustomers();
            }
        } catch (error) {
            showToast(error.message || 'Failed to save customer', 'error');
        }
    }
    
    // Inventory management functions
    async loadInventoryTable() {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;
        
        try {
            const response = await this.apiRequest('/api/inventory');
            const products = response.inventory ? Object.values(response.inventory) : [];
            
            tbody.innerHTML = products.map(product => `
                <tr>
                    <td>${product.sku}</td>
                    <td>${product.name}</td>
                    <td>${product.category}</td>
                    <td>${this.currencySymbol}${product.price.toFixed(2)}</td>
                    <td>${product.stock}</td>
                    <td>
                        <span class="stock-status ${product.stock <= 5 ? 'low' : product.stock <= 0 ? 'out' : ''}">
                            ${product.stock <= 0 ? 'Out of Stock' : product.stock <= 5 ? 'Low Stock' : 'In Stock'}
                        </span>
                    </td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn edit" onclick="posManager.editProduct('${product.id}')">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </button>
                            <button class="action-btn delete" onclick="posManager.deleteProduct('${product.id}')">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <polyline points="3 6 5 6 21 6"/>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                </svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading inventory:', error);
        }
    }
    
    async editProduct(productId) {
        try {
            const response = await this.apiRequest(`/api/inventory/${productId}`);
            const product = response.product;
            
            if (product) {
                document.getElementById('productModalTitle').textContent = 'Edit Product';
                document.getElementById('productId').value = product.id;
                document.getElementById('productName').value = product.name;
                document.getElementById('productSku').value = product.sku;
                document.getElementById('productPrice').value = product.price;
                document.getElementById('productStock').value = product.stock;
                document.getElementById('productCategory').value = product.category;
                document.getElementById('productDescription').value = product.description || '';
                
                document.getElementById('productModal').classList.add('active');
            }
        } catch (error) {
            showToast('Failed to load product', 'error');
        }
    }
    
    async deleteProduct(productId) {
        if (!confirm('Are you sure you want to delete this product?')) return;
        
        try {
            const response = await this.apiRequest(`/api/inventory/${productId}`, 'DELETE');
            
            if (response.success) {
                showToast('Product deleted successfully', 'success');
                await this.loadProducts();
                if (document.getElementById('inventoryTableBody')) {
                    await this.loadInventoryTable();
                }
            }
        } catch (error) {
            showToast(error.message || 'Failed to delete product', 'error');
        }
    }
    
    async loadCustomersTable() {
        const tbody = document.getElementById('customersTableBody');
        if (!tbody) return;
        
        try {
            const response = await this.apiRequest('/api/customers');
            const customers = response.customers ? Object.values(response.customers) : [];
            
            tbody.innerHTML = customers.map(customer => `
                <tr>
                    <td>${customer.name}</td>
                    <td>${customer.phone}</td>
                    <td>${customer.email || '-'}</td>
                    <td><span class="loyalty-badge ${customer.loyalty_tier?.toLowerCase() || 'bronze'}">${customer.loyalty_tier || 'Bronze'}</span></td>
                    <td>${customer.points || 0}</td>
                    <td>${this.currencySymbol}${(customer.total_purchases || 0).toFixed(2)}</td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Error loading customers:', error);
        }
    }
}

// Initialize POS manager
let posManager;
document.addEventListener('DOMContentLoaded', function() {
    posManager = new POSManager();
    
    // Update user display
    const user = authManager.getCurrentUser();
    if (user) {
        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');
        const userAvatarEl = document.getElementById('userAvatar');
        
        if (userNameEl) userNameEl.textContent = user.name || user.email;
        if (userRoleEl) userRoleEl.textContent = user.role || 'Staff';
        if (userAvatarEl) userAvatarEl.textContent = (user.name || user.email || 'U').charAt(0).toUpperCase();
    }
    
    // Setup navigation
    setupNavigation();
});

function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update active state
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            // Show corresponding view
            const page = item.dataset.page;
            showPage(page);
        });
    });
}

function showPage(page) {
    // Hide all views
    document.querySelectorAll('.pos-view, .products-view, .customers-view').forEach(view => {
        view.classList.add('hidden');
    });
    
    // Show selected view
    switch (page) {
        case 'pos':
            document.getElementById('posView')?.classList.remove('hidden');
            break;
        case 'products':
            document.getElementById('productsView')?.classList.remove('hidden');
            if (posManager) posManager.loadInventoryTable();
            break;
        case 'customers':
            document.getElementById('customersView')?.classList.remove('hidden');
            if (posManager) posManager.loadCustomersTable();
            break;
    }
}
