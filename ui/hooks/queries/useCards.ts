import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchCardsDataBySubjectAndShelf,
  createNewCard,
  updateCard,
  deleteCard,
  updateDifficultyLevels,
} from "@/services/CardService";
import { CardCreateRequest, ReviewedFlashcard } from "@/types/Card";
import Toast from "react-native-toast-message";

export const CARDS_QUERY_KEY = ["cards"];

export const useCards = (shelfId: string, subjectId: string, enabled = true) => {
  return useQuery({
    queryKey: [...CARDS_QUERY_KEY, shelfId, subjectId],
    queryFn: async () => {
      const res = await fetchCardsDataBySubjectAndShelf(shelfId, subjectId);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    enabled: !!shelfId && !!subjectId && enabled,
  });
};

export const useCreateCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shelfId,
      subjectId,
      cards,
    }: {
      shelfId: string;
      subjectId: string;
      cards: CardCreateRequest[];
    }) => {
      const res = await createNewCard(shelfId, subjectId, cards);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...CARDS_QUERY_KEY, variables.shelfId, variables.subjectId],
      });
      Toast.show({ type: "success", text1: "Card(s) created successfully" });
    },
    onError: (error) => {
      Toast.show({ type: "error", text1: "Failed to create card(s)", text2: error.message });
    },
  });
};

export const useUpdateCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shelfId,
      subjectId,
      cardId,
      data,
    }: {
      shelfId: string;
      subjectId: string;
      cardId: string;
      data: CardCreateRequest;
    }) => {
      const res = await updateCard(shelfId, subjectId, cardId, data);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...CARDS_QUERY_KEY, variables.shelfId, variables.subjectId],
      });
      Toast.show({ type: "success", text1: "Card updated successfully" });
    },
    onError: (error) => {
      Toast.show({ type: "error", text1: "Failed to update card", text2: error.message });
    },
  });
};

export const useDeleteCard = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shelfId,
      subjectId,
      cardId,
    }: {
      shelfId: string;
      subjectId: string;
      cardId: string;
    }) => {
      const res = await deleteCard(shelfId, subjectId, cardId);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...CARDS_QUERY_KEY, variables.shelfId, variables.subjectId],
      });
      Toast.show({ type: "success", text1: "Card deleted successfully" });
    },
    onError: (error) => {
      Toast.show({ type: "error", text1: "Failed to delete card", text2: error.message });
    },
  });
};

export const useReviewFlashcards = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shelfId,
      subjectId,
      reviews,
    }: {
      shelfId: string;
      subjectId: string;
      reviews: ReviewedFlashcard[];
    }) => {
      const res = await updateDifficultyLevels(shelfId, subjectId, reviews);
      if (!res.isSuccess) throw new Error(res.message);
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [...CARDS_QUERY_KEY, variables.shelfId, variables.subjectId],
      });
      // Do not show toast for review to avoid spamming the user
    },
    onError: (error) => {
      Toast.show({ type: "error", text1: "Failed to sync review results", text2: error.message });
    },
  });
};
