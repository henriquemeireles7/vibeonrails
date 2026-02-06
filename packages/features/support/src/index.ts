// Knowledge Base
export { loadArticle } from './knowledge-base/loader.js';
export type { Article } from './knowledge-base/loader.js';

// Tickets
export {
  createTicket,
  getTicket,
  listTickets,
  updateTicket,
  assignTicket,
  resolveTicket,
  closeTicket,
} from './tickets/ticket.service.js';
export type {
  Ticket,
  TicketStatus,
  TicketPriority,
  CreateTicketInput,
  UpdateTicketInput,
} from './tickets/ticket.types.js';

// Chat
export {
  sendMessage,
  getMessages,
  clearChat,
} from './chat/chat.service.js';
export type { ChatMessage } from './chat/chat.service.js';

// Chat Widget
export { ChatWidget } from './chat/ChatWidget.js';
