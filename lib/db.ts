import { prisma } from './prisma';

export type Contact = {
  id: number;
  phoneNumber: string | null;
  email: string | null;
  linkedId: number | null;
  linkPrecedence: 'primary' | 'secondary';
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

/**
 * Find contacts by email and/or phone number
 */
export async function findContactsByEmailOrPhone(
  email?: string,
  phoneNumber?: string
): Promise<Contact[]> {
  const contacts = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        ...(email ? [{ email }] : []),
        ...(phoneNumber ? [{ phoneNumber }] : []),
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
  return contacts as Contact[];
}

/**
 * Get a contact by ID
 */
export async function getContactById(id: number): Promise<Contact | null> {
  const contact = await prisma.contact.findFirst({
    where: { id, deletedAt: null },
  });
  return contact as Contact | null;
}

/**
 * Create a new contact
 */
export async function createContact(
  email: string | null,
  phoneNumber: string | null,
  linkedId: number | null = null,
  linkPrecedence: 'primary' | 'secondary' = 'primary'
): Promise<Contact> {
  const contact = await prisma.contact.create({
    data: {
      email,
      phoneNumber,
      linkedId,
      linkPrecedence,
    },
  });
  return contact as Contact;
}

/**
 * Update contact's linked ID and precedence
 */
export async function updateContact(
  id: number,
  linkedId: number | null,
  linkPrecedence: 'primary' | 'secondary'
): Promise<Contact> {
  const contact = await prisma.contact.update({
    where: { id },
    data: { linkedId, linkPrecedence },
  });
  return contact as Contact;
}

/**
 * Get all secondary contacts linked to a primary
 */
export async function getSecondaryContacts(primaryId: number): Promise<Contact[]> {
  const contacts = await prisma.contact.findMany({
    where: { linkedId: primaryId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  return contacts as Contact[];
}

/**
 * Get the primary contact (traverse upwards through linkedId chain)
 */
export async function getPrimaryContact(contactId: number): Promise<Contact | null> {
  const currentId = contactId;
  let contact = await getContactById(currentId);

  if (!contact) return null;

  while (contact.linkedId !== null) {
    contact = await getContactById(contact.linkedId);
    if (!contact) break;
  }

  return contact;
}

/**
 * Get all contacts in a chain (primary + all secondaries recursively)
 */
export async function getContactChain(primaryId: number): Promise<Contact[]> {
  const chain: Contact[] = [];
  const visited = new Set<number>();

  async function traverse(contactId: number) {
    if (visited.has(contactId)) return;
    visited.add(contactId);

    const contact = await getContactById(contactId);
    if (!contact) return;

    chain.push(contact);

    const secondaries = await getSecondaryContacts(contactId);
    for (const secondary of secondaries) {
      await traverse(secondary.id);
    }
  }

  await traverse(primaryId);
  return chain;
}

/**
 * Close the database connection pool
 */
export async function closePool(): Promise<void> {
  await prisma.$disconnect();
}
