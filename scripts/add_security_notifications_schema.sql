-- Security notifications schema extension
-- Adds preference storage, push subscription storage, and metadata fields.

BEGIN;

-- 1) User-level notification preferences for security and channel controls
CREATE TABLE IF NOT EXISTS notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    push_settings JSONB NOT NULL DEFAULT '{"bookingUpdates": true, "securityAlerts": true, "promotionalOffers": false, "emergencyNotifications": true}'::jsonb,
    email_settings JSONB NOT NULL DEFAULT '{"bookingConfirmations": true, "securityAlerts": true, "promotionalOffers": false, "weeklyDigest": true}'::jsonb,
    sms_settings JSONB NOT NULL DEFAULT '{"emergencyAlerts": true, "bookingReminders": true, "promotionalOffers": false}'::jsonb,
    city_welcome_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    nearby_safety_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    daily_security_tips_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    bulletproof_education_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_preferences_updated_at
    ON notification_preferences(updated_at DESC);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'notification_preferences'
          AND policyname = 'Users can view own notification preferences'
    ) THEN
        CREATE POLICY "Users can view own notification preferences" ON notification_preferences
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'notification_preferences'
          AND policyname = 'Users can update own notification preferences'
    ) THEN
        CREATE POLICY "Users can update own notification preferences" ON notification_preferences
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 2) Push subscription storage for web/native dispatch
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'web',
    device_id TEXT,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
    ON push_subscriptions(user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_active
    ON push_subscriptions(is_active)
    WHERE is_active = TRUE;

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'push_subscriptions'
          AND policyname = 'Users can manage own push subscriptions'
    ) THEN
        CREATE POLICY "Users can manage own push subscriptions" ON push_subscriptions
            FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 3) Security metadata fields on notifications for querying and dedupe
ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS security_event TEXT,
    ADD COLUMN IF NOT EXISTS dedupe_key TEXT,
    ADD COLUMN IF NOT EXISTS delivery_channel TEXT NOT NULL DEFAULT 'in_app',
    ADD COLUMN IF NOT EXISTS source TEXT,
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_notifications_security_event
    ON notifications(security_event);

CREATE INDEX IF NOT EXISTS idx_notifications_dedupe_key
    ON notifications(dedupe_key);

CREATE INDEX IF NOT EXISTS idx_notifications_data_gin
    ON notifications USING GIN (data);

-- Keep update timestamps aligned when these rows are changed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_proc
        WHERE proname = 'update_updated_at_column'
    ) THEN
        IF NOT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = 'update_notification_preferences_updated_at'
        ) THEN
            CREATE TRIGGER update_notification_preferences_updated_at
                BEFORE UPDATE ON notification_preferences
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_trigger
            WHERE tgname = 'update_push_subscriptions_updated_at'
        ) THEN
            CREATE TRIGGER update_push_subscriptions_updated_at
                BEFORE UPDATE ON push_subscriptions
                FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        END IF;
    END IF;
END $$;

COMMIT;
