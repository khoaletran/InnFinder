import type { RoomSummaryResponse } from '@/types/room.types';

export interface SearchCriteria {
  location?: string | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  minArea?: number | null;
  maxArea?: number | null;
  capacity?: number | null;
  categoryId?: string | null;
  amenityIds?: string[];
  sort?: 'RELEVANCE' | 'PRICE_ASC' | 'PRICE_DESC';
}

export interface ChatRequest {
  message: string;
  history: { role: 'user' | 'assistant'; text: string }[];
  currentRoomId?: string;
  selectedRoomId?: string;
  roomIds: string[];
  criteria?: SearchCriteria;
  userLat?: number;
  userLng?: number;
}

export interface ChatResponse {
  message: string;
  rooms: RoomSummaryResponse[];
  action: { type: 'OPEN_BOOKING'; roomId: string } | null;
  criteria: SearchCriteria | null;
  suggestions: string[];
  searchMode: 'SEMANTIC' | 'FILTERED' | 'CONTEXT';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  rooms?: RoomSummaryResponse[];
  suggestions?: string[];
  searchMode?: ChatResponse['searchMode'];
}

export interface AiSearchResponse {
  rooms: RoomSummaryResponse[];
  criteria: SearchCriteria | null;
  searchMode: ChatResponse['searchMode'];
}
