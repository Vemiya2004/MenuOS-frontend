// =====================================================
// WAITER CALL BUTTON  — include in menu.html
// Adds a floating bell button: bottom-right, above cart
// Usage: <script src="js/waiter_call.js"></script>
// Requires: tableNumber variable OR ?table= in URL
// =====================================================

(function () {
    const API_BASE_URL = 'https://menuos-backend.onrender.com';

    // ── Get table number ──────────────────────────────────────────────────────
    function getTableNumber() {
        if (typeof tableNumber !== 'undefined' && tableNumber) return tableNumber;
        return new URLSearchParams(window.location.search).get('table') || '';
    }

    // ── Inject styles ─────────────────────────────────────────────────────────
    const style = document.createElement('style');
    style.textContent = `
        #waiterCallBtn {
            position: fixed;
            right: 20px;
            bottom: 90px;          /* sits just above the cart/checkout bar */
            z-index: 9000;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            cursor: pointer;
            user-select: none;
            -webkit-tap-highlight-color: transparent;
        }
        #waiterCallBtn .wcb-circle {
            width: 54px;
            height: 54px;
            border-radius: 50%;
            background: linear-gradient(135deg, #f97316, #ea580c);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 18px rgba(249,115,22,0.45);
            transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        #waiterCallBtn:active .wcb-circle {
            transform: scale(0.92);
            box-shadow: 0 2px 8px rgba(249,115,22,0.3);
        }
        #waiterCallBtn .wcb-label {
            font-size: 10px;
            font-weight: 700;
            color: #ea580c;
            letter-spacing: 0.3px;
            text-shadow: 0 1px 2px rgba(255,255,255,0.8);
            background: rgba(255,255,255,0.85);
            border-radius: 6px;
            padding: 2px 6px;
        }
        @keyframes wcbRing {
            0%,100% { transform: rotate(0deg); }
            15%      { transform: rotate(-18deg); }
            30%      { transform: rotate(18deg); }
            45%      { transform: rotate(-12deg); }
            60%      { transform: rotate(12deg); }
            75%      { transform: rotate(-6deg);  }
            90%      { transform: rotate(6deg);   }
        }
        #waiterCallBtn .wcb-circle svg {
            animation: wcbRing 2.5s ease-in-out infinite;
        }

        /* Toast popup */
        #wcbToast {
            position: fixed;
            right: 20px;
            bottom: 160px;
            z-index: 9100;
            background: #1f2937;
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 6px 20px rgba(0,0,0,0.25);
            opacity: 0;
            transform: translateY(10px);
            transition: opacity 0.3s ease, transform 0.3s ease;
            pointer-events: none;
            max-width: 220px;
            text-align: center;
        }
        #wcbToast.wcb-show {
            opacity: 1;
            transform: translateY(0);
        }
        #wcbToast.wcb-success { background: #059669; }
        #wcbToast.wcb-error   { background: #dc2626; }
        #wcbToast.wcb-warn    { background: #d97706; }

        /* Cooldown ring */
        #waiterCallBtn .wcb-circle.wcb-cooldown {
            background: linear-gradient(135deg, #9ca3af, #6b7280);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        #waiterCallBtn .wcb-circle.wcb-cooldown svg {
            animation: none;
        }
    `;
    document.head.appendChild(style);

    // ── Build button ──────────────────────────────────────────────────────────
    const btn = document.createElement('div');
    btn.id = 'waiterCallBtn';
    btn.innerHTML = `
        <div class="wcb-circle">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                 xmlns="http://www.w3.org/2000/svg">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
                      stroke="white" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"
                      stroke="white" stroke-width="2"
                      stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        </div>
        <div class="wcb-label">Waiter Call</div>
    `;

    // ── Toast helper ──────────────────────────────────────────────────────────
    let toastEl = null;
    function showToast(msg, type = '') {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.id = 'wcbToast';
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = msg;
        toastEl.className   = `wcb-show${type ? ' wcb-' + type : ''}`;
        clearTimeout(toastEl._timer);
        toastEl._timer = setTimeout(() => {
            toastEl.classList.remove('wcb-show', 'wcb-success', 'wcb-error', 'wcb-warn');
        }, 3000);
    }

    // ── Cooldown logic (60s between calls) ───────────────────────────────────
    const COOLDOWN_MS = 60000;
    let   lastCallTime = 0;
    let   cooldownTimer = null;

    function setCooldown() {
        lastCallTime = Date.now();
        const circle = btn.querySelector('.wcb-circle');
        circle.classList.add('wcb-cooldown');
        const label = btn.querySelector('.wcb-label');
        label.textContent = '60s';

        let remaining = 60;
        clearInterval(cooldownTimer);
        cooldownTimer = setInterval(() => {
            remaining--;
            label.textContent = remaining > 0 ? `${remaining}s` : 'Waiter Call';
            if (remaining <= 0) {
                clearInterval(cooldownTimer);
                circle.classList.remove('wcb-cooldown');
                label.textContent = 'Waiter Call';
            }
        }, 1000);
    }

    // ── Call API ──────────────────────────────────────────────────────────────
    async function callWaiter() {
        const table = getTableNumber();
        if (!table) {
            showToast('Table number not found', 'error');
            return;
        }

        const now = Date.now();
        if (now - lastCallTime < COOLDOWN_MS) {
            showToast('Waiter already called! Please wait.', 'warn');
            return;
        }

        try {
            const res = await fetch(`${API_BASE_URL}/admin/public/waiter-call`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({
                    table_number: parseInt(table),
                    message:      'Waiter please come to my table'
                })
            });

            if (res.ok) {
                showToast('✓ Waiter is on the way!', 'success');
                setCooldown();
            } else {
                showToast('Could not call waiter. Try again.', 'error');
            }
        } catch (err) {
            console.error('Waiter call error:', err);
            showToast('Network error. Try again.', 'error');
        }
    }

    btn.addEventListener('click', callWaiter);

    // ── Mount after DOM ready ─────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => document.body.appendChild(btn));
    } else {
        document.body.appendChild(btn);
    }
})();