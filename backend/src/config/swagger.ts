import swaggerJsdoc from "swagger-jsdoc";
import { env } from "./env";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "ProgressHub API",
      version: "1.0.0",
      description: "專案進度管理系統 API 文檔",
      contact: {
        name: "ProgressHub Team",
      },
    },
    servers: [
      {
        url: "/api",
        description: "API Server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
            },
          },
        },
        Pagination: {
          type: "object",
          properties: {
            total: { type: "integer" },
            page: { type: "integer" },
            limit: { type: "integer" },
            totalPages: { type: "integer" },
            hasMore: { type: "boolean", description: "是否還有更多資料" },
          },
        },
        Employee: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            email: { type: "string", format: "email" },
            slackUserId: { type: "string" },
            department: { type: "string" },
            permissionLevel: {
              type: "string",
              enum: ["EMPLOYEE", "PM", "PRODUCER", "MANAGER", "ADMIN"],
            },
          },
        },
        Project: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            description: { type: "string" },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            status: {
              type: "string",
              enum: ["ACTIVE", "COMPLETED", "PAUSED"],
              description: "專案狀態（與 Prisma schema 一致）",
            },
          },
        },
        Task: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            name: { type: "string" },
            projectId: { type: "string", format: "uuid" },
            assignedToId: { type: "string", format: "uuid" },
            progressPercentage: { type: "integer", minimum: 0, maximum: 100 },
            status: {
              type: "string",
              enum: [
                "UNCLAIMED",
                "CLAIMED",
                "IN_PROGRESS",
                "PAUSED",
                "DONE",
                "BLOCKED",
              ],
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis:
    env.NODE_ENV === "production"
      ? ["./dist/routes/**/*.js"]
      : ["./src/routes/**/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
