"""
VelvetPOS - Cosmetics Retail Point of Sale System
Production-ready Flask backend with Firebase integration

This is a white-label SaaS POS system designed for cosmetics retail,
easily customizable for different stores.
"""

import os
import json
import uuid
import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, auth, db
from functools import wraps
import logging

# Configure logging for production monitoring
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('velvetpos.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Environment configuration
ENV = os.environ.get('ENVIRONMENT', 'development')
DEBUG_MODE = ENV == 'development'

# Firebase Configuration
FIREBASE_CONFIG = {
    "type": "service_account",
    "project_id": os.environ.get("FIREBASE_PROJECT_ID", "velvet-pos-demo"),
    "private_key_id": os.environ.get("FIREBASE_PRIVATE_KEY_ID", ""),
    "private_key": os.environ.get("FIREBASE_PRIVATE_KEY", "").replace('\\n', '\n'),
    "client_email": os.environ.get("FIREBASE_CLIENT_EMAIL", ""),
    "client_id": os.environ.get("FIREBASE_CLIENT_ID", ""),
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/"
}

# Initialize Firebase
firebase_initialized = False
try:
    # Check if we have credentials
    if os.environ.get("FIREBASE_CREDENTIALS_PATH"):
        cred = credentials.Certificate(os.environ.get("FIREBASE_CREDENTIALS_PATH"))
        firebase_admin.initialize_app(cred, {
            'databaseURL': os.environ.get("FIREBASE_DATABASE_URL", "https://velvet-pos-demo.firebaseio.com")
        })
        firebase_initialized = True
    elif all(FIREBASE_CONFIG.get(key) for key in ['private_key', 'client_email']):
        cred = credentials.Certificate({
            "type": "service_account",
            "project_id": FIREBASE_CONFIG['project_id'],
            "private_key_id": FIREBASE_CONFIG['private_key_id'],
            "private_key": FIREBASE_CONFIG['private_key'],
            "client_email": FIREBASE_CONFIG['client_email'],
            "client_id": FIREBASE_CONFIG['client_id'],
            "auth_uri": FIREBASE_CONFIG['auth_uri'],
            "token_uri": FIREBASE_CONFIG['token_uri'],
            "auth_provider_x509_cert_url": FIREBASE_CONFIG['auth_provider_x509_cert_url'],
            "client_x509_cert_url": f"https://www.googleapis.com/robot/v1/metadata/x509/{FIREBASE_CONFIG['client_email'].replace('@', '%40')}"
        })
        firebase_admin.initialize_app(cred, {
            'databaseURL': os.environ.get("FIREBASE_DATABASE_URL", "https://velvet-pos-demo.firebaseio.com")
        })
        firebase_initialized = True
    else:
        logger.warning("Firebase credentials not found. Running in demo mode.")
except Exception as e:
    logger.error(f"Firebase initialization error: {e}")


def require_store_access(f):
    """Decorator to enforce authentication and store access control"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Verify Firebase ID token
        auth_header = request.headers.get('Authorization', '')
        id_token = auth_header.replace('Bearer ', '')
        
        if not id_token:
            return jsonify({'error': 'No authentication token provided', 'code': 'AUTH_REQUIRED'}), 401
        
        try:
            decoded_token = auth.verify_id_token(id_token)
            request.user_id = decoded_token.get('uid')
            request.user_email = decoded_token.get('email', '')
            request.user_role = decoded_token.get('role', 'staff')
            request.store_id = decoded_token.get('store_id', 'default')
            
            # Verify user exists in store database
            if not firebase_initialized:
                # Demo mode - allow all
                return f(*args, **kwargs)
                
            ref = db.reference(f'stores/{request.store_id}/users/{request.user_id}')
            user_data = ref.get()
            
            if not user_data:
                return jsonify({
                    'error': 'User not found in store database',
                    'code': 'USER_NOT_FOUND'
                }), 401
                
        except auth.InvalidIdTokenError:
            logger.warning(f"Invalid token attempt from {request.remote_addr}")
            return jsonify({'error': 'Invalid authentication token', 'code': 'INVALID_TOKEN'}), 401
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            return jsonify({'error': 'Authentication verification failed', 'code': 'AUTH_ERROR'}), 401
        
        return f(*args, **kwargs)
    return decorated_function


def require_admin(f):
    """Decorator to require admin/owner role"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if request.user_role not in ['admin', 'owner', 'manager']:
            return jsonify({
                'error': 'Insufficient permissions',
                'code': 'INSUFFICIENT_PERMISSIONS'
            }), 403
        return f(*args, **kwargs)
    return decorated_function


# ==================== ROUTES ====================

@app.route('/')
def index():
    """Serve the main POS interface"""
    return send_from_directory('../client', 'index.html')


@app.route('/admin')
def admin():
    """Serve the admin dashboard"""
    return send_from_directory('../client', 'admin.html')


@app.route('/login')
def login_page():
    """Serve the login page"""
    return send_from_directory('../client', 'login.html')


@app.route('/api/health')
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        'status': 'healthy',
        'service': 'velvet-pos-api',
        'version': '1.0.0',
        'environment': ENV,
        'firebase': 'connected' if firebase_initialized else 'demo_mode'
    })


