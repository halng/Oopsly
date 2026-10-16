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

package com.app.oopsly.api.card;

import com.app.oopsly.api.shelf.Shelf;
import com.app.oopsly.api.shelf.ShelfCount;
import com.app.oopsly.api.subject.Subject;
import com.app.oopsly.api.subject.SubjectCount;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface CardRepository extends JpaRepository<Card, UUID> {
    @Query("SELECT c FROM cards c WHERE c.id = ?1 AND c.subject = ?2 AND c.deleted = false")
    Optional<Card> findByIdAndSubject(UUID id, Subject subject);

    @Query("SELECT c FROM cards c WHERE c.subject = ?1 AND c.deleted = false")
    Page<Card> findAllBySubject(Subject subject, Pageable pageable);

    long countBySubjectAndDeletedFalse(Subject subject);

    @Query(
            "SELECT COUNT(c) FROM cards c WHERE c.subject = ?1 AND c.nextPracticeTime <"
                    + " CURRENT_DATE AND c.deleted = false")
    long countOverdue(Subject subject);

    @Query("SELECT c FROM cards c WHERE c.subject IN :subjects AND c.deleted = false")
    List<Card> findAllBySubjectInAndDeletedFalse(@Param("subjects") List<Subject> subjects);

    @Query(
            "SELECT c FROM cards c WHERE c.subject IN :subjects AND c.deleted = false AND "
                    + "c.nextPracticeTime <= :now")
    List<Card> findDueBySubjects(
            @Param("subjects") List<Subject> subjects, @Param("now") Instant now);

    @Query(
            "SELECT c FROM cards c WHERE c.subject = :subject AND c.deleted = false AND"
                    + " c.nextPracticeTime <= :now")
    Page<Card> findDueBySubjectAndLimit(
            @Param("subject") Subject subject, @Param("now") Instant now, Pageable pageable);

    @Query(
            "SELECT c FROM cards c WHERE c.subject = :subject AND c.deleted = false AND"
                    + " c.lastReviewedAt IS NOT NULL AND c.nextPracticeTime <= :now"
                    + " ORDER BY c.nextPracticeTime ASC")
    Page<Card> findDueReviewCards(
            @Param("subject") Subject subject, @Param("now") Instant now, Pageable pageable);

    @Query(
            "SELECT c FROM cards c WHERE c.subject = :subject AND c.deleted = false AND"
                    + " c.lastReviewedAt IS NULL ORDER BY c.createdAt ASC")
    Page<Card> findNewCards(@Param("subject") Subject subject, Pageable pageable);

    @Query(
            "SELECT COUNT(c) FROM cards c WHERE c.subject = :subject AND c.deleted = false"
                    + " AND c.lastReviewedAt >= :startOfDay AND c.lastReviewedAt < :endOfDay")
    long countReviewedToday(
            @Param("subject") Subject subject,
            @Param("startOfDay") Instant startOfDay,
            @Param("endOfDay") Instant endOfDay);

    @Query(
            "SELECT new com.app.oopsly.api.shelf.ShelfCount(c.subject.shelf.id, COUNT(c))"
                    + " FROM cards c WHERE c.subject.shelf IN :shelves AND c.deleted = false"
                    + " AND c.subject.deleted = false GROUP BY c.subject.shelf.id")
    List<ShelfCount> countByShelves(@Param("shelves") List<Shelf> shelves);

    @Query(
            "SELECT new com.app.oopsly.api.shelf.ShelfCount(c.subject.shelf.id, COUNT(c))"
                    + " FROM cards c WHERE c.subject.shelf IN :shelves AND c.deleted = false"
                    + " AND c.subject.deleted = false AND c.nextPracticeTime < CURRENT_DATE"
                    + " GROUP BY c.subject.shelf.id")
    List<ShelfCount> countDueByShelves(@Param("shelves") List<Shelf> shelves);

    @Query(
            "SELECT new com.app.oopsly.api.subject.SubjectCount(c.subject.id, COUNT(c))"
                    + " FROM cards c WHERE c.subject IN :subjects AND c.deleted = false"
                    + " GROUP BY c.subject.id")
    List<SubjectCount> countBySubjects(@Param("subjects") List<Subject> subjects);

    @Query(
            "SELECT new com.app.oopsly.api.subject.SubjectCount(c.subject.id, COUNT(c))"
                    + " FROM cards c WHERE c.subject IN :subjects AND c.deleted = false"
                    + " AND c.nextPracticeTime < CURRENT_DATE GROUP BY c.subject.id")
    List<SubjectCount> countDueBySubjects(@Param("subjects") List<Subject> subjects);
}
