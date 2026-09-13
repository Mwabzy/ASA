import { useEffect, useRef, useState } from 'react';
import { Alert } from '../components/icons.jsx';

/* The sign-in screen. Deliberately quiet: the mark, one card, nothing to
   explore. It is the only thing rendered until a session exists. */
export default function Login({ onSignIn, signingIn, error }){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const emailRef = useRef(null);

  useEffect(() => {
    document.title = 'Sign in · Admitting Rights Registry';
    if(emailRef.current) emailRef.current.focus();
  }, []);

  const submit = (e) => {
    e.preventDefault();
    if(!email.trim() || !password) return;
    onSignIn(email.trim(), password);
  };

  return (
    <div className="flex min-h-screen flex-col bg-raised">
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-[26rem]">

          <div className="mb-7 flex flex-col items-center text-center">
            <img
              src="/logo-nairobi-hospital.png"
              width="64" height="64"
              alt="The Nairobi Hospital"
              className="h-16 w-16"
            />
            <h1 className="mt-4 text-[22px] leading-tight">Admitting Rights Registry</h1>
            <p className="mt-1.5 text-[13px] text-ink-52">The Nairobi Hospital</p>
          </div>

          <form
            onSubmit={submit}
            className="rounded-2xl border border-line bg-surface p-6 shadow-[0_10px_40px_rgba(10,10,35,.06)]"
            noValidate
          >
            <h2 className="text-[15px] font-semibold text-navy">Sign in</h2>
            <p className="mt-1 text-[12.5px] leading-relaxed text-ink-52">
              This registry is restricted to Admitting Office staff.
            </p>

            {error && (
              <p
                role="alert"
                className="mt-4 flex items-start gap-2 rounded-xl border px-3.5 py-3 text-[12.5px] leading-snug"
                style={{ color:'var(--color-inactive)', borderColor:'var(--color-inactive)', background:'rgba(220,38,38,.04)' }}
              >
                <Alert width="15" height="15" className="mt-px shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <div className="mt-5">
              <label htmlFor="login-email" className="mb-2 block text-[13px] font-medium text-ink">
                Email
              </label>
              <input
                id="login-email"
                ref={emailRef}
                type="email"
                className="inp"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck="false"
                placeholder="name@nairobihospital.org"
                required
              />
            </div>

            <div className="mt-4">
              <label htmlFor="login-password" className="mb-2 block text-[13px] font-medium text-ink">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                className="inp"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className="btn mt-6 w-full" disabled={signingIn || !email.trim() || !password}>
              {signingIn ? 'Signing in…' : 'Sign in'}
            </button>

            <p className="mt-4 text-[11.5px] leading-relaxed text-ink-52">
              Lost your password? The Admitting Office can reset it — accounts are
              not self-service.
            </p>
          </form>

          <p className="mt-6 text-center text-[11.5px] text-ink-52">
            The Nairobi Hospital · Kenya Hospital Association
          </p>
        </div>
      </main>
    </div>
  );
}
