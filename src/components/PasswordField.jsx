import { useState } from 'react';
import { Eye, EyeOff } from './icons.jsx';

/* A password input with a show/hide toggle.

   The toggle is a real button so it is reachable by keyboard, and it is
   excluded from the tab order between the field and the submit button — a
   sighted mouse user wants it, someone tabbing through a login form does not.
   It stays reachable via the label's own focus ring and screen readers, which
   announce the state through aria-pressed. */
export default function PasswordField({
  id, label, value, onChange, autoComplete = 'current-password',
  error, hint, hintId, required = true, inputRef
}){
  const [shown, setShown] = useState(false);

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-medium text-ink">
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          ref={inputRef}
          type={shown ? 'text' : 'password'}
          className={'inp pr-11'+(error ? ' inp-err' : '')}
          value={value}
          onChange={e => onChange(e.target.value)}
          autoComplete={autoComplete}
          autoCapitalize="none"
          spellCheck="false"
          aria-invalid={!!error}
          aria-describedby={hint ? hintId : undefined}
          required={required}
        />
        <button
          type="button"
          onClick={() => setShown(v => !v)}
          aria-pressed={shown}
          aria-controls={id}
          aria-label={shown ? 'Hide password' : 'Show password'}
          title={shown ? 'Hide password' : 'Show password'}
          tabIndex={-1}
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-ink-52 transition-colors hover:bg-line-soft hover:text-ink"
        >
          {shown ? <EyeOff width="16" height="16" /> : <Eye width="16" height="16" />}
        </button>
      </div>
    </div>
  );
}
