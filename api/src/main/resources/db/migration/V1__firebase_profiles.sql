-- Copyright 2026 Hao Nguyen Tan
-- Licensed under the Apache License, Version 2.0
-- Baseline schema for installations that did not previously use Flyway.

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE,
    name VARCHAR(255),
    hashed_password VARCHAR(255) UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    picture_url VARCHAR(255),
    display_name VARCHAR(50),
    bio VARCHAR(255),
    age INTEGER,
    daily_streak INTEGER DEFAULT 0,
    total_xp INTEGER DEFAULT 0,
    last_reviewed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS shelves (
    id UUID PRIMARY KEY, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE, icon VARCHAR(255), name VARCHAR(255),
    description VARCHAR(255), user_id UUID NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE, name VARCHAR(255), description VARCHAR(255),
    daily_limit INTEGER DEFAULT 20, new_cards_per_day INTEGER DEFAULT 5,
    interval DOUBLE PRECISION DEFAULT 1.0, is_public BOOLEAN DEFAULT FALSE,
    shelf_id UUID NOT NULL REFERENCES shelves(id), parent_subject_id UUID REFERENCES subjects(id)
);
CREATE TABLE IF NOT EXISTS card_entity (
    id UUID PRIMARY KEY, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE, front VARCHAR(255), back VARCHAR(255),
    difficulty_level VARCHAR(255), next_practice_time TIMESTAMPTZ,
    number_of_practice INTEGER DEFAULT 0, fsrs_stability DOUBLE PRECISION DEFAULT 0,
    fsrs_difficulty DOUBLE PRECISION DEFAULT 0, fsrs_interval_days INTEGER DEFAULT 0,
    fsrs_repetitions INTEGER DEFAULT 0, last_reviewed_at TIMESTAMPTZ,
    subject_id UUID NOT NULL REFERENCES subjects(id)
);
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE, name VARCHAR(50) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS card_tags (
    card_id UUID NOT NULL REFERENCES card_entity(id), tag_id UUID NOT NULL REFERENCES tags(id),
    PRIMARY KEY (card_id, tag_id)
);
CREATE TABLE IF NOT EXISTS test_suites (
    id UUID PRIMARY KEY, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE, title VARCHAR(255), is_active BOOLEAN,
    highest_score INTEGER, selection JSONB, shelf_id UUID NOT NULL REFERENCES shelves(id)
);
CREATE TABLE IF NOT EXISTS questions (
    id UUID PRIMARY KEY, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE, text VARCHAR(255), type VARCHAR(255), metadata VARCHAR(255),
    test_suite_id UUID NOT NULL REFERENCES test_suites(id)
);
CREATE TABLE IF NOT EXISTS test_suite_subjects (
    test_suite_id UUID NOT NULL REFERENCES test_suites(id), subject_id UUID NOT NULL REFERENCES subjects(id),
    PRIMARY KEY (test_suite_id, subject_id)
);
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
    deleted BOOLEAN DEFAULT FALSE, theme VARCHAR(255) NOT NULL, language VARCHAR(255) NOT NULL,
    space_config JSONB NOT NULL, study_schedule JSONB, user_id UUID NOT NULL UNIQUE REFERENCES users(id)
);

ALTER TABLE users ADD COLUMN IF NOT EXISTS firebase_uid VARCHAR(128);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS hobbies VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE;
CREATE UNIQUE INDEX IF NOT EXISTS uk_users_firebase_uid ON users(firebase_uid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_users_phone ON users(phone) WHERE phone IS NOT NULL;
