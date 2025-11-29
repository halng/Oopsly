// import { Image } from 'expo-image';
// import { Platform, StyleSheet } from 'react-native';

// import { HelloWave } from '@/components/hello-wave';
// import ParallaxScrollView from '@/components/parallax-scroll-view';
// import { ThemedText } from '@/components/themed-text';
// import { ThemedView } from '@/components/themed-view';
// import { Link } from 'expo-router';

// export default function HomeScreen() {
//   return (
//     <ParallaxScrollView
//       headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
//       headerImage={
//         <Image
//           source={require('@/assets/images/partial-react-logo.png')}
//           style={styles.reactLogo}
//         />
//       }>
//       <ThemedView style={styles.titleContainer}>
//         <ThemedText type="title">Welcome!</ThemedText>
//         <HelloWave />
//       </ThemedView>
//       <ThemedView style={styles.stepContainer}>
//         <ThemedText type="subtitle">Step 1: Try it</ThemedText>
//         <ThemedText>
//           Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
//           Press{' '}
//           <ThemedText type="defaultSemiBold">
//             {Platform.select({
//               ios: 'cmd + d',
//               android: 'cmd + m',
//               web: 'F12',
//             })}
//           </ThemedText>{' '}
//           to open developer tools.
//         </ThemedText>
//       </ThemedView>
//       <ThemedView style={styles.stepContainer}>
//         <Link href="/modal">
//           <Link.Trigger>
//             <ThemedText type="subtitle">Step 2: Explore</ThemedText>
//           </Link.Trigger>
//           <Link.Preview />
//           <Link.Menu>
//             <Link.MenuAction title="Action" icon="cube" onPress={() => alert('Action pressed')} />
//             <Link.MenuAction
//               title="Share"
//               icon="square.and.arrow.up"
//               onPress={() => alert('Share pressed')}
//             />
//             <Link.Menu title="More" icon="ellipsis">
//               <Link.MenuAction
//                 title="Delete"
//                 icon="trash"
//                 destructive
//                 onPress={() => alert('Delete pressed')}
//               />
//             </Link.Menu>
//           </Link.Menu>
//         </Link>

//         <ThemedText>
//           {`Tap the Explore tab to learn more about what's included in this starter app.`}
//         </ThemedText>
//       </ThemedView>
//       <ThemedView style={styles.stepContainer}>
//         <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
//         <ThemedText>
//           {`When you're ready, run `}
//           <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
//           <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
//           <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
//           <ThemedText type="defaultSemiBold">app-example</ThemedText>.
//         </ThemedText>
//       </ThemedView>
//     </ParallaxScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   titleContainer: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     gap: 8,
//   },
//   stepContainer: {
//     gap: 8,
//     marginBottom: 8,
//   },
//   reactLogo: {
//     height: 178,
//     width: 290,
//     bottom: 0,
//     left: 0,
//     position: 'absolute',
//   },
// });


import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plus, BookOpen, Settings } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface Deck {
  id: string;
  title: string;
  cardCount: number;
  dueCount: number;
  color: string;
}

const HomeScreen = () => {
  const router = useRouter();
  const [decks, setDecks] = useState<Deck[]>([]);
  
  useEffect(() => {
    loadDecks();
  }, []);

  const loadDecks = async () => {
    try {
      const storedDecks = await AsyncStorage.getItem('flashcard_decks');
      if (storedDecks) {
        setDecks(JSON.parse(storedDecks));
      } else {
        // Create sample decks if none exist
        const sampleDecks: Deck[] = [
          { id: '1', title: 'Spanish Vocabulary', cardCount: 42, dueCount: 12, color: 'bg-blue-500' },
          { id: '2', title: 'Chemistry Elements', cardCount: 28, dueCount: 5, color: 'bg-green-500' },
          { id: '3', title: 'History Dates', cardCount: 35, dueCount: 8, color: 'bg-purple-500' },
          { id: '4', title: 'JavaScript Methods', cardCount: 56, dueCount: 21, color: 'bg-yellow-500' },
        ];
        setDecks(sampleDecks);
        await AsyncStorage.setItem('flashcard_decks', JSON.stringify(sampleDecks));
      }
    } catch (error) {
      console.error('Error loading decks:', error);
    }
  };

  const navigateToDeck = (deckId: string) => {
    router.push(`/study?id=${deckId}`);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="px-4 pt-6 pb-4 flex-row justify-between items-center">
        <View>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">FlashMind</Text>
          <Text className="text-gray-500 dark:text-gray-400 mt-1">Your learning companion</Text>
        </View>
        <TouchableOpacity 
          className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm"
          // onPress={() => router.push('/settings')}
        >
          <Settings size={24} color="#333" className="dark:text-white" />
        </TouchableOpacity>
      </View>

      {/* Stats Summary */}
      <View className="px-4 mb-6">
        <View className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <View className="flex-row justify-between">
            <View className="items-center">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">{decks.reduce((sum, deck) => sum + deck.cardCount, 0)}</Text>
              <Text className="text-gray-500 dark:text-gray-400 text-sm">Total Cards</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-blue-500">{decks.reduce((sum, deck) => sum + deck.dueCount, 0)}</Text>
              <Text className="text-gray-500 dark:text-gray-400 text-sm">Due Today</Text>
            </View>
            <View className="items-center">
              <Text className="text-2xl font-bold text-green-500">{decks.length}</Text>
              <Text className="text-gray-500 dark:text-gray-400 text-sm">Decks</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Decks Section */}
      <View className="px-4 flex-1">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">Your Decks</Text>
          <TouchableOpacity 
            className="flex-row items-center bg-blue-500 px-3 py-1 rounded-full"
            onPress={() => router.push('/create-deck')}
          >
            <Plus size={16} color="white" />
            <Text className="text-white ml-1 text-sm">New</Text>
          </TouchableOpacity>
        </View>

        {decks.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <BookOpen size={48} color="#9CA3AF" />
            <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
              No decks yet. Create your first deck to start learning!
            </Text>
            <TouchableOpacity 
              className="mt-6 bg-blue-500 px-6 py-3 rounded-full"
              onPress={() => router.push('/create-deck')}
            >
              <Text className="text-white font-medium">Create Deck</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="flex-row flex-wrap gap-4">
              {decks.map((deck) => (
                <TouchableOpacity
                  key={deck.id}
                  className={`${deck.color} rounded-xl p-4 w-[48%] min-h-[140px] shadow-sm`}
                  onPress={() => navigateToDeck(deck.id)}
                >
                  <Text className="text-white text-lg font-semibold mb-2">{deck.title}</Text>
                  <Text className="text-white text-opacity-80 text-sm mb-4">{deck.cardCount} cards</Text>
                  
                  <View className="mt-auto">
                    <View className="flex-row justify-between items-center">
                      <Text className="text-white text-sm font-medium">Due today</Text>
                      <View className="bg-white bg-opacity-20 rounded-full px-2 py-1">
                        <Text className="text-white text-xs font-bold">{deck.dueCount}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            
            <View className="h-8" />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
};

export default HomeScreen;
