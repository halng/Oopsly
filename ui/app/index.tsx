// // import { Image } from 'expo-image';
// // import { Platform, StyleSheet } from 'react-native';

// // import { HelloWave } from '@/components/hello-wave';
// // import ParallaxScrollView from '@/components/parallax-scroll-view';
// // import { ThemedText } from '@/components/themed-text';
// // import { ThemedView } from '@/components/themed-view';
// // import { Link } from 'expo-router';

// // export default function HomeScreen() {
// //   return (
// //     <ParallaxScrollView
// //       headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
// //       headerImage={
// //         <Image
// //           source={require('@/assets/images/partial-react-logo.png')}
// //           style={styles.reactLogo}
// //         />
// //       }>
// //       <ThemedView style={styles.titleContainer}>
// //         <ThemedText type="title">Welcome!</ThemedText>
// //         <HelloWave />
// //       </ThemedView>
// //       <ThemedView style={styles.stepContainer}>
// //         <ThemedText type="subtitle">Step 1: Try it</ThemedText>
// //         <ThemedText>
// //           Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
// //           Press{' '}
// //           <ThemedText type="defaultSemiBold">
// //             {Platform.select({
// //               ios: 'cmd + d',
// //               android: 'cmd + m',
// //               web: 'F12',
// //             })}
// //           </ThemedText>{' '}
// //           to open developer tools.
// //         </ThemedText>
// //       </ThemedView>
// //       <ThemedView style={styles.stepContainer}>
// //         <Link href="/modal">
// //           <Link.Trigger>
// //             <ThemedText type="subtitle">Step 2: Explore</ThemedText>
// //           </Link.Trigger>
// //           <Link.Preview />
// //           <Link.Menu>
// //             <Link.MenuAction title="Action" icon="cube" onPress={() => alert('Action pressed')} />
// //             <Link.MenuAction
// //               title="Share"
// //               icon="square.and.arrow.up"
// //               onPress={() => alert('Share pressed')}
// //             />
// //             <Link.Menu title="More" icon="ellipsis">
// //               <Link.MenuAction
// //                 title="Delete"
// //                 icon="trash"
// //                 destructive
// //                 onPress={() => alert('Delete pressed')}
// //               />
// //             </Link.Menu>
// //           </Link.Menu>
// //         </Link>

// //         <ThemedText>
// //           {`Tap the Explore tab to learn more about what's included in this starter app.`}
// //         </ThemedText>
// //       </ThemedView>
// //       <ThemedView style={styles.stepContainer}>
// //         <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
// //         <ThemedText>
// //           {`When you're ready, run `}
// //           <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
// //           <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
// //           <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
// //           <ThemedText type="defaultSemiBold">app-example</ThemedText>.
// //         </ThemedText>
// //       </ThemedView>
// //     </ParallaxScrollView>
// //   );
// // }

// // const styles = StyleSheet.create({
// //   titleContainer: {
// //     flexDirection: 'row',
// //     alignItems: 'center',
// //     gap: 8,
// //   },
// //   stepContainer: {
// //     gap: 8,
// //     marginBottom: 8,
// //   },
// //   reactLogo: {
// //     height: 178,
// //     width: 290,
// //     bottom: 0,
// //     left: 0,
// //     position: 'absolute',
// //   },
// // });


// // import React, { useState, useEffect } from 'react';
// // import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
// // import AsyncStorage from '@react-native-async-storage/async-storage';
// // import { Plus, BookOpen, Settings } from 'lucide-react-native';
// // import { useRouter } from 'expo-router';

// // interface Deck {
// //   id: string;
// //   title: string;
// //   cardCount: number;
// //   dueCount: number;
// //   color: string;
// // }

// // const HomeScreen = () => {
// //   const router = useRouter();
// //   const [decks, setDecks] = useState<Deck[]>([]);
  
// //   useEffect(() => {
// //     loadDecks();
// //   }, []);

