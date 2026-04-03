import FieldError from "./FieldError";

export default function TextField({
  label,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  icon: Icon,
  error,
  helperText,
  required = false,
  autoComplete,
  inputMode,
  as = "input",
  rows = 4,
  className = "",
  containerClassName = "",
  ...rest
}) {
  const fieldId = `field-${name}`;
  const errorId = `${fieldId}-error`;
  const Component = as;

  return (
    <div className={`space-y-2 ${containerClassName}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-[#554a3f]"
        >
          {label}
          {required && <span className="ml-1 text-[#bc2525]">*</span>}
        </label>
      )}

      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#746758]" />
        )}
        <Component
          id={fieldId}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          placeholder={placeholder}
          type={as === "input" ? type : undefined}
          autoComplete={autoComplete}
          inputMode={inputMode}
          rows={as === "textarea" ? rows : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          data-field={name}
          className={`input-premium ${error ? "input-error" : ""} ${
            Icon ? "pl-11" : ""
          } ${as === "textarea" ? "min-h-[112px] resize-none" : ""} ${className}`}
          {...rest}
        />
      </div>

      {!error && helperText && <p className="text-sm text-[#4f4438]">{helperText}</p>}
      <FieldError id={error ? errorId : undefined} error={error} />
    </div>
  );
}
