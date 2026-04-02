// =====================================================
// QR RESTAURANT ORDERING SYSTEM - CHECKOUT PAGE
// ⭐ Token security: validates token & sends with order
// =====================================================

const API_BASE_URL = 'https://menuos-backend.onrender.com';

const urlParams = new URLSearchParams(window.location.search);
const tableNumber = urlParams.get('table') || 1;
const sessionToken = urlParams.get('token');  // ⭐ Token from URL

function getCartKey () {
    return `cart_table_${tableNumber}`;
}

console.log('💳 Checkout - Table Number:', tableNumber);
console.log('🎫 Token:', sessionToken ? sessionToken.substring(0, 10) + '...' : 'NONE');

// =====================================================
// STATE VARIABLES
// =====================================================
let cart = [];
let paymentMethod = 'pay-now';
let isSubmitting = false;

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
        return true;
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

function resetCheckoutButtonState() {
    isSubmitting = false;

    const confirmBtn = document.getElementById('confirmOrderBtn');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');

    if (confirmBtn) confirmBtn.disabled = false;
    if (btnText) {
        btnText.style.display = 'inline';
        btnText.textContent = 'Confirm Order';
    }
    if (btnSpinner) btnSpinner.style.display = 'none';
}

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 Checkout page loaded');

    if (!tableNumber) {
        window.location.href = 'index.html';
        return;
    }

    // ⭐ Validate token first
    const tokenValid = await validateToken();
    if (!tokenValid) return;

    loadCart();

    if (cart.length === 0) {
        window.location.href = `menu.html?table=${tableNumber}&token=${sessionToken}`;
        return;
    }

    const savedMethod = localStorage.getItem('paymentMethod');
    if (savedMethod) {
        paymentMethod = savedMethod;
        const radioBtn = document.querySelector(`input[value="${paymentMethod}"]`);
        if (radioBtn) radioBtn.checked = true;
    }

    renderOrderSummary();
    function resetCheckoutButtonState() {
        isSubmitting = false;

        const confirmBtn = document.getElementById('confirmOrderBtn');
        const btnText = document.getElementById('btnText');
        const btnSpinner = document.getElementById('btnSpinner');

        if (confirmBtn) confirmBtn.disabled = false;
        if (btnText) {
            btnText.style.display = 'inline';
            btnText.textContent = 'Confirm Order';
        }
        if (btnSpinner) btnSpinner.style.display = 'none';
    }

    setupEventListeners();
    createConfirmationModal();

    
    if (sessionStorage.getItem('payment_failed_return') === "1") {
        sessionStorage.removeItem('payment_failed_return');
        showToast('Payment declined. Please try again.', 'warning');
    }

    function resetCheckoutButtonState() {
        isSubmitting = false;

        const confirmBtn = document.getElementById('confirmOrderBtn');
        const btnText = document.getElementById('btnText');
        const btnSpinner = document.getElementById('btnSpinner');

        if (confirmBtn) confirmBtn.disabled = false;
        if (btnText) {
            btnText.style.display = 'inline';
            btnText.textContent = 'Confirm Order';
        }
        if (btnSpinner) btnSpinner.style.display = 'none';
    }
    resetCheckoutButtonState();

    resetCheckoutButtonState();

    if (sessionStorage.getItem('payment_failed_return') === '1') {
            sessionStorage.removeItem('payment_failed_return');
            showToast('Payment declined. Please try again.', 'warning');
        }

    console.log('✅ Checkout initialized');
});

window.addEventListener('pageshow', () => {
    resetCheckoutButtonState();

    if (sessionStorage.getItem('payment_failed_return') === '1') {
        sessionStorage.removeItem('payment_failed_return');
        showToast('Payment declined. Please try again.', 'warning');
    }
});

window.addEventListener('focus', () => {
    resetCheckoutButtonState();
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        resetCheckoutButtonState();
    }
});    

// =====================================================
// CART FUNCTIONS
// =====================================================

function loadCart() {
    const savedCart = localStorage.getItem('cart');
    cart = savedCart ? JSON.parse(savedCart) : [];
    console.log('📦 Cart loaded:', cart.length, 'items');
}

function calculateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;
    return { subtotal, tax, total };
}

function renderOrderSummary() {
    const orderSummary = document.getElementById('orderSummary');

    orderSummary.innerHTML = cart.map(item => {
        const displayName = item.size ? `${item.name} (${item.size})` : item.name;
        return `
        <div class="order-item">
            <span>${item.quantity} x ${displayName}</span>
            <span>LKR ${(item.price * item.quantity).toFixed(2)}</span>
        </div>
        `;
    }).join('');

    const { subtotal, tax, total } = calculateTotals();
    document.getElementById('subtotalAmount').textContent = `LKR ${subtotal.toFixed(2)}`;
    document.getElementById('taxAmount').textContent = `LKR ${tax.toFixed(2)}`;
    document.getElementById('totalAmount').textContent = `LKR ${total.toFixed(2)}`;
}

// =====================================================
// CONFIRMATION MODAL
// =====================================================

function createConfirmationModal() {
    const modalHTML = `
    <div id="confirmModal" class="custom-modal">
        <div class="custom-modal-content">
            <div class="confirm-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </div>
            <h2 style="margin: 20px 0 10px 0; font-size: 24px; color: #1f2937;">Confirm Your Order?</h2>
            <p id="confirmAmount" style="font-size: 32px; font-weight: bold; color: #2D7A7C; margin: 10px 0;">LKR 0.00</p>
            <p style="color: #6b7280; margin-bottom: 30px;">Table ${tableNumber}</p>
            <div style="display: flex; gap: 15px; width: 100%;">
                <button id="cancelConfirmBtn" class="modal-btn cancel-btn">Cancel</button>
                <button id="proceedConfirmBtn" class="modal-btn confirm-btn">Confirm Order</button>
            </div>
        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    const style = document.createElement('style');
    style.textContent = `
        .custom-modal {
            display: none; position: fixed; top: 0; left: 0;
            width: 100%; height: 100%; background: rgba(0,0,0,0.6);
            z-index: 10000; opacity: 0; transition: opacity 0.3s ease;
            backdrop-filter: blur(5px);
        }
        .custom-modal.active {
            display: flex; align-items: center; justify-content: center; opacity: 1;
        }
        .custom-modal-content {
            background: white; padding: 40px; border-radius: 20px;
            text-align: center; max-width: 400px; width: 90%;
            transform: scale(0.7);
            transition: transform 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        .custom-modal.active .custom-modal-content { transform: scale(1); }
        .confirm-icon {
            width: 80px; height: 80px; margin: 0 auto 20px;
            background: linear-gradient(135deg, #10b981, #059669);
            border-radius: 50%; display: flex; align-items: center; justify-content: center;
        }
        .confirm-icon svg { width: 50px; height: 50px; color: white; }
        .modal-btn {
            flex: 1; padding: 15px 30px; border: none; border-radius: 12px;
            font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
        }
        .cancel-btn { background: #f3f4f6; color: #374151; }
        .cancel-btn:hover { background: #e5e7eb; transform: translateY(-2px); }
        .confirm-btn { background: linear-gradient(135deg, #2D7A7C, #1f5456); color: white; }
        .confirm-btn:hover { transform: translateY(-2px); box-shadow: 0 10px 25px rgba(45,122,124,0.3); }
    `;
    document.head.appendChild(style);
}

function showConfirmModal() {
    const modal = document.getElementById('confirmModal');
    const { total } = calculateTotals();
    document.getElementById('confirmAmount').textContent = `LKR ${total.toFixed(2)}`;
    modal.classList.add('active');

    document.getElementById('cancelConfirmBtn').onclick = () => {
        modal.classList.remove('active');
        setTimeout(() => modal.style.display = 'none', 300);
    };

    document.getElementById('proceedConfirmBtn').onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
            if (paymentMethod === 'pay-now') {
                showPaymentGateway();
            } else {
                submitOrder();
            }
        }, 300);
    };
}

// =====================================================
// ⭐ ORDER SUBMISSION - Token included
// =====================================================

async function submitOrder() {
    console.log('📤 Submitting order...');

    if (isSubmitting) return;
    isSubmitting = true;

    const confirmBtn = document.getElementById('confirmOrderBtn');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');

    confirmBtn.disabled = true;
    btnText.style.display = 'none';
    btnSpinner.style.display = 'block';

    try {
        const { subtotal, tax, total } = calculateTotals();

        const orderData = {
            table_number: parseInt(tableNumber),
            items: cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                size: item.size || null,
                image: item.image_url
            })),
            subtotal: parseFloat(subtotal.toFixed(2)),
            tax: parseFloat(tax.toFixed(2)),
            total: parseFloat(total.toFixed(2)), 
            payment_method: paymentMethod === 'pay-now' ? 'PayHere' : paymentMethod,
            payment_status: 'pending',
            payment_details: paymentMethod === 'pay-now' ? null : collectPaymentDetails(), 
            token: sessionToken
        };

        const response = await fetch(`${API_BASE_URL}/api/order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(orderData)
        });

        const result = await response.json();
        console.log('📥 Response:', result);

        if (response.ok && result.success) {
            console.log('✅ Order created:', result.order_id);

            localStorage.removeItem(getCartKey());

            if (result.redirect_url) {
                window.location.href = result.redirect_url;
            } else {
                window.location.href = `success.html?orderId=${encodeURIComponent(result.order_id)}&table=${tableNumber}&token=${encodeURIComponent(sessionToken)}`;
            }

        } else if (response.status === 401) {
            showSessionExpiredScreen();
        } else {
            throw new Error(result.error || 'Order failed');
        }

    } catch (error) {
        console.error('❌ Error:', error);
        showErrorModal(error.message || 'Error submitting order');

        const confirmBtn = document.getElementById('confirmOrderBtn');
        const btnText = document.getElementById('btnText');
        const btnSpinner = document.getElementById('btnSpinner');

        confirmBtn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
        isSubmitting = false;
    }
}


// =====================================================
// ERROR MODAL
// =====================================================

function showErrorModal(message) {
    const existingModal = document.getElementById('errorModal');
    if (existingModal) existingModal.remove();

    const modalHTML = `
    <div id="errorModal" class="custom-modal active" style="display: flex;">
        <div class="custom-modal-content">
            <div style="width: 80px; height: 80px; margin: 0 auto; 
                        background: linear-gradient(135deg, #ef4444, #dc2626); 
                        border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width: 50px; height: 50px;">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/>
                    <line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
            </div>
            <h2 style="margin: 20px 0 10px 0; font-size: 24px; color: #1f2937;">Order Failed</h2>
            <p style="color: #6b7280; margin-bottom: 30px;">${message}</p>
            <button onclick="document.getElementById('errorModal').remove()" 
                    class="modal-btn confirm-btn" style="width: 100%;">Try Again</button>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// =====================================================
// EVENT LISTENERS
// =====================================================

function setupEventListeners() {
    document.getElementById('backBtn').addEventListener('click', () => {
        // ⭐ Pass token back to cart
        window.location.href = `cart.html?table=${tableNumber}&token=${sessionToken}`;
    });

    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            paymentMethod = e.target.value;
            localStorage.setItem('paymentMethod', paymentMethod);
        });
    });

    document.getElementById('confirmOrderBtn').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showConfirmModal();
    });
}

// =====================================================
// PAYMENT GATEWAY MODAL
// =====================================================

let selectedPaymentGateway = null;

async function startCardGatewayOnly() {
    try {
        const confirmBtn = document.getElementById('confirmOrderBtn');
        const btnText = document.getElementById('btnText');
        const btnSpinner = document.getElementById('btnSpinner');

        confirmBtn.disabled = true;
        btnText.style.display = 'none';
        btnSpinner.style.display = 'block';

        const { subtotal, tax, total } = calculateTotals();

        // ✅ Save order payload locally (NOT to backend yet)
        const pendingPaidOrder = {
            table_number: parseInt(tableNumber),
            items: cart.map(item => ({
                id: item.id,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                size: item.size || null,
                image: item.image_url
            })),
            subtotal: parseFloat(subtotal.toFixed(2)),
            tax: parseFloat(tax.toFixed(2)),
            total: parseFloat(total.toFixed(2)),
            payment_method: 'PayHere',
            payment_status: 'paid',
            payment_details: {
                gateway: 'PayHere',
                type: 'Cards'
            },
            token: sessionToken
        };

        sessionStorage.setItem('pending_paid_order', JSON.stringify(pendingPaidOrder));

        const tempOrderId = `TEMP-${Date.now()}`;

        const payment = await createPayHereSession({
            order_id: tempOrderId,
            total: total,
            table_number: parseInt(tableNumber),
            token: sessionToken
        });

        // ✅ IMPORTANT: Do NOT save order here
        payhere.onCompleted = function(orderId) {
            console.log("✅ PayHere flow finished:", orderId);
            // PayHere will return user to payment-result.html via return_url
        };

        payhere.onDismissed = function() {
            console.warn("⚠️ PayHere popup dismissed");

            confirmBtn.disabled = false;
            btnText.style.display = 'inline';
            btnSpinner.style.display = 'none';
            isSubmitting = false;

            showToast('Payment cancelled', 'warning');
        };

        payhere.onError = function(error) {
            console.error("❌ PayHere error:", error);

            confirmBtn.disabled = false;
            btnText.style.display = 'inline';
            btnSpinner.style.display = 'none';
            isSubmitting = false;

            showErrorModal(typeof error === 'string' ? error : 'Payment gateway error');
        };

        payhere.startPayment(payment);

    } catch (error) {
        console.error("❌ Failed to start card gateway:", error);

        const confirmBtn = document.getElementById('confirmOrderBtn');
        const btnText = document.getElementById('btnText');
        const btnSpinner = document.getElementById('btnSpinner');

        confirmBtn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
        isSubmitting = false;

        showErrorModal(error.message || 'Failed to start payment');
    }
}

async function createPayHereSession(orderData) {
    const res = await fetch(`${API_BASE_URL}/api/payhere/session`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify({
            order_id: orderData.order_id,
            amount: orderData.total,
            table_number: orderData.table_number,
            token: orderData.token || sessionToken,
            items_label: `Table ${orderData.table_number} Restaurant Order`
        })
    });

    const result = await res.json();

    if (!res.ok) {
        throw new Error(result.error || 'Failed to create PayHere session');
    }

    return result;
}


async function startPayHerePayment(orderResult, orderData) {
    const payment = await createPayHereSession({
        order_id: orderResult.order_id,
        total: orderData.total,
        table_number: orderData.table_number
    });

    payhere.onCompleted = function(orderId) {
        console.log("✅ PayHere payment completed:", orderId);

        localStorage.removeItem(getCartKey());

        setTimeout(() => {
            window.location.href = `payment-result.html?orderId=${encodeURIComponent(orderResult.order_id)}&table=${tableNumber}&token=${encodeURIComponent(sessionToken)}`;
        }, 1500);
    };

    payhere.onDismissed = function() {
        console.warn("⚠️ PayHere popup dismissed");

        const confirmBtn = document.getElementById('confirmOrderBtn');
        const btnText = document.getElementById('btnText');
        const btnSpinner = document.getElementById('btnSpinner');

        confirmBtn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
        isSubmitting = false;

        showToast('Payment cancelled', 'warning');
    };

    payhere.onError = function(error) {
        console.error("❌ PayHere error:", error);

        const confirmBtn = document.getElementById('confirmOrderBtn');
        const btnText = document.getElementById('btnText');
        const btnSpinner = document.getElementById('btnSpinner');

        confirmBtn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
        isSubmitting = false;

        showErrorModal(typeof error === 'string' ? error : 'Payment gateway error');
    };

    payhere.startPayment(payment);
}

// =====================================================
// PAYHERE
// =====================================================
async function startPayHerePayment(orderResult, orderData) {
    const payment = await createPayHereSession({
        order_id: orderResult.order_id,
        total: orderData.total,
        table_number: orderData.table_number
    });

    payhere.onCompleted = function(orderId) {
        console.log("✅ PayHere payment completed:", orderId);
        localStorage.removeItem(getCartKey());

        if (orderResult.redirect_url) {
            window.location.href = orderResult.redirect_url;
        } else {
            window.location.href = `success.html?orderId=${encodeURIComponent(orderResult.order_id)}&table=${tableNumber}&token=${encodeURIComponent(sessionToken)}`;
        }
    };

    payhere.onDismissed = function() {
        console.warn("⚠️ PayHere popup dismissed");

        const confirmBtn = document.getElementById('confirmOrderBtn');
        const btnText = document.getElementById('btnText');
        const btnSpinner = document.getElementById('btnSpinner');

        confirmBtn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
        isSubmitting = false;

        showToast('Payment cancelled', 'warning');
    };

    payhere.onError = function(error) {
        console.error("❌ PayHere error:", error);

        const confirmBtn = document.getElementById('confirmOrderBtn');
        const btnText = document.getElementById('btnText');
        const btnSpinner = document.getElementById('btnSpinner');

        confirmBtn.disabled = false;
        btnText.style.display = 'inline';
        btnSpinner.style.display = 'none';
        isSubmitting = false;

        showErrorModal(typeof error === 'string' ? error : 'Payment gateway error');
    };

    payhere.startPayment(payment);
}

// =====================================================
// PAYHERE
// =====================================================

function showPaymentGateway() {
    console.log('💳 Showing payment gateway');
    const modal = document.getElementById('paymentGatewayModal');
    const { total } = calculateTotals();
    document.getElementById('detailsAmount').textContent = `Total: LKR ${total.toFixed(2)}`;
    modal.classList.add('active');
    setupPaymentMethodSelection();
}

function setupPaymentMethodSelection() {
    const options = document.querySelectorAll('.payment-method-option');

    options.forEach(option => {
        option.onclick = () => {
            options.forEach(opt => opt.classList.remove('selected'));
            option.classList.add('selected');
            selectedPaymentGateway = option.dataset.method;

            // ✅ Cards -> direct PayHere only
            if (selectedPaymentGateway === 'card') {
                document.getElementById('paymentGatewayModal').classList.remove('active');
                startCardGatewayOnly();
                return;
            }

            // ✅ Other methods -> custom details screen
            document.getElementById('paymentMethodStep').classList.remove('active');
            document.getElementById('paymentMethodStep').style.display = 'none';
            document.getElementById('paymentDetailsStep').classList.add('active');
            document.getElementById('paymentDetailsStep').style.display = 'block';

            showPaymentForm(selectedPaymentGateway);
        };
    });

    const backBtn = document.getElementById('backToMethods');
    if (backBtn) {
        backBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('paymentDetailsStep').classList.remove('active');
            document.getElementById('paymentDetailsStep').style.display = 'none';
            document.getElementById('paymentMethodStep').classList.add('active');
            document.getElementById('paymentMethodStep').style.display = 'block';
            document.querySelectorAll('.payment-method-option').forEach(opt => opt.classList.remove('selected'));
            selectedPaymentGateway = null;
            clearAllPaymentForms();
        };
    }

    const cancelBtn = document.getElementById('gatewayCancel');
    if (cancelBtn) {
        cancelBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.getElementById('paymentGatewayModal').classList.remove('active');
            resetPaymentGateway();
            showToast('Payment Cancelled!', 'warning');

            const confirmBtn = document.getElementById('confirmOrderBtn');
            const btnText = document.getElementById('btnText');
            const btnSpinner = document.getElementById('btnSpinner');

            if (confirmBtn) confirmBtn.disabled = false;
            if (btnText) btnText.style.display = 'inline';
            if (btnSpinner) btnSpinner.style.display = 'none';

            isSubmitting = false;
        };
    }

    const payBtn = document.getElementById('gatewayPay');
    if (payBtn) {
        payBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!selectedPaymentGateway) return;

            document.getElementById('paymentGatewayModal').classList.remove('active');

            // other custom methods only
            await submitOrder();
        };
    }
}

function resetPaymentGateway() {
    document.getElementById('paymentDetailsStep').classList.remove('active');
    document.getElementById('paymentDetailsStep').style.display = 'none';
    document.getElementById('paymentMethodStep').classList.add('active');
    document.getElementById('paymentMethodStep').style.display = 'block';
    document.querySelectorAll('.payment-method-option').forEach(opt => opt.classList.remove('selected'));
    selectedPaymentGateway = null;
    clearAllPaymentForms();
}

function clearAllPaymentForms() {
    document.querySelectorAll('.payment-form input').forEach(input => input.value = '');
}


function processPayment() {
    console.log(' Preparing PayHere payment...');
}

function getCardType(number) {
    const cleaned = number.replace(/\s/g, '');
    if (/^4/.test(cleaned)) return 'Visa';
    if (/^5[1-5]/.test(cleaned)) return 'Mastercard';
    if (/^3[47]/.test(cleaned)) return 'American Express';
    if (/^6(?:011|5)/.test(cleaned)) return 'Discover';
    return 'Card';
}

function collectPaymentDetails() {
    let details = { gateway: selectedPaymentGateway || paymentMethod, type: selectedPaymentGateway || paymentMethod };

    if (selectedPaymentGateway === 'stripe') {
        const number = document.getElementById('stripeNumber')?.value || '';
        details.card_last4 = number.replace(/\s/g, '').slice(-4);
        details.card_type = getCardType(number);
    }

    if (selectedPaymentGateway === 'binance') {
        details.account_id = document.getElementById('binanceId')?.value || '';
        details.type = 'Binance Pay';
    }

    if (selectedPaymentGateway === 'applepay') {
        details.account_id = document.getElementById('appleId')?.value || '';
        details.type = 'Apple Pay';
    }

    if (selectedPaymentGateway === 'googlepay') {
        details.account_id = document.getElementById('googleEmail')?.value || '';
        details.type = 'Google Pay';
    }

    if (selectedPaymentGateway === 'bybit') {
        details.account_id = document.getElementById('bybitId')?.value || '';
        details.type = 'Bybit Pay';
    }

    if (selectedPaymentGateway === 'amex') {
        details.type = 'American Express';
    }

    if (selectedPaymentGateway === 'qr') {
        details.type = 'QR Scan Pay';
    }

    return details;
}

function showPaymentForm(method) {
    document.querySelectorAll('.payment-form').forEach(form => form.style.display = 'none');
    const selectedForm = document.getElementById(method + 'Form');
    if (selectedForm) selectedForm.style.display = 'block';

    const titles = {
        'card': 'Enter Card Details', 'binance': 'Enter Binance Details',
        'amex': 'Enter Amex Details', 'applepay': 'Apple Pay',
        'qr': 'Scan QR Code', 'bybit': 'Enter Bybit Details',
        'stripe': 'Enter Stripe Details', 'googlepay': 'Google Pay'
    };
    document.getElementById('detailsTitle').textContent = titles[method] || 'Payment Details';

    const { total } = calculateTotals();
    const amountEl = document.getElementById('details2Amount');
    if (amountEl) amountEl.textContent = `Total: LKR ${total.toFixed(2)}`;
}

// =====================================================
// TOAST NOTIFICATION
// =====================================================

function showToast(message, type = 'info') {
    const existingToast = document.getElementById('toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    if (!document.getElementById('toastStyles')) {
        const style = document.createElement('style');
        style.id = 'toastStyles';
        style.textContent = `
            .toast { position: fixed; bottom: 30px; left: 30px; background: #1f2937; color: white;
                     padding: 15px 25px; border-radius: 8px; font-size: 16px; font-weight: 500;
                     box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 99999;
                     animation: slideInLeft 0.3s ease, fadeOut 0.3s ease 2.7s; }
            .toast-success { background: #10b981; }
            .toast-error { background: #ef4444; }
            .toast-warning { background: #f59e0b; }
            @keyframes slideInLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes fadeOut { to { opacity: 0; transform: translateX(-20px); } }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
