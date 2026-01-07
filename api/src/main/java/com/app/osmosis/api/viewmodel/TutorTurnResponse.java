/*
 *    Copyright 2025 Hao Nguyen Tan
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

package com.app.osmosis.api.viewmodel;

import java.time.Instant;
import java.util.UUID;

public record TutorTurnResponse(
        UUID sessionId,
        UUID deckId,
        UUID cardId,
        String cardQuestion,
        String userTranscript,
        String tutorReply,
        String tutorReplyAudioBase64,
        Instant nextDueAt) {}
