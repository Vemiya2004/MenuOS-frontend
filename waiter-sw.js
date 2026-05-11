// MenuOS Waiter Service Worker — Push Notifications + Background Poll
// Save as: frontend/waiter-sw.js
const CACHE_NAME = 'menuos-waiter-v1';
const API = 'https://menuos-backend.onrender.com';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(clients.claim()));

// ── Push Notification ───────────────────────────────────────────
self.addEventListener('push', event => {
    let data = { title: 'MenuOS', body: 'New notification', type: 'order' };
    try { data = event.data.json(); } catch(e) {}

    const isCall = data.type === 'call';
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body:               data.body,
            icon:               '/favicon1/restaurant_logo-favicon.png',
            badge:              '/favicon1/restaurant_logo-favicon.png',
            tag:                data.type || 'menuos',
            vibrate:            isCall ? [200,100,200,100,200] : [300,100,300],
            requireInteraction: true,
            data:               { type: data.type }
        })
    );
});

// ── Notification Click ──────────────────────────────────────────
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
            const found = list.find(c => c.url.includes('waiter-pwa'));
            if (found) return found.focus();
            return clients.openWindow('/waiter-pwa.html');
        })
    );
});

// ── Message from PWA (poll trigger) ────────────────────────────
self.addEventListener('message', event => {
    if (event.data?.type === 'POLL_NOW') pollAndNotify();
});

// ── Periodic Background Sync (Chrome Android) ──────────────────
self.addEventListener('periodicsync', event => {
    if (event.tag === 'waiter-poll') event.waitUntil(pollAndNotify());
});

// ── Poll Backend & Show Notification if New ─────────────────────
async function pollAndNotify() {
    try {
        // Orders
        const oRes = await fetch(`${API}/admin/api/waiter-tickets?status=pending_waiter`);
        if (oRes.ok) {
            const orders = await oRes.json();
            if (Array.isArray(orders)) {
                const prev = await swGet('lastOrders');
                if (orders.length > (prev || 0)) {
                    const t = orders[orders.length - 1];
                    await self.registration.showNotification('🍽️ New Order!', {
                        body:               `Table ${t.table_number} placed an order — tap to approve.`,
                        icon:               '/favicon1/restaurant_logo-favicon.png',
                        badge:              '/favicon1/restaurant_logo-favicon.png',
                        tag:                'new-order',
                        vibrate:            [300, 100, 300],
                        requireInteraction: true
                    });
                }
                await swSet('lastOrders', orders.length);
            }
        }

        // Waiter Calls
        const cRes = await fetch(`${API}/admin/api/waiter-calls?status=pending`);
        if (cRes.ok) {
            const calls = await cRes.json();
            if (Array.isArray(calls)) {
                const prev = await swGet('lastCalls');
                if (calls.length > (prev || 0)) {
                    const c = calls[calls.length - 1];
                    await self.registration.showNotification('🔔 Waiter Call!', {
                        body:               `Table ${c.table_number} is calling for a waiter!`,
                        icon:               '/favicon1/restaurant_logo-favicon.png',
                        badge:              '/favicon1/restaurant_logo-favicon.png',
                        tag:                'waiter-call',
                        vibrate:            [200, 100, 200, 100, 200],
                        requireInteraction: true
                    });
                }
                await swSet('lastCalls', calls.length);
            }
        }
    } catch (e) {
        console.error('[SW] Poll error:', e);
    }
}

// ── Simple KV Store using Cache API ────────────────────────────
async function swGet(key) {
    try {
        const cache = await caches.open(CACHE_NAME);
        const res   = await cache.match(`/_swkv_/${key}`);
        return res ? JSON.parse(await res.text()) : null;
    } catch { return null; }
}

async function swSet(key, val) {
    try {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(`/_swkv_/${key}`, new Response(JSON.stringify(val)));
    } catch {}
}
