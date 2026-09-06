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
} from '../types';
import { offlineDb, OfflineCard } from './offlineDb';
import { syncManager } from './syncManager';
import { ulid } from 'ulid';

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
    // health check
    healthCheck: async () => {
        const res = await apiClient.request<{ status: string }>({
            url: '/v1/ping',
            method: 'GET',
        });
        return res.data;
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
        const res = await fetchJson<UserProfile>('/api/user/profile');
        if (res.isSuccess && res.data) {
            await offlineDb.setMetadata('user_profile', res.data);
            return res;
        }

        if (isOfflineOrNetworkFailure(res)) {
            const cached =
                await offlineDb.getMetadata<UserProfile>('user_profile');
            if (cached) {
                return {
                    isSuccess: true,
                    message: 'Loaded cached profile (offline)',
                    data: cached,
                    timestamp: new Date().toISOString(),
                };
            }
        }
        return res;
    },

    updateProfile: (profile: Partial<UserProfile>) =>
        fetchJson<UserProfile>('/api/user/profile', {
            method: 'PATCH',
            body: JSON.stringify(profile),
        }),

    updateSettings: (settings: Partial<UserSettings>) =>
        fetchJson<UserSettings>('/api/user/settings', {
            method: 'PATCH',
            body: JSON.stringify(settings),
        }),

    // Shelves
    getShelves: async (): Promise<ApiResponse<Shelf[]>> => {
        const res = await fetchJson<Shelf[]>('/api/shelves');
        if (res.isSuccess && res.data) {
            await offlineDb.cacheShelves(res.data);
            return res;
        }

        if (isOfflineOrNetworkFailure(res)) {
            const cached = await offlineDb.getCachedShelves();
            if (cached && cached.length > 0) {
                return {
                    isSuccess: true,
                    message: 'Loaded cached shelves (offline)',
                    data: cached,
                    timestamp: new Date().toISOString(),
                };
            }
        }
        return res;
    },

    createShelf: (data: {
        name: string;
        description?: string;
        icon?: string;
        color?: string;
    }) =>
        fetchJson<Shelf>('/api/shelves', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateShelf: (id: string, data: Partial<Shelf>) =>
        fetchJson<Shelf>(`/api/shelves/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    deleteShelf: (id: string) =>
        fetchJson<Shelf>(`/api/shelves/${id}/delete`, {
            method: 'PATCH',
        }),

    // Subjects
    getShelfSubjects: async (
        shelfId: string
    ): Promise<ApiResponse<Subject[]>> => {
        const res = await fetchJson<Subject[]>(
            `/api/shelves/${shelfId}/subjects`
        );
        if (res.isSuccess && res.data) {
            await offlineDb.cacheSubjects(res.data);
            return res;
        }

        if (isOfflineOrNetworkFailure(res)) {
            const cached = await offlineDb.getCachedSubjects(shelfId);
            if (cached && cached.length > 0) {
                return {
                    isSuccess: true,
                    message: 'Loaded cached subjects (offline)',
                    data: cached,
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
            title: string;
            description?: string;
            icon?: string;
            color?: string;
            tags?: string[];
            isPublic?: boolean;
        }
    ) =>
        fetchJson<Subject>(`/api/shelves/${shelfId}/subjects`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

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
        subjectId: string
    ): Promise<ApiResponse<Card[]>> => {
        const res = await fetchJson<Card[]>(`/api/subjects/${subjectId}/cards`);
        if (res.isSuccess && res.data) {
            await offlineDb.cacheCards(res.data);
            return res;
        }

        if (isOfflineOrNetworkFailure(res)) {
            const cached = await offlineDb.getCachedCardsBySubject(subjectId);
            if (cached && cached.length > 0) {
                return {
                    isSuccess: true,
                    message: 'Loaded cached cards (offline)',
                    data: cached,
                    timestamp: new Date().toISOString(),
                };
            }
        }
        return res;
    },

    getDueCards: async (subjectId: string): Promise<ApiResponse<Card[]>> => {
        const res = await fetchJson<Card[]>(
            `/api/subjects/${subjectId}/cards/due`
        );
        if (res.isSuccess && res.data) {
            await offlineDb.cacheCards(res.data);
            return res;
        }

        if (isOfflineOrNetworkFailure(res)) {
            const cachedDue =
                await offlineDb.getCachedDueCardsBySubject(subjectId);
            return {
                isSuccess: true,
                message: 'Loaded cached due cards (offline)',
                data: cachedDue,
                timestamp: new Date().toISOString(),
            };
        }
        return res;
    },

    createCard: async (
        subjectId: string,
        data: {
            front: string;
            back: string;
            hint?: string;
            tags?: string[];
            mediaUrl?: string;
        }
    ): Promise<ApiResponse<Card>> => {
        // If browser is explicitly offline, save to IndexedDB immediately
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            const localCard = await offlineDb.saveOfflineCard(subjectId, data);
            await syncManager.requestBackgroundSync();
            await syncManager.refreshPendingCount();
            return {
                isSuccess: true,
                message: 'Card created offline (will sync when online)',
                data: localCard,
                timestamp: new Date().toISOString(),
            };
        }

        const res = await fetchJson<Card>(`/api/subjects/${subjectId}/cards`, {
            method: 'POST',
            body: JSON.stringify(data),
        });

        if (res.isSuccess && res.data) {
            await offlineDb.cacheCards([res.data]);
            return res;
        }

        // Network failure fallback
        if (isOfflineOrNetworkFailure(res)) {
            const localCard = await offlineDb.saveOfflineCard(subjectId, data);
            await syncManager.requestBackgroundSync();
            await syncManager.refreshPendingCount();
            return {
                isSuccess: true,
                message: 'Card saved offline (will sync when online)',
                data: localCard,
                timestamp: new Date().toISOString(),
            };
        }

        return res;
    },

    batchCreateCards: async (
        subjectId: string,
        cards: Array<{
            front: string;
            back: string;
            hint?: string;
            tags?: string[];
            mediaUrl?: string;
        }>
    ): Promise<ApiResponse<{ importedCount: number; cards: Card[] }>> => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            const result = await offlineDb.saveOfflineBatchCards(
                subjectId,
                cards
            );
            await syncManager.requestBackgroundSync();
            await syncManager.refreshPendingCount();
            return {
                isSuccess: true,
                message: `Imported ${result.importedCount} cards offline (will sync when online)`,
                data: result,
                timestamp: new Date().toISOString(),
            };
        }

        const res = await fetchJson<{ importedCount: number; cards: Card[] }>(
            `/api/subjects/${subjectId}/cards/batch`,
            {
                method: 'POST',
                body: JSON.stringify({ cards }),
            }
        );

        if (res.isSuccess && res.data?.cards) {
            await offlineDb.cacheCards(res.data.cards);
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
                message: `Imported ${result.importedCount} cards offline (will sync when online)`,
                data: result,
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
                message: 'Card updated offline',
                data: updated as Card,
                timestamp: new Date().toISOString(),
            };
        }

        return res;
    },

    gradeCard: async (
        id: string,
        grade: 1 | 2 | 3 | 4
    ): Promise<
        ApiResponse<{
            card: Card;
            scheduled: any;
            xpGained: number;
            totalXp: number;
        }>
    > => {
        // If offline, calculate FSRS review schedule locally and queue for sync
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            const localResult = await offlineDb.saveOfflineCardReview(
                id,
                grade as Grade
            );
            await syncManager.requestBackgroundSync();
            await syncManager.refreshPendingCount();
            return {
                isSuccess: true,
                message: 'Review saved offline (FSRS scheduled locally)',
                data: localResult,
                timestamp: new Date().toISOString(),
            };
        }

        const res = await fetchJson<{
            card: Card;
            scheduled: any;
            xpGained: number;
            totalXp: number;
        }>(`/api/cards/${id}/difficulty`, {
            method: 'PATCH',
            body: JSON.stringify({ grade }),
        });

        if (res.isSuccess && res.data?.card) {
            await offlineDb.cacheCards([res.data.card]);
            return res;
        }

        // Network failure fallback during review
        if (isOfflineOrNetworkFailure(res)) {
            const localResult = await offlineDb.saveOfflineCardReview(
                id,
                grade as Grade
            );
            await syncManager.requestBackgroundSync();
            await syncManager.refreshPendingCount();
            return {
                isSuccess: true,
                message: 'Review saved offline (will sync when online)',
                data: localResult,
                timestamp: new Date().toISOString(),
            };
        }

        return res;
    },

    deleteCard: async (id: string): Promise<ApiResponse<Card>> => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            await offlineDb.saveOfflineCardDelete(id);
            await syncManager.requestBackgroundSync();
            await syncManager.refreshPendingCount();
            return {
                isSuccess: true,
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

    // Test Suites
    getTestSuites: (subjectId: string) =>
        fetchJson<TestSuite[]>(`/api/subjects/${subjectId}/test-suites`),

    createTestSuite: (subjectId: string, data: Partial<TestSuite>) =>
        fetchJson<TestSuite>(`/api/subjects/${subjectId}/test-suites`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    runTestSuite: (id: string) =>
        fetchJson<{ suite: TestSuite; cards: Card[]; questions: any[] }>(
            `/api/test-suites/${id}/run`,
            {
                method: 'POST',
            }
        ),

    submitTestSuite: (
        id: string,
        answers: Record<string, number>,
        timeSpentSeconds: number
    ) =>
        fetchJson<{
            score: number;
            totalQuestions: number;
            percentage: number;
            timeSpentSeconds: number;
            xpGained: number;
            breakdown: any[];
        }>(`/api/test-suites/${id}/submit`, {
            method: 'POST',
            body: JSON.stringify({ answers, timeSpentSeconds }),
        }),

    // Stats & Leaderboard
    getStats: () => fetchJson<StatsData>('/api/stats'),

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
            { front: string; back: string; hint?: string; tags?: string[] }[]
        >('/api/generate-cards', {
            method: 'POST',
            body: JSON.stringify({ topic, notes, count }),
        }),
};
