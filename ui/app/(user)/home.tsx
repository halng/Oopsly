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

import { createShelf, deleteShelf, fetchShelves, updateShelve } from "@/services/ShelfService";
import { createSubject } from "@/services/SubjectService";
import {
  createTestSuite,
  deleteTestSuite,
  fetchTestSuitesByShelf,
  TestSuiteRes,
} from "@/services/TestSuiteService";
import { getUserStats } from "@/services/UserService";
import { getProfile } from "@/services/ProfileService";
import { useAuthStore } from "@/store/AuthStore";
import { Shelf } from "@/types/Shelf";
import { SubjectStats } from "@/types/Subject";
import { Logger } from "@/utils";
import { type Href, useRouter } from "expo-router";
import {
  BarChart2,
  Bookmark,
  BookOpen,
  Camera,
  CheckSquare,
  ChevronLeft,
  Cog,
  Code,
  Coffee,
  Compass,
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
  Target,
  Trophy,
  Umbrella,
  User,
  X,
  Zap,
} from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AppButton from "@/components/common/AppButton";
import FeedbackMessage from "@/components/common/FeedbackMessage";
import FadeIn from "@/components/common/FadeIn";
import { uiTokens } from "@/constants/uiTokens";
import { useResponsiveLayout } from "@/utils/responsiveLayout";

function getInitials(name?: string | null, email?: string | null): string {
  const trimmedName = name?.trim();
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return trimmedName.slice(0, 2).toUpperCase();
  }
  const trimmedEmail = email?.trim();
  if (trimmedEmail) {
    return trimmedEmail[0].toUpperCase();
  }
  return "?";
}

type PanelView =
  | "create-shelf"
  | "content-type"
  | "create-subject"
  | "create-test"
  | "edit-shelf"
  | "delete-shelf"
  | "delete-test";

const PANEL_TITLES: Record<PanelView, string> = {
  "create-shelf": "Create Shelf",
  "content-type": "Manage Shelf",
  "create-subject": "Create Subject",
  "create-test": "Create Test Suite",
  "edit-shelf": "Edit Shelf",
  "delete-shelf": "Delete Shelf",
  "delete-test": "Delete Test Suite",
};

