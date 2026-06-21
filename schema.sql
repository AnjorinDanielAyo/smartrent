-- ══════════════════════════════════════
-- SmartRent — schema.sql
-- Drops & recreates all tables, then seeds demo data
-- ══════════════════════════════════════

PRAGMA foreign_keys = ON;

-- ── Drop tables if they exist (clean reset) ──
DROP TABLE IF EXISTS rental_requests;
DROP TABLE IF EXISTS listings;
DROP TABLE IF EXISTS users;

-- ── USERS ──
CREATE TABLE users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    fname       TEXT    NOT NULL,
    lname       TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE,
    password    TEXT    NOT NULL,          -- bcrypt hash
    roles       TEXT    NOT NULL DEFAULT 'renter',  -- 'renter' | 'rentee' | 'both'
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── LISTINGS ──
CREATE TABLE listings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    owner_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    category    TEXT    NOT NULL,
    description TEXT    NOT NULL,
    price       REAL    NOT NULL,          -- daily rate in ₦
    location    TEXT    NOT NULL,
    img_url     TEXT    DEFAULT '',
    status      TEXT    NOT NULL DEFAULT 'available',  -- 'available' | 'rented'
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ── RENTAL REQUESTS ──
CREATE TABLE rental_requests (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id     INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    renter_id   INTEGER NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
    status      TEXT    NOT NULL DEFAULT 'pending',  -- 'pending'|'approved'|'declined'|'completed'
    start_date  TEXT    NOT NULL,
    end_date    TEXT    NOT NULL,
    message     TEXT    DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ══════════════════════════════════════
-- SEED DEMO DATA
-- Passwords are bcrypt hashes of 'demo123'
-- ══════════════════════════════════════

INSERT INTO users (fname, lname, email, password, roles) VALUES
    ('Adewale',  'Okafor',  'ade@demo.com',    '$2b$12$eImiTXuWVxfM37uY4JANjQ==wO/DkEV1URBMzRjqTuDe8IteL9zfi', 'both'),
    ('Fatima',   'Ibrahim', 'fatima@demo.com', '$2b$12$eImiTXuWVxfM37uY4JANjQ==wO/DkEV1URBMzRjqTuDe8IteL9zfi', 'renter'),
    ('Chisom',   'Ugwu',    'chisom@demo.com', '$2b$12$eImiTXuWVxfM37uY4JANjQ==wO/DkEV1URBMzRjqTuDe8IteL9zfi', 'rentee');

INSERT INTO listings (owner_id, title, category, description, price, location, img_url, status) VALUES
    (1, 'Bosch Concrete Mixer 350L',   'Construction',    'Heavy-duty concrete mixer, perfect for medium construction projects. Well maintained and regularly serviced.',         8500,  'Lekki, Lagos',           'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600&q=80', 'available'),
    (3, 'Sony A7 III Camera Kit',      'Photography',     'Full-frame mirrorless camera with 28-70mm kit lens, 2 batteries, charger and carry bag included.',                   15000, 'Victoria Island, Lagos', 'https://images.unsplash.com/photo-1606986628253-1abb0aa0c1f3?w=600&q=80', 'available'),
    (1, 'Toyota Hilux Pickup 2022',    'Vehicles',        'Double cab pickup truck, air conditioning, great for site logistics and material transport.',                        35000, 'Abuja, FCT',             'https://images.unsplash.com/photo-1559416523-140ddc3d238c?w=600&q=80', 'rented'),
    (3, 'Tents & Canopy Set (10 pcs)', 'Event Materials', 'Heavy-duty event tents, each 3x3m. Suitable for outdoor events, weddings and ceremonies.',                          12000, 'Ikeja, Lagos',           'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&q=80', 'available');

INSERT INTO rental_requests (item_id, renter_id, status, start_date, end_date, message) VALUES
    (3, 2, 'approved', '2025-05-01', '2025-05-07', 'Need it for a site in Gwagwalada.');
