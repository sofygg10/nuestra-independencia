import { CalendarPlus, Copy, CreditCard, FileSpreadsheet, Home, Plus, Trash2, Wallet, Briefcase } from 'lucide-react'
import { useStore } from '../store/store'
import { sharedSpentBy, debtChargesInMonth, debtSplit, installmentOf, isSpending, movementsInMonth, personSummary, sharesOf, shiftYM } from '../lib/finance'
import { cop, formatDate, monthLabel, pct, uid } from '../lib/format'
import { SERIES } from '../lib/colors'
import { Badge, Button, Card, EmptyState, Field, IconButton, MoneyInput, MonthPicker, PageHeader, ProgressBar, Row, StatCard, cx, useConfirm } from '../components/ui'
import { CapacityNote } from '../components/Capacity'
import type { LineKind, PersonId, PersonalLine, PersonalMonth } from '../types'

type Template = Omit<PersonalLine, 'id' | 'spent'>

/** Tomada de la tabla “Mujer independiente” de Fleur (sin lo del hogar, que ya va en los aportes). */
const FLEUR_TEMPLATE: Template[] = [
  { emoji: '🎓', name: 'Estudios', kind: 'gasto', planned: 500_000 },
  { emoji: '💳', name: 'Deudas', kind: 'gasto', planned: 500_000 },
  { emoji: '🚌', name: 'Transporte', kind: 'gasto', planned: 200_000 },
  { emoji: '❤️', name: 'Pareja, yo, salidas', kind: 'gasto', planned: 300_000 },
  { emoji: '🛍️', name: 'Personal', kind: 'gasto', planned: 300_000 },
  { emoji: '🚗', name: 'Conducción', kind: 'gasto', planned: 200_000 },
  { emoji: '🐷', name: 'Seguridad, mascotas, cosas', kind: 'ahorro', planned: 300_000 },
  { emoji: '✈️', name: 'España', kind: 'ahorro', planned: 650_000 },
]

/** Solo nombres para arrancar; los valores los pone cada uno. */
const BASIC_TEMPLATE: Template[] = [
  { emoji: '🚌', name: 'Transporte', kind: 'gasto', planned: 0 },
  { emoji: '📱', name: 'Celular', kind: 'gasto', planned: 0 },
  { emoji: '🍔', name: 'Salidas', kind: 'gasto', planned: 0 },
  { emoji: '🛍️', name: 'Ropa y cuidado personal', kind: 'gasto', planned: 0 },
  { emoji: '🐷', name: 'Ahorro', kind: 'ahorro', planned: 0 },
]

