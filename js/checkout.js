// =====================================================
// QR RESTAURANT ORDERING SYSTEM - CHECKOUT PAGE
// ✅ FIXED FLOW:
//   pay-now  → Payment Methods Modal → Waiter Approval → PayHere → Success
//   pay-after → Waiter Approval → Success
// =====================================================

const API_BASE_URL = 'https://menuos-backend.onrender.com';

const urlParams = new URLSearchParams(window.location.search);
const tableNumber = urlParams.get('table') || 1;
const sessionToken = urlParams.get('token');

function getCartKey() {
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
let selectedPaymentGateway = null;

// resumePayment = true  →  user returned from waiting-approval page after waiter approved
//                           now we must launch PayHere immediately
const resumePayment   = urlParams.get('resume_payment') === '1';
const resumedTicketCode = urlParams.get('ticket_code') || '';
const resumedOrderId  = urlParams.get('order_id') || '';   // waiter ticket order id (temp)

// =====================================================
// TOKEN VALIDATION
// =====================================================
async function validateToken() {
    if (!sessionToken) { showSessionExpiredScreen(); return false; }
    try {
        const res = await fetch(`${API_BASE_URL}/api/validate-token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: sessionToken, table: parseInt(tableNumber) })
        });
        const result = await res.json();
        if (!result.valid) { showSessionExpiredScreen(); return false; }
        return true;
    } catch {
        return true; // allow on network error
    }
}

function showSessionExpiredScreen() {
    localStorage.removeItem(getCartKey());
    document.body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;
                    height:100vh;background:#f9fafb;font-family:sans-serif;text-align:center;padding:20px;">
            <div style="width:80px;height:80px;background:linear-gradient(135deg,#ef4444,#dc2626);
                        border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:24px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width:44px;height:44px;">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
            </div>
            <h1 style="font-size:24px;color:#1f2937;margin-bottom:12px;">Session Expired</h1>
            <p style="color:#6b7280;font-size:16px;max-width:300px;margin-bottom:32px;">
                Your ordering session has expired.<br>Please scan the QR code on your table again.
            </p>
        </div>`;
}

function resetCheckoutButtonState() {
    isSubmitting = false;
    const confirmBtn = document.getElementById('confirmOrderBtn');
    const btnText    = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    if (confirmBtn) confirmBtn.disabled = false;
    if (btnText)    { btnText.style.display = 'inline'; btnText.textContent = 'Confirm Order'; }
    if (btnSpinner) btnSpinner.style.display = 'none';
}

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', async () => {
    if (!tableNumber) { window.location.href = 'index.html'; return; }

    const tokenValid = await validateToken();
    if (!tokenValid) return;

    loadCart();

    // ── resumePayment path ──────────────────────────────────────────────────
    // Customer came back from waiting-approval.html after waiter approved.
    // Cart may be empty (was cleared). We still have the ticket_code & order_id.
    // Now we must launch PayHere using the stored pending order data.
    if (resumePayment) {
        console.log('🔁 Resume payment: waiter approved, launching PayHere...');

        // Hide confirm button – payment will start automatically
        const confirmBtn = document.getElementById('confirmOrderBtn');
        if (confirmBtn) confirmBtn.style.display = 'none';

        // Restore summary from sessionStorage so the page looks correct
        const pendingStr = sessionStorage.getItem('pending_paid_order');
        if (pendingStr) {
            try {
                const pending = JSON.parse(pendingStr);
                cart = pending.items.map(i => ({
                    ...i,
                    image_url: i.image
                }));
                renderOrderSummary();
            } catch { /* ignore */ }
        }

        renderOrderSummary();
        setupEventListeners();

        // Start PayHere
        setTimeout(async () => {
            try {
                selectedPaymentGateway = 'card';
                await startPayHereGateway();
            } catch (err) {
                console.error('❌ PayHere start failed:', err);
                showToast('Payment failed to start. Try again.', 'error');
                resetCheckoutButtonState();
            }
        }, 600);

        if (sessionStorage.getItem('payment_failed_return') === '1') {
            sessionStorage.removeItem('payment_failed_return');
            showToast('Payment declined. Please try again.', 'warning');
        }
        return;
    }

    // ── Normal path ─────────────────────────────────────────────────────────
    if (cart.length === 0) {
        document.getElementById('orderSummary').innerHTML = `
            <div style="padding:20px;text-align:center;color:#ef4444;">
                No items found in cart.<br><br>
                <button onclick="window.location.href='menu.html?table=${tableNumber}&token=${sessionToken}'"
                    style="padding:10px 18px;border:none;border-radius:8px;background:#111;color:#fff;cursor:pointer;">
                    Back to Menu
                </button>
            </div>`;
        return;
    }

    const savedMethod = localStorage.getItem('paymentMethod');
    if (savedMethod) {
        paymentMethod = savedMethod;
        const radioBtn = document.querySelector(`input[value="${paymentMethod}"]`);
        if (radioBtn) radioBtn.checked = true;
    }

    renderOrderSummary();
    setupEventListeners();
    createConfirmationModal();
    setupPaymentMethodSelection();  // wire up the gateway modal buttons

    if (sessionStorage.getItem('payment_failed_return') === '1') {
        sessionStorage.removeItem('payment_failed_return');
        showToast('Payment declined. Please try again.', 'warning');
    }

    resetCheckoutButtonState();
    console.log('✅ Checkout initialized');
});

window.addEventListener('pageshow',        () => { resetCheckoutButtonState(); });
window.addEventListener('focus',           () => { resetCheckoutButtonState(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) resetCheckoutButtonState(); });

// =====================================================
// CART
// =====================================================
function loadCart() {
    const saved = localStorage.getItem(getCartKey());
    cart = saved ? JSON.parse(saved) : [];
    console.log(`📦 Cart (table ${tableNumber}):`, cart.length, 'items');
}

function calculateTotals() {
    const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
    const tax   = subtotal * 0.1;
    const total = subtotal + tax;
    return { subtotal, tax, total };
}

function renderOrderSummary() {
    const el = document.getElementById('orderSummary');
    if (!el) return;
    el.innerHTML = cart.map(item => {
        const name = item.size ? `${item.name} (${item.size})` : item.name;
        return `<div class="order-item"><span>${item.quantity} x ${name}</span>
                <span>LKR ${(item.price * item.quantity).toFixed(2)}</span></div>`;
    }).join('');
    const { subtotal, tax, total } = calculateTotals();
    document.getElementById('subtotalAmount').textContent = `LKR ${subtotal.toFixed(2)}`;
    document.getElementById('taxAmount').textContent      = `LKR ${tax.toFixed(2)}`;
    document.getElementById('totalAmount').textContent    = `LKR ${total.toFixed(2)}`;
}

// =====================================================
// CONFIRMATION MODAL  (first popup after "Confirm Order" click)
// =====================================================
function createConfirmationModal() {
    document.body.insertAdjacentHTML('beforeend', `
    <div id="confirmModal" class="custom-modal">
        <div class="custom-modal-content">
            <div class="confirm-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
            </div>
            <h2 style="margin:20px 0 10px;font-size:24px;color:#1f2937;">Confirm Your Order?</h2>
            <p id="confirmAmount" style="font-size:32px;font-weight:bold;color:#2D7A7C;margin:10px 0;">LKR 0.00</p>
            <p style="color:#6b7280;margin-bottom:30px;">Table ${tableNumber}</p>
            <div style="display:flex;gap:15px;width:100%;">
                <button id="cancelConfirmBtn"  class="modal-btn cancel-btn">Cancel</button>
                <button id="proceedConfirmBtn" class="modal-btn confirm-btn">Confirm Order</button>
            </div>
        </div>
    </div>`);

    const style = document.createElement('style');
    style.textContent = `
        .custom-modal { display:none;position:fixed;inset:0;background:rgba(0,0,0,.6);
            z-index:10000;opacity:0;transition:opacity .3s;backdrop-filter:blur(5px); }
        .custom-modal.active { display:flex;align-items:center;justify-content:center;opacity:1; }
        .custom-modal-content { background:white;padding:40px;border-radius:20px;text-align:center;
            max-width:400px;width:90%;transform:scale(.7);
            transition:transform .3s cubic-bezier(.68,-.55,.265,1.55);box-shadow:0 20px 60px rgba(0,0,0,.3); }
        .custom-modal.active .custom-modal-content { transform:scale(1); }
        .confirm-icon { width:80px;height:80px;margin:0 auto 20px;
            background:linear-gradient(135deg,#10b981,#059669);border-radius:50%;
            display:flex;align-items:center;justify-content:center; }
        .confirm-icon svg { width:50px;height:50px;color:white; }
        .modal-btn { flex:1;padding:15px 30px;border:none;border-radius:12px;
            font-size:16px;font-weight:600;cursor:pointer;transition:all .2s; }
        .cancel-btn  { background:#f3f4f6;color:#374151; }
        .cancel-btn:hover  { background:#e5e7eb;transform:translateY(-2px); }
        .confirm-btn { background:linear-gradient(135deg,#2D7A7C,#1f5456);color:white; }
        .confirm-btn:hover { transform:translateY(-2px);box-shadow:0 10px 25px rgba(45,122,124,.3); }`;
    document.head.appendChild(style);
}

function showConfirmModal() {
    const modal = document.getElementById('confirmModal');
    const { total } = calculateTotals();
    document.getElementById('confirmAmount').textContent = `LKR ${total.toFixed(2)}`;
    modal.classList.add('active');

    document.getElementById('cancelConfirmBtn').onclick = () => {
        modal.classList.remove('active');
    };

    // ✅ KEY FIX: after confirm, decide flow based on payment method
    document.getElementById('proceedConfirmBtn').onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        modal.classList.remove('active');

        setTimeout(() => {
            if (paymentMethod === 'pay-now') {
                // Show payment method picker FIRST (cards / binance / etc.)
                showPaymentGatewayModal();
            } else {
                // pay-after: go straight to waiter approval (no payment gateway)
                submitOrderToWaiter('pay-after', 'pending');
            }
        }, 300);
    };
}

