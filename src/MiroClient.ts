// MiroClient.js - Updated with all necessary API methods

export class MiroClient {
  constructor(oauthToken) {
    this.oauthToken = oauthToken;
    this.baseUrl = "https://api.miro.com/v2";
  }

  async makeRequest(method, path, data = null) {
    const options = {
      method,
      headers: {
        Authorization: `Bearer ${this.oauthToken}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${this.baseUrl}${path}`, options);
    
    if (response.status === 204) {
      return null; // No content (successful delete)
    }

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(
        `Miro API error: ${response.status} - ${
          responseData.message || JSON.stringify(responseData)
        }`
      );
    }

    return responseData;
  }

  // Board operations
  async getBoards() {
    const response = await this.makeRequest("GET", "/boards");
    return response.data || [];
  }

  async getBoardItems(boardId, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const path = `/boards/${boardId}/items${queryParams ? `?${queryParams}` : ""}`;
    const response = await this.makeRequest("GET", path);
    return response.data || [];
  }

  // Generic item operations
  async getItems(boardId, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const path = `/boards/${boardId}/items${queryParams ? `?${queryParams}` : ""}`;
    return await this.makeRequest("GET", path);
  }

  async getItem(boardId, itemId) {
    return await this.makeRequest("GET", `/boards/${boardId}/items/${itemId}`);
  }

  async updateItemPositionOrParent(boardId, itemId, data) {
    return await this.makeRequest("PATCH", `/boards/${boardId}/items/${itemId}`, data);
  }

  async deleteItem(boardId, itemId) {
    return await this.makeRequest("DELETE", `/boards/${boardId}/items/${itemId}`);
  }

  // Sticky note operations
  async createStickyNote(boardId, data) {
    return await this.makeRequest("POST", `/boards/${boardId}/sticky_notes`, data);
  }

  async getStickyNote(boardId, itemId) {
    return await this.makeRequest("GET", `/boards/${boardId}/sticky_notes/${itemId}`);
  }

  async updateStickyNote(boardId, itemId, data) {
    return await this.makeRequest("PATCH", `/boards/${boardId}/sticky_notes/${itemId}`, data);
  }

  async deleteStickyNote(boardId, itemId) {
    return await this.makeRequest("DELETE", `/boards/${boardId}/sticky_notes/${itemId}`);
  }

  // Shape operations
  async createShape(boardId, data) {
    return await this.makeRequest("POST", `/boards/${boardId}/shapes`, data);
  }

  async getShape(boardId, itemId) {
    return await this.makeRequest("GET", `/boards/${boardId}/shapes/${itemId}`);
  }

  async updateShape(boardId, itemId, data) {
    return await this.makeRequest("PATCH", `/boards/${boardId}/shapes/${itemId}`, data);
  }

  async deleteShape(boardId, itemId) {
    return await this.makeRequest("DELETE", `/boards/${boardId}/shapes/${itemId}`);
  }

  // Connector operations
  async createConnector(boardId, data) {
    return await this.makeRequest("POST", `/boards/${boardId}/connectors`, data);
  }

  async getConnectors(boardId, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    const path = `/boards/${boardId}/connectors${queryParams ? `?${queryParams}` : ""}`;
    return await this.makeRequest("GET", path);
  }

  async getConnector(boardId, connectorId) {
    return await this.makeRequest("GET", `/boards/${boardId}/connectors/${connectorId}`);
  }

  async updateConnector(boardId, connectorId, data) {
    return await this.makeRequest("PATCH", `/boards/${boardId}/connectors/${connectorId}`, data);
  }

  async deleteConnector(boardId, connectorId) {
    return await this.makeRequest("DELETE", `/boards/${boardId}/connectors/${connectorId}`);
  }

  // Frame operations
  async createFrame(boardId, data) {
    return await this.makeRequest("POST", `/boards/${boardId}/frames`, data);
  }

  async getFrames(boardId) {
    const response = await this.makeRequest("GET", `/boards/${boardId}/items?type=frame`);
    return response.data || [];
  }

  async getFrame(boardId, frameId) {
    return await this.makeRequest("GET", `/boards/${boardId}/frames/${frameId}`);
  }

  async updateFrame(boardId, frameId, data) {
    return await this.makeRequest("PATCH", `/boards/${boardId}/frames/${frameId}`, data);
  }

