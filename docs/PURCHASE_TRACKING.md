# Prime merchant purchase tracking

The backend is prepared; no store is connected automatically. No cookies, customer names, email addresses, payment details or browser identifiers are collected. A shared campaign coupon can attribute an order to a campaign, not to a specific app user. Reports are merchant API claims, not independent proof of payment.

## Provisioning (admin only)

Use the signed-in owner session against the main app, preserving the normal Origin and JSON CSRF requirements.

- POST `/api/admin/purchase-integrations`: `{ "action":"create", "campaignId":"CAMPAIGN_ID", "siteOrigin":"https://store.example" }`.
- Response supplies `id`, a once-only `key`, and the campaign's current `coupon`. The key is stored hashed. New integrations are disabled.
- Store the key on the merchant server. Never place it in website JavaScript, a cookie, a URL, or the brand editing form.
- Enable after configuring the merchant adapter: `{ "action":"enable", "id":"INTEGRATION_ID" }`.
- Disable with `action: "disable"`; rotate the key with `action: "rotate"`. Rotation immediately invalidates the old key.
- Coupon is snapshotted at provisioning; changing the app campaign code does not silently change an existing integration. Disable and provision a replacement for a new coupon or store. Keep one authoritative integration per campaign/store to avoid two separate sources reporting the same order twice.
- `siteOrigin` documents the merchant configured by the admin; possession of the integration key authenticates the sender. Origin headers alone never authenticate purchases.

## Merchant webhook

Public ingress (the main app itself is owner-private):

`POST https://prime-campaign-editor.sunlitcreek513.chatgpt.site/api/integrations/purchases`

Headers:

```
Content-Type: application/json
X-Prime-Integration-Key: YOUR_SERVER_ONLY_KEY
```

Payload:

```json
{
  "eventId": "merchant-event-unique-id",
  "orderId": "opaque-merchant-order-id",
  "coupon": "CAMPAIGN_COUPON",
  "status": "paid",
  "amountMinor": 125000,
  "currency": "TRY",
  "occurredAt": "2026-10-15T14:30:00.000Z"
}
```

- Send from the merchant backend only after confirming the order's coupon and payment through its authoritative commerce platform. Never accept a browser's unverified success-page payload as a paid order.
- `amountMinor` is the full immutable order total after discount in minor units: 125000 = TRY 1,250.00. Do not send floating-point currency amounts. Summary totals are separated by currency.
- Supported statuses: `paid`, `cancelled`, `refunded` (full refund). Partial refunds and chargebacks require a future adapter/schema extension; do not report a partial refund as a full refund.
- `occurredAt` is ISO 8601 with timezone, must be no earlier than integration creation and at most five minutes in the future. Historical imports need a separate controlled path; this endpoint does not backfill.
- `eventId` is immutable and unique within the integration. Retry the exact same payload and eventId after network errors/5xx. An identical replay returns 200 with duplicate=true; conflicting contents return 409.
- Each order is represented once per integration. Newer events update the order status; older out-of-order events remain in the audit log without overwriting newer state. Different statuses at the same timestamp are rejected (409). Every state change needs a later timestamp. Order amount and currency cannot change.
- Accepted events return 202. This confirms ingestion, not independent payment verification. Retry 5xx with backoff; investigate 400/401/409/413/415/422 rather than retrying unchanged invalid input forever.
- The public relay exposes only this fixed webhook route and forwards the scoped integration credential. It cannot invoke admin actions. Existing editor link security remains separate.

## Admin reporting

GET `/api/admin/purchases?campaignId=CAMPAIGN_ID&offset=0`

Returns configured integrations (no secrets), connection status (at least one event received on an enabled integration), summary per currency and the latest 100 order states with pagination. `hasMore` permits the next offset. Paid totals exclude cancelled and fully refunded orders. Append-only event history is retained in `purchase_events`; current order state lives in `purchase_orders`.

No purchase UI, keys, order data or revenue totals are exposed to ordinary app users or shared-link brand editors. The app's code-opening counter remains a separate metric. This release provides admin APIs, not a sales dashboard UI.

## Later merchant work

Configure WooCommerce/Shopify/custom-platform webhook adapter, obtain the actual API credentials and webhook signing setup required by that platform, validate its original webhook signature, normalize its paid/refund/cancellation events into the payload above, and test duplicate/out-of-order delivery. Only then enable the Prime integration. Site access or analytics cookies alone cannot prove coupon redemption or payment.
