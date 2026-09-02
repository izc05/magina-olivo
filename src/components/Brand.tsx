export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="brand" aria-label="Mágina Olivo">
      <img className="brand__mark" src="/brand/magina-olivo-mark.svg" alt="" />
      {!compact && (
        <div className="brand__copy">
          <strong>Mágina Olivo</strong>
          <span>La herramienta digital del olivar</span>
        </div>
      )}
    </div>
  );
}