const PANEL_BACK: Partial<Record<PanelView, PanelView>> = {
  "create-subject": "content-type",
  "create-test": "content-type",
  "edit-shelf": "content-type",
  "delete-shelf": "content-type",
};

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
  const insets = useSafeAreaInsets();
  const {
    contentMaxWidth,
    isDesktop,
    isTablet,
    sidebarWidth,
    subjectCardWidth,
    width: screenWidth,
  } = useResponsiveLayout();

  const contentFrameStyle = { width: "100%" as const, maxWidth: contentMaxWidth };

  // Right-side panel
  const panelWidth = isDesktop
    ? Math.min(420, Math.floor(screenWidth * 0.38))
    : Math.min(Math.floor(screenWidth * 0.92), 480);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const [panelView, setPanelView] = useState<PanelView | null>(null);
  const [panelVisible, setPanelVisible] = useState(false);

  // Form state — shelf creation
  const [shelfName, setShelfName] = useState("");
  const [shelfDescription, setShelfDescription] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(availableIcons[0]);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Data
  const [shelves, setShelves] = useState<Shelf[]>();
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);

  // Form state — content creation (subject)
  const [contentName, setContentName] = useState("");
  const [contentDescription, setContentDescription] = useState("");

  // Form state — shelf delete
  const [confirmText, setConfirmText] = useState("");

  // Form state — edit shelf
  const [editShelfName, setEditShelfName] = useState("");
  const [editShelfDescription, setEditShelfDescription] = useState("");
  const [editShelfIcon, setEditShelfIcon] = useState(availableIcons[0]);
  const [showEditIconPicker, setShowEditIconPicker] = useState(false);

  // Form state — test suite
  const [testSuitesByShelf, setTestSuitesByShelf] = useState<Record<string, TestSuiteRes[]>>({});
  const [testTitle, setTestTitle] = useState("");
  const [selectedSubjectIdForTest, setSelectedSubjectIdForTest] = useState<string | null>(null);
  const [testSuiteToDelete, setTestSuiteToDelete] = useState<{ shelfId: string; testSuiteId: string } | null>(null);
  const [testSuiteDeleteConfirmText, setTestSuiteDeleteConfirmText] = useState("");

  // Async state
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const userEmail = useAuthStore((s) => s.userEmail);
  const [dailyStreak, setDailyStreak] = useState(0);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const avatarInitials = getInitials(displayName, userEmail);

  // ── Panel helpers ──────────────────────────────────────────────────────────

  const openPanel = (view: PanelView, shelfId?: string) => {
    if (shelfId !== undefined) setSelectedShelfId(shelfId);
    setPanelView(view);
    slideAnim.setValue(panelWidth);
    setPanelVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 240,
      useNativeDriver: true,
    }).start();
  };

  const closePanel = () => {
    Animated.timing(slideAnim, {
      toValue: panelWidth,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setPanelVisible(false);
      setPanelView(null);
    });
  };

  const goBackInPanel = (view: PanelView) => {
    setPanelView(view);
  };

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchShelvesData = () => {
    fetchShelves({ page: 0, size: 100 })
      .then((response) => {
        if (response.isSuccess) {
          setShelves(response.data.entities);
          const entities = response.data.entities ?? [];
          entities.forEach((shelf: Shelf) => {
            fetchTestSuitesByShelf(shelf.id)
              .then((res) => {
                if (res.isSuccess && Array.isArray(res.data)) {
                  setTestSuitesByShelf((prev) => ({ ...prev, [shelf.id]: res.data }));
                }
              })
              .catch(() => {});
          });
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
    getUserStats()
      .then((res) => {
        if (res.isSuccess && res.data) {
          setDailyStreak(res.data.dailyStreak ?? 0);
        }
      })
      .catch((err) => logger.debug("Stats fetch optional:", err));
    getProfile()
      .then((res) => {
        if (res.isSuccess && res.data) {
          setDisplayName(res.data.displayName ?? null);
        }
      })
      .catch((err) => logger.debug("Profile fetch optional:", err));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Action handlers ────────────────────────────────────────────────────────

  const handleCreateShelf = () => {
    setActionError(null);
    if (shelfName.trim() === "") {
      setActionError("Shelf name is required.");
      return;
    }
    setActionBusy(true);
    createShelf({ icon: selectedIcon.name, name: shelfName, description: shelfDescription })
      .then((response) => {
        if (response.isSuccess) {
          fetchShelvesData();
          closePanel();
        } else {
          setActionError(response.message || "Could not create shelf. Try again.");
        }
      })
      .catch(() => setActionError("Could not create shelf. Try again."))
      .finally(() => setActionBusy(false));

    setShelfName("");
    setShelfDescription("");
    setSelectedIcon(availableIcons[0]);
  };

  const handleContentTypeSelect = (type: "test" | "subject" | "delete" | "edit") => {
    if (type === "delete") {
      setConfirmText("");
      setPanelView("delete-shelf");
    } else if (type === "edit" && selectedShelfId) {
      const shelf = shelves?.find((s) => s.id === selectedShelfId);
      if (shelf) {
        setEditShelfName(shelf.name);
        setEditShelfDescription(shelf.description ?? "");
        const iconMatch = availableIcons.find(
          (i) => i.name.toLowerCase() === shelf.icon?.toLowerCase(),
        );
        setEditShelfIcon(iconMatch ?? availableIcons[0]);
        setPanelView("edit-shelf");
      }
    } else if (type === "test") {
      setTestTitle("");
      setSelectedSubjectIdForTest(null);
      setPanelView("create-test");
    } else {
      setContentName("");
      setContentDescription("");
      setPanelView("create-subject");
    }
  };

  const handleCreateSubject = () => {
    setActionError(null);
    if (contentName.trim() === "") {
      setActionError("Subject name is required.");
      return;
    }
    if (!selectedShelfId) return;
    setActionBusy(true);
    createSubject(selectedShelfId, { name: contentName, description: contentDescription })
      .then((response) => {
        if (response.isSuccess) {
          fetchShelvesData();
          closePanel();
        } else {
          setActionError(response.message || "Could not create subject. Try again.");
        }
      })
      .catch(() => setActionError("Could not create subject. Try again."))
      .finally(() => setActionBusy(false));
  };

  const handleDeleteShelf = () => {
    if (!selectedShelfId) return;
    setActionBusy(true);
    setActionError(null);
    deleteShelf(selectedShelfId)
      .then((response) => {
        if (response.isSuccess) {
          fetchShelvesData();
          closePanel();
          setConfirmText("");
        } else {
          setActionError(response.message || "Could not delete shelf. Try again.");
        }
      })
      .catch(() => setActionError("Could not delete shelf. Try again."))
      .finally(() => setActionBusy(false));
  };

  const handleUpdateShelf = () => {
    if (!selectedShelfId) return;
    setActionError(null);
    if (editShelfName.trim() === "") {
      setActionError("Shelf name is required.");
      return;
    }
    setActionBusy(true);
    const desc = editShelfDescription.trim();
    updateShelve(selectedShelfId, {
      icon: editShelfIcon.name,
      name: editShelfName.trim(),
      description: desc.length >= 10 ? desc : desc.padEnd(10, " ").slice(0, 100),
    })
      .then((response) => {
        if (response.isSuccess) {
          fetchShelvesData();
          closePanel();
        } else {
          setActionError(response.message || "Could not update shelf. Try again.");
        }
      })
      .catch(() => setActionError("Could not update shelf. Try again."))
      .finally(() => setActionBusy(false));
  };

  const handleCreateTestSuite = () => {
    setActionError(null);
    if (!testTitle.trim()) {
      setActionError("Test title is required.");
      return;
    }
    if (!selectedSubjectIdForTest) {
      setActionError("Please select a subject first.");
      return;
    }
    if (!selectedShelfId) return;
    setActionBusy(true);
    createTestSuite(selectedShelfId, {
      title: testTitle.trim(),
      subjectIds: [selectedSubjectIdForTest],
      selection: { mode: "RANDOM", shuffle: true, limit: 20 },
    })
      .then((res) => {
        if (res.isSuccess) {
          setTestSuitesByShelf((prev) => ({
            ...prev,
            [selectedShelfId]: [...(prev[selectedShelfId] ?? []), res.data],
          }));
          closePanel();
          setTestTitle("");
          setSelectedSubjectIdForTest(null);
        } else {
          setActionError(res.message || "Could not create test suite. Try again.");
        }
      })
      .catch(() => setActionError("Could not create test suite. Try again."))
      .finally(() => setActionBusy(false));
  };

  const handleDeleteTestSuite = () => {
    if (!testSuiteToDelete || testSuiteDeleteConfirmText.trim().toLowerCase() !== "confirm") return;
    setActionBusy(true);
    setActionError(null);
    deleteTestSuite(testSuiteToDelete.shelfId, testSuiteToDelete.testSuiteId)
      .then((res) => {
        if (res.isSuccess) {
          setTestSuitesByShelf((prev) => ({
            ...prev,
            [testSuiteToDelete.shelfId]: (prev[testSuiteToDelete.shelfId] ?? []).filter(
              (t) => t.id !== testSuiteToDelete.testSuiteId
            ),
          }));
          closePanel();
          setTestSuiteToDelete(null);
          setTestSuiteDeleteConfirmText("");
        }
      })
      .catch(() => setActionError("Could not delete test suite. Try again."))
      .finally(() => setActionBusy(false));
  };

  const getShelfName = (shelfId: string) => {
    const shelf = shelves?.find((s) => s.id === shelfId);
    return shelf ? shelf.name : "";
  };

  // ── Subject cards ──────────────────────────────────────────────────────────

  const renderSubjectCards = (subjects: SubjectStats[], shelfId: string) => (
    <ScrollView
      horizontal={!isTablet}
      showsHorizontalScrollIndicator={false}
      className={isTablet ? "" : "max-h-40"}
      testID={`subject-scroll-view-${shelfId}`}
    >
      <View
        className="flex-row gap-4 px-4 pb-2"
        style={{ flexWrap: isTablet ? "wrap" : "nowrap" }}
      >
        {subjects.map((subject) => (
          <TouchableOpacity
            key={subject.id}
            className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
            style={{ width: subjectCardWidth }}
            onPress={() =>
              router.push(`/${shelfId}/view/${subject.id}` as Href)
            }
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
                    style={{ width: `${subject.completedPercent ?? 0}%` }}
                    testID={`subject-progress-bar-${subject.id}`}
                  />
                </View>
                <Text className="text-gray-500 text-xs ml-2" testID={`subject-progress-text-${subject.id}`}>
                  {subject.completedPercent ?? 0}%
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          className="bg-white rounded-xl p-4 shadow-sm border-2 border-dashed border-gray-300 justify-center items-center"
          style={{ width: subjectCardWidth }}
          onPress={() => openPanel("content-type", shelfId)}
          testID={`manage-shelf-button-${shelfId}`}
        >
          <Text className="text-gray-600 font-semibold" testID={`manage-shelf-title-text-${shelfId}`}>Management</Text>
          <Text className="text-gray-400 text-xs mt-1" testID={`manage-shelf-subtitle-text-${shelfId}`}>Tap to manage</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderIconComponent = (iconName: string) => {
    const icon = availableIcons.find((i) => i.name.toLowerCase() === iconName.toLowerCase());
    return icon ? React.createElement(icon.component, { size: 20, color: icon.color }) : null;
  };

  // ── Right panel content ────────────────────────────────────────────────────

  const IconPickerField = ({
    selected,
    onSelect,
    open,
    onToggle,
  }: {
    selected: typeof availableIcons[0];
    onSelect: (icon: typeof availableIcons[0]) => void;
    open: boolean;
    onToggle: () => void;
  }) => (
    <View className="mb-5">
      <Text className="text-gray-700 font-semibold mb-3">Icon</Text>
      <TouchableOpacity
        className="flex-row items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200"
        onPress={onToggle}
      >
        <View className="flex-row items-center">
          {React.createElement(selected.component, { size: 24, color: selected.color })}
          <Text className="text-gray-800 ml-3 font-medium">{selected.name}</Text>
        </View>
        <Text className="text-gray-400">Tap to change</Text>
      </TouchableOpacity>
      {open && (
        <View className="mt-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
          <View className="flex-row flex-wrap gap-2">
            {availableIcons.map((icon, index) => (
              <TouchableOpacity
                key={index}
                className={`p-3 rounded-lg ${
                  selected.name === icon.name
                    ? "bg-indigo-100 border-2 border-indigo-500"
                    : "bg-white border border-gray-200"
                }`}
                onPress={() => onSelect(icon)}
              >
                {React.createElement(icon.component, { size: 22, color: icon.color })}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderPanelBody = () => {
    if (!panelView) return null;

    // ── Create Shelf ──
    if (panelView === "create-shelf") {
      return (
        <>
          <IconPickerField
            selected={selectedIcon}
            onSelect={(icon) => { setSelectedIcon(icon); setShowIconPicker(false); }}
            open={showIconPicker}
            onToggle={() => setShowIconPicker((v) => !v)}
          />
          <View className="mb-5">
            <Text className="text-gray-700 font-semibold mb-3">Name</Text>
            <TextInput
              className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
              placeholder="Enter shelf name"
              placeholderTextColor={uiTokens.text.muted}
              value={shelfName}
              onChangeText={setShelfName}
              testID="shelf-name-input"
            />
          </View>
          <View className="mb-6">
            <Text className="text-gray-700 font-semibold mb-3">Description</Text>
            <TextInput
              className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
              placeholder="Enter shelf description (optional)"
              placeholderTextColor={uiTokens.text.muted}
              value={shelfDescription}
              onChangeText={setShelfDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
              testID="shelf-description-input"
            />
          </View>
          {actionError && <FeedbackMessage message={actionError} tone="error" />}
          <AppButton
            label="Create Shelf"
            onPress={handleCreateShelf}
            loading={actionBusy}
            testID="create-shelf-submit-button"
          />
        </>
      );
    }

    // ── Content type picker ──
    if (panelView === "content-type") {
      return (
        <View style={{ gap: 12 }}>
          <Text className="text-gray-500 text-sm mb-2">
            Choose the action you want to do under this shelf.
          </Text>

          {(
            [
              { type: "test" as const, label: "Create Test", desc: "Create a test from subject cards", icon: CheckSquare, bg: "bg-blue-50 border-blue-200", iconBg: "bg-blue-500", testID: "content-type-test-button" },
              { type: "subject" as const, label: "Create Subject", desc: "Organize related flashcards", icon: BookOpen, bg: "bg-purple-50 border-purple-200", iconBg: "bg-purple-500", testID: "content-type-subject-button" },
              { type: "edit" as const, label: "Edit Shelf", desc: "Change name, description or icon", icon: Edit3, bg: "bg-amber-50 border-amber-200", iconBg: "bg-amber-500", testID: "content-type-edit-button" },
              { type: "delete" as const, label: "Delete Shelf", desc: "Permanently remove shelf and contents", icon: Delete, bg: "bg-red-50 border-red-200", iconBg: "bg-red-500", testID: "content-type-delete-button" },
            ] as const
          ).map((item) => (
            <TouchableOpacity
              key={item.type}
              className={`rounded-xl p-4 border-2 ${item.bg}`}
              onPress={() => handleContentTypeSelect(item.type)}
              testID={item.testID}
            >
              <View className="flex-row items-center">
                <View className={`rounded-full p-3 mr-4 ${item.iconBg}`}>
                  <item.icon size={22} color={uiTokens.text.onAccent} />
                </View>
                <View className="flex-1">
                  <Text className="text-gray-800 font-bold text-base mb-0.5">{item.label}</Text>
                  <Text className="text-gray-500 text-sm">{item.desc}</Text>
                </View>
                <ChevronLeft
                  size={18}
                  color={uiTokens.text.muted}
                  style={{ transform: [{ rotate: "180deg" }] }}
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    // ── Create Subject ──
    if (panelView === "create-subject") {
      return (
        <>
          <View className="mb-5">
            <Text className="text-gray-700 font-semibold mb-3">Name</Text>
            <TextInput
              className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
              placeholder="Enter subject name"
              placeholderTextColor={uiTokens.text.muted}
              value={contentName}
              onChangeText={setContentName}
            />
          </View>
          <View className="mb-6">
            <Text className="text-gray-700 font-semibold mb-3">Description</Text>
            <TextInput
              className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
              placeholder="Enter subject description (optional)"
              placeholderTextColor={uiTokens.text.muted}
              value={contentDescription}
              onChangeText={setContentDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
            />
          </View>
          {actionError && <FeedbackMessage message={actionError} tone="error" />}
          <AppButton
            label="Create Subject"
            onPress={handleCreateSubject}
            loading={actionBusy}
          />
        </>
      );
    }

    // ── Create Test Suite ──
    if (panelView === "create-test") {
      const shelfSubjects = shelves?.find((s) => s.id === selectedShelfId)?.subjects ?? [];
      return (
        <>
          <Text className="text-gray-500 text-sm mb-4">
            Test suite is a preset of cards from a subject. Select a subject and name your test.
          </Text>
          <View className="mb-5">
            <Text className="text-gray-700 font-semibold mb-3">Subject</Text>
            <View className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
              {shelfSubjects.map((sub) => (
                <TouchableOpacity
                  key={sub.id}
                  style={{
                    padding: 14,
                    borderBottomWidth: 1,
                    borderBottomColor: uiTokens.border.subtle,
                    backgroundColor: selectedSubjectIdForTest === sub.id ? uiTokens.accent.tint : "transparent",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  onPress={() => setSelectedSubjectIdForTest(sub.id)}
                >
                  <Text
                    style={{
                      color: selectedSubjectIdForTest === sub.id ? uiTokens.accent.default : uiTokens.text.primary,
                      fontWeight: selectedSubjectIdForTest === sub.id ? "600" : "400",
                    }}
                  >
                    {sub.name}
                  </Text>
                  {selectedSubjectIdForTest === sub.id && (
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: uiTokens.accent.default }} />
                  )}
                </TouchableOpacity>
              ))}
              {shelfSubjects.length === 0 && (
                <Text style={{ padding: 14, color: uiTokens.text.muted }}>
                  No subjects in this shelf yet.
                </Text>
              )}
            </View>
          </View>
          <View className="mb-6">
            <Text className="text-gray-700 font-semibold mb-3">Test title</Text>
            <TextInput
              className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
              placeholder="e.g. Math Chapter 1"
              placeholderTextColor={uiTokens.text.muted}
              value={testTitle}
              onChangeText={setTestTitle}
            />
          </View>
          {actionError && <FeedbackMessage message={actionError} tone="error" />}
          <AppButton
            label="Create Test Suite"
            onPress={handleCreateTestSuite}
            loading={actionBusy}
          />
        </>
      );
    }

    // ── Edit Shelf ──
    if (panelView === "edit-shelf") {
      return (
        <>
          <IconPickerField
            selected={editShelfIcon}
            onSelect={(icon) => { setEditShelfIcon(icon); setShowEditIconPicker(false); }}
            open={showEditIconPicker}
            onToggle={() => setShowEditIconPicker((v) => !v)}
          />
          <View className="mb-5">
            <Text className="text-gray-700 font-semibold mb-3">Name</Text>
            <TextInput
              className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
              placeholder="Enter shelf name"
              placeholderTextColor={uiTokens.text.muted}
              value={editShelfName}
              onChangeText={setEditShelfName}
            />
          </View>
          <View className="mb-6">
            <Text className="text-gray-700 font-semibold mb-3">Description</Text>
            <TextInput
              className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200"
              placeholder="Enter shelf description (min 10 characters)"
              placeholderTextColor={uiTokens.text.muted}
              value={editShelfDescription}
              onChangeText={setEditShelfDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
            />
          </View>
          {actionError && <FeedbackMessage message={actionError} tone="error" />}
          <AppButton
            label="Save Changes"
            onPress={handleUpdateShelf}
            loading={actionBusy}
          />
        </>
      );
    }

    // ── Delete Shelf ──
    if (panelView === "delete-shelf") {
      return (
        <>
          <View
            style={{
              backgroundColor: uiTokens.state.error.bg,
              borderWidth: 1,
              borderColor: uiTokens.state.error.border,
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <Text style={{ color: uiTokens.state.error.text, fontWeight: "600", marginBottom: 8 }}>
              Permanently delete &ldquo;{getShelfName(selectedShelfId ?? "")}&rdquo;?
            </Text>
            <Text style={{ color: uiTokens.state.error.text, fontSize: 13 }}>
              This will remove all subjects, flashcards, and test suites in this shelf. This action cannot be undone.
            </Text>
          </View>
          <Text className="text-gray-700 font-semibold mb-3">
            Type &ldquo;confirm&rdquo; to proceed
          </Text>
          <TextInput
            className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200 mb-6"
            placeholder="Type confirm to acknowledge"
            placeholderTextColor={uiTokens.text.muted}
            value={confirmText}
            onChangeText={setConfirmText}
          />
          {actionError && <FeedbackMessage message={actionError} tone="error" />}
          <TouchableOpacity
            style={{
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              backgroundColor:
                confirmText.trim().toLowerCase() === "confirm"
                  ? uiTokens.state.error.solid
                  : uiTokens.state.error.bg,
            }}
            onPress={handleDeleteShelf}
            disabled={confirmText.trim().toLowerCase() !== "confirm" || actionBusy}
          >
            <Text
              style={{
                color:
                  confirmText.trim().toLowerCase() === "confirm"
                    ? "#fff"
                    : uiTokens.state.error.text,
                fontWeight: "700",
              }}
            >
              Confirm and Delete
            </Text>
          </TouchableOpacity>
        </>
      );
    }

    // ── Delete Test Suite ──
    if (panelView === "delete-test") {
      return (
        <>
          <View
            style={{
              backgroundColor: uiTokens.state.error.bg,
              borderWidth: 1,
              borderColor: uiTokens.state.error.border,
              borderRadius: 12,
              padding: 16,
              marginBottom: 20,
            }}
          >
            <Text style={{ color: uiTokens.state.error.text, fontWeight: "600", marginBottom: 8 }}>
              Delete this test suite?
            </Text>
            <Text style={{ color: uiTokens.state.error.text, fontSize: 13 }}>
              All questions will be removed. Cards in the linked subject(s) will not be deleted.
            </Text>
          </View>
          <Text className="text-gray-700 font-semibold mb-3">
            Type &ldquo;confirm&rdquo; to proceed
          </Text>
          <TextInput
            className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200 mb-6"
            placeholder="Type confirm to acknowledge"
            placeholderTextColor={uiTokens.text.muted}
            value={testSuiteDeleteConfirmText}
            onChangeText={setTestSuiteDeleteConfirmText}
          />
          {actionError && <FeedbackMessage message={actionError} tone="error" />}
          <TouchableOpacity
            style={{
              borderRadius: 12,
              paddingVertical: 16,
              alignItems: "center",
              backgroundColor:
                testSuiteDeleteConfirmText.trim().toLowerCase() === "confirm"
                  ? uiTokens.state.error.solid
                  : uiTokens.state.error.bg,
            }}
            onPress={handleDeleteTestSuite}
            disabled={testSuiteDeleteConfirmText.trim().toLowerCase() !== "confirm" || actionBusy}
          >
            <Text
              style={{
                color:
                  testSuiteDeleteConfirmText.trim().toLowerCase() === "confirm"
                    ? "#fff"
                    : uiTokens.state.error.text,
                fontWeight: "700",
              }}
            >
              Confirm and Delete
            </Text>
          </TouchableOpacity>
        </>
      );
    }

    return null;
  };

  const renderPanel = () => {
    if (!panelVisible || !panelView) return null;
    const backView = PANEL_BACK[panelView];

    return (
      <>
        {/* Backdrop */}
        <Pressable
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.35)",
          }}
          onPress={closePanel}
          testID="panel-backdrop"
        />

        {/* Sliding panel */}
        <Animated.View
          style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: panelWidth,
            backgroundColor: uiTokens.surface.default,
            shadowColor: "#000",
            shadowOffset: { width: -3, height: 0 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 16,
            transform: [{ translateX: slideAnim }],
          }}
          testID="right-panel"
        >
          {/* Panel header */}
          <View
            style={{
              paddingTop: Math.max(insets.top, 16),
              paddingHorizontal: 20,
              paddingBottom: 16,
              borderBottomWidth: 1,
              borderBottomColor: uiTokens.border.subtle,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: uiTokens.surface.default,
            }}
            testID="panel-header"
          >
            {backView && (
              <TouchableOpacity
                onPress={() => goBackInPanel(backView)}
                style={{ padding: 4, marginRight: 4 }}
                testID="panel-back-button"
              >
                <ChevronLeft size={20} color={uiTokens.text.muted} />
              </TouchableOpacity>
            )}
            <Text
              style={{
                flex: 1,
                fontSize: 18,
                fontWeight: "700",
                color: uiTokens.text.primary,
              }}
              testID="panel-title"
            >
              {PANEL_TITLES[panelView]}
            </Text>
            <TouchableOpacity onPress={closePanel} style={{ padding: 4 }} testID="panel-close-button">
              <X size={20} color={uiTokens.text.muted} />
            </TouchableOpacity>
          </View>

          {/* Panel body */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 20, paddingBottom: Math.max(insets.bottom + 24, 32) }}
            keyboardShouldPersistTaps="handled"
            testID="panel-scroll"
          >
            {renderPanelBody()}
          </ScrollView>
        </Animated.View>
      </>
    );
  };

  // ── Desktop sidebar ────────────────────────────────────────────────────────

  const renderDesktopSidebar = () => (
    <View
      style={{
        width: sidebarWidth,
        backgroundColor: uiTokens.surface.default,
        borderRightWidth: 1,
        borderRightColor: uiTokens.border.subtle,
        paddingTop: Math.max(insets.top, 16),
        paddingHorizontal: 16,
        paddingBottom: 24,
        justifyContent: "space-between",
      }}
      testID="desktop-sidebar"
    >
      <View>
        {/* Brand + streak */}
        <View
          style={{
            paddingHorizontal: 8,
            marginBottom: 28,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: "800", color: uiTokens.text.primary }}>
            Oopsly
          </Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              backgroundColor: "#FFF7ED",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 999,
            }}
            testID="sidebar-streak-container"
          >
            <Flame size={14} color={uiTokens.state.warning.solid} fill={uiTokens.state.warning.solid} />
            <Text style={{ marginLeft: 4, fontWeight: "700", color: "#C2410C", fontSize: 13 }} testID="sidebar-streak-text">
              {dailyStreak}
            </Text>
          </View>
        </View>

        {/* Primary nav */}
        {(
          [
            {
              label: "Library",
              icon: BookOpen,
              color: uiTokens.accent.default,
              bg: uiTokens.accent.tint,
              action: () => {},
              active: true,
              testID: "sidebar-library-btn",
            },
            {
              label: "Create Shelf",
              icon: PlusCircle,
              color: uiTokens.accent.default,
              bg: uiTokens.accent.tint,
              action: () => openPanel("create-shelf"),
              active: false,
              testID: "sidebar-create-shelf-btn",
            },
            {
              label: "Discover",
              icon: Compass,
              color: "#0EA5E9",
              bg: "#E0F2FE",
              action: () => router.push("/discover"),
              active: false,
              testID: "sidebar-discover-btn",
            },
            {
              label: "Stats",
              icon: BarChart2,
              color: "#10B981",
              bg: "#DCFCE7",
              action: () => router.push("/stats"),
              active: false,
              testID: "sidebar-stats-btn",
            },
            {
              label: "Leaderboard",
              icon: Trophy,
              color: "#F97316",
              bg: "#FFEDD5",
              action: () => router.push("/leaderboard"),
              active: false,
              testID: "sidebar-leaderboard-btn",
            },
          ] as const
        ).map((item) => (
          <TouchableOpacity
            key={item.label}
            onPress={item.action}
            testID={item.testID}
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 10,
              marginBottom: 4,
              backgroundColor: item.active ? uiTokens.accent.tint : "transparent",
            }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                backgroundColor: item.bg,
                alignItems: "center",
                justifyContent: "center",
                marginRight: 12,
              }}
            >
              <item.icon size={16} color={item.color} />
            </View>
            <Text
              style={{
                fontSize: 15,
                fontWeight: item.active ? "600" : "500",
                color: item.active ? uiTokens.accent.default : uiTokens.text.primary,
              }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Bottom: profile + settings */}
      <View>
        <TouchableOpacity
          onPress={() => router.push("/profile")}
          testID="sidebar-profile-btn"
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            marginBottom: 4,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              marginRight: 12,
              backgroundColor: uiTokens.accent.tint,
              alignItems: "center",
              justifyContent: "center",
            }}
            testID="sidebar-avatar"
          >
            <Text style={{ fontSize: 12, fontWeight: "700", color: uiTokens.accent.onTint }}>
              {avatarInitials}
            </Text>
          </View>
          <Text style={{ fontSize: 15, fontWeight: "500", color: uiTokens.text.primary }}>
            Profile
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push("/settings")}
          testID="sidebar-settings-btn"
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
          }}
        >
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              backgroundColor: "#F3F4F6",
              alignItems: "center",
              justifyContent: "center",
              marginRight: 12,
            }}
          >
            <Cog size={16} color={uiTokens.text.muted} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "500", color: uiTokens.text.primary }}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <View
      className="flex-1 bg-gray-50"
      style={isDesktop ? { flexDirection: "row" } : undefined}
      testID="home-container"
    >
      {/* Left sidebar (desktop only) */}
      {isDesktop && renderDesktopSidebar()}

      <View style={{ flex: 1 }}>
        {/* Mobile / tablet header */}
        {!isDesktop && (
          <View
            className="bg-white pb-4 px-4 shadow-sm items-center"
            style={{ paddingTop: Math.max(insets.top, 12) }}
            testID="header-container"
          >
            <View className="w-full" style={contentFrameStyle}>
              <View className="flex-row justify-between items-center">
                <View className="flex-row items-center">
                  <TouchableOpacity
                    onPress={() => router.push("/profile")}
                    className="w-10 h-10 rounded-full items-center justify-center mr-3"
                    style={{ backgroundColor: uiTokens.accent.tint }}
                    testID="profile-avatar-button"
                  >
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
                        color: uiTokens.accent.onTint,
                      }}
                      testID="user-avatar"
                    >
                      {avatarInitials}
                    </Text>
                  </TouchableOpacity>
                  <Text className="text-2xl font-bold text-gray-800" testID="app-title-text">Oopsly</Text>
                </View>
                <View className="flex-row items-center bg-orange-50 px-3 py-1 rounded-full" testID="streak-container">
                  <Flame size={16} color={uiTokens.state.warning.solid} fill={uiTokens.state.warning.solid} />
                  <Text className="ml-1 font-bold text-orange-700" testID="streak-count-text">{dailyStreak}</Text>
                </View>
              </View>

              <View className="mt-4 p-4 bg-indigo-50 rounded-xl" testID="quote-container">
                <Text className="text-indigo-800 text-lg font-medium italic text-center" testID="quote-text">
                  "The expert in anything was once a beginner."
                </Text>
                <Text className="text-indigo-600 text-sm text-center mt-1" testID="quote-author-text">
                  - Helen Hayes
                </Text>
              </View>

              <View className="flex-row justify-around mt-4 pt-3 border-t border-gray-100" testID="navigation-menu">
                <TouchableOpacity
                  className="items-center"
                  onPress={() => openPanel("create-shelf")}
                  testID="create-shelf-button"
                >
                  <View className="bg-indigo-100 p-3 rounded-full mb-1">
                    <PlusCircle size={24} color="#4F46E5" />
                  </View>
                  <Text className="text-xs text-gray-600" testID="create-shelf-label-text">Create Shelf</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="items-center"
                  onPress={() => router.push("/discover")}
                  testID="discover-nav-button"
                >
                  <View className="bg-sky-100 p-3 rounded-full mb-1">
                    <Compass size={24} color="#0EA5E9" />
                  </View>
                  <Text className="text-xs text-gray-600" testID="discover-label-text">Discover</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="items-center"
                  onPress={() => router.push("/leaderboard")}
                  testID="leaderboard-nav-button"
                >
                  <View className="bg-orange-100 p-3 rounded-full mb-1">
                    <Trophy size={24} color="#F97316" />
                  </View>
                  <Text className="text-xs text-gray-600" testID="leaderboard-label-text">Ranks</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className="items-center"
                  onPress={() => router.push("/profile")}
                  testID="profile-nav-button"
                >
                  <View className="bg-violet-100 p-3 rounded-full mb-1">
                    <User size={24} color="#8B5CF6" />
                  </View>
                  <Text className="text-xs text-gray-600" testID="profile-label-text">Profile</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Main scrollable content */}
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ alignItems: "center" }}
          testID="shelves-scroll-view"
        >
          {/* Desktop content header */}
          {isDesktop && (
            <View
              style={{
                ...contentFrameStyle,
                paddingHorizontal: 24,
                paddingTop: Math.max(insets.top, 24),
                paddingBottom: 8,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{ fontSize: 26, fontWeight: "700", color: uiTokens.text.primary }}
                  testID="desktop-library-title"
                >
                  Your Library
                </Text>
                <TouchableOpacity
                  onPress={() => openPanel("create-shelf")}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    backgroundColor: uiTokens.accent.default,
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    borderRadius: 10,
                    gap: 8,
                  }}
                  testID="desktop-create-shelf-button"
                >
                  <PlusCircle size={16} color={uiTokens.text.onAccent} />
                  <Text style={{ color: uiTokens.text.onAccent, fontWeight: "600", fontSize: 14 }}>
                    New Shelf
                  </Text>
                </TouchableOpacity>
              </View>

              <View
                style={{
                  padding: 16,
                  backgroundColor: uiTokens.accent.tint,
                  borderRadius: 12,
                  marginBottom: 8,
                }}
                testID="desktop-quote-container"
              >
                <Text
                  style={{ color: uiTokens.accent.onTint, fontSize: 15, fontStyle: "italic", textAlign: "center" }}
                  testID="desktop-quote-text"
                >
                  "The expert in anything was once a beginner."
                </Text>
                <Text
                  style={{ color: uiTokens.accent.default, fontSize: 12, textAlign: "center", marginTop: 4 }}
                  testID="desktop-quote-author-text"
                >
                  — Helen Hayes
                </Text>
              </View>
            </View>
          )}

          {Array.from(shelves ?? []).map((shelf, shelfIdx) => (
            <FadeIn key={shelf.id} delay={shelfIdx * 60} duration={240} translate={6}>
              <View className="mb-6" style={contentFrameStyle} testID={`shelf-item-${shelf.id}`}>
                <View className="flex-row items-center px-4 mb-3 mt-2" testID={`shelf-header-${shelf.id}`}>
                  <View className="mr-2">{renderIconComponent(shelf.icon)}</View>
                  <Text className="text-lg font-bold text-gray-800" testID={`shelf-name-text-${shelf.id}`}>
                    {shelf.name}
                  </Text>
                </View>

                {(testSuitesByShelf[shelf.id] ?? []).length > 0 && (
                  <View className="flex-row flex-wrap gap-2 px-4 mb-2">
                    {(testSuitesByShelf[shelf.id] ?? []).map((ts) => (
                      <View key={ts.id} className="flex-row items-center bg-indigo-50 rounded-lg px-3 py-2 gap-2">
                        <Text className="text-indigo-800 font-medium flex-1">{ts.title}</Text>
                        <TouchableOpacity
                          className="bg-indigo-600 rounded-lg px-3 py-1"
                          onPress={() =>
                            router.push(`/take-test/${ts.id}?shelfId=${encodeURIComponent(shelf.id)}`)
                          }
                          testID={`take-test-button-${ts.id}`}
                        >
                          <Text className="text-white text-sm font-semibold">Take test</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="bg-red-100 rounded-lg px-2 py-1"
                          onPress={() => {
                            setTestSuiteToDelete({ shelfId: shelf.id, testSuiteId: ts.id });
                            setTestSuiteDeleteConfirmText("");
                            openPanel("delete-test");
                          }}
                        >
                          <Delete size={16} color={uiTokens.state.error.text} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}

                {renderSubjectCards(shelf.subjects, shelf.id)}
              </View>
            </FadeIn>
          ))}

          <View className="h-24" />
        </ScrollView>
      </View>

      {/* Right-side sliding panel — replaces all modals */}
      {renderPanel()}
    </View>
  );
};

export default OopslyApp;
