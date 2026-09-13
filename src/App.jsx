import { useCallback, useEffect, useState } from 'react';
import { api } from './lib/api.js';
import { syncStamp } from './lib/dates.js';
import { emptyForm, newId } from './lib/form.js';
import AppShell from './components/AppShell.jsx';
import DoctorDetail from './components/DoctorDetail.jsx';
import { Toast } from './components/States.jsx';
import Registry from './screens/Registry.jsx';
import Apply from './screens/Apply.jsx';
import Import from './screens/Import.jsx';
import Success from './screens/Success.jsx';

/* The signed-in user. Wired to whatever SSO the hospital puts in front of this;
   until then the service reports the session it has. */
const FALLBACK_USER = {
  name: 'Registry Admin',
  email: 'admitting@nairobihospital.org',
  role: 'Admitting Office · Medical Administration',
  initials: 'RA'
};

const ROUTES = ['apply','registry','import'];

function routeFromHash(){
  const h = (window.location.hash || '').replace(/^#\/?/, '');
  return ROUTES.indexOf(h)>=0 ? h : 'registry';
}

export default function App(){
  const [route, setRoute]       = useState(routeFromHash);
  const [doctors, setDoctors]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [retrying, setRetrying] = useState(false);

  const [user, setUser]         = useState(FALLBACK_USER);
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
    if(!window.location.hash) window.location.replace('#/registry');
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

  /* ---- data ---- */
  const load = useCallback(async (isRetry) => {
    if(isRetry) setRetrying(true); else setLoading(true);
    setError('');
    try {
      const [list, meta] = await Promise.all([api.listDoctors(), api.meta().catch(() => null)]);
      setDoctors(list);
      if(meta){
        setSynced(syncStamp(meta.lastSyncedKmpdc));
        if(meta.user) setUser(u => ({ ...u, ...meta.user }));
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRetrying(false);
    }
  }, []);

  useEffect(() => { load(false); }, [load]);

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

  const signOut = () => {
    say('Signed out of this session');
    window.setTimeout(() => { window.location.href = '/'; }, 700);
  };

  return (
    <AppShell
      route={route}
      onNavigate={navigate}
      user={user}
      onSignOut={signOut}
      lastSynced={lastSynced}
    >
      {route==='registry' && (
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

      {route==='apply' && (
        submitted
          ? <Success
              record={submitted}
              editing={!!editing}
              onAnother={() => { startApply(); }}
              onNavigate={navigate}
            />
          : <Apply
              form={form}
              setForm={setForm}
              doctors={doctors}
              editing={!!editing}
              onSubmit={submit}
              submitting={submitting}
              submitError={submitError}
            />
      )}

      {route==='import' && (
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

      {selected && (
        <DoctorDetail
          doctor={selected}
          onClose={() => setSelected(null)}
          onEdit={startEdit}
        />
      )}

      {toast && <Toast text={toast.text} tone={toast.tone} />}
    </AppShell>
  );
}
