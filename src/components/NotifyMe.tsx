import { useEffect, useId, useRef, useState } from 'react';
import { COMING_SOON_NOTE } from '../content/comingSoon';
import {
  NOTIFY_AUDIENCES, NOTIFY_BUTTON, NOTIFY_CONFIRM, NOTIFY_EMAIL_INVALID, NOTIFY_PACKS,
  NOTIFY_PACK_LABEL, NOTIFY_PHONE_INVALID, NOTIFY_RATE_LIMIT, NOTIFY_REASSURANCE,
  NOTIFY_UNAVAILABLE, NOTIFY_AUDIENCE_LABEL,
} from '../content/notifyCopy';

export interface NotifyFields {
  email: string;
  phone: string;
  audience: string;
  packSize: string;
  company: string;
}

export interface NotifyFieldErrors {
  email?: string;
  phone?: string;
}

const EMPTY: NotifyFields = { email: '', phone: '', audience: '', packSize: '', company: '' };

export function validateNotifyFields(fields: Pick<NotifyFields, 'email' | 'phone'>): NotifyFieldErrors {
  const errors: NotifyFieldErrors = {};
  const email = fields.email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) errors.email = NOTIFY_EMAIL_INVALID;
  const phone = fields.phone.trim();
  if (phone && !/^[+0-9][0-9\s()-]{7,19}$/.test(phone)) errors.phone = NOTIFY_PHONE_INVALID;
  return errors;
}

interface FormProps {
  productName: string;
  comingSoon?: boolean;
  status: 'form' | 'submitting' | 'done' | 'error';
  message?: string;
  fields: NotifyFields;
  fieldErrors: NotifyFieldErrors;
  onChange: (patch: Partial<NotifyFields>) => void;
  onSubmit: () => void;
  onClose: () => void;
}

/** The form itself, so confirmation, validation and error states can render without a click. */
export function NotifyForm({
  productName, comingSoon, status, message, fields, fieldErrors, onChange, onSubmit, onClose,
}: FormProps) {
  const titleId = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (status !== 'done') emailRef.current?.focus(); }, [status]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-brand-ink/50"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-brand-line shadow-2xl p-5 md:p-6"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="font-display text-2xl text-brand-forest">{NOTIFY_BUTTON}</h2>
            <p className="mt-1 text-sm text-brand-muted">{productName}</p>
            {comingSoon && <p className="mt-1 text-xs text-brand-leaf">{COMING_SOON_NOTE}</p>}
          </div>
          <button type="button" onClick={onClose} className="text-sm text-brand-muted hover:text-brand-forest" aria-label="Close">
            Close
          </button>
        </div>

        {status === 'done' ? (
          <p className="mt-5 text-sm leading-relaxed text-brand-forest" role="status">{NOTIFY_CONFIRM}</p>
        ) : (
          <form
            className="mt-5 space-y-4"
            onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
            noValidate
          >
            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
              <label htmlFor="notify-company">Company</label>
              <input
                id="notify-company"
                name="company"
                tabIndex={-1}
                autoComplete="off"
                value={fields.company}
                onChange={(e) => onChange({ company: e.target.value })}
              />
            </div>

            <label className="block text-sm text-brand-forest">
              Email
              <input
                ref={emailRef}
                type="email"
                name="email"
                required
                autoComplete="email"
                value={fields.email}
                onChange={(e) => onChange({ email: e.target.value })}
                className="mt-1 w-full rounded-xl border border-brand-line px-3 py-2 text-sm"
                aria-invalid={fieldErrors.email ? true : undefined}
                aria-describedby={fieldErrors.email ? 'notify-email-error' : undefined}
              />
            </label>
            {fieldErrors.email && <p id="notify-email-error" className="text-sm text-red-700" role="alert">{fieldErrors.email}</p>}

            <label className="block text-sm text-brand-forest">
              Phone <span className="text-brand-muted">(optional)</span>
              <input
                type="tel"
                name="phone"
                autoComplete="tel"
                value={fields.phone}
                onChange={(e) => onChange({ phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-brand-line px-3 py-2 text-sm"
                aria-invalid={fieldErrors.phone ? true : undefined}
                aria-describedby={fieldErrors.phone ? 'notify-phone-error' : undefined}
              />
            </label>
            {fieldErrors.phone && <p id="notify-phone-error" className="text-sm text-red-700" role="alert">{fieldErrors.phone}</p>}

            <fieldset>
              <legend className="text-sm text-brand-forest">{NOTIFY_AUDIENCE_LABEL} <span className="text-brand-muted">(optional)</span></legend>
              <div className="mt-2 space-y-1.5">
                {NOTIFY_AUDIENCES.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm text-brand-forest">
                    <input
                      type="radio"
                      name="audience"
                      value={option.value}
                      checked={fields.audience === option.value}
                      onChange={() => onChange({ audience: option.value })}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm text-brand-forest">{NOTIFY_PACK_LABEL} <span className="text-brand-muted">(optional)</span></legend>
              <div className="mt-2 space-y-1.5">
                {NOTIFY_PACKS.map((option) => (
                  <label key={option.value} className="flex items-center gap-2 text-sm text-brand-forest">
                    <input
                      type="radio"
                      name="packSize"
                      value={option.value}
                      checked={fields.packSize === option.value}
                      onChange={() => onChange({ packSize: option.value })}
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <p className="text-xs leading-relaxed text-brand-muted">{NOTIFY_REASSURANCE}</p>

            {status === 'error' && (
              <p className="text-sm text-red-700" role="alert">{message || NOTIFY_UNAVAILABLE}</p>
            )}

            <button type="submit" className="btn-primary w-full !py-2.5 text-sm" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Sending…' : NOTIFY_BUTTON}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

interface ButtonProps {
  productKey: string;
  productName: string;
  comingSoon?: boolean;
  className?: string;
}

/** Opens the one-time back-in-stock form. */
export function NotifyMe({ productKey, productName, comingSoon = false, className = '' }: ButtonProps) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<NotifyFields>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<NotifyFieldErrors>({});
  const [status, setStatus] = useState<FormProps['status']>('form');
  const [message, setMessage] = useState<string | undefined>();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const submit = async () => {
    const errors = validateNotifyFields(fields);
    setFieldErrors(errors);
    if (errors.email || errors.phone) return;
    setStatus('submitting');
    setMessage(undefined);
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productKey,
          productName,
          email: fields.email.trim(),
          phone: fields.phone.trim(),
          audience: fields.audience,
          packSize: fields.packSize,
          company: fields.company,
        }),
      });
      const body = await res.json().catch(() => null) as { ok?: boolean; error?: string; fieldErrors?: NotifyFieldErrors } | null;
      if (res.status === 429) {
        setStatus('error');
        setMessage(body?.error || NOTIFY_RATE_LIMIT);
        return;
      }
      if (!res.ok || !body?.ok) {
        if (body?.fieldErrors) setFieldErrors(body.fieldErrors);
        setStatus('error');
        setMessage(body?.error || NOTIFY_UNAVAILABLE);
        return;
      }
      setStatus('done');
    } catch {
      setStatus('error');
      setMessage(NOTIFY_UNAVAILABLE);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`btn-ghost ${className}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
      >
        {NOTIFY_BUTTON}
      </button>
      {open && (
        <NotifyForm
          productName={productName}
          comingSoon={comingSoon}
          status={status}
          message={message}
          fields={fields}
          fieldErrors={fieldErrors}
          onChange={(patch) => setFields((prev) => ({ ...prev, ...patch }))}
          onSubmit={() => { void submit(); }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
