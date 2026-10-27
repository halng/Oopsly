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

import com.app.oopsly.api.quiz.application.vm.AnswerReq;
import com.app.oopsly.api.quiz.application.vm.CreateRoomReq;
import com.app.oopsly.api.quiz.application.vm.QuizUserEvent;
import com.app.oopsly.api.quiz.application.vm.RoomView;
import com.app.oopsly.api.quiz.domain.QuizMode;
import com.app.oopsly.api.quiz.domain.QuizPlan;
import com.app.oopsly.api.quiz.domain.QuizState;
import com.app.oopsly.api.quiz.domain.RoomState;
import com.app.oopsly.api.quiz.domain.RoomState.Answer;
import com.app.oopsly.api.quiz.domain.RoomState.Player;
import com.app.oopsly.api.quiz.domain.RoomState.Question;
import com.app.oopsly.api.quiz.infrastructure.QuizRoomStore;
import com.app.oopsly.api.shared.client.AuthClient;
import com.app.oopsly.api.shared.exception.NotFoundException;
import com.app.oopsly.api.shared.exception.ValidationException;
import com.app.oopsly.api.shared.security.CurrentUser;
import com.app.oopsly.api.shared.util.AnswerMatcher;
import com.app.oopsly.api.shared.util.ApiMessages;
import com.app.oopsly.api.shared.util.GamificationRules;
import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.shelf.ShelfRepository;
import com.app.oopsly.api.testsuite.application.QuestionMetadataMapper;
import com.app.oopsly.api.testsuite.domain.QuestionEntity;
import com.app.oopsly.api.testsuite.domain.QuestionMetadata;
import com.app.oopsly.api.testsuite.domain.QuestionType;
import com.app.oopsly.api.testsuite.domain.TestSuiteEntity;
import com.app.oopsly.api.testsuite.infrastructure.QuestionRepository;
import com.app.oopsly.api.testsuite.infrastructure.TestSuiteRepository;
import java.security.SecureRandom;
import java.time.Clock;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuizServiceImpl implements QuizService {

    static final String GUEST_PREFIX = "guest:";
    private static final int CODE_MIN = 100000;
    private static final int CODE_BOUND = 900000;
    private static final long ANSWER_GRACE_MILLIS = 1500;
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Set<QuestionType> HOSTABLE =
            Set.of(
                    QuestionType.SINGLE_CHOICE,
                    QuestionType.MULTIPLE_CHOICE,
                    QuestionType.TRUE_FALSE,
                    QuestionType.FILL_IN_THE_BLANK);

    private final QuizRoomStore store;
    private final QuizPublisher publisher;
    private final QuizViewFactory viewFactory;
    private final CurrentUser currentUser;
    private final AuthClient authClient;
    private final ShelfRepository shelfRepository;
    private final TestSuiteRepository testSuiteRepository;
    private final QuestionRepository questionRepository;
    private final QuestionMetadataMapper metadataMapper;
    private final Clock clock;

    @Override
    public RoomView createRoom(CreateRoomReq request) {
        UUID hostId = currentUser.id();
        Shelf shelf =
                shelfRepository
                        .findByIdAndUserId(request.shelfId(), hostId)
                        .orElseThrow(() -> new NotFoundException("Shelve not found"));
        TestSuiteEntity suite =
                testSuiteRepository
                        .findByIdAndShelve(request.testSuiteId(), shelf)
                        .orElseThrow(() -> new NotFoundException("Test suite not found"));

        List<Question> questions =
                questionRepository.findAllByTestSuite(suite).stream()
                        .filter(q -> HOSTABLE.contains(q.getType()))
                        .map(this::toQuestion)
                        .toList();
        if (questions.isEmpty()) {
            throw new ValidationException(ApiMessages.QUIZ_NO_QUESTIONS);
        }

        RoomState room = new RoomState();
        room.setCode(newCode());
        room.setHostId(hostId.toString());
        room.setHostName(authClient.lookup(hostId).label());
        room.setTitle(suite.getTitle());
        room.setMode(request.mode() == null ? QuizMode.MANUAL : request.mode());
        room.setMaxPlayers(QuizPlan.from(currentUser.plan()).maxPlayers());
        room.setQuestionSeconds(
                request.questionSeconds() == null
                        ? GamificationRules.QUIZ_DEFAULT_QUESTION_SECONDS
                        : request.questionSeconds());
        room.setQuestions(new ArrayList<>(questions));
        store.create(room);
        log.info("Quiz room {} created by host {}", room.getCode(), hostId);
        return viewFactory.roomView(room);
    }

    @Override
    public void join(String code, String playerKey, String sessionId, String name) {
        String cleanName = name.trim();
        RoomState room =
                store.update(
                        code,
                        state -> {
                            if (state.getState() == QuizState.FINISHED) {
                                throw new ValidationException(ApiMessages.QUIZ_FINISHED);
                            }
                            Player existing = state.getPlayers().get(playerKey);
                            if (existing != null) {
                                existing.setConnected(true);
                                return state;
                            }
                            if (state.getState() != QuizState.LOBBY) {
                                throw new ValidationException(ApiMessages.QUIZ_ALREADY_STARTED);
                            }
                            if (state.getPlayers().size() >= state.getMaxPlayers()) {
                                throw new ValidationException(ApiMessages.QUIZ_ROOM_FULL);
                            }
                            boolean taken =
                                    state.getPlayers().values().stream()
                                            .anyMatch(
                                                    p ->
                                                            p.getName()
                                                                    .toLowerCase(Locale.ROOT)
                                                                    .equals(
                                                                            cleanName.toLowerCase(
                                                                                    Locale.ROOT)));
                            if (taken) {
                                throw new ValidationException(ApiMessages.QUIZ_NAME_TAKEN);
                            }
                            Player player = new Player();
                            player.setId(UUID.randomUUID().toString());
                            player.setName(cleanName);
                            player.setGuest(playerKey.startsWith(GUEST_PREFIX));
                            state.getPlayers().put(playerKey, player);
                            return state;
                        });
        store.bindSession(sessionId, code, playerKey);
        publisher.sendTo(playerKey, QuizUserEvent.joined(room.getPlayers().get(playerKey).getId()));
        publisher.publish(room);
    }

    @Override
    public void resume(String code, String playerKey, String sessionId) {
        RoomState room =
                store.update(
                        code,
                        state -> {
                            Player player = state.getPlayers().get(playerKey);
                            if (player != null) {
                                player.setConnected(true);
                            } else if (!isHost(state, playerKey)) {
                                throw new NotFoundException(ApiMessages.QUIZ_PLAYER_NOT_FOUND);
                            }
                            return state;
                        });
        store.bindSession(sessionId, code, playerKey);
        Player player = room.getPlayers().get(playerKey);
        if (player != null) {
            publisher.sendTo(playerKey, QuizUserEvent.joined(player.getId()));
        }
        publisher.publish(room);
    }

    @Override
    public void start(String code, String playerKey) {
        RoomState room =
                store.update(
                        code,
                        state -> {
                            requireHost(state, playerKey);
                            if (state.getState() != QuizState.LOBBY) {
                                throw new ValidationException(ApiMessages.QUIZ_ALREADY_STARTED);
                            }
                            if (state.getPlayers().isEmpty()) {
                                throw new ValidationException(ApiMessages.QUIZ_NEEDS_PLAYERS);
                            }
                            openQuestion(state, 0);
                            return state;
                        });
        publisher.publish(room);
    }

    @Override
    public void answer(String code, String playerKey, AnswerReq answer) {
        RoomState room =
                store.update(
                        code,
                        state -> {
                            Player player = state.getPlayers().get(playerKey);
                            if (player == null) {
                                throw new NotFoundException(ApiMessages.QUIZ_PLAYER_NOT_FOUND);
                            }
                            if (state.getState() != QuizState.QUESTION) {
                                throw new ValidationException(ApiMessages.QUIZ_NOT_IN_QUESTION);
                            }
                            long now = clock.millis();
                            if (now > state.getDeadline() + ANSWER_GRACE_MILLIS) {
                                throw new ValidationException(ApiMessages.QUIZ_TIME_UP);
                            }
                            if (player.getAnswers().containsKey(state.getCurrentIndex())) {
                                throw new ValidationException(ApiMessages.QUIZ_ALREADY_ANSWERED);
                            }
                            record(state, player, answer, now);
                            if (everyoneAnswered(state)) {
                                closeQuestion(state);
                            }
                            return state;
                        });
        publisher.sendTo(playerKey, QuizUserEvent.accepted());
        publisher.publish(room);
    }

    @Override
    public void next(String code, String playerKey) {
        RoomState room =
                store.update(
                        code,
                        state -> {
                            requireHost(state, playerKey);
                            switch (state.getState()) {
                                case QUESTION -> closeQuestion(state);
                                case REVEAL -> advance(state);
                                default -> throw new ValidationException(
                                        ApiMessages.QUIZ_NOT_IN_REVEAL);
                            }
                            return state;
                        });
        publisher.publish(room);
    }

    @Override
    public void setMode(String code, String playerKey, QuizMode mode) {
        RoomState room =
                store.update(
                        code,
                        state -> {
                            requireHost(state, playerKey);
                            state.setMode(mode);
                            if (state.getState() == QuizState.REVEAL) {
                                state.setDeadline(mode == QuizMode.AUTO ? revealDeadline() : 0);
                            }
                            return state;
                        });
        publisher.publish(room);
    }

    @Override
    public void end(String code, String playerKey) {
        RoomState room =
                store.update(
                        code,
                        state -> {
                            requireHost(state, playerKey);
                            if (state.getState() == QuizState.QUESTION) {
                                closeQuestion(state);
                            }
                            finish(state);
                            return state;
                        });
        publisher.publish(room);
        store.deactivate(code);
    }

    @Override
    public void disconnect(String sessionId) {
        store.unbindSession(sessionId)
                .ifPresent(
                        binding -> {
                            try {
                                RoomState room =
                                        store.update(
                                                binding[0],
                                                state -> markOffline(state, binding[1]));
                                publisher.publish(room);
                            } catch (NotFoundException ex) {
                                log.debug("Room {} is gone, nothing to detach", binding[0]);
                            }
                        });
    }

    @Override
    public void tick() {
        long now = clock.millis();
        for (String code : store.activeCodes()) {
            try {
                RoomState snapshot = store.find(code).orElse(null);
                if (snapshot == null || snapshot.getState() == QuizState.FINISHED) {
                    store.deactivate(code);
                } else if (due(snapshot, now)) {
                    RoomState room =
                            store.update(
                                    code,
                                    state -> {
                                        if (due(state, now)) {
                                            timerElapsed(state);
                                        }
                                        return state;
                                    });
                    publisher.publish(room);
                    if (room.getState() == QuizState.FINISHED) {
                        store.deactivate(code);
                    }
                }
            } catch (RuntimeException ex) {
                log.warn("Quiz tick failed for room {}: {}", code, ex.getMessage());
            }
        }
    }

    // ------------------------------------------------------------ transitions

    private RoomState markOffline(RoomState state, String playerKey) {
        Player player = state.getPlayers().get(playerKey);
        if (player == null) {
            return state;
        }
        if (state.getState() == QuizState.LOBBY) {
            state.getPlayers().remove(playerKey);
        } else {
            player.setConnected(false);
            if (state.getState() == QuizState.QUESTION && everyoneAnswered(state)) {
                closeQuestion(state);
            }
        }
        return state;
    }

    private boolean due(RoomState state, long now) {
        return state.getDeadline() > 0
                && now >= state.getDeadline()
                && (state.getState() == QuizState.QUESTION || state.getState() == QuizState.REVEAL);
    }

    private void timerElapsed(RoomState state) {
        if (state.getState() == QuizState.QUESTION) {
            closeQuestion(state);
        } else {
            advance(state);
        }
    }

    private void openQuestion(RoomState state, int index) {
        long now = clock.millis();
        state.setState(QuizState.QUESTION);
        state.setCurrentIndex(index);
        state.setQuestionStartedAt(now);
        state.setDeadline(now + state.getQuestionSeconds() * 1000L);
    }

    private void closeQuestion(RoomState state) {
        int index = state.getCurrentIndex();
        for (Player player : state.getPlayers().values()) {
            if (!player.getAnswers().containsKey(index)) {
                player.setStreak(0);
            }
        }
        state.setState(QuizState.REVEAL);
        state.setDeadline(state.getMode() == QuizMode.AUTO ? revealDeadline() : 0);
    }

    private void advance(RoomState state) {
        int next = state.getCurrentIndex() + 1;
        if (next < state.getQuestions().size()) {
            openQuestion(state, next);
        } else {
            finish(state);
        }
    }

    private void finish(RoomState state) {
        state.setState(QuizState.FINISHED);
        state.setDeadline(0);
    }

    private long revealDeadline() {
        return clock.millis() + GamificationRules.QUIZ_REVEAL_SECONDS * 1000L;
    }

    private boolean everyoneAnswered(RoomState state) {
        int index = state.getCurrentIndex();
        List<Player> online =
                state.getPlayers().values().stream().filter(Player::isConnected).toList();
        return !online.isEmpty()
                && online.stream().allMatch(p -> p.getAnswers().containsKey(index));
    }

    // ---------------------------------------------------------------- grading

    private void record(RoomState state, Player player, AnswerReq req, long now) {
        Question question = state.getQuestions().get(state.getCurrentIndex());
        Answer answer = new Answer();
        answer.setElapsedMs(Math.max(0, now - state.getQuestionStartedAt()));
        boolean correct;
        switch (QuestionType.valueOf(question.getType())) {
            case MULTIPLE_CHOICE -> {
                Set<Integer> picked = validIndexes(question, req.indexes());
                answer.setIndexes(new ArrayList<>(picked));
                correct = picked.equals(new HashSet<>(question.getCorrectIndexes()));
            }
            case FILL_IN_THE_BLANK -> {
                if (req.text() == null || req.text().isBlank()) {
                    throw new ValidationException(ApiMessages.QUIZ_BAD_ANSWER);
                }
                answer.setText(req.text().trim());
                correct =
                        AnswerMatcher.matches(
                                req.text(),
                                question.getAcceptedAnswers(),
                                question.isCaseSensitive());
            }
            default -> {
                Integer index = req.index();
                if (index == null || index < 0 || index >= question.getOptions().size()) {
                    throw new ValidationException(ApiMessages.QUIZ_BAD_ANSWER);
                }
                answer.setIndex(index);
                correct = index.equals(question.getCorrectIndex());
            }
        }
        answer.setCorrect(correct);
        if (correct) {
            answer.setPoints(
                    GamificationRules.quizPoints(
                            answer.getElapsedMs(), state.getQuestionSeconds() * 1000L));
            player.setScore(player.getScore() + answer.getPoints());
            player.setStreak(player.getStreak() + 1);
        } else {
            player.setStreak(0);
        }
        player.getAnswers().put(state.getCurrentIndex(), answer);
    }

    private Set<Integer> validIndexes(Question question, List<Integer> picked) {
        if (picked == null || picked.isEmpty()) {
            throw new ValidationException(ApiMessages.QUIZ_BAD_ANSWER);
        }
        Set<Integer> unique = new HashSet<>(picked);
        for (Integer index : unique) {
            if (index == null || index < 0 || index >= question.getOptions().size()) {
                throw new ValidationException(ApiMessages.QUIZ_BAD_ANSWER);
            }
        }
        return unique;
    }

    private Question toQuestion(QuestionEntity entity) {
        QuestionMetadata metadata = metadataMapper.read(entity.getMetadata());
        Question question = new Question();
        question.setId(entity.getId().toString());
        question.setText(entity.getText());
        question.setType(entity.getType().name());
        question.setOptions(new ArrayList<>(metadata.optionsOrEmpty()));
        question.setCorrectIndex(metadata.correctOptionIndex());
        question.setCorrectIndexes(new ArrayList<>(metadata.correctOptionIndexesOrEmpty()));
        question.setAcceptedAnswers(new ArrayList<>(metadata.acceptedAnswersOrEmpty()));
        question.setCaseSensitive(metadata.caseSensitiveOrFalse());
        question.setExplanation(metadata.explanation());
        return question;
    }

    // ---------------------------------------------------------------- helpers

    private static boolean isHost(RoomState state, String playerKey) {
        return state.getHostId().equals(playerKey);
    }

    private static void requireHost(RoomState state, String playerKey) {
        if (!isHost(state, playerKey)) {
            throw new ValidationException(ApiMessages.QUIZ_NOT_HOST);
        }
    }

    private String newCode() {
        String code;
        do {
            code = String.valueOf(CODE_MIN + RANDOM.nextInt(CODE_BOUND));
        } while (store.exists(code));
        return code;
    }
}
