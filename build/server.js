"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const zod_1 = require("zod");
const promises_1 = __importDefault(require("node:fs/promises"));
const server = new mcp_js_1.McpServer({
    name: "Example Server",
    version: "1.0.0",
    description: "An example server using Model Context Protocol",
    capabilities: {
        resources: {},
        tools: {},
        prompts: {},
    }
});
server.resource("users", "users://all", {
    description: "A collection of all users",
    title: "Users",
    mineType: "application/json",
}, async (uri) => {
    const users = await import("./data/users.json", {
        with: { type: "json" }
    }).then((module) => module.default);
    return {
        contents: [
            {
                uri: uri.href,
                text: JSON.stringify(users, null, 2),
                mimeType: "application/json"
            },
        ]
    };
});
server.tool("create-user", "Create a new user in the database", {
    name: zod_1.z.string(),
    email: zod_1.z.string(),
    address: zod_1.z.string(),
    phone: zod_1.z.string()
}, {
    title: "Create User",
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true
}, async (params) => {
    try {
        const id = await createUser(params);
        return {
            content: [
                { type: "text", text: `User created with ID: ${id}` },
            ]
        };
    }
    catch (error) {
        return {
            content: [
                { type: "text", text: `Failed to save user` }
            ]
        };
    }
});
async function createUser(user) {
    const users = await import("./data/users.json", {
        with: { type: "json" }
    }).then((module) => module.default);
    const id = users.length + 1;
    users.push({ id, ...user });
    promises_1.default.writeFile("./src/data/users.json", JSON.stringify(users, null, 2));
    return id;
}
async function main() {
    const transport = new stdio_js_1.StdioServerTransport();
    await server.connect(transport);
}
main();
