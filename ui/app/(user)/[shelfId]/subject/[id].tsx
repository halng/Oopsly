import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
} from "react-native";
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
import { SubjectStats } from "@/types/Subject";
import { CardCreateRequest, CardRes } from "@/types/Card";
import {
  getSubjectById,
  updateSubjectById,
  updateSubjectSetting,
} from "@/services/SubjectService";


const SubjectDetailScreen = () => {
  const logger = Logger.extend("SubjectDetailScreen");

  const router = useRouter();
  const params = useLocalSearchParams();
  const _shelfId = params.shelfId as string;
  const _subjectId = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [editCard, setEditCard] = useState<CardCreateRequest>({ front: "", back: "" });
  const [editingCardId, setEditingCardId] = useState('');
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [subjectStatsData, setSubjectStatsData] = useState<SubjectStats>();
  const [cardsData, setCardsData] = useState<CardRes[]>([]);

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
    Promise.all([fetchSubjectStatsData(), fetchCardsData()])
      .then(() => {
        logger.debug("Fetched subject stats and cards data");
      })
      .catch((error) => {
        logger.error("Error fetching subject stats or cards data:", error);
      });
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
    if (editCard.front.trim() && editCard.back.trim()) {
      const _shelfId = params.shelfId as string;
      const _subjectId = params.id as string;
      createNewCard(_shelfId, _subjectId, [editCard])
        .then((res) => {
          if (res.isSuccess) {
            logger.debug("Created new card successfully:", res.data);
            fetchCardsData();
          } else {
            logger.error("Failed to create new card");
          }
          setShowAddCardModal(false);
          setEditCard({ front: "", back: ""});
        })
        .catch((error) => {
          logger.error("Error creating new card:", error);
        });
    }
  };

  // Update an existing card
  const updateExitCard = () => {
    if (editCard.front.trim() && editCard.back.trim() && editingCardId) {
      updateCard(
        _shelfId,
        _subjectId,
        editingCardId,
        editCard
      )
        .then((res) => {
          if (res.isSuccess) {
            logger.debug("Updated card successfully:", res.data);
            fetchCardsData();
          } else {
            logger.error("Failed to update card");
          }
        })
        .catch((error) => {
          logger.error("Error updating card:", error);
        })
        .finally(() => {
          setShowAddCardModal(false);
          setEditCard({ front: "", back: ""});
          setEditingCardId('');
        });
    }
  };

  // Delete a card
  const deleteExistCard = (cardId: string) => {
     deleteCard(_shelfId, _subjectId, cardId)
              .then((res) => {
                if (res.isSuccess) {
                  logger.debug("Deleted card successfully:", res.data);
                  fetchCardsData();
                } else {
                  logger.error("Failed to delete card");
                }
              })
              .catch((error) => {
                logger.error("Error deleting card:", error);
              });
    // Alert.alert(
    //   "Delete Card",
    //   "Are you sure you want to delete this card? This action cannot be undone.",
    //   [
    //     { text: "Cancel", style: "cancel" },
    //     {
    //       text: "Delete",
    //       style: "destructive",
    //       onPress: () => {
           
    //       },
    //     },
    //   ],
    // );
  };

  // Open modal to edit card
  const openEditCardModal = (card: { id: string; front: string; back: string }) => {
    setEditCard({ front: card.front, back: card.back });
    setEditingCardId(card.id);
    setShowAddCardModal(true);
  };

  // Open modal to add new card
  const openAddCardModal = () => {
    setShowAddCardModal(true);
  };

  // Save settings
  const saveSettings = () => {
    // setSubject({ ...subject, settings });
    if (params.shelfId && params.id && subjectStatsData) {
      const _shelfId = params.shelfId as string;
      const _id = params.id as string;
      updateSubjectSetting(_shelfId, _id, {
        dailyLimit: subjectStatsData.dailyLimit,
        newCardsPerDay: subjectStatsData.newCardsPerDay,
        interval: subjectStatsData.interval,
      })
        .then((res) => {
          if (res.isSuccess) {
            logger.debug("Updated subject settings successfully");
          } else {
            logger.error("Failed to update subject settings");
          }
          setShowSettingsModal(false);
          fetchSubjectStatsData();
        })
        .catch((error) => {
          logger.error("Error updating subject settings:", error);
        });
    }
  };

  // Delete subject
  const deleteSubject = () => {
    Alert.alert(
      "Delete Subject",
      `Are you sure you want to delete "${subjectName}"? All cards will be permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // In a real app, this would delete the subject from storage
            router.back();
          },
        },
      ],
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white pt-12 pb-4 px-4 shadow-sm">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <TouchableOpacity
              className="p-2 -ml-2"
              onPress={() => router.back()}
            >
              <ChevronLeft size={24} color="#4B5563" />
            </TouchableOpacity>

            {isEditing ? (
              <TextInput
                className="text-xl font-bold text-gray-800 ml-2 flex-1 border-b border-indigo-300 py-1"
                value={subjectName}
                onChangeText={setSubjectName}
                placeholder="Subject name"
                autoFocus
              />
            ) : (
              <Text className="text-xl font-bold text-gray-800 ml-2">
                {subjectName}
              </Text>
            )}
          </View>

          <TouchableOpacity className="p-2" onPress={toggleEditMode}>
            {isEditing ? (
              <Save size={20} color="#4F46E5" />
            ) : (
              <Edit3 size={20} color="#4B5563" />
            )}
          </TouchableOpacity>
        </View>

        {/* Progress Bar */}
        <View className="mt-4">
          <View className="flex-row justify-between mb-1">
            <Text className="text-gray-600 font-medium">Progress</Text>
            <Text className="text-gray-600 font-medium">
              {subjectStatsData?.completedPercent}%
            </Text>
          </View>
          <View className="bg-gray-200 rounded-full h-3">
            <View
              className="bg-indigo-500 h-3 rounded-full"
              style={{ width: `${subjectStatsData?.completedPercent}%` }}
            />
          </View>
        </View>
      </View>

      {/* Main Actions */}
      
      <View className="px-4 mt-6">
        {!isEditing && 
        <TouchableOpacity
          className="bg-indigo-600 rounded-xl py-5 mb-4 items-center shadow-sm"
          onPress={() => router.push(`/study/${subjectStatsData?.id}`)}
        >
          <Text className="text-white text-lg font-bold">Review Due Cards</Text>
          <Text className="text-indigo-200 mt-1">
            {subjectStatsData?.overdue} cards ready for review
          </Text>
        </TouchableOpacity>}

        {/* TODO: will be enable with subscription user or phase 2 */}
        {/* <TouchableOpacity 
          className="bg-white rounded-xl py-5 items-center border border-gray-200 mb-4"
          onPress={() => {}}
        >
          <Text className="text-gray-800 text-lg font-bold">Take AI Quiz</Text>
          <Text className="text-gray-500 mt-1">Generate personalized quiz</Text>
        </TouchableOpacity> */}

        <View className="flex-col gap-3 mt-2">
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 bg-white rounded-xl py-4 items-center border border-gray-200 flex-row justify-center"
              onPress={openAddCardModal}
            >
              <Plus size={20} color="#4B5563" />
              <Text className="text-gray-800 font-bold ml-2">{cardsData.length === 0 ? "Add Your First Card" : "Add Card"}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              className="flex-1 bg-white rounded-xl py-4 items-center border border-gray-200 flex-row justify-center"
              onPress={() => setShowSettingsModal(true)}
            >
              <Settings size={20} color="#4B5563" />
              <Text className="text-gray-800 font-bold ml-2">Settings</Text>
            </TouchableOpacity>
          </View>
          {isEditing && (
            <TouchableOpacity
              className="bg-red-50 rounded-xl py-4 items-center border border-red-200 flex-row justify-center"
              onPress={deleteSubject}
            >
              <Trash2 size={20} color="#EF4444" />
              <Text className="text-red-600 font-bold ml-2">
                Delete Subject
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Card List */}
      <View className="mt-6 px-4 flex-1">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-gray-700 font-bold">Cards in this subject</Text>
          <Text className="text-gray-500 text-sm">
            {cardsData.length} cards
          </Text>
        </View>

        {cardsData.length === 0 ? (
          <View className="flex-1 items-center justify-center py-12">
            <BookOpen size={48} color="#9CA3AF" />
            <Text className="text-gray-500 mt-4 text-center">
              No cards in this subject yet
            </Text>
          </View>
        ) : (
          <FlatList
            data={cardsData}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <View className="bg-white rounded-lg p-4 mb-3 shadow-sm border border-gray-100">
                {isEditing ? (
                  <>
                    <View className="flex-row justify-between">
                      <View className="flex-1">
                        <Text className="text-gray-800 font-medium">
                          {item.front}
                        </Text>
                        <Text className="text-gray-500 text-sm mt-1">
                          {item.back}
                        </Text>
                      </View>
                      <View className="flex-row">
                        <TouchableOpacity
                          className="p-2 ml-2"
                          onPress={() => openEditCardModal(item)}
                        >
                          <Edit3 size={18} color="#4B5563" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          className="p-2"
                          onPress={() => deleteExistCard(item.id)}
                        >
                          <Trash2 size={18} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                    {index === cardsData.length - 1 && (
                      <TouchableOpacity
                        className="mt-3 flex-row items-center justify-center py-2 border-t border-gray-100"
                        onPress={openAddCardModal}
                      >
                        <Plus size={16} color="#4F46E5" />
                        <Text className="text-indigo-600 font-medium ml-1">
                          Add Another Card
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : (
                  <>
                    <Text className="text-gray-800 font-medium">
                      {item.front}
                    </Text>
                    <Text className="text-gray-500 text-sm mt-1">
                      {item.back}
                    </Text>
                  </>
                )}
              </View>
            )}
          />
        )}
      </View>

      {/* Add/Edit Card Modal */}
      <Modal
        visible={showAddCardModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddCardModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800">
                {editingCardId ? "Edit Card" : "Add New Card"}
              </Text>
              <TouchableOpacity
                className="p-2"
                onPress={() => setShowAddCardModal(false)}
              >
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">Front</Text>
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
              />
            </View>

            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">Back</Text>
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
              />
            </View>

            <TouchableOpacity
              className={`rounded-xl py-4 items-center ${
                 editCard.front.trim() &&
                editCard.back.trim()
                  ? "bg-indigo-600"
                  : "bg-gray-300"
              }`}
              disabled={
                !editCard.front.trim() ||
                !editCard.back.trim()
              }
              onPress={editingCardId !== '' ? updateExitCard : addNewCard}
            >
              <Text className="text-white font-bold">
                {editingCardId ? "Update Card" : "Add Card"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal
        visible={showSettingsModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-2xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-gray-800">
                Study Settings
              </Text>
              <TouchableOpacity
                className="p-2"
                onPress={() => setShowSettingsModal(false)}
              >
                <X size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">
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
              />
              <Text className="text-gray-500 text-sm mt-1">
                Maximum cards to study per day
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-gray-700 font-medium mb-2">
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
              />
              <Text className="text-gray-500 text-sm mt-1">
                Maximum new cards to introduce per day
              </Text>
            </View>

            <View className="mb-6">
              <Text className="text-gray-700 font-medium mb-2">
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
              />
              <Text className="text-gray-500 text-sm mt-1">
                Adjust how quickly intervals increase
              </Text>
            </View>

            <TouchableOpacity
              className="bg-indigo-600 rounded-xl py-4 items-center"
              onPress={saveSettings}
            >
              <Text className="text-white font-bold">Save Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default SubjectDetailScreen;
