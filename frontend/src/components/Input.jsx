import { useId } from 'react';

export default function Input({ label, error, hint, ...props }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      <input
        id={id}
        className="field"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...props}
      />
      {error
        ? <p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] text-stop">{error}</p>
        : hint && <p className="mt-1.5 text-[0.8125rem] text-mute">{hint}</p>}
    </div>
  );
}
