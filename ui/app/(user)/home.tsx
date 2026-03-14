import { useShelves, useCreateShelf, useUpdateShelf, useDeleteShelf } from "@/hooks/queries/useShelves";
import { useCreateSubject } from "@/hooks/queries/useSubjects";
import { useCreateTestSuite, useDeleteTestSuite, useTestSuites } from "@/hooks/queries/useTestSuites";
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
  Edit3,
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


const ShelfTestSuites = ({ shelfId, openDeleteTestSuiteModal }: { shelfId: string, openDeleteTestSuiteModal: (s: string, t: string) => void }) => {
  const router = useRouter();
  const { data: testSuitesData } = useTestSuites(shelfId);
  const testSuites = testSuitesData ?? [];
  if (testSuites.length === 0) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
      <View className="flex-row gap-4 px-4 pb-2">
        {testSuites.map((ts) => (
          <TouchableOpacity
            key={ts.id}
            className="bg-emerald-50 rounded-xl p-4 w-60 shadow-sm border border-emerald-100"
            onPress={() => router.push(`/test-suite/${ts.id}?shelfId=${shelfId}&title=${encodeURIComponent(ts.title)}`)}
          >
            <View className="flex-row justify-between items-start mb-2">
              <Text className="font-bold text-emerald-900 text-lg flex-1 mr-2" numberOfLines={1}>
                {ts.title}
              </Text>
              <View className="bg-emerald-200 rounded-full px-2 py-1">
                <Text className="text-emerald-800 text-xs font-semibold">
                  Test Suite
                </Text>
              </View>
            </View>

            <View className="mt-2 flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Text className="text-emerald-700 text-sm font-medium mr-1">View Details</Text>
              </View>
              <TouchableOpacity
                className="bg-emerald-200/50 rounded-lg p-2"
                onPress={(e) => {
                  e.stopPropagation();
                  openDeleteTestSuiteModal(shelfId, ts.id);
                }}
              >
                <Delete size={16} color="#047857" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
};

const OopslyApp = () => {
  const logger = Logger.extend("OopslyApp");
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [shelfName, setShelfName] = useState("");
  const [shelfDescription, setShelfDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(availableIcons[0]);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const { data: shelvesData } = useShelves({ page: 0, size: 100 });
  const shelves = shelvesData?.entities ?? [];
  const createShelfMutation = useCreateShelf();
  const updateShelfMutation = useUpdateShelf();
  const deleteShelfMutation = useDeleteShelf();
  const createSubjectMutation = useCreateSubject();
  const createTestMutation = useCreateTestSuite();
  const deleteTestMutation = useDeleteTestSuite();

  // New state for add content modal
  const [addContentModalVisible, setAddContentModalVisible] = useState(false);
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [contentTypeModalVisible, setContentTypeModalVisible] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState<
    "test" | "subject" | "delete" | "edit" | null
  >(null);
  const [contentName, setContentName] = useState("");
  const [contentDescription, setContentDescription] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [deletedModalVisible, setDeletedModalVisible] = useState(false);

  // Edit shelf modal state
  const [editShelfModalVisible, setEditShelfModalVisible] = useState(false);
  const [editShelfName, setEditShelfName] = useState("");
  const [editShelfDescription, setEditShelfDescription] = useState("");
  const [editShelfIcon, setEditShelfIcon] = useState(availableIcons[0]);
  const [showEditIconPicker, setShowEditIconPicker] = useState(false);


  const [createTestModalVisible, setCreateTestModalVisible] = useState(false);
  const [testTitle, setTestTitle] = useState("");
  const [selectedSubjectIdForTest, setSelectedSubjectIdForTest] = useState<string | null>(null);
  const [deleteTestSuiteModalVisible, setDeleteTestSuiteModalVisible] = useState(false);
  const [testSuiteToDelete, setTestSuiteToDelete] = useState<{ shelfId: string; testSuiteId: string } | null>(null);
  const [testSuiteDeleteConfirmText, setTestSuiteDeleteConfirmText] = useState("");



  // Handle shelf creation
  const handleCreateShelf = () => {
    logger.debug("Creating shelf with name:", shelfName);
    if (shelfName.trim() === "") {
      logger.warn("Shelf name is empty");
      alert("Please enter a shelf name");
      return;
    }

    createShelfMutation.mutateAsync({
      icon: selectedIcon.name,
      name: shelfName,
      description: shelfDescription,
    }).then(() => {
      logger.debug("Shelf created successfully");
      setShelfName("");
      setShelfDescription("");
      setSelectedIcon(availableIcons[0]);
      setModalVisible(false);
    }).catch((error) => {
      logger.error("Error creating shelf:", error);
    });


  };

  // Open content type selection modal
  const openContentTypeModal = (shelfId: string) => {
    setSelectedShelfId(shelfId);
    setContentTypeModalVisible(true);
  };

  // Handle content type selection
  const handleContentTypeSelect = (type: "test" | "subject" | "delete" | "edit") => {
    setSelectedContentType(type);
    setContentTypeModalVisible(false);
    if (type === "delete") {
      setDeletedModalVisible(true);
    } else if (type === "edit" && selectedShelfId) {
      const shelf = shelves?.find((s) => s.id === selectedShelfId);
      if (shelf) {
        setEditShelfName(shelf.name);
        setEditShelfDescription(shelf.description ?? "");
        const iconMatch = availableIcons.find(
          (i) => i.name.toLowerCase() === shelf.icon?.toLowerCase(),
        );
        setEditShelfIcon(iconMatch ?? availableIcons[0]);
        setEditShelfModalVisible(true);
      }
    } else if (type === "test" && selectedShelfId) {
      setTestTitle("");
      setSelectedSubjectIdForTest(null);
      setCreateTestModalVisible(true);
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
      createSubjectMutation.mutateAsync({
        shelfId: selectedShelfId,
        data: {
          name: contentName,
          description: contentDescription,
        }
      }).then(() => {
        logger.debug("Subject created successfully");
      }).catch((error) => {
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
      deleteShelfMutation.mutateAsync(selectedShelfId)
        .then(() => logger.debug("Shelf deleted successfully"))
        .catch((error) => logger.error("Error deleting shelf:", error));

      setSelectedShelfId(null);
      setSelectedContentType(null);
      setConfirmText("");
      setDeletedModalVisible(false);
    }
  };

  const handleUpdateShelf = () => {
    if (!selectedShelfId) return;
    if (editShelfName.trim() === "") {
      alert("Please enter a shelf name");
      return;
    }
    const desc = editShelfDescription.trim();
    updateShelfMutation.mutateAsync({
      id: selectedShelfId,
      data: {
        icon: editShelfIcon.name,
        name: editShelfName.trim(),
        description: desc.length >= 10 ? desc : desc.padEnd(10, " ").slice(0, 100),
      }
    }).then(() => {
      logger.debug("Shelf updated successfully");
      setEditShelfModalVisible(false);
      setSelectedShelfId(null);
    }).catch((error) => {
      logger.error("Error updating shelf:", error);
    });
  };

  const handleCreateTestSuite = () => {
    if (!selectedShelfId || !testTitle.trim()) {
      alert("Please enter a test title");
      return;
    }
    if (!selectedSubjectIdForTest) {
      alert("Please select a subject");
      return;
    }
    createTestMutation.mutateAsync({
      shelfId: selectedShelfId,
      data: {
        title: testTitle.trim(),
        subjectIds: [selectedSubjectIdForTest],
      }
    }).then(() => {
      setCreateTestModalVisible(false);
      setTestTitle("");
      setSelectedSubjectIdForTest(null);
    }).catch((err) => logger.error("Error creating test suite:", err));
  };

  const openDeleteTestSuiteModal = (shelfId: string, testSuiteId: string) => {
    setTestSuiteToDelete({ shelfId, testSuiteId });
    setTestSuiteDeleteConfirmText("");
    setDeleteTestSuiteModalVisible(true);
  };

  const handleDeleteTestSuite = () => {
    if (!testSuiteToDelete || testSuiteDeleteConfirmText.trim().toLowerCase() !== "confirm") return;
    deleteTestMutation.mutateAsync({
      shelfId: testSuiteToDelete.shelfId,
      id: testSuiteToDelete.testSuiteId
    }).then(() => {
      setDeleteTestSuiteModalVisible(false);
      setTestSuiteToDelete(null);
      setTestSuiteDeleteConfirmText("");
    }).catch((err) => logger.error("Error deleting test suite:", err));
  };

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
              onPress={() => router.push(`${shelfId}/view/${subject.id}` as any)}
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
            <TouchableOpacity
              onPress={() => router.push("/profile")}
              className="w-10 h-10 rounded-full bg-indigo-100 items-center justify-center mr-3"
            >
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8M3x8dXNlcnxlbnwwfHwwfHx8MA%3D%3D",
                }}
                className="w-8 h-8 rounded-full"
                testID="user-avatar"
              />
            </TouchableOpacity>
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
            onPress={() => router.push("/tasks-list" as any)}
            testID="tasks-button"
          >
            <View className="bg-blue-100 p-3 rounded-full mb-1">
              <CheckSquare size={24} color="#3B82F6" />
            </View>
            <Text className="text-xs text-gray-600" testID="tasks-label-text">Tasks</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center"
            onPress={() => router.push("/notes" as any)}
            testID="notes-button"
          >
            <View className="bg-green-100 p-3 rounded-full mb-1">
              <StickyNote size={24} color="#10B981" />
            </View>
            <Text className="text-xs text-gray-600" testID="notes-label-text">Notes</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center"
            onPress={() => router.push("/study-planner" as any)}
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

            <ShelfTestSuites shelfId={shelf.id} openDeleteTestSuiteModal={openDeleteTestSuiteModal} />

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

            {/* Edit Shelf Option */}
            <TouchableOpacity
              className="bg-gradient-to-r from-amber-50 to-amber-100 rounded-xl p-5 mb-4 border-2 border-amber-200"
              onPress={() => handleContentTypeSelect("edit")}
            >
              <View className="flex-row items-center">
                <View className="bg-amber-500 rounded-full p-3 mr-4">
                  <Edit3 size={28} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-800 font-bold text-lg mb-1">
                    Edit Shelf
                  </Text>
                  <Text className="text-gray-600 text-sm">
                    Change shelf name, description, or icon
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
              <Text className="text-gray-700 font-semibold mb-3">
                This will permanently delete this shelf and all its contents:
              </Text>
              <Text className="text-gray-600 mb-2">
                • All subjects in this shelf
              </Text>
              <Text className="text-gray-600 mb-2">
                • All cards within those subjects
              </Text>
              <Text className="text-gray-600 mb-4">
                • All test suites in this shelf
              </Text>
              <Text className="text-gray-700 font-semibold mb-2">
                This action cannot be undone. Type &quot;confirm&quot; below and click Confirm and Acknowledge to proceed.
              </Text>
              <TextInput
                className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200 mt-2 mb-4"
                placeholder="Type confirm to acknowledge"
                placeholderTextColor="#9CA3AF"
                value={confirmText}
                onChangeText={setConfirmText}
              />

              <View className="flex-row gap-3 mt-2">
                <TouchableOpacity
                  className="flex-1 bg-gray-200 rounded-xl py-4 items-center"
                  onPress={() => {
                    setDeletedModalVisible(false);
                    setConfirmText("");
                    setSelectedContentType(null);
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
                    Confirm and Acknowledge
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Edit Shelf Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={editShelfModalVisible}
        onRequestClose={() => setEditShelfModalVisible(false)}
        testID="edit-shelf-modal"
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => setEditShelfModalVisible(false)}
        >
          <Pressable
            className="bg-white rounded-2xl w-full max-w-md"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row justify-between items-center p-6 pb-4 border-b border-gray-100">
              <Text className="text-xl font-bold text-gray-800">
                Edit Shelf
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setEditShelfModalVisible(false);
                  setSelectedShelfId(null);
                }}
                className="p-1"
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView className="px-6 py-4" style={{ maxHeight: 500 }}>
              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-3">Icon</Text>
                <TouchableOpacity
                  className="flex-row items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200"
                  onPress={() => setShowEditIconPicker(!showEditIconPicker)}
                >
                  <View className="flex-row items-center">
                    {React.createElement(editShelfIcon.component, {
                      size: 24,
                      color: editShelfIcon.color,
                    })}
                    <Text className="text-gray-800 ml-3 font-medium">
                      {editShelfIcon.name}
                    </Text>
                  </View>
                </TouchableOpacity>
                {showEditIconPicker && (
                  <View className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
                    <View className="flex-row flex-wrap gap-2">
                      {availableIcons.map((icon, index) => (
                        <TouchableOpacity
                          key={index}
                          className={`p-3 rounded-lg ${
                            editShelfIcon.name === icon.name
                              ? "bg-indigo-100 border-2 border-indigo-500"
                              : "bg-white border border-gray-200"
                          }`}
                          onPress={() => {
                            setEditShelfIcon(icon);
                            setShowEditIconPicker(false);
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

              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-3">Name</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
                  placeholder="Enter shelf name"
                  placeholderTextColor="#9CA3AF"
                  value={editShelfName}
                  onChangeText={setEditShelfName}
                />
              </View>

              <View className="mb-5">
                <Text className="text-gray-700 font-semibold mb-3">Description</Text>
                <TextInput
                  className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
                  placeholder="Enter shelf description (min 10 characters)"
                  placeholderTextColor="#9CA3AF"
                  value={editShelfDescription}
                  onChangeText={setEditShelfDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  style={{ minHeight: 100 }}
                />
              </View>

              <View className="flex-row gap-3 mt-2">
                <TouchableOpacity
                  className="flex-1 bg-gray-200 rounded-xl py-4 items-center"
                  onPress={() => {
                    setEditShelfModalVisible(false);
                    setSelectedShelfId(null);
                  }}
                >
                  <Text className="text-gray-700 font-bold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-indigo-600 rounded-xl py-4 items-center"
                  onPress={handleUpdateShelf}
                >
                  <Text className="text-white font-bold">Save</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Create Test Suite Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={createTestModalVisible}
        onRequestClose={() => setCreateTestModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => setCreateTestModalVisible(false)}
        >
          <Pressable className="bg-white rounded-2xl w-full max-w-md p-6" onPress={(e) => e.stopPropagation()}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800">Create Test Suite</Text>
              <TouchableOpacity onPress={() => setCreateTestModalVisible(false)} className="p-1">
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text className="text-gray-600 mb-2">Test suite is a preset of cards from a subject. Select a subject and name your test.</Text>
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Subject</Text>
              <ScrollView className="max-h-32 bg-gray-50 rounded-xl border border-gray-200">
                {(shelves?.find((s) => s.id === selectedShelfId)?.subjects ?? []).map((sub) => (
                  <TouchableOpacity
                    key={sub.id}
                    className={`p-3 ${selectedSubjectIdForTest === sub.id ? "bg-indigo-100" : ""}`}
                    onPress={() => setSelectedSubjectIdForTest(sub.id)}
                  >
                    <Text className={selectedSubjectIdForTest === sub.id ? "text-indigo-700 font-semibold" : "text-gray-800"}>{sub.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Test title</Text>
              <TextInput
                className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
                placeholder="e.g. Math Chapter 1"
                placeholderTextColor="#9CA3AF"
                value={testTitle}
                onChangeText={setTestTitle}
              />
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-200 rounded-xl py-4 items-center"
                onPress={() => setCreateTestModalVisible(false)}
              >
                <Text className="text-gray-700 font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-indigo-600 rounded-xl py-4 items-center"
                onPress={handleCreateTestSuite}
              >
                <Text className="text-white font-bold">Create</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Test Suite Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteTestSuiteModalVisible}
        onRequestClose={() => setDeleteTestSuiteModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => setDeleteTestSuiteModalVisible(false)}
        >
          <Pressable className="bg-white rounded-2xl w-full max-w-md p-6" onPress={(e) => e.stopPropagation()}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800">Delete Test Suite</Text>
              <TouchableOpacity
                onPress={() => {
                  setDeleteTestSuiteModalVisible(false);
                  setTestSuiteToDelete(null);
                  setTestSuiteDeleteConfirmText("");
                }}
                className="p-1"
              >
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <Text className="text-gray-700 font-semibold mb-2">
              This will permanently delete this test suite and all its questions. Cards in the linked subject(s) will not be deleted.
            </Text>
            <Text className="text-gray-600 mb-4">
              Type &quot;confirm&quot; below and click Confirm and Acknowledge to proceed.
            </Text>
            <TextInput
              className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200 mb-4"
              placeholder="Type confirm to acknowledge"
              placeholderTextColor="#9CA3AF"
              value={testSuiteDeleteConfirmText}
              onChangeText={setTestSuiteDeleteConfirmText}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-200 rounded-xl py-4 items-center"
                onPress={() => {
                  setDeleteTestSuiteModalVisible(false);
                  setTestSuiteToDelete(null);
                  setTestSuiteDeleteConfirmText("");
                }}
              >
                <Text className="text-gray-700 font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-1 rounded-xl py-4 items-center ${testSuiteDeleteConfirmText.trim().toLowerCase() === "confirm" ? "bg-red-500" : "bg-red-400"}`}
                onPress={handleDeleteTestSuite}
                disabled={testSuiteDeleteConfirmText.trim().toLowerCase() !== "confirm"}
              >
                <Text className="text-white font-bold">Confirm and Acknowledge</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default OopslyApp;
