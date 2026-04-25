# Native Geofence Integration Contract

This document defines the Android/iOS contract required to deliver Bolt-style city-entry notifications for Protector.Ng.

## 1. Objective

When a user enters a configured city geofence (for example Abuja or Port Harcourt), the mobile app should:

1. Emit a city-entry event to backend API.
2. Allow backend to create a security notification with nearby police guidance.
3. Deliver it in-app immediately and through push when enabled.

## 2. Auth Requirement

All requests below must include a valid authenticated user session:

- Preferred: `Authorization: Bearer <supabase_access_token>`
- Fallback: authenticated app cookie/session if webview-based shell is used.

Unauthorized requests return `401`.

## 3. Shared Payload Types

Payloads are defined in:

- `lib/types/security-notifications.ts`

Main native event payload:

- `NativeCityEntryEventPayload`

## 4. Endpoints

### 4.1 City Entry Event

- **Method**: `POST`
- **Path**: `/api/notifications/security/city-entry`
- **Purpose**: Register a city-entry signal and trigger a deduped welcome/security alert.

Request body example:

```json
{
  "eventId": "evt-android-1743079852",
  "city": "Abuja",
  "address": "Nnamdi Azikiwe International Airport, Abuja",
  "source": "native-geofence",
  "platform": "android",
  "geofenceTransition": "enter",
  "occurredAt": "2026-03-28T18:25:00.000Z",
  "coordinates": {
    "latitude": 9.0061,
    "longitude": 7.2632,
    "accuracyMeters": 28
  },
  "deviceId": "pixel-8a-device-id",
  "appVersion": "1.3.0"
}
```

Response shape:

```json
{
  "success": true,
  "sent": true,
  "reason": null,
  "notification": {
    "id": "uuid",
    "title": "Welcome to Abuja",
    "message": "Security tip ...",
    "type": "city_welcome",
    "created_at": "2026-03-28T18:25:02.000Z",
    "data": {}
  },
  "nearbyPlaces": [
    {
      "name": "Wuse Police Station",
      "address": "Wuse Zone 3",
      "latitude": 9.07,
      "longitude": 7.45
    }
  ]
}
```

Important:

- `sent=false` with `reason=duplicate_city_welcome` is expected when dedupe blocks repeated entries.
- Client should not treat `sent=false` as an app error.

### 4.2 Daily Tip Trigger

- **Method**: `POST`
- **Path**: `/api/notifications/security/daily-tip`
- **Purpose**: Trigger daily security tip notification (deduped per UTC day).

Request body:

```json
{
  "source": "native-scheduler",
  "force": false
}
```

### 4.3 Push Subscription Registration

- **Method**: `POST`
- **Path**: `/api/notifications/push-subscriptions`
- **Purpose**: Subscribe, unsubscribe, or test push routing per device.

Request body for subscribe:

```json
{
  "action": "subscribe",
  "platform": "android",
  "deviceId": "pixel-8a-device-id",
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "base64-key",
      "auth": "base64-auth"
    }
  }
}
```

## 5. Native Geofence Configuration

Start with these city centers and tune radius by false-positive/negative telemetry:

- Lagos: `6.5244, 3.3792` radius `25km`
- Abuja: `9.0765, 7.3986` radius `22km`
- Port Harcourt: `4.8156, 7.0498` radius `20km`

Rules:

- Trigger only on `enter` (or `dwell` after 3-5 minutes if OS geofence accuracy is noisy).
- Send at most one city-entry event per city per 6 hours from device side.
- Keep backend dedupe enabled even when client-side dedupe is active.

## 6. Reliability Requirements

- Queue events offline and replay on reconnect in chronological order.
- Retry failed API calls with exponential backoff.
- Include stable `eventId` for idempotency tracing.
- Keep local throttle for repeated transitions between nearby airport boundaries.

## 7. Privacy and Security

- Send only required location payload for security notification use-cases.
- Do not attach raw background location streams to these requests.
- Respect user notification preferences from backend response behavior.

## 8. Minimum Acceptance Checks

1. Landing in Abuja emits city-entry event and returns `sent=true` once.
2. Re-entering Abuja in <6 hours returns `sent=false` with dedupe reason.
3. Nearby police guidance appears in at least one city-entry response when Places data exists.
4. Daily tip endpoint returns one tip per day per user (unless `force=true`).
