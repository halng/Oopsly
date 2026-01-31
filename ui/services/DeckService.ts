/*
 *    Copyright 2025 Hao Nguyen Tan
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

import { apiClient } from ".";
import { Deck, CreateDeckVm, UpdateDeckVm } from "@/types/Deck";

const DECK_PATHS = {
  GET_DECKS: {
    method: "GET",
    url: "/decks",
    description: "Get all decks",
  },
  CREATE_DECK: {
    method: "POST",
    url: "/decks",
    description: "Create a new deck",
  },
  UPDATE_DECK: {
    method: "PUT",
    url: "/decks",
    description: "Update a deck",
  },
  DELETE_DECK: {
    method: "PATCH",
    url: "/decks",
    description: "Soft delete a deck",
  },
};

const fetchDecks = async (): Promise<Deck[]> => {
  const response = await apiClient.get<Deck[]>(DECK_PATHS.GET_DECKS.url);
  return response.data;
};

const createDeck = async (data: CreateDeckVm): Promise<Deck> => {
  const response = await apiClient.post<Deck>(DECK_PATHS.CREATE_DECK.url, data);
  return response.data;
};

const updateDeck = async (id: string, data: UpdateDeckVm): Promise<Deck> => {
  const url = `${DECK_PATHS.UPDATE_DECK.url}/${id}`;
  const response = await apiClient.put<Deck>(url, data);
  return response.data;
};

const deleteDeck = async (id: string): Promise<void> => {
  const url = `${DECK_PATHS.DELETE_DECK.url}/${id}`;
  await apiClient.patch(url);
};

export const DeckService = {
  fetchDecks,
  createDeck,
  updateDeck,
  deleteDeck,
};