// =====================================================
// PAYMENT GATEWAY MODAL  (second popup for pay-now)
// Shows after user confirms order, BEFORE waiter approval
// =====================================================
function showPaymentGatewayModal() {
    const modal = document.getElementById('paymentGatewayModal');
    const { total } = calculateTotals();
    const amountEl = document.getElementById('detailsAmount');
    if (amountEl) amountEl.textContent = `Total: LKR ${total.toFixed(2)}`;

    // Reset to step 1 (method selection)
    document.getElementById('paymentMethodStep').style.display  = 'block';
    document.getElementById('paymentMethodStep').classList.add('active');
    document.getElementById('paymentDetailsStep').style.display = 'none';
    document.getElementById('paymentDetailsStep').classList.remove('active');

    modal.classList.add('active');
}

function setupPaymentMethodSelection() {
    // ── Step 1: Method options ────────────────────────────────────────────────
    document.querySelectorAll('.payment-method-option').forEach(option => {
        option.onclick = () => {
            document.querySelectorAll('.payment-method-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectedPaymentGateway = option.dataset.method;

            // Move to step 2
            document.getElementById('paymentMethodStep').style.display  = 'none';
            document.getElementById('paymentMethodStep').classList.remove('active');
            document.getElementById('paymentDetailsStep').style.display = 'block';
            document.getElementById('paymentDetailsStep').classList.add('active');

            showPaymentForm(selectedPaymentGateway);

            // Update amount label in step 2
            const { total } = calculateTotals();
            const el = document.getElementById('details2Amount');
            if (el) el.textContent = `Total: LKR ${total.toFixed(2)}`;
        };
    });

    // ── Back button (step 2 → step 1) ────────────────────────────────────────
    const backBtn = document.getElementById('backToMethods');
    if (backBtn) {
        backBtn.onclick = (e) => {
            e.preventDefault();
            document.getElementById('paymentDetailsStep').style.display = 'none';
            document.getElementById('paymentDetailsStep').classList.remove('active');
            document.getElementById('paymentMethodStep').style.display  = 'block';
            document.getElementById('paymentMethodStep').classList.add('active');
            document.querySelectorAll('.payment-method-option').forEach(o => o.classList.remove('selected'));
            selectedPaymentGateway = null;
            clearAllPaymentForms();
        };
    }

    // ── Cancel button ─────────────────────────────────────────────────────────
    const cancelBtn = document.getElementById('gatewayCancel');
    if (cancelBtn) {
        cancelBtn.onclick = (e) => {
            e.preventDefault();
            document.getElementById('paymentGatewayModal').classList.remove('active');
            resetPaymentGateway();
            resetCheckoutButtonState();
            showToast('Payment Cancelled!', 'warning');
        };
    }

    // ── "Pay Now" button in step 2 ────────────────────────────────────────────
    // ✅ KEY FIX: clicking Pay Now submits order to waiter first,
    //             PayHere is launched AFTER waiter approves (via resumePayment redirect)
    const payBtn = document.getElementById('gatewayPay');
    if (payBtn) {
        payBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!selectedPaymentGateway) return;

            document.getElementById('paymentGatewayModal').classList.remove('active');

            // Submit to waiter with payment_method = selected gateway name
            // Payment status stays 'pending' until waiter approves → PayHere runs
            await submitOrderToWaiter('pay-now', 'pending');
        };
    }
}

