'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DialogClose, DialogFooter } from '@/components/ui/dialog';
import { Input, Label, Textarea } from '@/components/ui/input';
import type { ApiPartner, ApiPartnerInput, PartnerScope } from '@/lib/api';

/** Mirrors ApiPartner::SCOPES on the backend. */
export const PARTNER_SCOPES: { key: PartnerScope; label: string; help: string }[] = [
  { key: 'penkeep.read', label: 'Read data', help: 'Device status and readings: temperatures, humidity, air quality, battery, relays' },
  { key: 'penkeep.link', label: 'Link devices', help: 'Attach their allocated devices to a store or farm in their own app' },
  { key: 'penkeep.control', label: 'Control relays', help: 'Switch relays T1, T2, T3 and the socket (e.g. an irrigation valve)' },
];

export type PartnerFormValues = ApiPartnerInput & { slug: string };

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}$/;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 39);
}

interface Props {
  /** Existing partner when editing; the slug is then read-only. */
  partner?: ApiPartner;
  submitting: boolean;
  /** Field errors from the API (422), keyed like `slug` or `ip_allowlist.0`. */
  errors?: Record<string, string[]>;
  submitLabel: string;
  onSubmit: (values: PartnerFormValues) => void;
}

export function PartnerForm({ partner, submitting, errors = {}, submitLabel, onSubmit }: Props) {
  const editing = Boolean(partner);
  const [name, setName] = useState(partner?.name ?? '');
  const [slug, setSlug] = useState(partner?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(editing);
  const [description, setDescription] = useState(partner?.description ?? '');
  const [contactName, setContactName] = useState(partner?.contact_name ?? '');
  const [contactEmail, setContactEmail] = useState(partner?.contact_email ?? '');
  const [contactPhone, setContactPhone] = useState(partner?.contact_phone ?? '');
  const [scopes, setScopes] = useState<PartnerScope[]>(partner?.scopes ?? ['penkeep.read', 'penkeep.link']);
  const [rateLimit, setRateLimit] = useState<number | ''>(partner?.rate_limit_per_minute ?? 120);
  const [ips, setIps] = useState((partner?.ip_allowlist ?? []).join('\n'));
  const [localError, setLocalError] = useState<string | null>(null);

  const fieldError = (key: string) =>
    errors[key]?.[0] ?? Object.entries(errors).find(([k]) => k.startsWith(`${key}.`))?.[1]?.[0];

  function toggleScope(key: PartnerScope) {
    setScopes((s) => (s.includes(key) ? s.filter((x) => x !== key) : [...s, key]));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing && !SLUG_RE.test(slug)) {
      setLocalError('Partner ID: use 2–39 lowercase letters, numbers or dashes, e.g. ewdss.');
      return;
    }
    if (scopes.length === 0) {
      setLocalError('Choose at least one permission.');
      return;
    }
    setLocalError(null);
    onSubmit({
      name: name.trim(),
      slug,
      description: description.trim() || null,
      contact_name: contactName.trim() || null,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      scopes,
      rate_limit_per_minute: Number(rateLimit),
      ip_allowlist: ips.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean),
    });
  }

  const err = (key: string) => {
    const msg = fieldError(key);
    return msg ? <p className="mt-1 text-xs font-medium text-[var(--color-brand-danger)]">{msg}</p> : null;
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" noValidate>
      {localError && (
        <p role="alert" className="sm:col-span-2 rounded-md bg-[color:rgb(220_38_38/0.08)] px-3 py-2 text-sm font-medium text-[var(--color-brand-danger)]">
          {localError}
        </p>
      )}

      <div>
        <Label htmlFor="p-name">Organisation name *</Label>
        <Input
          id="p-name"
          value={name}
          required
          maxLength={120}
          placeholder="EWDSS — FUNAAB"
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
        />
        {err('name')}
      </div>

      <div>
        <Label htmlFor="p-slug">Partner ID *</Label>
        <Input
          id="p-slug"
          value={slug}
          readOnly={editing}
          maxLength={39}
          className="font-mono"
          placeholder="ewdss"
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value.toLowerCase());
          }}
        />
        {err('slug') ?? (
          <p className="mt-1 text-xs text-[var(--color-brand-muted)]">
            {editing ? 'Fixed — recorded on every device and audit entry.' : "Lowercase, numbers and dashes. Can't be changed later."}
          </p>
        )}
      </div>

      <div className="sm:col-span-2">
        <Label htmlFor="p-desc">What they use it for</Label>
        <Textarea
          id="p-desc"
          rows={2}
          maxLength={1000}
          value={description}
          placeholder="Early-warning app for farmers — storage monitoring and irrigation"
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div>
        <Label htmlFor="p-cname">Technical contact</Label>
        <Input id="p-cname" value={contactName} maxLength={120} onChange={(e) => setContactName(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="p-cemail">Contact email</Label>
        <Input id="p-cemail" type="email" value={contactEmail} maxLength={190} onChange={(e) => setContactEmail(e.target.value)} />
        {err('contact_email')}
      </div>
      <div>
        <Label htmlFor="p-cphone">Contact phone</Label>
        <Input id="p-cphone" type="tel" value={contactPhone} maxLength={30} onChange={(e) => setContactPhone(e.target.value)} />
      </div>
      <div>
        <Label htmlFor="p-rate">Rate limit (requests / minute) *</Label>
        <Input
          id="p-rate"
          type="number"
          min={10}
          max={6000}
          value={rateLimit}
          onChange={(e) => setRateLimit(e.target.value === '' ? '' : Number(e.target.value))}
        />
        {err('rate_limit_per_minute') ?? (
          <p className="mt-1 text-xs text-[var(--color-brand-muted)]">120 suits one app syncing every couple of minutes.</p>
        )}
      </div>

      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium">Permissions *</legend>
        <p className="mb-2 text-xs text-[var(--color-brand-muted)]">Give only what they need. Individual keys can be limited further.</p>
        <div className="grid gap-2">
          {PARTNER_SCOPES.map((s) => {
            const on = scopes.includes(s.key);
            return (
              <label
                key={s.key}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition ${
                  on
                    ? 'border-[var(--color-brand-primary)] bg-[color:rgb(22_177_45/0.06)]'
                    : 'border-[var(--color-brand-border)] bg-white hover:bg-[var(--color-brand-bg)]'
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[var(--color-brand-primary)]"
                  checked={on}
                  onChange={() => toggleScope(s.key)}
                />
                <span>
                  <span className="block text-sm font-medium">{s.label}</span>
                  <span className="block text-xs text-[var(--color-brand-muted)]">
                    {s.help} · <code>{s.key}</code>
                  </span>
                </span>
              </label>
            );
          })}
        </div>
        {err('scopes')}
      </fieldset>

      <div className="sm:col-span-2">
        <Label htmlFor="p-ips">Allowed IP addresses</Label>
        <Textarea
          id="p-ips"
          rows={3}
          className="font-mono"
          value={ips}
          placeholder={'102.89.4.10\n102.89.0.0/16'}
          onChange={(e) => setIps(e.target.value)}
        />
        {err('ip_allowlist') ?? (
          <p className="mt-1 text-xs text-[var(--color-brand-muted)]">One per line. Leave empty to allow any IP (recommended only for testing).</p>
        )}
      </div>

      <DialogFooter className="sm:col-span-2">
        <DialogClose asChild>
          <Button type="button" variant="secondary">Cancel</Button>
        </DialogClose>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  );
}
