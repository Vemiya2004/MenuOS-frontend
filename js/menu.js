// ==========================================================
// MENU.JS - With Token Security System
// ⭐ Validates token on page load, blocks expired sessions
// ==========================================================

const API_BASE_URL = 'https://menuos-backend.onrender.com';

const urlParams = new URLSearchParams(window.location.search);
const tableNumber = urlParams.get('table') || 1;
const sessionToken = urlParams.get('token');  // ⭐ Token from URL

function getCartKey() {
    return `cart_table_${tableNumber}`;
}

console.log('🍽️ Table Number:', tableNumber);
console.log('🎫 Token:', sessionToken ? sessionToken.substring(0, 10) + '...' : 'NONE');

// =====================================================
// IMAGE HELPER
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
// STATE
// =====================================================
let categories = [];
let menuItems = [];
let selectedCategory = 'All';
let cart = [];
let selectedItem = null;
let selectedSize = null;

// =====================================================
// ⭐ TOKEN VALIDATION
// =====================================================

async function validateToken() {
    // No token in URL → block immediately
    if (!sessionToken) {
        showSessionExpiredScreen('no_token');
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
            showSessionExpiredScreen(result.reason);
            return false;
        }

        console.log(`✅ Token valid. ${result.remaining_seconds}s remaining`);

        // ⭐ Save token to sessionStorage (tab-specific, not copyable across devices easily)
        sessionStorage.setItem('session_token', sessionToken);
        sessionStorage.setItem('session_table', tableNumber);

        return true;

    } catch (err) {
        console.error('❌ Token validation network error:', err);
        // Allow if server is unreachable (optional: change to block)
        return true;
    }
}

function showSessionExpiredScreen(reason) {

    localStorage.removeItem(getCartKey());
    // Hide everything
    document.body.innerHTML = `
        <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #f9fafb;
            font-family: sans-serif;
            text-align: center;
            padding: 20px;
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
            <h1 style="font-size: 24px; color: #1f2937; margin-bottom: 12px;">
                Session Expired
            </h1>
            <p style="color: #6b7280; font-size: 16px; max-width: 300px; margin-bottom: 32px;">
                Your ordering session has expired.<br>
                Please scan the QR code on your table again to continue.
            </p>
            <div style="
                background: white;
                border: 2px dashed #d1d5db;
                border-radius: 16px;
                padding: 24px;
                max-width: 280px;
            ">
                <svg viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="1.5"
                     style="width: 64px; height: 64px; margin-bottom: 12px;">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                    <rect x="14" y="14" width="3" height="3"/>
                    <rect x="18" y="18" width="3" height="3"/>
                    <rect x="14" y="18" width="3" height="3"/>
                    <rect x="18" y="14" width="3" height="3"/>
                </svg>
                <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                    Scan the QR code<br>on your table
                </p>
            </div>
        </div>
    `;
}

// =====================================================
// INIT
// =====================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 DOM Loaded');

    if (!tableNumber) {
        console.error('❌ No table number!');
        window.location.href = 'index.html';
        return;
    }

    // ⭐ Validate token FIRST before loading anything
    const tokenValid = await validateToken();
    if (!tokenValid) return;  // Stop here if invalid

    const searchInput = document.getElementById('searchInput');
    if (!searchInput) {
        console.error('❌ Search input not found!');
        return;
    }

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && searchInput.value.trim() === 'admin990') {
            console.log('🔑 Admin access');
            window.location.href = `${API_BASE_URL}/admin/dashboard`;
            return;
        }
    });

    loadCart();
    updateCartBadge();
    loadData();
    setupEventListeners();
});

// =====================================================
// API
// =====================================================

async function loadCategories() {
    console.log('📡 Loading categories...');
    try {
        const url = `${API_BASE_URL}/api/categories`;
        const res = await fetch(url);
        if (res.ok) {
            categories = await res.json();
            categories.unshift({ id: 0, name: 'All', display_order: 0 });
            console.log('✅ Categories loaded:', categories);
        } else {
            throw new Error(`HTTP ${res.status}`);
        }
    } catch (error) {
        console.error('❌ Categories failed:', error);
        categories = [
            { id: 0, name: 'All' },
            { id: 1, name: 'Breakfast' },
            { id: 2, name: 'Lunch' },
            { id: 3, name: 'Dinner' },
            { id: 4, name: 'Treats' },
            { id: 5, name: 'Dessert' },
            { id: 6, name: 'Drinks' }
        ];
    }
}

