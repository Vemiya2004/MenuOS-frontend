// =====================================================
// QR RESTAURANT ORDERING SYSTEM - CART PAGE
// ⭐ Token security: validates & passes token forward
// =====================================================

const API_BASE_URL = 'https://menuos-backend.onrender.com';

const urlParams = new URLSearchParams(window.location.search);
const tableNumber = urlParams.get('table') || 1;
const sessionToken = urlParams.get('token');  // ⭐ Token from URL

function getCartKey() {
    return `cart_table_${tableNumber}`;
}

console.log('🛒 Cart - Table Number:', tableNumber);
console.log('🎫 Token:', sessionToken ? sessionToken.substring(0, 10) + '...' : 'NONE');

// =====================================================
// IMAGE HELPER FUNCTION
// =====================================================
function getImageUrl(imagePath, category) {
    if (!imagePath) {
        return `${API_BASE_URL}/uploads/placeholder.jpg`;
    }
    if (imagePath.startsWith('http')) {
        return imagePath;
    }
    const filename = imagePath.split('/').pop();
    const cat = category ? category.toLowerCase() : 'general';
    return `${API_BASE_URL}/uploads/food_category/${cat}/${filename}`;
}

// =====================================================
// STATE VARIABLES
// =====================================================
let cart = [];

// =====================================================
// ⭐ TOKEN VALIDATION
// =====================================================

