import axios, { AxiosError } from 'axios';
import { useAuthStore, useUserProfileStore } from '@/store';
import {
    ApiResponse,
    Shelf,
    Subject,
    Card,
    TestSuite,
    UserProfile,
    UserSettings,
    StatsData,
    LeaderboardUser,
    Community,
    CommunityMember,
    CommunityJoinRequest,
    Grade,
    PaginatedResponse,
    Question,
    QuestionInput,
    StudySessionInput,
    StudySessionRes,
    TestAttempt,
    TestSubmission,
    TestSubmissionRes,
    TestSuiteInput,
} from '../types';
import { offlineDb } from './offlineDb';
import { syncManager } from './syncManager';
import { ulid } from 'ulid';
import slugify from 'slugify';
import { CardRes, mapCardList, mapCardRes } from '@/utils/cardMapper';

export const GRADE_LEVELS: Record<Grade, 'AGAIN' | 'HARD' | 'GOOD' | 'EASY'> = {
    1: 'AGAIN',
    2: 'HARD',
    3: 'GOOD',
    4: 'EASY',
};

export interface GradeResult {
    card: Card | null;
    xpGained: number;
    totalXp: number;
}

/**
 * Shared axios instance.
 *
 * Base URL is read from NEXT_PUBLIC_API_URL. When the variable is not set,
 * requests fall back to same-origin relative paths (e.g. the Next.js dev
 * server or an integrated backend).
 */
export const apiClient = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || undefined,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach the access token (when authenticated) to every outgoing request.
apiClient.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const { accessToken } = useAuthStore.getState();
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
    }

    config.headers['X-Request-ID'] = ulid();
    config.headers['X-Platform'] = 'WEB';
    return config;
});

// Normalize failures so callers always receive a consistent, readable error.
apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiResponse<unknown>>) => {
        if (error.response) {
            // The server answered with a non-2xx status — prefer the API's own message.
            const message =
                error.response.data?.message ||
                `Request failed with status ${error.response.status}`;
            return Promise.reject(new Error(message));
        }
        if (error.request) {
            // The request was sent but no response arrived (offline / network failure).
            return Promise.reject(new Error('Network error occurred'));
        }
        return Promise.reject(new Error(error.message || 'Request failed'));
    }
);

async function fetchJson<T>(
    url: string,
    options?: RequestInit
): Promise<ApiResponse<T>> {
    try {
        const res = await apiClient.request<ApiResponse<T>>({
            url,
            method: (options?.method ?? 'GET') as
                'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
            data:
                typeof options?.body === 'string'
                    ? JSON.parse(options.body)
                    : undefined,
            headers: options?.headers as Record<string, string> | undefined,
        });
        return res.data;
    } catch (error: any) {
        return {
            isSuccess: false,
            statusCode: 200,
            message: error?.message || 'Network error occurred',
            data: null,
            timestamp: new Date().toISOString(),
        };
    }
}

function isOfflineOrNetworkFailure(res: ApiResponse<any>): boolean {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
    // if (!res.isSuccess && (res.message?.includes('Network') || res.message?.includes('Failed to fetch') || res.message?.includes('Offline'))) {
    //   return true;
    // }
    return false;
}

