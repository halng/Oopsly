import { createShelf, deleteShelf, fetchShelves } from "@/services/ShelfService";
import { createSubject } from "@/services/SubjectService";
import { Shelf } from "@/types/Shelf";
import { SubjectStats } from "@/types/Subject";
import { Logger } from "@/utils";
import { useRouter } from "expo-router";
import {
  Bookmark,
  BookOpen,
  Calendar,
  Camera,
  CheckSquare,
  Code,
  Coffee,
  Database,
  Delete,
  Flame,
  Gift,
  Globe,
  Heart,
  Languages,
  Music,
  PlusCircle,
  Smile,
  Star,
  StickyNote,
  Target,
  Trophy,
  Umbrella,
  User,
  X,
  Zap,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const availableIcons = [
  { name: "Code", component: Code, color: "#4F46E5" },
  { name: "Languages", component: Languages, color: "#10B981" },
  { name: "BookOpen", component: BookOpen, color: "#EF4444" },
  { name: "Database", component: Database, color: "#8B5CF6" },
  { name: "Heart", component: Heart, color: "#EC4899" },
  { name: "Star", component: Star, color: "#F59E0B" },
  { name: "Zap", component: Zap, color: "#FBBF24" },
  { name: "Trophy", component: Trophy, color: "#F97316" },
  { name: "Target", component: Target, color: "#06B6D4" },
  { name: "Bookmark", component: Bookmark, color: "#3B82F6" },
  { name: "Coffee", component: Coffee, color: "#92400E" },
  { name: "Music", component: Music, color: "#9333EA" },
  { name: "Camera", component: Camera, color: "#14B8A6" },
  { name: "Globe", component: Globe, color: "#0EA5E9" },
  { name: "Umbrella", component: Umbrella, color: "#6366F1" },
  { name: "Gift", component: Gift, color: "#EC4899" },
  { name: "Smile", component: Smile, color: "#F59E0B" },
  { name: "User", component: User, color: "#3B82F6" },
];

const OopslyApp = () => {
  const logger = Logger.extend("OopslyApp");
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [shelfName, setShelfName] = useState("");
  const [shelfDescription, setShelfDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(availableIcons[0]);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [shelves, setShelves] = useState<Shelf[]>();

  // New state for add content modal
  const [addContentModalVisible, setAddContentModalVisible] = useState(false);
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [contentTypeModalVisible, setContentTypeModalVisible] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState<
    "test" | "subject" | "delete" | null
  >(null);
  const [contentName, setContentName] = useState("");
  const [contentDescription, setContentDescription] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deletedModalVisible, setDeletedModalVisible] = useState(false);

  const fetchShelvesData = () => {
    fetchShelves({
      page: 0,
      size: 100,
    })
      .then((response) => {
        if (response.isSuccess) {
          setShelves(response.data.entities);
        } else {
          console.error("Failed to fetch shelves:", response.message);
        }
      })
      .catch((error) => {
        console.error("Error fetching shelves:", error);
      });
  };

  useEffect(() => {
    logger.debug("Fetching shelves data on component mount");
    fetchShelvesData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle shelf creation
  const handleCreateShelf = () => {
    logger.debug("Creating shelf with name:", shelfName);
    if (shelfName.trim() === "") {
      logger.warn("Shelf name is empty");
      alert("Please enter a shelf name");
      return;
    }

    createShelf({
      icon: selectedIcon.name,
      name: shelfName,
      description: shelfDescription,
    })
      .then((response) => {
        if (response.isSuccess) {
          logger.debug("Shelf created successfully:", response);
          fetchShelvesData();
        } else {
          logger.error("Failed to create shelf:", response);
        }
      })
      .catch((error) => {
        logger.error("Error creating shelf:", error);
      });

    // Reset form and close modal
    setShelfName("");
    setShelfDescription("");
    setSelectedIcon(availableIcons[0]);
    setModalVisible(false);
  };

  // Open content type selection modal
  const openContentTypeModal = (shelfId: string) => {
    setSelectedShelfId(shelfId);
    setContentTypeModalVisible(true);
  };

  // Handle content type selection
  const handleContentTypeSelect = (type: "test" | "subject" | "delete") => {
    setSelectedContentType(type);
    setContentTypeModalVisible(false);
    if (type === "delete") {
      setDeletedModalVisible(true);
    } else {
      setAddContentModalVisible(true);
    }
  };

  // Handle content creation
  const handleCreateContent = () => {
    if (contentName.trim() === "") {
      logger.warn("Content name is empty");
      alert(`Please enter a ${selectedContentType} name`);
      return;
    }

    if (selectedContentType === "subject" && selectedShelfId) {
      createSubject(selectedShelfId, {
        name: contentName,
        description: contentDescription,
      })
        .then((response) => {
          if (response.isSuccess) {
            logger.debug("Subject created successfully:", response);
          fetchShelvesData();
          }
          
        })
        .catch((error) => {
          logger.error("Error creating subject:", error);
        });
    }
    // Reset form and close modal
    setContentName("");
    setContentDescription("");
    setAddContentModalVisible(false);
    setSelectedContentType(null);
    setSelectedShelfId(null);

  };

  const handleDeleteShelf = () => {
    if (selectedShelfId && selectedContentType === "delete") {
      deleteShelf(selectedShelfId).then((response) => {
        if (response.isSuccess) {
          logger.debug("Shelf deleted successfully:", response);
          fetchShelvesData();
        } else {
          logger.error("Failed to delete shelf:", response.message);
        }}
      ).catch((error) => {
        logger.error("Error deleting shelf:", error);
      });

      // Reset state and close modal
      setSelectedShelfId(null);
      setConfirmText("");
      setDeletedModalVisible(false);
    }
  }

  const getShelfName = (shelfId: string) => {
    const shelf = shelves?.find((s) => s.id === shelfId);
    return shelf ? shelf.name : "";
  };

  const isDisable = (): boolean => {
    if (selectedContentType !== "delete") {
      return true;
    }

    return !(confirmText && confirmText.trim().toLowerCase() === "confirm");
  };

  // Render subject cards horizontally
  const renderSubjectCards = (subjects: SubjectStats[], shelfId: string) => {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="max-h-40"
        testID={`subject-scroll-view-${shelfId}`}
      >
        <View className="flex-row gap-4 px-4 pb-2">
          {subjects.map((subject) => (
            <TouchableOpacity
              key={subject.id}
              className="bg-white rounded-xl p-4 w-60 shadow-sm border border-gray-100"
              onPress={() => router.push(`${shelfId}/view/${subject.id}`)}
              testID={`subject-card-${subject.id}`}
            >
              <View className="flex-row justify-between items-start mb-2">
                <Text className="font-bold text-gray-800 text-lg" testID={`subject-name-text-${subject.id}`}>
                  {subject.name}
                </Text>
                <View className="bg-blue-50 rounded-full px-2 py-1">
                  <Text className="text-blue-600 text-xs font-semibold" testID={`subject-due-text-${subject.id}`}>
                    {subject.overdue} due
                  </Text>
                </View>
              </View>

              <View className="mt-2">
                <View className="flex-row items-center">
                  <View className="flex-1 bg-gray-200 rounded-full h-2">
                    <View
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${subject.completedPercent ? subject.completedPercent : 0}%`,
                      }}
                      testID={`subject-progress-bar-${subject.id}`}
                    />
                  </View>
                  <Text className="text-gray-500 text-xs ml-2" testID={`subject-progress-text-${subject.id}`}>
                    {subject.completedPercent ? subject.completedPercent : 0}%
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
          {/* Add Placeholder Manage Shelf Card */}
          <TouchableOpacity
            className="bg-white rounded-xl p-4 w-60 shadow-sm border-2 border-dashed border-gray-300 justify-center items-center"
            onPress={() => openContentTypeModal(shelfId)}
            testID={`manage-shelf-button-${shelfId}`}
          >
            <View className="mb-1">
              <Text className="text-gray-600 font-semibold" testID={`manage-shelf-title-text-${shelfId}`}>Management</Text>
              <Text className="text-gray-400 text-xs mt-1" testID={`manage-shelf-subtitle-text-${shelfId}`}>Tap to manage</Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderIconComponent = (iconName: string) => {
    const icon = availableIcons.find(
      (icon) => icon.name.toLowerCase() === iconName.toLowerCase(),
    );
    return icon
      ? React.createElement(icon.component, { size: 20, color: icon.color })
      : null;
  };

  return (
    <View className="flex-1 bg-gray-50" testID="home-container">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm" testID="header-container">
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center mr-3">
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8dXNlcnxlbnwwfHwwfHx8MA%3D%3D",
                }}
                className="w-8 h-8 rounded-full"
                testID="user-avatar"
              />
            </View>
            <Text className="text-2xl font-bold text-gray-800" testID="app-title-text">Oopsly</Text>
          </View>

          <View className="flex-row items-center bg-orange-50 px-3 py-1 rounded-full" testID="streak-container">
            <Flame size={16} color="#EA580C" fill="#EA580C" />
            <Text className="ml-1 font-bold text-orange-700" testID="streak-count-text">7</Text>
          </View>
        </View>

        {/* Motivational Quote */}
        <View className="mt-4 p-4 bg-indigo-50 rounded-xl" testID="quote-container">
          <Text className="text-indigo-800 text-lg font-medium italic text-center" testID="quote-text">
            "The expert in anything was once a beginner."
          </Text>
          <Text className="text-indigo-600 text-sm text-center mt-1" testID="quote-author-text">
            - Helen Hayes
          </Text>
        </View>

        {/* Navigation Menu - Reordered with Create Shelf first */}
        <View className="flex-row justify-around mt-4 pt-3 border-t border-gray-100" testID="navigation-menu">
          <TouchableOpacity
            className="items-center"
            onPress={() => setModalVisible(true)}
            testID="create-shelf-button"
          >
            <View className="bg-indigo-100 p-3 rounded-full mb-1">
              <PlusCircle size={24} color="#4F46E5" />
            </View>
            <Text className="text-xs text-gray-600" testID="create-shelf-label-text">Create Shelf</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center"
            onPress={() => router.push("/tasks-list")}
            testID="tasks-button"
          >
            <View className="bg-blue-100 p-3 rounded-full mb-1">
              <CheckSquare size={24} color="#3B82F6" />
            </View>
            <Text className="text-xs text-gray-600" testID="tasks-label-text">Tasks</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center"
            onPress={() => router.push("/notes")}
            testID="notes-button"
          >
            <View className="bg-green-100 p-3 rounded-full mb-1">
              <StickyNote size={24} color="#10B981" />
            </View>
            <Text className="text-xs text-gray-600" testID="notes-label-text">Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center"
            onPress={() => router.push("/study-planner")}
            testID="planner-button"
          >
            <View className="bg-purple-100 p-3 rounded-full mb-1">
              <Calendar size={24} color="#8B5CF6" />
            </View>
            <Text className="text-xs text-gray-600" testID="planner-label-text">Planner</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView className="flex-1" testID="shelves-scroll-view">
        {Array.from(shelves ?? []).map((shelf) => (
          <View key={shelf.id} className="mb-6" testID={`shelf-item-${shelf.id}`}>
            <View className="flex-row items-center px-4 mb-3 mt-2" testID={`shelf-header-${shelf.id}`}>
              <View className="mr-2">{renderIconComponent(shelf.icon)}</View>

              <Text className="text-lg font-bold text-gray-800" testID={`shelf-name-text-${shelf.id}`}>
                {shelf.name}
              </Text>
            </View>

            {renderSubjectCards(shelf.subjects, shelf.id)}
          </View>
        ))}

        <View className="h-24" />
      </ScrollView>

      {/* Create Shelf Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
        testID="create-shelf-modal"
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => setModalVisible(false)}
          testID="create-shelf-modal-overlay"
        >
          <Pressable
            className="bg-white rounded-2xl w-full max-w-md"
            onPress={(e) => e.stopPropagation()}
            testID="create-shelf-modal-content"
          >
            {/* Modal Header */}
            <View className="flex-row justify-between items-center p-6 pb-4 border-b border-gray-100">
              <Text className="text-xl font-bold text-gray-800" testID="create-shelf-modal-title-text">
                Create New Shelf
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="p-1"
                testID="create-shelf-modal-close-button"
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-6 py-4" style={{ maxHeight: 500 }}>
              {/* Icon Selector */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-3">Icon</Text>
                <TouchableOpacity
                  className="flex-row items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200"
                  onPress={() => setShowIconPicker(!showIconPicker)}
                  testID="icon-selector-button"
                >
                  <View className="flex-row items-center">
                    {React.createElement(selectedIcon.component, {
                      size: 24,
                      color: selectedIcon.color,
                    })}
                    <Text className="text-gray-800 ml-3 font-medium">
                      {selectedIcon.name}
                    </Text>
                  </View>
                  <Text className="text-gray-400" testID="icon-selector-hint-text">Tap to change</Text>
                </TouchableOpacity>

                {/* Icon Picker Grid */}
                {showIconPicker && (
                  <View className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <View className="flex-row flex-wrap gap-2">
                      {availableIcons.map((icon, index) => (
                        <TouchableOpacity
                          key={index}
                          className={`p-3 rounded-lg ${
                            selectedIcon.name === icon.name
                              ? "bg-indigo-100 border-2 border-indigo-500"
                              : "bg-white border border-gray-200"
                          }`}
                          onPress={() => {
                            setSelectedIcon(icon);
                            setShowIconPicker(false);
                          }}
                        >
                          {React.createElement(icon.component, {
                            size: 24,
                            color: icon.color,
                          })}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
              </View>

              {/* Name Input */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-3">Name</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
                  placeholder="Enter shelf name"
                  placeholderTextColor="#9CA3AF"
                  value={shelfName}
                  onChangeText={setShelfName}
                  testID="shelf-name-input"
                />
              </View>

              {/* Description Input */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-3">
                  Description
                </Text>
                <TextInput
                  className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
                  placeholder="Enter shelf description (optional)"
                  placeholderTextColor="#9CA3AF"
                  value={shelfDescription}
                  onChangeText={setShelfDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={{ minHeight: 100 }}
                  testID="shelf-description-input"
                />
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3 mt-2">
                <TouchableOpacity
                  className="flex-1 bg-gray-200 rounded-xl py-4 items-center"
                  onPress={() => setModalVisible(false)}
                  testID="create-shelf-cancel-button"
                >
                  <Text className="text-gray-700 font-bold">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 bg-indigo-600 rounded-xl py-4 items-center"
                  onPress={handleCreateShelf}
                  testID="create-shelf-submit-button"
                >
                  <Text className="text-white font-bold">Create Shelf</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Content Type Selection Modal (Step 1) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={contentTypeModalVisible}
        onRequestClose={() => setContentTypeModalVisible(false)}
        testID="content-type-modal"
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => setContentTypeModalVisible(false)}
        >
          <Pressable
            className="bg-white rounded-2xl w-full max-w-md p-6"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-xl font-bold text-gray-800">
                What would you like to do?
              </Text>
              <TouchableOpacity
                onPress={() => setContentTypeModalVisible(false)}
                className="p-1"
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text className="text-gray-600 mb-6">
              Choose the action you want to do under this shelf.
            </Text>

            {/* Test Option */}
            <TouchableOpacity
              className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-5 mb-4 border-2 border-blue-200"
              onPress={() => handleContentTypeSelect("test")}
            >
              <View className="flex-row items-center">
                <View className="bg-blue-500 rounded-full p-3 mr-4">
                  <CheckSquare size={28} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-800 font-bold text-lg mb-1">
                    Create Test
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    Create a test with multiple questions and answers
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Subject Option */}
            <TouchableOpacity
              className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-5 mb-4 border-2 border-purple-200"
              onPress={() => handleContentTypeSelect("subject")}
            >
              <View className="flex-row items-center">
                <View className="bg-purple-500 rounded-full p-3 mr-4">
                  <BookOpen size={28} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-800 font-bold text-lg mb-1">
                    Create Subject
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    Create a subject to organize related content
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Delete option */}
            <TouchableOpacity
              className="bg-gradient-to-r from-red-50 to-red-100 rounded-xl p-5 border-2 border-red-200"
              onPress={() => handleContentTypeSelect("delete")}
            >
              <View className="flex-row items-center">
                <View className="bg-red-500 rounded-full p-3 mr-4">
                  <Delete size={28} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-800 font-bold text-lg mb-1">
                    Delete Shelf
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    Delete a shelf and all its contents
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Content Modal (Step 2) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={addContentModalVisible}
        onRequestClose={() => setAddContentModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => setAddContentModalVisible(false)}
        >
          <Pressable
            className="bg-white rounded-2xl w-full max-w-md"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View className="flex-row justify-between items-center p-6 pb-4 border-b border-gray-100">
              <Text className="text-xl font-bold text-gray-800">
                Create New {selectedContentType === "test" ? "Test" : "Subject"}
              </Text>
              <TouchableOpacity
                onPress={() => setAddContentModalVisible(false)}
                className="p-1"
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="px-6 py-4">
              {/* Name Input */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-3">Name</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
                  placeholder={`Enter ${selectedContentType} name`}
                  placeholderTextColor="#9CA3AF"
                  value={contentName}
                  onChangeText={setContentName}
                />
              </View>

              {/* Description Input */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-3">
                  Description
                </Text>
                <TextInput
                  className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
                  placeholder={`Enter ${selectedContentType} description (optional)`}
                  placeholderTextColor="#9CA3AF"
                  value={contentDescription}
                  onChangeText={setContentDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={{ minHeight: 100 }}
                />
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3 mt-2">
                <TouchableOpacity
                  className="flex-1 bg-gray-200 rounded-xl py-4 items-center"
                  onPress={() => {
                    setAddContentModalVisible(false);
                    setContentName("");
                    setContentDescription("");
                  }}
                >
                  <Text className="text-gray-700 font-bold">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-1 bg-indigo-600 rounded-xl py-4 items-center"
                  onPress={handleCreateContent}
                >
                  <Text className="text-white font-bold">Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirm delete selected shelf */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deletedModalVisible}
        onRequestClose={() => setDeletedModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => setDeletedModalVisible(false)}
        >
          <Pressable
            className="bg-white rounded-2xl w-full max-w-md"
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View className="flex-row justify-between items-center p-6 pb-4 border-b border-gray-100">
              <Text className="text-xl font-bold text-gray-800">
                Permanently Delete Shelf{" "}
                <Text className="italic">{getShelfName(selectedShelfId!)}</Text>
              </Text>
              <TouchableOpacity
                onPress={() => setDeletedModalVisible(false)}
                className="p-1"
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View className="px-6 py-4">
              {/* Name Input */}
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-3">
                  Warning: You are about to delete {getShelfName(selectedShelfId!)}. This will wipe all associated data, including subjects and test history. You will not be able to recover this information
                </Text>
                <TextInput
                  className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
                  placeholder={`Enter Confirm to delete`}
                  placeholderTextColor="#9CA3AF"
                  value={confirmText}
                  onChangeText={setConfirmText}
                />
              </View>

              {/* Action Buttons */}
              <View className="flex-row gap-3 mt-2">
                <TouchableOpacity
                  className="flex-1 bg-gray-200 rounded-xl py-4 items-center"
                  onPress={() => {
                    setDeletedModalVisible(false);
                    setConfirmText("");
                  }}
                >
                  <Text className="text-gray-700 font-bold">Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-1 ${isDisable() ? "bg-red-400" : "bg-red-500"} rounded-xl py-4 items-center`}
                  onPress={handleDeleteShelf}
                  disabled={isDisable()}
                >
                  <Text className="text-white font-bold">
                    Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default OopslyApp;
