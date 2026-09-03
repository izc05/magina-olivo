import { useEffect, useMemo, useState } from 'react';

type Holding = {
  id: string;
  name: string;
  municipality: string | null;
  province: string | null;
  role: 'owner' | 'admin' | 'collaborator' | 'viewer';
};

type Task = {
  id: string;
  holdingId: string;
  campaignId: string | null;
  campaignName: string | null;
  farmId: string | null;
  farmName: string | null;
  plotId: string | null;
  plotName: string | null;
  title: string;
  notes: string | null;
  dueDate: string;
  priority: 'low' | 'normal' | 'high';
  reminderDaysBefore: number | null;
  status: 'pending' | 'completed' | 'cancelled';
  completedAt: string | null;
  version: number;
  overdue: boolean;
};

type TaskFilter = 'pending' | 'completed' | 'all';

async function jsonRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('accept', 'application/json');
  if (init.body) headers.set('content-type', 'application/json');
  const response = await fetch(url, { ...init, headers, credentials: 'include' });
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { error?: { message?: string } };
      message = body.error?.message ?? message;
    } catch {
      // Preserve generic HTTP error for non-JSON responses.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

function localIsoDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function taskLocation(task: Task): string | null {
  return task.plotName ?? task.farmName ?? task.campaignName ?? null;
}

function priorityLabel(priority: Task['priority']): string {
  if (priority === 'high') return 'Alta';
  if (priority === 'low') return 'Baja';
  return 'Normal';
}

function buildMonthDays(month: Date): Array<{ iso: string; day: number; weekday: number }> {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const total = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: total }, (_, index) => {
    const date = new Date(year, monthIndex, index + 1);
    return { iso: localIsoDate(date), day: index + 1, weekday: (date.getDay() + 6) % 7 };
  });
}

