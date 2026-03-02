ALTER TABLE restaurants
ADD COLUMN is_active boolean NOT NULL DEFAULT true,
ADD COLUMN deleted_at timestamptz NULL;

CREATE INDEX idx_restaurants_deleted_at ON restaurants (deleted_at);
CREATE INDEX idx_restaurants_status ON restaurants (is_active, deleted_at);
CREATE INDEX idx_restaurants_name_lower ON restaurants (lower(name));
CREATE INDEX idx_restaurants_slug_lower ON restaurants (lower(slug));

CREATE TABLE admin_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz NOT NULL DEFAULT now(),
    actor_user_id uuid NOT NULL,
    actor_email text NOT NULL,
    action text NOT NULL,
    target_restaurant_id uuid NULL REFERENCES restaurants(id),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    request_id text NULL,
    ip text NULL,
    user_agent text NULL
);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs FORCE ROW LEVEL SECURITY;
