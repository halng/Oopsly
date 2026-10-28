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
import com.app.oopsly.api.quiz.application.vm.RoomView;
import com.app.oopsly.api.quiz.domain.QuizMode;

/**
 * Live room use cases. {@code playerKey} is the private socket identity: a user id, or {@code
 * guest:<uuid>} for players without an account.
 */
public interface QuizService {

    /** Creates a room for the signed-in host, capped by the host's subscription plan. */
    RoomView createRoom(CreateRoomReq request);

    /** Enters the room as a player; the same key re-attaches an existing player. */
    void join(String code, String playerKey, String sessionId, String name);

    /** Re-attaches the host or a player after a reconnect and pushes the current state. */
    void resume(String code, String playerKey, String sessionId);

    void start(String code, String playerKey);

    void answer(String code, String playerKey, AnswerReq answer);

    /** Closes the open question, or moves from the reveal to the next question. */
    void next(String code, String playerKey);

    void setMode(String code, String playerKey, QuizMode mode);

    /** Ends the game early and shows the final standings. */
    void end(String code, String playerKey);

    void disconnect(String sessionId);

    /** Moves rooms whose timer elapsed forward; driven by the scheduler. */
    void tick();
}