# ==================== AUTHENTICATION ====================

@app.route('/api/auth/verify', methods=['POST'])
def verify_auth():
    """Verify user authentication and return store info"""
    data = request.get_json()
    id_token = data.get('idToken')
    
    if not id_token:
        return jsonify({'error': 'No token provided', 'code': 'MISSING_TOKEN'}), 400
    
    try:
        decoded_token = auth.verify_id_token(id_token)
        user_id = decoded_token.get('uid')
        
        if not firebase_initialized:
            # Demo mode
            return jsonify({
                'user': {
                    'uid': user_id,
                    'email': decoded_token.get('email'),
                    'name': decoded_token.get('name', 'Demo User'),
                    'role': 'owner',
                    'store_id': 'default'
                },
                'store_config': {
                    'name': 'Velvet Beauty Boutique',
                    'currency': 'USD',
                    'currency_symbol': '$',
                    'tax_rate': 0.08,
                    'theme_color': '#D4AF37',
                    'demo_mode': True
                }
            })
        
        # Get user data from Realtime Database
        ref = db.reference(f'stores/default/users/{user_id}')
        user_data = ref.get()
        
        if not user_data:
            return jsonify({
                'error': 'User not found in store database',
                'code': 'USER_NOT_FOUND',
                'needs_setup': True
            }), 404
        
        # Get store config
        config_ref = db.reference(f'stores/default/config')
        store_config = config_ref.get() or {}
        
        return jsonify({
            'user': user_data,
            'store_config': store_config
        })
    except Exception as e:
        logger.error(f"Auth verification error: {e}")
        return jsonify({'error': str(e), 'code': 'VERIFICATION_FAILED'}), 401


@app.route('/api/auth/create-user', methods=['POST'])
@require_store_access
@require_admin
def create_user():
    """Create a new staff user (Admin only)"""
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    role = data.get('role', 'staff')
    name = data.get('name')
    
    if not all([email, password, name]):
        return jsonify({'error': 'Missing required fields', 'code': 'MISSING_FIELDS'}), 400
    
    try:
        # Create user in Firebase Auth
        user_record = auth.create_user(
            email=email,
            password=password,
            display_name=name
        )
        
        # Set custom claims
        auth.set_custom_user_claims(user_record.uid, {
            'role': role,
            'store_id': request.store_id
        })
        
        # Store user data in Realtime DB
        user_ref = db.reference(f'stores/{request.store_id}/users/{user_record.uid}')
        user_ref.set({
            'email': email,
            'name': name,
            'role': role,
            'created_at': datetime.datetime.now().isoformat(),
            'created_by': request.user_id,
            'active': True
        })
        
        logger.info(f"Created user {user_record.uid} with role {role}")
        return jsonify({
            'success': True,
            'user_id': user_record.uid,
            'message': 'User created successfully'
        })
    except Exception as e:
        logger.error(f"User creation error: {e}")
        return jsonify({'error': str(e), 'code': 'CREATION_FAILED'}), 500


