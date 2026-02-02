# VelvetPOS - Cosmetics Retail Point of Sale System

A production-ready, white-label POS system designed specifically for cosmetics retail businesses. Built with modern technologies and easily customizable for resale to different stores.

![VelvetPOS](https://via.placeholder.com/1200x600/D4AF37/FFFFFF?text=VelvetPOS+Cosmetics+POS)

## Features

### Core Functionality
- **Point of Sale Interface**: Fast, intuitive checkout process with touch-friendly design
- **Real-time Inventory Management**: Track stock levels across all products instantly
- **Customer Management**: Loyalty program integration with tiered rewards
- **Sales Analytics**: Comprehensive reporting and business insights
- **Multi-Staff Support**: Role-based access control (Owner, Admin, Manager, Staff)
- **Transaction History**: Complete audit trail of all sales

### Technical Features
- **Firebase Realtime Database**: Instant synchronization across all devices
- **Firebase Authentication**: Secure, scalable user management
- **Python Flask Backend**: Robust API with production-ready architecture
- **Responsive Design**: Works on tablets, desktops, and POS terminals
- **Offline Support**: Demo mode works without backend connection

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+ (optional, for development)
- Firebase Account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/velvet-pos-cosmetics.git
   cd velvet-pos-cosmetics
   ```

2. **Set up Python environment**
   ```bash
   cd server
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication (Email/Password provider)
   - Create a Realtime Database
   - Download service account credentials

4. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Firebase credentials
   ```

5. **Run the server**
   ```bash
   python app.py
   ```

6. **Access the application**
   - POS Interface: http://localhost:5000
   - Admin Dashboard: http://localhost:5000/admin
   - Login: http://localhost:5000/login

### Demo Mode
To test without Firebase setup, add `?demo=true` to any URL:
```
http://localhost:5000?demo=true
```

## Project Structure

```
velvet-pos-cosmetics/
├── server/                    # Python Flask Backend
│   ├── app.py                # Main application file
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Environment configuration template
│
├── client/                    # Frontend Files
│   ├── index.html            # POS Interface
│   ├── admin.html            # Admin Dashboard
│   ├── login.html            # Authentication Page
│   │
│   ├── css/                   # Stylesheets
│   │   ├── styles.css        # Core styles & variables
│   │   ├── pos.css           # POS-specific styles
│   │   └── admin.css         # Admin dashboard styles
│   │
│   └── js/                    # JavaScript Modules
│       ├── firebase-config.js # Firebase initialization
│       ├── auth.js           # Authentication
│       ├── pos.js            # POS functionality
│       └── admin.js          # Admin functionality
│
├── config/                    # Configuration Templates
│   └── store-config.js       # Store customization template
│
├── templates/                 # Email & Document Templates
│
└── README.md                  # This file
```

## Customization Guide

### 1. Changing Colors (Theme)

Edit the CSS variables in `client/css/styles.css`:

```css
:root {
    /* Primary Theme Colors */
    --primary-color: #D4AF37;      /* Change to your brand color */
    --primary-dark: #B8962E;       /* Darker shade for hover states */
    --primary-light: #E8C84A;      /* Lighter shade for backgrounds */
    
    /* Secondary Colors */
    --secondary-color: #2C3E50;
    
    /* Accent Colors */
    --accent-color: #E1C6D0;
}
```

### 2. Changing Fonts

```css
:root {
    --font-display: 'Playfair Display', Georgia, serif;
    --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}
```

Or import different fonts in the HTML files:
```html
<link href="https://fonts.googleapis.com/css2?family=YourFont:wght@400;500;600&display=swap" rel="stylesheet">
```

### 3. Adding Custom Categories

Edit the `DEMO_CATEGORIES` object in `server/app.py`:
```python
DEMO_CATEGORIES = {
    'cat_1': {'id': 'cat_1', 'name': 'Lipstick', 'sort_order': 1},
    'cat_2': {'id': 'cat_2', 'name': 'Foundation', 'sort_order': 2},
    'cat_3': {'id': 'cat_3', 'name': 'Your Custom Category', 'sort_order': 3},
}
```

### 4. Configuring Tax Rate

Edit `server/app.py`:
```python
# Default tax rate (8%)
tax_rate = 0.08

# Or set per-store in database config
config = db.reference(f'stores/{store_id}/config').get()
tax_rate = float(config.get('tax_rate', 0.08))
```

### 5. Store Branding

In the Admin Dashboard under Settings, configure:
- Store Name
- Currency
- Tax Rate
- Theme Color
- Logo URL
- Receipt Header/Footer

### 6. Creating a New Store Instance

For white-label deployment to different clients:

1. **Database Structure**: Each store gets isolated data under:
   ```json
   {
     "stores": {
       "store_id_001": { /* Store data */ },
       "store_id_002": { /* Another store */ }
     }
   }
   ```

2. **Customize Configuration**:
   ```python
   STORE_CONFIGS = {
       'store_id_001': {
           'name': 'Luxe Beauty Boutique',
           'theme_color': '#D4AF37',
           'currency': 'USD'
       },
       'store_id_002': {
           'name': 'Glamour Cosmetics',
           'theme_color': '#E91E63',
           'currency': 'EUR'
       }
   }
   ```

3. **Deploy with Docker** (optional):
   ```dockerfile
   FROM python:3.9-slim
   COPY . /app
   WORKDIR /app
   RUN pip install -r requirements.txt
   CMD ["python", "app.py"]
   ```

## API Reference

### Authentication
```
POST /api/auth/verify
POST /api/auth/create-user (Admin only)
```

### Inventory
```
GET    /api/inventory          # List all products
GET    /api/inventory/<id>     # Get single product
POST   /api/inventory          # Add product (Admin)
PUT    /api/inventory/<id>     # Update product (Admin)
DELETE /api/inventory/<id>     # Delete product (Admin)
```

### Transactions
```
GET  /api/transactions         # List transactions
POST /api/transactions         # Create sale
```

### Analytics
```
GET /api/analytics/sales       # Sales statistics
GET /api/analytics/top-products # Best sellers
```

### Customers
```
GET  /api/customers            # List customers
POST /api/customers            # Add customer
```

### Store Settings
```
GET  /api/store/config         # Get configuration
PUT  /api/store/config         # Update configuration (Owner)
```

## Deployment

### Production Server

1. **Using Gunicorn**:
   ```bash
   gunicorn -w 4 -b 0.0.0.0:5000 app:app
   ```

2. **Using Docker**:
   ```bash
   docker build -t velvet-pos .
   docker run -p 5000:5000 velvet-pos
   ```

3. **Using Google Cloud Run**:
   ```bash
   gcloud run deploy velvet-pos --source .
   ```

### Firebase Hosting

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Initialize:
   ```bash
   firebase init
   ```

3. Deploy:
   ```bash
   firebase deploy
   ```

## Security Considerations

1. **Authentication**: Use Firebase Auth with email verification
2. **Database Rules**: Implement proper Firebase Realtime Database rules:
   ```json
   {
     "rules": {
       "stores": {
         "$store_id": {
           ".read": "auth != null",
           ".write": "auth != null && root.child('stores').child($store_id).child('users').child(auth.uid).child('role').val() in ['admin', 'owner']"
         }
       }
     }
   }
   ```

3. **Environment Variables**: Never commit `.env` files
4. **HTTPS**: Always use HTTPS in production
5. **Rate Limiting**: Implement at load balancer level

## Support & Maintenance

### Updating Products
- Use the Admin Dashboard for visual updates
- Or use the API for bulk imports

### Backing Up Data
Firebase Realtime Database exports:
```bash
firebase database:export /path/to/export.json
```

### Monitoring
- Check `velvetpos.log` for application logs
- Use Firebase Console for database monitoring
- Set up Google Cloud Logging for production

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Contact

For support or customization requests:
- Email: support@velvetpos.com
- Website: https://velvetpos.com

---

Built with ❤️ for the cosmetics retail industry