// //   const loadDecks = async () => {
// //     try {
// //       const storedDecks = await AsyncStorage.getItem('flashcard_decks');
// //       if (storedDecks) {
// //         setDecks(JSON.parse(storedDecks));
// //       } else {
// //         // Create sample decks if none exist
// //         const sampleDecks: Deck[] = [
// //           { id: '1', title: 'Spanish Vocabulary', cardCount: 42, dueCount: 12, color: 'bg-blue-500' },
// //           { id: '2', title: 'Chemistry Elements', cardCount: 28, dueCount: 5, color: 'bg-green-500' },
// //           { id: '3', title: 'History Dates', cardCount: 35, dueCount: 8, color: 'bg-purple-500' },
// //           { id: '4', title: 'JavaScript Methods', cardCount: 56, dueCount: 21, color: 'bg-yellow-500' },
// //         ];
// //         setDecks(sampleDecks);
// //         await AsyncStorage.setItem('flashcard_decks', JSON.stringify(sampleDecks));
// //       }
// //     } catch (error) {
// //       console.error('Error loading decks:', error);
// //     }
// //   };

// //   const navigateToDeck = (deckId: string) => {
// //     router.push(`/study?id=${deckId}`);
// //   };

// //   return (
// //     <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
// //       <StatusBar barStyle="dark-content" />
      
// //       {/* Header */}
// //       <View className="px-4 pt-6 pb-4 flex-row justify-between items-center">
// //         <View>
// //           <Text className="text-2xl font-bold text-gray-900 dark:text-white">FlashMind</Text>
// //           <Text className="text-gray-500 dark:text-gray-400 mt-1">Your learning companion</Text>
// //         </View>
// //         <TouchableOpacity 
// //           className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-sm"
// //           // onPress={() => router.push('/settings')}
// //         >
// //           <Settings size={24} color="#333" className="dark:text-white" />
// //         </TouchableOpacity>
// //       </View>

// //       {/* Stats Summary */}
// //       <View className="px-4 mb-6">
// //         <View className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
// //           <View className="flex-row justify-between">
// //             <View className="items-center">
// //               <Text className="text-2xl font-bold text-gray-900 dark:text-white">{decks.reduce((sum, deck) => sum + deck.cardCount, 0)}</Text>
// //               <Text className="text-gray-500 dark:text-gray-400 text-sm">Total Cards</Text>
// //             </View>
// //             <View className="items-center">
// //               <Text className="text-2xl font-bold text-blue-500">{decks.reduce((sum, deck) => sum + deck.dueCount, 0)}</Text>
// //               <Text className="text-gray-500 dark:text-gray-400 text-sm">Due Today</Text>
// //             </View>
// //             <View className="items-center">
// //               <Text className="text-2xl font-bold text-green-500">{decks.length}</Text>
// //               <Text className="text-gray-500 dark:text-gray-400 text-sm">Decks</Text>
// //             </View>
// //           </View>
// //         </View>
// //       </View>

// //       {/* Decks Section */}
// //       <View className="px-4 flex-1">
// //         <View className="flex-row justify-between items-center mb-4">
// //           <Text className="text-lg font-semibold text-gray-900 dark:text-white">Your Decks</Text>
// //           <TouchableOpacity 
// //             className="flex-row items-center bg-blue-500 px-3 py-1 rounded-full"
// //             onPress={() => router.push('/create-desk')}
// //           >
// //             <Plus size={16} color="white" />
// //             <Text className="text-white ml-1 text-sm">New</Text>
// //           </TouchableOpacity>
// //         </View>

// //         {decks.length === 0 ? (
// //           <View className="flex-1 items-center justify-center">
// //             <BookOpen size={48} color="#9CA3AF" />
// //             <Text className="text-gray-500 dark:text-gray-400 mt-4 text-center">
// //               No decks yet. Create your first deck to start learning!
// //             </Text>
// //             <TouchableOpacity 
// //               className="mt-6 bg-blue-500 px-6 py-3 rounded-full"
// //               onPress={() => router.push('/create-desk')}
// //             >
// //               <Text className="text-white font-medium">Create Deck</Text>
// //             </TouchableOpacity>
// //           </View>
// //         ) : (
// //           <ScrollView showsVerticalScrollIndicator={false}>
// //             <View className="flex-row flex-wrap gap-4">
// //               {decks.map((deck) => (
// //                 <TouchableOpacity
// //                   key={deck.id}
// //                   className={`${deck.color} rounded-xl p-4 w-[48%] min-h-[140px] shadow-sm`}
// //                   onPress={() => navigateToDeck(deck.id)}
// //                 >
// //                   <Text className="text-white text-lg font-semibold mb-2">{deck.title}</Text>
// //                   <Text className="text-white text-opacity-80 text-sm mb-4">{deck.cardCount} cards</Text>
                  