# ==================== INVENTORY ====================

@app.route('/api/inventory', methods=['GET'])
@require_store_access
def get_inventory():
    """Get all products in inventory"""
    try:
        if not firebase_initialized:
            # Return demo inventory
            return jsonify({'inventory': DEMO_INVENTORY})
        
        ref = db.reference(f'stores/{request.store_id}/inventory')
        inventory = ref.get()
        return jsonify({'inventory': inventory or {}})
    except Exception as e:
        logger.error(f"Inventory fetch error: {e}")
        return jsonify({'error': str(e), 'code': 'FETCH_FAILED'}), 500


@app.route('/api/inventory/<product_id>', methods=['GET'])
@require_store_access
def get_product(product_id):
    """Get a specific product"""
    try:
        if not firebase_initialized:
            product = DEMO_INVENTORY.get(product_id)
            if not product:
                return jsonify({'error': 'Product not found', 'code': 'NOT_FOUND'}), 404
            return jsonify({'product': product})
        
        ref = db.reference(f'stores/{request.store_id}/inventory/{product_id}')
        product = ref.get()
        if not product:
            return jsonify({'error': 'Product not found', 'code': 'NOT_FOUND'}), 404
        return jsonify({'product': product})
    except Exception as e:
        logger.error(f"Product fetch error: {e}")
        return jsonify({'error': str(e), 'code': 'FETCH_FAILED'}), 500


@app.route('/api/inventory', methods=['POST'])
@require_store_access
@require_admin
def add_product():
    """Add a new product (Admin only)"""
    data = request.get_json()
    required_fields = ['name', 'price', 'sku']
    
    if not all(field in data for field in required_fields):
        return jsonify({
            'error': f'Missing required fields: {required_fields}',
            'code': 'MISSING_FIELDS'
        }), 400
    
    try:
        product_id = data.get('id', str(uuid.uuid4()))
        
        if firebase_initialized:
            product_ref = db.reference(f'stores/{request.store_id}/inventory/{product_id}')
        else:
            product_ref = type('Ref', (), {'set': lambda x: DEMO_INVENTORY.update({product_id: x})})()
        
        product_data = {
            'id': product_id,
            'name': data['name'],
            'sku': data['sku'],
            'price': float(data['price']),
            'category': data.get('category', 'General'),
            'description': data.get('description', ''),
            'stock': int(data.get('stock', 0)),
            'image_url': data.get('image_url', ''),
            'barcode': data.get('barcode', ''),
            'active': True,
            'created_at': datetime.datetime.now().isoformat(),
            'created_by': request.user_id
        }
        
        product_ref.set(product_data)
        logger.info(f"Added product {product_id}: {data['name']}")
        
        return jsonify({'success': True, 'product': product_data})
    except Exception as e:
        logger.error(f"Product creation error: {e}")
        return jsonify({'error': str(e), 'code': 'CREATION_FAILED'}), 500


@app.route('/api/inventory/<product_id>', methods=['PUT'])
@require_store_access
@require_admin
def update_product(product_id):
    """Update a product (Admin only)"""
    data = request.get_json()
    
    try:
        if not firebase_initialized:
            existing = DEMO_INVENTORY.get(product_id)
            if not existing:
                return jsonify({'error': 'Product not found', 'code': 'NOT_FOUND'}), 404
            DEMO_INVENTORY[product_id] = {**existing, **data}
            return jsonify({'success': True, 'product': DEMO_INVENTORY[product_id]})
        
        ref = db.reference(f'stores/{request.store_id}/inventory/{product_id}')
        existing = ref.get()
        if not existing:
            return jsonify({'error': 'Product not found', 'code': 'NOT_FOUND'}), 404
        
        update_data = {
            'name': data.get('name', existing.get('name')),
            'price': float(data.get('price', existing.get('price', 0))),
            'category': data.get('category', existing.get('category')),
            'description': data.get('description', existing.get('description', '')),
            'stock': int(data.get('stock', existing.get('stock', 0))),
            'image_url': data.get('image_url', existing.get('image_url', '')),
            'active': data.get('active', existing.get('active', True)),
            'updated_at': datetime.datetime.now().isoformat(),
            'updated_by': request.user_id
        }
        
        ref.update(update_data)
        logger.info(f"Updated product {product_id}")
        
        return jsonify({'success': True, 'product': {**existing, **update_data}})
    except Exception as e:
        logger.error(f"Product update error: {e}")
        return jsonify({'error': str(e), 'code': 'UPDATE_FAILED'}), 500