export function CalendarPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [holdingId, setHoldingId] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(() => localIsoDate());
  const [filter, setFilter] = useState<TaskFilter>('pending');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(() => localIsoDate());
  const [priority, setPriority] = useState<Task['priority']>('normal');
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number | null>(1);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void jsonRequest<{ items: Holding[] }>('/api/v1/holdings')
      .then((result) => {
        if (cancelled) return;
        setHoldings(result.items);
        setHoldingId((current) => current || result.items[0]?.id || '');
      })
      .catch((reason) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : 'No se han podido cargar tus explotaciones.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  async function loadTasks(activeHoldingId = holdingId) {
    if (!activeHoldingId) {
      setTasks([]);
      return;
    }
    setError(null);
    const result = await jsonRequest<{ items: Task[] }>(`/api/v1/holdings/${activeHoldingId}/tasks?status=all`);
    setTasks(result.items);
  }

  useEffect(() => {
    if (!holdingId) return;
    void loadTasks(holdingId).catch((reason) => {
      setError(reason instanceof Error ? reason.message : 'No se han podido cargar las tareas.');
    });
  }, [holdingId]);

  const activeHolding = holdings.find((item) => item.id === holdingId) ?? null;
  const canWrite = activeHolding ? activeHolding.role !== 'viewer' : false;
  const days = useMemo(() => buildMonthDays(month), [month]);
  const currentMonthKey = monthKey(month);
  const monthTasks = useMemo(
    () => tasks.filter((task) => task.dueDate.startsWith(currentMonthKey)),
    [tasks, currentMonthKey],
  );
  const overdueTasks = useMemo(
    () => tasks.filter((task) => task.status === 'pending' && task.overdue),
    [tasks],
  );
  const selectedTasks = useMemo(() => {
    const source = selectedDate ? tasks.filter((task) => task.dueDate === selectedDate) : monthTasks;
    return source.filter((task) => filter === 'all' || task.status === filter);
  }, [tasks, monthTasks, selectedDate, filter]);

  const taskCountByDate = useMemo(() => {
    const counts = new Map<string, { pending: number; completed: number; overdue: number }>();
    for (const task of monthTasks) {
      const item = counts.get(task.dueDate) ?? { pending: 0, completed: 0, overdue: 0 };
      if (task.status === 'completed') item.completed += 1;
      if (task.status === 'pending') item.pending += 1;
      if (task.overdue) item.overdue += 1;
      counts.set(task.dueDate, item);
    }
    return counts;
  }, [monthTasks]);

  async function createTask() {
    if (!holdingId || !title.trim() || !canWrite) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const created = await jsonRequest<Task>(`/api/v1/holdings/${holdingId}/tasks`, {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          notes: notes.trim() || undefined,
          dueDate,
          priority,
          reminderDaysBefore,
        }),
      });
      setTasks((current) => [...current, created].sort((a, b) => a.dueDate.localeCompare(b.dueDate)));
      setTitle('');
      setNotes('');
      setSelectedDate(created.dueDate);
      setMonth(new Date(`${created.dueDate}T12:00:00`));
      setNotice('Tarea añadida al calendario.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido crear la tarea.');
    } finally {
      setBusy(false);
    }
  }

  async function completeTask(task: Task) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const completed = await jsonRequest<Task>(`/api/v1/tasks/${task.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({ version: task.version }),
      });
      setTasks((current) => current.map((item) => item.id === task.id ? completed : item));
      setNotice('Tarea completada.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se ha podido completar la tarea.');
      await loadTasks().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  function moveMonth(delta: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(next);
    setSelectedDate('');
  }

  if (loading) return <div className="loading-screen" role="status">Cargando calendario…</div>;

  return (
    <main className="calendar-shell">
      <header className="account-topbar calendar-topbar">
        <a className="text-button" href="/">← Volver</a>
        <div className="brand-lockup">
          <span className="brand-title">Mágina Olivo</span>
          <span className="brand-kicker">Calendario</span>
        </div>
        <a className="text-button" href="/cuenta">Mi cuenta</a>
      </header>

      <div className="calendar-page">
        <section className="calendar-heading">
          <div>
            <p className="eyebrow page-eyebrow">Organización del campo</p>
            <h1 className="section-title">Tareas y calendario</h1>
            <p className="section-copy">Planifica trabajos, fechas y recordatorios sin convertir el cuaderno de campo en una agenda genérica.</p>
          </div>
          <label className="field calendar-holding-select">
            <span>Explotación</span>
            <select value={holdingId} onChange={(event) => setHoldingId(event.target.value)}>
              {holdings.map((holding) => <option key={holding.id} value={holding.id}>{holding.name}</option>)}
            </select>
          </label>
        </section>

        {holdings.length === 0 ? (
          <section className="section card card-body">
            <h2 className="section-title account-section-title">Primero crea tu explotación</h2>
            <p className="section-copy">El calendario necesita una explotación para mantener cada tarea dentro de su ámbito privado.</p>
            <a className="primary-button calendar-inline-link" href="/onboarding">Configurar Mi Campo</a>
          </section>
        ) : null}

        {error ? <div className="alert section" role="alert">{error}</div> : null}
        {notice ? <div className="alert success section" role="status">{notice}</div> : null}

        {holdingId ? (
          <>
            <section className="calendar-summary-grid" aria-label="Resumen de tareas">
              <div className="card card-body calendar-stat"><strong>{tasks.filter((task) => task.status === 'pending').length}</strong><span>Pendientes</span></div>
              <div className="card card-body calendar-stat"><strong>{overdueTasks.length}</strong><span>Vencidas</span></div>
              <div className="card card-body calendar-stat"><strong>{monthTasks.length}</strong><span>Este mes</span></div>
            </section>

            {canWrite ? (
              <section className="section card card-body calendar-create-card">
                <div className="calendar-section-heading">
                  <div>
                    <p className="eyebrow">Alta rápida</p>
                    <h2 className="section-title account-section-title">Nueva tarea</h2>
                  </div>
                </div>
                <div className="calendar-form-grid">
                  <label className="field calendar-title-field">
                    <span>Tarea</span>
                    <input value={title} maxLength={160} placeholder="Ej. Revisar riego de la parcela norte" onChange={(event) => setTitle(event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Fecha</span>
                    <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Prioridad</span>
                    <select value={priority} onChange={(event) => setPriority(event.target.value as Task['priority'])}>
                      <option value="low">Baja</option>
                      <option value="normal">Normal</option>
                      <option value="high">Alta</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Recordarme</span>
                    <select value={reminderDaysBefore ?? ''} onChange={(event) => setReminderDaysBefore(event.target.value === '' ? null : Number(event.target.value))}>
                      <option value="">Sin recordatorio</option>
                      <option value="0">El mismo día</option>
                      <option value="1">1 día antes</option>
                      <option value="2">2 días antes</option>
                      <option value="7">7 días antes</option>
                    </select>
                  </label>
                  <label className="field calendar-notes-field">
                    <span>Notas opcionales</span>
                    <textarea value={notes} maxLength={4000} rows={2} onChange={(event) => setNotes(event.target.value)} />
                  </label>
                </div>
                <div className="form-actions">
                  <button className="primary-button" type="button" disabled={busy || !title.trim() || !dueDate} onClick={() => void createTask()}>{busy ? 'Guardando…' : 'Añadir tarea'}</button>
                </div>
              </section>
            ) : (
              <section className="section card card-body"><p className="section-copy">Tienes acceso de solo lectura a esta explotación. Puedes consultar el calendario, pero no modificar tareas.</p></section>
            )}

            {overdueTasks.length > 0 ? (
              <section className="section card card-body calendar-overdue-card">
                <p className="eyebrow">Atención</p>
                <h2 className="section-title account-section-title">Tareas vencidas</h2>
                <div className="calendar-task-list">
                  {overdueTasks.slice(0, 5).map((task) => (
                    <article className="calendar-task-row" key={task.id}>
                      <div><strong>{task.title}</strong><small>{new Date(`${task.dueDate}T12:00:00`).toLocaleDateString('es-ES')} · {priorityLabel(task.priority)}</small></div>
                      {canWrite ? <button className="text-button" type="button" disabled={busy} onClick={() => void completeTask(task)}>Completar</button> : null}
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="section calendar-grid-layout">
              <div className="card card-body calendar-month-card">
                <div className="calendar-month-toolbar">
                  <button className="text-button" type="button" onClick={() => moveMonth(-1)} aria-label="Mes anterior">←</button>
                  <h2>{month.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</h2>
                  <button className="text-button" type="button" onClick={() => moveMonth(1)} aria-label="Mes siguiente">→</button>
                </div>
                <div className="calendar-weekdays" aria-hidden="true">
                  {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((label) => <span key={label}>{label}</span>)}
                </div>
                <div className="calendar-month-grid">
                  {Array.from({ length: days[0]?.weekday ?? 0 }, (_, index) => <span className="calendar-day calendar-day-empty" key={`empty-${index}`} />)}
                  {days.map((day) => {
                    const counts = taskCountByDate.get(day.iso);
                    const selected = selectedDate === day.iso;
                    const today = localIsoDate() === day.iso;
                    return (
                      <button className={`calendar-day${selected ? ' is-selected' : ''}${today ? ' is-today' : ''}`} type="button" key={day.iso} onClick={() => setSelectedDate(day.iso)} aria-pressed={selected}>
                        <span>{day.day}</span>
                        {counts ? <small>{counts.pending ? `${counts.pending} pte.` : ''}{counts.overdue ? ' · venc.' : ''}</small> : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="card card-body calendar-list-card">
                <div className="calendar-section-heading">
                  <div>
                    <p className="eyebrow">{selectedDate ? 'Día seleccionado' : 'Mes completo'}</p>
                    <h2 className="section-title account-section-title">{selectedDate ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : month.toLocaleDateString('es-ES', { month: 'long' })}</h2>
                  </div>
                  <button className="text-button" type="button" onClick={() => setSelectedDate('')}>Ver mes</button>
                </div>
                <div className="calendar-filter-row" role="group" aria-label="Filtrar tareas">
                  {(['pending', 'completed', 'all'] as TaskFilter[]).map((value) => (
                    <button key={value} className={`calendar-filter${filter === value ? ' is-active' : ''}`} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
                      {value === 'pending' ? 'Pendientes' : value === 'completed' ? 'Completadas' : 'Todas'}
                    </button>
                  ))}
                </div>
                <div className="calendar-task-list">
                  {selectedTasks.length === 0 ? <p className="section-copy">No hay tareas en esta vista.</p> : selectedTasks.map((task) => (
                    <article className={`calendar-task-row${task.overdue ? ' is-overdue' : ''}${task.status === 'completed' ? ' is-completed' : ''}`} key={task.id}>
                      <div className="calendar-task-copy">
                        <div className="calendar-task-title-line"><strong>{task.title}</strong><span className={`badge calendar-priority-${task.priority}`}>{priorityLabel(task.priority)}</span></div>
                        <small>{new Date(`${task.dueDate}T12:00:00`).toLocaleDateString('es-ES')}{taskLocation(task) ? ` · ${taskLocation(task)}` : ''}{task.reminderDaysBefore !== null ? ` · aviso ${task.reminderDaysBefore === 0 ? 'ese día' : `${task.reminderDaysBefore} d antes`}` : ''}</small>
                        {task.notes ? <p>{task.notes}</p> : null}
                      </div>
                      {task.status === 'pending' && canWrite ? <button className="secondary-button" type="button" disabled={busy} onClick={() => void completeTask(task)}>Completar</button> : null}
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
