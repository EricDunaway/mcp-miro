#!/usr/bin/env node

import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { MiroClient } from "./MiroClient.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from 'fs/promises';
import path from 'path';

// Parse command line arguments
const argv = await yargs(hideBin(process.argv))
  .option("token", {
    alias: "t",
    type: "string",
    description: "Miro OAuth token",
  })
  .help().argv;

// Get token with precedence: command line > environment variable
const oauthToken = (argv.token as string) || process.env.MIRO_OAUTH_TOKEN;

if (!oauthToken) {
  console.error(
    "Error: Miro OAuth token is required. Provide it via MIRO_OAUTH_TOKEN environment variable or --token argument"
  );
  process.exit(1);
}

const server = new Server(
  {
    name: "mcp-miro",
    version: "0.2.0",
  },
  {
    capabilities: {
      resources: {},
      tools: {},
      prompts: {},
    },
  }
);

const miroClient = new MiroClient(oauthToken);

server.setRequestHandler(ListResourcesRequestSchema, async () => {
  const boards = await miroClient.getBoards();

  return {
    resources: boards.map((board) => ({
      uri: `miro://board/${board.id}`,
      mimeType: "application/json",
      name: board.name,
      description: board.description || `Miro board: ${board.name}`,
    })),
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const url = new URL(request.params.uri);

  if (!request.params.uri.startsWith("miro://board/")) {
    throw new Error(
      "Invalid Miro resource URI - must start with miro://board/"
    );
  }

  const boardId = url.pathname.substring(1); // Remove leading slash from pathname
  const items = await miroClient.getBoardItems(boardId);

  return {
    contents: [
      {
        uri: request.params.uri,
        mimeType: "application/json",
        text: JSON.stringify(items, null, 2),
      },
    ],
  };
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "list_boards",
        description: "List all available Miro boards and their IDs",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_all_items",
        description: "Get all items from a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to get items from",
            },
            limit: {
              type: "number",
              description: "Maximum number of items to return (default: 50, max: 50)",
              default: 50,
              minimum: 1,
              maximum: 50,
            },
            cursor: {
              type: "string",
              description: "Cursor for pagination",
            },
          },
          required: ["boardId"],
        },
      },
      {
        name: "get_specific_item",
        description: "Get a specific item from a Miro board by its ID",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board that contains the item",
            },
            itemId: {
              type: "string",
              description: "ID of the item to retrieve",
            },
          },
          required: ["boardId", "itemId"],
        },
      },
      {
        name: "update_item_position",
        description: "Update the position or parent of an item on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board that contains the item",
            },
            itemId: {
              type: "string",
              description: "ID of the item to update",
            },
            position: {
              type: "object",
              properties: {
                x: { type: "number" },
                y: { type: "number" },
              },
              description: "New position for the item",
            },
            parent: {
              type: "object",
              properties: {
                id: { type: "string", description: "ID of the new parent item" },
              },
              description: "New parent for the item",
            },
          },
          required: ["boardId", "itemId"],
        },
      },
      {
        name: "delete_item",
        description: "Delete a specific item from a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board that contains the item",
            },
            itemId: {
              type: "string",
              description: "ID of the item to delete",
            },
          },
          required: ["boardId", "itemId"],
        },
      },
      {
        name: "bulk_delete_items",
        description: "Delete multiple items from a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board that contains the items",
            },
            itemIds: {
              type: "array",
              description: "Array of item IDs to delete",
              items: {
                type: "string",
              },
              minItems: 1,
              maxItems: 50,
            },
          },
          required: ["boardId", "itemIds"],
        },
      },
      {
        name: "create_sticky_note",
        description:
          "Create a sticky note on a Miro board. By default, sticky notes are 199x228 and available in these colors: gray, light_yellow, yellow, orange, light_green, green, dark_green, cyan, light_pink, pink, violet, red, light_blue, blue, dark_blue, black.",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to create the sticky note on",
            },
            content: {
              type: "string",
              description: "Text content of the sticky note",
            },
            color: {
              type: "string",
              description:
                "Color of the sticky note (e.g. 'yellow', 'blue', 'pink')",
              enum: [
                "gray",
                "light_yellow",
                "yellow",
                "orange",
                "light_green",
                "green",
                "dark_green",
                "cyan",
                "light_pink",
                "pink",
                "violet",
                "red",
                "light_blue",
                "blue",
                "dark_blue",
                "black",
              ],
              default: "yellow",
            },
            x: {
              type: "number",
              description: "X coordinate position",
              default: 0,
            },
            y: {
              type: "number",
              description: "Y coordinate position",
              default: 0,
            },
            parent: {
              type: "object",
              properties: {
                id: { type: "string", description: "ID of the parent frame" },
              },
              description: "Parent frame to attach the sticky note to",
            },
          },
          required: ["boardId", "content"],
        },
      },
      {
        name: "get_sticky_note",
        description: "Get a specific sticky note from a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board that contains the sticky note",
            },
            itemId: {
              type: "string",
              description: "ID of the sticky note to retrieve",
            },
          },
          required: ["boardId", "itemId"],
        },
      },
      {
        name: "update_sticky_note",
        description: "Update an existing sticky note on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board that contains the sticky note",
            },
            itemId: {
              type: "string",
              description: "ID of the sticky note to update",
            },
            content: {
              type: "string",
              description: "New text content for the sticky note",
            },
            color: {
              type: "string",
              description: "New color for the sticky note",
              enum: [
                "gray",
                "light_yellow",
                "yellow",
                "orange",
                "light_green",
                "green",
                "dark_green",
                "cyan",
                "light_pink",
                "pink",
                "violet",
                "red",
                "light_blue",
                "blue",
                "dark_blue",
                "black",
              ],
            },
          },
          required: ["boardId", "itemId"],
        },
      },
      {
        name: "delete_sticky_note",
        description: "Delete a sticky note from a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board that contains the sticky note",
            },
            itemId: {
              type: "string",
              description: "ID of the sticky note to delete",
            },
          },
          required: ["boardId", "itemId"],
        },
      },
      {
        name: "create_shape",
        description:
          "Create a shape on a Miro board. Available shapes include basic shapes (rectangle, circle, etc.) and flowchart shapes (process, decision, etc.). Standard geometry specs: width and height in pixels (default 200x200)",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to create the shape on",
            },
            content: {
              type: "string",
              description: "Text content to display on the shape",
            },
            shape: {
              type: "string",
              description: "Type of shape to create",
              enum: [
                // Basic shapes
                "rectangle",
                "round_rectangle",
                "circle",
                "triangle",
                "rhombus",
                "parallelogram",
                "trapezoid",
                "pentagon",
                "hexagon",
                "octagon",
                "wedge_round_rectangle_callout",
                "star",
                "flow_chart_predefined_process",
                "cloud",
                "cross",
                "can",
                "right_arrow",
                "left_arrow",
                "left_right_arrow",
                "left_brace",
                "right_brace",
                // Flowchart shapes
                "flow_chart_connector",
                "flow_chart_magnetic_disk",
                "flow_chart_input_output",
                "flow_chart_decision",
                "flow_chart_delay",
                "flow_chart_display",
                "flow_chart_document",
                "flow_chart_magnetic_drum",
                "flow_chart_internal_storage",
                "flow_chart_manual_input",
                "flow_chart_manual_operation",
                "flow_chart_merge",
                "flow_chart_multidocuments",
                "flow_chart_note_curly_left",
                "flow_chart_note_curly_right",
                "flow_chart_note_square",
                "flow_chart_offpage_connector",
                "flow_chart_or",
                "flow_chart_predefined_process_2",
                "flow_chart_preparation",
                "flow_chart_process",
                "flow_chart_online_storage",
                "flow_chart_summing_junction",
                "flow_chart_terminator",
              ],
              default: "rectangle",
            },
            style: {
              type: "object",
              description: "Style configuration for the shape",
              properties: {
                borderColor: { type: "string" },
                borderOpacity: { type: "number", minimum: 0, maximum: 1 },
                borderStyle: {
                  type: "string",
                  enum: ["normal", "dotted", "dashed"],
                },
                borderWidth: { type: "number", minimum: 1, maximum: 24 },
                color: { type: "string" },
                fillColor: { type: "string" },
                fillOpacity: { type: "number", minimum: 0, maximum: 1 },
                fontFamily: { type: "string" },
                fontSize: { type: "number", minimum: 10, maximum: 288 },
                textAlign: {
                  type: "string",
                  enum: ["left", "center", "right"],
                },
                textAlignVertical: {
                  type: "string",
                  enum: ["top", "middle", "bottom"],
                },
              },
            },
            position: {
              type: "object",
              properties: {
                x: { type: "number", default: 0 },
                y: { type: "number", default: 0 },
                origin: { type: "string", default: "center" },
              },
            },
            geometry: {
              type: "object",
              properties: {
                width: { type: "number", default: 200 },
                height: { type: "number", default: 200 },
                rotation: { type: "number", default: 0 },
              },
            },
            parent: {
              type: "object",
              properties: {
                id: { type: "string", description: "ID of the parent frame" },
              },
              description: "Parent frame to attach the shape to",
            },
          },
          required: ["boardId", "shape"],
        },
      },
      {
        name: "create_connector",
        description: "Create a connector between two items on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board",
            },
            startItem: {
              type: "object",
              properties: {
                id: { type: "string", description: "ID of the start item" },
                position: {
                  type: "object",
                  properties: {
                    x: { type: "string", description: "X position as percentage (e.g., '0%')" },
                    y: { type: "string", description: "Y position as percentage (e.g., '50%')" },
                  },
                },
              },
              required: ["id"],
            },
            endItem: {
              type: "object",
              properties: {
                id: { type: "string", description: "ID of the end item" },
                position: {
                  type: "object",
                  properties: {
                    x: { type: "string", description: "X position as percentage (e.g., '100%')" },
                    y: { type: "string", description: "Y position as percentage (e.g., '50%')" },
                  },
                },
              },
              required: ["id"],
            },
            style: {
              type: "object",
              properties: {
                strokeColor: { type: "string" },
                strokeWidth: { type: "number", minimum: 1, maximum: 24 },
                strokeStyle: {
                  type: "string",
                  enum: ["normal", "dashed", "dotted"],
                },
                startStrokeCap: {
                  type: "string",
                  enum: ["none", "stealth", "rounded_stealth", "diamond", "diamond_filled", "oval", "oval_filled", "arrow", "triangle", "triangle_filled", "circle", "circle_filled", "square", "square_filled", "erd_one", "erd_many", "erd_one_or_many", "erd_zero_or_one", "erd_one_and_only_one", "erd_zero_or_many"],
                },
                endStrokeCap: {
                  type: "string",
                  enum: ["none", "stealth", "rounded_stealth", "diamond", "diamond_filled", "oval", "oval_filled", "arrow", "triangle", "triangle_filled", "circle", "circle_filled", "square", "square_filled", "erd_one", "erd_many", "erd_one_or_many", "erd_zero_or_one", "erd_one_and_only_one", "erd_zero_or_many"],
                },
              },
            },
            captions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  content: { type: "string", description: "Caption text" },
                  position: { type: "string", description: "Position as percentage (e.g., '50%')" },
                  textAlignVertical: {
                    type: "string",
                    enum: ["top", "middle", "bottom"],
                    default: "middle",
                  },
                },
              },
            },
            shape: {
              type: "string",
              enum: ["straight", "curved", "elbowed"],
              default: "curved",
              description: "Shape of the connector line",
            },
          },
          required: ["boardId", "startItem", "endItem"],
        },
      },
      {
        name: "get_connectors",
        description: "Get all connectors from a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to get connectors from",
            },
            limit: {
              type: "number",
              description: "Maximum number of connectors to return (default: 50)",
              default: 50,
            },
            cursor: {
              type: "string",
              description: "Cursor for pagination",
            },
          },
          required: ["boardId"],
        },
      },
      {
        name: "get_connector",
        description: "Get a specific connector from a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board that contains the connector",
            },
            connectorId: {
              type: "string",
              description: "ID of the connector to retrieve",
            },
          },
          required: ["boardId", "connectorId"],
        },
      },
      {
        name: "update_connector",
        description: "Update an existing connector on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board that contains the connector",
            },
            connectorId: {
              type: "string",
              description: "ID of the connector to update",
            },
            startItem: {
              type: "object",
              properties: {
                id: { type: "string" },
                position: {
                  type: "object",
                  properties: {
                    x: { type: "string" },
                    y: { type: "string" },
                  },
                },
              },
            },
            endItem: {
              type: "object",
              properties: {
                id: { type: "string" },
                position: {
                  type: "object",
                  properties: {
                    x: { type: "string" },
                    y: { type: "string" },
                  },
                },
              },
            },
            style: {
              type: "object",
              properties: {
                strokeColor: { type: "string" },
                strokeWidth: { type: "number" },
                strokeStyle: { type: "string" },
                startStrokeCap: { type: "string" },
                endStrokeCap: { type: "string" },
              },
            },
          },
          required: ["boardId", "connectorId"],
        },
      },
      {
        name: "delete_connector",
        description: "Delete a connector from a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board that contains the connector",
            },
            connectorId: {
              type: "string",
              description: "ID of the connector to delete",
            },
          },
          required: ["boardId", "connectorId"],
        },
      },
      {
        name: "create_frame",
        description: "Create a frame on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to create the frame on",
            },
            title: {
              type: "string",
              description: "Title of the frame",
            },
            style: {
              type: "object",
              properties: {
                fillColor: { type: "string" },
              },
            },
            position: {
              type: "object",
              properties: {
                x: { type: "number", default: 0 },
                y: { type: "number", default: 0 },
              },
            },
            geometry: {
              type: "object",
              properties: {
                width: { type: "number", default: 800 },
                height: { type: "number", default: 600 },
              },
            },
          },
          required: ["boardId", "title"],
        },
      },
      {
        name: "get_frames",
        description: "Get all frames from a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to get frames from",
            },
          },
          required: ["boardId"],
        },
      },
      {
        name: "get_items_in_frame",
        description:
          "Get all items contained within a specific frame on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board that contains the frame",
            },
            frameId: {
              type: "string",
              description: "ID of the frame to get items from",
            },
          },
          required: ["boardId", "frameId"],
        },
      },
      {
        name: "create_text",
        description: "Create a text item on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to create the text on",
            },
            content: {
              type: "string",
              description: "Text content",
            },
            style: {
              type: "object",
              properties: {
                color: { type: "string" },
                fontSize: { type: "number", minimum: 10, maximum: 288 },
                textAlign: {
                  type: "string",
                  enum: ["left", "center", "right"],
                },
              },
            },
            position: {
              type: "object",
              properties: {
                x: { type: "number", default: 0 },
                y: { type: "number", default: 0 },
              },
            },
            geometry: {
              type: "object",
              properties: {
                width: { type: "number", default: 200 },
              },
            },
            parent: {
              type: "object",
              properties: {
                id: { type: "string", description: "ID of the parent frame" },
              },
              description: "Parent frame to attach the text to",
            },
          },
          required: ["boardId", "content"],
        },
      },
      {
        name: "create_card",
        description: "Create a card item on a Miro board",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to create the card on",
            },
            title: {
              type: "string",
              description: "Title of the card",
            },
            description: {
              type: "string",
              description: "Description of the card",
            },
            assigneeId: {
              type: "string",
              description: "User ID of the assignee",
            },
            dueDate: {
              type: "string",
              description: "Due date in ISO 8601 format",
            },
            style: {
              type: "object",
              properties: {
                fillColor: { type: "string" },
                textColor: { type: "string" },
              },
            },
            position: {
              type: "object",
              properties: {
                x: { type: "number", default: 0 },
                y: { type: "number", default: 0 },
              },
            },
            geometry: {
              type: "object",
              properties: {
                width: { type: "number", default: 320, minimum: 256 },
                height: { type: "number", default: 176 },
              },
            },
            parent: {
              type: "object",
              properties: {
                id: { type: "string", description: "ID of the parent frame" },
              },
              description: "Parent frame to attach the card to",
            },
          },
          required: ["boardId", "title"],
        },
      },
      {
        name: "bulk_create_items",
        description:
          "Create multiple items on a Miro board in a single transaction (max 20 items)",
        inputSchema: {
          type: "object",
          properties: {
            boardId: {
              type: "string",
              description: "ID of the board to create the items on",
            },
            items: {
              type: "array",
              description: "Array of items to create",
              items: {
                type: "object",
                properties: {
                  type: {
                    type: "string",
                    enum: [
                      "app_card",
                      "text",
                      "shape",
                      "sticky_note",
                      "image",
                      "document",
                      "card",
                      "frame",
                      "embed",
                    ],
                    description: "Type of item to create",
                  },
                  data: {
                    type: "object",
                    description: "Item-specific data configuration",
                  },
                  style: {
                    type: "object",
                    description: "Item-specific style configuration",
                  },
                  position: {
                    type: "object",
                    description: "Item position configuration",
                  },
                  geometry: {
                    type: "object",
                    description: "Item geometry configuration",
                  },
                  parent: {
                    type: "object",
                    description: "Parent item configuration (not supported for frames)",
                  },
                },
                required: ["type"],
              },
              minItems: 1,
              maxItems: 20,
            },
          },
          required: ["boardId", "items"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "list_boards": {
      const boards = await miroClient.getBoards();
      return {
        content: [
          {
            type: "text",
            text: "Here are the available Miro boards:",
          },
          ...boards.map((b) => ({
            type: "text",
            text: `Board ID: ${b.id}, Name: ${b.name}`,
          })),
        ],
      };
    }

    case "get_all_items": {
      const { boardId, limit = 50, cursor } = request.params.arguments as any;
      const items = await miroClient.getItems(boardId, { limit, cursor });
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(items, null, 2),
          },
        ],
      };
    }

    case "get_specific_item": {
      const { boardId, itemId } = request.params.arguments as any;
      const item = await miroClient.getItem(boardId, itemId);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(item, null, 2),
          },
        ],
      };
    }

    case "update_item_position": {
      const { boardId, itemId, position, parent } = request.params.arguments as any;
      
      const updateData = {};
      if (position) updateData.position = position;
      if (parent) updateData.parent = parent;
      
      const item = await miroClient.updateItemPositionOrParent(boardId, itemId, updateData);
      
      return {
        content: [
          {
            type: "text",
            text: `Updated item ${itemId} position/parent on board ${boardId}`,
          },
        ],
      };
    }

    case "delete_item": {
      const { boardId, itemId } = request.params.arguments as any;
      await miroClient.deleteItem(boardId, itemId);
      
      return {
        content: [
          {
            type: "text",
            text: `Deleted item ${itemId} from board ${boardId}`,
          },
        ],
      };
    }

    case "bulk_delete_items": {
      const { boardId, itemIds } = request.params.arguments as any;
      
      const results = [];
      const errors = [];
      
      for (const itemId of itemIds) {
        try {
          await miroClient.deleteItem(boardId, itemId);
          results.push(itemId);
        } catch (error) {
          errors.push({ itemId, error: error.message });
        }
      }
      
      return {
        content: [
          {
            type: "text",
            text: `Bulk delete completed. Deleted: ${results.length} items. Errors: ${errors.length}` +
                  (errors.length > 0 ? `\nErrors: ${JSON.stringify(errors, null, 2)}` : ''),
          },
        ],
      };
    }

    case "create_sticky_note": {
      const {
        boardId,
        content,
        color = "yellow",
        x = 0,
        y = 0,
        parent,
      } = request.params.arguments as any;

      const stickyNoteData = {
        data: {
          content: content,
        },
        style: {
          fillColor: color,
        },
        position: {
          x: x,
          y: y,
        },
      };
      
      if (parent) {
        stickyNoteData.parent = parent;
      }

      const stickyNote = await miroClient.createStickyNote(boardId, stickyNoteData);

      return {
        content: [
          {
            type: "text",
            text: `Created sticky note ${stickyNote.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "get_sticky_note": {
      const { boardId, itemId } = request.params.arguments as any;
      const stickyNote = await miroClient.getStickyNote(boardId, itemId);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(stickyNote, null, 2),
          },
        ],
      };
    }

    case "update_sticky_note": {
      const { boardId, itemId, content, color } = request.params.arguments as any;
      
      const updateData = {};
      if (content) updateData.data = { content };
      if (color) updateData.style = { fillColor: color };
      
      const stickyNote = await miroClient.updateStickyNote(boardId, itemId, updateData);
      
      return {
        content: [
          {
            type: "text",
            text: `Updated sticky note ${itemId} on board ${boardId}`,
          },
        ],
      };
    }

    case "delete_sticky_note": {
      const { boardId, itemId } = request.params.arguments as any;
      await miroClient.deleteStickyNote(boardId, itemId);
      
      return {
        content: [
          {
            type: "text",
            text: `Deleted sticky note ${itemId} from board ${boardId}`,
          },
        ],
      };
    }

    case "create_shape": {
      const { boardId, shape, content, style, position, geometry, parent } = request.params.arguments as any;

      const shapeData = {
        data: {
          shape: shape,  // IMPORTANT: Using 'shape' not 'type'
          content: content,
        },
        style: style || {},
        position: position || { x: 0, y: 0 },
        geometry: geometry || { width: 200, height: 200, rotation: 0 },
      };
      
      if (parent) {
        shapeData.parent = parent;
      }

      const shapeItem = await miroClient.createShape(boardId, shapeData);

      return {
        content: [
          {
            type: "text",
            text: `Created ${shape} shape with ID ${shapeItem.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "create_connector": {
      const { boardId, startItem, endItem, style, captions, shape = "curved" } = request.params.arguments as any;
      
      const connectorData = {
        startItem: startItem,
        endItem: endItem,
        shape: shape,
        style: style || {
          strokeColor: "#333333",
          strokeWidth: 2,
          strokeStyle: "normal",
          endStrokeCap: "rounded_stealth",
        },
        captions: captions || [],
      };
      
      const connector = await miroClient.createConnector(boardId, connectorData);
      
      return {
        content: [
          {
            type: "text",
            text: `Created connector ${connector.id} from ${startItem.id} to ${endItem.id}`,
          },
        ],
      };
    }

    case "get_connectors": {
      const { boardId, limit = 50, cursor } = request.params.arguments as any;
      const connectors = await miroClient.getConnectors(boardId, { limit, cursor });
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(connectors, null, 2),
          },
        ],
      };
    }

    case "get_connector": {
      const { boardId, connectorId } = request.params.arguments as any;
      const connector = await miroClient.getConnector(boardId, connectorId);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(connector, null, 2),
          },
        ],
      };
    }

    case "update_connector": {
      const { boardId, connectorId, startItem, endItem, style } = request.params.arguments as any;
      
      const updateData = {};
      if (startItem) updateData.startItem = startItem;
      if (endItem) updateData.endItem = endItem;
      if (style) updateData.style = style;
      
      const connector = await miroClient.updateConnector(boardId, connectorId, updateData);
      
      return {
        content: [
          {
            type: "text",
            text: `Updated connector ${connectorId} on board ${boardId}`,
          },
        ],
      };
    }

    case "delete_connector": {
      const { boardId, connectorId } = request.params.arguments as any;
      await miroClient.deleteConnector(boardId, connectorId);
      
      return {
        content: [
          {
            type: "text",
            text: `Deleted connector ${connectorId} from board ${boardId}`,
          },
        ],
      };
    }

    case "create_frame": {
      const { boardId, title, style, position, geometry } = request.params.arguments as any;
      
      const frameData = {
        data: {
          title: title,
          type: "freeform",
          format: "custom",
        },
        style: style || { fillColor: "#ffffff" },
        position: position || { x: 0, y: 0 },
        geometry: geometry || { width: 800, height: 600 },
      };
      
      const frame = await miroClient.createFrame(boardId, frameData);
      
      return {
        content: [
          {
            type: "text",
            text: `Created frame "${title}" with ID ${frame.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "get_frames": {
      const { boardId } = request.params.arguments as any;
      const frames = await miroClient.getFrames(boardId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(frames, null, 2),
          },
        ],
      };
    }

    case "get_items_in_frame": {
      const { boardId, frameId } = request.params.arguments as any;
      const items = await miroClient.getItemsInFrame(boardId, frameId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(items, null, 2),
          },
        ],
      };
    }

    case "create_text": {
      const { boardId, content, style, position, geometry, parent } = request.params.arguments as any;
      
      const textData = {
        data: {
          content: content,
        },
        style: style || {},
        position: position || { x: 0, y: 0 },
        geometry: geometry || { width: 200 },
      };
      
      if (parent) {
        textData.parent = parent;
      }
      
      const text = await miroClient.createText(boardId, textData);
      
      return {
        content: [
          {
            type: "text",
            text: `Created text item with ID ${text.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "create_card": {
      const { boardId, title, description, assigneeId, dueDate, style, position, geometry, parent } = request.params.arguments as any;
      
      const cardData = {
        data: {
          title: title,
          description: description,
          assigneeId: assigneeId,
          dueDate: dueDate,
        },
        style: style || {},
        position: position || { x: 0, y: 0 },
        geometry: geometry || { width: 320, height: 176 },
      };
      
      if (parent) {
        cardData.parent = parent;
      }
      
      const card = await miroClient.createCard(boardId, cardData);
      
      return {
        content: [
          {
            type: "text",
            text: `Created card "${title}" with ID ${card.id} on board ${boardId}`,
          },
        ],
      };
    }

    case "bulk_create_items": {
      const { boardId, items } = request.params.arguments as any;

      const createdItems = await miroClient.bulkCreateItems(boardId, items);

      return {
        content: [
          {
            type: "text",
            text: `Created ${createdItems.length} items on board ${boardId}`,
          },
        ],
      };
    }

    default:
      throw new Error("Unknown tool");
  }
});

server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: "Working with MIRO",
        description: "Basic prompt for working with MIRO boards",
      },
    ],
  };
});

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name === "Working with MIRO") {
    const keyFactsPath = path.join(process.cwd(), 'resources', 'boards-key-facts.md');
    const keyFacts = await fs.readFile(keyFactsPath, 'utf-8');
    return {
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: keyFacts,
          },
        },
      ],
    };
  }
  throw new Error("Unknown prompt");
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
