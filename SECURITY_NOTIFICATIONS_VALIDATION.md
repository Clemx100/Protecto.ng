# Security Notifications Validation Checklist

Use this checklist after deploying the geofence security notification changes.

## 1. Environment Setup

Confirm these variables are available in the runtime:

- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `GOOGLE_MAPS_API_KEY` (or `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`)

If VAPID keys are missing, push registration still succeeds in-app fallback mode, but server push dispatch is skipped.

## 2. Database Migration

Run:

```sql
\i scripts/add_security_notifications_schema.sql
```

Verify these objects exist:

- `notification_preferences`
- `push_subscriptions`
- new `notifications` metadata columns (`security_event`, `dedupe_key`, `delivery_channel`, `source`, `sent_at`)

## 3. Client Verification

1. Login on `/app`.
2. Allow browser notifications.
3. Open `/account/notifications`.
4. Click `Send Push Test`.
5. Confirm push appears in notification tray and opens app on click.

## 4. City Entry Verification

Call `POST /api/notifications/security/city-entry` with city and coordinates:

```json
{
  "city": "Abuja",
  "latitude": 9.0765,
  "longitude": 7.3986,
  "source": "qa-manual"
}
```

Expected:

- First call: `sent=true`
- Repeated call within 6h: `sent=false`, reason `duplicate_city_welcome`
- In-app toast appears while app is open.
- Push dispatch reports `sent > 0` when subscription and VAPID are configured.

## 5. Daily Tip Verification

Call `POST /api/notifications/security/daily-tip`.

Expected:

- First call each day: `sent=true`
- Repeated same day: `sent=false`, reason `tip_already_sent_today`
- Tip appears in-app and push when enabled.

## 6. Preference Enforcement Verification

In `/account/notifications`, disable these and save:

- `City Welcome Alerts`
- `Daily Security Tips`
- `Nearby Safety Locations`

Then repeat city-entry and daily-tip API calls.

Expected:

- city-entry returns `city_welcome_disabled` when city welcome is off
- daily-tip returns `daily_tips_disabled` when daily tips are off
- Nearby place details are omitted when nearby safety is off
