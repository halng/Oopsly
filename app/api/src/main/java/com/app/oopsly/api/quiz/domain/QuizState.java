package com.app.oopsly.api.quiz.domain;

/** Lifecycle of a live quiz room. */
public enum QuizState {
    LOBBY,
    QUESTION,
    /** Question closed: answer, statistics and leaderboard are on screen. */
    REVEAL,
    FINISHED
}
