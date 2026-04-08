import { env } from '../../config/env.js';

interface ChatwootContact {
  id: number;
  name: string;
  phone_number: string;
}

interface ChatwootConversation {
  id: number;
  inbox_id: number;
}

/**
 * Normalizes a Brazilian phone to E.164 format (+55...).
 * Handles numbers stored without country code (e.g. "61986691899" → "+5561986691899").
 * Also returns alternate form (with/without the extra 9 after DDD) for searching.
 */
function normalizeBrazilianPhone(phone: string): { primary: string; alternate: string | null } {
  const digits = phone.replace(/\D/g, '');

  let national: string;
  if (digits.startsWith('55') && digits.length >= 12) {
    // Already has country code
    national = digits.slice(2);
  } else {
    national = digits;
  }

  // Baileys (WhatsApp Web) uses server-side JIDs. In Brazil, most accounts — even those
  // displaying the 9-digit number in their profile — have their JID registered in the old
  // 8-digit form (DDD + 8 digits). So for 11-digit national numbers we prefer the 10-digit
  // form as primary and keep the 11-digit as fallback for newer registrations.
  let primary: string;
  let alternate: string | null = null;

  if (national.length === 11) {
    const ddd = national.slice(0, 2);
    const rest = national.slice(3); // digits after the leading 9
    primary = '+55' + ddd + rest;    // 10-digit: without the 9 (matches Baileys JID)
    alternate = '+55' + national;    // 11-digit: with the 9 (fallback)
  } else if (national.length === 10) {
    const ddd = national.slice(0, 2);
    const rest = national.slice(2);
    primary = '+55' + national;            // 10-digit: as entered
    alternate = '+55' + ddd + '9' + rest; // 11-digit: with the 9 (fallback)
  } else {
    primary = '+55' + national;
  }

  return { primary, alternate };
}

export class ChatwootClient {
  private baseUrl: string;
  private token: string;
  private accountId: number;
  private inboxId: number;
  private enabled: boolean;

  constructor() {
    this.baseUrl = env.CHATWOOT_BASE_URL ?? '';
    this.token = env.CHATWOOT_API_TOKEN ?? '';
    this.accountId = env.CHATWOOT_ACCOUNT_ID ?? 0;
    this.inboxId = env.CHATWOOT_INBOX_ID ?? 0;
    this.enabled = !!(this.baseUrl && this.token && this.accountId && this.inboxId);
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/api/v1/accounts/${this.accountId}${path}`;
    console.log(`[Chatwoot] ${options.method ?? 'GET'} ${url}`);

    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'api_access_token': this.token,
        ...options.headers,
      },
    });

    const body = await res.text();
    console.log(`[Chatwoot] Response ${res.status}:`, body.slice(0, 300));

    if (!res.ok) {
      throw new Error(`Chatwoot API error: ${res.status} ${body}`);
    }

    return JSON.parse(body) as T;
  }

  async findOrCreateContact(phone: string, name: string): Promise<ChatwootContact> {
    const { primary, alternate } = normalizeBrazilianPhone(phone);

    console.log(`[Chatwoot] Looking up phone primary=${primary} alternate=${alternate}`);

    // Search by primary number
    const searchResult = await this.request<{ payload: ChatwootContact[] }>(
      `/contacts/search?q=${encodeURIComponent(primary)}&include_contacts=true`
    );

    console.log(`[Chatwoot] Search found ${searchResult.payload?.length ?? 0} contacts`);

    // Match against both primary and alternate formats
    const candidates = new Set([primary, alternate].filter(Boolean));
    const existing = searchResult.payload?.find((c) => candidates.has(c.phone_number));

    if (existing) {
      console.log(`[Chatwoot] Using existing contact id=${existing.id} phone=${existing.phone_number}`);
      return existing;
    }

    // If primary search found nothing, try searching by alternate
    if (alternate) {
      const altResult = await this.request<{ payload: ChatwootContact[] }>(
        `/contacts/search?q=${encodeURIComponent(alternate)}&include_contacts=true`
      );
      const altExisting = altResult.payload?.find((c) => candidates.has(c.phone_number));
      if (altExisting) {
        console.log(`[Chatwoot] Found contact via alternate id=${altExisting.id} phone=${altExisting.phone_number}`);
        return altExisting;
      }
    }

    // Create new contact using primary (E.164) format
    const contact = await this.request<ChatwootContact>('/contacts', {
      method: 'POST',
      body: JSON.stringify({
        name,
        phone_number: primary,
      }),
    });

    console.log(`[Chatwoot] Created contact id=${contact.id} phone=${contact.phone_number}`);
    return contact;
  }

  async findOrCreateConversation(contactId: number): Promise<ChatwootConversation> {
    // Get existing conversations for this contact
    const result = await this.request<{ payload: ChatwootConversation[] }>(
      `/contacts/${contactId}/conversations`
    );

    const conversations = result.payload ?? [];
    console.log(`[Chatwoot] Contact ${contactId} has ${conversations.length} conversations`);

    const match = conversations.find((c) => c.inbox_id === this.inboxId);
    if (match) {
      console.log(`[Chatwoot] Found conversation id=${match.id} for inbox ${this.inboxId}`);
      return match;
    }

    // Create new conversation
    const conversation = await this.request<ChatwootConversation>('/conversations', {
      method: 'POST',
      body: JSON.stringify({
        contact_id: contactId,
        inbox_id: this.inboxId,
      }),
    });

    console.log(`[Chatwoot] Created conversation id=${conversation.id}`);
    return conversation;
  }

  async sendMessage(conversationId: number, content: string): Promise<void> {
    await this.request(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        message_type: 'outgoing',
        private: false,
      }),
    });
  }

  async sendToPhone(phone: string, name: string, message: string): Promise<void> {
    const contact = await this.findOrCreateContact(phone, name);

    if (!contact?.id) {
      throw new Error(`[Chatwoot] Contact has no id. Response: ${JSON.stringify(contact)}`);
    }

    const conversation = await this.findOrCreateConversation(contact.id);
    await this.sendMessage(conversation.id, message);
  }
}
