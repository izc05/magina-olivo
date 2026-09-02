import {
  ChevronRight,
  CircleDollarSign,
  Fuel,
  Gauge,
  ReceiptText,
  Sprout,
  Tractor,
  Wrench,
} from 'lucide-react';

type FarmManagementPanelProps = {
  mode: 'costs' | 'machinery';
};

const costRows = [
  { label: 'Fitosanitarios', value: '1.240 €', percent: 27 },
  { label: 'Abonado', value: '1.080 €', percent: 24 },
  { label: 'Riego y energía', value: '860 €', percent: 19 },
  { label: 'Maquinaria', value: '730 €', percent: 16 },
  { label: 'Otros', value: '620 €', percent: 14 },
];

const machines = [
  { title: 'Tractor principal', detail: 'John Deere · 78 CV', meta: '412 h', status: 'Operativo', icon: Tractor },
  { title: 'Atomizador', detail: '600 L · Tratamientos', meta: 'Revisión 18 sep', status: 'Revisar', icon: Gauge },
  { title: 'Vibrador', detail: 'Recolección · Acople tractor', meta: 'Listo campaña', status: 'Operativo', icon: Wrench },
];

export function FarmManagementPanel({ mode }: FarmManagementPanelProps) {
  if (mode === 'costs') {
    return (
      <section className="section-block section-block--last farm-management-panel">
        <div className="section-heading">
          <div><span className="eyebrow">Economía de la finca</span><h1>Costes y rentabilidad</h1></div>
          <button type="button" className="text-action">Campaña</button>
        </div>

        <div className="profit-summary-grid">
          <article><span>Coste acumulado</span><strong>4.530 €</strong><small>193 €/ha</small></article>
          <article className="profit-summary-card--accent"><span>Ingreso estimado</span><strong>8.960 €</strong><small>Campaña actual</small></article>
          <article><span>Margen estimado</span><strong>4.430 €</strong><small>Antes de impuestos</small></article>
        </div>

        <article className="profit-card">
          <div className="profit-card__head">
            <div><span className="eyebrow">Distribución</span><strong>¿En qué estás gastando?</strong></div>
            <CircleDollarSign size={23} />
          </div>
          <div className="cost-breakdown">
            {costRows.map((row) => (
              <div className="cost-row" key={row.label}>
                <div className="cost-row__head"><span>{row.label}</span><strong>{row.value}</strong></div>
                <div className="cost-row__track"><span style={{ width: `${row.percent}%` }} /></div>
              </div>
            ))}
          </div>
        </article>

        <button type="button" className="expense-entry-card">
          <div className="expense-entry-card__icon"><ReceiptText size={22} /></div>
          <div><strong>Registrar gasto</strong><span>Factura, combustible, tratamiento o labor</span></div>
          <ChevronRight size={18} />
        </button>

        <article className="profit-insight-card">
          <Sprout size={22} />
          <div><span className="eyebrow">Lectura rápida</span><strong>El riego representa el 19% del coste registrado</strong><p>Más adelante esta sección podrá comparar parcelas, campañas y coste por kilo producido.</p></div>
        </article>
      </section>
    );
  }

  return (
    <section className="section-block section-block--last farm-management-panel">
      <div className="section-heading">
        <div><span className="eyebrow">Activos de campo</span><h1>Maquinaria</h1></div>
        <button type="button" className="text-action">+ Añadir</button>
      </div>

      <article className="machine-overview-card">
        <div><span>Equipos registrados</span><strong>3</strong><small>2 operativos · 1 revisión próxima</small></div>
        <Tractor size={34} />
      </article>

      <div className="machine-list">
        {machines.map(({ title, detail, meta, status, icon: Icon }) => (
          <button type="button" className="machine-card" key={title}>
            <div className="machine-card__icon"><Icon size={22} /></div>
            <div className="machine-card__copy"><strong>{title}</strong><span>{detail}</span><small>{meta}</small></div>
            <div className={`machine-status ${status === 'Operativo' ? 'machine-status--good' : 'machine-status--review'}`}>{status}</div>
            <ChevronRight size={18} />
          </button>
        ))}
      </div>

      <div className="machine-metrics-grid">
        <article><Fuel size={19} /><span>Combustible</span><strong>286 L</strong><small>Esta campaña</small></article>
        <article><Wrench size={19} /><span>Mantenimiento</span><strong>310 €</strong><small>Acumulado</small></article>
      </div>

      <article className="maintenance-reminder-card">
        <Wrench size={22} />
        <div><span className="eyebrow">Próximo mantenimiento</span><strong>Atomizador · revisión preventiva</strong><p>18 de septiembre · comprobar boquillas, presión y estado general antes del próximo tratamiento.</p></div>
      </article>
    </section>
  );
}
