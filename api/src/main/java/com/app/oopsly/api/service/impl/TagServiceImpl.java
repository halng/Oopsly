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

import com.app.oopsly.api.entity.CardEntity;
import com.app.oopsly.api.entity.ShelfEntity;
import com.app.oopsly.api.entity.SubjectEntity;
import com.app.oopsly.api.entity.TagEntity;
import com.app.oopsly.api.entity.User;
import com.app.oopsly.api.exception.NotFoundException;
import com.app.oopsly.api.exception.ValidationException;
import com.app.oopsly.api.repository.CardRepository;
import com.app.oopsly.api.repository.ShelfRepository;
import com.app.oopsly.api.repository.SubjectRepository;
import com.app.oopsly.api.repository.TagRepository;
import com.app.oopsly.api.service.TagService;
import com.app.oopsly.api.service.UserService;
import com.app.oopsly.api.viewmodel.ApiRes;
import com.app.oopsly.api.viewmodel.CardRes;
import com.app.oopsly.api.viewmodel.TagRes;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class TagServiceImpl implements TagService {

    private final TagRepository tagRepository;
    private final CardRepository cardRepository;
    private final ShelfRepository shelfRepository;
    private final SubjectRepository subjectRepository;
    private final UserService userService;

    @Override
    public ApiRes createTag(String name) {
        User currentUser = userService.getCurrentUser();
        if (tagRepository.existsByNameAndUser(name, currentUser)) {
            throw new ValidationException("Tag with name '" + name + "' already exists");
        }
        TagEntity tag = TagEntity.builder().name(name).user(currentUser).build();
        TagEntity saved = tagRepository.save(tag);
        log.info("Created tag: {} for user: {}", saved.getId(), currentUser.getId());
        return ApiRes.created(
                "Tag created successfully", new TagRes(saved.getId(), saved.getName()));
    }

    @Override
    public ApiRes getAllTags() {
        User currentUser = userService.getCurrentUser();
        List<TagRes> tags =
                tagRepository.findAllByUser(currentUser).stream()
                        .filter(t -> !Boolean.TRUE.equals(t.getDeleted()))
                        .map(t -> new TagRes(t.getId(), t.getName()))
                        .collect(Collectors.toList());
        return ApiRes.success("Tags fetched successfully", tags);
    }

    @Override
    public ApiRes deleteTag(UUID tagId) {
        User currentUser = userService.getCurrentUser();
        TagEntity tag =
                tagRepository
                        .findByIdAndUser(tagId, currentUser)
                        .orElseThrow(
                                () -> new NotFoundException("Tag not found with id: " + tagId));
        tag.setDeleted(true);
        tagRepository.save(tag);
        log.info("Soft-deleted tag: {}", tagId);
        return ApiRes.success("Tag deleted successfully");
    }

    @Override
    public ApiRes addTagToCard(UUID shelfId, UUID subjectId, UUID cardId, UUID tagId) {
        User currentUser = userService.getCurrentUser();
        CardEntity card = findCard(shelfId, subjectId, cardId, currentUser);
        TagEntity tag =
                tagRepository
                        .findByIdAndUser(tagId, currentUser)
                        .orElseThrow(
                                () -> new NotFoundException("Tag not found with id: " + tagId));

        List<TagEntity> tags =
                card.getTags() == null ? new ArrayList<>() : new ArrayList<>(card.getTags());
        boolean alreadyLinked = tags.stream().anyMatch(t -> t.getId().equals(tagId));
        if (!alreadyLinked) {
            tags.add(tag);
            card.setTags(tags);
            cardRepository.save(card);
        }
        log.info("Added tag: {} to card: {}", tagId, cardId);
        return ApiRes.success("Tag added to card successfully");
    }

    @Override
    public ApiRes removeTagFromCard(UUID shelfId, UUID subjectId, UUID cardId, UUID tagId) {
        User currentUser = userService.getCurrentUser();
        CardEntity card = findCard(shelfId, subjectId, cardId, currentUser);

        if (card.getTags() != null) {
            List<TagEntity> updated =
                    card.getTags().stream()
                            .filter(t -> !t.getId().equals(tagId))
                            .collect(Collectors.toList());
            card.setTags(updated);
            cardRepository.save(card);
        }
        log.info("Removed tag: {} from card: {}", tagId, cardId);
        return ApiRes.success("Tag removed from card successfully");
    }

    @Override
    public ApiRes getCardsByTag(UUID shelfId, UUID subjectId, UUID tagId) {
        User currentUser = userService.getCurrentUser();
        ShelfEntity shelf =
                shelfRepository
                        .findByIdAndUser(shelfId, currentUser)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Shelve not found with id: " + shelfId));
        SubjectEntity subject =
                subjectRepository
                        .findByIdAndShelve(subjectId, shelf)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Subject not found with id: " + subjectId));

        TagEntity tag =
                tagRepository
                        .findByIdAndUser(tagId, currentUser)
                        .orElseThrow(
                                () -> new NotFoundException("Tag not found with id: " + tagId));

        List<CardEntity> allCards =
                cardRepository
                        .findAllBySubject(subject, PageRequest.of(0, Integer.MAX_VALUE))
                        .getContent();

        List<CardRes> result =
                allCards.stream()
                        .filter(
                                c ->
                                        c.getTags() != null
                                                && c.getTags().stream()
                                                        .anyMatch(
                                                                t -> t.getId().equals(tag.getId())))
                        .map(this::toCardRes)
                        .collect(Collectors.toList());

        return ApiRes.success("Cards fetched successfully", result);
    }

    private CardEntity findCard(UUID shelfId, UUID subjectId, UUID cardId, User currentUser) {
        ShelfEntity shelf =
                shelfRepository
                        .findByIdAndUser(shelfId, currentUser)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Shelve not found with id: " + shelfId));
        SubjectEntity subject =
                subjectRepository
                        .findByIdAndShelve(subjectId, shelf)
                        .orElseThrow(
                                () ->
                                        new NotFoundException(
                                                "Subject not found with id: " + subjectId));
        return cardRepository
                .findByIdAndSubject(cardId, subject)
                .orElseThrow(() -> new NotFoundException("Card not found with id: " + cardId));
    }

    private CardRes toCardRes(CardEntity entity) {
        return new CardRes(
                entity.getId(),
                entity.getFront(),
                entity.getBack(),
                entity.getDifficultyLevel(),
                entity.getNextPracticeTime(),
                entity.getNumberOfPractice(),
                entity.getFsrsStability(),
                entity.getFsrsDifficulty(),
                entity.getFsrsIntervalDays(),
                entity.getFsrsRepetitions());
    }
}
