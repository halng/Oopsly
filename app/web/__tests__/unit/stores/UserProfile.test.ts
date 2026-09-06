import { describe, it, expect, beforeEach } from 'vitest';
import { useUserProfileStore } from '@/store';
import type { UserProfile } from '@/types';

describe('useUserProfileStore', () => {
    // Capture the initial state (profile: null)
    const initialState = useUserProfileStore.getState();

    beforeEach(() => {
        // Reset the store before each test
        useUserProfileStore.setState(initialState, true);
    });

    it('initializes with a null profile', () => {
        const state = useUserProfileStore.getState();
        expect(state.profile).toBeNull();
    });

    it('updates the profile via setProfile', () => {
        // Create a mock profile matching your UserProfile type
        const mockProfile: UserProfile = {
            id: 'user_123',
            name: 'Forest Learner',
            email: 'hello@oopsly.app',
            avatarUrl: 'https://example.com/avatar.png',
        } as UserProfile;

        // Execute the action
        useUserProfileStore.getState().setProfile(mockProfile);

        // Verify the state updated correctly
        const state = useUserProfileStore.getState();
        expect(state.profile).toEqual(mockProfile);
    });
});
