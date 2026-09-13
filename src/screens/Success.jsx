import Mascot from '../components/Mascot.jsx';

export default function Success({ record, editing, onAnother, onNavigate }){
  const applying = record.applicantType==='new';
  const who = (record.salutation ? record.salutation+' ' : '') + (record.fullNames || 'The doctor');

  const title = editing ? 'Changes saved' : (applying ? 'Application submitted' : 'Doctor registered');
  const body = editing
    ? who+'’s record has been updated on the registry.'
    : (applying
        ? who+'’s application has gone to the ASA committee. You’ll hear back once the referees have replied.'
        : who+' is now on the registry.');

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1.5 px-8 py-16 text-center">
      <Mascot name="done" size={150} />
      <h1 className="mt-2 text-[30px]">{title}</h1>
      <div aria-hidden="true" className="my-2.5 h-[3px] w-13 rounded-sm bg-accent" style={{ width:'52px' }} />
      <p className="max-w-md text-[15px] leading-relaxed text-ink-72">{body}</p>
      <div className="mt-6 flex w-full max-w-[320px] gap-2.5">
        <button type="button" className="btn btn-ghost btn-sm flex-1 py-3" onClick={onAnother}>
          {applying ? 'New application' : 'Register another'}
        </button>
        <button type="button" className="btn btn-sm flex-1 py-3" onClick={() => onNavigate('registry')}>
          View registry
        </button>
      </div>
    </div>
  );
}
