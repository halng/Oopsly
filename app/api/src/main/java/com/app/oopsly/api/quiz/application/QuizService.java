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
import com.app.oopsly.api.quiz.application.vm.QuizStateView;
import com.app.oopsly.api.quiz.application.vm.SubmitAnswerReq;

public interface QuizService {

    QuizStateView createRoom(CreateQuizReq request, String hostSessionKey);

    QuizStateView join(String roomCode, JoinQuizReq request, String playerSessionKey);

    QuizStateView start(String roomCode, String hostSessionKey);

    AnswerFeedback submitAnswer(String roomCode, SubmitAnswerReq request, String playerSessionKey);

    QuizStateView nextQuestion(String roomCode, String hostSessionKey);

    QuizStateView getState(String roomCode);

    boolean allPlayersAnswered(String roomCode);

    void handleDisconnect(String sessionKey);
}
