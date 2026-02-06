import type {
  Ticket,
  CreateTicketInput,
  UpdateTicketInput,
} from './ticket.types.js';

const tickets = new Map<string, Ticket>();

let nextId = 1;

function generateId(): string {
  return `ticket_${nextId++}`;
}

export function createTicket(input: CreateTicketInput): Ticket {
  const now = new Date();
  const ticket: Ticket = {
    id: generateId(),
    subject: input.subject,
    description: input.description,
    status: 'open',
    priority: input.priority,
    createdBy: input.createdBy,
    createdAt: now,
    updatedAt: now,
  };
  tickets.set(ticket.id, ticket);
  return ticket;
}

export function getTicket(id: string): Ticket | undefined {
  return tickets.get(id);
}

export function listTickets(): Ticket[] {
  return Array.from(tickets.values());
}

export function updateTicket(
  id: string,
  input: UpdateTicketInput,
): Ticket | undefined {
  const ticket = tickets.get(id);
  if (!ticket) return undefined;

  const updated: Ticket = {
    ...ticket,
    ...input,
    updatedAt: new Date(),
  };
  tickets.set(id, updated);
  return updated;
}

export function assignTicket(
  id: string,
  assigneeId: string,
): Ticket | undefined {
  return updateTicket(id, { assigneeId, status: 'in_progress' });
}

export function resolveTicket(id: string): Ticket | undefined {
  return updateTicket(id, { status: 'resolved' });
}

export function closeTicket(id: string): Ticket | undefined {
  return updateTicket(id, { status: 'closed' });
}