function resetPaymentGateway() {
    document.getElementById('paymentDetailsStep').style.display = 'none';
    document.getElementById('paymentDetailsStep').classList.remove('active');
    document.getElementById('paymentMethodStep').style.display  = 'block';
    document.getElementById('paymentMethodStep').classList.add('active');
    document.querySelectorAll('.payment-method-option').forEach(o => o.classList.remove('selected'));
    selectedPaymentGateway = null;
    clearAllPaymentForms();
}

function clearAllPaymentForms() {
    document.querySelectorAll('.payment-form input').forEach(i => i.value = '');
}

function showPaymentForm(method) {
    document.querySelectorAll('.payment-form').forEach(f => f.style.display = 'none');
    const form = document.getElementById(method + 'Form');
    if (form) form.style.display = 'block';

    const titles = {
        card: 'Enter Card Details', binance: 'Enter Binance Details',
        amex: 'Enter Amex Details', applepay: 'Apple Pay',
        qr:   'Scan QR Code',       bybit: 'Enter Bybit Details',
        stripe: 'Enter Stripe Details', googlepay: 'Google Pay'
    };
    const titleEl = document.getElementById('detailsTitle');
    if (titleEl) titleEl.textContent = titles[method] || 'Payment Details';
}

// =====================================================
// SUBMIT ORDER TO WAITER  (core submission function)
// ✅ Creates a waiter_ticket — does NOT yet create orders row
//    Admin approves → orders row is created (see admin_routes.py)
// =====================================================
async function submitOrderToWaiter(method, status) {
    if (isSubmitting) return;
    isSubmitting = true;

    const confirmBtn = document.getElementById('confirmOrderBtn');
    const btnText    = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    if (confirmBtn) confirmBtn.disabled = true;
    if (btnText)    btnText.style.display = 'none';
    if (btnSpinner) btnSpinner.style.display = 'block';

    try {
        const { subtotal, tax, total } = calculateTotals();

        // Save order data so resumePayment can rebuild cart/amounts
        const pendingOrder = {
            table_number:   parseInt(tableNumber),
            items: cart.map(i => ({
                id:       i.id,
                name:     i.name,
                price:    i.price,
                quantity: i.quantity,
                size:     i.size || null,
                image:    i.image_url
            })),
            subtotal:        parseFloat(subtotal.toFixed(2)),
            tax:             parseFloat(tax.toFixed(2)),
            total:           parseFloat(total.toFixed(2)),
            payment_method:  method,
            selected_gateway: selectedPaymentGateway || null,
            payment_status:  status,
            payment_details: collectPaymentDetails(),
            token:           sessionToken
        };
        sessionStorage.setItem('pending_paid_order', JSON.stringify(pendingOrder));

        const response = await fetch(`${API_BASE_URL}/api/order`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body:    JSON.stringify(pendingOrder)
        });

        const result = await response.json();
        console.log('📥 Order API response:', result);

        if (response.ok && result.success) {
            console.log('✅ Order submitted. Ticket:', result.ticket_code);

            // ✅ Build the final Order ID the same way admin_routes.py does:
            //    order_id = f"ORD-{ticket['ticket_code']}"
            const finalOrderId = `ORD-${result.ticket_code}`;

            // Store finalOrderId so waiting-approval page can pass it to success page
            sessionStorage.setItem('final_order_id', finalOrderId);
            sessionStorage.setItem('ticket_code',    result.ticket_code);

            localStorage.removeItem(getCartKey());

            // Go to waiting-approval page
            window.location.href =
                `waiting-approval.html` +
                `?ticket_code=${encodeURIComponent(result.ticket_code)}` +
                `&order_id=${encodeURIComponent(finalOrderId)}` +
                `&table=${encodeURIComponent(tableNumber)}` +
                `&token=${encodeURIComponent(sessionToken)}` +
                `&payment_method=${encodeURIComponent(method)}`;

        } else if (response.status === 401) {
            showSessionExpiredScreen();
        } else {
            throw new Error(result.error || 'Order failed');
        }

    } catch (error) {
        console.error('❌ submitOrderToWaiter error:', error);
        showErrorModal(error.message || 'Error submitting order');
        resetCheckoutButtonState();
    }
}

