import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  ChevronLeft,
  Edit3,
  Save,
  X,
  Plus,
  Trash2,
  Settings,
  BookOpen,
} from "lucide-react-native";
import {
  fetchCardsDataBySubjectAndShelf,
  createNewCard,
  updateCard,
  deleteCard,
} from "@/services/CardService";
import { Logger } from "@/utils";
import { uiTokens } from "@/constants/uiTokens";
import { useResponsiveLayout } from "@/utils/responsiveLayout";
import { SubjectStats } from "@/types/Subject";
import { CardCreateRequest, CardRes } from "@/types/Card";
import {
  getSubjectById,
  updateSubjectById,
  updateSubjectSetting,
  deleteSubject as deleteSubjectApi,
} from "@/services/SubjectService";
import FeedbackMessage from "@/components/common/FeedbackMessage";


const SubjectDetailScreen = ({_shelfId, _subjectId}: { _shelfId: string, _subjectId: string }) => {
  const logger = Logger.extend("SubjectDetailScreen");

  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { contentMaxWidth, sheetMaxWidth } = useResponsiveLayout();
  const contentFrameStyle = { width: "100%" as const, maxWidth: contentMaxWidth, alignSelf: "center" as const };
  const sheetFrameStyle = sheetMaxWidth
    ? { width: "100%" as const, maxWidth: sheetMaxWidth, alignSelf: "center" as const }
    : undefined;

  const [isEditing, setIsEditing] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [editCard, setEditCard] = useState<CardCreateRequest>({ front: "", back: "" });
  const [editingCardId, setEditingCardId] = useState('');
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [cardBusy, setCardBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);

  const [subjectStatsData, setSubjectStatsData] = useState<SubjectStats>();
  const [cardsData, setCardsData] = useState<CardRes[]>([]);

  const [deleteSubjectModalVisible, setDeleteSubjectModalVisible] = useState(false);
  const [deleteSubjectConfirmText, setDeleteSubjectConfirmText] = useState("");

  const fetchSubjectStatsData = () => {
    logger.info("Fetching subject stats data for subject ID:",_subjectId);
    if (params.shelfId && params.id) {
      getSubjectById(_shelfId, _subjectId)
        .then((res) => {
          if (res.isSuccess) {
            setSubjectStatsData(res.data);
            setSubjectName(res.data.name);
            logger.debug("Fetched subject stats data:", res.data);
          }
        })
        .catch((error) => {
          logger.error("Error fetching subject stats:", error);
        });
    } else {
      logger.warn("shelfId or id param is missing, cannot fetch subject stats");
      router.back();
    }
  };

  const fetchCardsData = () => {
    logger.info("Fetching cards data for subject ID:", _subjectId);
    if (params.shelfId && params.id) {
      fetchCardsDataBySubjectAndShelf(_shelfId, _subjectId)
        .then((res) => {
          if (res.isSuccess) {
            setCardsData(res.data.entities);
            logger.debug("Fetched cards data:", res.data);
          } else {
            logger.error("Failed to fetch cards data");
          }
        })
        .catch((error) => {
          logger.error("Error fetching cards data");
          logger.error(error);
        });
    } else {
      logger.warn("shelfId or id param is missing, cannot fetch cards data");
      router.back();
    }
  };

  useEffect(() => {
    logger.debug("useEffect triggered for fetching data with subject ID:", _subjectId);
    setLoading(true);
    setLoadError(null);
    Promise.all([fetchSubjectStatsData(), fetchCardsData()])
      .then(() => {
        logger.debug("Fetched subject stats and cards data");
      })
      .catch((error) => {
        logger.error("Error fetching subject stats or cards data:", error);
        setLoadError("Could not load this subject. Please try again.");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_subjectId]);
  // Toggle edit mode
  const toggleEditMode = () => {
    if (isEditing && subjectStatsData) {
      updateSubjectById(_shelfId, _subjectId, { name: subjectName, description: subjectStatsData.description })
        .then((res) => {
          if (res.isSuccess) {
            fetchSubjectStatsData()
            logger.debug("Saved subject name:", subjectName);
          } else {
            logger.error("Failed to save subject name");
          }
        })
        .catch((error) => {
          logger.error("Error saving subject name:", error);
        }); 
    }
    setIsEditing(!isEditing);
  };

  // Add a new card
  const addNewCard = () => {
    if (!editCard.front.trim() || !editCard.back.trim()) {
      setActionError("Front and back are required.");
      return;
    }
    setCardBusy(true);
    setActionError(null);
    createNewCard(_shelfId, _subjectId, [editCard])
      .then((res) => {
        if (res.isSuccess) {
          logger.debug("Created new card successfully:", res.data);
          fetchCardsData();
          setShowAddCardModal(false);
          setEditCard({ front: "", back: "" });
        } else {
          setActionError(res.message ?? "Failed to create card");
        }
      })
      .catch((error) => {
        logger.error("Error creating new card:", error);
        setActionError(error?.message ?? "Failed to create card");
      })
      .finally(() => setCardBusy(false));
  };

  // Update an existing card
  const updateExitCard = () => {
    if (!editCard.front.trim() || !editCard.back.trim() || !editingCardId) {
      setActionError("Front and back are required.");
      return;
    }
    setCardBusy(true);
    setActionError(null);
    updateCard(_shelfId, _subjectId, editingCardId, editCard)
      .then((res) => {
        if (res.isSuccess) {
          logger.debug("Updated card successfully:", res.data);
          fetchCardsData();
          setShowAddCardModal(false);
          setEditCard({ front: "", back: "" });
          setEditingCardId("");
        } else {
          setActionError(res.message ?? "Failed to update card");
        }
      })
      .catch((error) => {
        logger.error("Error updating card:", error);
        setActionError(error?.message ?? "Failed to update card");
      })
      .finally(() => setCardBusy(false));
  };

  const confirmDeleteCard = () => {
    if (!cardToDelete) return;
    setCardBusy(true);
    setActionError(null);
    deleteCard(_shelfId, _subjectId, cardToDelete)
      .then((res) => {
        if (res.isSuccess) {
          logger.debug("Deleted card successfully:", res.data);
          fetchCardsData();
          setCardToDelete(null);
        } else {
          setActionError(res.message ?? "Failed to delete card");
        }
      })
      .catch((error) => {
        logger.error("Error deleting card:", error);
        setActionError(error?.message ?? "Failed to delete card");
      })
      .finally(() => setCardBusy(false));
  };

  // Open modal to edit card
  const openEditCardModal = (card: { id: string; front: string; back: string }) => {
    setActionError(null);
    setEditCard({ front: card.front, back: card.back });
    setEditingCardId(card.id);
    setShowAddCardModal(true);
  };

  // Open modal to add new card
  const openAddCardModal = () => {
    setActionError(null);
    setEditingCardId("");
    setEditCard({ front: "", back: "" });
    setShowAddCardModal(true);
  };

  // Save settings
  const saveSettings = () => {
    if (params.shelfId && params.id && subjectStatsData) {
      const shelfId = params.shelfId as string;
      const id = params.id as string;
      setActionError(null);
      updateSubjectSetting(shelfId, id, {
        dailyLimit: subjectStatsData.dailyLimit,
        newCardsPerDay: subjectStatsData.newCardsPerDay,
        interval: subjectStatsData.interval,
      })
        .then((res) => {
          if (res.isSuccess) {
            logger.debug("Updated subject settings successfully");
            setShowSettingsModal(false);
            fetchSubjectStatsData();
          } else {
            setActionError(res.message ?? "Failed to update settings");
          }
        })
        .catch((error) => {
          logger.error("Error updating subject settings:", error);
          setActionError(error?.message ?? "Failed to update settings");
        });
    }
  };

  // Delete subject
  const openDeleteSubjectModal = () => setDeleteSubjectModalVisible(true);

  const handleDeleteSubject = () => {
    if (deleteSubjectConfirmText.trim().toLowerCase() !== "confirm") return;
    deleteSubjectApi(_shelfId, _subjectId)
      .then((res) => {
        if (res.isSuccess) {
          setDeleteSubjectModalVisible(false);
          setDeleteSubjectConfirmText("");
          router.back();
        } else {
          logger.error("Failed to delete subject:", res.message);
        }
      })
      .catch((error) => {
        logger.error("Error deleting subject:", error);
      });
  };

  return (
    <View className="flex-1 bg-gray-50" testID="subject-detail-screen">
      {/* Header */}
      <View
        className="bg-white pb-4 px-4 shadow-sm items-center"
        style={{ paddingTop: Math.max(insets.top, 12) }}
        testID="header-container"
      >
        <View className="w-full" style={contentFrameStyle}>
        <View className="flex-row items-center justify-between" testID="header-top-row">
          <View className="flex-row items-center" testID="header-left">
            <TouchableOpacity
              className="p-2 -ml-2"
              onPress={() => router.back()}
              testID="back-button"
            >
              <ChevronLeft size={24} color={uiTokens.text.secondary} />
            </TouchableOpacity>

            {isEditing ? (
              <TextInput
                className="text-xl font-bold text-gray-800 ml-2 flex-1 border-b border-indigo-300 py-1"
                value={subjectName}
                onChangeText={setSubjectName}
                placeholder="Subject name"
                autoFocus
                testID="subject-name-input"
              />
            ) : (
              <Text className="text-xl font-bold text-gray-800 ml-2" testID="subject-name-text">
                {subjectName}
              </Text>
            )}
          </View>

          <TouchableOpacity className="p-2" onPress={toggleEditMode} testID="edit-toggle-button">
            {isEditing ? (
              <Save size={20} color={uiTokens.accent.default} />
            ) : (
              <Edit3 size={20} color={uiTokens.text.secondary} />
            )}
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View className="mt-4" testID="progress-section">
          <View className="flex-row justify-between mb-1" testID="progress-header">
            <Text className="text-gray-600 font-medium" testID="progress-label">Progress</Text>
            <Text className="text-gray-600 font-medium" testID="progress-percentage">
              {subjectStatsData?.completedPercent ?? 0}%
            </Text>
          </View>
          <View className="bg-gray-200 rounded-full h-3" testID="progress-bar-background">
            <View
              className="bg-indigo-500 h-3 rounded-full"
              style={{ width: `${subjectStatsData?.completedPercent ?? 0}%` }}
              testID="progress-bar-fill"
            />
          </View>
        </View>
        </View>
      </View>

      {loading && (
        <View className="items-center py-8" testID="subject-loading-state">
          <ActivityIndicator size="large" color={uiTokens.accent.default} />
        </View>
      )}

      {loadError && (
        <View className="px-4 mt-4" style={contentFrameStyle}>
          <FeedbackMessage message={loadError} tone="error" testID="subject-load-error" />
        </View>
      )}

      {actionError && !showAddCardModal && !showSettingsModal && (
        <View className="px-4 mt-4" style={contentFrameStyle}>
          <FeedbackMessage message={actionError} tone="error" testID="subject-action-error" />
        </View>
      )}

      {/* Main Actions */}
      
      <View
        className="px-4 mt-6"
        style={contentFrameStyle}
        testID="main-actions-container"
      >
        {!isEditing && cardsData.length > 0 && (
          <>
            <TouchableOpacity
              className="bg-indigo-600 rounded-xl py-5 mb-3 items-center shadow-sm"
              onPress={() => router.push(`/${_shelfId}/review/${_subjectId}`)}
              testID="review-due-cards-button"
            >
              <Text className="text-white text-lg font-bold" testID="review-due-cards-title">Review Due Cards</Text>
              <Text className="text-indigo-200 mt-1" testID="review-due-cards-count">
                {subjectStatsData?.overdue ?? 0} cards ready for review
              </Text>
            </TouchableOpacity>
            <View className="flex-row gap-3 mb-4" testID="study-modes-row">
              <TouchableOpacity
                className="flex-1 bg-white rounded-xl py-4 items-center border border-gray-200"
                onPress={() => router.push(`/${_shelfId}/learn/${_subjectId}`)}
                testID="learn-mode-button"
              >
                <Text className="text-gray-800 font-bold" testID="learn-mode-button-text">Learn</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-white rounded-xl py-4 items-center border border-gray-200"
                onPress={() => router.push(`/${_shelfId}/match/${_subjectId}`)}
                testID="match-mode-button"
              >
                <Text className="text-gray-800 font-bold" testID="match-mode-button-text">Match</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View className="flex-col gap-3 mt-2" testID="action-buttons-container">
          <View className="flex-row gap-3" testID="add-settings-row">
            <TouchableOpacity
              className="flex-1 bg-white rounded-xl py-4 items-center border border-gray-200 flex-row justify-center"
              onPress={openAddCardModal}
              testID="add-card-button"
            >
              <Plus size={20} color={uiTokens.text.secondary} />
              <Text className="text-gray-800 font-bold ml-2" testID="add-card-button-text">{cardsData.length === 0 ? "Add Your First Card" : "Add Card"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-white rounded-xl py-4 items-center border border-gray-200 flex-row justify-center"
              onPress={() => {
                setActionError(null);
                setShowSettingsModal(true);
              }}
              testID="settings-button"
            >
              <Settings size={20} color={uiTokens.text.secondary} />
              <Text className="text-gray-800 font-bold ml-2" testID="settings-button-text">Settings</Text>
            </TouchableOpacity>
          </View>
          {isEditing && (
            <TouchableOpacity
              className="bg-red-50 rounded-xl py-4 items-center border border-red-200 flex-row justify-center"
              onPress={openDeleteSubjectModal}
              testID="delete-subject-button"
            >
              <Trash2 size={20} color={uiTokens.state.error.solid} />
              <Text className="text-red-600 font-bold ml-2" testID="delete-subject-button-text">
                Delete Subject
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Card List */}
      <View
        className="mt-6 px-4 flex-1"
        style={contentFrameStyle}
        testID="card-list-container"
      >
        <View className="flex-row justify-between items-center mb-3" testID="card-list-header">
          <Text className="text-gray-700 font-bold" testID="card-list-title">Cards in this subject</Text>
          <Text className="text-gray-500 text-sm" testID="card-list-count">
            {cardsData.length} cards
          </Text>
        </View>

        {!loading && cardsData.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12" testID="empty-cards-container">
            <BookOpen size={48} color={uiTokens.text.muted} />
            <Text className="text-gray-500 mt-4 text-center" testID="empty-cards-text">
              No cards in this subject yet
            </Text>
            <TouchableOpacity
              className="mt-4 bg-indigo-600 rounded-xl px-5 py-3"
              onPress={openAddCardModal}
              testID="empty-add-card-cta"
            >
              <Text className="text-white font-bold">Add your first card</Text>
            </TouchableOpacity>
          </View>
        ) : !loading ? (
          <FlatList
            data={cardsData}
            keyExtractor={(item) => item.id}
            testID="cards-flatlist"
            renderItem={({ item, index }) => (
              <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100" testID={`card-item-${item.id}`}>
                {isEditing ? (
                  <>
                    <View className="flex-row justify-between" testID={`card-edit-container-${item.id}`}>
                      <View className="flex-1" testID={`card-content-${item.id}`}>
                        <Text className="text-gray-800 font-medium" testID={`card-front-${item.id}`}>
                          {item.front}
                        </Text>
                        <Text className="text-gray-500 text-sm mt-1" testID={`card-back-${item.id}`}>
                          {item.back}
                        </Text>
                      </View>
                      <View className="flex-row" testID={`card-actions-${item.id}`}>
                        <TouchableOpacity
                          className="p-2 ml-2"
                          onPress={() => openEditCardModal(item)}
                          testID={`edit-card-button-${item.id}`}
                        >
                          <Edit3 size={18} color={uiTokens.text.secondary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="p-2"
                          onPress={() => setCardToDelete(item.id)}
                          testID={`delete-card-button-${item.id}`}
                        >
                          <Trash2 size={18} color={uiTokens.state.error.solid} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {index === cardsData.length - 1 && (
                      <TouchableOpacity
                        className="mt-3 flex-row items-center justify-center py-2 border-t border-gray-100"
                        onPress={openAddCardModal}
                        testID="add-another-card-button"
                      >
                        <Plus size={16} color={uiTokens.accent.default} />
                        <Text className="text-indigo-600 font-medium ml-1" testID="add-another-card-text">
                          Add Another Card
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <>
                    <Text className="text-gray-800 font-medium" testID={`card-front-${item.id}`}>
                      {item.front}
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1" testID={`card-back-${item.id}`}>
                      {item.back}
                    </Text>
                  </>
                )}
              </View>
            )}
          />
        ) : null}
      </View>

      {/* Add/Edit Card Modal */}
      <Modal
        visible={showAddCardModal}
        transparent={true}
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowAddCardModal(false)}
        testID="add-edit-card-modal"
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowAddCardModal(false)}
          testID="modal-backdrop"
        >
          <Pressable
            className="mt-auto bg-white rounded-t-2xl p-6 pb-8"
            style={sheetFrameStyle}
            onPress={(e) => e.stopPropagation()}
            testID="modal-content"
          >
            <View className="flex-row justify-between items-center mb-4" testID="modal-header">
              <Text className="text-xl font-bold text-gray-800" testID="modal-title">
                {editingCardId ? "Edit Card" : "Add New Card"}
              </Text>
              <TouchableOpacity
                className="p-2"
                onPress={() => {
                  setShowAddCardModal(false);
                  setActionError(null);
                }}
                testID="modal-close-button"
              >
                <X size={24} color={uiTokens.text.muted} />
              </TouchableOpacity>
            </View>

            {actionError && (
              <View className="mb-3">
                <FeedbackMessage message={actionError} tone="error" testID="card-modal-error" />
              </View>
            )}

            <View className="mb-4" testID="front-input-container">
              <Text className="text-gray-700 font-medium mb-2" testID="front-label">Front</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                placeholder="Enter question or term"
                value={editCard.front}
                onChangeText={(text) =>
                  setEditCard({
                    ...editCard,
                    front: text,
                  })
                }
                multiline
                numberOfLines={3}
                testID="front-input"
              />
            </View>

            <View className="mb-6" testID="back-input-container">
              <Text className="text-gray-700 font-medium mb-2" testID="back-label">Back</Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                placeholder="Enter answer or definition"
                value={editCard.back}
                onChangeText={(text) =>
                {
                  setEditCard({
                    ...editCard,
                    back: text,
                  })
                }
                  
                }
                multiline
                numberOfLines={3}
                testID="back-input"
              />
            </View>

            <TouchableOpacity
              className={`rounded-xl py-4 items-center ${
                 editCard.front.trim() &&
                editCard.back.trim() &&
                !cardBusy
                  ? "bg-indigo-600"
                  : "bg-gray-300"
              }`}
              disabled={
                !editCard.front.trim() ||
                !editCard.back.trim() ||
                cardBusy
              }
              onPress={editingCardId !== '' ? updateExitCard : addNewCard}
              testID="submit-card-button"
            >
              {cardBusy ? (
                <ActivityIndicator color="#FFFFFF" testID="submit-card-spinner" />
              ) : (
                <Text className="text-white font-bold" testID="submit-card-button-text">
                  {editingCardId ? "Update Card" : "Add Card"}
                </Text>
              )}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Card Confirmation Modal */}
      <Modal
        visible={cardToDelete !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setCardToDelete(null)}
        testID="delete-card-modal"
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => setCardToDelete(null)}
        >
          <Pressable
            className="bg-white rounded-2xl w-full max-w-md p-6"
            onPress={(e) => e.stopPropagation()}
            testID="delete-card-modal-content"
          >
            <Text className="text-xl font-bold text-gray-800 mb-2">Delete card?</Text>
            <Text className="text-gray-600 mb-4">
              This soft-deletes the card. You can cancel if this was a mistake.
            </Text>
            {actionError && (
              <View className="mb-3">
                <FeedbackMessage message={actionError} tone="error" testID="delete-card-error" />
              </View>
            )}
            <View className="flex-row gap-3">
              <TouchableOpacity
                className="flex-1 bg-gray-200 rounded-xl py-3 items-center"
                onPress={() => setCardToDelete(null)}
                testID="delete-card-cancel"
              >
                <Text className="text-gray-700 font-bold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 bg-red-500 rounded-xl py-3 items-center"
                onPress={confirmDeleteCard}
                disabled={cardBusy}
                testID="delete-card-confirm"
              >
                {cardBusy ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white font-bold">Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={() => setShowSettingsModal(false)}
        testID="settings-modal"
      >
        <Pressable
          className="flex-1 bg-black/50 justify-end"
          onPress={() => setShowSettingsModal(false)}
          testID="settings-modal-backdrop"
        >
          <Pressable
            className="mt-auto bg-white rounded-t-2xl p-6 pb-8"
            style={sheetFrameStyle}
            onPress={(e) => e.stopPropagation()}
            testID="settings-modal-content"
          >
            <View className="flex-row justify-between items-center mb-4" testID="settings-modal-header">
              <Text className="text-xl font-bold text-gray-800" testID="settings-modal-title">
                Study Settings
              </Text>
              <TouchableOpacity
                className="p-2"
                onPress={() => setShowSettingsModal(false)}
                testID="settings-modal-close-button"
              >
                <X size={24} color={uiTokens.text.muted} />
              </TouchableOpacity>
            </View>

            <View className="mb-4" testID="daily-limit-container">
              <Text className="text-gray-700 font-medium mb-2" testID="daily-limit-label">
                Daily Card Limit
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                placeholder="Number of cards per day"
                value={subjectStatsData?.dailyLimit.toString()}
                onChangeText={(text) => {
                  subjectStatsData &&
                    setSubjectStatsData({
                      ...subjectStatsData,
                      dailyLimit: parseInt(text) || 0,
                    });
                }}
                keyboardType="numeric"
                testID="daily-limit-input"
              />
              <Text className="text-gray-500 text-sm mt-1" testID="daily-limit-hint">
                Maximum cards to study per day
              </Text>
            </View>

            <View className="mb-4" testID="new-cards-container">
              <Text className="text-gray-700 font-medium mb-2" testID="new-cards-label">
                New Cards Per Day
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                placeholder="Number of new cards"
                value={subjectStatsData?.newCardsPerDay.toString()}
                onChangeText={(text) => {
                  subjectStatsData &&
                    setSubjectStatsData({
                      ...subjectStatsData,
                      newCardsPerDay: parseInt(text) || 0,
                    });
                }}
                keyboardType="numeric"
                testID="new-cards-input"
              />
              <Text className="text-gray-500 text-sm mt-1" testID="new-cards-hint">
                Maximum new cards to introduce per day
              </Text>
            </View>

            <View className="mb-6" testID="interval-container">
              <Text className="text-gray-700 font-medium mb-2" testID="interval-label">
                Interval Modifier (%)
              </Text>
              <TextInput
                className="border border-gray-300 rounded-lg p-3 bg-gray-50"
                placeholder="Percentage modifier"
                value={subjectStatsData?.interval.toString()}
                onChangeText={(text) => {
                  subjectStatsData &&
                    setSubjectStatsData({
                      ...subjectStatsData,
                      interval: parseInt(text) || 100,
                    });
                }}
                keyboardType="numeric"
                testID="interval-input"
              />
              <Text className="text-gray-500 text-sm mt-1" testID="interval-hint">
                Adjust how quickly intervals increase
              </Text>
            </View>

            <TouchableOpacity
              className="bg-indigo-600 rounded-xl py-4 items-center"
              onPress={saveSettings}
              testID="save-settings-button"
            >
              <Text className="text-white font-bold" testID="save-settings-button-text">Save Settings</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete Subject Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteSubjectModalVisible}
        onRequestClose={() => setDeleteSubjectModalVisible(false)}
      >
        <Pressable
          className="flex-1 bg-black/50 justify-center items-center px-6"
          onPress={() => setDeleteSubjectModalVisible(false)}
        >
          <Pressable
            className="bg-white rounded-2xl w-full max-w-md"
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row justify-between items-center p-6 pb-4 border-b border-gray-100">
              <Text className="text-xl font-bold text-gray-800">
                Permanently Delete Subject
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setDeleteSubjectModalVisible(false);
                  setDeleteSubjectConfirmText("");
                }}
                className="p-1"
              >
                <X size={24} color={uiTokens.text.muted} />
              </TouchableOpacity>
            </View>
            <View className="px-6 py-4">
              <Text className="text-gray-700 font-semibold mb-2">
                This will permanently delete &quot;{subjectName}&quot; and all its contents:
              </Text>
              <Text className="text-gray-600 mb-4">
                • All cards in this subject will be deleted.
              </Text>
              <Text className="text-gray-700 font-semibold mb-2">
                This action cannot be undone. Type &quot;confirm&quot; below and click Confirm and Acknowledge to proceed.
              </Text>
              <TextInput
                className="bg-gray-50 rounded-xl p-4 text-gray-800 border border-gray-200 mt-2 mb-4"
                placeholder="Type confirm to acknowledge"
                placeholderTextColor={uiTokens.text.muted}
                value={deleteSubjectConfirmText}
                onChangeText={setDeleteSubjectConfirmText}
              />
              <View className="flex-row gap-3 mt-2">
                <TouchableOpacity
                  className="flex-1 bg-gray-200 rounded-xl py-4 items-center"
                  onPress={() => {
                    setDeleteSubjectModalVisible(false);
                    setDeleteSubjectConfirmText("");
                  }}
                >
                  <Text className="text-gray-700 font-bold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 rounded-xl py-4 items-center ${
                    deleteSubjectConfirmText.trim().toLowerCase() === "confirm"
                      ? "bg-red-500"
                      : "bg-red-400"
                  }`}
                  onPress={handleDeleteSubject}
                  disabled={deleteSubjectConfirmText.trim().toLowerCase() !== "confirm"}
                >
                  <Text className="text-white font-bold">Confirm and Acknowledge</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

export default SubjectDetailScreen;
