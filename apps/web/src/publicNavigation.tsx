export function appHref(path = '/') {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}` || '/';
}

export function brandLogoSrc() {
  return `${import.meta.env.BASE_URL}brand/magina-olivo-mark.svg`;
}

type PublicHeaderProps = {
  backHref?: string;
  backLabel?: string;
};

export function PublicHeader({ backHref = '/', backLabel = 'Volver a la aplicación' }: PublicHeaderProps) {
  return (
    <header className="directory-header">
      <a className="directory-brand" href={appHref('/')} aria-label="Volver a Mágina Olivo">
        <img src={brandLogoSrc()} alt="" />
        <span><strong>Mágina Olivo</strong><small>Sierra Mágina · Jaén</small></span>
      </a>
      <a className="directory-back" href={appHref(backHref)}>{backLabel}</a>
    </header>
  );
}
