-- Core Data Migration (Tables that exist in D1)
-- User: myklee@gmail.com
-- Generated: 2025-09-15T18:39:00.000Z

-- Clear existing data for this user (if any)
DELETE FROM solid_foods WHERE user_id = '55a591c0-8e5d-415a-b1f6-81b276f634bb';
DELETE FROM sleep_sessions WHERE user_id = '55a591c0-8e5d-415a-b1f6-81b276f634bb';
DELETE FROM diaper_changes WHERE user_id = '55a591c0-8e5d-415a-b1f6-81b276f634bb';
DELETE FROM feedings WHERE user_id = '55a591c0-8e5d-415a-b1f6-81b276f634bb';
DELETE FROM babies WHERE user_id = '55a591c0-8e5d-415a-b1f6-81b276f634bb';
DELETE FROM users WHERE id = '55a591c0-8e5d-415a-b1f6-81b276f634bb';

-- Import user (with placeholder password hash)
INSERT INTO users (id, email, password_hash, created_at) VALUES ('55a591c0-8e5d-415a-b1f6-81b276f634bb', 'myklee@gmail.com', 'migrated_user', '2024-12-19T05:32:19.000Z');