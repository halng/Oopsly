-- Make the script idempotent: clean up existing mock data if this runs multiple times
DELETE FROM users WHERE email IN ('test@oopsly.com', 'user1@oopsly.com', 'user2@oopsly.com', 'integration@oopsly.com');

DO $$
DECLARE
v_user_id UUID;
    v_shelf_id UUID;
    v_subject_id UUID;
    v_card_id UUID;
    v_tag_id UUID;
    v_emails TEXT[] := ARRAY['test@oopsly.com', 'user1@oopsly.com', 'user2@oopsly.com', 'integration@oopsly.com'];
    v_email TEXT;
    v_name TEXT;
    i INT; -- Shelf loop
    j INT; -- Subject loop
    k INT; -- Card loop
    t INT; -- Tag loop
BEGIN
    FOREACH v_email IN ARRAY v_emails LOOP
        -- Extract name from email (e.g., 'test' from 'test@oopsly.com')
        v_name := split_part(v_email, '@', 1);
        v_user_id := gen_random_uuid();

        -- 1. Create User
INSERT INTO users (id, created_at, updated_at, name, email, display_name, age)
VALUES (v_user_id, NOW(), NOW(), v_name, v_email, initcap(v_name), 25);

-- 2. Create Settings
INSERT INTO settings (id, created_at, updated_at, theme, language, user_id, league)
VALUES (gen_random_uuid(), NOW(), NOW(), 'DARK', 'ENGLISH', v_user_id, 'BRONZE');

-- 3. Create 3 Tags per user
FOR t IN 1..3 LOOP
            v_tag_id := gen_random_uuid();
INSERT INTO tags (id, created_at, updated_at, name, user_id)
VALUES (v_tag_id, NOW(), NOW(), 'Tag ' || t || ' (' || v_name || ')', v_user_id);
END LOOP;

        -- 4. Create 5 Shelves per user
FOR i IN 1..5 LOOP
            v_shelf_id := gen_random_uuid();
INSERT INTO shelves (id, created_at, updated_at, icon, name, slug, description, user_id, color)
VALUES (
           v_shelf_id, NOW(), NOW(), 'folder',
           'Shelf ' || i || ' for ' || v_name,
           'shelf-' || i || '-' || v_name,
           'Description for shelf ' || i,
           v_user_id, '#4F46E5'
       );

-- 5. Create 5 Subjects per shelf
FOR j IN 1..5 LOOP
                v_subject_id := gen_random_uuid();
INSERT INTO subjects (id, created_at, updated_at, name, slug, description, shelf_id, color, icon)
VALUES (
           v_subject_id, NOW(), NOW(),
           'Subject ' || j || ' (Shelf ' || i || ')',
           'subject-' || j || '-shelf-' || i || '-' || v_name,
           'Mock subject description',
           v_shelf_id, '#10B981', 'folder'
       );

-- Attach a random tag (from this user's tags) to the subject
INSERT INTO subjects_tags (subject_id, tag_id)
SELECT v_subject_id, id FROM tags WHERE user_id = v_user_id ORDER BY random() LIMIT 1;

-- 6. Create 10 Cards per subject
FOR k IN 1..10 LOOP
                    v_card_id := gen_random_uuid();
INSERT INTO cards (id, created_at, updated_at, front, back, hint, difficulty_level, subject_id, next_practice_time)
VALUES (
           v_card_id, NOW(), NOW(),
           'Question ' || k || ' for Subject ' || j,
           'Answer ' || k,
           'Hint ' || k,
           'EASY',
           v_subject_id,
           NOW() + (k || ' days')::interval -- stagger practice times
       );
END LOOP;

END LOOP;
END LOOP;

        -- Print progress to the console (Viewable if run directly in pgAdmin/DataGrip)
        RAISE NOTICE 'Generated mock data for %', v_email;
END LOOP;
END $$;