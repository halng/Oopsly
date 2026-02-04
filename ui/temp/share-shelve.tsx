// import React, { useState } from 'react';
// import { View, Text, TextInput, TouchableOpacity, ScrollView, Share, Alert } from 'react-native';
// import { useRouter } from 'expo-router';
// import { QRCode } from 'react-native-custom-qr-codes-expo';
// import { Share2, Mail, Copy, Check, Users } from 'lucide-react-native';

// export default function ShareShelveScreen() {
//   const router = useRouter();
//   const [email, setEmail] = useState('');
//   const [isCopied, setIsCopied] = useState(false);
//   const [shelveId] = useState('shelve-12345');
//   const [shelveTitle] = useState('Biology Fundamentals');

//   const handleEmailShare = () => {
//     if (!email) {
//       Alert.alert('Error', 'Please enter an email address');
//       return;
//     }
    
//     // In a real app, this would send an email invitation
//     Alert.alert(
//       'Invitation Sent',
//       `An invitation to join "${shelveTitle}" has been sent to ${email}`,
//       [{ text: 'OK' }]
//     );
//     setEmail('');
//   };

//   const copyToClipboard = () => {
//     // In a real app, this would copy the shelve link to clipboard
//     setIsCopied(true);
//     setTimeout(() => setIsCopied(false), 2000);
//   };

//   const shareViaSystem = async () => {
//     try {
//       await Share.share({
//         message: `Join my study shelve "${shelveTitle}" on Osmosis! Shelve ID: ${shelveId}`,
//       });
//     } catch (error) {
//       Alert.alert('Error', 'Failed to share shelve');
//     }
//   };

//   return (
//     <ScrollView className="flex-1 bg-gray-50">
//       <View className="p-6">
//         {/* Header */}
//         <View className="mb-8">
//           <Text className="text-2xl font-bold text-gray-900 mb-2">Share Shelve</Text>
//           <Text className="text-gray-600">Share "{shelveTitle}" with friends and classmates</Text>
//         </View>

//         {/* QR Code Section */}
//         <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
//           <View className="items-center mb-4">
//             <QRCode 
//               content={`osmosis://shelve/${shelveId}`} 
//               size={200}
//               color="#6366F1"
//               backgroundColor="white"
//             />
//           </View>
//           <Text className="text-center text-gray-600 mb-4">
//             Scan this QR code to instantly access this shelve
//           </Text>
          
//           <TouchableOpacity 
//             onPress={copyToClipboard}
//             className="flex-row items-center justify-center bg-indigo-500 py-3 px-4 rounded-lg"
//           >
//             {isCopied ? (
//               <>
//                 <Check color="white" size={20} />
//                 <Text className="text-white font-medium ml-2">Copied!</Text>
//               </>
//             ) : (
//               <>
//                 <Copy color="white" size={20} />
//                 <Text className="text-white font-medium ml-2">Copy Shelve Link</Text>
//               </>
//             )}
//           </TouchableOpacity>
//         </View>

//         {/* Email Sharing */}
//         <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
//           <View className="flex-row items-center mb-4">
//             <Mail color="#6366F1" size={24} />
//             <Text className="text-lg font-semibold text-gray-900 ml-2">Share via Email</Text>
//           </View>
          
//           <Text className="text-gray-600 mb-4">
//             Invite someone by email to collaborate on this shelve
//           </Text>
          
//           <TextInput
//             className="border border-gray-300 rounded-lg p-4 mb-4"
//             placeholder="Enter email address"
//             keyboardType="email-address"
//             value={email}
//             onChangeText={setEmail}
//           />
          
//           <TouchableOpacity 
//             onPress={handleEmailShare}
//             className="bg-indigo-500 py-3 px-4 rounded-lg items-center"
//           >
//             <Text className="text-white font-medium">Send Invitation</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Other Sharing Options */}
//         <View className="bg-white rounded-xl p-6 mb-6 shadow-sm">
//           <View className="flex-row items-center mb-4">
//             <Share2 color="#6366F1" size={24} />
//             <Text className="text-lg font-semibold text-gray-900 ml-2">More Options</Text>
//           </View>
          
//           <Text className="text-gray-600 mb-4">
//             Share this shelve using your device's sharing options
//           </Text>
          
//           <TouchableOpacity 
//             onPress={shareViaSystem}
//             className="flex-row items-center justify-center bg-gray-100 py-3 px-4 rounded-lg"
//           >
//             <Users color="#6366F1" size={20} />
//             <Text className="text-indigo-600 font-medium ml-2">Share with Friends</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Permissions Note */}
//         <View className="bg-blue-50 rounded-xl p-4 mb-6">
//           <Text className="text-blue-800 text-center">
//             Collaborators will be able to view and study this shelve. 
//             Only you can edit the content.
//           </Text>
//         </View>
//       </View>
//     </ScrollView>
//   );
// }