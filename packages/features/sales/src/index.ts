// Config
export { defineSalesAgent } from "./config.js";
export type { SalesAgentConfig } from "./config.js";

// Agent
export { handleSalesAction } from "./agent.js";
export type { SalesAction, SalesActionResult } from "./agent.js";

// Channels
export { createWebchatChannel } from "./channels/webchat.js";
export type { WebchatConfig } from "./channels/webchat.js";

export { createWhatsAppChannel } from "./channels/whatsapp.js";
export type { WhatsAppConfig } from "./channels/whatsapp.js";

export { createTelegramChannel } from "./channels/telegram.js";
export type { TelegramConfig } from "./channels/telegram.js";
