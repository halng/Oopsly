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

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Search } from 'lucide-react-native';
import { cloneDeck, discoverDecks, PublicDeck } from '@/services/DiscoverService';
import { uiTokens } from '@/constants/uiTokens';

const PAGE_SIZE = 10;

const DiscoverScreen = () => {
  const [query, setQuery] = useState('');
  const [decks, setDecks] = useState<PublicDeck[]>([]);
  const [page, setPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [cloningIds, setCloningIds] = useState<Set<string>>(new Set());
  const [successIds, setSuccessIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2500);
  };

  const loadDecks = useCallback(
    (searchQuery: string, pageNum: number, append: boolean) => {
      if (pageNum === 0) setIsLoading(true);
      else setIsLoadingMore(true);

      discoverDecks(searchQuery, pageNum, PAGE_SIZE)
        .then((res) => {
          if (res.isSuccess) {
            const entities = res.data?.entities ?? [];
            setDecks(append ? (prev) => [...prev, ...entities] : entities);
            setHasNextPage(res.data?.hasNextPage ?? false);
            setPage(pageNum);
          }
        })
        .catch((err) => console.error('DiscoverScreen fetch error:', err))
        .finally(() => {
          setIsLoading(false);
          setIsLoadingMore(false);
        });
    },
    [],
  );

  useEffect(() => {
    loadDecks('', 0, false);
  }, [loadDecks]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  const handleSearchChange = (text: string) => {
    setQuery(text);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      loadDecks(text, 0, false);
    }, 400);
  };

  const handleClone = async (deck: PublicDeck) => {
    setCloningIds((prev) => new Set(prev).add(deck.id));
    try {
      const res = await cloneDeck(deck.id);
      if (res.isSuccess) {
        setSuccessIds((prev) => new Set(prev).add(deck.id));
        showToast('Deck added to your library!');
      } else {
        showToast('Clone failed. Please try again.');
      }
    } catch {
      showToast('Clone failed. Please try again.');
    } finally {
      setCloningIds((prev) => {
        const next = new Set(prev);
        next.delete(deck.id);
        return next;
      });
    }
  };

  return (
    <View style={styles.container} testID="discover-screen">
      {/* Toast */}
      {toast !== null && (
        <View style={styles.toast} testID="discover-toast">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* Search bar */}
      <View style={styles.searchRow}>
        <Search size={18} color={uiTokens.colors.textMuted} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search public decks..."
          placeholderTextColor={uiTokens.colors.textMuted}
          value={query}
          onChangeText={handleSearchChange}
          autoCorrect={false}
          autoCapitalize="none"
          testID="discover-search-input"
        />
      </View>

      <Text style={styles.heading}>Discover Public Decks</Text>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        testID="discover-scroll-view"
      >
        {isLoading ? (
          <View style={styles.centered} testID="discover-loading-state">
            <ActivityIndicator size="large" color={uiTokens.colors.primary} />
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        ) : decks.length === 0 ? (
          <View style={styles.emptyState} testID="discover-empty-state">
            <Text style={styles.emptyEmoji}>🔍</Text>
            <Text style={styles.emptyTitle}>No decks found</Text>
            <Text style={styles.emptySubtitle}>Be the first to share a deck!</Text>
          </View>
        ) : (
          <>
            {decks.map((deck) => (
              <View key={deck.id} style={styles.deckCard} testID={`discover-deck-${deck.id}`}>
                <View style={styles.deckInfo}>
                  <Text style={styles.deckName} numberOfLines={1}>
                    {deck.name}
                  </Text>
                  {deck.description ? (
                    <Text style={styles.deckDescription} numberOfLines={2}>
                      {deck.description}
                    </Text>
                  ) : null}
                  <Text style={styles.deckMeta}>
                    {deck.cardCount ?? 0} card{(deck.cardCount ?? 0) !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Pressable
                  style={[
                    styles.cloneButton,
                    successIds.has(deck.id) && styles.cloneButtonSuccess,
                  ]}
                  onPress={() => handleClone(deck)}
                  disabled={cloningIds.has(deck.id) || successIds.has(deck.id)}
                  testID={`discover-clone-${deck.id}`}
                >
                  {cloningIds.has(deck.id) ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.cloneButtonText}>
                      {successIds.has(deck.id) ? 'Cloned ✓' : 'Clone'}
                    </Text>
                  )}
                </Pressable>
              </View>
            ))}

            {hasNextPage && (
              <Pressable
                style={styles.loadMoreButton}
                onPress={() => loadDecks(query, page + 1, true)}
                disabled={isLoadingMore}
                testID="discover-load-more-button"
              >
                {isLoadingMore ? (
                  <ActivityIndicator size="small" color={uiTokens.colors.primary} />
                ) : (
                  <Text style={styles.loadMoreText}>Load more</Text>
                )}
              </Pressable>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: uiTokens.colors.background,
    padding: uiTokens.spacing.md,
  },
  toast: {
    position: 'absolute',
    bottom: uiTokens.spacing.xxl,
    left: uiTokens.spacing.lg,
    right: uiTokens.spacing.lg,
    backgroundColor: uiTokens.colors.textPrimary,
    borderRadius: uiTokens.radius.md,
    padding: uiTokens.spacing.md,
    alignItems: 'center',
    zIndex: 100,
    ...uiTokens.shadow.floating,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: uiTokens.colors.card,
    borderWidth: 1,
    borderColor: uiTokens.colors.border,
    borderRadius: uiTokens.radius.md,
    paddingHorizontal: uiTokens.spacing.md,
    paddingVertical: uiTokens.spacing.sm,
    gap: uiTokens.spacing.sm,
    marginBottom: uiTokens.spacing.md,
    ...uiTokens.shadow.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: uiTokens.colors.textPrimary,
    padding: 0,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: uiTokens.colors.textPrimary,
    marginBottom: uiTokens.spacing.md,
  },
  scrollContent: {
    paddingBottom: uiTokens.spacing.xxl,
  },
  centered: {
    alignItems: 'center',
    paddingVertical: uiTokens.spacing.xxl,
    gap: uiTokens.spacing.md,
  },
  loadingText: {
    color: uiTokens.colors.textMuted,
    fontSize: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: uiTokens.spacing.xxl,
    gap: uiTokens.spacing.sm,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: uiTokens.colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: uiTokens.colors.textMuted,
  },
  deckCard: {
    backgroundColor: uiTokens.colors.card,
    borderRadius: uiTokens.radius.lg,
    borderWidth: 1,
    borderColor: uiTokens.colors.border,
    padding: uiTokens.spacing.md,
    marginBottom: uiTokens.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: uiTokens.spacing.md,
    ...uiTokens.shadow.card,
  },
  deckInfo: {
    flex: 1,
  },
  deckName: {
    fontSize: 15,
    fontWeight: '700',
    color: uiTokens.colors.textPrimary,
  },
  deckDescription: {
    fontSize: 13,
    color: uiTokens.colors.textMuted,
    marginTop: 2,
    lineHeight: 18,
  },
  deckMeta: {
    fontSize: 12,
    color: uiTokens.colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
  cloneButton: {
    backgroundColor: uiTokens.colors.primary,
    borderRadius: uiTokens.radius.sm,
    paddingVertical: uiTokens.spacing.sm,
    paddingHorizontal: uiTokens.spacing.md,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
  },
  cloneButtonSuccess: {
    backgroundColor: uiTokens.colors.success,
  },
  cloneButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  loadMoreButton: {
    borderWidth: 1.5,
    borderColor: uiTokens.colors.primary,
    borderRadius: uiTokens.radius.md,
    paddingVertical: uiTokens.spacing.md,
    alignItems: 'center',
    marginTop: uiTokens.spacing.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  loadMoreText: {
    color: uiTokens.colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },
});

export default DiscoverScreen;
