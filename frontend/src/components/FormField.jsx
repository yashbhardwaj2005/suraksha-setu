function FormField({ id, label, error, hint, children, ...props }) {
  return <div className="form-field">
    <label htmlFor={id}>{label}</label>
    <div className="field-input-wrap">
      <input id={id} name={id} aria-invalid={Boolean(error)} aria-describedby={error ? id + '-error' : hint ? id + '-hint' : undefined} {...props} />
      {children}
    </div>
    {error && <p className="field-error" id={id + '-error'}>{error}</p>}
    {!error && hint && <p className="field-hint" id={id + '-hint'}>{hint}</p>}
  </div>;
}

export default FormField;
