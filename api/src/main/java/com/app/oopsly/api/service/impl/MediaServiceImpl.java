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

package com.app.oopsly.api.service.impl;

import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.ShelfRepository;
import com.app.oopsly.api.repository.SubjectRepository;
import com.app.oopsly.api.service.MediaService;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.viewmodel.ApiRes;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MediaServiceImpl implements MediaService {

    private final CardRepository cardRepository;
    private final ShelfRepository shelfRepository;
    private final SubjectRepository subjectRepository;
    private final UserService userService;

    @Override
    public ApiRes getUploadUrl(
            UUID shelfId, UUID subjectId, UUID cardId, String fileName, String contentType) {
        log.info(
                "Media upload requested for card: {} in subject: {} in shelf: {}",
                cardId,
                subjectId,
                shelfId);
        return ApiRes.success(
                "Media upload not configured. Set MEDIA_BUCKET environment variable to enable S3"
                        + " uploads.");
    }
}
