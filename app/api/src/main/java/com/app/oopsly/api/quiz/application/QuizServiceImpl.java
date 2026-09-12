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

package com.app.oopsly.api.quiz.application;

import com.app.oopsly.api.quiz.application.vm.AnswerFeedback;
import com.app.oopsly.api.quiz.application.vm.CreateQuizReq;
import com.app.oopsly.api.quiz.application.vm.JoinQuizReq;
import com.app.oopsly.api.quiz.application.vm.QuizCardView;
import com.app.oopsly.api.quiz.application.vm.QuizPlayerView;
import com.app.oopsly.api.quiz.application.vm.QuizStateView;
import com.app.oopsly.api.quiz.application.vm.SubmitAnswerReq;
import com.app.oopsly.api.quiz.domain.QuizChannels;
import com.app.oopsly.api.quiz.domain.QuizPlayerEntity;
import com.app.oopsly.api.quiz.domain.QuizSessionEntity;
import com.app.oopsly.api.quiz.domain.QuizState;
import com.app.oopsly.api.quiz.infrastructure.QuizLiveStateStore;
import com.app.oopsly.api.quiz.infrastructure.QuizPlayerRepository;
import com.app.oopsly.api.quiz.infrastructure.QuizSessionRepository;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.util.ApiMessages;
import com.app.oopsly.api.shared.util.GamificationRules;
import com.app.oopsly.api.user.User;
import com.app.oopsly.api.user.UserService;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuizServiceImpl implements QuizService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final QuizSessionRepository sessionRepository;
    private final QuizPlayerRepository playerRepository;
    private final QuizLiveStateStore liveStateStore;
    private final UserService userService;

    @Override
    @Transactional
    public QuizStateView createRoom(CreateQuizReq request, String hostSessionKey) {
        User host = userService.getCurrentUser();
        String roomCode = generateRoomCode();

        QuizSessionEntity session =
                sessionRepository.saveAndFlush(
                        QuizSessionEntity.builder()
                                .roomCode(roomCode)
                                .host(host)
                                .subjectId(request.subjectId())
                                .subjectTitle(request.subjectTitle())
                                .state(QuizState.LOBBY)
                                .currentQuestionIndex(-1)
                                .build());

        liveStateStore.saveCards(roomCode, request.cards());
        log.info("Quiz room {} created by host {}", roomCode, host.getId());
        return toStateView(session);
    }

    @Override
    @Transactional
    public QuizStateView join(String roomCode, JoinQuizReq request, String playerSessionKey) {
        QuizSessionEntity session = getSession(roomCode);
        if (session.getState() != QuizState.LOBBY) {
            throw new ValidationException(ApiMessages.QUIZ_ALREADY_STARTED);
        }

        playerRepository.saveAndFlush(
                QuizPlayerEntity.builder()
                        .session(session)
                        .displayName(request.playerName())
                        .sessionKey(playerSessionKey)
                        .score(0)
                        .build());

        log.info("Player {} joined quiz room {}", request.playerName(), roomCode);
        return getState(roomCode);
    }

    @Override
    @Transactional
    public QuizStateView start(String roomCode, String hostSessionKey) {
        QuizSessionEntity session = getSession(roomCode);
        requireHost(session);

        session.setState(QuizState.QUESTION);
        session.setCurrentQuestionIndex(0);
        session.setQuestionStartedAt(Instant.now());
        sessionRepository.saveAndFlush(session);
        resetAnswers(session);

        return getState(roomCode);
    }

    @Override
    @Transactional
    public AnswerFeedback submitAnswer(
            String roomCode, SubmitAnswerReq request, String playerSessionKey) {
        QuizSessionEntity session = getSession(roomCode);
        if (session.getState() != QuizState.QUESTION) {
            throw new ValidationException(ApiMessages.QUIZ_NOT_IN_QUESTION);
        }

        QuizPlayerEntity player =
                playerRepository
                        .findBySessionIdAndSessionKey(session.getId(), playerSessionKey)
                        .orElseThrow(
                                () -> new NotFoundException(ApiMessages.QUIZ_PLAYER_NOT_FOUND));

        if (player.getCurrentAnswer() != null) {
            throw new ValidationException(ApiMessages.QUIZ_ALREADY_ANSWERED);
        }

        QuizCardView currentCard = currentCard(session);
        boolean correct =
                currentCard != null
                        && currentCard.back() != null
                        && currentCard.back().equalsIgnoreCase(request.answer().trim());

        int points = 0;
        if (correct) {
            long elapsed =
                    Instant.now().toEpochMilli()
                            - (session.getQuestionStartedAt() == null
                                    ? Instant.now().toEpochMilli()
                                    : session.getQuestionStartedAt().toEpochMilli());
            points = GamificationRules.quizPoints(elapsed);
            player.setScore(safeInt(player.getScore()) + points);
        }
        player.setCurrentAnswer(request.answer());
        playerRepository.saveAndFlush(player);

        return new AnswerFeedback(correct, points, safeInt(player.getScore()));
    }

    @Override
    @Transactional
    public QuizStateView nextQuestion(String roomCode, String hostSessionKey) {
        QuizSessionEntity session = getSession(roomCode);
        requireHost(session);

        List<QuizCardView> cards = liveStateStore.getCards(roomCode);
        int nextIndex = safeInt(session.getCurrentQuestionIndex()) + 1;

        if (nextIndex < cards.size()) {
            session.setCurrentQuestionIndex(nextIndex);
            session.setState(QuizState.QUESTION);
            session.setQuestionStartedAt(Instant.now());
            resetAnswers(session);
        } else {
            session.setState(QuizState.FINISHED);
            session.setFinishedAt(Instant.now());
            liveStateStore.clear(roomCode);
        }
        sessionRepository.saveAndFlush(session);
        return getState(roomCode);
    }

    @Override
    @Transactional
    public boolean allPlayersAnswered(String roomCode) {
        QuizSessionEntity session = getSession(roomCode);
        List<QuizPlayerEntity> players = playerRepository.findAllBySessionId(session.getId());
        boolean allAnswered =
                !players.isEmpty() && players.stream().allMatch(p -> p.getCurrentAnswer() != null);
        if (allAnswered && session.getState() == QuizState.QUESTION) {
            session.setState(QuizState.LEADERBOARD);
            sessionRepository.saveAndFlush(session);
        }
        return allAnswered;
    }

    @Override
    public QuizStateView getState(String roomCode) {
        return toStateView(getSession(roomCode));
    }

    @Override
    @Transactional
    public void handleDisconnect(String sessionKey) {
        playerRepository
                .findBySessionKey(sessionKey)
                .ifPresent(
                        player -> {
                            log.info("Player {} disconnected from quiz", player.getDisplayName());
                            playerRepository.delete(player);
                        });
    }

    // ---------------------------------------------------------------- helpers

    private QuizSessionEntity getSession(String roomCode) {
        return sessionRepository
                .findByRoomCode(roomCode)
                .orElseThrow(() -> new NotFoundException(ApiMessages.QUIZ_ROOM_NOT_FOUND));
    }

    private void requireHost(QuizSessionEntity session) {
        User currentUser = userService.getCurrentUser();
        if (!session.getHost().getId().equals(currentUser.getId())) {
            throw new ValidationException(ApiMessages.QUIZ_NOT_HOST);
        }
    }

    private void resetAnswers(QuizSessionEntity session) {
        List<QuizPlayerEntity> players = playerRepository.findAllBySessionId(session.getId());
        players.forEach(p -> p.setCurrentAnswer(null));
        playerRepository.saveAll(players);
    }

    private QuizCardView currentCard(QuizSessionEntity session) {
        List<QuizCardView> cards = liveStateStore.getCards(session.getRoomCode());
        int index = safeInt(session.getCurrentQuestionIndex());
        return index >= 0 && index < cards.size() ? cards.get(index) : null;
    }

    private QuizStateView toStateView(QuizSessionEntity session) {
        List<QuizCardView> cards = liveStateStore.getCards(session.getRoomCode());
        List<QuizPlayerView> players =
                playerRepository.findAllBySessionId(session.getId()).stream()
                        .sorted(
                                Comparator.comparingInt(
                                                (QuizPlayerEntity p) -> safeInt(p.getScore()))
                                        .reversed())
                        .map(
                                p ->
                                        new QuizPlayerView(
                                                p.getId(),
                                                p.getUserId(),
                                                p.getDisplayName(),
                                                safeInt(p.getScore()),
                                                p.getCurrentAnswer() != null))
                        .toList();

        return new QuizStateView(
                session.getRoomCode(),
                session.getHost().getId(),
                session.getHost().getDisplayName() != null
                        ? session.getHost().getDisplayName()
                        : session.getHost().getName(),
                session.getSubjectId(),
                session.getSubjectTitle(),
                session.getState(),
                safeInt(session.getCurrentQuestionIndex()),
                cards.size(),
                currentCard(session),
                players);
    }

    private String generateRoomCode() {
        String code;
        do {
            code =
                    String.valueOf(
                            QuizChannels.ROOM_CODE_MIN
                                    + RANDOM.nextInt(QuizChannels.ROOM_CODE_BOUND));
        } while (sessionRepository.existsByRoomCode(code));
        return code;
    }

    private static int safeInt(Integer value) {
        return value == null ? 0 : value;
    }
}