// //                   <View className="mt-auto">
// //                     <View className="flex-row justify-between items-center">
// //                       <Text className="text-white text-sm font-medium">Due today</Text>
// //                       <View className="bg-white bg-opacity-20 rounded-full px-2 py-1">
// //                         <Text className="text-white text-xs font-bold">{deck.dueCount}</Text>
// //                       </View>
// //                     </View>
// //                   </View>
// //                 </TouchableOpacity>
// //               ))}
// //             </View>
            
// //             <View className="h-8" />
// //           </ScrollView>
// //         )}
// //       </View>
// //     </SafeAreaView>
// //   );
// // };

// // export default HomeScreen;


// import React, { useState } from 'react';
// import { View, Text, TouchableOpacity, StyleSheet, Modal, Dimensions } from 'react-native';
// import { Camera, Upload, Type, Home, BookOpen, Search, User, PlusCircle } from 'lucide-react-native';
// import { BlurView } from 'expo-blur';
// import LinearGradient from 'react-native-linear-gradient';
// import { cssInterop } from 'nativewind';
// import AnimatedNode from '@/components/AnimatedNode';

// // Setup LinearGradient for NativeWind
// cssInterop(LinearGradient, {
//   className: 'style',
// });

// const { width, height } = Dimensions.get('window');

// // Mock data for the heatmap
// const heatmapData = Array(35).fill(null).map(() => Math.random() > 0.5 ? 1 : (Math.random() > 0.5 ? 2 : 0));

// // Mock node data for the web
// const nodeData = [
//   { id: 1, x: width * 0.2, y: height * 0.3, status: 'active', title: 'Physics' },
//   { id: 2, x: width * 0.7, y: height * 0.25, status: 'active', title: 'Calculus' },
//   { id: 3, x: width * 0.4, y: height * 0.5, status: 'active', title: 'Chemistry' },
//   { id: 4, x: width * 0.8, y: height * 0.6, status: 'active', title: 'Biology' },
//   { id: 5, x: width * 0.3, y: height * 0.7, status: 'fading', title: 'History' },
//   { id: 6, x: width * 0.6, y: height * 0.8, status: 'mastered', title: 'Literature' },
// ];

// // Connections between nodes
// const connections = [
//   { from: 1, to: 2 },
//   { from: 2, to: 3 },
//   { from: 3, to: 4 },
//   { from: 4, to: 5 },
//   { from: 5, to: 6 },
//   { from: 1, to: 3 },
//   { from: 2, to: 4 },
// ];

// const OsmosisApp = () => {
//   const [activeTab, setActiveTab] = useState('web');
//   const [isCreationModalVisible, setIsCreationModalVisible] = useState(false);
//   const [studyState, setStudyState] = useState<'initial' | 'revealed'>('initial');

//   // Render The Web Screen
//   const renderWebScreen = () => (
//     <View className="flex-1 bg-black">
//       {/* Header */}
//       <View className="flex-row justify-between items-center px-4 py-6">
//         <View className="flex-row items-center">
//           <View className="w-3 h-3 rounded-full bg-yellow-400 mr-2" />
//           <Text className="text-yellow-400 font-bold text-lg">450 Lumen</Text>
//         </View>
//         <View className="flex-row items-center">
//           <View className="w-3 h-3 rounded-full bg-cyan-400 mr-2" />
//           <Text className="text-cyan-400 font-bold text-lg">Spark Energy 2/3</Text>
//         </View>
//       </View>

//       {/* Canvas Area */}
//       <View className="flex-1 relative">
//         {/* Connection Lines */}
//         {connections.map((conn, index) => {
//           const fromNode = nodeData.find(n => n.id === conn.from);
//           const toNode = nodeData.find(n => n.id === conn.to);
          