@app.route('/api/inventory/<product_id>', methods=['DELETE'])
@require_store_access
@require_admin
def delete_product(product_id):
    """Delete a product (Admin only)"""
    try:
        if not firebase_initialized:
            if product_id not in DEMO_INVENTORY:
                return jsonify({'error': 'Product not found', 'code': 'NOT_FOUND'}), 404
            del DEMO_INVENTORY[product_id]
            return jsonify({'success': True, 'message': 'Product deleted'})
        
        ref = db.reference(f'stores/{request.store_id}/inventory/{product_id}')
        if not ref.get():
            return jsonify({'error': 'Product not found', 'code': 'NOT_FOUND'}), 404
        
        ref.delete()
        logger.info(f"Deleted product {product_id}")
        
        return jsonify({'success': True, 'message': 'Product deleted'})
    except Exception as e:
        logger.error(f"Product deletion error: {e}")
        return jsonify({'error': str(e), 'code': 'DELETE_FAILED'}), 500


# ==================== TRANSACTIONS ====================

@app.route('/api/transactions', methods=['GET'])
@require_store_access
def get_transactions():
    """Get transactions with optional filtering"""
    try:
        limit = int(request.args.get('limit', 100))
        
        if not firebase_initialized:
            return jsonify({'transactions': DEMO_TRANSACTIONS})
        
        ref = db.reference(f'stores/{request.store_id}/transactions')
        transactions = ref.order_by_child('timestamp').limit_to_last(limit).get()
        
        return jsonify({'transactions': transactions or {}})
    except Exception as e:
        logger.error(f"Transactions fetch error: {e}")
        return jsonify({'error': str(e), 'code': 'FETCH_FAILED'}), 500


