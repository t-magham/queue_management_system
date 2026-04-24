
export default function Input({ label, type, placeholder, value, onChange, error }) {
  return (
    <div className="flex flex-col space-y-1.5">
      <label className="text-sm font-medium text-neutral-700">{label}</label>
      <input
        type={type}
        className={`w-full px-3 py-2 border rounded-md text-sm outline-none transition-all
          ${error 
            ? 'border-red-500 focus:ring-1 focus:ring-red-500' 
            : 'border-neutral-200 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900'
          } placeholder-neutral-400`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  );
}