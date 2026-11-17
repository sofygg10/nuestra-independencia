import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, Briefcase, FlaskConical, PiggyBank, RotateCcw, Save, Star, Trash2, TrendingUp, Wrench, CreditCard, type LucideIcon } from 'lucide-react'
import { useStore } from '../store/store'
import { budgetTotals, monthIncome, monthlyDebtLoad, personalPlan, runScenario, sharesOf } from '../lib/finance'
import { cop, copShort, pct, uid } from '../lib/format'
import { AXIS, GRID, PERSON_COLOR } from '../lib/colors'
import { Button, Card, ChartTooltip, EmptyState, Field, IconButton, Legend, MoneyInput, PageHeader, TextInput, cx, useConfirm } from '../components/ui'
import type { Scenario } from '../types'

export default function Simulator() {
  const { data, update, ym } = useStore()
  const confirm = useConfirm()
  const baseline: Scenario = useMemo(() => {
    const planM = personalPlan(data, 'me', ym)
    const planJ = personalPlan(data, 'juan', ym)
    return {
      id: 'actual',
      name: 'Situación actual',
      myIncome: monthIncome(data, 'me', ym),
      juanIncome: monthIncome(data, 'juan', ym),
      sharedExpenses: budgetTotals(data.budget).total,
      debtInstallments: monthlyDebtLoad(data.debts, ym, sharesOf(data, ym)).total,
      monthlySavings: planM.savings + planJ.savings + data.goals.reduce((s, g) => s + g.monthlyPlan, 0),
      myPersonal: planM.expenses,
      juanPersonal: planJ.expenses,
    }
  }, [data, ym])
  const services = data.budget.filter((b) => b.category === 'Servicios').reduce((s, b) => s + b.amount, 0)
  const simDebt = data.debts.filter((d) => d.kind === 'simulacion')

  // El borrador se guarda en los datos, así no se pierde al cambiar de página.
  const draft: Scenario = data.settings.simDraft?.scenario ?? { ...baseline, id: '', name: '' }
  const label = data.settings.simDraft?.labels ?? []
  const saveDraft = (scenario: Scenario | null, labels: string[] = []) => update((d) => void (d.settings.simDraft = scenario ? { scenario, labels } : null))
  const set = <K extends keyof Scenario>(k: K, v: Scenario[K]) => saveDraft({ ...draft, [k]: v }, label)
  const apply = (name: string, fn: (s: Scenario) => Partial<Scenario>) => saveDraft({ ...draft, ...fn(draft) }, label.includes(name) ? label : [...label, name])
  const [applied, setApplied] = useState(false)
  const applyIncomes = async () => {
    if (
      !(await confirm({
        title: 'Usar estos ingresos de verdad',
        message: (
          <>
            Se guardará {data.people.me.name}: {cop(draft.myIncome)} y {data.people.juan.name}: {cop(draft.juanIncome)} como sus ingresos reales, y se recalculan los aportes en todas partes.
          </>
        ),
        confirmLabel: 'Sí, guardar',
      }))
    )
      return
    update((d) => {
      d.people.me.income = draft.myIncome
      d.people.juan.income = draft.juanIncome
      for (const id of ['me', 'juan'] as const) {
        const sheet = d.people[id].months[ym]
        if (sheet && sheet.income !== null) sheet.income = id === 'me' ? draft.myIncome : draft.juanIncome
      }
    })
    setApplied(true)
    setTimeout(() => setApplied(false), 2500)
  }

  const me = data.people.me.name
  const juan = data.people.juan.name
  const presets: { icon: LucideIcon; text: string; fn: (s: Scenario) => Partial<Scenario> }[] = [
    { icon: Briefcase, text: `${me} consigue trabajo de $3 M`, fn: () => ({ myIncome: 3_000_000 }) },
    { icon: Briefcase, text: `${me} consigue trabajo de $4 M`, fn: () => ({ myIncome: 4_000_000 }) },
    { icon: TrendingUp, text: `${juan} recibe un aumento del 10 %`, fn: (s) => ({ juanIncome: Math.round(s.juanIncome * 1.1) }) },
    { icon: CreditCard, text: 'terminamos de pagar las deudas', fn: () => ({ debtInstallments: 0 }) },
    { icon: Wrench, text: 'los servicios suben un 20 %', fn: (s) => ({ sharedExpenses: s.sharedExpenses + Math.round(services * 0.2) }) },
    { icon: PiggyBank, text: 'ahorramos $300.000 más al mes', fn: (s) => ({ monthlySavings: s.monthlySavings + 300_000 }) },
  ]

  const base = runScenario(baseline, data.settings.defaultResponsible)
  const r = runScenario(draft, data.settings.defaultResponsible)
  const all = [baseline, ...data.scenarios]
  const results = all.map((s) => ({ s, r: runScenario(s, data.settings.defaultResponsible) }))
  const chart = results.map(({ s, r }) => ({ name: s.name, [me]: r.me.free, [juan]: r.juan.free }))

  const save = () => {
    const name = draft.name.trim() || label.join(' + ') || `Escenario ${data.scenarios.length + 1}`
    update((d) => {
      d.scenarios.push({ ...draft, id: uid(), name })
      d.settings.simDraft = null
    })
  }

  return (
    <div>
      <PageHeader title="Simulador financiero" subtitle="Jueguen con “¿qué pasaría si…?” sin tocar sus datos reales. Lo que armen se conserva aunque salgan de la página; guarden los favoritos para compararlos." />

      <div className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {presets.map((p) => (
          <button key={p.text} onClick={() => apply(p.text, p.fn)} className={cx('flex items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left text-sm font-medium transition hover:-translate-y-0.5 hover:shadow-md', label.includes(p.text) ? 'border-sage-500 ring-4 ring-sage-100' : 'border-sage-100')}>
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-sage-100 text-sage-700">
              <p.icon size={17} />
            </span>
            ¿Qué pasa si {p.text}?
          </button>
        ))}
      </div>
      {simDebt.length > 0 && baseline.debtInstallments === 0 && (
        <button className="mb-4 text-xs font-semibold text-sage-700 underline" onClick={() => apply('Financiamos las compras', (s) => ({ debtInstallments: s.debtInstallments + simDebt.reduce((t, d) => t + Math.round(d.total / Math.max(1, d.installments)), 0) }))}>
          + Incluir la cuota de la simulación “{simDebt[0].name}”
        </button>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <Card
          className="lg:col-span-2"
          title="Escenario en construcción"
          subtitle={label.length ? label.join(' · ') : 'Parte de la situación actual'}
          action={
            <IconButton
              icon={RotateCcw}
              label="Reiniciar"
              onClick={() => saveDraft(null)}
            />
          }
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Ingreso de ${me}`}>
              <MoneyInput value={draft.myIncome} onChange={(v) => set('myIncome', v)} />
            </Field>
            <Field label={`Ingreso de ${juan}`}>
              <MoneyInput value={draft.juanIncome} onChange={(v) => set('juanIncome', v)} />
            </Field>
            <Field label="Gastos compartidos">
              <MoneyInput value={draft.sharedExpenses} onChange={(v) => set('sharedExpenses', v)} />
            </Field>
            <Field label="Cuotas de deudas">
              <MoneyInput value={draft.debtInstallments} onChange={(v) => set('debtInstallments', v)} />
            </Field>
            <Field label="Ahorro mensual">
              <MoneyInput value={draft.monthlySavings} onChange={(v) => set('monthlySavings', v)} />
            </Field>
            <div />
            <Field label={`Gastos personales ${me}`}>
              <MoneyInput value={draft.myPersonal} onChange={(v) => set('myPersonal', v)} />
            </Field>
            <Field label={`Gastos personales ${juan}`}>
              <MoneyInput value={draft.juanPersonal} onChange={(v) => set('juanPersonal', v)} />
            </Field>
          </div>
          <div className="mt-4 flex gap-2">
            <TextInput placeholder="Nombre del escenario" value={draft.name} onChange={(e) => set('name', e.target.value)} />
            <Button onClick={save} className="shrink-0">
              <Save size={16} /> Guardar
            </Button>
          </div>
          <Button variant="secondary" size="sm" className="mt-2 w-full" onClick={applyIncomes} disabled={draft.myIncome === baseline.myIncome && draft.juanIncome === baseline.juanIncome}>
            {applied ? '✓ Ingresos guardados' : 'Usar estos ingresos en nuestras finanzas reales'}
          </Button>
          <p className="mt-2 text-xs text-stone-400">Compartidos, cuotas y ahorro se reparten proporcionalmente a los ingresos.</p>
        </Card>

        <Card className="lg:col-span-3" title="Resultado frente a hoy">
          <div className="grid gap-3 sm:grid-cols-2">
            <Delta label="Ingresos conjuntos" now={base.totalIncome} next={r.totalIncome} />
            <Delta label="Disponible conjunto" now={base.available} next={r.available} />
            <Delta label={`Libre para ${me}`} now={base.me.free} next={r.me.free} dot={PERSON_COLOR.me} />
            <Delta label={`Libre para ${juan}`} now={base.juan.free} next={r.juan.free} dot={PERSON_COLOR.juan} />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-4 rounded-2xl bg-sage-50 p-4 text-sm sm:grid-cols-4">
            <KV label={`% ${me}`} value={pct(r.shares.me, 1)} />
            <KV label={`% ${juan}`} value={pct(r.shares.juan, 1)} />
            <KV label={`Aporte ${me}`} value={cop(r.me.contribution)} />
            <KV label={`Aporte ${juan}`} value={cop(r.juan.contribution)} />
            <KV label="Total compromisos" value={cop(r.totalOut)} />
            <KV label="Tasa de ahorro" value={pct(r.savingsRate, 1)} />
          </div>
          {r.available < 0 && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">En este escenario los gastos superan los ingresos por {cop(-r.available)}.</p>}
        </Card>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold text-sage-950">Comparación de escenarios</h2>
      {data.scenarios.length === 0 ? (
        <EmptyState icon={Star} title="Aún no hay escenarios guardados" text="Arma un escenario arriba y guárdalo para compararlo con la situación actual." />
      ) : (
        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-2" title="Dinero libre de cada uno">
            <Legend items={[{ label: me, color: PERSON_COLOR.me }, { label: juan, color: PERSON_COLOR.juan }]} />
            <div className="mt-2 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid stroke={GRID} vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: AXIS, fontSize: 11 }} interval={0} tickFormatter={(v: string) => (v.length > 14 ? v.slice(0, 13) + '…' : v)} />
                  <YAxis tickFormatter={copShort} tickLine={false} axisLine={false} tick={{ fill: AXIS, fontSize: 11 }} width={64} />
                  <Tooltip cursor={{ fill: 'rgba(100,137,109,0.08)' }} content={({ active, payload, label }) => <ChartTooltip active={active} payload={payload as never} label={label as string} />} />
                  <Bar isAnimationActive={false} dataKey={me} fill={PERSON_COLOR.me} radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar isAnimationActive={false} dataKey={juan} fill={PERSON_COLOR.juan} radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="lg:col-span-3" title="Tabla comparativa">
            <div className="-mx-5 overflow-x-auto px-5">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-sage-100 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">
                    <th className="py-2 pr-3">Escenario</th>
                    <th className="py-2 pr-3 text-right">Ingresos</th>
                    <th className="py-2 pr-3 text-right">% {me}</th>
                    <th className="py-2 pr-3 text-right">Libre {me}</th>
                    <th className="py-2 pr-3 text-right">Libre {juan}</th>
                    <th className="py-2 pr-3 text-right">Disponible</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {results.map(({ s, r }) => (
                    <tr key={s.id} className={cx('border-b border-sage-50', s.id === 'actual' && 'bg-sand-50')}>
                      <td className="py-2.5 pr-3 font-medium text-sage-950">
                        {s.id === 'actual' ? <FlaskConical size={13} className="mr-1 inline text-stone-400" /> : <Star size={13} className="mr-1 inline text-amber-500" />}
                        {s.name}
                      </td>
                      <td className="num py-2.5 pr-3 text-right">{cop(r.totalIncome)}</td>
                      <td className="num py-2.5 pr-3 text-right">{pct(r.shares.me, 1)}</td>
                      <td className={cx('num py-2.5 pr-3 text-right', r.me.free < 0 && 'text-red-700')}>{cop(r.me.free)}</td>
                      <td className={cx('num py-2.5 pr-3 text-right', r.juan.free < 0 && 'text-red-700')}>{cop(r.juan.free)}</td>
                      <td className={cx('num py-2.5 pr-3 text-right font-bold', r.available < 0 ? 'text-red-700' : 'text-sage-800')}>{cop(r.available)}</td>
                      <td>
                        {s.id !== 'actual' && (
                          <IconButton
                            icon={Trash2}
                            label="Eliminar escenario"
                            tone="danger"
                            onClick={async () => {
                              if (await confirm({ title: 'Eliminar escenario', message: <>¿Eliminar “{s.name}”?</> }))
                                update((d) => {
                                  d.scenarios = d.scenarios.filter((x) => x.id !== s.id)
                                })
                            }}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}

function Delta({ label, now, next, dot }: { label: string; now: number; next: number; dot?: string }) {
  const diff = next - now
  return (
    <div className="rounded-2xl border border-sage-100 p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-stone-500">
        {dot && <span className="size-2.5 rounded-full" style={{ background: dot }} />}
        {label}
      </div>
      <div className={cx('num mt-1 text-xl font-bold', next < 0 ? 'text-red-700' : 'text-sage-950')}>{cop(next)}</div>
      <div className={cx('mt-0.5 flex items-center gap-1 text-xs font-semibold', diff > 0 ? 'text-sage-700' : diff < 0 ? 'text-red-700' : 'text-stone-400')}>
        {diff > 0 ? <ArrowUpRight size={14} /> : diff < 0 ? <ArrowDownRight size={14} /> : null}
        {diff === 0 ? 'Sin cambio' : `${diff > 0 ? '+' : ''}${cop(diff)} vs. hoy`}
      </div>
    </div>
  )
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-stone-500">{label}</div>
      <div className="num font-bold text-sage-950">{value}</div>
    </div>
  )
}
