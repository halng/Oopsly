--
-- Copyright 2026 Hao Nguyen Tan
--
-- Licensed under the Apache License, Version 2.0 (the "License");
-- you may not use this file except in compliance with the License.
-- You may obtain a copy of the License at
--
--     http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.
--
-- Flyway Teams undo migration for V1. Run only when intentionally reverting
-- the complete baseline schema in an environment without retained user data.

BEGIN;

DROP TABLE IF EXISTS test_suite_subjects;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS test_suites;
DROP TABLE IF EXISTS card_tags;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS card_entity;
DROP TABLE IF EXISTS subjects;
DROP TABLE IF EXISTS shelves;
DROP TABLE IF EXISTS settings;
DROP TABLE IF EXISTS users;

COMMIT;
