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

export async function getContactById(id: number): Promise<Contact | null> {
  const contact = await prisma.contact.findFirst({
    where: { id, deletedAt: null },
  });
  return contact as Contact | null;
}

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

export async function getSecondaryContacts(primaryId: number): Promise<Contact[]> {
  const contacts = await prisma.contact.findMany({
    where: { linkedId: primaryId, deletedAt: null },
    orderBy: { createdAt: 'asc' },
  });
  return contacts as Contact[];
}

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

export async function closePool(): Promise<void> {
  await prisma.$disconnect();
}
