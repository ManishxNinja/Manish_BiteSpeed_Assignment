'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';

interface IdentifyResponse {
  contact?: {
    primaryContactId: number;
    emails: string[];
    phoneNumbers: string[];
    secondaryContactIds: number[];
  };
  error?: string;
}

export default function Home() {
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<IdentifyResponse | null>(null);
  const [error, setError] = useState('');

  const handleIdentify = async () => {
    if (!email && !phoneNumber) {
      setError('Please enter an email or phone number');
      return;
    }

    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const res = await fetch('/api/identify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email || undefined,
          phoneNumber: phoneNumber || undefined,
        }),
      });

      const data: IdentifyResponse = await res.json();

      if (!res.ok) {
        setError(data.error || 'An error occurred');
      } else {
        setResponse(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setEmail('');
    setPhoneNumber('');
    setResponse(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight">
            Identity Reconciliation
          </h1>
          <p className="mt-2 text-lg text-muted-foreground">
            Test the Bitespeed identity reconciliation API
          </p>
        </div>

        <Card className="p-6 mb-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Phone Number
              </label>
              <Input
                type="tel"
                placeholder="+1234567890"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
              />
            </div>

            <p className="text-sm text-muted-foreground">
              At least one field is required
            </p>

            <div className="flex gap-4 pt-4">
              <Button
                onClick={handleIdentify}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Identifying...' : 'Identify Contact'}
              </Button>
              <Button
                onClick={handleClear}
                variant="outline"
                disabled={loading}
              >
                Clear
              </Button>
            </div>
          </div>
        </Card>

        {error && (
          <Card className="p-4 mb-8 border-red-200 bg-red-50">
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-700 text-sm mt-1">{error}</p>
          </Card>
        )}

        {response && response.contact && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Response</h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                  Primary Contact ID
                </h3>
                <p className="text-2xl font-bold">
                  {response.contact.primaryContactId}
                </p>
              </div>

              {response.contact.emails.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    Emails ({response.contact.emails.length})
                  </h3>
                  <ul className="space-y-1">
                    {response.contact.emails.map((email, i) => (
                      <li key={i} className="text-sm p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded">
                        {email}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {response.contact.phoneNumbers.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    Phone Numbers ({response.contact.phoneNumbers.length})
                  </h3>
                  <ul className="space-y-1">
                    {response.contact.phoneNumbers.map((phone, i) => (
                      <li key={i} className="text-sm p-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded">
                        {phone}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {response.contact.secondaryContactIds.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                    Secondary Contact IDs (
                    {response.contact.secondaryContactIds.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {response.contact.secondaryContactIds.map((id) => (
                      <span
                        key={id}
                        className="px-3 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm rounded-full"
                      >
                        {id}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t">
                <details className="cursor-pointer">
                  <summary className="text-sm font-medium text-muted-foreground hover:text-foreground">
                    View Raw JSON
                  </summary>
                  <pre className="mt-4 p-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded text-xs overflow-auto max-h-48">
                    {JSON.stringify(response, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