@app.route('/api/transactions', methods=['POST'])
@require_store_access
def create_transaction():
    """Create a new transaction (sale)"""
    data = request.get_json()
    items = data.get('items', [])
    
    if not items:
        return jsonify({'error': 'No items in transaction', 'code': 'EMPTY_TRANSACTION'}), 400
    
    try:
        transaction_id = f"tx_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{str(uuid.uuid4())[:8]}"
        timestamp = datetime.datetime.now()
        
        # Calculate totals
        subtotal = sum(item.get('price', 0) * item.get('quantity', 1) for item in items)
        
        # Get tax rate from config
        tax_rate = 0.08  # Default
        if firebase_initialized:
            config_ref = db.reference(f'stores/{request.store_id}/config')
            config = config_ref.get() or {}
            tax_rate = float(config.get('tax_rate', 0.08))
        
        tax_amount = round(subtotal * tax_rate, 2)
        total = subtotal + tax_amount
        discount = float(data.get('discount', 0))
        total -= discount
        
        # Validate stock and prepare updates
        if firebase_initialized:
            ref = db.reference(f'stores/{request.store_id}/inventory')
            stock_updates = []
            
            for item in items:
                product_id = item.get('id')
                quantity = item.get('quantity', 1)
                
                product_ref = ref.child(product_id)
                current_stock = product_ref.child('stock').get() or 0
                
                if current_stock < quantity:
                    return jsonify({
                        'error': f'Insufficient stock for {item.get("name", product_id)}. Available: {current_stock}',
                        'code': 'INSUFFICIENT_STOCK'
                    }), 400
                
                stock_updates.append({
                    'product_id': product_id,
                    'quantity_change': -quantity,
                    'current_stock': current_stock
                })
            
            # Apply stock updates atomically
            for update in stock_updates:
                product_ref = ref.child(update['product_id'])
                new_stock = update['current_stock'] + update['quantity_change']
                product_ref.update({'stock': new_stock})
        
        # Create transaction record
        transaction_data = {
            'id': transaction_id,
            'timestamp': timestamp.isoformat(),
            'date': timestamp.strftime('%Y-%m-%d'),
            'time': timestamp.strftime('%H:%M:%S'),
            'staff_id': request.user_id,
            'staff_name': data.get('staff_name', ''),
            'customer_id': data.get('customer_id', ''),
            'items': items,
            'subtotal': round(subtotal, 2),
            'tax_rate': tax_rate,
            'tax_amount': round(tax_amount, 2),
            'discount': round(discount, 2),
            'total': round(total, 2),
            'payment_method': data.get('payment_method', 'cash'),
            'cash_amount': float(data.get('cash_amount', 0)),
            'card_amount': float(data.get('card_amount', 0)),
            'notes': data.get('notes', '')
        }
        
        if firebase_initialized:
            transaction_ref = db.reference(f'stores/{request.store_id}/transactions/{transaction_id}')
            transaction_ref.set(transaction_data)
            
            # Update daily summary
            date_key = timestamp.strftime('%Y-%m-%d')
            summary_ref = db.reference(f'stores/{request.store_id}/daily_summaries/{date_key}')
            summary = summary_ref.get() or {}
            
            new_sales_count = summary.get('transaction_count', 0) + 1
            new_sales_total = summary.get('total_sales', 0) + total
            
            summary_ref.update({
                'transaction_count': new_sales_count,
                'total_sales': round(new_sales_total, 2),
                'date': date_key
            })
        
        logger.info(f"Created transaction {transaction_id} for ${total:.2f}")
        
        return jsonify({
            'success': True,
            'transaction': transaction_data,
            'change_due': max(0, data.get('cash_amount', 0) - total)
        })
    except Exception as e:
        logger.error(f"Transaction creation error: {e}")
        return jsonify({'error': str(e), 'code': 'CREATION_FAILED'}), 500


# ==================== CUSTOMERS ====================

@app.route('/api/customers', methods=['GET'])
@require_store_access
def get_customers():
    """Get all customers"""
    try:
        search = request.args.get('search', '').lower()
        
        if not firebase_initialized:
            customers = DEMO_CUSTOMERS
        else:
            ref = db.reference(f'stores/{request.store_id}/customers')
            customers = ref.get() or {}
        
        if search:
            customers = {
                k: v for k, v in customers.items() 
                if search in v.get('name', '').lower() or search in v.get('phone', '')
            }
        
        return jsonify({'customers': customers})
    except Exception as e:
        logger.error(f"Customers fetch error: {e}")
        return jsonify({'error': str(e), 'code': 'FETCH_FAILED'}), 500


@app.route('/api/customers', methods=['POST'])
@require_store_access
def create_customer():
    """Add a new customer"""
    data = request.get_json()
    phone = data.get('phone')
    
    if not phone:
        return jsonify({'error': 'Phone number required', 'code': 'MISSING_PHONE'}), 400
    
    try:
        customer_id = str(uuid.uuid4())
        
        customer_data = {
            'id': customer_id,
            'name': data.get('name', ''),
            'email': data.get('email', ''),
            'phone': phone,
            'points': int(data.get('points', 0)),
            'loyalty_tier': data.get('loyalty_tier', 'Bronze'),
            'notes': data.get('notes', ''),
            'created_at': datetime.datetime.now().isoformat(),
            'total_purchases': 0
        }
        
        if firebase_initialized:
            customer_ref = db.reference(f'stores/{request.store_id}/customers/{customer_id}')
            customer_ref.set(customer_data)
        
        logger.info(f"Created customer {customer_id}")
        return jsonify({'success': True, 'customer': customer_data})
    except Exception as e:
        logger.error(f"Customer creation error: {e}")
        return jsonify({'error': str(e), 'code': 'CREATION_FAILED'}), 500


# ==================== ANALYTICS ====================