//           if (!fromNode || !toNode) return null;
          
//           const length = Math.sqrt(
//             Math.pow(toNode.x - fromNode.x, 2) + 
//             Math.pow(toNode.y - fromNode.y, 2)
//           );
          
//           const angle = Math.atan2(
//             toNode.y - fromNode.y,
//             toNode.x - fromNode.x
//           ) * 180 / Math.PI;
          
//           return (
//             <View
//               key={index}
//               className="absolute h-0.5 bg-cyan-400 opacity-30"
//               style={{
//                 width: length,
//                 left: fromNode.x,
//                 top: fromNode.y,
//                 transform: [{ rotate: `${angle}deg` }, { translateX: 0 }, { translateY: -0.5 }]
//               }}
//             />
//           );
//         })}
        
//         {/* Animated Nodes */}
//         {nodeData.map(node => (
//           <View
//             key={node.id}
//             style={{
//               position: 'absolute',
//               left: node.x - 32,
//               top: node.y - 32,
//             }}
//           >
//             <AnimatedNode
//               id={node.id}
//               title={node.title}
//               status={node.status as 'active' | 'fading' | 'mastered'}
//               size="medium"
//               onPress={() => console.log(`Node ${node.id} pressed`)}
//             />
//           </View>
//         ))}
        
//         {/* Floating Banner */}
//         <BlurView intensity={20} className="absolute bottom-20 left-4 right-4 rounded-xl border border-cyan-400 border-opacity-30">
//           <View className="flex-row items-center justify-between p-4">
//             <Text className="text-white text-base">Physics Cluster is dimming.</Text>
//             <TouchableOpacity className="bg-cyan-400 px-4 py-2 rounded-full">
//               <Text className="text-black font-bold">Recharge Now</Text>
//             </TouchableOpacity>
//           </View>
//         </BlurView>
//       </View>
//     </View>
//   );

//   // Render Recharge Screen
//   const renderRechargeScreen = () => (
//     <View className="flex-1 bg-black items-center justify-center px-4">
//       {/* Center Stage */}
//       <View className="items-center mb-12">
//         {/* Left Node */}
//         <View className="absolute left-10 top-20">
//           <AnimatedNode
//             id={101}
//             title="Java"
//             status="active"
//             size="large"
//           />
//         </View>
        
//         {/* Right Node */}
//         <View className="absolute right-10 top-20">
//           <AnimatedNode
//             id={102}
//             title="Bytecode"
//             status="active"
//             size="large"
//           />
//         </View>
        
//         {/* Connection Line */}
//         <View className="absolute w-40 h-0.5 bg-cyan-400 top-36" />
        
//         {/* Question Mark */}
//         {studyState === 'initial' && (
//           <View className="absolute top-32 w-8 h-8 rounded-full bg-cyan-400 items-center justify-center">
//             <Text className="text-black text-xl font-bold">?</Text>
//           </View>
//         )}
        
//         {/* Revealed State */}
//         {studyState === 'revealed' && (
//           <>
//             <View className="absolute top-28 w-8 h-8 rounded-full bg-green-500 items-center justify-center">
//               <Text className="text-white text-lg">✓</Text>
//             </View>
            
//             {/* Connection Line - Updated */}
//             <View className="absolute w-40 h-1 bg-green-500 top-36" />
//           </>
//         )}
//       </View>
      
//       {/* Interaction Area */}
//       <View className="w-full px-4">
//         {studyState === 'initial' ? (
//           <TouchableOpacity 
//             className="bg-cyan-400 py-4 rounded-full items-center"
//             onPress={() => setStudyState('revealed')}
//           >
//             <Text className="text-black font-bold text-lg">Reveal Link</Text>
//           </TouchableOpacity>
//         ) : (
//           <View className="flex-row justify-between">
//             <TouchableOpacity className="border-2 border-red-500 py-3 px-6 rounded-full">
//               <Text className="text-red-500 font-bold">Broken</Text>
//             </TouchableOpacity>
//             <TouchableOpacity className="border-2 border-cyan-400 py-3 px-6 rounded-full">
//               <Text className="text-cyan-400 font-bold">Connected</Text>
//             </TouchableOpacity>
//             <TouchableOpacity className="bg-yellow-400 py-3 px-6 rounded-full">
//               <Text className="text-black font-bold">Brilliant</Text>
//             </TouchableOpacity>
//           </View>
//         )}
//       </View>
//     </View>
//   );