// =====================================================
// PAYHERE GATEWAY  (called on resumePayment path)
// Runs AFTER waiter has approved the order
// =====================================================
async function startPayHereGateway() {
    const confirmBtn = document.getElementById('confirmOrderBtn');
    const btnText    = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');
    if (confirmBtn) confirmBtn.disabled = true;
    if (btnText)    btnText.style.display = 'none';
    if (btnSpinner) btnSpinner.style.display = 'block';
    isSubmitting = true;

    // Restore totals from pending order stored before waiter approval
    let total = 0;
    const pendingStr = sessionStorage.getItem('pending_paid_order');
    if (pendingStr) {
        try { total = JSON.parse(pendingStr).total; } catch { /* ignore */ }
    }
    if (!total) {
        const t = calculateTotals();
        total = t.total;
    }

    // The final order id was built before navigating to waiting-approval
    const finalOrderId = sessionStorage.getItem('final_order_id') || resumedOrderId;

    const payment = await createPayHereSession({
        order_id:     finalOrderId,
        total:        total,
        table_number: parseInt(tableNumber),
        token:        sessionToken
    });

    // ── PayHere callbacks ─────────────────────────────────────────────────────
    payhere.onCompleted = function(orderId) {
        console.log('✅ PayHere completed:', orderId);
        sessionStorage.removeItem('pending_paid_order');

        // ✅ Pass the SAME finalOrderId that admin panel will show
        window.location.href =
            `success.html` +
            `?orderId=${encodeURIComponent(finalOrderId)}` +
            `&table=${encodeURIComponent(tableNumber)}` +
            `&token=${encodeURIComponent(sessionToken)}`;
    };

    payhere.onDismissed = function() {
        console.warn('⚠️ PayHere dismissed');
        sessionStorage.setItem('payment_failed_return', '1');
        resetCheckoutButtonState();
    };

    payhere.onError = function(error) {
        console.error('❌ PayHere error:', error);
        sessionStorage.setItem('payment_failed_return', '1');
        resetCheckoutButtonState();
        showErrorModal(typeof error === 'string' ? error : 'Payment gateway error');
    };

    payhere.startPayment(payment);
}

