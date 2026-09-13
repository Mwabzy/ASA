import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { api, UnauthorizedError } from './lib/api.js';
import { PUBLIC_ROUTES } from './lib/constants.js';
import { syncStamp } from './lib/dates.js';
import { emptyForm, newId } from './lib/form.js';
import AppShell from './components/AppShell.jsx';
import DoctorDetail from './components/DoctorDetail.jsx';
import { Toast } from './components/States.jsx';
import Registry from './screens/Registry.jsx';
import Apply from './screens/Apply.jsx';
import Import from './screens/Import.jsx';
import Success from './screens/Success.jsx';
import Login from './screens/Login.jsx';
import ChangePassword from './screens/ChangePassword.jsx';

const ROUTES = ['apply','registry','import','signin'];

/* Apply is the public front door, so an empty or unknown hash lands there
   rather than on a staff section the visitor may not be able to open. */
function routeFromHash(){
  const h = (window.location.hash || '').replace(/^#\/?/, '');
  return ROUTES.indexOf(h)>=0 ? h : 'apply';
}

/* Sign-in is neither public nor an Admitting Office section — it is the way in
   to one, so it is excluded from both lists. */
const isAdminRoute = (r) => r!=='signin' && PUBLIC_ROUTES.indexOf(r)<0;

export default function App(){
  const [route, setRoute]       = useState(routeFromHash);
  const [doctors, setDoctors]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [retrying, setRetrying] = useState(false);

  const [user, setUser]         = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [signingIn, setSigningIn]     = useState(false);
  const [authError, setAuthError]     = useState('');
  const [pwSaving, setPwSaving]       = useState(false);
  const [pwError, setPwError]         = useState('');
  const [lastSynced, setSynced] = useState('—');

  const [form, setForm]         = useState(emptyForm);
  const [editing, setEditing]   = useState(null);
  const [submitting, setSubmit] = useState(false);
  const [submitError, setSubErr]= useState('');
  const [submitted, setSubmitted] = useState(null);

  const [selected, setSelected] = useState(null);
  const [batchIds, setBatchIds] = useState(null);
  const [impSummary, setImpSummary] = useState(null);
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState('');

  const [toast, setToast]       = useState(null);

  const say = useCallback((text, tone) => {
    setToast({ text, tone: tone || 'ok' });
    window.clearTimeout(say._t);
    say._t = window.setTimeout(() => setToast(null), 2600);
  }, []);

  /* ---- routing ---- */
  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    window.addEventListener('hashchange', onHash);
    if(!window.location.hash) window.location.replace('#/apply');
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  /* `keepForm` is set by "Edit", which has already loaded a record into the
     wizard. Every other route into Apply starts a blank application. */
  const navigate = useCallback((key, opts) => {
    window.location.hash = '#/'+key;
    setRoute(key);
    setSelected(null);
    if(key==='apply' && !(opts && opts.keepForm)){
      setForm(emptyForm());
      setEditing(null);
      setSubmitted(null);
      setSubErr('');
    }
    if(key!=='apply'){ setSubmitted(null); setSubErr(''); }
    if(key!=='import'){ setImpSummary(null); setCommitError(''); }
  }, []);

  /* A signed-in visitor has no use for the sign-in screen; send them on. */
  useEffect(() => {
    if(user && route==='signin') navigate('registry');
  }, [user, route, navigate]);

  /* ---- session ----
     Nothing else runs until the service confirms who is signed in. */
  useEffect(() => {
    api.me()
      .then(r => setUser(r.user))
      .catch(() => setUser(null))
      .finally(() => setAuthChecked(true));
  }, []);

  const signIn = async (email, password) => {
    setSigningIn(true);
    setAuthError('');
    try {
      const r = await api.login(email, password);
      setUser(r.user);
      /* Sign-in demanded by an admin section returns to the section that was
         asked for; sign-in reached from the staff link opens the registry. */
      if(!isAdminRoute(route)) navigate('registry');
    } catch (e) {
      setAuthError(e.message);
    } finally {
      setSigningIn(false);
    }
  };

  const signOut = async () => {
    try { await api.logout(); } catch (e) { /* the cookie is cleared either way */ }
    setUser(null);
    setDoctors([]);
    setSelected(null);
    setBatchIds(null);
    setAuthError('');
    /* Signing out drops you back on the public application, not a dead end. */
    navigate('apply');
  };

  const changePassword = async (currentPassword, newPassword) => {
    setPwSaving(true);
    setPwError('');
    try {
      await api.changePassword(currentPassword, newPassword);
      setUser(u => ({ ...u, mustChangePassword: false }));
      say('Password updated');
    } catch (e) {
      setPwError(e.message);
    } finally {
      setPwSaving(false);
    }
  };

  /* ---- data ---- */
  const load = useCallback(async (isRetry) => {
    if(isRetry) setRetrying(true); else setLoading(true);
    setError('');
    try {
      const [list, meta] = await Promise.all([api.listDoctors(), api.meta().catch(() => null)]);
      setDoctors(list);
      if(meta) setSynced(syncStamp(meta.lastSyncedKmpdc));
    } catch (e) {
      /* A dead session is not a load failure — it sends you back to sign-in. */
      if(e instanceof UnauthorizedError){ setUser(null); setAuthError(e.message); }
      else setError(e.message);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  /* Load the registry only once there is a usable session. */
  useEffect(() => {
    if(user && !user.mustChangePassword) load(false);
  }, [user, load]);

  /* ---- register / edit ---- */
  const startApply = () => {
    setForm(emptyForm());
    setEditing(null);
    setSubmitted(null);
    setSubErr('');
  };

  const startEdit = (doctor) => {
    setSelected(null);
    setEditing(doctor.id);
    setSubmitted(null);
    setSubErr('');
    setForm({ ...emptyForm(), ...doctor, _editId: doctor.id });
    navigate('apply', { keepForm:true });
  };

  const submit = async (record) => {
    setSubmit(true);
    setSubErr('');
    try {
      if(editing){
        const saved = await api.updateDoctor(editing, { ...record, id: editing });
        setDoctors(list => list.map(d => d.id===editing ? saved : d));
        setSubmitted(saved);
        say('Changes saved');
      } else {
        const payload = { ...record, id: newId(), createdAt: Date.now() };
        delete payload._editId;
        const saved = await api.createDoctor(payload);
        setDoctors(list => [saved].concat(list));
        setSubmitted(saved);
        say(record.applicantType==='new' ? 'Application submitted' : 'Doctor registered');
      }
    } catch (e) {
      setSubErr(e.message);
    } finally {
      setSubmit(false);
    }
  };

  /* ---- import ---- */
  const commitImport = async (rows, invalidCount) => {
    setCommitting(true);
    setCommitError('');
    try {
      const res = await api.bulkImport({ rows });
      setDoctors(res.doctors);
      setImpSummary({ ...res.summary, skipped: res.summary.skipped + invalidCount });
      say('Imported '+res.summary.imported+(res.summary.imported===1 ? ' doctor' : ' doctors'));
    } catch (e) {
      setCommitError(e.message);
    } finally {
      setCommitting(false);
    }
  };

  const viewImported = () => {
    const ids = impSummary ? impSummary.ids : null;
    setBatchIds(ids && ids.length ? ids : null);
    setImpSummary(null);
    navigate('registry');
  };

  /* ---- gates ----
     Apply is public. Registry and Import belong to the Admitting Office and are
     never rendered without a session. */

  if(!authChecked){
    return (
      <div className="grid min-h-screen place-items-center bg-raised" aria-busy="true">
        <span className="sr-only">Checking your session…</span>
        <img src="/logo-nairobi-hospital.png" width="56" height="56" alt=""
             className="h-14 w-14 opacity-40" />
      </div>
    );
  }

  if(!user && (route==='signin' || isAdminRoute(route))){
    return (
      <Login
        onSignIn={signIn}
        signingIn={signingIn}
        error={authError}
        section={isAdminRoute(route) ? route : null}
        onBack={() => navigate('apply')}
      />
    );
  }

  if(user && user.mustChangePassword){
    return (
      <ChangePassword
        user={user}
        onChange={changePassword}
        saving={pwSaving}
        error={pwError}
        onSignOut={signOut}
      />
    );
  }

  /* Signed in, the sign-in screen is not a place to be. `view` keeps the render
     on the registry while the effect above rewrites the hash, so there is no
     blank frame in between. */
  const view = route==='signin' ? 'registry' : route;

  return (
    <AppShell
      route={view}
      onNavigate={navigate}
      user={user}
      onSignOut={signOut}
      onSignIn={() => navigate('signin')}
      lastSynced={lastSynced}
    >
      {view==='registry' && (
        <Registry
          doctors={doctors}
          loading={loading}
          error={error}
          onRetry={() => load(true)}
          retrying={retrying}
          batchIds={batchIds}
          onClearBatch={() => setBatchIds(null)}
          onOpen={setSelected}
          onEdit={startEdit}
          onNavigate={navigate}
        />
      )}

      {view==='apply' && (
        submitted
          ? <Success
              record={submitted}
              editing={!!editing}
              isPublic={!user}
              onAnother={() => { startApply(); }}
              onNavigate={navigate}
            />
          : <Apply
              form={form}
              setForm={setForm}
              doctors={doctors}
              editing={!!editing}
              isPublic={!user}
              onSubmit={submit}
              submitting={submitting}
              submitError={submitError}
            />
      )}

      {view==='import' && (
        <Import
          doctors={doctors}
          onCommit={commitImport}
          committing={committing}
          commitError={commitError}
          summary={impSummary}
          onViewImported={viewImported}
          onCancel={() => { setImpSummary(null); setCommitError(''); navigate('registry'); }}
        />
      )}

      {/* Both of these are dismissed by state going away, so they need to stay
          mounted long enough to animate out. */}
      <AnimatePresence>
        {selected && (
          <DoctorDetail
            key="detail"
            doctor={selected}
            onClose={() => setSelected(null)}
            onEdit={startEdit}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast key="toast" text={toast.text} tone={toast.tone} />}
      </AnimatePresence>
    </AppShell>
  );
}