export const ApiService = {
    // Backend heartbeat: GET /v1/ping → ApiRes.ok("pong")
    healthCheck: async (): Promise<ApiResponse<null>> => {
        try {
            const res = await apiClient.request<ApiResponse<null>>({
                url: '/v1/ping',
                method: 'GET',
                timeout: 3000,
            });
            return res.data;
        } catch (error: any) {
            return {
                isSuccess: false,
                statusCode: 200,    
                message: error?.message || 'Network error occurred',
                data: null,
                timestamp: new Date().toISOString(),
            };
        }
    },
    // Auth
    sendOtp: (email: string) =>
        fetchJson<null>(`/v1/otp?email=${email}`, {
            method: 'POST',
        }),

    verifyOtp: (email: string, otp: string, name: string) =>
        fetchJson<{
            access_token: string;
            refresh_token: string;
            type: string;
        }>('/v1/otp/validate', {
            method: 'POST',
            body: JSON.stringify({ email, otp, name }),
        }),

    // User Profile
    getProfile: async (): Promise<ApiResponse<UserProfile>> => {
        const res = await fetchJson<UserProfile>('/v1/user-profiles');
        if (res.isSuccess && res.data) {
            await offlineDb.setMetadata('user_profile', res.data);
            return res;
        }

        if (isOfflineOrNetworkFailure(res)) {
            const cached =
                await offlineDb.getMetadata<UserProfile>('user_profile');
            if (cached) {
                return {
                    statusCode: 200,
                    isSuccess: true,
                    message: 'Loaded cached profile (offline)',
                    data: cached,
                    timestamp: new Date().toISOString(),
                };
            }
        }
        return res;
    },

    updateNewComer: () => {
        fetchJson<void>('/v1/user-profiles/settings/newcomer', {
            method: 'PATCH',
        });
    },

    updateProfile: (profile: Partial<UserProfile>) =>
        fetchJson<UserProfile>('/v1/user-profiles', {
            method: 'PATCH',
            body: JSON.stringify(profile),
        }),

    updateSettings: (settings: Partial<UserSettings>) =>
        fetchJson<UserSettings>('/v1/user-settings', {
            method: 'PATCH',
            body: JSON.stringify(settings),
        }),

    // Shelves
    getShelves: async (page: number, size: number): Promise<ApiResponse<PaginatedResponse<Shelf>>> => {
        const res = await fetchJson<PaginatedResponse<Shelf>>(`/v1/shelves?page=${page}&size=${size}`);
        if (res.isSuccess && res.data) {
            await offlineDb.cacheShelves(res.data.entities);
            return res;
        }

        if (isOfflineOrNetworkFailure(res)) {
            const cached = await offlineDb.getCachedShelves();
            if (cached && cached.length > 0) {
                return {
                    isSuccess: true,
                    message: 'Loaded cached shelves (offline)',
                    statusCode: 200,
                    data: {
                        entities: cached,
                        currentPage: page,
                        totalItems: cached.length,
                        totalPages: Math.ceil(cached.length / size),
                        hasNextPage: cached.length / size > page,
                    },
                    timestamp: new Date().toISOString(),
                };
            }
        }
        return res;
    },

    createShelf: (data: {
        name: string;
        description: string;
        icon: string;
        color: string;
    }) => {
        const payload = {...data, slug: slugify(data.name, {lower: true, strict: true})};
        return fetchJson<Shelf>('/v1/shelves', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },
        

    updateShelf: (id: string, data: Partial<Shelf>) =>
        fetchJson<Shelf>(`/v1/shelves/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    deleteShelf: (id: string) =>
        fetchJson<Shelf>(`/v1/shelves/${id}/delete`, {
            method: 'PATCH',
        }),

    // Subjects
    getShelfSubjects: async (
        shelfId: string,
        page: number = 1,
        size: number = 10
    ): Promise<ApiResponse<PaginatedResponse<Subject>>> => {
        const res = await fetchJson<PaginatedResponse<Subject>>(
            `/v1/shelves/${shelfId}/subjects?page=${page}&size=${size}`
        );
        if (res.isSuccess && res.data) {
            await offlineDb.cacheSubjects(res.data.entities);
            return res;
        }

        if (isOfflineOrNetworkFailure(res)) {
            const cached = await offlineDb.getCachedSubjects(shelfId);
            if (cached && cached.length > 0) {
                return {
                    isSuccess: true,
                    statusCode: 200,
                    message: 'Loaded cached subjects (offline)',
                    data: {
                        entities: cached,
                        currentPage: 1,
                        totalItems: cached.length,
                        totalPages: 1,
                        hasNextPage: false,
                    },
                    timestamp: new Date().toISOString(),
                };
            }
        }
        return res;
    },

    getSubject: async (
        id: string
    ): Promise<
        ApiResponse<Subject & { cards: Card[]; testSuites: TestSuite[] }>
    > => {
        const res = await fetchJson<
            Subject & { cards: Card[]; testSuites: TestSuite[] }
        >(`/api/subjects/${id}`);
        if (res.isSuccess && res.data) {
            if (res.data.cards) {
                await offlineDb.cacheCards(res.data.cards);
            }
            await offlineDb.cacheSubjects([res.data]);
            return res;
        }

        if (isOfflineOrNetworkFailure(res)) {
            const cachedSubject = await offlineDb.getCachedSubjectById(id);
            const cachedCards = await offlineDb.getCachedCardsBySubject(id);

            if (cachedSubject) {
                const now = new Date();
                const dueCount = cachedCards.filter(
                    (c) => new Date(c.dueDate) <= now
                ).length;
                return {
                    isSuccess: true,
                    statusCode: 200,
                    message: 'Loaded cached subject details (offline)',
                    data: {
                        ...cachedSubject,
                        cardCount: cachedCards.length,
                        dueCount,
                        cards: cachedCards,
                        testSuites: [],
                    },
                    timestamp: new Date().toISOString(),
                };
            }
        }
        return res;
    },

    createSubject: (
        shelfId: string,
        data: {
            name: string;
            description: string;
            color: string;
            tags: string;
            isPublic: boolean;
        }
    ) =>{
        const payload = { ...data, slug: slugify(data.name, { lower: true, strict: true }) };
        return fetchJson<Subject>(`/v1/shelves/${shelfId}/subjects`, {
            method: 'POST',
            body: JSON.stringify(payload),
        });
    },

    updateSubject: (id: string, data: Partial<Subject>) =>
        fetchJson<Subject>(`/api/subjects/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    deleteSubject: (id: string) =>
        fetchJson<Subject>(`/api/subjects/${id}/delete`, {
            method: 'PATCH',
        }),

    // Cards
    getSubjectCards: async (
        shelfId: string,
        subjectId: string
    ): Promise<ApiResponse<PaginatedResponse<Card>>> => {
        const res = await fetchJson<PaginatedResponse<Card>>(
            `/v1/shelves/${shelfId}/subjects/${subjectId}/cards?page=1&size=1000`
        );
        if (res.isSuccess && res.data) {
            const entities = mapCardList(res.data.entities, subjectId);
            await offlineDb.cacheCards(entities);
            return { ...res, data: { ...res.data, entities } };
        }

        if (isOfflineOrNetworkFailure(res)) {
            const cached = await offlineDb.getCachedCardsBySubject(subjectId);
            if (cached && cached.length > 0) {
                return {
                    isSuccess: true,
                    statusCode: 200,
                    message: 'Loaded cached cards (offline)',
                    data: {
                        entities: cached,
                        currentPage: 1,
                        totalItems: cached.length,
                        totalPages: 1,
                        hasNextPage: false,
                    },
                    timestamp: new Date().toISOString(),
                };
            }
        }
        return res;
    },

    getDueCards: async (
        shelfId: string,
        subjectId: string,
        limit = 20,
        newLimit?: number
    ): Promise<ApiResponse<Card[]>> => {
        const query = new URLSearchParams({ limit: String(limit) });
        if (newLimit !== undefined) query.set('newLimit', String(newLimit));
        const res = await fetchJson<Card[]>(
            `/v1/shelves/${shelfId}/subjects/${subjectId}/cards/due?${query.toString()}`
        );
        if (res.isSuccess && res.data) {
            const cards = mapCardList(res.data, subjectId);
            await offlineDb.cacheCards(cards);
            return { ...res, data: cards };
        }

        if (isOfflineOrNetworkFailure(res)) {
            const cachedDue =
                await offlineDb.getCachedDueCardsBySubject(subjectId);
            return {
                isSuccess: true,
                statusCode: 200, 
                message: 'Loaded cached due cards (offline)',
                data: cachedDue,
                timestamp: new Date().toISOString(),
            };
        }
        return res;
    },

    createCards: async (
        shelfId: string,
        subjectId: string,
        cards: Array<{
            front: string;
            back: string;
            hint: string;
        }>
    ): Promise<ApiResponse<string>> => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            const result = await offlineDb.saveOfflineBatchCards(
                subjectId,
                cards
            );
            await syncManager.requestBackgroundSync();
            await syncManager.refreshPendingCount();
            return {
                isSuccess: true,
                statusCode: 200,
                message: `Imported ${result.importedCount} cards offline (will sync when online)`,
                data: "Successfully created cards offline",
                timestamp: new Date().toISOString(),
            };
        }

        const res = await fetchJson<string>(
            `/v1/shelves/${shelfId}/subjects/${subjectId}/cards`,
            {
                method: 'POST',
                body: JSON.stringify({ cards }),
            }
        );

        if (res.isSuccess && res.data) {
            return res;
        }

        if (isOfflineOrNetworkFailure(res)) {  
            const result = await offlineDb.saveOfflineBatchCards(
                subjectId,
                cards
            );
            await syncManager.requestBackgroundSync();
            await syncManager.refreshPendingCount();
            return {
                isSuccess: true,
                statusCode: 200,
                message: `Imported ${result.importedCount} cards offline (will sync when online)`,
                data: "Successfully created cards offline",
                timestamp: new Date().toISOString(),
            };
        }

        return res;
    },

    updateCard: async (
        id: string,
        data: Partial<Card>
    ): Promise<ApiResponse<Card>> => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            const updated = await offlineDb.saveOfflineCardUpdate(id, data);
            await syncManager.requestBackgroundSync();
            await syncManager.refreshPendingCount();
            return {
                isSuccess: true,
                statusCode: 200,
                message: 'Card updated offline (will sync when online)',
                data: updated as Card,
                timestamp: new Date().toISOString(),
            };
        }

        const res = await fetchJson<Card>(`/api/cards/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });

        if (res.isSuccess && res.data) {
            await offlineDb.cacheCards([res.data]);
            return res;
        }

        if (isOfflineOrNetworkFailure(res)) {
            const updated = await offlineDb.saveOfflineCardUpdate(id, data);
            await syncManager.requestBackgroundSync();
            await syncManager.refreshPendingCount();
            return {
                isSuccess: true,
                statusCode: 200,
                message: 'Card updated offline',
                data: updated as Card,
                timestamp: new Date().toISOString(),
            };
        }

        return res;
    },

    gradeCard: async (
        shelfId: string,
        subjectId: string,
        id: string,
        grade: Grade
    ): Promise<ApiResponse<GradeResult>> => {
        const context = { shelfId, subjectId };
        // If offline, calculate FSRS review schedule locally and queue for sync
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            const localResult = await offlineDb.saveOfflineCardReview(
                id,
                grade,
                context
            );
            await syncManager.requestBackgroundSync();
            await syncManager.refreshPendingCount();
            return {
                isSuccess: true,
                statusCode: 200,
                message: 'Review saved offline (FSRS scheduled locally)',
                data: localResult,
                timestamp: new Date().toISOString(),
            };
        }

        const res = await fetchJson<{
            cards: CardRes[];
            xpGained: number;
            totalXp: number;
        }>(`/v1/shelves/${shelfId}/subjects/${subjectId}/cards/difficulty`, {
            method: 'PUT',
            body: JSON.stringify([{ cardId: id, newLevel: GRADE_LEVELS[grade] }]),
        });

        if (res.isSuccess && res.data) {
            const card = res.data.cards?.[0]
                ? mapCardRes(res.data.cards[0], subjectId)
                : null;
            if (card) await offlineDb.cacheCards([card]);
            return {
                ...res,
                data: {
                    card,
                    xpGained: res.data.xpGained,
                    totalXp: res.data.totalXp,
                },
            };
        }

        // Network failure fallback during review
        if (isOfflineOrNetworkFailure(res)) {
            const localResult = await offlineDb.saveOfflineCardReview(
                id,
                grade,
                context
            );
            await syncManager.requestBackgroundSync();
            await syncManager.refreshPendingCount();
            return {
                isSuccess: true,
                statusCode: 200,
                message: 'Review saved offline (will sync when online)',
                data: localResult,
                timestamp: new Date().toISOString(),
            };
        }

        return { ...res, data: null };
    },

    deleteCard: async (id: string): Promise<ApiResponse<Card>> => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            await offlineDb.saveOfflineCardDelete(id);
            await syncManager.requestBackgroundSync();
            await syncManager.refreshPendingCount();
            return {
                isSuccess: true,
                statusCode: 200,
                message: 'Card deleted offline (will sync when online)',
                data: null,
                timestamp: new Date().toISOString(),
            };
        }

        const res = await fetchJson<Card>(`/api/cards/${id}/delete`, {
            method: 'PATCH',
        });

        if (res.isSuccess) {
            await offlineDb.saveOfflineCardDelete(id);
            return res;
        }

        if (isOfflineOrNetworkFailure(res)) {
            await offlineDb.saveOfflineCardDelete(id);
            await syncManager.requestBackgroundSync();
            await syncManager.refreshPendingCount();
            return {
                isSuccess: true,
                statusCode: 200,
                message: 'Card deleted offline',
                data: null,
                timestamp: new Date().toISOString(),
            };
        }

        return res;
    },

    // Discover & Clone
    getDiscoverCatalog: () =>
        fetchJson<(Subject & { cardsPreview: Partial<Card>[] })[]>(
            '/api/discover'
        ),

    cloneSubject: (subjectId: string, targetShelfId: string) =>
        fetchJson<Subject>(`/api/discover/clone/${subjectId}`, {
            method: 'POST',
            body: JSON.stringify({ targetShelfId }),
        }),

    // Study sessions (Learn / Match XP)
    logStudySession: (
        shelfId: string,
        subjectId: string,
        session: StudySessionInput
    ) =>
        fetchJson<StudySessionRes>(
            `/v1/shelves/${shelfId}/subjects/${subjectId}/study-sessions`,
            {
                method: 'POST',
                body: JSON.stringify(session),
            }
        ),

    // Test Suites (shelf level)
    getTestSuites: (shelfId: string) =>
        fetchJson<TestSuite[]>(`/v1/shelves/${shelfId}/test-suites`),

    createTestSuite: (shelfId: string, data: TestSuiteInput) =>
        fetchJson<TestSuite>(`/v1/shelves/${shelfId}/test-suites`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateTestSuite: (shelfId: string, id: string, data: TestSuiteInput) =>
        fetchJson<TestSuite>(`/v1/shelves/${shelfId}/test-suites/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteTestSuite: (shelfId: string, id: string) =>
        fetchJson<null>(`/v1/shelves/${shelfId}/test-suites/${id}`, {
            method: 'PATCH',
        }),

    getTestAttempt: (shelfId: string, id: string) =>
        fetchJson<TestAttempt>(`/v1/shelves/${shelfId}/test-suites/${id}/attempt`),

    submitTestSuite: (shelfId: string, id: string, submission: TestSubmission) =>
        fetchJson<TestSubmissionRes>(
            `/v1/shelves/${shelfId}/test-suites/${id}/submit`,
            {
                method: 'POST',
                body: JSON.stringify(submission),
            }
        ),

    // Questions inside a test suite
    getQuestions: (shelfId: string, testSuiteId: string) =>
        fetchJson<Question[]>(
            `/v1/shelves/${shelfId}/test-suites/${testSuiteId}/questions`
        ),

    createQuestion: (shelfId: string, testSuiteId: string, data: QuestionInput) =>
        fetchJson<Question>(
            `/v1/shelves/${shelfId}/test-suites/${testSuiteId}/questions`,
            {
                method: 'POST',
                body: JSON.stringify(data),
            }
        ),

    updateQuestion: (
        shelfId: string,
        testSuiteId: string,
        id: string,
        data: QuestionInput
    ) =>
        fetchJson<Question>(
            `/v1/shelves/${shelfId}/test-suites/${testSuiteId}/questions/${id}`,
            {
                method: 'PUT',
                body: JSON.stringify(data),
            }
        ),

    deleteQuestion: (shelfId: string, testSuiteId: string, id: string) =>
        fetchJson<null>(
            `/v1/shelves/${shelfId}/test-suites/${testSuiteId}/questions/${id}`,
            {
                method: 'PATCH',
            }
        ),

    // Stats & Leaderboard
    getStats: () => fetchJson<StatsData>('/v1/users/me/stats'),

    getLeaderboard: () => fetchJson<LeaderboardUser[]>('/api/leaderboard'),

    // Communities
    getCommunities: () => fetchJson<Community[]>('/api/communities'),

    getMyCommunities: () => fetchJson<Community[]>('/api/communities/my'),

    createCommunity: (data: {
        name: string;
        description?: string;
        icon?: string;
        color?: string;
        isPrivate?: boolean;
        tags?: string[];
    }) =>
        fetchJson<Community>('/api/communities', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    joinCommunity: (id: string, message?: string) =>
        fetchJson<{
            status: 'JOINED' | 'REQUEST_SENT';
            member?: CommunityMember;
            request?: CommunityJoinRequest;
        }>(`/api/communities/${id}/join`, {
            method: 'POST',
            body: JSON.stringify({ message }),
        }),

    leaveCommunity: (id: string) =>
        fetchJson<{ left: boolean }>(`/api/communities/${id}/leave`, {
            method: 'POST',
        }),

    inviteUserToCommunity: (id: string, emailOrName: string) =>
        fetchJson<CommunityMember>(`/api/communities/${id}/invite`, {
            method: 'POST',
            body: JSON.stringify({ emailOrName }),
        }),

    getCommunityJoinRequests: (id: string) =>
        fetchJson<CommunityJoinRequest[]>(`/api/communities/${id}/requests`),

    approveJoinRequest: (id: string, requestId: string) =>
        fetchJson<CommunityMember>(
            `/api/communities/${id}/requests/${requestId}/approve`,
            {
                method: 'POST',
            }
        ),

    rejectJoinRequest: (id: string, requestId: string) =>
        fetchJson<{ rejected: boolean }>(
            `/api/communities/${id}/requests/${requestId}/reject`,
            {
                method: 'POST',
            }
        ),

    getCommunityLeaderboard: (id: string) =>
        fetchJson<{ community: Community; members: CommunityMember[] }>(
            `/api/communities/${id}/leaderboard`
        ),

    // AI Flashcard Generation
    generateCardsWithAI: (topic: string, notes?: string, count = 5) =>
        fetchJson<
            { front: string; back: string; hint: string; tags?: string[] }[]
        >('/api/generate-cards', {
            method: 'POST',
            body: JSON.stringify({ topic, notes, count }),
        }),
};
