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

package com.app.quizi.api.subject;

import com.app.quizi.api.card.CardRepository;
import com.app.quizi.api.shared.application.vm.ApiRes;
import com.app.quizi.api.shared.application.vm.PagingRes;
import com.app.quizi.api.shared.exception.NotFoundException;
import com.app.quizi.api.subject.vm.PublicDeckRes;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

/** Read-only access to public decks without signing in, so search engines can index them. */
@Service
@RequiredArgsConstructor
public class PublicDeckService {

    /** Cards shown on a deck page; the rest are behind signing in and cloning the deck. */
    static final int PREVIEW_CARDS = 30;

    private static final int MAX_PAGE_SIZE = 500;

    private final SubjectRepository subjectRepository;
    private final CardRepository cardRepository;

    public ApiRes list(int page, int size) {
        PageRequest pageable =
                PageRequest.of(Math.max(page, 0), Math.clamp(size, 1, MAX_PAGE_SIZE));
        Page<Subject> pageData = subjectRepository.findAllPublicListed(pageable);
        List<PublicDeckRes> decks =
                pageData.getContent().stream()
                        .map(
                                s ->
                                        new PublicDeckRes(
                                                s.getId(),
                                                s.getName(),
                                                s.getDescription(),
                                                cardRepository.countBySubjectAndDeletedFalse(s),
                                                s.getUpdatedAt(),
                                                List.of()))
                        .toList();
        return ApiRes.success(
                "Public decks fetched successfully",
                new PagingRes<>(
                        decks,
                        pageable.getPageNumber(),
                        pageData.getTotalElements(),
                        pageData.getTotalPages(),
                        pageData.hasNext()));
    }

    public ApiRes getById(UUID id) {
        Subject subject =
                subjectRepository
                        .findPublicById(id)
                        .orElseThrow(() -> new NotFoundException("Deck not found with id: " + id));
        List<PublicDeckRes.PublicCardRes> cards =
                cardRepository
                        .findAllBySubject(subject, PageRequest.of(0, PREVIEW_CARDS))
                        .getContent()
                        .stream()
                        .map(c -> new PublicDeckRes.PublicCardRes(c.getFront(), c.getBack()))
                        .toList();
        return ApiRes.success(
                "Public deck fetched successfully",
                new PublicDeckRes(
                        subject.getId(),
                        subject.getName(),
                        subject.getDescription(),
                        cardRepository.countBySubjectAndDeletedFalse(subject),
                        subject.getUpdatedAt(),
                        cards));
    }
}
