import { useMemo, useState, type FormEvent } from 'react';
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
import type { ExpenseCategory, ExpenseRecord } from './fieldStore';

type FarmManagementPanelProps = {
  mode: 'costs' | 'machinery';
  expenses: ExpenseRecord[];
  onAddExpense: (expense: Omit<ExpenseRecord, 'id'>) => void;
};

const expenseCategories: ExpenseCategory[] = ['Fitosanitarios', 'Abonado', 'Riego y energía', 'Maquinaria', 'Otros'];

const machines = [
  { title: 'Tractor principal', detail: 'John Deere · 78 CV', meta: '412 h', status: 'Operativo', icon: Tractor },
  { title: 'Atomizador', detail: '600 L · Tratamientos', meta: 'Revisión 18 sep', status: 'Revisar', icon: Gauge },
  { title: 'Vibrador', detail: 'Recolección · Acople tractor', meta: 'Listo campaña', status: 'Operativo', icon: Wrench },
];

function eur(value: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

export function FarmManagementPanel({ mode, expenses, onAddExpense }: FarmManagementPanelProps) {
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory>('Fitosanitarios');
  const [concept, setConcept] = useState('');
  const [amount, setAmount] = useState('');

  const totalCost = useMemo(() => expenses.reduce((sum, expense) => sum + expense.amount, 0), [expenses]);
  const estimatedIncome = 8960;
  const margin = estimatedIncome - totalCost;
  const costRows = useMemo(() => expenseCategories.map((label) => {
    const value = expenses.filter((expense) => expense.category === label).reduce((sum, expense) => sum + expense.amount, 0);
    return { label, value, percent: totalCost > 0 ? Math.round((value / totalCost) * 100) : 0 };
  }), [expenses, totalCost]);

  const submitExpense = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericAmount = Number(amount.replace(',', '.'));
    if (!concept.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) return;
    onAddExpense({
      date: new Date().toISOString().slice(0, 10),
      category,
      concept: concept.trim(),
      amount: numericAmount,
    });
    setConcept('');
    setAmount('');
    setExpenseOpen(false);
  };

  if (mode === 'costs') {
    return (
      <section className="section-block section-block--last farm-management-panel">
        <div className="section-heading">
          <div><span className="eyebrow">Economía de la finca</span><h1>Costes y rentabilidad</h1></div>
          <button type="button" className="text-action">Campaña</button>
        </div>

        <div className="profit-summary-grid">
          <article><span>Coste acumulado</span><strong>{eur(totalCost)}</strong><small>Datos guardados</small></article>
          <article className="profit-summary-card--accent"><span>Ingreso estimado</span><strong>{eur(estimatedIncome)}</strong><small>Campaña actual</small></article>
          <article><span>Margen estimado</span><strong>{eur(margin)}</strong><small>Antes de impuestos</small></article>
        </div>

        <article className="profit-card">
          <div className="profit-card__head">
            <div><span className="eyebrow">Distribución</span><strong>¿En qué estás gastando?</strong></div>
            <CircleDollarSign size={23} />
          </div>
          <div className="cost-breakdown">
            {costRows.map((row) => (
              <div className="cost-row" key={row.label}>
                <div className="cost-row__head"><span>{row.label}</span><strong>{eur(row.value)}</strong></div>
                <div className="cost-row__track"><span style={{ width: `${row.percent}%` }} /></div>
              </div>
            ))}
          </div>
        </article>

        <button type="button" className="expense-entry-card" onClick={() => setExpenseOpen((open) => !open)}>
          <div className="expense-entry-card__icon"><ReceiptText size={22} /></div>
          <div><strong>Registrar gasto</strong><span>Factura, combustible, tratamiento o labor</span></div>
          <ChevronRight size={18} />
        </button>

        {expenseOpen && (
          <form className="field-entry-form" onSubmit={submitExpense}>
            <label>Categoría<select value={category} onChange={(event) => setCategory(event.target.value as ExpenseCategory)}>{expenseCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>Concepto<input value={concept} onChange={(event) => setConcept(event.target.value)} placeholder="Ej. gasóleo tractor" required /></label>
            <label>Importe (€)<input inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="86,50" required /></label>
            <div className="field-entry-form__actions"><button type="button" className="secondary-button" onClick={() => setExpenseOpen(false)}>Cancelar</button><button type="submit" className="primary-button">Guardar gasto</button></div>
          </form>
        )}

        <article className="profit-insight-card">
          <Sprout size={22} />
          <div><span className="eyebrow">Lectura rápida</span><strong>{costRows.sort((a, b) => b.value - a.value)[0]?.label ?? 'Sin gastos'} es ahora la partida principal</strong><p>Los gastos que registres aquí quedan guardados en este dispositivo y actualizan automáticamente el resumen.</p></div>
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