async function validateToken() {
    if (!sessionToken) {
        showSessionExpiredScreen();
        return false;
    }

    try {
        const res = await fetch(`${API_BASE_URL}/api/validate-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: sessionToken,
                table: parseInt(tableNumber)
            })
        });

        const result = await res.json();

        if (!result.valid) {
            console.warn('❌ Token invalid:', result.reason);
            showSessionExpiredScreen();
            return false;
        }

        console.log(`✅ Token valid. ${result.remaining_seconds}s remaining`);
        return true;

    } catch (err) {
        console.error('❌ Token validation error:', err);
        return true; // Allow if server unreachable
    }
}

function showSessionExpiredScreen() {

    localStorage.removeItem(getCartKey());

    document.body.innerHTML = `
        <div style="
            display: flex; flex-direction: column;
            align-items: center; justify-content: center;
            height: 100vh; background: #f9fafb;
            font-family: sans-serif; text-align: center; padding: 20px;
        ">
            <div style="
                width: 80px; height: 80px;
                background: linear-gradient(135deg, #ef4444, #dc2626);
                border-radius: 50%;
                display: flex; align-items: center; justify-content: center;
                margin-bottom: 24px;
            ">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"
                     style="width: 44px; height: 44px;">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
            </div>
            <h1 style="font-size: 24px; color: #1f2937; margin-bottom: 12px;">Session Expired</h1>
            <p style="color: #6b7280; font-size: 16px; max-width: 300px; margin-bottom: 32px;">
                Your ordering session has expired.<br>
                Please scan the QR code on your table again.
            </p>
            <div style="
                background: white; border: 2px dashed #d1d5db;
                border-radius: 16px; padding: 24px; max-width: 280px;
            ">
                <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5"
                     style="width: 64px; height: 64px; margin-bottom: 12px;">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                    <rect x="14" y="14" width="3" height="3"/>
                </svg>
                <p style="color: #9ca3af; font-size: 14px; margin: 0;">Scan the QR code on your table</p>
            </div>
        </div>
    `;
}

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 Cart page loaded. Table:', tableNumber);

    if (!tableNumber) {
        window.location.href = 'index.html';
        return;
    }

    // ⭐ Validate token first
    const tokenValid = await validateToken();
    if (!tokenValid) return;

    loadCart();
    renderCart();
    setupEventListeners();
});

// =====================================================
// CART DATA FUNCTIONS
// =====================================================

function loadCart() {
    const savedCart = localStorage.getItem(getCartKey());
    cart = savedCart ? JSON.parse(savedCart) : [];
    console.log('✅ Cart loaded ${tableNumber}:', cart.length, 'unique items');
}

function saveCart() {
    localStorage.setItem(getCartKey(), JSON.stringify(cart));
}

// =====================================================
// UI RENDERING
// =====================================================

function renderCart() {
    const emptyCart = document.getElementById('emptyCart');
    const cartItems = document.getElementById('cartItems');
    const cartFooter = document.getElementById('cartFooter');

    if (cart.length === 0) {
        emptyCart.style.display = 'flex';
        cartItems.style.display = 'none';
        cartFooter.style.display = 'none';
        return;
    }

    emptyCart.style.display = 'none';
    cartItems.style.display = 'block';
    cartFooter.style.display = 'block';

    cartItems.innerHTML = cart.map((item, index) => {
        const displayName = item.size ? `${item.name} (${item.size})` : item.name;
        const imageUrl = getImageUrl(item.image_url, item.category);
        const placeholderUrl = `${API_BASE_URL}/uploads/placeholder.jpg`;
        const itemKey = item.size ? `${item.id}-${item.size}` : `${item.id}`;

        return `
        <div class="cart-item" data-key="${itemKey}" data-index="${index}">
            <div class="cart-item-top">
                <div class="cart-item-image">
                    <img src="${imageUrl}" alt="${displayName}"
                         onerror="this.onerror=null; this.src='${placeholderUrl}';">
                </div>
                <div class="cart-item-info">
                    <h3 class="cart-item-name">${displayName}</h3>
                    ${item.size ? `<p class="cart-item-size" style="font-size: 12px; color: #999; margin-top: 3px;">Size: ${item.size}</p>` : ''}
                    <p class="cart-item-price">LKR ${item.price.toFixed(2)}</p>
                </div>
                <button class="cart-item-remove" data-index="${index}" title="Remove item">
                    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            </div>
            <div class="cart-item-bottom">
                <div class="quantity-controls">
                    <button class="quantity-btn" data-index="${index}" data-action="decrease">
                        <svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                    </button>
                    <span class="quantity-value">${item.quantity}</span>
                    <button class="quantity-btn" data-index="${index}" data-action="increase">
                        <svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <line x1="12" y1="5" x2="12" y2="19"/>
                            <line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                    </button>
                </div>
                <span class="item-total">LKR ${(item.price * item.quantity).toFixed(2)}</span>
            </div>
        </div>
        `;
    }).join('');

    updateTotals();
    addCartEventListeners();
}

function updateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    document.getElementById('subtotalAmount').textContent = `LKR ${subtotal.toFixed(2)}`;
    document.getElementById('taxAmount').textContent = `LKR ${tax.toFixed(2)}`;
    document.getElementById('totalAmount').textContent = `LKR ${total.toFixed(2)}`;
}

// =====================================================
// CART ITEM ACTIONS
// =====================================================

function addCartEventListeners() {
    document.querySelectorAll('.cart-item-remove').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            removeItemByIndex(parseInt(btn.dataset.index));
        });
    });

    document.querySelectorAll('.quantity-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            updateQuantityByIndex(parseInt(btn.dataset.index), btn.dataset.action);
        });
    });
}

function removeItemByIndex(index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
}

function updateQuantityByIndex(index, action) {
    const item = cart[index];
    if (!item) return;

    if (action === 'increase') {
        item.quantity++;
    } else if (action === 'decrease') {
        if (item.quantity > 1) {
            item.quantity--;
        } else {
            removeItemByIndex(index);
            return;
        }
    }

    saveCart();
    renderCart();
}

// =====================================================
// EVENT LISTENERS
// =====================================================

function setupEventListeners() {
    document.getElementById('backBtn').addEventListener('click', () => {
        // ⭐ Pass token back to menu
        window.location.href = `menu.html?table=${tableNumber}&token=${sessionToken}`;
    });

    document.getElementById('browseMenuBtn').addEventListener('click', () => {
        window.location.href = `menu.html?table=${tableNumber}&token=${sessionToken}`;
    });

    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            // ⭐ Pass token to checkout
            window.location.href = `checkout.html?table=${tableNumber}&token=${sessionToken}`;
        });
    }
}
