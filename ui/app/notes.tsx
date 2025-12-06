import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from 'react-native';
import {
  Search,
  Plus,
  BookOpen,
  Share2,
  Trash2,
  Edit3,
  Folder,
  X,
  MoreVertical,
  Bold,
  Italic,
  Underline,
  List,
  Hash,
  PenTool,
  Square,
  Circle,
  Type,
  Palette,
  Eraser,
  RotateCcw,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedGestureHandler,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

// Types
type Note = {
  id: string;
  title: string;
  content: string;
  subject: string;
  createdAt: string;
  updatedAt: string;
  drawings?: DrawingPath[]; // Added for storing drawings
};

type Subject = {
  id: string;
  name: string;
  color: string;
};

type DrawingPath = {
  id: string;
  points: Point[];
  color: string;
  strokeWidth: number;
};

type Point = {
  x: number;
  y: number;
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const NotesScreen = () => {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([
    {
      id: '1',
      title: 'Calculus Formulas',
      content: 'Derivatives: d/dx(x^n) = nx^(n-1)\nIntegrals: ∫x^n dx = x^(n+1)/(n+1) + C',
      subject: 'math',
      createdAt: '2023-05-15T10:30:00Z',
      updatedAt: '2023-05-15T10:30:00Z',
      drawings: [],
    },
    {
      id: '2',
      title: 'World War II Timeline',
      content: '1939: Germany invades Poland\n1940: Battle of Britain\n1941: Pearl Harbor attacked',
      subject: 'history',
      createdAt: '2023-05-14T14:20:00Z',
      updatedAt: '2023-05-14T14:20:00Z',
      drawings: [],
    },
    {
      id: '3',
      title: 'Photosynthesis Process',
      content: '6CO2 + 6H2O + light energy → C6H12O6 + 6O2\nOccurs in chloroplasts',
      subject: 'biology',
      createdAt: '2023-05-12T09:15:00Z',
      updatedAt: '2023-05-12T09:15:00Z',
      drawings: [],
    },
  ]);

  const [subjects] = useState<Subject[]>([
    { id: 'all', name: 'All Notes', color: '#8BC34A' },
    { id: 'math', name: 'Mathematics', color: '#FF9800' },
    { id: 'history', name: 'History', color: '#03A9F4' },
    { id: 'biology', name: 'Biology', color: '#4CAF50' },
    { id: 'literature', name: 'Literature', color: '#9C27B0' },
    { id: 'physics', name: 'Physics', color: '#FF5722' },
  ]);

  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreatingNote, setIsCreatingNote] = useState<boolean>(false);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    subject: 'math',
  });
  const [showFormattingToolbar, setShowFormattingToolbar] = useState<boolean>(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false); // New state for drawing mode
  
  // Drawing states
  const [currentColor, setCurrentColor] = useState<string>('#000000');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [drawingPaths, setDrawingPaths] = useState<DrawingPath[]>([]);
  const [tempPath, setTempPath] = useState<Point[]>([]);
  
  const contentRef = useRef<TextInput>(null);
  const drawingCanvasRef = useRef<View>(null);

  // Filter notes based on subject and search query
  const filteredNotes = notes.filter(note => {
    const matchesSubject = selectedSubject === 'all' || note.subject === selectedSubject;
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         note.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  // Get active note
  const activeNote = notes.find(note => note.id === activeNoteId) || null;

  // Create new note
  const createNote = () => {
    if (!newNote.title.trim()) {
      Alert.alert('Error', 'Please enter a title for your note');
      return;
    }

    const note: Note = {
      id: Math.random().toString(36).substring(7),
      title: newNote.title,
      content: newNote.content,
      subject: newNote.subject,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      drawings: [],
    };

    setNotes([note, ...notes]);
    setNewNote({ title: '', content: '', subject: 'math' });
    setIsCreatingNote(false);
  };

  // Update note
  const updateNote = () => {
    if (!activeNote) return;

    setNotes(notes.map(note => 
      note.id === activeNote.id 
        ? { ...note, content: activeNote.content, updatedAt: new Date().toISOString() } 
        : note
    ));
  };

  // Delete note
  const deleteNote = (id: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => setNotes(notes.filter(note => note.id !== id)) }
      ]
    );
  };

  // Share note
  const shareNote = (note: Note) => {
    Alert.alert(
      'Share Note',
      `Sharing "${note.title}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Copy to Clipboard', onPress: () => console.log('Copied to clipboard') },
        { text: 'Send via Email', onPress: () => console.log('Sending via email') },
      ]
    );
  };

  // Format text functions
  const insertFormatting = (format: string) => {
    if (!contentRef.current) return;

    const formattingMap: Record<string, string> = {
      bold: '**',
      italic: '*',
      underline: '__',
      list: '- ',
      heading: '# ',
    };

    const symbol = formattingMap[format] || '';
    
    if (activeNote) {
      const updatedContent = activeNote.content + symbol;
      setNotes(notes.map(note => 
        note.id === activeNote.id 
          ? { ...note, content: updatedContent } 
          : note
      ));
    }
  };

  // Drawing functions
  const handleDraw = (point: Point) => {
    setTempPath(prev => [...prev, point]);
  };

  const startDrawing = (point: Point) => {
    setTempPath([point]);
  };

  const endDrawing = () => {
    if (tempPath.length > 0) {
      const newPath: DrawingPath = {
        id: Math.random().toString(36).substring(7),
        points: [...tempPath],
        color: currentColor,
        strokeWidth: strokeWidth,
      };
      setDrawingPaths(prev => [...prev, newPath]);
      setTempPath([]);
    }
  };

  // Save drawing to note
  const saveDrawingToNote = () => {
    if (!activeNoteId) return;
    
    setNotes(notes.map(note => 
      note.id === activeNoteId 
        ? { ...note, drawings: [...(note.drawings || []), ...drawingPaths], updatedAt: new Date().toISOString() } 
        : note
    ));
    
    setDrawingPaths([]);
    setIsDrawingMode(false);
  };

  // Clear current drawing
  const clearDrawing = () => {
    setDrawingPaths([]);
    setTempPath([]);
  };

  // Render subject selector
  const renderSubjectSelector = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false}
      className="max-h-20 py-2 mb-4"
    >
      <View className="flex-row gap-2 px-4">
        {subjects.map(subject => (
          <TouchableOpacity
            key={subject.id}
            className={`px-4 py-2 rounded-full flex-row items-center ${
              selectedSubject === subject.id 
                ? 'bg-blue-100 border-2 border-blue-500' 
                : 'bg-white border border-gray-200'
            }`}
            onPress={() => setSelectedSubject(subject.id)}
          >
            <View 
              className="w-3 h-3 rounded-full mr-2" 
              style={{ backgroundColor: subject.color }}
            />
            <Text 
              className={`font-medium ${
                selectedSubject === subject.id 
                  ? 'text-blue-700' 
                  : 'text-gray-700'
              }`}
            >
              {subject.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );

  // Render note item
  const renderNoteItem = ({ item }: { item: Note }) => {
    const subject = subjects.find(s => s.id === item.subject) || subjects[0];
    
    return (
      <TouchableOpacity
        className="bg-white rounded-xl p-4 mb-3 shadow-sm border border-gray-100"
        onPress={() => setActiveNoteId(item.id)}
      >
        <View className="flex-row justify-between items-start">
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <View 
                className="w-2 h-2 rounded-full mr-2" 
                style={{ backgroundColor: subject.color }}
              />
              <Text className="text-xs text-gray-500">{subject.name}</Text>
            </View>
            <Text className="font-bold text-gray-800 text-lg mb-1">{item.title}</Text>
            <Text 
              className="text-gray-600 text-sm mb-2" 
              numberOfLines={2}
            >
              {item.content}
            </Text>
            <Text className="text-xs text-gray-400">
              {new Date(item.updatedAt).toLocaleDateString()}
            </Text>
          </View>
          
          <View className="flex-row">
            <TouchableOpacity 
              className="p-2"
              onPress={() => shareNote(item)}
            >
              <Share2 size={18} color="#6B7280" />
            </TouchableOpacity>
            <TouchableOpacity 
              className="p-2"
              onPress={() => deleteNote(item.id)}
            >
              <Trash2 size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Render drawing toolbar
  const renderDrawingToolbar = () => (
    <View className="absolute bottom-4 left-0 right-0">
      <View className="bg-white mx-4 rounded-xl shadow-lg p-3">
        {/* Color picker */}
        <View className="flex-row justify-between mb-3">
          {['#000000', '#FF0000', '#0000FF', '#00FF00', '#FFA500'].map(color => (
            <TouchableOpacity
              key={color}
              className="w-8 h-8 rounded-full border-2 border-gray-300"
              style={{ backgroundColor: color }}
              onPress={() => setCurrentColor(color)}
            >
              {currentColor === color && (
                <View className="w-4 h-4 rounded-full bg-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              )}
            </TouchableOpacity>
          ))}
        </View>
        
        {/* Brush size and tools */}
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <TouchableOpacity
              className="p-2"
              onPress={() => setStrokeWidth(Math.max(1, strokeWidth - 1))}
            >
              <Text className="text-gray-700">-</Text>
            </TouchableOpacity>
            
            <View 
              className="mx-2 rounded-full bg-gray-300"
              style={{ 
                width: strokeWidth * 4, 
                height: strokeWidth * 4 
              }}
            />
            
            <TouchableOpacity
              className="p-2"
              onPress={() => setStrokeWidth(Math.min(20, strokeWidth + 1))}
            >
              <Text className="text-gray-700">+</Text>
            </TouchableOpacity>
          </View>
          
          <View className="flex-row">
            <TouchableOpacity
              className="p-2 mx-1"
              onPress={clearDrawing}
            >
              <RotateCcw size={20} color="#4B5563" />
            </TouchableOpacity>
            
            <TouchableOpacity
              className="p-2 mx-1"
              onPress={() => setCurrentColor('#FFFFFF')} // Simple eraser
            >
              <Eraser size={20} color="#4B5563" />
            </TouchableOpacity>
            
            <TouchableOpacity
              className="p-2 mx-1 bg-blue-500 rounded-lg"
              onPress={saveDrawingToNote}
            >
              <Text className="text-white font-bold">Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  // Render drawing canvas
  const renderDrawingCanvas = () => (
    <View className="flex-1">
      <GestureHandlerRootView className="flex-1">
        <PanGestureHandler
          onGestureEvent={(event) => {
            const { absoluteX, absoluteY } = event.nativeEvent;
            drawingCanvasRef.current?.measure((x, y, width, height, pageX, pageY) => {
              const point: Point = {
                x: absoluteX - pageX,
                y: absoluteY - pageY,
              };
              handleDraw(point);
            });
          }}
          onBegan={(event) => {
            const { absoluteX, absoluteY } = event.nativeEvent;
            drawingCanvasRef.current?.measure((x, y, width, height, pageX, pageY) => {
              const point: Point = {
                x: absoluteX - pageX,
                y: absoluteY - pageY,
              };
              startDrawing(point);
            });
          }}
          onEnded={endDrawing}
        >
          <View 
            ref={drawingCanvasRef}
            className="flex-1 bg-white"
          >
            {/* Existing drawings */}
            {activeNote?.drawings?.map(drawing => (
              <View key={drawing.id} className="absolute inset-0">
                {drawing.points.map((point, index) => {
                  if (index === 0) return null;
                  const prevPoint = drawing.points[index - 1];
                  return (
                    <View
                      key={`${drawing.id}-${index}`}
                      className="absolute"
                      style={{
                        left: prevPoint.x,
                        top: prevPoint.y,
                        width: Math.abs(point.x - prevPoint.x) || 1,
                        height: Math.abs(point.y - prevPoint.y) || 1,
                        backgroundColor: drawing.color,
                        borderRadius: drawing.strokeWidth,
                      }}
                    />
                  );
                })}
              </View>
            ))}
            
            {/* Current drawing path */}
            <View className="absolute inset-0">
              {[...drawingPaths, { id: 'temp', points: tempPath, color: currentColor, strokeWidth }].map(path => (
                path.points.map((point, index) => {
                  if (index === 0) return null;
                  const prevPoint = path.points[index - 1];
                  return (
                    <View
                      key={`${path.id}-${index}`}
                      className="absolute"
                      style={{
                        left: prevPoint.x,
                        top: prevPoint.y,
                        width: Math.abs(point.x - prevPoint.x) || 1,
                        height: Math.abs(point.y - prevPoint.y) || 1,
                        backgroundColor: path.color,
                        borderRadius: path.strokeWidth,
                      }}
                    />
                  );
                })
              ))}
            </View>
          </View>
        </PanGestureHandler>
      </GestureHandlerRootView>
      
      {renderDrawingToolbar()}
    </View>
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-2xl font-bold text-gray-800">My Notes</Text>
          <TouchableOpacity 
            className="bg-blue-500 p-2 rounded-full"
            onPress={() => setIsCreatingNote(true)}
          >
            <Plus size={20} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Search Bar */}
        <View className="flex-row items-center bg-gray-100 rounded-full px-4 py-2 mb-2">
          <Search size={20} color="#9CA3AF" />
          <TextInput
            className="flex-1 ml-2 bg-transparent"
            placeholder="Search notes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Subject Selector */}
      {renderSubjectSelector()}

      {/* Notes List */}
      <FlatList
        data={filteredNotes}
        renderItem={renderNoteItem}
        keyExtractor={item => item.id}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-20">
            <Folder size={48} color="#D1D5DB" />
            <Text className="text-gray-500 mt-4 text-center">
              {searchQuery 
                ? 'No notes found matching your search' 
                : 'No notes yet. Create your first note!'}
            </Text>
            <TouchableOpacity 
              className="mt-4 bg-blue-500 py-2 px-4 rounded-lg"
              onPress={() => setIsCreatingNote(true)}
            >
              <Text className="text-white font-medium">Create Note</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Create Note Modal */}
      <Modal
        visible={isCreatingNote}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-white"
        >
          <View className="pt-12 pb-4 px-4 bg-blue-600">
            <View className="flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold">New Note</Text>
              <TouchableOpacity 
                onPress={() => setIsCreatingNote(false)}
              >
                <X color="white" size={24} />
              </TouchableOpacity>
            </View>
          </View>
          
          <ScrollView className="flex-1 p-4">
            <View className="mb-4">
              <Text className="font-medium mb-2">Title *</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3"
                placeholder="Note title"
                value={newNote.title}
                onChangeText={(text) => setNewNote({...newNote, title: text})}
              />
            </View>
            
            <View className="mb-4">
              <Text className="font-medium mb-2">Subject</Text>
              <View className="border border-gray-300 rounded-lg">
                {subjects.slice(1).map(subject => (
                  <TouchableOpacity
                    key={subject.id}
                    className={`flex-row items-center p-3 border-b border-gray-200 ${
                      newNote.subject === subject.id ? 'bg-blue-50' : ''
                    }`}
                    onPress={() => setNewNote({...newNote, subject: subject.id})}
                  >
                    <View 
                      className="w-3 h-3 rounded-full mr-3" 
                      style={{ backgroundColor: subject.color }}
                    />
                    <Text 
                      className={
                        newNote.subject === subject.id 
                          ? 'font-bold text-blue-700' 
                          : 'text-gray-700'
                      }
                    >
                      {subject.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View className="mb-4">
              <Text className="font-medium mb-2">Content</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 h-40"
                placeholder="Start writing your note..."
                value={newNote.content}
                onChangeText={(text) => setNewNote({...newNote, content: text})}
                multiline
                textAlignVertical="top"
              />
            </View>
          </ScrollView>
          
          <View className="p-4 border-t border-gray-200">
            <TouchableOpacity 
              className="bg-blue-500 py-3 rounded-lg items-center"
              onPress={createNote}
            >
              <Text className="text-white font-bold text-lg">Create Note</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Note Editor Modal */}
      <Modal
        visible={!!activeNoteId}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-white"
        >
          <View className="pt-12 pb-4 px-4 bg-blue-600">
            <View className="flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold">
                {activeNote?.title || 'Edit Note'}
              </Text>
              <View className="flex-row">
                {!isDrawingMode && (
                  <TouchableOpacity 
                    className="mr-3"
                    onPress={() => setIsDrawingMode(true)}
                  >
                    <PenTool color="white" size={24} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  className="mr-3"
                  onPress={() => activeNote && shareNote(activeNote)}
                >
                  <Share2 color="white" size={24} />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => {
                    setIsDrawingMode(false);
                    setActiveNoteId(null);
                  }}
                >
                  <X color="white" size={24} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          {isDrawingMode ? (
            renderDrawingCanvas()
          ) : activeNote ? (
            <>
              <View className="flex-row items-center px-4 py-2 border-b border-gray-200">
                <View 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ 
                    backgroundColor: subjects.find(s => s.id === activeNote.subject)?.color || '#8BC34A' 
                  }}
                />
                <Text className="text-gray-600">
                  {subjects.find(s => s.id === activeNote.subject)?.name || 'Unknown'}
                </Text>
                <Text className="text-gray-400 text-xs ml-auto">
                  Edited {new Date(activeNote.updatedAt).toLocaleDateString()}
                </Text>
              </View>
              
              <ScrollView className="flex-1">
                <TextInput
                  ref={contentRef}
                  className="p-4 text-lg"
                  value={activeNote.content}
                  onChangeText={(text) => {
                    setNotes(notes.map(note => 
                      note.id === activeNote.id 
                        ? { ...note, content: text } 
                        : note
                    ));
                  }}
                  multiline
                  textAlignVertical="top"
                  placeholder="Start typing your note..."
                  onFocus={() => setShowFormattingToolbar(true)}
                  onBlur={() => setShowFormattingToolbar(false)}
                />
                
                {/* Display saved drawings */}
                {activeNote.drawings && activeNote.drawings.length > 0 && (
                  <View className="p-4">
                    <Text className="font-bold text-gray-700 mb-2">Drawings:</Text>
                    <View className="h-40 bg-gray-100 rounded-lg relative">
                      {activeNote.drawings.map(drawing => (
                        <View key={drawing.id} className="absolute inset-0">
                          {drawing.points.map((point, index) => {
                            if (index === 0) return null;
                            const prevPoint = drawing.points[index - 1];
                            return (
                              <View
                                key={`${drawing.id}-${index}`}
                                className="absolute"
                                style={{
                                  left: prevPoint.x * 0.3, // Scale down for preview
                                  top: prevPoint.y * 0.3,
                                  width: (Math.abs(point.x - prevPoint.x) || 1) * 0.3,
                                  height: (Math.abs(point.y - prevPoint.y) || 1) * 0.3,
                                  backgroundColor: drawing.color,
                                  borderRadius: drawing.strokeWidth * 0.3,
                                }}
                              />
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </ScrollView>
              
              {showFormattingToolbar && (
                <View className="absolute bottom-4 right-4">
                  <View className="bg-white rounded-full shadow-lg flex-row">
                    <TouchableOpacity 
                      className="p-3 border-r border-gray-200"
                      onPress={() => insertFormatting('bold')}
                    >
                      <Bold size={20} color="#4B5563" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="p-3 border-r border-gray-200"
                      onPress={() => insertFormatting('italic')}
                    >
                      <Italic size={20} color="#4B5563" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="p-3 border-r border-gray-200"
                      onPress={() => insertFormatting('underline')}
                    >
                      <Underline size={20} color="#4B5563" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="p-3 border-r border-gray-200"
                      onPress={() => insertFormatting('list')}
                    >
                      <List size={20} color="#4B5563" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      className="p-3"
                      onPress={() => insertFormatting('heading')}
                    >
                      <Hash size={20} color="#4B5563" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

export default NotesScreen;