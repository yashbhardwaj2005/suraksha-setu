function Badge({ children, tone = 'neutral' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function Card({ children, className = '', ...props }) {
  return <section className={`card ${className}`} {...props}>{children}</section>;
}

function Button({ children, variant = 'primary', className = '', ...props }) {
  return <button type="button" className={`button button-${variant} ${className}`} {...props}>{children}</button>;
}

function PageIntro({ eyebrow, title, children }) {
  return <div className="page-intro"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1><p className="intro-copy">{children}</p></div>;
}

export { Badge, Card, Button, PageIntro };
