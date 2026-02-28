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

    // Validate input
    if (!email && !phoneNumber) {
      return NextResponse.json(
        { error: 'Either email or phoneNumber must be provided' },
        { status: 400 }
      );
    }

    // Find existing contacts with matching email or phone
    const existingContacts = await findContactsByEmailOrPhone(email, phoneNumber);

    // If no contacts found, create a new primary contact
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

    // Get all unique primary IDs from existing contacts
    const primaryIds = new Set<number>();
    for (const contact of existingContacts) {
      const primary = await getPrimaryContact(contact.id);
      if (primary) {
        primaryIds.add(primary.id);
      }
    }

    // If multiple primaries found, consolidate: keep oldest as primary
    let primaryContactId: number;
    const primaryArray = Array.from(primaryIds).sort((a, b) => a - b); // Lower ID = older

    if (primaryArray.length > 1) {
      // The oldest primary becomes the main primary
      primaryContactId = primaryArray[0];

      // All other primaries become secondary to the oldest
      for (let i = 1; i < primaryArray.length; i++) {
        const secondaryId = primaryArray[i];
        await updateContact(secondaryId, primaryContactId, 'secondary');

        // Update all secondaries of this contact to point to the new primary
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

    // If the input email/phone is not yet linked to the primary, create a secondary or update
    const isPrimaryLinked = existingContacts.some((c) => c.id === primaryContactId);
    const isAlreadyLinked = existingContacts.some(
      (c) =>
        c.linkedId === primaryContactId ||
        c.id === primaryContactId
    );

    if (!isAlreadyLinked && !isPrimaryLinked) {
      // Create a new secondary contact
      const newContact = await createContact(
        email || null,
        phoneNumber || null,
        primaryContactId,
        'secondary'
      );
    }

    // Get the complete contact chain
    const contactChain = await getContactChain(primaryContactId);

    // Consolidate all emails and phone numbers
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

    // Sort with primary's email/phone first
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