//   // Render Explore Screen
//   const renderExploreScreen = () => (
//     <View className="flex-1 bg-black p-4">
//       <Text className="text-white text-2xl font-bold mb-6">Community Network</Text>
      
//       {/* Community Stats */}
//       <View className="flex-row justify-between mb-6">
//         <View className="bg-gray-900 p-4 rounded-xl flex-1 mr-2">
//           <Text className="text-cyan-400 text-lg font-bold">1.2K</Text>
//           <Text className="text-gray-400">Active Learners</Text>
//         </View>
//         <View className="bg-gray-900 p-4 rounded-xl flex-1 ml-2">
//           <Text className="text-yellow-400 text-lg font-bold">85%</Text>
//           <Text className="text-gray-400">Success Rate</Text>
//         </View>
//       </View>
      
//       {/* Network Visualization */}
//       <View className="flex-1 bg-gray-900 rounded-2xl items-center justify-center relative">
//         {/* Central Node */}
//         <View className="absolute">
//           <AnimatedNode
//             id={200}
//             title="You"
//             status="active"
//             size="large"
//           />
//         </View>
        
//         {/* Surrounding Nodes */}
//         <View className="absolute top-32 left-10">
//           <AnimatedNode
//             id={201}
//             title="Alex"
//             status="active"
//             size="medium"
//           />
//         </View>
//         <View className="absolute top-32 right-10">
//           <AnimatedNode
//             id={202}
//             title="Sam"
//             status="active"
//             size="medium"
//           />
//         </View>
//         <View className="absolute bottom-32 left-16">
//           <AnimatedNode
//             id={203}
//             title="Jordan"
//             status="fading"
//             size="medium"
//           />
//         </View>
//         <View className="absolute bottom-32 right-16">
//           <AnimatedNode
//             id={204}
//             title="Taylor"
//             status="mastered"
//             size="medium"
//           />
//         </View>
        
//         {/* Connection Lines */}
//         <View className="absolute w-32 h-0.5 bg-cyan-400 opacity-30 top-40 left-24" />
//         <View className="absolute w-32 h-0.5 bg-cyan-400 opacity-30 top-40 right-24" />
//         <View className="absolute w-40 h-0.5 bg-cyan-400 opacity-30 bottom-40 left-20" />
//         <View className="absolute w-40 h-0.5 bg-cyan-400 opacity-30 bottom-40 right-20" />
//       </View>
      
//       {/* Recent Activity */}
//       <View className="mt-6">
//         <Text className="text-white text-lg font-bold mb-3">Recent Activity</Text>
//         <View className="bg-gray-900 p-4 rounded-xl">
//           <Text className="text-cyan-400">Alex mastered &quot;Quantum Physics&quot;</Text>
//           <Text className="text-gray-400 text-sm mt-1">2 hours ago</Text>
//         </View>
//       </View>
//     </View>
//   );

//   // Render Architect Screen
//   const renderArchitectScreen = () => (
//     <View className="flex-1 bg-black p-4">
//       {/* Header with Avatar */}
//       <View className="items-center mb-6">
//         <View className="w-24 h-24 rounded-full border-2 border-cyan-400 items-center justify-center mb-4">
//           <View className="w-20 h-20 rounded-full bg-gray-800 items-center justify-center">
//             <Text className="text-cyan-400 text-2xl">U</Text>
//           </View>
//         </View>
//         <Text className="text-white text-2xl font-bold">User Name</Text>
//         <Text className="text-gray-400">Apprentice Architect</Text>
//       </View>
      
//       {/* Stats Row */}
//       <View className="flex-row justify-between mb-6">
//         <View className="items-center">
//           <Text className="text-white text-xl font-bold">1,240</Text>
//           <Text className="text-gray-400">Sparks</Text>
//         </View>
//         <View className="items-center">
//           <Text className="text-white text-xl font-bold">85%</Text>
//           <Text className="text-gray-400">Brilliance</Text>
//         </View>
//         <View className="items-center">
//           <Text className="text-white text-xl font-bold">14</Text>
//           <Text className="text-gray-400">Day Streak</Text>
//         </View>
//       </View>
      
