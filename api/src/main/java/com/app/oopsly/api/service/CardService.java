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

package com.app.oopsly.api.service;

import com.app.oopsly.api.entity.DifficultyLevel;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.CardItemReq;
import com.app.oopsly.api.viewmodel.CardReq;
import com.app.oopsly.api.viewmodel.UpdateDifficultyReq;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface CardService {
    ApiRes create(UUID shelveId, UUID subjectId, CardReq request);

    ApiRes updateDifficulty(UUID shelveId, UUID subjectId, List<UpdateDifficultyReq> reqList);

    ApiRes delete(UUID shelveId, UUID subjectId, UUID cardId);

    ApiRes getById(UUID shelveId, UUID subjectId, UUID cardId);

    ApiRes getAllCardsByCollection(UUID shelveId, UUID subjectId, int page, int size);

    Instant calculateNextPracticeTime(DifficultyLevel difficultyLevel);

    ApiRes updateCard(UUID shelveId, UUID subjectId, UUID cardId, CardItemReq request);
}