async function createPayHereSession(orderData) {
    const res = await fetch(`${API_BASE_URL}/api/payhere/session`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body:    JSON.stringify({
            order_id:    orderData.order_id,
            amount:      orderData.total,
            table_number: orderData.table_number,
            token:       orderData.token || sessionToken,
            items_label: `Table ${orderData.table_number} Restaurant Order`
        })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to create PayHere session');
    return result;
}

// =====================================================
// COLLECT PAYMENT DETAILS  (for metadata only)
// =====================================================
function collectPaymentDetails() {
    let details = { gateway: selectedPaymentGateway || paymentMethod, type: selectedPaymentGateway || paymentMethod };

    if (selectedPaymentGateway === 'stripe') {
        const n = document.getElementById('stripeNumber')?.value || '';
        details.card_last4 = n.replace(/\s/g, '').slice(-4);
        details.card_type  = getCardType(n);
    }
    if (selectedPaymentGateway === 'binance')   details.account_id = document.getElementById('binanceId')?.value  || '';
    if (selectedPaymentGateway === 'applepay')  details.account_id = document.getElementById('appleId')?.value    || '';
    if (selectedPaymentGateway === 'googlepay') details.account_id = document.getElementById('googleEmail')?.value || '';
    if (selectedPaymentGateway === 'bybit')     details.account_id = document.getElementById('bybitId')?.value    || '';
    return details;
}

function getCardType(number) {
    const c = number.replace(/\s/g, '');
    if (/^4/.test(c))      return 'Visa';
    if (/^5[1-5]/.test(c)) return 'Mastercard';
    if (/^3[47]/.test(c))  return 'American Express';
    return 'Card';
}

// =====================================================
// EVENT LISTENERS
// =====================================================
function setupEventListeners() {
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = `cart.html?table=${tableNumber}&token=${sessionToken}`;
        });
    }

    document.querySelectorAll('input[name="paymentMethod"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            paymentMethod = e.target.value;
            localStorage.setItem('paymentMethod', paymentMethod);
        });
    });

    const confirmBtn = document.getElementById('confirmOrderBtn');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showConfirmModal();
        });
    }
}

