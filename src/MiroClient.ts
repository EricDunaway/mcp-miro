
import { request } from 'undici';

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

interface MiroItem {
  id: string;
  type: string;
  [key: string]: any;
}

interface MiroItemsResponse {
  data: MiroItem[];
  cursor?: string;
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
    return response.data;
  }

  async createStickyNote(boardId: string, data: any): Promise<MiroItem> {
    return this.fetchApi(`/boards/${boardId}/sticky_notes`, {
      method: 'POST',
      body: data
    }) as Promise<MiroItem>;
  }

  async bulkCreateItems(boardId: string, items: any[]): Promise<MiroItem[]> {
    const { statusCode, body } = await request(`https://api.miro.com/v2/boards/${boardId}/items/bulk`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(items)
    });

    const result = await body.json() as { data?: MiroItem[]; message?: string };

    if (statusCode >= 400) {
      throw new Error(`Miro API error: ${result.message || statusCode}`);
    }

    return result.data || [];
  }

  async getFrames(boardId: string): Promise<MiroItem[]> {
    const response = await this.fetchApi(`/boards/${boardId}/items?type=frame&limit=50`) as MiroItemsResponse;
    return response.data;
  }

  async getItemsInFrame(boardId: string, frameId: string): Promise<MiroItem[]> {
    const response = await this.fetchApi(`/boards/${boardId}/items?parent_item_id=${frameId}&limit=50`) as MiroItemsResponse;
    return response.data;
  }

  async createShape(boardId: string, data: any): Promise<MiroItem> {
    return this.fetchApi(`/boards/${boardId}/shapes`, {
      method: 'POST',
      body: data
    }) as Promise<MiroItem>;
  }
}