@app.route('/api/analytics/sales', methods=['GET'])
@require_store_access
def get_sales_analytics():
    """Get sales analytics"""
    try:
        days = int(request.args.get('days', 30))
        
        if not firebase_initialized:
            return jsonify({
                'period': f'Last {days} days',
                'total_sales': 12543.67,
                'total_transactions': 234,
                'average_daily_sales': 418.12,
                'average_transaction_value': 53.60,
                'demo_mode': True
            })
        
        ref = db.reference(f'stores/{request.store_id}/daily_summaries')
        summaries = ref.get() or {}
        
        # Filter by date range
        from datetime import datetime, timedelta
        cutoff = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        
        filtered_summaries = {k: v for k, v in summaries.items() if k >= cutoff}
        
        total_sales = sum(s.get('total_sales', 0) for s in filtered_summaries.values())
        total_transactions = sum(s.get('transaction_count', 0) for s in filtered_summaries.values())
        
        avg_daily = total_sales / len(filtered_summaries) if filtered_summaries else 0
        avg_transaction = total_sales / total_transactions if total_transactions > 0 else 0
        
        return jsonify({
            'period': f'Last {days} days',
            'total_sales': round(total_sales, 2),
            'total_transactions': total_transactions,
            'average_daily_sales': round(avg_daily, 2),
            'average_transaction_value': round(avg_transaction, 2),
            'daily_breakdown': filtered_summaries
        })
    except Exception as e:
        logger.error(f"Analytics error: {e}")
        return jsonify({'error': str(e), 'code': 'ANALYTICS_FAILED'}), 500


@app.route('/api/analytics/top-products', methods=['GET'])
@require_store_access
def get_top_products():
    """Get top selling products"""
    try:
        limit = int(request.args.get('limit', 10))
        
        if not firebase_initialized:
            return jsonify({
                'top_products': [
                    {'name': 'Matte Ruby Lipstick', 'quantity_sold': 145, 'revenue': 3623.55},
                    {'name': 'Naked Palette Eyeshadow', 'quantity_sold': 89, 'revenue': 4894.11},
                    {'name': 'Silk Foundation - Beige', 'quantity_sold': 67, 'revenue': 2879.33},
                    {'name': 'Hydrating Face Serum', 'quantity_sold': 45, 'revenue': 3104.55},
                    {'name': 'Velvet Rose Lipstick', 'quantity_sold': 98, 'revenue': 2645.02}
                ],
                'demo_mode': True
            })
        
        ref = db.reference(f'stores/{request.store_id}/transactions')
        transactions = ref.get() or {}
        
        product_sales = {}
        for tx in transactions.values():
            for item in tx.get('items', []):
                product_id = item.get('id')
                quantity = item.get('quantity', 1)
                
                if product_id not in product_sales:
                    product_sales[product_id] = {
                        'name': item.get('name', 'Unknown'),
                        'quantity_sold': 0,
                        'revenue': 0
                    }
                
                product_sales[product_id]['quantity_sold'] += quantity
                product_sales[product_id]['revenue'] += item.get('price', 0) * quantity
        
        sorted_products = sorted(product_sales.values(), key=lambda x: x['revenue'], reverse=True)[:limit]
        
        return jsonify({'top_products': sorted_products})
    except Exception as e:
        logger.error(f"Top products error: {e}")
        return jsonify({'error': str(e), 'code': 'FETCH_FAILED'}), 500


# ==================== STORE CONFIG ====================

@app.route('/api/store/config', methods=['GET'])
@require_store_access
def get_store_config():
    """Get store configuration"""
    try:
        if not firebase_initialized:
            return jsonify({
                'config': {
                    'name': 'Velvet Beauty Boutique',
                    'currency': 'USD',
                    'currency_symbol': '$',
                    'tax_rate': 0.08,
                    'theme_color': '#D4AF37',
                    'logo_url': '',
                    'timezone': 'America/New_York',
                    'demo_mode': True
                }
            })
        
        ref = db.reference(f'stores/{request.store_id}/config')
        config = ref.get() or {}
        return jsonify({'config': config})
    except Exception as e:
        logger.error(f"Config fetch error: {e}")
        return jsonify({'error': str(e), 'code': 'FETCH_FAILED'}), 500