// =====================================================
// ERROR MODAL
// =====================================================
function showErrorModal(message) {
    document.getElementById('errorModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', `
    <div id="errorModal" class="custom-modal active" style="display:flex;">
        <div class="custom-modal-content">
            <div style="width:80px;height:80px;margin:0 auto;background:linear-gradient(135deg,#ef4444,#dc2626);
                        border-radius:50%;display:flex;align-items:center;justify-content:center;">
                <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="width:50px;height:50px;">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
            </div>
            <h2 style="margin:20px 0 10px;font-size:24px;color:#1f2937;">Order Failed</h2>
            <p style="color:#6b7280;margin-bottom:30px;">${message}</p>
            <button onclick="document.getElementById('errorModal').remove()"
                    class="modal-btn confirm-btn" style="width:100%;">Try Again</button>
        </div>
    </div>`);
}

// =====================================================
// TOAST
// =====================================================
function showToast(message, type = 'info') {
    document.getElementById('toast')?.remove();
    const toast = document.createElement('div');
    toast.id        = 'toast';
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    if (!document.getElementById('toastStyles')) {
        const s = document.createElement('style');
        s.id = 'toastStyles';
        s.textContent = `
            .toast { position:fixed;bottom:30px;left:30px;background:#1f2937;color:white;
                     padding:15px 25px;border-radius:8px;font-size:16px;font-weight:500;
                     box-shadow:0 4px 12px rgba(0,0,0,.3);z-index:99999;
                     animation:slideInLeft .3s ease, fadeOut .3s ease 2.7s; }
            .toast-success { background:#10b981; }
            .toast-error   { background:#ef4444; }
            .toast-warning { background:#f59e0b; }
            @keyframes slideInLeft { from{transform:translateX(-100%);opacity:0} to{transform:translateX(0);opacity:1} }
            @keyframes fadeOut { to{opacity:0;transform:translateX(-20px)} }`;
        document.head.appendChild(s);
    }
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