//       {/* Heatmap */}
//       <View className="mb-6">
//         <Text className="text-white text-lg font-bold mb-3">Learning Activity</Text>
//         <View className="flex-row flex-wrap">
//           {heatmapData.map((value, index) => (
//             <View 
//               key={index} 
//               className={`w-6 h-6 m-1 rounded-sm ${
//                 value === 0 
//                   ? 'bg-gray-900' 
//                   : value === 1 
//                     ? 'bg-cyan-400 bg-opacity-50' 
//                     : 'bg-yellow-400 bg-opacity-50'
//               }`}
//             />
//           ))}
//         </View>
//       </View>
      
//       {/* Subscription Card */}
//       <View className="bg-gradient-to-r from-cyan-900 to-cyan-700 p-4 rounded-2xl mb-6">
//         <Text className="text-white text-lg font-bold mb-2">Apprentice Architect</Text>
//         <Text className="text-gray-200 mb-4">Unlock advanced features with Master Builder tier</Text>
//         <TouchableOpacity className="bg-yellow-400 py-2 rounded-full items-center">
//           <Text className="text-black font-bold">Upgrade to Master Builder</Text>
//         </TouchableOpacity>
//       </View>
      
//       {/* Achievements */}
//       <View>
//         <Text className="text-white text-lg font-bold mb-3">Achievements</Text>
//         <View className="flex-row">
//           <View className="bg-gray-900 p-3 rounded-xl mr-3">
//             <View className="w-10 h-10 rounded-full bg-yellow-400 items-center justify-center mb-2">
//               <Text className="text-black font-bold">★</Text>
//             </View>
//             <Text className="text-white text-xs">Early Bird</Text>
//           </View>
//           <View className="bg-gray-900 p-3 rounded-xl mr-3">
//             <View className="w-10 h-10 rounded-full bg-cyan-400 items-center justify-center mb-2">
//               <Text className="text-black font-bold">⚡</Text>
//             </View>
//             <Text className="text-white text-xs">Streak Master</Text>
//           </View>
//           <View className="bg-gray-900 p-3 rounded-xl">
//             <View className="w-10 h-10 rounded-full bg-purple-400 items-center justify-center mb-2">
//               <Text className="text-white font-bold">🎓</Text>
//             </View>
//             <Text className="text-white text-xs">Scholar</Text>
//           </View>
//         </View>
//       </View>
//     </View>
//   );

//   // Render Creation Modal
//   const renderCreationModal = () => (
//     <Modal
//       visible={isCreationModalVisible}
//       transparent={true}
//       animationType="slide"
//       onRequestClose={() => setIsCreationModalVisible(false)}
//     >
//       <View className="flex-1 bg-black bg-opacity-80 justify-end">
//         <BlurView intensity={20} className="rounded-t-3xl p-6">
//           <Text className="text-white text-2xl font-bold mb-6 text-center">Ignite New Sparks</Text>
          
//           <View className="flex-row justify-between mb-8">
//             {/* Capture Option */}
//             <TouchableOpacity className="items-center flex-1 mx-2 p-4 rounded-2xl border-2 border-cyan-400">
//               <View className="w-16 h-16 rounded-full bg-cyan-400 items-center justify-center mb-3">
//                 <Camera size={32} color="#000" />
//               </View>
//               <Text className="text-white font-bold text-lg">Capture</Text>
//               <Text className="text-gray-400 text-center mt-1">Scan textbook page</Text>
//             </TouchableOpacity>
            
//             {/* Inject Option */}
//             <TouchableOpacity className="items-center flex-1 mx-2 p-4 rounded-2xl border-2 border-cyan-400">
//               <View className="w-16 h-16 rounded-full bg-cyan-400 items-center justify-center mb-3">
//                 <Upload size={32} color="#000" />
//               </View>
//               <Text className="text-white font-bold text-lg">Inject</Text>
//               <Text className="text-gray-400 text-center mt-1">Upload PDF/Text</Text>
//             </TouchableOpacity>
            
