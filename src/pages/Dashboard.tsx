import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowRight, CalendarClock, CreditCard, Gauge, Info, PiggyBank, Receipt, Sparkles, TrendingUp, Wallet } from 'lucide-react'
import { useStore } from '../store/store'
import {
  budgetItemAmount,
  budgetTotals,
  goalSaved,
  goalSummary,
  essentialMonthly,
  isSpending,
  monthIncome,
  monthlyDebtLoad,
  personalPlan,
  movementsInMonth,
  personSummary,
  realDebtBalance,
  sharesOf,
  shiftYM,
  spentByCategory,
  summarizeDebt,
} from '../lib/finance'
import { cop, copShort, monthLabel, pct } from '../lib/format'
import { AXIS, GRID, PERSON_COLOR, REFERENCE, SERIES } from '../lib/colors'
import { Badge, Card, ChartTooltip, EmptyState, MonthPicker, PageHeader, PersonDot, ProgressBar, StatCard, cx } from '../components/ui'
import { navigate } from '../App'

export default function Dashboard() {
  const { data, ym, setYm } = useStore()
  const shares = sharesOf(data, ym)
  const budget = budgetTotals(data.budget)
  const monthMoves = movementsInMonth(data.movements, ym)
  const spentMap = spentByCategory(monthMoves)
  const spent = monthMoves.filter(isSpending).reduce((s, m) => s + m.amount, 0)
  const debtLoad = monthlyDebtLoad(data.debts, ym, shares)
  const debtBalance = realDebtBalance(data.debts)
  const simulations = data.debts.filter((d) => d.kind === 'simulacion').length
  const income = monthIncome(data, 'juan', ym) + monthIncome(data, 'me', ym)
  const planJ = personalPlan(data, 'juan', ym)
  const planM = personalPlan(data, 'me', ym)
  const endOfMonth = `${ym}-31`
  const saved = data.goals.reduce((s, g) => s + goalSaved(g, endOfMonth), 0)
  const personalPlanned = planJ.expenses + planM.expenses + planJ.savings + planM.savings
  const committed = budget.total + debtLoad.total + personalPlanned
  const available = income - committed
  const budgetCategories = new Set(data.budget.map((b) => b.category))
  const budgetSpent = [...spentMap].filter(([c]) => budgetCategories.has(c as never)).reduce((s, [, v]) => s + v, 0)
  const used = budget.total > 0 ? budgetSpent / budget.total : 0

  const juan = personSummary(data, 'juan', ym)
  const me = personSummary(data, 'me', ym)
  const essentials = essentialMonthly(data, ym)

  // Presupuesto vs real por renglón del presupuesto
  const byItem = data.budget.map((b) => ({ name: b.name, emoji: b.emoji, budget: budgetItemAmount(b), real: spentMap.get(b.category) ?? 0 }))

  // Tendencia: últimos 6 meses de gasto registrado
  const trend = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const m = shiftYM(ym, i - 5)
      const total = movementsInMonth(data.movements, m)
        .filter(isSpending)
        .reduce((s, x) => s + x.amount, 0)
      return { month: monthLabel(m).slice(0, 3), full: monthLabel(m), Gastado: total }
    })
  }, [data.movements, ym])
  const hasTrend = trend.some((t) => t.Gastado > 0)

  // Distribución de los ingresos del mes
  const allocation = [
    { label: 'Gastos del hogar', value: budget.household, color: SERIES[3] },
    { label: 'Mascotas', value: budget.pets, color: SERIES[2] },
    { label: 'Cuotas de deudas', value: debtLoad.total, color: SERIES[5] },
    { label: 'Ahorro personal', value: planJ.savings + planM.savings, color: SERIES[0] },
    { label: 'Gastos personales', value: planJ.expenses + planM.expenses, color: SERIES[4] },
  ].filter((a) => a.value > 0)

  const activeDebts = data.debts.filter((d) => summarizeDebt(d).status !== 'pagada')

  return (
    <div>
      <PageHeader
        title={`Hola, ${data.people.juan.name} y ${data.people.me.name} 🌿`}
        subtitle="Así va nuestra independencia este mes: lo que entra, lo que sale, lo que debemos y lo que nos queda."
        actions={<MonthPicker ym={ym} onChange={setYm} />}
      />

      {income === 0 ? (
        <Banner>
          Aún no hay ingresos registrados. <button className="font-semibold underline" onClick={() => navigate('juan')}>Agrega el salario de {data.people.juan.name}</button> para ver cuánto queda disponible.
          Mientras nadie tenga ingresos, {data.people[data.settings.defaultResponsible].name} aparece como responsable del 100 % de los gastos compartidos.
        </Banner>
      ) : monthIncome(data, 'me', ym) === 0 ? (
        <Banner>
          Mientras {data.people.me.name} busca empleo, {data.people.juan.name} cubre el 100 % de los gastos compartidos. Cuando registres un salario, los aportes se recalculan solos.
        </Banner>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard icon={TrendingUp} label="Ingresos conjuntos" value={cop(income)} hint={`${data.people.juan.name} ${pct(shares.juan, 0)} · ${data.people.me.name} ${pct(shares.me, 0)}`} />
        <StatCard icon={Receipt} label="Gastos registrados del mes" value={cop(spent)} hint={`Presupuesto mensual: ${cop(budget.total)}`} tone="sand" />
        <StatCard icon={CreditCard} label="Deudas pendientes" value={cop(debtBalance)} hint={simulations ? `+ ${simulations} simulación${simulations > 1 ? 'es' : ''} (no suma)` : 'Solo deudas reales'} tone="red" />
        <StatCard icon={CalendarClock} label="Cuotas mensuales activas" value={cop(debtLoad.total)} hint={`${data.debts.filter((d) => d.kind === 'real' && summarizeDebt(d).status === 'activa').length} deuda(s) activa(s)`} tone="amber" />
        <StatCard icon={PiggyBank} label="Ahorro acumulado" value={cop(saved)} hint={`En ${data.goals.length} metas`} tone="juan" />
        <StatCard icon={Wallet} label="Disponible después de todo" value={cop(available)} negative={available < 0} hint={income === 0 ? 'Sin ingresos registrados' : 'Ingresos − presupuesto − cuotas − ahorro y gastos personales'} />
        <div className="col-span-2 animate-fade-up rounded-2xl border border-sage-100 bg-white p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-sage-100 text-sage-700">
              <Gauge size={18} />
            </span>
            <span className="text-[13px] font-medium text-stone-500">Presupuesto del hogar utilizado</span>
            <span className={cx('num ml-auto text-xl font-bold sm:text-2xl', used > 1 ? 'text-red-700' : 'text-sage-950')}>{pct(used, 0)}</span>
          </div>
          <ProgressBar value={used} className="mt-4 h-3" color={used > 1 ? '#b91c1c' : used > 0.85 ? '#b45309' : undefined} label="Presupuesto utilizado" />
          <div className="mt-2 flex justify-between text-xs text-stone-500">
            <span className="num">Gastado {cop(budgetSpent)}</span>
            <span className="num">Queda {cop(Math.max(0, budget.total - budgetSpent))}</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="¿A dónde se va el dinero cada mes?" subtitle={income > 0 ? `De ${cop(income)} de ingresos conjuntos` : 'Compromisos mensuales planeados'}>
          <AllocationBar items={allocation} income={income} />
        </Card>

        <Card className="lg:col-span-2" title="Cuánto aporta cada uno" subtitle="Hogar + mascotas + cuotas, según ingresos" action={<button onClick={() => navigate('aportes')} className="text-xs font-semibold text-sage-600 hover:text-sage-800">Calculadora →</button>}>
          {[juan, me].map((p) => {
            const total = p.householdContribution + p.petsContribution + p.debtContribution
            return (
              <div key={p.person.id} className="mb-4 last:mb-0">
                <div className="mb-1.5 flex items-center gap-2 text-sm">
                  <PersonDot id={p.person.id} />
                  <span className="font-semibold text-sage-950">{p.person.name}</span>
                  <Badge tone={p.person.id}>{pct(p.share, 1)}</Badge>
                  <span className="num ml-auto font-bold text-sage-950">{cop(total)}</span>
                </div>
                <ProgressBar value={p.share} color={PERSON_COLOR[p.person.id]} className="h-2.5" label={`Aporte de ${p.person.name}`} />
                <div className="mt-1.5 flex justify-between text-xs text-stone-500">
                  <span>Le queda libre</span>
                  <span className={cx('num font-semibold', p.remaining < 0 ? 'text-red-700' : 'text-sage-700')}>{cop(p.remaining)}</span>
                </div>
              </div>
            )
          })}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Presupuesto vs. gastado" subtitle={`Movimientos registrados en ${monthLabel(ym)}`}>
          <div className="space-y-3.5">
            {byItem.map((b) => {
              const ratio = b.budget > 0 ? b.real / b.budget : b.real > 0 ? 1 : 0
              return (
                <div key={b.name}>
                  <div className="mb-1 flex items-baseline gap-2 text-sm">
                    <span>{b.emoji}</span>
                    <span className="font-medium text-sage-950">{b.name}</span>
                    <span className="num ml-auto text-xs text-stone-500">
                      <b className={cx('font-semibold', ratio > 1 ? 'text-red-700' : 'text-sage-950')}>{cop(b.real)}</b> / {cop(b.budget)}
                    </span>
                  </div>
                  <ProgressBar value={ratio} color={ratio > 1 ? '#b91c1c' : SERIES[0]} label={b.name} />
                </div>
              )
            })}
          </div>
          {monthMoves.length === 0 && (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-sand-100 px-3 py-2 text-xs text-stone-600">
              <Info size={14} /> No hay movimientos este mes.{' '}
              <button className="font-semibold text-sage-700 underline" onClick={() => navigate('gastos')}>
                Registrar un gasto
              </button>
            </p>
          )}
        </Card>

        <Card title="Gasto registrado · últimos 6 meses" subtitle="La línea punteada es el presupuesto mensual">
          {hasTrend ? (
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="28%">
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: AXIS, fontSize: 12 }} />
                  <YAxis tickFormatter={copShort} tickLine={false} axisLine={false} tick={{ fill: AXIS, fontSize: 11 }} width={64} />
                  <Tooltip cursor={{ fill: 'rgba(100,137,109,0.08)' }} content={({ active, payload }) => <ChartTooltip active={active} payload={payload as never} label={(payload?.[0]?.payload as { full?: string })?.full} />} />
                  <ReferenceLine y={budget.total} stroke={AXIS} strokeDasharray="4 4" />
                  <Bar isAnimationActive={false} dataKey="Gastado" fill={SERIES[0]} radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState icon={Receipt} title="Todavía no hay historial" text="Cuando registren gastos en “Gastos del hogar”, aquí verán cómo evoluciona mes a mes." />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Deudas y cuotas" action={<LinkBtn to="deudas" />}>
          {activeDebts.length === 0 ? (
            <EmptyState icon={CreditCard} title="Sin deudas pendientes" text="¡Bien! No hay deudas ni simulaciones abiertas." />
          ) : (
            <div className="space-y-4">
              {activeDebts.slice(0, 4).map((d) => {
                const s = summarizeDebt(d)
                return (
                  <div key={d.id}>
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-sm">
                      <span className="font-medium text-sage-950">{d.name}</span>
                      {d.kind === 'simulacion' ? <Badge tone="sand">Simulación</Badge> : <Badge tone={s.status === 'activa' ? 'amber' : 'neutral'}>{s.status}</Badge>}
                      <span className="num ml-auto text-xs text-stone-500">
                        {s.paid}/{d.installments} cuotas · {cop(s.installment)}/mes
                      </span>
                    </div>
                    <ProgressBar value={s.progress} color={d.kind === 'simulacion' ? REFERENCE : SERIES[0]} label={d.name} />
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        <Card title="Metas de ahorro" action={<LinkBtn to="metas" />}>
          <div className="space-y-4">
            {data.goals.slice(0, 5).map((g) => {
              const s = goalSummary(g, essentials)
              return (
                <div key={g.id}>
                  <div className="mb-1 flex items-center gap-2 text-sm">
                    <span>{g.emoji}</span>
                    <span className="font-medium text-sage-950">{g.name}</span>
                    <span className="num ml-auto text-xs text-stone-500">{s.target > 0 ? `${cop(s.saved)} / ${cop(s.target)}` : 'Sin monto objetivo'}</span>
                  </div>
                  <ProgressBar value={s.progress} color={SERIES[0]} label={g.name} />
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-5 flex gap-3 rounded-2xl border border-sage-200 bg-sage-50 px-4 py-3 text-sm text-sage-900">
      <Sparkles size={18} className="mt-0.5 shrink-0 text-sage-600" />
      <p>{children}</p>
    </div>
  )
}

function LinkBtn({ to }: { to: Parameters<typeof navigate>[0] }) {
  return (
    <button onClick={() => navigate(to)} className="inline-flex items-center gap-1 text-xs font-semibold text-sage-600 hover:text-sage-800">
      Ver todo <ArrowRight size={14} />
    </button>
  )
}

/** Barra 100 % apilada: cuánto de los ingresos se lleva cada compromiso y cuánto queda libre. */
function AllocationBar({ items, income }: { items: { label: string; value: number; color: string }[]; income: number }) {
  const committed = items.reduce((s, i) => s + i.value, 0)
  const free = Math.max(0, income - committed)
  const base = Math.max(income, committed) || 1
  const segments = [...items, ...(free > 0 ? [{ label: 'Libre', value: free, color: '#dfe7e0' }] : [])]
  const over = committed - income
  return (
    <div>
      <div className="flex h-10 w-full gap-[2px] overflow-hidden rounded-xl">
        {segments.map((s) => (
          <div key={s.label} className="group relative h-full transition-all first:rounded-l-xl last:rounded-r-xl hover:brightness-110" style={{ width: `${(s.value / base) * 100}%`, background: s.color }} title={`${s.label}: ${cop(s.value)}`} />
        ))}
      </div>
      <div className="mt-5 grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span className="size-3 rounded-[4px]" style={{ background: s.color }} />
            <span className="text-stone-600">{s.label}</span>
            <span className="num ml-auto font-semibold text-sage-950">{cop(s.value)}</span>
            <span className="num w-12 text-right text-xs text-stone-400">{income > 0 ? pct(s.value / income, 0) : ''}</span>
          </div>
        ))}
      </div>
      {income > 0 && over > 0 && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">Los compromisos superan los ingresos por {cop(over)}.</p>}
    </div>
  )
}
