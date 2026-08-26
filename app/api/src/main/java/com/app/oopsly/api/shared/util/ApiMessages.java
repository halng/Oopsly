/*
 *    Copyright 2026 Hao Nguyen Tan
 *
 *    Licensed under the Apache License, Version 2.0 (the "License");
 *    you may not use this file except in compliance with the License.
 *    You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 *    Unless required by applicable law or agreed to in writing, software
 *    distributed under the License is distributed on an "AS IS" BASIS,
 *    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *    See the License for the specific language governing permissions and
 *    limitations under the License.
 */

package com.app.oopsly.api.shared.util;

/** All user-facing texts returned by the API. No inline literals in services/controllers. */
public final class ApiMessages {

    private ApiMessages() {}

    // Generic
    public static final String FETCHED = "Fetched successfully";
    public static final String CREATED = "Created successfully";
    public static final String UPDATED = "Updated successfully";
    public static final String DELETED = "Deleted successfully";

    // Cards
    public static final String CARD_REVIEWED = "Card reviewed and rescheduled";
    public static final String CARDS_IMPORTED = "Flashcards imported successfully";

    // Test suites
    public static final String TEST_SUBMITTED = "Test submitted successfully";

    // Community
    public static final String COMMUNITY_LIST_FETCHED = "Communities fetched successfully";
    public static final String COMMUNITY_MY_LIST_FETCHED = "Your communities fetched successfully";
    public static final String COMMUNITY_CREATED = "Community created successfully";
    public static final String COMMUNITY_JOINED = "Joined community successfully";
    public static final String COMMUNITY_JOIN_REQUEST_SENT =
            "Join request sent to community admins";
    public static final String COMMUNITY_LEFT = "Left community";
    public static final String COMMUNITY_MEMBER_INVITED = "User added to the community";
    public static final String COMMUNITY_REQUESTS_FETCHED = "Join requests fetched successfully";
    public static final String COMMUNITY_REQUEST_APPROVED = "Join request approved";
    public static final String COMMUNITY_REQUEST_REJECTED = "Join request rejected";
    public static final String COMMUNITY_LEADERBOARD_FETCHED =
            "Community leaderboard fetched successfully";

    // Leaderboard
    public static final String LEADERBOARD_FETCHED = "Leaderboard fetched successfully";

    // Statistics
    public static final String STATS_FETCHED = "Stats fetched successfully";

    // AI generation
    public static final String AI_CARDS_GENERATED = "Flashcards generated with AI";
    public static final String AI_TOPIC_REQUIRED = "Topic or study notes are required";
    public static final String AI_PROVIDER_NOT_CONFIGURED =
            "AI provider is not configured on this environment";

    // Garden & Pomodoro
    public static final String GARDEN_FETCHED = "Garden fetched successfully";
    public static final String GARDEN_SEED_PLANTED = "Seed planted in your forest";
    public static final String GARDEN_TREE_WATERED = "Your plant has been watered";
    public static final String GARDEN_PLOT_UNLOCKED = "New land plot unlocked";
    public static final String POMODORO_SESSION_COMPLETED =
            "Focus session completed, rewards granted";

    // Quiz (realtime)
    public static final String QUIZ_CREATED = "Quiz room created";
    public static final String QUIZ_RESULTS_FETCHED = "Quiz results fetched successfully";

    // Fallback / degraded mode messages (shown to the user)
    public static final String COMMUNITY_UNAVAILABLE =
            "Communities are temporarily unavailable. Please try again in a few moments.";
    public static final String LEADERBOARD_UNAVAILABLE =
            "The leaderboard is taking a short break. Please try again shortly.";
    public static final String GARDEN_UNAVAILABLE =
            "Your garden is resting right now. Please try again in a few moments.";
    public static final String QUIZ_UNAVAILABLE =
            "Live quiz is temporarily unavailable. Please try again shortly.";
    public static final String STATS_UNAVAILABLE =
            "Your statistics are temporarily unavailable. Please try again shortly.";
    public static final String DISCOVER_UNAVAILABLE =
            "Discover is temporarily unavailable. Please try again shortly.";
    public static final String AI_UNAVAILABLE =
            "AI generation is busy right now, so we prepared starter flashcards for you.";

    // Errors
    public static final String COMMUNITY_NOT_FOUND = "Community not found";
    public static final String COMMUNITY_NAME_REQUIRED = "Community name is required";
    public static final String COMMUNITY_ALREADY_MEMBER =
            "You are already a member of this community";
    public static final String COMMUNITY_REQUEST_PENDING = "Join request already pending approval";
    public static final String COMMUNITY_REQUEST_NOT_FOUND = "Join request not found";
    public static final String COMMUNITY_NOT_ALLOWED =
            "You do not have permission to manage this community";
    public static final String COMMUNITY_INVITE_USER_NOT_FOUND =
            "We could not find a learner with that email";
    public static final String GARDEN_PLOT_NOT_FOUND = "Land plot not found";
    public static final String GARDEN_PLOT_LOCKED = "This land plot is still locked";
    public static final String GARDEN_PLOT_OCCUPIED = "This land plot already has a plant";
    public static final String GARDEN_NO_SEED = "You do not have this seed in your inventory";
    public static final String GARDEN_NOT_ENOUGH_COINS = "Not enough forest coins to unlock";
    public static final String GARDEN_NOT_ENOUGH_DEW = "Not enough dew drops to water";
    public static final String GARDEN_TREE_NOT_FOUND = "Plant not found in your garden";
    public static final String QUIZ_ROOM_NOT_FOUND = "Room not found";
    public static final String QUIZ_ALREADY_STARTED = "Quiz already started";
    public static final String QUIZ_NOT_HOST = "Only the host can control this quiz";
    public static final String QUIZ_NOT_IN_QUESTION = "There is no active question right now";
    public static final String QUIZ_PLAYER_NOT_FOUND = "You are not part of this quiz room";
    public static final String QUIZ_ALREADY_ANSWERED = "You already answered this question";
}