  async deleteFrame(boardId, frameId) {
    return await this.makeRequest("DELETE", `/boards/${boardId}/frames/${frameId}`);
  }

  async getItemsInFrame(boardId, frameId) {
    const response = await this.makeRequest("GET", `/boards/${boardId}/items?parent=${frameId}`);
    return response.data || [];
  }

  // Text operations
  async createText(boardId, data) {
    return await this.makeRequest("POST", `/boards/${boardId}/texts`, data);
  }

  async getText(boardId, itemId) {
    return await this.makeRequest("GET", `/boards/${boardId}/texts/${itemId}`);
  }

  async updateText(boardId, itemId, data) {
    return await this.makeRequest("PATCH", `/boards/${boardId}/texts/${itemId}`, data);
  }

  async deleteText(boardId, itemId) {
    return await this.makeRequest("DELETE", `/boards/${boardId}/texts/${itemId}`);
  }

  // Card operations
  async createCard(boardId, data) {
    return await this.makeRequest("POST", `/boards/${boardId}/cards`, data);
  }

  async getCard(boardId, itemId) {
    return await this.makeRequest("GET", `/boards/${boardId}/cards/${itemId}`);
  }

  async updateCard(boardId, itemId, data) {
    return await this.makeRequest("PATCH", `/boards/${boardId}/cards/${itemId}`, data);
  }

  async deleteCard(boardId, itemId) {
    return await this.makeRequest("DELETE", `/boards/${boardId}/cards/${itemId}`);
  }

  // App card operations
  async createAppCard(boardId, data) {
    return await this.makeRequest("POST", `/boards/${boardId}/app_cards`, data);
  }

  async getAppCard(boardId, itemId) {
    return await this.makeRequest("GET", `/boards/${boardId}/app_cards/${itemId}`);
  }

  async updateAppCard(boardId, itemId, data) {
    return await this.makeRequest("PATCH", `/boards/${boardId}/app_cards/${itemId}`, data);
  }

  async deleteAppCard(boardId, itemId) {
    return await this.makeRequest("DELETE", `/boards/${boardId}/app_cards/${itemId}`);
  }

  // Document operations
  async createDocument(boardId, data) {
    return await this.makeRequest("POST", `/boards/${boardId}/documents`, data);
  }

  async getDocument(boardId, itemId) {
    return await this.makeRequest("GET", `/boards/${boardId}/documents/${itemId}`);
  }

  async updateDocument(boardId, itemId, data) {
    return await this.makeRequest("PATCH", `/boards/${boardId}/documents/${itemId}`, data);
  }

  async deleteDocument(boardId, itemId) {
    return await this.makeRequest("DELETE", `/boards/${boardId}/documents/${itemId}`);
  }

  // Image operations
  async createImage(boardId, data) {
    return await this.makeRequest("POST", `/boards/${boardId}/images`, data);
  }

  async getImage(boardId, itemId) {
    return await this.makeRequest("GET", `/boards/${boardId}/images/${itemId}`);
  }

  async updateImage(boardId, itemId, data) {
    return await this.makeRequest("PATCH", `/boards/${boardId}/images/${itemId}`, data);
  }

  async deleteImage(boardId, itemId) {
    return await this.makeRequest("DELETE", `/boards/${boardId}/images/${itemId}`);
  }

  // Embed operations
  async createEmbed(boardId, data) {
    return await this.makeRequest("POST", `/boards/${boardId}/embeds`, data);
  }

  async getEmbed(boardId, itemId) {
    return await this.makeRequest("GET", `/boards/${boardId}/embeds/${itemId}`);
  }

  async updateEmbed(boardId, itemId, data) {
    return await this.makeRequest("PATCH", `/boards/${boardId}/embeds/${itemId}`, data);
  }

  async deleteEmbed(boardId, itemId) {
    return await this.makeRequest("DELETE", `/boards/${boardId}/embeds/${itemId}`);
  }

  // Bulk create items
  async bulkCreateItems(boardId, items) {
    // Note: Miro API supports bulk creation through the /items endpoint
    // Each item must have a type and appropriate data structure
    const response = await this.makeRequest("POST", `/boards/${boardId}/items`, {
      data: items,
    });
    return response.data || [];
  }
}