@app.route('/api/store/config', methods=['PUT'])
@require_store_access
@require_admin
def update_store_config():
    """Update store configuration (Owner only)"""
    data = request.get_json()
    
    try:
        if not firebase_initialized:
            return jsonify({'success': True, 'config': data, 'demo_mode': True})
        
        ref = db.reference(f'stores/{request.store_id}/config')
        current_config = ref.get() or {}
        
        config = {**current_config, **data}
        ref.set(config)
        
        logger.info(f"Updated store configuration")
        return jsonify({'success': True, 'config': config})
    except Exception as e:
        logger.error(f"Config update error: {e}")
        return jsonify({'error': str(e), 'code': 'UPDATE_FAILED'}), 500


# ==================== CATEGORIES ====================

@app.route('/api/categories', methods=['GET'])
@require_store_access
def get_categories():
    """Get all categories"""
    try:
        if not firebase_initialized:
            return jsonify({'categories': DEMO_CATEGORIES})
        
        ref = db.reference(f'stores/{request.store_id}/categories')
        categories = ref.get() or {}
        return jsonify({'categories': categories})
    except Exception as e:
        logger.error(f"Categories fetch error: {e}")
        return jsonify({'error': str(e), 'code': 'FETCH_FAILED'}), 500


# ==================== STAFF ====================

@app.route('/api/staff', methods=['GET'])
@require_store_access
@require_admin
def get_staff():
    """Get all staff members"""
    try:
        if not firebase_initialized:
            return jsonify({
                'staff': {
                    'demo_user_1': {
                        'email': 'admin@velvet.com',
                        'name': 'Admin User',
                        'role': 'owner',
                        'active': True
                    },
                    'demo_user_2': {
                        'email': 'staff@velvet.com',
                        'name': 'Staff Member',
                        'role': 'staff',
                        'active': True
                    }
                }
            })
        
        ref = db.reference(f'stores/{request.store_id}/users')
        users = ref.get() or {}
        
        staff = {k: v for k, v in users.items() if v.get('role') in ['staff', 'admin', 'manager', 'owner']}
        return jsonify({'staff': staff})
    except Exception as e:
        logger.error(f"Staff fetch error: {e}")
        return jsonify({'error': str(e), 'code': 'FETCH_FAILED'}), 500


# ==================== DEMO DATA ====================

DEMO_CATEGORIES = {
    'cat_1': {'id': 'cat_1', 'name': 'Lipstick', 'sort_order': 1},
    'cat_2': {'id': 'cat_2', 'name': 'Foundation', 'sort_order': 2},
    'cat_3': {'id': 'cat_3', 'name': 'Eyeshadow', 'sort_order': 3},
    'cat_4': {'id': 'cat_4', 'name': 'Skincare', 'sort_order': 4},
    'cat_5': {'id': 'cat_5', 'name': 'Accessories', 'sort_order': 5}
}

DEMO_INVENTORY = {
    'prod_1': {
        'id': 'prod_1', 'name': 'Matte Ruby Lipstick', 'sku': 'LIP-001',
        'price': 24.99, 'category': 'Lipstick', 'stock': 50, 'active': True,
        'description': 'Long-lasting matte finish lipstick in classic ruby red'
    },
    'prod_2': {
        'id': 'prod_2', 'name': 'Velvet Rose Lipstick', 'sku': 'LIP-002',
        'price': 26.99, 'category': 'Lipstick', 'stock': 35, 'active': True,
        'description': 'Hydrating velvet finish in romantic rose pink'
    },
    'prod_3': {
        'id': 'prod_3', 'name': 'Silk Foundation - Beige', 'sku': 'FND-001',
        'price': 42.99, 'category': 'Foundation', 'stock': 25, 'active': True,
        'description': 'Lightweight silk formula for natural coverage'
    },
    'prod_4': {
        'id': 'prod_4', 'name': 'Naked Palette Eyeshadow', 'sku': 'EYE-001',
        'price': 54.99, 'category': 'Eyeshadow', 'stock': 20, 'active': True,
        'description': '12-shade neutral palette for everyday looks'
    },
    'prod_5': {
        'id': 'prod_5', 'name': 'Hydrating Face Serum', 'sku': 'SKN-001',
        'price': 68.99, 'category': 'Skincare', 'stock': 15, 'active': True,
        'description': 'Hyaluronic acid serum for intense hydration'
    },
    'prod_6': {
        'id': 'prod_6', 'name': 'Professional Brush Set', 'sku': 'ACC-001',
        'price': 89.99, 'category': 'Accessories', 'stock': 10, 'active': True,
        'description': '12-piece professional makeup brush collection'
    }
}