async function loadMenu(category = 'All') {
    console.log('📡 Loading menu for category:', category);
    try {
        const url = category === 'All'
            ? `${API_BASE_URL}/api/menu`
            : `${API_BASE_URL}/api/menu?category=${category}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const items = await res.json();
        console.log('📦 Raw items received:', items.length);

        menuItems = items.map(item => {
    let sizes = null;
    if (item.has_sizes && item.sizes) {
        try {
            sizes = typeof item.sizes === 'string' ? JSON.parse(item.sizes) : item.sizes;
        } catch (e) {
            console.warn('⚠️ Size parse error:', item.name);
        }
    }

    return {
        id: item.id,
        name: item.name,
        description: item.description || '',
        price: item.discounted_base_price ?? item.base_price,
        original_price: item.original_base_price ?? item.base_price,
        has_offer: item.has_offer || false,
        discount_percent: item.discount_percent || 0,
        image_url: item.image_url,
        prep_time: item.prep_time || 15,
        rating: item.rating || 4.5,
        category: item.category,
        has_sizes: item.has_sizes,
        sizes: sizes
    };
});

        console.log('✅ Menu items transformed:', menuItems.length);

    } catch (error) {
        console.error('❌ Menu load failed:', error);
        menuItems = [];
    }
}

async function loadData() {
    showLoading(true);
    await loadCategories();
    await loadMenu();
    renderCategories();
    renderMenuItems();
    showLoading(false);
}

// =====================================================
// UI
// =====================================================

function showLoading(show) {
    const spinner = document.getElementById('loadingSpinner');
    const grid = document.getElementById('menuGrid');
    if (!spinner || !grid) return;
    spinner.style.display = show ? 'block' : 'none';
    grid.style.display = show ? 'none' : 'grid';
}

function renderCategories() {
    const list = document.getElementById('categoriesList');
    if (!list) return;

    list.innerHTML = categories.map(cat => `
        <button class="category-btn ${cat.name === selectedCategory ? 'active' : ''}" 
                data-category="${cat.name}">
            ${cat.name}
        </button>
    `).join('');

    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            selectedCategory = btn.dataset.category;
            showLoading(true);
            await loadMenu(selectedCategory);
            renderCategories();
            renderMenuItems();
            showLoading(false);
        });
    });
}

function renderMenuItems() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const filtered = menuItems.filter(item =>
        item.name.toLowerCase().includes(search) ||
        (item.description && item.description.toLowerCase().includes(search))
    );

    const grid = document.getElementById('menuGrid');
    if (!grid) return;

    if (filtered.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px; color: #9ca3af;">No items found</p>';
        return;
    }

    grid.innerHTML = filtered.map(item => {
        const imgUrl = getImageUrl(item.image_url, item.category);
        const placeholder = `${API_BASE_URL}/uploads/placeholder.jpg`;

        let priceText;
let oldPriceText = '';

if (item.has_sizes && item.sizes && item.sizes.length > 0) {
    const prices = item.sizes.map(s => Number(s.price));
    const min = Math.min(...prices);
    const max = Math.max(...prices);

    priceText = min === max ? `LKR ${min}` : `LKR ${min} - ${max}`;

    if (item.has_offer) {
        const originalPrices = item.sizes.map(s => Number(s.original_price || s.price));
        const originalMin = Math.min(...originalPrices);
        const originalMax = Math.max(...originalPrices);
        oldPriceText = originalMin === originalMax
            ? `LKR ${originalMin}`
            : `LKR ${originalMin} - ${originalMax}`;
    }
} else {
    priceText = `LKR ${item.price || 0}`;
    if (item.has_offer) {
        oldPriceText = `LKR ${item.original_price || item.price || 0}`;
    }
}
        

        return `
        <div class="menu-item" data-id="${item.id}">
            <div class="menu-item-image">
                <img src="${imgUrl}" alt="${item.name}"
                     onerror="this.onerror=null; this.src='${placeholder}';">
            </div>
            <div class="menu-item-content">
                <h3 class="menu-item-name">${item.name}</h3>
                <div class="menu-item-info">
                    <span class="info-item">⏱️ ${item.prep_time} min</span>
                    <span class="info-item">⭐ ${item.rating}</span>
                </div>
                ${item.has_offer ? `
    <div style="
        position:absolute;
        top:10px;
        left:10px;
        background:#ef4444;
        color:white;
        font-size:12px;
        font-weight:bold;
        padding:4px 8px;
        border-radius:999px;
        z-index:2;
    ">
        ${item.discount_percent}% OFF
    </div>
` : ''}

${item.has_offer ? `
    <p style="font-size:14px; color:#999; text-decoration:line-through; margin:0 0 4px 0;">
        ${oldPriceText}
    </p>
` : ''}

<p class="menu-item-price">${priceText}</p>
${item.has_sizes ? '<p style="font-size:12px; color:#999;">📏 Multiple sizes</p>' : ''}
            </div>
        </div>
        `;
    }).join('');

    document.querySelectorAll('.menu-item').forEach(el => {
        el.addEventListener('click', () => {
            showItemModal(parseInt(el.dataset.id));
        });
    });
}

function showItemModal(itemId) {
    selectedItem = menuItems.find(item => item.id === itemId);
    if (!selectedItem) return;

    selectedSize = null;

    document.getElementById('modalName').textContent = selectedItem.name;
    document.getElementById('modalDescription').textContent = selectedItem.description || '';
    document.getElementById('modalTime').textContent = `${selectedItem.prep_time} min`;
    document.getElementById('modalRating').textContent = selectedItem.rating;

    const imgUrl = getImageUrl(selectedItem.image_url, selectedItem.category);
    document.getElementById('modalImage').innerHTML = `
        <img src="${imgUrl}" alt="${selectedItem.name}"
             onerror="this.onerror=null; this.src='${API_BASE_URL}/uploads/placeholder.jpg';">
    `;

    const addBtn = document.getElementById('addToCartBtn');
    const priceDiv = document.getElementById('modalPrice');

    if (selectedItem.has_sizes && selectedItem.sizes && selectedItem.sizes.length > 0) {
        priceDiv.innerHTML = `
            <p style="font-weight: bold; margin-bottom: 10px;">Select Size:</p>
            ${selectedItem.sizes.map((size, i) => `
                <button class="size-option" data-idx="${i}" 
                        style="display: block; width: 100%; padding: 15px; margin: 8px 0; 
                               background: #f5f5f5; border: 2px solid #ddd; border-radius: 8px; 
                               cursor: pointer;">
                    <span style="font-weight: bold;">${size.name}</span>
                    <span style="float: right; color: #000000; font-weight: bold;">LKR ${size.price}</span>
                </button>
            `).join('')}
        `;

        document.querySelectorAll('.size-option').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.size-option').forEach(b => {
                    b.style.background = '#f5f5f5';
                    b.style.borderColor = '#ddd';
                });
                btn.style.background = '#2D7A7C';
                btn.style.color = 'black';
                selectedSize = selectedItem.sizes[parseInt(btn.dataset.idx)];
                addBtn.disabled = false;
                addBtn.style.opacity = '1';
            });
        });

        addBtn.disabled = true;
        addBtn.style.opacity = '0.5';
    } else {
        priceDiv.innerHTML = `<p style="font-size: 28px; color: #2D7A7C; font-weight: bold;">LKR ${selectedItem.price || 0}</p>`;
        addBtn.disabled = false;
        addBtn.style.opacity = '1';
    }

    document.getElementById('itemModal').classList.add('active');
}

function closeModal() {
    document.getElementById('itemModal').classList.remove('active');
}

// =====================================================
// CART
// =====================================================

function addToCart() {
    if (!selectedItem) return;
    if (selectedItem.has_sizes && !selectedSize) {
        Swal.fire({
            icon: 'warning',
            title: '⚠️ Size Required',
            text: 'Please select a size before adding to cart!',
            confirmButtonText: 'OK',
            confirmButtonColor: '#ff6b35',
            background: '#1a1a1a',
            color: '#fff'
        });
        return;
    }

    const item = {
        id: selectedItem.id,
        name: selectedItem.name,
        description: selectedItem.description,
        price: selectedItem.has_sizes ? selectedSize.price : selectedItem.price,
        size: selectedItem.has_sizes ? selectedSize.name : null,
        image_url: selectedItem.image_url,
        category: selectedItem.category,
        prep_time: selectedItem.prep_time,
        rating: selectedItem.rating,
        quantity: 1
    };

    const existing = cart.find(i =>
        i.id === item.id && (item.size ? i.size === item.size : !i.size)
    );

    if (existing) {
        existing.quantity++;
    } else {
        cart.push(item);
    }

    saveCart();
    updateCartBadge();
    closeModal();

    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Added to cart!',
        showConfirmButton: false,
        timer: 1500,
        timerProgressBar: true,
        background: '#2ed573',
        color: '#fff'
    });
}

function loadCart() {
    const saved = localStorage.getItem(getCartKey());
    cart = saved ? JSON.parse(saved) : [];
}

function saveCart() {
    localStorage.setItem(getCartKey(), JSON.stringify(cart));
}

function updateCartBadge() {
    const badge = document.getElementById('cartBadge');
    if (badge) {
        badge.textContent = cart.reduce((sum, i) => sum + i.quantity, 0);
    }
}

// =====================================================
// EVENTS
// =====================================================

function setupEventListeners() {
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) {
        cartBtn.addEventListener('click', () => {
            // ⭐ Pass token along to cart page
            window.location.href = `cart.html?table=${tableNumber}&token=${sessionToken}`;
        });
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', renderMenuItems);
    }

    const closeModalBtn = document.getElementById('closeModal');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    const modal = document.getElementById('itemModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target.id === 'itemModal') closeModal();
        });
    }

    const addBtn = document.getElementById('addToCartBtn');
    if (addBtn) {
        addBtn.addEventListener('click', addToCart);
    }
}
