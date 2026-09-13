import { useMemo, useState } from 'react';
import {
  TARGETS, IMP_REQ, SAMPLE, parseCSV, autoMap, impResults, unmappedRequired
} from '../lib/importer.js';
import { downloadTemplate, downloadErrors } from '../lib/csv.js';
import Mascot from '../components/Mascot.jsx';
import { Check, Download, Upload } from '../components/icons.jsx';

const STAGE_NAMES = ['Drop','Map','Validate','Commit'];
const POSES = ['greeting','listening','checking','sorting'];

const blankImp = { stage:0, over:false, fileName:'', headers:[], rows:[], map:{}, dups:{} };

export default function Import({ doctors, onCommit, committing, commitError, summary, onViewImported, onCancel }){
  const [imp, setImp] = useState(blankImp);

  const results = useMemo(
    () => (imp.headers.length ? impResults(imp, doctors) : []),
    [imp, doctors]
  );

  const stage = summary ? 3 : imp.stage;

  const loadFile = (file) => {
    if(!file) return;
    const r = new FileReader();
    r.onload = () => {
      let parsed;
      try { parsed = parseCSV(String(r.result)); }
      catch (e) { parsed = { headers:[], rows:[] }; }
      setImp(s => ({ ...s, stage:1, over:false, fileName:file.name,
                     headers:parsed.headers, rows:parsed.rows,
                     map:autoMap(parsed.headers), dups:{} }));
    };
    r.readAsText(file);
  };

  const loadSample = () => setImp(s => ({
    ...s, stage:1, over:false, fileName:'sample-doctors.csv',
    headers:SAMPLE.headers, rows:SAMPLE.rows, map:autoMap(SAMPLE.headers), dups:{}
  }));

  /* Editing a cell writes back into the raw row so validation re-runs on it. */
  const editCell = (rowIdx, target, value) => {
    setImp(s => {
      let headers = s.headers;
      let map = s.map;
      let rows = s.rows.map(r => r.slice());
      let ci = headers.indexOf(map[target]);
      if(ci<0){
        /* Column was never in the file — append one so the edit has somewhere to live. */
        headers = headers.concat([target]);
        map = { ...map, [target]: target };
        ci = headers.length-1;
        rows = rows.map(r => { while(r.length<ci) r.push(''); return r; });
      }
      rows[rowIdx][ci] = value;
      return { ...s, headers, map, rows };
    });
  };

  const missing = unmappedRequired(imp);
  const ready   = results.filter(r => r.ok && !(r.dup && (imp.dups[r.i]||'skip')==='skip'));
  const bad     = results.filter(r => !r.ok);
  const dups    = results.filter(r => r.dup && r.ok);

  const commit = () => onCommit(results.filter(r => r.ok).map(r => ({
    rec: r.rec,
    dup: r.dup,
    choice: imp.dups[r.i] || 'skip'
  })), bad.length);

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-10 lg:py-8">

      {/* ---- head ---- */}
      <div className="border-b border-line pb-4">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div>
            <p className="eyebrow">0{stage+1} · IMPORT</p>
            <h1 className="mt-0.5 text-[22px] leading-none">{STAGE_NAMES[stage]}</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:block"><Mascot name={POSES[stage]||'idle'} size={56} /></div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>Cancel</button>
          </div>
        </div>
        <ol className="flex items-center gap-1.5" aria-label={'Import stage '+(stage+1)+' of 4: '+STAGE_NAMES[stage]}>
          {[0,1,2,3].map(n => (
            <li key={n} className={'h-[3px] flex-1 rounded-sm '+(stage>=n ? 'bg-brand' : 'bg-line')} />
          ))}
        </ol>
      </div>

      <div className="mx-auto w-full max-w-[920px] pt-6">
        {commitError && (
          <p role="alert" className="mb-4 rounded-xl border px-4 py-3 text-[13px]"
             style={{ color:'var(--color-inactive)', borderColor:'var(--color-inactive)', background:'rgba(220,38,38,.04)' }}>
            {commitError}
          </p>
        )}

        {/* ---- 0 · drop ---- */}
        {stage===0 && (
          <>
            <label
              onDragOver={e => { e.preventDefault(); if(!imp.over) setImp(s => ({ ...s, over:true })); }}
              onDragLeave={() => setImp(s => ({ ...s, over:false }))}
              onDrop={e => { e.preventDefault(); setImp(s => ({ ...s, over:false })); loadFile(e.dataTransfer.files && e.dataTransfer.files[0]); }}
              className={
                'relative flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-5 py-11 text-center transition-colors '+
                (imp.over ? 'border-brand bg-brand-tint' : 'border-brand-edge')
              }
            >
              <Download width="40" height="40" strokeWidth="1.6" className="text-brand" />
              <span className="text-[15px] font-semibold text-ink">Drop a CSV here</span>
              <span className="text-[12px] text-ink-52">or click to choose a file</span>
              <input
                type="file" accept=".csv,text/csv"
                aria-label="Choose a CSV file to import"
                className="absolute inset-0 cursor-pointer opacity-0"
                onChange={e => { loadFile(e.target.files && e.target.files[0]); e.target.value=''; }}
              />
            </label>

            <div className="mx-auto mt-5 flex max-w-[520px] flex-col gap-2.5">
              <button type="button" className="btn" onClick={loadSample}>Load sample data</button>
              <button type="button" className="btn btn-ghost text-[13px]" onClick={downloadTemplate}>
                Download blank template (.csv)
              </button>
            </div>

            <p className="mx-auto mt-5 max-w-[520px] text-center text-[12px] leading-relaxed text-ink-52">
              Any status column in your file is ignored — KMPDC and insurance status are always
              recomputed from the dates, so a stale spreadsheet can’t mark a lapsed doctor as active.
            </p>
          </>
        )}

        {/* ---- 1 · map ---- */}
        {stage===1 && (
          <>
            <p className="text-[13px] text-ink-72">
              <span className="font-mono text-ink">{imp.fileName}</span> · {imp.rows.length} rows
            </p>
            <p className="mb-4 mt-1 text-[12px] text-ink-52">Matched columns are ticked. Set any that are missing.</p>

            {TARGETS.map(t => {
              const id = t[0], label = t[1], src = imp.map[id]||'';
              const selId = 'map-'+id;
              return (
                <div key={id} className="flex items-center gap-2.5 border-b border-line-soft py-2.5">
                  <label htmlFor={selId} className="flex min-w-0 flex-1 items-center gap-2 text-[13px] text-ink">
                    {IMP_REQ.indexOf(id)>=0 && <span aria-hidden="true" className="h-[5px] w-[5px] shrink-0 rounded-full bg-brand" />}
                    <span className="truncate">{label}</span>
                  </label>
                  <select
                    id={selId}
                    value={src}
                    onChange={e => setImp(s => ({ ...s, map:{ ...s.map, [id]: e.target.value } }))}
                    className="min-w-0 flex-1 rounded-lg border border-line bg-raised px-2.5 py-2 text-[12px] text-ink"
                    style={{ colorScheme:'light' }}
                  >
                    <option value="">— not mapped —</option>
                    {imp.headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                  <span className="w-4 shrink-0">
                    {src && <Check width="16" height="16" strokeWidth="2.4" style={{ color:'var(--color-active)' }} />}
                  </span>
                </div>
              );
            })}

            <div className="mt-6 flex items-center gap-2.5 border-t border-line pt-5">
              <button type="button" className="btn btn-ghost shrink-0" onClick={() => setImp(s => ({ ...s, stage:0 }))}>Back</button>
              <div className="flex-1">
                {!!missing.length && (
                  <p className="mb-1.5 text-[11px] leading-snug" style={{ color:'var(--color-expiring)' }}>
                    Map these first: {missing.join(', ')}
                  </p>
                )}
                <button
                  type="button" className="btn w-full" disabled={!!missing.length}
                  onClick={() => setImp(s => ({ ...s, stage:2 }))}
                >
                  Continue
                </button>
              </div>
            </div>
          </>
        )}

        {/* ---- 2 · validate ---- */}
        {stage===2 && (
          <>
            <div className="mb-4 flex gap-2.5">
              <div className="card flex-1">
                <b className="block font-display text-[26px] font-bold leading-none" style={{ color:'var(--color-active)' }}>
                  {results.filter(r => r.ok).length}
                </b>
                <span className="mt-1.5 block text-[12px] text-ink-52">ready</span>
              </div>
              <div className="card flex-1">
                <b className="block font-display text-[26px] font-bold leading-none" style={{ color:'var(--color-expiring)' }}>
                  {bad.length}
                </b>
                <span className="mt-1.5 block text-[12px] text-ink-52">need attention</span>
              </div>
              {!!dups.length && (
                <div className="card flex-1">
                  <b className="block font-display text-[26px] font-bold leading-none text-brand">{dups.length}</b>
                  <span className="mt-1.5 block text-[12px] text-ink-52">duplicates</span>
                </div>
              )}
            </div>

            {!!dups.length && (
              <section className="mb-5">
                <h2 className="kicker mb-2">Already on the registry</h2>
                {dups.map(r => {
                  const choice = imp.dups[r.i] || 'skip';
                  return (
                    <div key={r.i} className="card mb-2 flex flex-wrap items-center gap-3">
                      <div className="min-w-40 flex-1">
                        <div className="text-[13px] font-semibold">{r.rec.fullNames}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-ink-52">{r.rec.regNo}</div>
                      </div>
                      <div className="flex gap-2" role="group" aria-label={'What to do with '+r.rec.fullNames}>
                        {['skip','overwrite'].map(c => (
                          <button
                            key={c} type="button" className="chip-filter chip-sub"
                            aria-pressed={choice===c}
                            onClick={() => setImp(s => ({ ...s, dups:{ ...s.dups, [r.i]:c } }))}
                          >
                            {c==='skip' ? 'Skip' : 'Overwrite'}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </section>
            )}

            {bad.length ? (
              <>
                <div className="mb-2.5 flex items-center justify-between">
                  <span className="text-[12px] text-ink-52">Fix the tinted cells, or they’ll be skipped</span>
                  <button
                    type="button"
                    onClick={() => downloadErrors(results)}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-brand hover:underline"
                  >
                    Download error rows
                  </button>
                </div>
                {bad.map(r => (
                  <div key={r.i} className="card mb-2.5">
                    <div className="mb-2.5 flex items-baseline justify-between gap-2.5">
                      <span className="text-[13px] font-semibold text-ink">{r.rec.fullNames || ('Row '+(r.i+1))}</span>
                      <span className="shrink-0 font-mono text-[11px] text-ink-52">{r.rec.regNo || '—'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 md:grid-cols-3">
                      {IMP_REQ.map(id => {
                        const t = TARGETS.find(x => x[0]===id);
                        const val = Array.isArray(r.rec[id]) ? r.rec[id].join('; ') : (r.rec[id]||'');
                        const cellId = 'cell-'+r.i+'-'+id;
                        return (
                          <div key={id}>
                            <label htmlFor={cellId} className="mb-1 block text-[10px] text-ink-52">{t[1]}</label>
                            <input
                              id={cellId}
                              value={val}
                              aria-invalid={!!r.errs[id]}
                              onChange={e => editCell(r.i, id, e.target.value)}
                              className="w-full rounded-lg border bg-surface px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-brand"
                              style={r.errs[id]
                                ? { borderColor:'var(--color-inactive)', background:'rgba(220,38,38,.07)' }
                                : { borderColor:'var(--color-line)' }}
                            />
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed" style={{ color:'var(--color-inactive)' }}>
                      {Object.keys(r.errs).map(k => r.errs[k]).join('  ')}
                    </p>
                  </div>
                ))}
              </>
            ) : (
              <div className="card flex items-center gap-2.5 text-[13px] text-ink-72">
                <span className="dot" style={{ background:'var(--color-active)' }} />
                Every remaining row is valid and ready to import.
              </div>
            )}

            <div className="mt-6 flex items-center gap-2.5 border-t border-line pt-5">
              <button type="button" className="btn btn-ghost shrink-0" onClick={() => setImp(s => ({ ...s, stage:1 }))}>Back</button>
              <button type="button" className="btn flex-1" disabled={!ready.length || committing} onClick={commit}>
                <Upload width="15" height="15" />
                {committing ? 'Importing…' : 'Import '+ready.length+(ready.length===1 ? ' doctor' : ' doctors')}
              </button>
            </div>
          </>
        )}

        {/* ---- 3 · commit ---- */}
        {stage===3 && summary && (
          <div className="mx-auto flex max-w-[520px] flex-col items-center gap-2 pt-4 text-center">
            <Mascot name="done" size={120} />
            <h2 className="mt-1.5 text-[24px]">Import complete</h2>
            <div className="mt-3.5 flex w-full gap-2.5">
              <div className="card flex-1">
                <b className="block font-display text-[24px] font-bold leading-none" style={{ color:'var(--color-active)' }}>{summary.imported}</b>
                <span className="mt-1.5 block text-[12px] text-ink-52">imported</span>
              </div>
              <div className="card flex-1">
                <b className="block font-display text-[24px] font-bold leading-none text-brand">{summary.overwritten}</b>
                <span className="mt-1.5 block text-[12px] text-ink-52">overwritten</span>
              </div>
              <div className="card flex-1">
                <b className="block font-display text-[24px] font-bold leading-none text-ink-52">{summary.skipped}</b>
                <span className="mt-1.5 block text-[12px] text-ink-52">skipped</span>
              </div>
            </div>
            <button type="button" className="btn mt-5 w-full" onClick={onViewImported}>
              View imported doctors
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