//             {/* Spark Option */}
//             <TouchableOpacity className="items-center flex-1 mx-2 p-4 rounded-2xl border-2 border-cyan-400">
//               <View className="w-16 h-16 rounded-full bg-cyan-400 items-center justify-center mb-3">
//                 <Type size={32} color="#000" />
//               </View>
//               <Text className="text-white font-bold text-lg">Spark</Text>
//               <Text className="text-gray-400 text-center mt-1">Type a topic</Text>
//             </TouchableOpacity>
//           </View>
          
//           <TouchableOpacity 
//             className="bg-gray-800 py-4 rounded-full items-center"
//             onPress={() => setIsCreationModalVisible(false)}
//           >
//             <Text className="text-white font-bold">Cancel</Text>
//           </TouchableOpacity>
//         </BlurView>
//       </View>
//     </Modal>
//   );

//   // Render the appropriate screen based on active tab
//   const renderActiveScreen = () => {
//     switch (activeTab) {
//       case 'web': return renderWebScreen();
//       case 'recharge': return renderRechargeScreen();
//       case 'explore': return renderExploreScreen();
//       case 'architect': return renderArchitectScreen();
//       default: return renderWebScreen();
//     }
//   };

//   return (
//     <View className="flex-1 bg-black">
//       {/* Main Content */}
//       {renderActiveScreen()}
      
//       {/* Custom Bottom Tab Navigator */}
//       <View className="flex-row bg-black border-t border-gray-800 py-2">
//         <TouchableOpacity 
//           className={`flex-1 items-center py-2 ${activeTab === 'web' ? 'bg-gray-900' : ''}`}
//           onPress={() => setActiveTab('web')}
//         >
//           <Home size={24} color={activeTab === 'web' ? '#00F0FF' : '#A0A0A0'} />
//           <Text className={`text-xs mt-1 ${activeTab === 'web' ? 'text-cyan-400' : 'text-gray-500'}`}>The Web</Text>
//         </TouchableOpacity>
        
//         <TouchableOpacity 
//           className={`flex-1 items-center py-2 ${activeTab === 'recharge' ? 'bg-gray-900' : ''}`}
//           onPress={() => setActiveTab('recharge')}
//         >
//           <BookOpen size={24} color={activeTab === 'recharge' ? '#00F0FF' : '#A0A0A0'} />
//           <Text className={`text-xs mt-1 ${activeTab === 'recharge' ? 'text-cyan-400' : 'text-gray-500'}`}>Recharge</Text>
//         </TouchableOpacity>
        
//         {/* Center FAB */}
//         <TouchableOpacity 
//           className="w-20 h-20 rounded-full bg-cyan-400 items-center justify-center -mt-8 mx-4 border-4 border-black"
//           onPress={() => setIsCreationModalVisible(true)}
//         >
//           <PlusCircle size={32} color="#000" />
//         </TouchableOpacity>
        
//         <TouchableOpacity 
//           className={`flex-1 items-center py-2 ${activeTab === 'explore' ? 'bg-gray-900' : ''}`}
//           onPress={() => setActiveTab('explore')}
//         >
//           <Search size={24} color={activeTab === 'explore' ? '#00F0FF' : '#A0A0A0'} />
//           <Text className={`text-xs mt-1 ${activeTab === 'explore' ? 'text-cyan-400' : 'text-gray-500'}`}>Explore</Text>
//         </TouchableOpacity>
        
//         <TouchableOpacity 
//           className={`flex-1 items-center py-2 ${activeTab === 'architect' ? 'bg-gray-900' : ''}`}
//           onPress={() => setActiveTab('architect')}
//         >
//           <User size={24} color={activeTab === 'architect' ? '#00F0FF' : '#A0A0A0'} />
//           <Text className={`text-xs mt-1 ${activeTab === 'architect' ? 'text-cyan-400' : 'text-gray-500'}`}>Architect</Text>
//         </TouchableOpacity>
//       </View>
      
//       {/* Creation Modal */}
//       {renderCreationModal()}
//     </View>
//   );
// };

// export default OsmosisApp;