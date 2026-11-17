import { useState } from 'react'
import { CalendarCheck, CheckCircle2, CreditCard, FlaskConical, HandCoins, Minus, Pencil, Plus, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import { computeInstallment, debtSplit, debtTotal, monthlyDebtLoad, monthlyRate, realDebtBalance, sharesOf, summarizeDebt } from '../lib/finance'
import { cop, formatDate, pct, todayISO, uid } from '../lib/format'
import { REFERENCE, SERIES } from '../lib/colors'
import { Badge, Button, Card, EmptyState, Field, IconButton, Modal, MoneyInput, PageHeader, PersonDot, ProgressBar, Segmented, Select, StatCard, TextInput, useConfirm } from '../components/ui'
import type { Advance, Debt, DebtKind, DebtStatus, PersonId, RateType, Responsible } from '../types'

export function emptyDebt(): Debt {
  return {
    id: '',
    name: '',
    kind: 'real',
    total: 0,
    items: [],
    responsible: 'shared',
    splitMode: 'proportional',
    startDate: todayISO(),
    installments: 6,
    rate: 0,
    rateType: 'mensual',
    customInstallment: null,
    paidInstallments: 0,
    status: 'activa',
    advances: [],
    notes: '',
  }
}

export default function Debts() {
  const { data, update, ym } = useStore()
  const confirm = useConfirm()
  const [editing, setEditing] = useState<Debt | null>(null)
  const [advanceFor, setAdvanceFor] = useState<Debt | null>(null)
  const shares = sharesOf(data, ym)
  const real = data.debts.filter((d) => d.kind === 'real')
  const sims = data.debts.filter((d) => d.kind === 'simulacion')
  const load = monthlyDebtLoad(data.debts, ym, shares)

  const save = (d: Debt) => {
    update((x) => {
      if (d.id) x.debts = x.debts.map((y) => (y.id === d.id ? d : y))
      else x.debts.push({ ...d, id: uid() })
    })
    setEditing(null)
  }
  const patch = (id: string, fn: (d: Debt) => void) =>
    update((x) => {
      const d = x.debts.find((y) => y.id === id)
      if (d) fn(d)
    })
  const remove = async (d: Debt) => {
    if (await confirm({ title: 'Eliminar deuda', message: <>¿Eliminar “{d.name}” con sus pagos adelantados? No se puede deshacer.</> }))
      update((x) => {
        x.debts = x.debts.filter((y) => y.id !== d.id)
      })
  }
  const makeReal = async (d: Debt) => {
    if (await confirm({ title: 'Convertir en deuda real', message: 'Úsalo solo si ya hicieron la compra a cuotas. Pasará a sumar en deudas pendientes y cuotas del mes.', confirmLabel: 'Sí, es real' }))
      patch(d.id, (x) => {
        x.kind = 'real'
        x.status = 'activa'
        x.name = x.name.replace(/\s*\(simulación\)/i, '')
      })
  }

  const list = (debts: Debt[]) => (
    <div className="grid gap-4 xl:grid-cols-2">
      {debts.map((d) => (
        <DebtCard
          key={d.id}
          debt={d}
          onEdit={() => setEditing(d)}
          onDelete={() => remove(d)}
          onPay={(delta) => patch(d.id, (x) => (x.paidInstallments = Math.max(0, Math.min(x.installments, x.paidInstallments + delta))))}
          onAdvance={() => setAdvanceFor(d)}
          onMakeReal={() => makeReal(d)}
          onRemoveAdvance={async (a) => {
            if (await confirm({ title: 'Eliminar pago adelantado', message: <>¿Eliminar el adelanto de {cop(a.amount)}?</> })) patch(d.id, (x) => (x.advances = x.advances.filter((y) => y.id !== a.id)))
          }}
        />
      ))}
    </div>
  )

  return (
    <div>
      <PageHeader
        title="Deudas y cuotas"
        subtitle="Separamos lo que de verdad se debe de lo que solo estamos simulando. Las simulaciones nunca suman a los totales."
        actions={
          <>
            <Button variant="secondary" onClick={() => setEditing({ ...emptyDebt(), kind: 'simulacion', status: 'pendiente' })}>
              <FlaskConical size={16} /> Simular
            </Button>
            <Button onClick={() => setEditing(emptyDebt())}>
              <Plus size={16} /> Deuda real
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={CreditCard} label="Saldo de deudas reales" value={cop(realDebtBalance(data.debts))} tone="red" />
        <StatCard icon={CalendarCheck} label="Cuotas de este mes" value={cop(load.total)} hint={`${data.people.juan.name} ${cop(load.juan)} · ${data.people.me.name} ${cop(load.me)}`} tone="amber" />
        <StatCard icon={CheckCircle2} label="Deudas pagadas" value={String(real.filter((d) => summarizeDebt(d).status === 'pagada').length)} />
        <StatCard icon={FlaskConical} label="En simulación" value={cop(sims.reduce((s, d) => s + debtTotal(d), 0))} hint="Presupuesto, no deuda" tone="sand" />
      </div>

      <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-sage-950">Deudas reales</h2>
      {real.length === 0 ? (
        <EmptyState icon={CreditCard} title="No hay deudas reales" text="Cuando compren algo a cuotas, regístrenlo aquí o conviertan una simulación en deuda real." />
      ) : (
        list(real)
      )}

      <h2 className="mb-3 mt-8 flex items-center gap-2 text-lg font-bold text-sage-950">
        Simulaciones <Badge tone="sand">no suman</Badge>
      </h2>
      {sims.length === 0 ? <EmptyState icon={FlaskConical} title="Sin simulaciones" text="Prueben un plan de cuotas antes de comprometerse." /> : list(sims)}

      {editing && <DebtForm initial={editing} onSave={save} onClose={() => setEditing(null)} />}
      {advanceFor && (
        <AdvanceForm
          debt={advanceFor}
          onClose={() => setAdvanceFor(null)}
          onSave={(a) => {
            patch(advanceFor.id, (x) => x.advances.push(a))
            setAdvanceFor(null)
          }}
        />
      )}
    </div>
  )
}

function DebtCard({ debt: d, onEdit, onDelete, onPay, onAdvance, onMakeReal, onRemoveAdvance }: { debt: Debt; onEdit: () => void; onDelete: () => void; onPay: (delta: number) => void; onAdvance: () => void; onMakeReal: () => void; onRemoveAdvance: (a: Advance) => void }) {
  const { data, name, ym } = useStore()
  const s = summarizeDebt(d)
  const split = debtSplit(d, s.installment, sharesOf(data, ym))
  const isSim = d.kind === 'simulacion'
  const statusTone = s.status === 'pagada' ? 'sage' : s.status === 'activa' ? 'amber' : 'neutral'

  return (
    <Card className={isSim ? 'border-dashed border-sand-300 bg-sand-50/60' : ''}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold text-sage-950">{d.name}</h3>
            {isSim ? <Badge tone="sand">Simulación</Badge> : <Badge tone="red">Deuda real</Badge>}
            <Badge tone={statusTone}>{s.status}</Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
            <span className="inline-flex items-center gap-1.5">
              {d.responsible !== 'shared' && <PersonDot id={d.responsible} />}
              {d.responsible === 'shared' ? `Compartida · ${d.splitMode === 'proportional' ? 'proporcional a ingresos' : '50/50'}` : `Paga ${name(d.responsible)}`}
            </span>
            <span>Desde {formatDate(d.startDate)}</span>
            <span>{d.rate > 0 ? `${pct(d.rate / 100, 2)} ${d.rateType === 'ea' ? 'E.A.' : 'mensual'}` : 'Sin intereses'}</span>
          </div>
        </div>
        <div className="flex shrink-0">
          <IconButton icon={Pencil} label="Editar" onClick={onEdit} />
          <IconButton icon={Trash2} label="Eliminar" tone="danger" onClick={onDelete} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Mini label="Valor total" value={cop(s.total)} />
        <Mini label="Cuota mensual" value={cop(s.installment)} />
        <Mini label="Saldo restante" value={cop(s.balance)} />
        <Mini label="Termina" value={formatDate(s.endDate)} />
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs text-stone-500">
          <span>
            <b className="text-sage-950">{s.paid}</b> pagadas · <b className="text-sage-950">{s.pending}</b> pendientes de {d.installments}
          </span>
          <span className="num">{pct(s.progress, 0)}</span>
        </div>
        <ProgressBar value={s.progress} color={isSim ? REFERENCE : SERIES[0]} className="h-2.5" label={`Progreso de ${d.name}`} />
      </div>

      {d.responsible === 'shared' && s.installment > 0 && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-600">
          {(['juan', 'me'] as PersonId[]).map((id) => (
            <span key={id} className="inline-flex items-center gap-1.5">
              <PersonDot id={id} /> {name(id)}: <b className="num">{cop(split[id])}</b>/mes
            </span>
          ))}
        </div>
      )}
      {s.interestCost > 0 && <p className="mt-2 text-xs text-amber-700">Pagarán {cop(s.totalToPay)} en total: {cop(s.interestCost)} son intereses.</p>}
      {d.items.length > 0 && <p className="mt-2 text-xs text-stone-500">Incluye: {d.items.map((i) => `${i.name} (${cop(i.amount)})`).join(', ')}</p>}
      {d.notes && <p className="mt-1 text-xs italic text-stone-400">{d.notes}</p>}

      {d.advances.length > 0 && (
        <div className="mt-3 rounded-xl bg-sage-50 p-3">
          <div className="mb-1 text-xs font-semibold text-sage-800">Pagos adelantados</div>
          {d.advances.map((a) => (
            <div key={a.id} className="flex items-center gap-2 text-xs text-stone-600">
              <PersonDot id={a.paidBy} /> {formatDate(a.date)} · {name(a.paidBy)} {a.note && `· ${a.note}`}
              <span className="num ml-auto font-semibold">{cop(a.amount)}</span>
              <button className="text-stone-400 hover:text-red-600" onClick={() => onRemoveAdvance(a)} aria-label="Eliminar adelanto">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {isSim ? (
          <Button size="sm" variant="secondary" onClick={onMakeReal}>
            <CheckCircle2 size={14} /> Ya la tomamos: convertir en real
          </Button>
        ) : (
          <>
            <Button size="sm" variant="secondary" onClick={() => onPay(1)} disabled={s.pending === 0}>
              <Plus size={14} /> Cuota pagada
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onPay(-1)} disabled={s.paid === 0} aria-label="Restar cuota pagada">
              <Minus size={14} />
            </Button>
            <Button size="sm" variant="ghost" onClick={onAdvance} disabled={s.status === 'pagada'}>
              <HandCoins size={14} /> Pago adelantado
            </Button>
          </>
        )}
      </div>
    </Card>
  )
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-stone-400">{label}</div>
      <div className="num text-sm font-bold text-sage-950">{value}</div>
    </div>
  )
}

function DebtForm({ initial, onSave, onClose }: { initial: Debt; onSave: (d: Debt) => void; onClose: () => void }) {
  const { name } = useStore()
  const [d, setD] = useState<Debt>(initial)
  const [touched, setTouched] = useState(false)
  const set = <K extends keyof Debt>(k: K, v: Debt[K]) => setD((x) => ({ ...x, [k]: v }))
  const total = debtTotal(d)
  const suggested = Math.round(computeInstallment(total, monthlyRate(d), d.installments))
  const errors = {
    name: !d.name.trim() ? 'Ponle un nombre' : '',
    total: total <= 0 ? 'El valor debe ser mayor a $0' : '',
    installments: d.installments < 1 ? 'Mínimo 1 cuota' : '',
    paid: d.paidInstallments > d.installments ? 'No puede superar el número de cuotas' : '',
  }
  const valid = Object.values(errors).every((e) => !e)

  return (
    <Modal
      open
      wide
      onClose={onClose}
      title={initial.id ? 'Editar deuda' : d.kind === 'simulacion' ? 'Nueva simulación' : 'Nueva deuda real'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              setTouched(true)
              if (valid) onSave({ ...d, name: d.name.trim(), total })
            }}
          >
            Guardar
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="¿Es real o simulación?" className="sm:col-span-2" hint={d.kind === 'simulacion' ? 'Simulación: solo para planear, no suma a deudas ni cuotas.' : 'Real: ya existe la deuda; suma a los totales.'}>
          <Segmented<DebtKind>
            value={d.kind}
            onChange={(v) => set('kind', v)}
            options={[
              { value: 'real', label: 'Deuda real' },
              { value: 'simulacion', label: 'Simulación' },
            ]}
          />
        </Field>
        <Field label="Nombre de la compra" className="sm:col-span-2" error={touched ? errors.name : ''}>
          <TextInput value={d.name} onChange={(e) => set('name', e.target.value)} placeholder="Ej.: Nevera a cuotas" autoFocus />
        </Field>

        <div className="sm:col-span-2">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-600">Artículos incluidos (opcional)</span>
            <Button size="sm" variant="ghost" onClick={() => set('items', [...d.items, { id: uid(), name: '', amount: 0 }])}>
              <Plus size={14} /> Artículo
            </Button>
          </div>
          {d.items.map((it, i) => (
            <div key={it.id} className="mb-2 flex gap-2">
              <TextInput value={it.name} placeholder="Artículo" onChange={(e) => set('items', d.items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <MoneyInput className="w-36 shrink-0" value={it.amount} onChange={(v) => set('items', d.items.map((x, j) => (j === i ? { ...x, amount: v } : x)))} />
              <IconButton icon={Trash2} label="Quitar" tone="danger" onClick={() => set('items', d.items.filter((x) => x.id !== it.id))} />
            </div>
          ))}
        </div>

        <Field label="Valor total" error={touched ? errors.total : ''} hint={d.items.length ? 'Se calcula con los artículos' : undefined}>
          {d.items.length ? <div className="num flex h-10 items-center rounded-xl bg-sage-50 px-3 text-sm font-semibold">{cop(total)}</div> : <MoneyInput value={d.total} onChange={(v) => set('total', v)} />}
        </Field>
        <Field label="Fecha de adquisición">
          <TextInput type="date" value={d.startDate} onChange={(e) => set('startDate', e.target.value)} />
        </Field>
        <Field label="Responsable del pago">
          <Select value={d.responsible} onChange={(e) => set('responsible', e.target.value as Responsible)}>
            <option value="shared">Compartida</option>
            <option value="juan">{name('juan')}</option>
            <option value="me">{name('me')}</option>
          </Select>
        </Field>
        {d.responsible === 'shared' ? (
          <Field label="¿Cómo se reparte?">
            <Select value={d.splitMode} onChange={(e) => set('splitMode', e.target.value as Debt['splitMode'])}>
              <option value="proportional">Proporcional a ingresos</option>
              <option value="equal">50/50</option>
            </Select>
          </Field>
        ) : (
          <div className="hidden sm:block" />
        )}
        <Field label="Número de cuotas" error={touched ? errors.installments : ''}>
          <TextInput type="number" min={1} max={120} value={d.installments} onChange={(e) => set('installments', Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
        </Field>
        <Field label="Cuotas pagadas" error={touched ? errors.paid : ''}>
          <TextInput type="number" min={0} value={d.paidInstallments} onChange={(e) => set('paidInstallments', Math.max(0, Math.floor(Number(e.target.value) || 0)))} />
        </Field>
        <Field label="Interés (%)" hint="Usa 0 si es sin intereses">
          <div className="flex gap-2">
            <TextInput type="number" min={0} step="0.01" value={d.rate} onChange={(e) => set('rate', Math.max(0, Number(e.target.value) || 0))} />
            <Select value={d.rateType} onChange={(e) => set('rateType', e.target.value as RateType)} className="w-36 shrink-0">
              <option value="mensual">Mensual</option>
              <option value="ea">Efectiva anual</option>
            </Select>
          </div>
        </Field>
        <Field label="Valor de la cuota" hint={`Calculada: ${cop(suggested)}. Escribe otra si el banco te dio un valor distinto.`}>
          <MoneyInput value={d.customInstallment ?? 0} placeholder={cop(suggested)} onChange={(v) => set('customInstallment', v > 0 ? v : null)} />
        </Field>
        <Field label="Estado">
          <Select value={d.status} onChange={(e) => set('status', e.target.value as DebtStatus)}>
            <option value="pendiente">Pendiente (aún no empieza)</option>
            <option value="activa">Activa</option>
            <option value="pagada">Pagada</option>
          </Select>
        </Field>
        <Field label="Notas">
          <TextInput value={d.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Opcional" />
        </Field>
      </div>
    </Modal>
  )
}

function AdvanceForm({ debt, onSave, onClose }: { debt: Debt; onSave: (a: Advance) => void; onClose: () => void }) {
  const { name } = useStore()
  const [a, setA] = useState<Advance>({ id: uid(), date: todayISO(), amount: 0, paidBy: 'juan', note: '' })
  const [touched, setTouched] = useState(false)
  const balance = summarizeDebt(debt).balance
  const error = a.amount <= 0 ? 'Ingresa un valor' : a.amount > balance ? `No puede superar el saldo (${cop(balance)})` : ''
  return (
    <Modal
      open
      onClose={onClose}
      title="Registrar pago adelantado"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => {
              setTouched(true)
              if (!error) onSave(a)
            }}
          >
            Guardar
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-stone-600">
        Úsalo cuando uno de los dos paga por adelantado una deuda {debt.responsible === 'shared' ? 'compartida' : ''}. Reduce el saldo de “{debt.name}” sin crear una deuda nueva
        {debt.responsible === 'shared' ? ', y queda registrado en “¿Quién le debe a quién?”' : ''}.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Valor" error={touched ? error : ''}>
          <MoneyInput value={a.amount} onChange={(v) => setA({ ...a, amount: v })} autoFocus />
        </Field>
        <Field label="Fecha">
          <TextInput type="date" value={a.date} onChange={(e) => setA({ ...a, date: e.target.value })} />
        </Field>
        <Field label="¿Quién pagó?">
          <Select value={a.paidBy} onChange={(e) => setA({ ...a, paidBy: e.target.value as PersonId })}>
            <option value="juan">{name('juan')}</option>
            <option value="me">{name('me')}</option>
          </Select>
        </Field>
        <Field label="Nota">
          <TextInput value={a.note} onChange={(e) => setA({ ...a, note: e.target.value })} placeholder="Opcional" />
        </Field>
      </div>
    </Modal>
  )
}