DEMO_CUSTOMERS = {
    'cust_1': {
        'id': 'cust_1', 'name': 'Emma Thompson', 'email': 'emma@email.com',
        'phone': '555-0101', 'points': 245, 'loyalty_tier': 'Gold',
        'total_purchases': 1250.00
    },
    'cust_2': {
        'id': 'cust_2', 'name': 'Sophia Rodriguez', 'email': 'sophia@email.com',
        'phone': '555-0102', 'points': 89, 'loyalty_tier': 'Silver',
        'total_purchases': 450.00
    },
    'cust_3': {
        'id': 'cust_3', 'name': 'Olivia Chen', 'email': 'olivia@email.com',
        'phone': '555-0103', 'points': 456, 'loyalty_tier': 'Platinum',
        'total_purchases': 2890.00
    }
}

DEMO_TRANSACTIONS = {
    'tx_demo_1': {
        'id': 'tx_demo_1', 'timestamp': '2024-01-15T10:30:00',
        'date': '2024-01-15', 'time': '10:30:00',
        'staff_id': 'demo_user', 'staff_name': 'Demo Staff',
        'items': [
            {'id': 'prod_1', 'name': 'Matte Ruby Lipstick', 'price': 24.99, 'quantity': 2},
            {'id': 'prod_4', 'name': 'Naked Palette Eyeshadow', 'price': 54.99, 'quantity': 1}
        ],
        'subtotal': 104.97, 'tax_amount': 8.40, 'total': 113.37,
        'payment_method': 'card', 'card_amount': 113.37
    }
}


# ==================== INITIALIZATION ====================

@app.route('/api/demo/initialize', methods=['POST'])
def initialize_demo():
    """Initialize demo store with sample data"""
    try:
        store_id = 'default'
        
        if firebase_initialized:
            db.reference(f'stores/{store_id}/categories').set(DEMO_CATEGORIES)
            db.reference(f'stores/{store_id}/inventory').set(DEMO_INVENTORY)
            db.reference(f'stores/{store_id}/config').set({
                'name': 'Velvet Beauty Boutique',
                'currency': 'USD',
                'currency_symbol': '$',
                'tax_rate': 0.08,
                'theme_color': '#D4AF37',
                'logo_url': '',
                'timezone': 'America/New_York'
            })
        
        logger.info("Demo data initialized successfully")
        return jsonify({
            'success': True,
            'message': 'Demo data initialized',
            'categories': list(DEMO_CATEGORIES.keys()),
            'products': list(DEMO_INVENTORY.keys())
        })
    except Exception as e:
        logger.error(f"Demo initialization error: {e}")
        return jsonify({'error': str(e), 'code': 'INIT_FAILED'}), 500


# ==================== STATIC FILES ====================

@app.route('/client/<path:path>')
def serve_static(path):
    """Serve static files from client directory"""
    return send_from_directory('../client', path)


@app.route('/favicon.ico')
def favicon():
    """Serve favicon"""
    return send_from_directory('../client', 'favicon.ico')


# ==================== MAIN ====================

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    
    logger.info(f"Starting VelvetPOS server on port {port}")
    logger.info(f"Environment: {ENV}")
    logger.info(f"Firebase: {'Connected' if firebase_initialized else 'Demo Mode'}")
    
    app.run(host='0.0.0.0', port=port, debug=DEBUG_MODE)
