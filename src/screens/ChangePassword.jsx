import { useEffect, useRef, useState } from 'react';
import { Alert } from '../components/icons.jsx';
import PasswordField from '../components/PasswordField.jsx';

/* Shown instead of the registry when an account still carries the password it
   was created with. There is no way past it but to set a new one. */
export default function ChangePassword({ user, onChange, saving, error, onSignOut }){
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    document.title = 'Set a new password · Admitting Rights Registry';
    if(ref.current) ref.current.focus();
  }, []);

  const tooShort = next.length > 0 && next.length < 12;
  const mismatch = confirm.length > 0 && next !== confirm;
  const ready = current && next.length >= 12 && next === confirm;

  const submit = (e) => {
    e.preventDefault();
    if(ready) onChange(current, next);
  };

  return (
    <div className="flex min-h-screen flex-col bg-raised">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[26rem]">

          <div className="mb-7 flex flex-col items-center text-center">
            <img src="/logo-nairobi-hospital.png" width="64" height="64"
                 alt="The Nairobi Hospital" className="h-16 w-16" />
            <h1 className="mt-4 text-[22px] leading-tight">Set a new password</h1>
            <p className="mt-1.5 text-[13px] text-ink-52">
              Signed in as <span className="font-mono">{user.email}</span>
            </p>
          </div>

          <form onSubmit={submit} noValidate
                className="rounded-2xl border border-line bg-surface p-6 shadow-[0_10px_40px_rgba(10,10,35,.06)]">
            <p className="text-[12.5px] leading-relaxed text-ink-72">
              This account is still using the password it was issued with. Choose
              your own before going on to the registry.
            </p>

            {error && (
              <p role="alert"
                 className="mt-4 flex items-start gap-2 rounded-xl border px-3.5 py-3 text-[12.5px] leading-snug"
                 style={{ color:'var(--color-inactive)', borderColor:'var(--color-inactive)', background:'rgba(220,38,38,.04)' }}>
                <Alert width="15" height="15" className="mt-px shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <div className="mt-5">
              <PasswordField
                id="cp-current"
                label="Current password"
                value={current}
                onChange={setCurrent}
                autoComplete="current-password"
                inputRef={ref}
              />
            </div>

            <div className="mt-4">
              <PasswordField
                id="cp-new"
                label="New password"
                value={next}
                onChange={setNext}
                autoComplete="new-password"
                error={tooShort}
                hint
                hintId="cp-new-hint"
              />
              <p id="cp-new-hint" className="mt-1.5 text-[11px] text-ink-52"
                 style={tooShort ? { color:'var(--color-inactive)' } : undefined}>
                At least 12 characters.
              </p>
            </div>

            <div className="mt-4">
              <PasswordField
                id="cp-confirm"
                label="Confirm new password"
                value={confirm}
                onChange={setConfirm}
                autoComplete="new-password"
                error={mismatch}
              />
              {mismatch && (
                <p className="mt-1.5 text-[11px]" style={{ color:'var(--color-inactive)' }}>
                  The two passwords do not match.
                </p>
              )}
            </div>

            <button type="submit" className="btn mt-6 w-full" disabled={!ready || saving}>
              {saving ? 'Saving…' : 'Set password and continue'}
            </button>

            <button type="button" onClick={onSignOut}
                    className="mt-3 w-full text-[12px] font-semibold text-ink-52 hover:text-brand">
              Sign out instead
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
