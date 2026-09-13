import { useId } from 'react';
import { fsize } from '../lib/dates.js';
import { Check, FileIcon, Plus } from './icons.jsx';

export default function Field({ f, form, fileUrls, on }){
  const id = useId();
  const ctlId  = 'f-'+f.id+'-'+id;
  const errId  = ctlId+'-err';
  const hintId = ctlId+'-hint';
  const describedBy = [f.error ? errId : null, (f.hint||f.help) && !f.error ? hintId : null]
    .filter(Boolean).join(' ') || undefined;

  const errCls = f.error ? ' inp-err' : '';
  let control;

  switch(f.type){
    case 'seg':
      control = (
        <div className="flex flex-wrap gap-1.5" role="group" aria-labelledby={ctlId+'-label'}>
          {f.segs.map(o => (
            <button
              key={o.value}
              type="button"
              aria-pressed={o.on}
              onClick={() => on.seg(f.id, o.value)}
              className={
                'min-w-24 flex-1 rounded-[10px] border px-2 py-2.5 text-[13px] font-semibold transition-colors '+
                (o.on ? 'border-brand bg-brand text-white' : 'border-line bg-raised text-ink-72 hover:border-brand-edge')
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      );
      break;

    case 'check':
      control = (
        <button
          type="button"
          role="checkbox"
          aria-checked={!!f.on}
          aria-describedby={describedBy}
          onClick={() => on.check(f.id)}
          className={
            'flex w-full items-start gap-3 rounded-xl border bg-raised px-3.5 py-3.5 text-left '+
            (f.error ? 'border-inactive' : 'border-line')
          }
          style={f.error ? { borderColor:'var(--color-inactive)' } : undefined}
        >
          <span
            aria-hidden="true"
            className={
              'mt-px grid h-[19px] w-[19px] shrink-0 place-items-center rounded-md border-[1.5px] '+
              (f.on ? 'border-brand bg-brand text-white' : 'border-line')
            }
          >
            {f.on && <Check width="12" height="12" strokeWidth="3.2" />}
          </span>
          <span className="flex-1 text-[13px] leading-relaxed text-ink-72">{f.checkLabel}</span>
        </button>
      );
      break;

    case 'tel':
      control = (
        <div
          className={'flex items-center overflow-hidden rounded-[10px] border bg-raised focus-within:border-brand focus-within:shadow-[0_0_0_3px_var(--color-brand-tint)] '+(f.error ? 'border-inactive' : 'border-line')}
          style={f.error ? { borderColor:'var(--color-inactive)' } : undefined}
        >
          <span aria-hidden="true" className="border-r border-line px-3.5 py-2.5 font-mono text-[15px] text-ink-52">+254</span>
          <input
            id={ctlId}
            type="tel"
            className="flex-1 border-none bg-transparent px-3.5 py-2.5 font-mono text-[15px] text-ink outline-none"
            value={f.value}
            placeholder="7XX XXX XXX"
            autoComplete="off"
            aria-invalid={!!f.error}
            aria-describedby={describedBy}
            onChange={e => on.input(f.id, e.target.value)}
            onBlur={() => on.blur(f.id)}
          />
        </div>
      );
      break;

    case 'date':
      control = (
        <input
          id={ctlId} type="date" className={'inp'+errCls}
          value={f.value} max={f.max} min={f.min}
          aria-invalid={!!f.error} aria-describedby={describedBy}
          onChange={e => on.change(f.id, e.target.value)}
        />
      );
      break;

    case 'area':
      control = (
        <textarea
          id={ctlId} rows={2} className={'inp'+errCls}
          value={f.value} placeholder={f.placeholder}
          aria-invalid={!!f.error} aria-describedby={describedBy}
          onChange={e => on.input(f.id, e.target.value)}
          onBlur={() => on.blur(f.id)}
        />
      );
      break;

    case 'select':
      control = (
        <select
          id={ctlId} className={'inp'+errCls} value={f.value} disabled={f.disabled}
          aria-invalid={!!f.error} aria-describedby={describedBy}
          onChange={e => on.change(f.id, e.target.value)}
        >
          <option value="">{f.placeholder}</option>
          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      break;

    case 'combo':
      control = (
        <>
          <input
            id={ctlId} className={'inp'+errCls} list={ctlId+'-dl'}
            value={f.value} placeholder={f.placeholder} disabled={f.disabled} autoComplete="off"
            aria-invalid={!!f.error} aria-describedby={describedBy}
            onChange={e => on.input(f.id, e.target.value)}
            onBlur={() => on.blur(f.id)}
          />
          <datalist id={ctlId+'-dl'}>
            {f.options.map(o => <option key={o} value={o} />)}
          </datalist>
        </>
      );
      break;

    case 'chips':
      control = (
        <>
          <div className="mb-2.5 flex flex-wrap gap-1.5">
            {f.chips.map(c => (
              <button
                key={c.value}
                type="button"
                aria-pressed={c.on}
                onClick={() => on.chip(f.id, c.value)}
                className={
                  'rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors '+
                  (c.on ? 'border-brand bg-brand-tint text-ink' : 'border-line bg-raised text-ink-72 hover:border-brand-edge')
                }
              >
                {c.value}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input
              className="flex-1 rounded-[10px] border border-line bg-raised px-3 py-2 text-[13px] text-ink outline-none focus:border-brand"
              value={f.draft}
              placeholder="Add another…"
              autoComplete="off"
              aria-label="Add another qualification"
              onChange={e => on.qualDraft(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter'){ e.preventDefault(); on.addQual(); } }}
            />
            <button
              type="button"
              onClick={on.addQual}
              className="rounded-[10px] border border-brand bg-brand-tint px-3.5 py-2 text-[13px] font-semibold text-ink"
            >
              Add
            </button>
          </div>
        </>
      );
      break;

    case 'file':
      control = (
        <div
          className={'rounded-[14px] border border-dashed bg-raised p-3.5 '+(f.error ? '' : 'border-line')}
          style={f.error ? { borderColor:'var(--color-inactive)' } : undefined}
        >
          {f.files.map((af,i) => {
            const url = fileUrls[af.name];
            return (
              <div key={af.name+i} className="mb-2 flex items-center gap-2.5 rounded-[10px] border border-line bg-surface px-2.5 py-2.5">
                <FileIcon width="16" height="16" className="shrink-0 text-brand" />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13px] font-medium text-ink">{af.name}</b>
                  <span className="font-mono text-[11px] text-ink-52">{fsize(af.size)}</span>
                </span>
                {url && (
                  <a className="text-[11px] font-semibold text-brand hover:underline" href={url} target="_blank" rel="noopener noreferrer">
                    View
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => on.removeFile(f.id, i)}
                  className="px-0.5 py-1 text-[11px] font-semibold text-ink-52 hover:text-brand"
                >
                  Remove<span className="sr-only">{' '+af.name}</span>
                </button>
              </div>
            );
          })}

          <label className="relative flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-[10px] border border-line bg-surface px-3 py-2.5 text-[13px] font-semibold text-ink-72 hover:border-brand-edge">
            <Plus width="15" height="15" />
            {f.files.length ? 'Add another file' : 'Choose a file'}
            <input
              type="file"
              className="absolute inset-0 cursor-pointer opacity-0"
              accept={f.accept}
              multiple={f.multiple}
              aria-label={f.label}
              onChange={e => { on.addFiles(f.id, e.target.files); e.target.value = ''; }}
            />
          </label>
          <p className="mt-2.5 text-[11px] leading-relaxed text-ink-52">{f.note}</p>
        </div>
      );
      break;

    default:
      control = (
        <input
          id={ctlId}
          className={'inp'+errCls+(f.mono ? ' inp-mono' : '')}
          value={f.value}
          placeholder={f.placeholder}
          maxLength={f.maxlength}
          inputMode={f.numeric ? 'numeric' : undefined}
          autoComplete="off"
          aria-invalid={!!f.error}
          aria-describedby={describedBy}
          onChange={e => on.input(f.id, e.target.value)}
          onBlur={() => on.blur(f.id)}
        />
      );
  }

  const labelled = ['seg','check','chips','file'].indexOf(f.type) < 0;

  return (
    <div className={'anim-rise'+(f.wide ? ' md:col-span-full' : '')} style={{ animationDelay: f.delay }}>
      <div className="mb-2 flex items-center gap-2">
        {f.required && <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />}
        {labelled
          ? <label htmlFor={ctlId} className="whitespace-nowrap text-[13px] font-medium text-ink">{f.label}</label>
          : <span id={ctlId+'-label'} className="whitespace-nowrap text-[13px] font-medium text-ink">{f.label}</span>}
        {f.required && <span className="sr-only">(required)</span>}
        {f.optional && <span className="text-[11px] text-ink-52">Optional</span>}
        {f.derived && <span className="ml-auto font-mono text-[12px] font-semibold text-accent-ink">{f.derived}</span>}
      </div>

      {control}

      {(f.hint || f.help) && !f.error && (
        <p id={hintId} className={'mt-1.5 text-[11px] text-ink-52'+(f.hint ? ' font-mono' : ' leading-relaxed')}>
          {f.hint || f.help}
        </p>
      )}
      {f.error && (
        <p id={errId} role="alert" className="mt-1.5 text-[12px] leading-snug" style={{ color:'var(--color-inactive)' }}>
          {f.error}
        </p>
      )}
    </div>
  );
}
