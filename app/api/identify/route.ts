import { NextRequest, NextResponse } from "next/server";
import {
  findContactsByEmailOrPhone,
  createContact,
  updateContact,
  getPrimaryContact,
  getContactById,
  getContactChain,
} from "@/lib/db";

type IdentifyRequest = { email?: string; phoneNumber?: string };
type IdentifyResponse = {
  contact: {
    primaryContactId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
};

export async function POST(request: NextRequest) {
  try {
    const body: IdentifyRequest = await request.json();
    const { email, phoneNumber } = body;

    if (!email && !phoneNumber) {
      return NextResponse.json(
        { error: 'Either email or phoneNumber must be provided' },
        { status: 400 }
      );
    }

    const existingContacts = await findContactsByEmailOrPhone(email, phoneNumber);

    if (existingContacts.length === 0) {
      const newContact = await createContact(email || null, phoneNumber || null);
      const response: IdentifyResponse = {
        contact: {
          primaryContactId: newContact.id,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: [],
        },
      };
      return NextResponse.json(response, { status: 200 });
    }

    const primaryIds = new Set<number>();
    for (const contact of existingContacts) {
      const primary = await getPrimaryContact(contact.id);
      if (primary) {
        primaryIds.add(primary.id);
      }
    }

    let primaryContactId: number;
    const primaryArray = Array.from(primaryIds).sort((a, b) => a - b);

    if (primaryArray.length > 1) {
      primaryContactId = primaryArray[0];

      for (let i = 1; i < primaryArray.length; i++) {
        const secondaryId = primaryArray[i];
        await updateContact(secondaryId, primaryContactId, 'secondary');

        const secondaries = await getContactChain(secondaryId);
        for (const secondary of secondaries) {
          if (secondary.id !== secondaryId) {
            await updateContact(secondary.id, primaryContactId, 'secondary');
          }
        }
      }
    } else {
      primaryContactId = primaryArray[0];
    }

    let contactChain = await getContactChain(primaryContactId);
    const emailsInChain = new Set(contactChain.map((c) => c.email).filter(Boolean));
    const phonesInChain = new Set(contactChain.map((c) => c.phoneNumber).filter(Boolean));
    const emailInChain = !email || emailsInChain.has(email);
    const phoneInChain = !phoneNumber || phonesInChain.has(phoneNumber);
    const hasNewInfo = !emailInChain || !phoneInChain;

    if (hasNewInfo) {
      await createContact(
        email || null,
        phoneNumber || null,
        primaryContactId,
        'secondary'
      );
      contactChain = await getContactChain(primaryContactId);
    }

    const emailSet = new Set<string>();
    const phoneSet = new Set<string>();
    const secondaryIds: number[] = [];

    for (const contact of contactChain) {
      if (contact.email) emailSet.add(contact.email);
      if (contact.phoneNumber) phoneSet.add(contact.phoneNumber);
      if (contact.id !== primaryContactId) {
        secondaryIds.push(contact.id);
      }
    }

    const primaryContact = await getContactById(primaryContactId);
    const emails = Array.from(emailSet).sort((a, b) => {
      if (primaryContact?.email === a) return -1;
      if (primaryContact?.email === b) return 1;
      return 0;
    });

    const phoneNumbers = Array.from(phoneSet).sort((a, b) => {
      if (primaryContact?.phoneNumber === a) return -1;
      if (primaryContact?.phoneNumber === b) return 1;
      return 0;
    });

    const response: IdentifyResponse = {
      contact: {
        primaryContactId,
        emails,
        phoneNumbers,
        secondaryContactIds: secondaryIds.sort((a, b) => a - b),
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error('[v0] Error in identify endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    { message: 'Identity Reconciliation API is running' },
    { status: 200 }
  );
}