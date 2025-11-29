import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Image as ImageIcon,
  Bold,
  Italic,
  Underline,
  Type,
  Eye,
  EyeOff,
  Save,
  X,
} from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock image picker since we can't use actual image picker in this environment
const selectImage = () => {
  // In a real app, you would use expo-image-picker or similar
  return 'https://images.unsplash.com/photo-1515073838964-4d4d56a58b21?w=900&auto=format&fit=crop&q=60';
};

interface CardData {
  frontContent: string;
  backContent: string;
  frontImage?: string;
  backImage?: string;
  frontFormatting: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
  backFormatting: {
    bold: boolean;
    italic: boolean;
    underline: boolean;
    fontSize: 'small' | 'medium' | 'large';
  };
}

const { width } = Dimensions.get('window');

const CreateCardScreen = () => {
  const router = useRouter();
  const [cardData, setCardData] = useState<CardData>({
    frontContent: '',
    backContent: '',
    frontFormatting: {
      bold: false,
      italic: false,
      underline: false,
      fontSize: 'medium',
    },
    backFormatting: {
      bold: false,
      italic: false,
      underline: false,
      fontSize: 'medium',
    },
  });
  
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
  const [showPreview, setShowPreview] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const flipAnimation = useRef(new Animated.Value(0)).current;
  
  const toggleFormatting = (side: 'front' | 'back', property: keyof CardData['frontFormatting']) => {
    setCardData(prev => ({
      ...prev,
      [`${side}Formatting`]: {
        ...prev[`${side}Formatting`],
        [property]: !prev[`${side}Formatting`][property]
      }
    }));
  };
  
  const setFontSize = (side: 'front' | 'back', size: 'small' | 'medium' | 'large') => {
    setCardData(prev => ({
      ...prev,
      [`${side}Formatting`]: {
        ...prev[`${side}Formatting`],
        fontSize: size
      }
    }));
  };
  
  const addImage = (side: 'front' | 'back') => {
    const imageUrl = selectImage();
    setCardData(prev => ({
      ...prev,
      [`${side}Image`]: imageUrl
    }));
  };
  
  const removeImage = (side: 'front' | 'back') => {
    setCardData(prev => {
      const newData = { ...prev };
      delete newData[`${side}Image`];
      return newData;
    });
  };
  
  const flipCard = () => {
    const toValue = activeSide === 'front' ? 1 : 0;
    
    Animated.timing(flipAnimation, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
    
    setActiveSide(activeSide === 'front' ? 'back' : 'front');
  };
  
  const getFontSize = (size: 'small' | 'medium' | 'large') => {
    switch (size) {
      case 'small': return 14;
      case 'large': return 24;
      default: return 18;
    }
  };
  
  const getFontWeight = (bold: boolean) => {
    return bold ? 'bold' : 'normal';
  };
  
  const getFontStyle = (italic: boolean) => {
    return italic ? 'italic' : 'normal';
  };
  
  const getTextDecorationLine = (underline: boolean) => {
    return underline ? 'underline' : 'none';
  };
  
  const saveCard = async () => {
    if (!cardData.frontContent.trim() || !cardData.backContent.trim()) {
      Alert.alert('Validation Error', 'Both front and back content are required');
      return;
    }
    
    setIsSaving(true);
    
    try {
      // In a real app, you would associate this with a specific deck
      const storedCards = await AsyncStorage.getItem('flashcards');
      const cards = storedCards ? JSON.parse(storedCards) : [];
      
      const newCard = {
        id: Date.now().toString(),
        front: cardData.frontContent,
        back: cardData.backContent,
        frontImage: cardData.frontImage,
        backImage: cardData.backImage,
        createdAt: new Date().toISOString(),
        deckId: 'default', // Would be associated with a specific deck in a real app
      };
      
      cards.push(newCard);
      await AsyncStorage.setItem('flashcards', JSON.stringify(cards));
      
      Alert.alert('Success', 'Card saved successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error saving card:', error);
      Alert.alert('Error', 'Failed to save card. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const currentFormatting = activeSide === 'front' 
    ? cardData.frontFormatting 
    : cardData.backFormatting;
    
  const currentContent = activeSide === 'front' 
    ? cardData.frontContent 
    : cardData.backContent;
    
  const currentImage = activeSide === 'front' 
    ? cardData.frontImage 
    : cardData.backImage;
  
  const rotateYFront = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  const rotateYBack = flipAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['-180deg', '0deg'],
  });

  const frontOpacity = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1, 0],
  });

  const backOpacity = flipAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1],
  });
  
  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-gray-900">
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View className="px-4 pt-6 pb-4 flex-row justify-between items-center">
        <TouchableOpacity 
          onPress={() => router.back()}
          className="flex-row items-center"
        >
          <ChevronLeft size={24} color="#3B82F6" />
          <Text className="ml-2 text-blue-500 font-medium">Back</Text>
        </TouchableOpacity>
        
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          Create Card
        </Text>
        
        <TouchableOpacity 
          onPress={saveCard}
          disabled={isSaving}
          className="flex-row items-center bg-blue-500 px-3 py-1.5 rounded-full"
        >
          <Save size={16} color="white" />
          <Text className="text-white ml-1 text-sm font-medium">
            {isSaving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView className="flex-1 px-4">
        {/* Preview Toggle */}
        <View className="flex-row justify-center mb-4">
          <TouchableOpacity 
            onPress={() => setShowPreview(!showPreview)}
            className="flex-row items-center bg-white dark:bg-gray-800 px-4 py-2 rounded-full shadow-sm"
          >
            {showPreview ? (
              <EyeOff size={18} color="#3B82F6" />
            ) : (
              <Eye size={18} color="#3B82F6" />
            )}
            <Text className="ml-2 text-blue-500 font-medium">
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Preview Section */}
        {showPreview ? (
          <View className="mb-6">
            <Text className="text-gray-500 dark:text-gray-400 mb-2 text-center">
              Card Preview
            </Text>
            
            <View className="relative w-full h-64">
              {/* Front of card */}
              <Animated.View
                className="absolute inset-0 bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 justify-center items-center border border-gray-200 dark:border-gray-700"
                style={[
                  styles.card,
                  {
                    transform: [{ rotateY: rotateYFront }],
                    opacity: frontOpacity,
                  },
                ]}
              >
                {cardData.frontImage ? (
                  <View className="w-full h-full justify-center items-center">
                    <View className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3 relative">
                      {/* Image placeholder */}
                      <View className="absolute inset-0 bg-gray-300 dark:bg-gray-600 rounded-lg" />
                      <TouchableOpacity 
                        onPress={() => removeImage('front')}
                        className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                      >
                        <X size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                    <Text 
                      className="text-gray-800 dark:text-gray-100 text-center"
                      style={{
                        fontSize: getFontSize(cardData.frontFormatting.fontSize),
                        fontWeight: getFontWeight(cardData.frontFormatting.bold),
                        fontStyle: getFontStyle(cardData.frontFormatting.italic),
                        textDecorationLine: getTextDecorationLine(cardData.frontFormatting.underline),
                      }}
                    >
                      {cardData.frontContent || 'Front content'}
                    </Text>
                  </View>
                ) : (
                  <Text 
                    className="text-gray-800 dark:text-gray-100 text-center"
                    style={{
                      fontSize: getFontSize(cardData.frontFormatting.fontSize),
                      fontWeight: getFontWeight(cardData.frontFormatting.bold),
                      fontStyle: getFontStyle(cardData.frontFormatting.italic),
                      textDecorationLine: getTextDecorationLine(cardData.frontFormatting.underline),
                    }}
                  >
                    {cardData.frontContent || 'Front content'}
                  </Text>
                )}
              </Animated.View>

              {/* Back of card */}
              <Animated.View
                className="absolute inset-0 bg-blue-50 dark:bg-blue-900/30 rounded-2xl shadow-lg p-6 justify-center items-center border border-blue-200 dark:border-blue-800"
                style={[
                  styles.card,
                  {
                    transform: [{ rotateY: rotateYBack }],
                    opacity: backOpacity,
                  },
                ]}
              >
                {cardData.backImage ? (
                  <View className="w-full h-full justify-center items-center">
                    <View className="w-full h-32 bg-gray-200 dark:bg-gray-700 rounded-lg mb-3 relative">
                      {/* Image placeholder */}
                      <View className="absolute inset-0 bg-gray-300 dark:bg-gray-600 rounded-lg" />
                      <TouchableOpacity 
                        onPress={() => removeImage('back')}
                        className="absolute top-1 right-1 bg-red-500 rounded-full p-1"
                      >
                        <X size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                    <Text 
                      className="text-gray-800 dark:text-gray-100 text-center"
                      style={{
                        fontSize: getFontSize(cardData.backFormatting.fontSize),
                        fontWeight: getFontWeight(cardData.backFormatting.bold),
                        fontStyle: getFontStyle(cardData.backFormatting.italic),
                        textDecorationLine: getTextDecorationLine(cardData.backFormatting.underline),
                      }}
                    >
                      {cardData.backContent || 'Back content'}
                    </Text>
                  </View>
                ) : (
                  <Text 
                    className="text-gray-800 dark:text-gray-100 text-center"
                    style={{
                      fontSize: getFontSize(cardData.backFormatting.fontSize),
                      fontWeight: getFontWeight(cardData.backFormatting.bold),
                      fontStyle: getFontStyle(cardData.backFormatting.italic),
                      textDecorationLine: getTextDecorationLine(cardData.backFormatting.underline),
                    }}
                  >
                    {cardData.backContent || 'Back content'}
                  </Text>
                )}
              </Animated.View>
            </View>
            
            <View className="mt-4 flex-row justify-center">
              <TouchableOpacity 
                onPress={flipCard}
                className="py-2 px-6 bg-blue-100 dark:bg-blue-900/50 rounded-full"
              >
                <Text className="text-blue-600 dark:text-blue-300 font-medium">
                  Flip Card
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
        
        {/* Card Side Selector */}
        <View className="flex-row mb-4 bg-white dark:bg-gray-800 rounded-xl p-1 shadow-sm">
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-lg items-center ${
              activeSide === 'front' 
                ? 'bg-blue-500' 
                : 'bg-transparent'
            }`}
            onPress={() => setActiveSide('front')}
          >
            <Text 
              className={
                activeSide === 'front' 
                  ? 'text-white font-medium' 
                  : 'text-gray-500 dark:text-gray-400'
              }
            >
              Front
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            className={`flex-1 py-3 rounded-lg items-center ${
              activeSide === 'back' 
                ? 'bg-blue-500' 
                : 'bg-transparent'
            }`}
            onPress={() => setActiveSide('back')}
          >
            <Text 
              className={
                activeSide === 'back' 
                  ? 'text-white font-medium' 
                  : 'text-gray-500 dark:text-gray-400'
              }
            >
              Back
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Formatting Toolbar */}
        <View className="mb-4 bg-white dark:bg-gray-800 rounded-xl p-3 shadow-sm">
          <Text className="text-gray-700 dark:text-gray-300 font-medium mb-2">
            Formatting
          </Text>
          
          <View className="flex-row justify-between mb-3">
            <TouchableOpacity 
              onPress={() => toggleFormatting(activeSide, 'bold')}
              className={`p-2 rounded-lg ${
                currentFormatting.bold 
                  ? 'bg-blue-100 dark:bg-blue-900/50' 
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              <Bold 
                size={20} 
                color={currentFormatting.bold ? '#3B82F6' : '#6B7280'} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => toggleFormatting(activeSide, 'italic')}
              className={`p-2 rounded-lg ${
                currentFormatting.italic 
                  ? 'bg-blue-100 dark:bg-blue-900/50' 
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              <Italic 
                size={20} 
                color={currentFormatting.italic ? '#3B82F6' : '#6B7280'} 
              />
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => toggleFormatting(activeSide, 'underline')}
              className={`p-2 rounded-lg ${
                currentFormatting.underline 
                  ? 'bg-blue-100 dark:bg-blue-900/50' 
                  : 'bg-gray-100 dark:bg-gray-700'
              }`}
            >
              <Underline 
                size={20} 
                color={currentFormatting.underline ? '#3B82F6' : '#6B7280'} 
              />
            </TouchableOpacity>
            
            <View className="flex-row bg-gray-100 dark:bg-gray-700 rounded-lg">
              <TouchableOpacity 
                onPress={() => setFontSize(activeSide, 'small')}
                className={`px-3 py-2 rounded-l-lg ${
                  currentFormatting.fontSize === 'small' 
                    ? 'bg-blue-100 dark:bg-blue-900/50' 
                    : ''
                }`}
              >
                <Text 
                  className={
                    currentFormatting.fontSize === 'small' 
                      ? 'text-blue-500 font-bold' 
                      : 'text-gray-500 dark:text-gray-400'
                  }
                  style={{ fontSize: 12 }}
                >
                  S
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setFontSize(activeSide, 'medium')}
                className={`px-3 py-2 ${
                  currentFormatting.fontSize === 'medium' 
                    ? 'bg-blue-100 dark:bg-blue-900/50' 
                    : ''
                }`}
              >
                <Text 
                  className={
                    currentFormatting.fontSize === 'medium' 
                      ? 'text-blue-500 font-bold' 
                      : 'text-gray-500 dark:text-gray-400'
                  }
                  style={{ fontSize: 16 }}
                >
                  M
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={() => setFontSize(activeSide, 'large')}
                className={`px-3 py-2 rounded-r-lg ${
                  currentFormatting.fontSize === 'large' 
                    ? 'bg-blue-100 dark:bg-blue-900/50' 
                    : ''
                }`}
              >
                <Text 
                  className={
                    currentFormatting.fontSize === 'large' 
                      ? 'text-blue-500 font-bold' 
                      : 'text-gray-500 dark:text-gray-400'
                  }
                  style={{ fontSize: 20 }}
                >
                  L
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <TouchableOpacity 
            onPress={() => addImage(activeSide)}
            className="flex-row items-center p-2 bg-gray-100 dark:bg-gray-700 rounded-lg"
          >
            <ImageIcon size={20} color="#6B7280" />
            <Text className="ml-2 text-gray-700 dark:text-gray-300">
              {currentImage ? 'Change Image' : 'Add Image'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Content Input */}
        <View className="mb-6">
          <Text className="text-gray-700 dark:text-gray-300 font-medium mb-2">
            {activeSide === 'front' ? 'Front Content' : 'Back Content'}
          </Text>
          
          <TextInput
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            placeholder={`Enter ${activeSide} content...`}
            placeholderTextColor="#9CA3AF"
            value={currentContent}
            onChangeText={(text) => {
              setCardData(prev => ({
                ...prev,
                [`${activeSide}Content`]: text
              }));
            }}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 text-gray-900 dark:text-white shadow-sm h-40"
            style={{
              fontSize: getFontSize(currentFormatting.fontSize),
              fontWeight: getFontWeight(currentFormatting.bold),
              fontStyle: getFontStyle(currentFormatting.italic),
              textDecorationLine: getTextDecorationLine(currentFormatting.underline),
            }}
          />
        </View>
        
        {/* Image Preview */}
        {currentImage ? (
          <View className="mb-6">
            <Text className="text-gray-700 dark:text-gray-300 font-medium mb-2">
              {activeSide === 'front' ? 'Front Image' : 'Back Image'}
            </Text>
            
            <View className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <View className="h-40 bg-gray-200 dark:bg-gray-700 rounded-lg relative">
                {/* Image placeholder */}
                <View className="absolute inset-0 bg-gray-300 dark:bg-gray-600 rounded-lg" />
                <TouchableOpacity 
                  onPress={() => removeImage(activeSide)}
                  className="absolute top-2 right-2 bg-red-500 rounded-full p-2"
                >
                  <X size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  card: {
    width: width * 0.85,
    backfaceVisibility: 'hidden',
    alignSelf: 'center',
  },
});

export default CreateCardScreen;