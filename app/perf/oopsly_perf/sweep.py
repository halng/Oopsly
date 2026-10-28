"""One pass over every API endpoint, in an order where each step has the data it needs.

Each simulated user seeds its own library (shelf, subject, card, test, questions), exercises
every endpoint once, and soft-deletes what it created. Under load that mix is realistic enough
and, more importantly, every endpoint gets its own statistics row.
"""

from __future__ import annotations

from locust import SequentialTaskSet, task

from .api import Api

ID = "id"
# The list endpoints page from 1 (the OpenAPI text says 0, but page 0 is rejected).
PAGE = {"page": 1, "size": 10}


def _id(data) -> str | None:
    return data.get(ID) if isinstance(data, dict) else None


class ApiSweep(SequentialTaskSet):
    def on_start(self):
        self.api = Api(self.client)
        self.token = self.user.token
        self.other_token = self.user.other_token
        self.third_token = self.user.third_token
        self.shelf = self.subject = self.card = None
        self.suite = self.question = self.community = None
        self.public_subject = None
        self.join_request = None

    # ---------------------------------------------------------------- helpers

    def call(self, method, template, **kwargs):
        kwargs.setdefault("token", self.token)
        return self.api.call(method, template, **kwargs)

    @property
    def lib(self) -> dict:
        return {"shelfId": self.shelf, "shelveId": self.shelf, "subjectId": self.subject}

    # ------------------------------------------------------------------ health

    @task
    def ping(self):
        self.call("GET", "/v1/ping")

    # ------------------------------------------------------------------ shelves

    @task
    def create_shelf(self):
        data = self.call(
            "POST",
            "/v1/shelves",
            expect=(201,),
            json={
                "icon": "folder",
                "name": "Perf Shelf",
                "slug": f"perf-shelf-{self.user.suffix}",
                "color": "#FF5733",
                "description": "Created by the performance suite",
            },
        )
        self.shelf = _id(data)

    @task
    def list_shelves(self):
        self.call("GET", "/v1/shelves", params=PAGE)

    @task
    def get_shelf(self):
        if self.shelf:
            self.call("GET", "/v1/shelves/{shelfId}", path={"shelfId": self.shelf})

    @task
    def update_shelf(self):
        if self.shelf:
            self.call(
                "PUT",
                "/v1/shelves/{shelfId}",
                path={"shelfId": self.shelf},
                json={
                    "icon": "folder",
                    "name": "Perf Shelf v2",
                    "slug": f"perf-shelf-{self.user.suffix}",
                    "color": "#33AAFF",
                    "description": "Updated by the performance suite",
                },
            )

    # ----------------------------------------------------------------- subjects

    @task
    def create_subject(self):
        if not self.shelf:
            return
        data = self.call(
            "POST",
            "/v1/shelves/{shelfId}/subjects",
            path=self.lib,
            expect=(201,),
            json={
                "name": "Perf Subject",
                "description": "Subject for the performance suite",
                "tags": "perf,load",
                "isPublic": True,
                "color": "#33FF57",
                "slug": f"perf-subject-{self.user.suffix}",
            },
        )
        self.subject = _id(data)
        self.public_subject = self.subject

    @task
    def list_subjects(self):
        if self.shelf:
            self.call(
                "GET",
                "/v1/shelves/{shelfId}/subjects",
                path=self.lib,
                params=PAGE,
            )

    @task
    def get_subject(self):
        if self.subject:
            self.call("GET", "/v1/shelves/{shelfId}/subjects/{id}", path={**self.lib, "id": self.subject})

    @task
    def update_subject(self):
        if self.subject:
            self.call(
                "PUT",
                "/v1/shelves/{shelfId}/subjects/{id}",
                path={**self.lib, "id": self.subject},
                json={
                    "name": "Perf Subject v2",
                    "description": "Updated",
                    "tags": "perf",
                    "isPublic": True,
                    "color": "#33FF57",
                    "slug": f"perf-subject-{self.user.suffix}",
                },
            )

    @task
    def update_subject_settings(self):
        if self.subject:
            self.call(
                "PUT",
                "/v1/shelves/{shelfId}/subjects/{id}/settings",
                path={**self.lib, "id": self.subject},
                json={"dailyLimit": 30, "newCardsPerDay": 10, "interval": 1.5},
            )

    # -------------------------------------------------------------------- cards

    @task
    def create_cards(self):
        if not self.subject:
            return
        data = self.call(
            "POST",
            "/v1/shelves/{shelfId}/subjects/{subjectId}/cards",
            path=self.lib,
            json={
                "cards": [
                    {"front": "Capital of France?", "back": "Paris"},
                    {"front": "Capital of Japan?", "back": "Tokyo"},
                ]
            },
        )
        if isinstance(data, list) and data:
            self.card = _id(data[0])

    @task
    def list_cards(self):
        if self.subject:
            self.call(
                "GET",
                "/v1/shelves/{shelfId}/subjects/{subjectId}/cards",
                path=self.lib,
                params=PAGE,
            )

    @task
    def get_card(self):
        if self.card:
            self.call(
                "GET",
                "/v1/shelves/{shelfId}/subjects/{subjectId}/cards/{id}",
                path={**self.lib, "id": self.card},
            )

    @task
    def update_card(self):
        if self.card:
            self.call(
                "PUT",
                "/v1/shelves/{shelfId}/subjects/{subjectId}/cards/{id}",
                path={**self.lib, "id": self.card},
                json={"front": "Updated Q", "back": "Updated A"},
            )

    @task
    def due_cards_in_subject(self):
        if self.subject:
            self.call(
                "GET",
                "/v1/shelves/{shelfId}/subjects/{subjectId}/cards/due",
                path=self.lib,
                params={"limit": 10},
            )

    @task
    def due_cards_overall(self):
        self.call("GET", "/v1/cards/due")

    @task
    def grade_cards(self):
        if self.card:
            self.call(
                "PUT",
                "/v1/shelves/{shelfId}/subjects/{subjectId}/cards/difficulty",
                path=self.lib,
                json=[{"cardId": self.card, "newLevel": "GOOD"}],
            )

    @task
    def record_study_session(self):
        if self.subject:
            self.call(
                "POST",
                "/v1/shelves/{shelfId}/subjects/{subjectId}/study-sessions",
                path=self.lib,
                expect=(201,),
                json={
                    "mode": "LEARN",
                    "totalItems": 2,
                    "correctCount": 2,
                    "mistakes": 0,
                    "durationSeconds": 60,
                },
            )

    @task
    def generate_cards_with_ai(self):
        # With AI disabled the API answers with starter cards, which is still a full request.
        self.call(
            "POST",
            "/ai/generate-cards",
            json={"topic": "Photosynthesis", "notes": "Plants turn light into sugar", "count": 3},
        )

    # --------------------------------------------------------------------- tags

    @task
    def create_tag(self):
        self.call("POST", "/tags", expect=(201,), json={"name": f"perf-{self.user.suffix}-{next(self.user.counter)}"})

    @task
    def list_tags(self):
        self.call("GET", "/tags")

    # -------------------------------------------------------------- test suites

    @task
    def create_test_suite(self):
        if not self.shelf:
            return
        data = self.call(
            "POST",
            "/v1/shelves/{shelveId}/test-suites",
            path=self.lib,
            expect=(201,),
            json={"title": "Perf Test", "timeLimitMinutes": 10},
        )
        self.suite = _id(data)

    @task
    def create_question(self):
        if not self.suite:
            return
        data = self.call(
            "POST",
            "/v1/shelves/{shelveId}/test-suites/{testSuiteId}/questions",
            path={**self.lib, "testSuiteId": self.suite},
            expect=(201,),
            json={
                "text": "2+2=?",
                "type": "SINGLE_CHOICE",
                "options": ["3", "4"],
                "correctOptionIndex": 1,
            },
        )
        self.question = _id(data)

    @task
    def list_questions(self):
        if self.suite:
            self.call(
                "GET",
                "/v1/shelves/{shelveId}/test-suites/{testSuiteId}/questions",
                path={**self.lib, "testSuiteId": self.suite},
            )

    @task
    def get_question(self):
        if self.question:
            self.call(
                "GET",
                "/v1/shelves/{shelveId}/test-suites/{testSuiteId}/questions/{id}",
                path={**self.lib, "testSuiteId": self.suite, "id": self.question},
            )

    @task
    def update_question(self):
        if self.question:
            self.call(
                "PUT",
                "/v1/shelves/{shelveId}/test-suites/{testSuiteId}/questions/{id}",
                path={**self.lib, "testSuiteId": self.suite, "id": self.question},
                json={
                    "text": "3+3=?",
                    "type": "SINGLE_CHOICE",
                    "options": ["5", "6"],
                    "correctOptionIndex": 1,
                },
            )

    @task
    def list_test_suites(self):
        if self.shelf:
            self.call("GET", "/v1/shelves/{shelveId}/test-suites", path=self.lib)

    @task
    def get_test_suite(self):
        if self.suite:
            self.call(
                "GET",
                "/v1/shelves/{shelveId}/test-suites/{id}",
                path={**self.lib, "id": self.suite},
            )

    @task
    def update_test_suite(self):
        if self.suite:
            self.call(
                "PUT",
                "/v1/shelves/{shelveId}/test-suites/{id}",
                path={**self.lib, "id": self.suite},
                json={"title": "Perf Test v2", "isActive": True},
            )

    @task
    def attempt_test_suite(self):
        if self.suite:
            self.call(
                "GET",
                "/v1/shelves/{shelveId}/test-suites/{id}/attempt",
                path={**self.lib, "id": self.suite},
            )

    @task
    def submit_test_suite(self):
        if self.suite and self.question:
            self.call(
                "POST",
                "/v1/shelves/{shelveId}/test-suites/{id}/submit",
                path={**self.lib, "id": self.suite},
                json={
                    "answers": {self.question: 1},
                    "multiAnswers": {},
                    "textAnswers": {},
                    "timeSpentSeconds": 30,
                },
            )

    @task
    def run_test_suite(self):
        if self.suite:
            self.call(
                "POST",
                "/v1/shelves/{shelveId}/test-suites/{id}/run",
                path={**self.lib, "id": self.suite},
            )

    @task
    def auto_generate_test_suite(self):
        if self.subject:
            self.call(
                "POST",
                "/v1/shelves/{shelveId}/test-suites/auto-generate",
                path=self.lib,
                expect=(201,),
                params={"subjectId": self.subject},
            )

    @task
    def test_suite_cards(self):
        if self.suite:
            self.call("GET", "/test-suites/{testSuiteId}/cards", path={"testSuiteId": self.suite})

    # ------------------------------------------------------------ live quiz room

    @task
    def host_live_quiz(self):
        if self.suite and self.question:
            self.call(
                "POST",
                "/v1/quiz/rooms",
                expect=(201,),
                json={
                    "shelfId": self.shelf,
                    "testSuiteId": self.suite,
                    "mode": "AUTO",
                    "questionSeconds": 20,
                },
            )

    # ----------------------------------------------------------------- discover

    @task
    def discover_search(self):
        self.call("GET", "/discover", params={"q": "perf", "page": 0, "size": 20})

    @task
    def discover_clone(self):
        # Cloning needs somebody else's public subject, so a second user clones this one.
        if self.public_subject:
            # The API clones into the caller's first shelf, so the cloner needs one.
            self.call(
                "POST",
                "/v1/shelves",
                token=self.other_token,
                expect=(201,),
                json={
                    "icon": "folder",
                    "name": "Clone target",
                    "slug": f"perf-clone-{self.user.suffix}-{next(self.user.counter)}",
                    "color": "#112233",
                    "description": "Where cloned decks land",
                },
            )
            self.call(
                "POST",
                "/discover/{subjectId}/clone",
                path={"subjectId": self.public_subject},
                token=self.other_token,
                expect=(200, 201),
            )

    # -------------------------------------------------------------------- stats

    @task
    def my_stats(self):
        self.call("GET", "/v1/users/me/stats")

    @task
    def leaderboard(self):
        self.call("GET", "/leaderboard", params={"limit": 50})

    # ------------------------------------------------------------------- garden

    @task
    def garden_state(self):
        self.call("GET", "/garden")

    @task
    def complete_pomodoro(self):
        self.call(
            "POST",
            "/garden/pomodoro/complete",
            json={
                "focusDurationMinutes": 25,
                "breakDurationMinutes": 5,
                "mode": "FOCUS",
                "soundscape": "NONE",
            },
        )

    @task
    def unlock_plot(self):
        # A fresh garden may not afford the plot yet; the API answers 400 and that is expected.
        self.call("POST", "/garden/plots/unlock", expect=(200, 400), json={"plotIndex": 3})

    @task
    def plant_seed(self):
        self.call(
            "POST",
            "/garden/plants",
            expect=(200, 201, 400),
            json={"species": "CAMPHOR_TREE", "plotIndex": 0},
        )

    @task
    def water_tree(self):
        garden = self.call("GET", "/garden")
        trees = (garden or {}).get("plantedTrees") or []
        if trees:
            self.call("POST", "/garden/plants/water", expect=(200, 400), json={"treeId": trees[0]["id"]})

    # -------------------------------------------------------------- communities

    @task
    def create_community(self):
        data = self.call(
            "POST",
            "/communities",
            expect=(200, 201),
            json={
                "name": f"Perf Club {self.user.suffix}",
                "description": "Created by the performance suite",
                "isPrivate": True,
                "tags": ["perf"],
            },
        )
        self.community = _id(data)

    @task
    def list_communities(self):
        self.call("GET", "/communities")

    @task
    def my_communities(self):
        self.call("GET", "/communities/my")

    @task
    def join_community(self):
        if self.community:
            self.call(
                "POST",
                "/communities/{id}/join",
                path={"id": self.community},
                token=self.other_token,
                expect=(200, 201),
                json={"message": "Let me in"},
            )
            self.call(
                "POST",
                "/communities/{id}/join",
                path={"id": self.community},
                token=self.third_token,
                expect=(200, 201),
                json={"message": "Me too"},
            )

    @task
    def community_requests(self):
        if self.community:
            data = self.call("GET", "/communities/{id}/requests", path={"id": self.community})
            if isinstance(data, list):
                self.join_request = [r.get("id") for r in data if r.get("id")]

    @task
    def approve_request(self):
        if self.community and self.join_request:
            self.call(
                "POST",
                "/communities/{id}/requests/{requestId}/approve",
                path={"id": self.community, "requestId": self.join_request[0]},
            )

    @task
    def reject_request(self):
        if self.community and len(self.join_request or []) > 1:
            self.call(
                "POST",
                "/communities/{id}/requests/{requestId}/reject",
                path={"id": self.community, "requestId": self.join_request[1]},
            )

    @task
    def community_leaderboard(self):
        if self.community:
            self.call("GET", "/communities/{id}/leaderboard", path={"id": self.community})

    @task
    def leave_community(self):
        if self.community:
            self.call(
                "POST",
                "/communities/{id}/leave",
                path={"id": self.community},
                token=self.other_token,
                expect=(200, 400),
            )

    # ----------------------------------------------------------------- clean up

    @task
    def delete_question(self):
        if self.question:
            self.call(
                "PATCH",
                "/v1/shelves/{shelveId}/test-suites/{testSuiteId}/questions/{id}",
                path={**self.lib, "testSuiteId": self.suite, "id": self.question},
            )

    @task
    def delete_test_suite(self):
        if self.suite:
            self.call(
                "PATCH",
                "/v1/shelves/{shelveId}/test-suites/{id}",
                path={**self.lib, "id": self.suite},
            )

    @task
    def delete_card(self):
        if self.card:
            self.call(
                "PATCH",
                "/v1/shelves/{shelfId}/subjects/{subjectId}/cards/{id}",
                path={**self.lib, "id": self.card},
            )

    @task
    def delete_subject(self):
        if self.subject:
            self.call(
                "PATCH",
                "/v1/shelves/{shelfId}/subjects/{id}",
                path={**self.lib, "id": self.subject},
            )

    @task
    def delete_shelf(self):
        if self.shelf:
            self.call("PATCH", "/v1/shelves/{shelfId}", path={"shelfId": self.shelf})
