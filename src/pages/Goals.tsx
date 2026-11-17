import { useState } from 'react'
import { Flag, PiggyBank, Plus, Target, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import { essentialMonthly, goalSummary } from '../lib/finance'
import { cop, formatDate, monthLabel, pct, todayISO, uid } from '../lib/format'
import { PERSON_COLOR, SERIES } from '../lib/colors'
import { Button, Card, Field, IconButton, Modal, MoneyInput, PageHeader, PersonDot, ProgressBar, Select, StatCard, TextInput, useConfirm } from '../components/ui'
import type { Goal, GoalContribution, Payer } from '../types'

export default function Goals() {
  const { data, update, ym } = useStore()
  const confirm = useConfirm()
  const [adding, setAdding] = useState<Goal | null>(null)
  const essentials = essentialMonthly(data, ym)
  const sums = data.goals.map((g) => goalSummary(g, essentials))
  const totalSaved = sums.reduce((s, x) => s + x.saved, 0)
  const totalTarget = sums.reduce((s, x) => s + x.target, 0)
  const by = (p: Payer) => data.goals.reduce((s, g) => s + g.contributions.filter((c) => c.person === p).reduce((a, c) => a + c.amount, 0), 0)

  const edit = (id: string, fn: (g: Goal) => void) =>
    update((d) => {
      const g = d.goals.find((x) => x.id === id)
      if (g) fn(g)
    })

  return (
    <div>
      <PageHeader
        title="Ahorros y metas"
        subtitle="Definan cuánto quieren juntar, registren aportes individuales o conjuntos y vean cuándo lo lograrán."
        actions={
          <Button onClick={() => update((d) => void d.goals.push({ id: uid(), emoji: '🎯', name: 'Nueva meta', target: 0, autoMonths: null, monthlyPlan: 0, contributions: [] }))}>
            <Plus size={16} /> Nueva meta
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={PiggyBank} label="Ahorro total" value={cop(totalSaved)} hint={totalTarget ? `${pct(totalSaved / totalTarget, 0)} de ${cop(totalTarget)}` : undefined} tone="juan" />
        <StatCard icon={Target} label={`Aportado por ${data.people.juan.name}`} value={cop(by('juan'))} tone="juan" />
        <StatCard icon={Target} label={`Aportado por ${data.people.me.name}`} value={cop(by('me'))} tone="me" />
        <StatCard icon={Flag} label="Aportes conjuntos" value={cop(by('joint'))} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.goals.map((g, i) => {
          const s = sums[i]
          return (
            <Card key={g.id}>
              <div className="flex items-start gap-2">
                <input value={g.emoji} onChange={(e) => edit(g.id, (x) => (x.emoji = e.target.value))} className="w-9 bg-transparent text-center text-2xl outline-none" aria-label="Emoji" />
                <input value={g.name} onChange={(e) => edit(g.id, (x) => (x.name = e.target.value))} className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-1 font-semibold text-sage-950 outline-none hover:bg-sage-50 focus:bg-sage-50" aria-label="Nombre de la meta" />
                <IconButton
                  icon={Trash2}
                  label="Eliminar meta"
                  tone="danger"
                  onClick={async () => {
                    if (await confirm({ title: 'Eliminar meta', message: <>¿Eliminar “{g.name}” y sus {g.contributions.length} aporte(s)?</> }))
                      update((d) => {
                        d.goals = d.goals.filter((x) => x.id !== g.id)
                      })
                  }}
                />
              </div>

              <div className="mt-3 flex items-end justify-between">
                <div>
                  <div className="num text-2xl font-bold text-sage-950">{cop(s.saved)}</div>
                  <div className="text-xs text-stone-500">{s.target > 0 ? `de ${cop(s.target)}` : 'Define un monto objetivo'}</div>
                </div>
                <div className="num text-lg font-bold" style={{ color: SERIES[0] }}>
                  {pct(s.progress, 0)}
                </div>
              </div>
              <ProgressBar value={s.progress} className="mt-2 h-2.5" color={SERIES[0]} label={`Progreso de ${g.name}`} />
              <div className="mt-2 flex justify-between text-xs text-stone-500">
                <span>
                  Faltan <b className="num text-sage-950">{cop(s.remaining)}</b>
                </span>
                <span>
                  {s.target === 0
                    ? '—'
                    : s.remaining === 0
                      ? '¡Meta lograda! 🎉'
                      : s.eta
                        ? `≈ ${monthLabel(s.eta)} (${s.monthsLeft} meses)`
                        : 'Define un aporte mensual'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {g.autoMonths !== null ? (
                  <Field label="Meses de gastos esenciales" hint={`${cop(essentials)}/mes`}>
                    <Select value={g.autoMonths} onChange={(e) => edit(g.id, (x) => (x.autoMonths = Number(e.target.value)))}>
                      {[1, 2, 3, 4, 6, 9, 12].map((m) => (
                        <option key={m} value={m}>
                          {m} {m === 1 ? 'mes' : 'meses'}
                        </option>
                      ))}
                    </Select>
                  </Field>
                ) : (
                  <Field label="Monto objetivo">
                    <MoneyInput value={g.target} onChange={(v) => edit(g.id, (x) => (x.target = v))} className="h-9" />
                  </Field>
                )}
                <Field label="Aporte mensual planeado" hint={s.basis === 'promedio' ? `Usando promedio: ${cop(s.monthly)}` : undefined}>
                  <MoneyInput value={g.monthlyPlan} onChange={(v) => edit(g.id, (x) => (x.monthlyPlan = v))} className="h-9" />
                </Field>
              </div>
              {g.autoMonths !== null ? (
                <button className="mt-1 text-[11px] text-stone-400 underline" onClick={() => edit(g.id, (x) => ((x.target = s.target), (x.autoMonths = null)))}>
                  Usar un monto fijo
                </button>
              ) : (
                <button className="mt-1 text-[11px] text-stone-400 underline" onClick={() => edit(g.id, (x) => (x.autoMonths = 3))}>
                  Calcular como fondo de emergencia (meses de gastos)
                </button>
              )}

              <div className="mt-4 border-t border-sage-100 pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-stone-600">Aportes ({g.contributions.length})</span>
                  <Button size="sm" variant="secondary" onClick={() => setAdding(g)}>
                    <Plus size={14} /> Aporte
                  </Button>
                </div>
                {g.contributions.length === 0 && <p className="text-xs text-stone-400">Aún no hay aportes.</p>}
                <ul className="max-h-36 space-y-1 overflow-y-auto">
                  {[...g.contributions]
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((c) => (
                      <li key={c.id} className="group flex items-center gap-2 text-xs text-stone-600">
                        <PersonDot id={c.person} />
                        <span>{formatDate(c.date)}</span>
                        <span className="text-stone-400">{c.person === 'joint' ? 'Conjunto' : data.people[c.person].name}</span>
                        <span className={`num ml-auto font-semibold ${c.amount < 0 ? 'text-red-700' : 'text-sage-950'}`}>{cop(c.amount)}</span>
                        <button
                          className="text-stone-300 hover:text-red-600"
                          aria-label="Eliminar aporte"
                          onClick={async () => {
                            if (await confirm({ title: 'Eliminar aporte', message: <>¿Eliminar el aporte de {cop(c.amount)}?</> })) edit(g.id, (x) => (x.contributions = x.contributions.filter((y) => y.id !== c.id)))
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            </Card>
          )
        })}
      </div>

      {adding && (
        <ContributionForm
          goal={adding}
          onClose={() => setAdding(null)}
          onSave={(c) => {
            edit(adding.id, (x) => x.contributions.push(c))
            setAdding(null)
          }}
        />
      )}
    </div>
  )
}

function ContributionForm({ goal, onSave, onClose }: { goal: Goal; onSave: (c: GoalContribution) => void; onClose: () => void }) {
  const { name } = useStore()
  const [c, setC] = useState<GoalContribution>({ id: uid(), date: todayISO(), amount: 0, person: 'joint' })
  const [withdraw, setWithdraw] = useState(false)
  const [touched, setTouched] = useState(false)
  const error = c.amount <= 0 ? 'Ingresa un valor mayor a $0' : ''
  return (
    <Modal
      open
      onClose={onClose}
      title={`Aporte a “${goal.name}”`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              setTouched(true)
              if (!error) onSave({ ...c, amount: withdraw ? -c.amount : c.amount })
            }}
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Valor" error={touched ? error : ''}>
          <MoneyInput value={c.amount} onChange={(v) => setC({ ...c, amount: v })} autoFocus />
        </Field>
        <Field label="Fecha">
          <TextInput type="date" value={c.date} onChange={(e) => setC({ ...c, date: e.target.value })} />
        </Field>
        <Field label="¿Quién aporta?" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {(['juan', 'me', 'joint'] as Payer[]).map((p) => (
              <button key={p} type="button" onClick={() => setC({ ...c, person: p })} className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition ${c.person === p ? 'border-sage-500 bg-sage-50 text-sage-900' : 'border-sage-100 text-stone-500 hover:border-sage-200'}`}>
                <span className="size-2.5 rounded-full" style={{ background: PERSON_COLOR[p] }} />
                {p === 'joint' ? 'Conjunto' : name(p)}
              </button>
            ))}
          </div>
        </Field>
        <label className="flex items-center gap-2 text-sm text-stone-600 sm:col-span-2">
          <input type="checkbox" checked={withdraw} onChange={(e) => setWithdraw(e.target.checked)} className="size-4 accent-sage-700" />
          Es un retiro (sacamos dinero de esta meta)
        </label>
      </div>
    </Modal>
  )
}
