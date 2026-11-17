
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Check, Plus, Scale, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import { budgetSplit, budgetTotals, computeShares, monthIncome, personSummary, coupleBalance, monthlyDebtLoad, sharesOf, splitAmount } from '../lib/finance'
import { cop, copShort, monthLabel, pct, uid } from '../lib/format'
import { AXIS, GRID, PERSON_COLOR } from '../lib/colors'
import { Button, Card, ChartTooltip, Field, IconButton, Legend, MoneyInput, PageHeader, PersonDot, Segmented, TextInput, cx } from '../components/ui'
import type { PersonId } from '../types'
import { CapacityCards } from '../components/Capacity'

interface Extra {
  id: string
  name: string
  amount: number
}

export default function Contributions() {
  const { data, update, ym } = useStore()
  const budget = budgetTotals(data.budget)
  const debt = monthlyDebtLoad(data.debts, ym, sharesOf(data, ym))
  // Todo lo de esta página se guarda: los salarios son los reales de cada uno.
  const myIncome = monthIncome(data, 'me', ym)
  const juanIncome = monthIncome(data, 'juan', ym)
  const shared = budgetSplit(data, ym).sharedTotal
  const extras: Extra[] = data.settings.calc.extras
  const s4Juan = data.settings.calc.s4Juan
  const setExtras = (next: Extra[]) => update((d) => void (d.settings.calc.extras = next))
  const setS4Juan = (v: number) => update((d) => void (d.settings.calc.s4Juan = v))
  const setIncome = (id: PersonId) => (v: number) =>
    update((d) => {
      d.people[id].income = v
      // si ese mes tiene un ingreso propio en la tablita, también se actualiza
      const sheet = d.people[id].months[ym]
      if (sheet && sheet.income !== null) sheet.income = v
    })

  const me = data.people.me.name
  const juan = data.people.juan.name
  const extrasTotal = extras.reduce((s, e) => s + e.amount, 0)
  const total = shared + extrasTotal

  const calc = (mine: number, his: number) => {
    const shares = computeShares(mine, his, data.settings.defaultResponsible)
    const split = splitAmount(total, shares)
    return { shares, split, freeMe: mine - split.me, freeJuan: his - split.juan }
  }
  const r = calc(myIncome, juanIncome)

  const scenarios = [
    { name: 'Escenario 1', mine: 3_000_000, his: 6_000_000 },
    { name: 'Escenario 2', mine: 4_000_000, his: 6_000_000 },
    { name: 'Escenario 3', mine: 3_000_000, his: 8_000_000 },
    { name: 'Escenario 4', mine: 0, his: s4Juan, editable: true },
  ].map((s) => ({ ...s, ...calc(s.mine, s.his) }))

  const chartData = scenarios.map((s) => ({ name: s.name.replace('Escenario ', 'Esc. '), [me]: s.split.me, [juan]: s.split.juan }))
  const balance = coupleBalance(data, sharesOf(data, ym))
  const owed = Math.round(balance.juanIsOwed)

  return (
    <div>
      <PageHeader
        title="Aportes proporcionales"
        subtitle="Cada uno aporta según lo que gana, no 50/50. Porcentaje = ingreso individual ÷ ingresos conjuntos. Aporte = gastos compartidos × porcentaje."
      />

      <Agreement />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2" title="Salarios y gastos a repartir" subtitle={`Se guarda solo · ${monthLabel(ym)}`}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label={`Salario de ${me}`}>
                <MoneyInput value={myIncome} onChange={setIncome('me')} />
              </Field>
              <Field label={`Salario de ${juan}`}>
                <MoneyInput value={juanIncome} onChange={setIncome('juan')} />
              </Field>
            </div>
            <Field label="Gastos compartidos (“Los dos” en Gastos del hogar)" hint={`Presupuesto total del hogar: ${cop(budget.total)}. Para cambiarlo, edítalo en Gastos del hogar.`}>
              <div className="num flex h-10 items-center justify-between rounded-xl bg-sage-50 px-3 text-sm font-semibold text-sage-950">
                {cop(shared)}
                <a href="#/gastos" className="text-xs font-semibold text-sage-700 underline">
                  Editar
                </a>
              </div>
            </Field>
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-600">Gastos adicionales</span>
                <Button size="sm" variant="ghost" onClick={() => setExtras([...extras, { id: uid(), name: '', amount: 0 }])}>
                  <Plus size={14} /> Agregar
                </Button>
              </div>
              {extras.length === 0 && <p className="text-xs text-stone-400">Ej.: una cuota, un gasto del mes o un imprevisto que quieran repartir.</p>}
              <div className="space-y-2">
                {extras.map((e, i) => (
                  <div key={e.id} className="flex gap-2">
                    <TextInput placeholder="Concepto" value={e.name} onChange={(ev) => setExtras(extras.map((x, j) => (j === i ? { ...x, name: ev.target.value } : x)))} />
                    <MoneyInput className="w-36 shrink-0" value={e.amount} onChange={(v) => setExtras(extras.map((x, j) => (j === i ? { ...x, amount: v } : x)))} />
                    <IconButton icon={Trash2} label="Quitar" tone="danger" onClick={() => setExtras(extras.filter((x) => x.id !== e.id))} />
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-sand-100 px-3 py-2.5 text-sm">
              <span className="text-stone-600">Total a repartir</span>
              <span className="num font-bold text-sage-950">{cop(total)}</span>
            </div>
            <p className="flex items-center gap-1.5 text-xs text-sage-700">
              <Check size={14} /> Los salarios se guardan y se usan en Mis finanzas, Finanzas de {juan} y el Resumen.
            </p>
            {debt.total > 0 && !extras.some((e) => e.name === 'Cuotas de deudas compartidas') && (
              <button className="text-xs font-semibold text-sage-700 underline" onClick={() => setExtras([...extras, { id: uid(), name: 'Cuotas de deudas compartidas', amount: debt.total }])}>
                + Sumar las cuotas de deudas de este mes ({cop(debt.total)})
              </button>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-3" title="Resultado" subtitle="Reparto según ingresos de lo compartido + gastos adicionales">
          {r.shares.fallback && <p className="mb-4 rounded-xl bg-sand-100 px-3 py-2 text-xs text-stone-600">Ningún ingreso registrado: {data.people[data.settings.defaultResponsible].name} queda como responsable del 100 % (se evita la división por cero).</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            {(['me', 'juan'] as PersonId[]).map((id) => {
              const income = id === 'me' ? myIncome : juanIncome
              const amount = r.split[id]
              const free = id === 'me' ? r.freeMe : r.freeJuan
              return (
                <div key={id} className="rounded-2xl border border-sage-100 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-sage-950">
                    <PersonDot id={id} /> {data.people[id].name}
                  </div>
                  <div className="num mt-3 text-4xl font-extrabold tracking-tight" style={{ color: PERSON_COLOR[id] }}>
                    {pct(r.shares[id], 2)}
                  </div>
                  <div className="mt-1 text-xs text-stone-500">de los gastos compartidos</div>
                  <div className="mt-4 space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Debe aportar</span>
                      <span className="num font-bold text-sage-950">{cop(amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Le queda disponible</span>
                      <span className={cx('num font-bold', free < 0 ? 'text-red-700' : 'text-sage-700')}>{cop(free)}</span>
                    </div>
                  </div>
                  <SplitBar income={income} amount={amount} color={PERSON_COLOR[id]} />
                </div>
              )
            })}
          </div>
          <div className="mt-5">
            <div className="mb-2 text-xs font-semibold text-stone-600">Comparación de contribuciones</div>
            <div className="flex h-9 overflow-hidden rounded-xl">
              {r.split.me > 0 && (
                <div className="grid place-items-center text-xs font-semibold text-white" style={{ width: `${r.shares.me * 100}%`, background: PERSON_COLOR.me }}>
                  {r.shares.me > 0.12 ? pct(r.shares.me, 0) : ''}
                </div>
              )}
              {r.split.juan > 0 && (
                <div className="ml-[2px] grid flex-1 place-items-center text-xs font-semibold text-white" style={{ background: PERSON_COLOR.juan }}>
                  {r.shares.juan > 0.12 ? pct(r.shares.juan, 0) : ''}
                </div>
              )}
            </div>
            <div className="mt-2">
              <Legend items={[{ label: me, color: PERSON_COLOR.me }, { label: juan, color: PERSON_COLOR.juan }]} />
            </div>
          </div>
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold text-sage-950">Escenarios de ejemplo</h2>
      <p className="-mt-2 mb-4 text-sm text-stone-500">Con el total a repartir de la calculadora ({cop(total)}).</p>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {scenarios.map((s) => (
          <Card key={s.name}>
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-sage-600">{s.name}</div>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">{me}</span>
                <span className="num font-semibold">{cop(s.mine)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-stone-500">{juan}</span>
                {s.editable ? <MoneyInput className="h-8 w-36 text-right" value={s4Juan} onChange={setS4Juan} aria-label={`Salario de ${juan} en escenario 4`} /> : <span className="num font-semibold">{cop(s.his)}</span>}
              </div>
            </div>
            <div className="my-3 h-px bg-sage-100" />
            {(['me', 'juan'] as PersonId[]).map((id) => (
              <div key={id} className="mb-2">
                <div className="flex items-center gap-2 text-sm">
                  <PersonDot id={id} />
                  <span className="font-medium">{pct(s.shares[id], 2)}</span>
                  <span className="num ml-auto font-bold">{cop(s.split[id])}</span>
                </div>
                <div className="pl-[18px] text-xs text-stone-500">
                  Le queda <span className="num">{cop(id === 'me' ? s.freeMe : s.freeJuan)}</span>
                </div>
              </div>
            ))}
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3" title="Aporte de cada uno por escenario">
          <div className="mb-2">
            <Legend items={[{ label: me, color: PERSON_COLOR.me }, { label: juan, color: PERSON_COLOR.juan }]} />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: AXIS, fontSize: 12 }} />
                <YAxis tickFormatter={copShort} tickLine={false} axisLine={false} tick={{ fill: AXIS, fontSize: 11 }} width={64} />
                <Tooltip cursor={{ fill: 'rgba(100,137,109,0.08)' }} content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload as never} label={label as string} />} />
                <Bar isAnimationActive={false} dataKey={me} fill={PERSON_COLOR.me} radius={[4, 4, 0, 0]} maxBarSize={32} />
                <Bar isAnimationActive={false} dataKey={juan} fill={PERSON_COLOR.juan} radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-2" title="¿Quién le debe a quién?" subtitle="Gastos compartidos registrados y pagos adelantados de deudas compartidas, con los porcentajes actuales">
          <div className="flex items-center gap-3 rounded-2xl bg-sage-50 p-4">
            <span className="grid size-11 place-items-center rounded-xl bg-white text-sage-600 shadow-sm">
              <Scale size={20} />
            </span>
            <div className="text-sm">
              {Math.abs(owed) < 1 ? (
                <span className="font-semibold text-sage-900">Están a paz y salvo 🤝</span>
              ) : owed > 0 ? (
                <>
                  <span className="font-semibold text-sage-900">
                    {me} le debe a {juan}
                  </span>
                  <div className="num text-xl font-bold text-sage-950">{cop(owed)}</div>
                </>
              ) : (
                <>
                  <span className="font-semibold text-sage-900">
                    {juan} le debe a {me}
                  </span>
                  <div className="num text-xl font-bold text-sage-950">{cop(-owed)}</div>
                </>
              )}
            </div>
          </div>
          <div className="mt-3 space-y-1 text-sm">
            {(['juan', 'me'] as PersonId[]).map((id) => (
              <div key={id} className="flex justify-between">
                <span className="flex items-center gap-2 text-stone-600">
                  <PersonDot id={id} /> {data.people[id].name} pagó / le tocaba
                </span>
                <span className="num font-semibold">
                  {cop(id === 'juan' ? balance.juanPaid : balance.mePaid)} / {cop(id === 'juan' ? balance.juanExpected : balance.meExpected)}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-stone-500">Mientras {me} tenga ingreso $0, le corresponde 0 %. Cuando registre salario, lo que {juan} haya adelantado en gastos compartidos se reparte con los nuevos porcentajes.</p>
        </Card>
      </div>
    </div>
  )
}

function SplitBar({ income, amount, color }: { income: number; amount: number; color: string }) {
  if (income <= 0) return <p className="mt-4 text-xs text-stone-400">Sin ingreso registrado</p>
  const ratio = Math.min(1, amount / income)
  return (
    <div className="mt-4">
      <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full bg-sage-100">
        <div className="rounded-full" style={{ width: `${ratio * 100}%`, background: color }} />
      </div>
      <div className="mt-1 text-[11px] text-stone-500">Aporta el {pct(amount / income, 0)} de su salario</div>
    </div>
  )
}

/** El acuerdo guardado: de aquí salen los aportes de las tablitas y de Gastos del hogar. */
function Agreement() {
  const { data, update, ym } = useStore()
  const split = data.settings.split
  const me = data.people.me.name
  const juan = data.people.juan.name
  const proportional = computeShares(monthIncome(data, 'me', ym), monthIncome(data, 'juan', ym), data.settings.defaultResponsible)
  const shares = sharesOf(data, ym)
  const setSplit = (fn: (s: typeof split) => void) => update((d) => fn(d.settings.split))
  const sm = personSummary(data, 'me', ym)
  const sj = personSummary(data, 'juan', ym)

  return (
    <Card className="mb-4" title="Nuestro acuerdo de reparto" subtitle={`Esto es lo que usan las tablitas de cada uno y Gastos del hogar · ${monthLabel(ym)}`}>
      <div className="space-y-5">
        <div className="max-w-2xl space-y-4">
          <Segmented
            value={split.mode}
            onChange={(mode) =>
              setSplit((s) => {
                s.mode = mode
                if (mode === 'manual') s.mePct = Math.round(proportional.me * 100)
              })
            }
            options={[
              { value: 'proporcional', label: 'Según ingresos' },
              { value: 'manual', label: 'Porcentaje acordado' },
            ]}
          />
          {split.mode === 'proporcional' ? (
            <p className="text-sm text-stone-600">
              Se calcula solo con los ingresos del mes: {me} {cop(monthIncome(data, 'me', ym))} y {juan} {cop(monthIncome(data, 'juan', ym))}.
              {proportional.fallback && ' Como nadie tiene ingresos, el responsable por defecto queda con el 100 %.'}
            </p>
          ) : (
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold" style={{ color: PERSON_COLOR.me }}>
                  {me} {split.mePct} %
                </span>
                <span className="font-semibold" style={{ color: PERSON_COLOR.juan }}>
                  {juan} {100 - split.mePct} %
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={split.mePct}
                onChange={(e) => setSplit((s) => (s.mePct = Number(e.target.value)))}
                className="w-full accent-[#a0529c]"
                aria-label={`Porcentaje de ${me}`}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Button size="sm" variant="ghost" onClick={() => setSplit((s) => (s.mePct = Math.round(proportional.me * 100)))}>
                  Igual a ingresos ({pct(proportional.me, 0)})
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSplit((s) => (s.mePct = 50))}>
                  50/50
                </Button>
              </div>
            </div>
          )}
          <div className="flex h-9 gap-[2px] overflow-hidden rounded-xl">
            {shares.me > 0 && (
              <div className="grid place-items-center text-xs font-semibold text-white" style={{ width: `${shares.me * 100}%`, background: PERSON_COLOR.me }}>
                {shares.me >= 0.12 ? pct(shares.me, 0) : ''}
              </div>
            )}
            {shares.juan > 0 && (
              <div className="grid flex-1 place-items-center text-xs font-semibold text-white" style={{ background: PERSON_COLOR.juan }}>
                {shares.juan >= 0.12 ? pct(shares.juan, 0) : ''}
              </div>
            )}
          </div>
          <p className="text-xs text-stone-500">
            Este mes: {me} aporta {cop(sm.contribution)} y {juan} {cop(sj.contribution)} (hogar, mascotas y cuotas).
          </p>
        </div>
        <CapacityCards />
      </div>
    </Card>
  )
}
