export default function FieldError({ error, id }) {
  if (!error) return null;

  return (
    <p
      id={id}
      className="mt-2 text-sm font-medium text-[#bc2525]"
      role="alert"
      aria-live="polite"
    >
      {error}
    </p>
  );
}
