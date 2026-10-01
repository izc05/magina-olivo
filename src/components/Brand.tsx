export function Brand({ compact = false }: { compact?: boolean }) {
  const logoSrc = `${import.meta.env.BASE_URL}brand/magina-olivo-mark.svg`;

  return (
    <div className="brand" aria-label="Mágina Olivo">
      <img className="brand__mark" src={logoSrc} alt="" />
      {!compact && (
        <div className="brand__copy">
          <strong>Mágina Olivo</strong>
          <span>La herramienta digital del olivar</span>
        </div>
      )}
    </div>
  );
}
