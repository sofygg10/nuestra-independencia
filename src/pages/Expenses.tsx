import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Plus, Receipt, Search, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import { budgetItemAmount, budgetTotals, movementsInMonth, spentByCategory } from '../lib/finance'
import { cop, formatDate, monthLabel, todayISO, uid } from '../lib/format'
import { SERIES } from '../lib/colors'
import { Badge, Button, Card, EmptyState, Field, IconButton, Modal, MoneyInput, MonthPicker, PageHeader, PersonDot, ProgressBar, Segmented, Select, TextInput, cx, useConfirm } from '../components/ui'
import { CATEGORIES, PAYMENT_METHODS, type BudgetItem, type Category, type Movement, type Payer, type Responsible } from '../types'
import { CapacityCards } from '../components/Capacity'

const SHARED_DEFAULT: Category[] = ['Arriendo', 'Servicios', 'Mercado', 'Mascotas', 'Hogar']

export default function Expenses() {
  const { data, update, ym, setYm, name } = useStore()
  const confirm = useConfirm()
  const [editing, setEditing] = useState<Movement | null>(null)
  const [period, setPeriod] = useState<'month' | 'range' | 'all'>('month')
  const [from, setFrom] = useState(`${ym}-01`)
  const [to, setTo] = useState(`${ym}-31`)
  const [cat, setCat] = useState<'all' | Category>('all')
  const [who, setWho] = useState<'all' | Payer>('all')
  const [q, setQ] = useState('')

  const filtered = data.movements
    .filter((m) => (period === 'month' ? m.date.startsWith(ym) : period === 'range' ? (!from || m.date >= from) && (!to || m.date <= to) : true))
    .filter((m) => cat === 'all' || m.category === cat)
    .filter((m) => who === 'all' || m.paidBy === who)
    .filter((m) => !q || `${m.description} ${m.notes}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date))
  const filteredTotal = filtered.reduce((s, m) => s + m.amount, 0)

  const newMovement = (): Movement => ({ id: '', date: period === 'month' && !todayISO().startsWith(ym) ? `${ym}-01` : todayISO(), description: '', category: 'Mercado', amount: 0, paidBy: 'juan', shared: true, method: 'Débito', notes: '' })

  const save = (m: Movement) => {
    update((d) => {
      if (m.id) d.movements = d.movements.map((x) => (x.id === m.id ? m : x))
      else d.movements.push({ ...m, id: uid() })
    })
    setEditing(null)
  }

  const remove = async (m: Movement) => {
    if (await confirm({ title: 'Eliminar movimiento', message: <>¿Eliminar “{m.description}” por {cop(m.amount)}? Esta acción no se puede deshacer.</> })) {
      update((d) => {
        d.movements = d.movements.filter((x) => x.id !== m.id)
      })
    }
  }

  return (
    <div>
      <PageHeader
        title="Gastos del hogar"
        subtitle="El presupuesto mensual compartido y el registro de cada movimiento."
        actions={
          <>
            <MonthPicker ym={ym} onChange={setYm} />
            <Button onClick={() => setEditing(newMovement())}>
              <Plus size={16} /> Registrar gasto
            </Button>
          </>
        }
      />

      <BudgetTable />

      <Card
        className="mt-4"
        title="Movimientos"
        subtitle={`${filtered.length} movimiento(s) · ${cop(filteredTotal)}`}
      >
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <Segmented
            value={period}
            onChange={setPeriod}
            options={[
              { value: 'month', label: <span className="capitalize">{monthLabel(ym)}</span> },
              { value: 'range', label: 'Rango' },
              { value: 'all', label: 'Todo' },
            ]}
          />
          {period === 'range' && (
            <div className="flex gap-2">
              <TextInput type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Desde" className="w-40" />
              <TextInput type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Hasta" className="w-40" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Select value={cat} onChange={(e) => setCat(e.target.value as Category)} aria-label="Categoría" className="sm:w-44">
              <option value="all">Todas las categorías</option>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
            <Select value={who} onChange={(e) => setWho(e.target.value as Payer)} aria-label="Persona" className="sm:w-36">
              <option value="all">Ambas personas</option>
              <option value="juan">{name('juan')}</option>
              <option value="me">{name('me')}</option>
              <option value="joint">Conjunto</option>
            </Select>
          </div>
          <div className="relative lg:ml-auto lg:w-56">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <TextInput placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={data.movements.length === 0 ? 'Aún no hay movimientos' : 'Nada coincide con los filtros'}
            text={data.movements.length === 0 ? 'Registren cada pago (arriendo, mercado, comida de los peludos…) para comparar con el presupuesto.' : 'Prueben con otro mes o quiten algún filtro.'}
            action={
              <Button size="sm" onClick={() => setEditing(newMovement())}>
                <Plus size={14} /> Registrar gasto
              </Button>
            }
          />
        ) : (
          <>
            {/* Tabla en pantallas grandes */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sage-100 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">
                    <th className="py-2 pr-3">Fecha</th>
                    <th className="py-2 pr-3">Descripción</th>
                    <th className="py-2 pr-3">Categoría</th>
                    <th className="py-2 pr-3">Pagó</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Método</th>
                    <th className="py-2 pr-3 text-right">Valor</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => (
                    <tr key={m.id} className="border-b border-sage-50 transition hover:bg-sage-50/60">
                      <td className="whitespace-nowrap py-2.5 pr-3 text-stone-500">{formatDate(m.date)}</td>
                      <td className="py-2.5 pr-3">
                        <div className="font-medium text-sage-950">{m.description}</div>
                        {m.notes && <div className="text-xs text-stone-400">{m.notes}</div>}
                      </td>
                      <td className="py-2.5 pr-3">
                        <Badge tone="neutral">{m.category}</Badge>
                      </td>
                      <td className="whitespace-nowrap py-2.5 pr-3">
                        <span className="inline-flex items-center gap-1.5">
                          <PersonDot id={m.paidBy} /> {name(m.paidBy)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">{m.shared ? <Badge tone="sage">Compartido</Badge> : <Badge tone="sand">Individual</Badge>}</td>
                      <td className="py-2.5 pr-3 text-stone-500">{m.method}</td>
                      <td className="num py-2.5 pr-3 text-right font-semibold text-sage-950">{cop(m.amount)}</td>
                      <td className="py-2.5 text-right">
                        <div className="flex justify-end">
                          <IconButton icon={Pencil} label="Editar" onClick={() => setEditing(m)} />
                          <IconButton icon={Trash2} label="Eliminar" tone="danger" onClick={() => remove(m)} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Tarjetas en el celular */}
            <ul className="space-y-2 md:hidden">
              {filtered.map((m) => (
                <li key={m.id} className="rounded-xl border border-sage-100 p-3">
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-sage-950">{m.description}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                        {formatDate(m.date)} · <PersonDot id={m.paidBy} /> {name(m.paidBy)} · {m.category}
                      </div>
                    </div>
                    <div className="num font-semibold text-sage-950">{cop(m.amount)}</div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    {m.shared ? <Badge tone="sage">Compartido</Badge> : <Badge tone="sand">Individual</Badge>}
                    <span className="text-xs text-stone-400">{m.method}</span>
                    <div className="ml-auto flex">
                      <IconButton icon={Pencil} label="Editar" onClick={() => setEditing(m)} />
                      <IconButton icon={Trash2} label="Eliminar" tone="danger" onClick={() => remove(m)} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      {editing && <MovementForm initial={editing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  )
}

function MovementForm({ initial, onSave, onClose }: { initial: Movement; onSave: (m: Movement) => void; onClose: () => void }) {
  const { name } = useStore()
  const [m, setM] = useState(initial)
  const [touched, setTouched] = useState(false)
  const errors = {
    description: !m.description.trim() ? 'Escribe una descripción' : '',
    amount: m.amount <= 0 ? 'El valor debe ser mayor a $0' : '',
    date: !m.date ? 'Elige una fecha' : '',
  }
  const valid = !errors.description && !errors.amount && !errors.date
  const set = <K extends keyof Movement>(k: K, v: Movement[K]) => setM((x) => ({ ...x, [k]: v }))

  return (
    <Modal
      open
      onClose={onClose}
      title={initial.id ? 'Editar movimiento' : 'Registrar gasto'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              setTouched(true)
              if (valid) onSave({ ...m, description: m.description.trim() })
            }}
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Descripción" className="sm:col-span-2" error={touched ? errors.description : ''}>
          <TextInput autoFocus value={m.description} onChange={(e) => set('description', e.target.value)} placeholder="Ej.: Mercado de la semana" />
        </Field>
        <Field label="Valor" error={touched ? errors.amount : ''}>
          <MoneyInput value={m.amount} onChange={(v) => set('amount', v)} />
        </Field>
        <Field label="Fecha" error={touched ? errors.date : ''}>
          <TextInput type="date" value={m.date} onChange={(e) => set('date', e.target.value)} />
        </Field>
        <Field label="Categoría">
          <Select
            value={m.category}
            onChange={(e) => {
              const c = e.target.value as Category
              setM((x) => ({ ...x, category: c, shared: initial.id ? x.shared : SHARED_DEFAULT.includes(c) }))
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="¿Quién pagó?">
          <Select value={m.paidBy} onChange={(e) => set('paidBy', e.target.value as Payer)}>
            <option value="juan">{name('juan')}</option>
            <option value="me">{name('me')}</option>
            <option value="joint">Ambos (cuenta conjunta)</option>
          </Select>
        </Field>
        <Field label="Tipo de gasto">
          <Segmented
            value={m.shared ? 'shared' : 'individual'}
            onChange={(v) => set('shared', v === 'shared')}
            options={[
              { value: 'shared', label: 'Compartido' },
              { value: 'individual', label: 'Individual' },
            ]}
          />
        </Field>
        <Field label="Método de pago">
          <Select value={m.method} onChange={(e) => set('method', e.target.value)}>
            {PAYMENT_METHODS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </Select>
        </Field>
        <Field label="Observaciones" className="sm:col-span-2">
          <TextInput value={m.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Opcional" />
        </Field>
      </div>
    </Modal>
  )
}

/** Tabla de presupuesto estilo “Mujer independiente”: presupuestado vs gastado del mes, editable. */
function BudgetTable() {
  const { data, update, ym, name } = useStore()
  const confirm = useConfirm()
  const [open, setOpen] = useState<string | null>(() => data.budget.find((b) => b.subitems)?.id ?? null)
  const spent = spentByCategory(movementsInMonth(data.movements, ym))
  const totals = budgetTotals(data.budget)
  const totalSpent = data.budget.reduce((s, b) => s + (spent.get(b.category) ?? 0), 0)

  const edit = (id: string, fn: (b: BudgetItem) => void) =>
    update((d) => {
      const b = d.budget.find((x) => x.id === id)
      if (b) fn(b)
    })

  const removeItem = async (b: BudgetItem) => {
    if (await confirm({ title: 'Eliminar del presupuesto', message: <>¿Quitar “{b.name}” del presupuesto mensual?</> }))
      update((d) => {
        d.budget = d.budget.filter((x) => x.id !== b.id)
      })
  }

  return (
    <Card
      title="Presupuesto mensual compartido"
      subtitle={`Lo gastado sale de los movimientos de ${monthLabel(ym)} en cada categoría`}
      action={
        <Button size="sm" variant="secondary" onClick={() => update((d) => void d.budget.push({ id: uid(), emoji: '📌', name: 'Nuevo concepto', category: 'Otros', amount: 0 }))}>
          <Plus size={14} /> Concepto
        </Button>
      }
    >
      <div className="-mx-5 overflow-x-auto px-5">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-sage-100 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">
              <th className="py-2 pr-3">Concepto</th>
              <th className="py-2 pr-3">Categoría</th>
              <th className="py-2 pr-3">¿Quién paga?</th>
              <th className="w-40 py-2 pr-3 text-right">Presupuestado</th>
              <th className="py-2 pr-3 text-right">Gastado</th>
              <th className="py-2 pr-3 text-right">Restante</th>
              <th className="w-32 py-2 pr-3">Avance</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {data.budget.map((b) => {
              const planned = budgetItemAmount(b)
              const real = spent.get(b.category) ?? 0
              const left = planned - real
              const hasSubs = !!b.subitems
              return (
                <Fragment key={b.id}>
                  <tr className="border-b border-sage-50">
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-1.5">
                        {hasSubs ? (
                          <button onClick={() => setOpen(open === b.id ? null : b.id)} className="text-stone-400 hover:text-sage-700" aria-label="Ver desglose">
                            {open === b.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                          </button>
                        ) : (
                          <span className="w-4" />
                        )}
                        <input value={b.emoji} onChange={(e) => edit(b.id, (x) => (x.emoji = e.target.value))} className="w-7 bg-transparent text-center outline-none" aria-label="Emoji" />
                        <input value={b.name} onChange={(e) => edit(b.id, (x) => (x.name = e.target.value))} className="w-full min-w-28 rounded-md bg-transparent px-1 py-1 font-medium text-sage-950 outline-none hover:bg-sage-50 focus:bg-sage-50" aria-label="Concepto" />
                        {hasSubs && (
                          <button onClick={() => setOpen(open === b.id ? null : b.id)} className="shrink-0 rounded-lg bg-sage-100 px-2 py-1 text-[11px] font-semibold text-sage-700 hover:bg-sage-200">
                            {open === b.id ? 'Ocultar desglose' : `Desglose (${b.subitems!.length})`}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-2 pr-3">
                      <select value={b.category} onChange={(e) => edit(b.id, (x) => (x.category = e.target.value as Category))} className="rounded-md bg-transparent py-1 text-xs text-stone-500 outline-none hover:bg-sage-50" aria-label="Categoría">
                        {CATEGORIES.map((c) => (
                          <option key={c}>{c}</option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <select
                        value={b.assignedTo ?? 'shared'}
                        onChange={(e) => edit(b.id, (x) => (x.assignedTo = e.target.value as Responsible))}
                        className={cx('rounded-lg px-2 py-1 text-xs font-semibold outline-none', (b.assignedTo ?? 'shared') === 'shared' ? 'bg-sage-100 text-sage-700' : b.assignedTo === 'me' ? 'bg-fuchsia-50 text-[#a0529c]' : 'bg-emerald-50 text-[#1f7a4d]')}
                        aria-label={`Quién paga ${b.name}`}
                      >
                        <option value="shared">Los dos</option>
                        <option value="me">{name('me')}</option>
                        <option value="juan">{name('juan')}</option>
                      </select>
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {hasSubs ? (
                        <button onClick={() => setOpen(open === b.id ? null : b.id)} className="num font-semibold text-sage-950 underline decoration-sage-200 decoration-dashed underline-offset-4">
                          {cop(planned)}
                        </button>
                      ) : (
                        <MoneyInput value={b.amount} onChange={(v) => edit(b.id, (x) => (x.amount = v))} className="h-8 text-right" aria-label={`Presupuesto de ${b.name}`} />
                      )}
                    </td>
                    <td className="num py-2 pr-3 text-right text-stone-600">{cop(real)}</td>
                    <td className={cx('num py-2 pr-3 text-right font-semibold', left < 0 ? 'text-red-700' : 'text-sage-700')}>{cop(left)}</td>
                    <td className="py-2 pr-3">
                      <ProgressBar value={planned > 0 ? real / planned : 0} color={real > planned ? '#b91c1c' : SERIES[0]} label={b.name} />
                    </td>
                    <td className="py-2">
                      <IconButton icon={Trash2} label="Eliminar concepto" tone="danger" onClick={() => removeItem(b)} />
                    </td>
                  </tr>
                  {hasSubs && open === b.id && (
                    <tr className="bg-sand-50">
                      <td colSpan={8} className="px-3 py-4">
                        <SubitemsEditor item={b} onEdit={(fn) => edit(b.id, fn)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="font-bold text-sage-950">
              <td className="pt-3" colSpan={3}>
                TOTAL
              </td>
              <td className="num pr-3 pt-3 text-right">{cop(totals.total)}</td>
              <td className="num pr-3 pt-3 text-right">{cop(totalSpent)}</td>
              <td className={cx('num pr-3 pt-3 text-right', totals.total - totalSpent < 0 ? 'text-red-700' : 'text-sage-700')}>{cop(totals.total - totalSpent)}</td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="mt-3 text-xs text-stone-400">
        Toca un valor para editarlo. “Los dos” se reparte según el acuerdo de{' '}
        <a href="#/aportes" className="font-semibold text-sage-700 underline">
          Aportes proporcionales
        </a>
        ; si eliges a una persona, ese gasto lo paga completo ella.
      </p>
      <div className="mt-5 border-t border-sage-100 pt-4">
        <div className="mb-3 text-sm font-semibold text-sage-950">¿A cada uno le alcanza?</div>
        <CapacityCards />
      </div>
    </Card>
  )
}

/** Desglose editable: cada cosa con su nombre y su valor, y una fila para agregar nuevas. */
function SubitemsEditor({ item, onEdit }: { item: BudgetItem; onEdit: (fn: (b: BudgetItem) => void) => void }) {
  const confirm = useConfirm()
  const [newName, setNewName] = useState('')
  const [newAmount, setNewAmount] = useState(0)
  const [error, setError] = useState('')
  const subs = item.subitems ?? []

  const add = () => {
    if (!newName.trim()) return setError('Escribe qué es (ej.: Arena, Vacuna Oliver…)')
    onEdit((x) => x.subitems!.push({ id: uid(), name: newName.trim(), amount: newAmount }))
    setNewName('')
    setNewAmount(0)
    setError('')
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-sm font-semibold text-sage-900">
          {item.emoji} Desglose de {item.name.toLowerCase()}
        </span>
        <span className="num text-sm font-bold text-sage-950">Total {cop(budgetItemAmount(item))}</span>
      </div>
      <div className="grid grid-cols-[1fr_9rem_2rem] gap-2 px-1 pb-1 text-[11px] font-semibold uppercase tracking-wide text-stone-400">
        <span>Qué es</span>
        <span className="text-right">Valor mensual</span>
        <span />
      </div>
      <div className="space-y-2">
        {subs.map((s) => (
          <div key={s.id} className="grid grid-cols-[1fr_9rem_2rem] items-center gap-2">
            <TextInput value={s.name} placeholder="Nombre" onChange={(e) => onEdit((x) => (x.subitems!.find((y) => y.id === s.id)!.name = e.target.value))} className="h-9" aria-label="Qué es" />
            <MoneyInput value={s.amount} onChange={(v) => onEdit((x) => (x.subitems!.find((y) => y.id === s.id)!.amount = v))} className="h-9 text-right" aria-label={`Valor de ${s.name}`} />
            <IconButton
              icon={Trash2}
              label="Quitar"
              tone="danger"
              onClick={async () => {
                if (await confirm({ title: 'Quitar del desglose', message: <>¿Quitar “{s.name || 'este renglón'}”?</> })) onEdit((x) => (x.subitems = x.subitems!.filter((y) => y.id !== s.id)))
              }}
            />
          </div>
        ))}
        {subs.length === 0 && <p className="py-2 text-xs text-stone-400">Aún no hay nada en el desglose.</p>}
        <form
          className="grid grid-cols-[1fr_9rem_2rem] items-center gap-2 rounded-xl border border-dashed border-sage-300 bg-white p-2"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <TextInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nuevo: ej. Vacuna Oliver" className="h-9" aria-label="Nombre de lo nuevo" />
          <MoneyInput value={newAmount} onChange={setNewAmount} className="h-9 text-right" aria-label="Valor de lo nuevo" />
          <button type="submit" className="grid size-8 place-items-center rounded-lg bg-sage-700 text-white hover:bg-sage-800" aria-label="Agregar al desglose" title="Agregar">
            <Plus size={16} />
          </button>
        </form>
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  )
}
