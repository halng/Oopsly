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

import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.SubjectReq;
import com.app.oopsly.api.viewmodel.SubjectSettingReq;
import java.util.UUID;

public interface SubjectService {
    ApiRes create(UUID shelveId, SubjectReq request);

    ApiRes update(UUID shelveId, UUID subjectId, SubjectReq request);

    ApiRes updateSetting(UUID shelveId, UUID subjectId, SubjectSettingReq request);

    ApiRes delete(UUID shelveId, UUID subjectId);

    ApiRes getById(UUID shelveId, UUID subjectId);

    ApiRes getAllByShelve(UUID shelveId, int page, int size);

    ApiRes discoverPublicDecks(String query, int page, int size);

    ApiRes cloneDeck(UUID subjectId);
}
