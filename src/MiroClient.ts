import { request } from 'undici';
import type { components } from './types/miro-api.js';

interface MiroBoard {
  id: string;
  name: string;
  description?: string;
}

interface MiroBoardsResponse {
  data: MiroBoard[];
  total: number;
  size: number;
  offset: number;
}

type MiroItem =
  | components["schemas"]["GenericItem"]
  | components["schemas"]["AppCardItem"]
  | components["schemas"]["CardItem"]
  | components["schemas"]["DocumentItem"]
  | components["schemas"]["EmbedItem"]
  | components["schemas"]["FrameItem"]
  | components["schemas"]["ImageItem"]
  | components["schemas"]["MindmapItem"]
  | components["schemas"]["ShapeItem"]
  | components["schemas"]["StickyNoteItem"]
  | components["schemas"]["TextItem"];

interface MiroItemsResponse<T = MiroItem> {
  data?: T[];
  cursor?: string;
  limit?: number;
  size?: number;
  total?: number;
  links?: components["schemas"]["PageLinks"];
}

interface MiroBulkItemsResponse<T = MiroItem> {
  data?: T[];
  type?: string;
}

export class MiroClient {
  constructor(private token: string) {}

  private async fetchApi(path: string, options: { method?: string; body?: any } = {}) {
    const { statusCode, body } = await request(`https://api.miro.com/v2${path}`, {
      method: options.method || 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await body.json() as any;

    if (statusCode >= 400) {
      throw new Error(`Miro API error: ${statusCode} ${data?.message || ''}`);
    }

    return data;
  }

  async getBoards(): Promise<MiroBoard[]> {
    const response = await this.fetchApi('/boards') as MiroBoardsResponse;
    return response.data;
  }

  async getBoardItems(boardId: string): Promise<MiroItem[]> {
    const response = await this.fetchApi(`/boards/${boardId}/items?limit=50`) as MiroItemsResponse;
    return response.data ?? [];
  }

  async createStickyNote(
    boardId: string,
    data: components["schemas"]["StickyNoteCreateRequest"],
  ): Promise<components["schemas"]["StickyNoteItem"]> {
    return this.fetchApi(`/boards/${boardId}/sticky_notes`, {
      method: 'POST',
      body: data,
    }) as Promise<components["schemas"]["StickyNoteItem"]>;
  }

  async bulkCreateItems(
    boardId: string,
    items: components["schemas"]["ItemCreate"][],
  ): Promise<MiroItem[]> {
    const response = await this.fetchApi(`/boards/${boardId}/items/bulk`, {
      method: 'POST',
      body: items,
    }) as MiroBulkItemsResponse;

    return response.data ?? [];
  }

  async getFrames(
    boardId: string,
  ): Promise<MiroItem[]> {
    const response = await this.fetchApi(
      `/boards/${boardId}/items?type=frame&limit=50`,
    ) as MiroItemsResponse;
    return response.data ?? [];
  }

  async getItemsInFrame(
    boardId: string,
    frameId: string,
  ): Promise<MiroItem[]> {
    const response = await this.fetchApi(
      `/boards/${boardId}/items?parent_item_id=${frameId}&limit=50`,
    ) as MiroItemsResponse;
    return response.data ?? [];
  }

  async createShape(
    boardId: string,
    data: components["schemas"]["ShapeCreateRequest"],
  ): Promise<components["schemas"]["ShapeItem"]> {
    return this.fetchApi(`/boards/${boardId}/shapes`, {
      method: 'POST',
      body: data,
    }) as Promise<components["schemas"]["ShapeItem"]>;
  }
}