export default function PersonPage({ id }: { id: PersonId }) {
  const { data, update, ym, setYm } = useStore()
  const confirm = useConfirm()
  const person = data.people[id]
  const sheet = person.months[ym]
  const s = personSummary(data, id, ym)
  const isMe = id === 'me'
  const otherName = data.people[id === 'me' ? 'juan' : 'me'].name

  const prevYm = Object.keys(person.months)
    .filter((m) => m < ym)
    .sort()
    .pop()

  const editPerson = (fn: (p: typeof person) => void) => update((d) => fn(d.people[id]))
  const editSheet = (fn: (m: PersonalMonth) => void) =>
    editPerson((p) => {
      if (p.months[ym]) fn(p.months[ym])
    })
  const editLine = (lineId: string, fn: (l: PersonalLine) => void) =>
    editSheet((m) => {
      const l = m.lines.find((x) => x.id === lineId)
      if (l) fn(l)
    })

  const createSheet = (lines: Template[] | PersonalLine[], income: number | null = null) =>
    editPerson((p) => {
      p.months[ym] = { income, lines: lines.map((l) => ({ ...l, id: uid(), spent: 0 })) }
    })

  const shared = s.contribution
  const paidShared = sharedSpentBy(data, id, ym)
  const lines = sheet?.lines ?? []
  const planned = lines.reduce((t, l) => t + l.planned, 0)
  const spent = lines.reduce((t, l) => t + l.spent, 0)
  const leftPlan = s.income - shared - planned
  const leftReal = s.income - shared - spent

  const debts = data.debts
    .filter((d) => debtChargesInMonth(d, ym))
    .map((d) => ({ debt: d, amount: debtSplit(d, installmentOf(d), sharesOf(data, ym))[id] }))
    .filter((x) => x.amount > 0)
  const moves = movementsInMonth(data.movements, ym).filter((m) => m.paidBy === id && isSpending(m))

  return (
    <div>
      <PageHeader
        title={isMe ? `Mis finanzas · ${person.name}` : `Finanzas de ${person.name}`}
        subtitle={`La tablita de ${person.name} para cuadrar el mes: cada mes tiene la suya y se puede cambiar cuando quieras.`}
        actions={<MonthPicker ym={ym} onChange={setYm} />}
      />

      {isMe && s.income === 0 && (
        <div className="mb-5 rounded-2xl border border-fuchsia-100 bg-fuchsia-50/60 px-4 py-3 text-sm text-stone-700">
          💼 Mientras buscas empleo tu ingreso está en $0 y {otherName} cubre el 100 % de los gastos compartidos. Cuando pongas tu salario, los aportes se recalculan solos.
        </div>
      )}

      <div className="mb-4">
        <CapacityNote id={id} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Briefcase} label={`Ingreso de ${monthLabel(ym)}`} value={cop(s.income)} tone={id} />
        <StatCard icon={Home} label="Aporte a lo compartido" value={cop(shared)} hint={`${pct(s.share, 1)} de hogar, mascotas y cuotas`} tone="sand" />
        <StatCard icon={FileSpreadsheet} label="Mis cosas (presupuesto)" value={cop(planned)} hint={`Gastado: ${cop(spent)}`} tone="neutral" />
        <StatCard icon={Wallet} label="Me queda libre" value={cop(leftPlan)} negative={leftPlan < 0} hint={sheet ? `Según lo gastado hoy: ${cop(leftReal)}` : undefined} />
      </div>

      <Card
        title={`Tablita de ${monthLabel(ym)}`}
        subtitle="Presupuesto = lo que planeas · Gastado = lo que ya salió. Toca cualquier valor para cambiarlo."
        action={
          sheet && (
            <IconButton
              icon={Trash2}
              label="Borrar la tablita de este mes"
              tone="danger"
              onClick={async () => {
                if (await confirm({ title: 'Borrar tablita del mes', message: <>¿Borrar todos los renglones de {monthLabel(ym)}? Los otros meses no se tocan.</> }))
                  editPerson((p) => {
                    delete p.months[ym]
                  })
              }}
            />
          )
        }
      >
        {!sheet ? (
          <>
          <div className="mb-4 rounded-2xl bg-sand-100 p-4">
            <Field label="💰 Ingreso mensual base" hint={isMe ? 'Déjalo en $0 mientras no tengas empleo' : 'Se usa en todos los meses que no tengan un ingreso propio'} className="sm:w-72">
              <MoneyInput value={person.income} onChange={(v) => editPerson((p) => (p.income = v))} />
            </Field>
          </div>
          <EmptyState
            icon={CalendarPlus}
            title={`Aún no hay tablita para ${monthLabel(ym)}`}
            text="Créala una vez y luego, cada mes, cópiala del mes anterior y ajusta los valores."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                {prevYm && (
                  <Button onClick={() => createSheet(person.months[prevYm].lines, person.months[prevYm].income)}>
                    <Copy size={16} /> Copiar de {monthLabel(prevYm)}
                  </Button>
                )}
                {isMe && (
                  <Button variant={prevYm ? 'secondary' : 'primary'} onClick={() => createSheet(FLEUR_TEMPLATE)}>
                    Usar mi tabla “Mujer independiente”
                  </Button>
                )}
                <Button variant="secondary" onClick={() => createSheet(BASIC_TEMPLATE)}>
                  Plantilla básica
                </Button>
                <Button variant="ghost" onClick={() => createSheet([])}>
                  Empezar vacía
                </Button>
              </div>
            }
          />
          </>
        ) : (
          <>
            <div className="mb-4 flex flex-col gap-3 rounded-2xl bg-sand-100 p-4 sm:flex-row sm:items-end">
              <Field label={`💰 Ingreso de ${monthLabel(ym)}`} className="sm:w-60">
                <MoneyInput value={sheet.income ?? person.income} onChange={(v) => editSheet((m) => (m.income = v))} />
              </Field>
              <p className="text-xs text-stone-500 sm:pb-2.5">
                Ingreso base: {cop(person.income)}.{' '}
                {sheet.income !== null && sheet.income !== person.income ? (
                  <>
                    <button className="font-semibold text-sage-700 underline" onClick={() => editSheet((m) => (m.income = null))}>
                      Volver al base
                    </button>{' '}
                    ·{' '}
                    <button className="font-semibold text-sage-700 underline" onClick={() => editPerson((p) => (p.income = sheet.income ?? p.income))}>
                      Usarlo como base para los próximos meses
                    </button>
                  </>
                ) : (
                  'Si este mes ganas distinto, cámbialo aquí.'
                )}
              </p>
            </div>

            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-sage-100 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">
                    <th className="py-2 pr-2">Concepto</th>
                    <th className="w-28 py-2 pr-2">Tipo</th>
                    <th className="w-36 py-2 pr-2 text-right">Presupuesto</th>
                    <th className="w-36 py-2 pr-2 text-right">Gastado</th>
                    <th className="w-28 py-2 pr-2 text-right">Restante</th>
                    <th className="w-24 py-2 pr-2">Avance</th>
                    <th className="w-9" />
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={7} className="pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-sage-600">
                      Lo compartido{' '}
                      <span className="font-medium normal-case text-stone-400">
                        · {pct(s.share, 1)} según el acuerdo de{' '}
                        <a href="#/aportes" className="text-sage-700 underline">
                          Aportes proporcionales
                        </a>
                        {s.assignedOwn > 0 && ` + ${cop(s.assignedOwn)} asignado solo a ${person.name} en Gastos del hogar`}
                      </span>
                    </td>
                  </tr>
                  {[
                    { emoji: '🏠', name: 'Aporte al hogar', value: s.householdContribution, paid: paidShared.household },
                    { emoji: '🐾', name: 'Aporte a mascotas', value: s.petsContribution, paid: paidShared.pets },
                    { emoji: '💳', name: 'Cuotas de deudas', value: s.debtContribution, paid: paidShared.debts },
                  ].map((r) => (
                    <tr key={r.name} className="border-b border-sage-50 text-stone-600">
                      <td className="py-2 pr-2">
                        <span className="mr-2">{r.emoji}</span>
                        {r.name}
                      </td>
                      <td className="py-2 pr-2">
                        <Badge tone="sage">según acuerdo</Badge>
                      </td>
                      <td className="num py-2 pr-3 text-right font-semibold text-sage-950">{cop(r.value)}</td>
                      <td className="num py-2 pr-3 text-right" title="Lo que pagó en Gastos del hogar este mes">
                        {cop(r.paid)}
                      </td>
                      <td className={cx('num py-2 pr-3 text-right font-semibold', r.value - r.paid < 0 ? 'text-amber-700' : 'text-sage-700')}>{cop(r.value - r.paid)}</td>
                      <td className="py-2 pr-2">
                        <ProgressBar value={r.value > 0 ? r.paid / r.value : 0} color={SERIES[0]} label={r.name} />
                      </td>
                      <td />
                    </tr>
                  ))}

                  <tr>
                    <td colSpan={7} className="pb-1 pt-4 text-[11px] font-bold uppercase tracking-wide text-sage-600">
                      Mis cosas
                    </td>
                  </tr>
                  {lines.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-3 text-center text-xs text-stone-400">
                        Agrega tu primer renglón abajo 👇
                      </td>
                    </tr>
                  )}
                  {lines.map((l) => {
                    const left = l.planned - l.spent
                    return (
                      <tr key={l.id} className="border-b border-sage-50">
                        <td className="py-1.5 pr-2">
                          <div className="flex items-center gap-1">
                            <input value={l.emoji} onChange={(e) => editLine(l.id, (x) => (x.emoji = e.target.value))} className="w-7 bg-transparent text-center outline-none" aria-label="Emoji" />
                            <input value={l.name} placeholder="Nombre" onChange={(e) => editLine(l.id, (x) => (x.name = e.target.value))} className="w-full min-w-28 rounded-md bg-transparent px-1.5 py-1.5 font-medium text-sage-950 outline-none hover:bg-sage-50 focus:bg-sage-50" aria-label="Concepto" />
                          </div>
                        </td>
                        <td className="py-1.5 pr-2">
                          <select value={l.kind} onChange={(e) => editLine(l.id, (x) => (x.kind = e.target.value as LineKind))} className={cx('rounded-lg px-2 py-1 text-xs font-semibold outline-none', l.kind === 'ahorro' ? 'bg-emerald-50 text-[#1f7a4d]' : 'bg-stone-100 text-stone-600')} aria-label="Tipo">
                            <option value="gasto">Gasto</option>
                            <option value="ahorro">Ahorro</option>
                          </select>
                        </td>
                        <td className="py-1.5 pr-2">
                          <MoneyInput value={l.planned} onChange={(v) => editLine(l.id, (x) => (x.planned = v))} className="h-8 text-right" aria-label={`Presupuesto de ${l.name}`} />
                        </td>
                        <td className="py-1.5 pr-2">
                          <MoneyInput value={l.spent} onChange={(v) => editLine(l.id, (x) => (x.spent = v))} className="h-8 text-right" aria-label={`Gastado en ${l.name}`} />
                        </td>
                        <td className={cx('num py-1.5 pr-3 text-right font-semibold', left < 0 ? 'text-red-700' : 'text-sage-700')}>{cop(left)}</td>
                        <td className="py-1.5 pr-2">
                          <ProgressBar value={l.planned > 0 ? l.spent / l.planned : 0} color={l.spent > l.planned ? '#b91c1c' : SERIES[0]} label={l.name} />
                        </td>
                        <td className="py-1.5">
                          <IconButton
                            icon={Trash2}
                            label="Quitar renglón"
                            tone="danger"
                            onClick={async () => {
                              if (await confirm({ title: 'Quitar renglón', message: <>¿Quitar “{l.name || 'este renglón'}” de {monthLabel(ym)}?</> }))
                                editSheet((m) => (m.lines = m.lines.filter((x) => x.id !== l.id)))
                            }}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={7} className="pt-2">
                      <Button size="sm" variant="ghost" onClick={() => editSheet((m) => void m.lines.push({ id: uid(), emoji: '📌', name: '', kind: 'gasto', planned: 0, spent: 0 }))}>
                        <Plus size={14} /> Agregar renglón
                      </Button>
                    </td>
                  </tr>
                  <tr className="border-t border-sage-100 font-bold text-sage-950">
                    <td className="pt-3" colSpan={2}>
                      TOTAL (compartido + mis cosas)
                    </td>
                    <td className="num pr-3 pt-3 text-right">{cop(shared + planned)}</td>
                    <td className="num pr-3 pt-3 text-right">{cop(spent + paidShared.household + paidShared.pets + paidShared.debts)}</td>
                    <td className="num pr-3 pt-3 text-right">{cop(shared + planned - spent - paidShared.household - paidShared.pets - paidShared.debts)}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className={cx('rounded-2xl p-4', leftPlan < 0 ? 'bg-red-50' : 'bg-sage-50')}>
                <div className="text-xs font-medium text-stone-500">Me queda libre (según presupuesto)</div>
                <div className={cx('num text-2xl font-bold', leftPlan < 0 ? 'text-red-700' : 'text-sage-800')}>{cop(leftPlan)}</div>
                <div className="num mt-1 text-xs text-stone-500">
                  {cop(s.income)} − {cop(shared)} compartido − {cop(planned)} mis cosas
                </div>
              </div>
              <div className="rounded-2xl bg-sand-100 p-4">
                <div className="text-xs font-medium text-stone-500">Me queda hoy (según lo gastado)</div>
                <div className={cx('num text-2xl font-bold', leftReal < 0 ? 'text-red-700' : 'text-sage-950')}>{cop(leftReal)}</div>
                <div className="num mt-1 text-xs text-stone-500">
                  {cop(s.income)} − {cop(shared)} compartido − {cop(spent)} gastado
                </div>
              </div>
            </div>
            {!person.months[shiftYM(ym, 1)] && (
              <p className="mt-4 text-xs text-stone-500">
                ¿Listo el mes? Pasa al siguiente con la flecha de arriba y elige <b>“Copiar de {monthLabel(ym)}”</b>: se copian los conceptos y presupuestos con lo gastado en $0.
              </p>
            )}
          </>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Cuotas de deudas que le tocan" subtitle={monthLabel(ym)}>
          {debts.length === 0 ? (
            <EmptyState icon={CreditCard} title="Sin cuotas este mes" text="Solo cuentan deudas reales y activas. Las simulaciones no suman." />
          ) : (
            debts.map(({ debt, amount }) => <Row key={debt.id} label={<span className="flex items-center gap-2">{debt.name} {debt.responsible === 'shared' && <Badge tone="sage">compartida</Badge>}</span>} value={cop(amount)} />)
          )}
        </Card>
        <Card title="Pagos registrados en Gastos del hogar" subtitle={`Lo que pagó ${person.name} en ${monthLabel(ym)}`}>
          {moves.length === 0 ? (
            <p className="text-sm text-stone-400">No hay movimientos a su nombre este mes.</p>
          ) : (
            moves.slice(0, 6).map((m) => (
              <div key={m.id} className="flex justify-between border-b border-sage-50 py-1.5 text-sm text-stone-600">
                <span>
                  {formatDate(m.date)} · {m.description} {m.shared && <Badge tone="sage">compartido</Badge>}
                </span>
                <span className="num font-semibold">{cop(m.amount)}</span>
              </div>
            ))
          )}
        </Card>
      </div>
    </div>
  )
}
