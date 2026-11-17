import { useState } from 'react'
import { CreditCard, PackageCheck, PackageOpen, Plus, Trash2, Wallet } from 'lucide-react'
import { useStore } from '../store/store'
import { cop, todayISO, uid } from '../lib/format'
import { SERIES } from '../lib/colors'
import { Badge, Button, Card, EmptyState, IconButton, MoneyInput, PageHeader, ProgressBar, StatCard, TextInput, cx, useConfirm } from '../components/ui'
import type { Payer, PurchaseStatus, SetupPurchase } from '../types'
import { emptyDebt } from './Debts'
import { navigate } from '../App'

const STATUS: Record<PurchaseStatus, { label: string; tone: 'neutral' | 'sage' | 'amber' }> = {
  presupuestado: { label: 'Presupuesto', tone: 'neutral' },
  comprado: { label: 'Comprado', tone: 'sage' },
  financiado: { label: 'A cuotas', tone: 'amber' },
}

export default function Purchases() {
  const { data, update, name } = useStore()
  const confirm = useConfirm()
  const [filter, setFilter] = useState<'all' | PurchaseStatus>('all')

  const items = data.purchases.filter((p) => filter === 'all' || p.status === filter)
  const totalBudget = data.purchases.reduce((s, p) => s + p.budget, 0)
  const bought = data.purchases.filter((p) => p.status !== 'presupuestado')
  const spent = bought.reduce((s, p) => s + (p.actual ?? p.budget), 0)
  const pendingBudget = data.purchases.filter((p) => p.status === 'presupuestado').reduce((s, p) => s + p.budget, 0)

  const edit = (id: string, fn: (p: SetupPurchase) => void) =>
    update((d) => {
      const p = d.purchases.find((x) => x.id === id)
      if (p) fn(p)
    })

  const setStatus = async (p: SetupPurchase, status: PurchaseStatus) => {
    if (status === 'financiado') {
      const ok = await confirm({
        title: 'Comprar a cuotas',
        message: <>Se creará una deuda real por {cop(p.actual ?? p.budget)} en “Deudas y cuotas” (6 cuotas sin interés para empezar; ajústala allá). ¿Continuar?</>,
        confirmLabel: 'Crear deuda',
      })
      if (!ok) return
      update((d) => {
        const x = d.purchases.find((y) => y.id === p.id)!
        x.status = 'financiado'
        x.date ||= todayISO()
        d.debts.push({ ...emptyDebt(), id: uid(), name: p.name, total: x.actual ?? x.budget, startDate: x.date, notes: 'Creada desde Compras de independencia' })
      })
      return
    }
    edit(p.id, (x) => {
      x.status = status
      if (status === 'comprado') x.date ||= todayISO()
    })
  }

  const remove = async (p: SetupPurchase) => {
    if (await confirm({ title: 'Eliminar compra', message: <>¿Eliminar “{p.name}” de la lista?</> }))
      update((d) => {
        d.purchases = d.purchases.filter((x) => x.id !== p.id)
      })
  }

  return (
    <div>
      <PageHeader
        title="Compras de independencia"
        subtitle="Gastos de una sola vez para arrancar. Son presupuestos estimados hasta que marquen “Comprado” o “A cuotas”. El depósito no cuenta como gasto mensual."
        actions={
          <Button onClick={() => update((d) => void d.purchases.push({ id: uid(), emoji: '📦', name: 'Nueva compra', budget: 0, actual: null, status: 'presupuestado', paidBy: 'juan', date: '', notes: '' }))}>
            <Plus size={16} /> Agregar
          </Button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={PackageOpen} label="Presupuesto total" value={cop(totalBudget)} hint={`${data.purchases.length} artículos`} />
        <StatCard icon={PackageCheck} label="Ya comprado / a cuotas" value={cop(spent)} hint={`${bought.length} de ${data.purchases.length}`} tone="juan" />
        <StatCard icon={Wallet} label="Falta por comprar" value={cop(pendingBudget)} tone="sand" />
        <div className="col-span-2 animate-fade-up rounded-2xl border border-sage-100 bg-white p-4 sm:p-5 lg:col-span-1">
          <div className="text-[13px] font-medium text-stone-500">Avance de la mudanza</div>
          <div className="num mt-2 text-2xl font-bold text-sage-950">
            {bought.length}/{data.purchases.length}
          </div>
          <ProgressBar value={data.purchases.length ? bought.length / data.purchases.length : 0} className="mt-3" color={SERIES[0]} label="Avance de compras" />
        </div>
      </div>

      <Card
        title="Lista de compras"
        action={
          <div className="flex flex-wrap gap-1">
            {(['all', 'presupuestado', 'comprado', 'financiado'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={cx('rounded-lg px-2.5 py-1 text-xs font-semibold', filter === f ? 'bg-sage-700 text-white' : 'text-stone-500 hover:bg-sage-50')}>
                {f === 'all' ? 'Todas' : STATUS[f].label}
              </button>
            ))}
          </div>
        }
      >
        {items.length === 0 ? (
          <EmptyState icon={PackageOpen} title="Nada por aquí" text="No hay compras con este estado." />
        ) : (
          <div className="-mx-5 overflow-x-auto px-5">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-sage-100 text-left text-xs font-semibold uppercase tracking-wide text-stone-400">
                  <th className="py-2 pr-3">Concepto</th>
                  <th className="w-36 py-2 pr-3 text-right">Presupuesto</th>
                  <th className="w-36 py-2 pr-3 text-right">Valor real</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Pagó</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {items.map((p) => {
                  const diff = p.actual !== null ? p.actual - p.budget : 0
                  return (
                    <tr key={p.id} className="border-b border-sage-50">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1.5">
                          <input value={p.emoji} onChange={(e) => edit(p.id, (x) => (x.emoji = e.target.value))} className="w-7 bg-transparent text-center outline-none" aria-label="Emoji" />
                          <input value={p.name} onChange={(e) => edit(p.id, (x) => (x.name = e.target.value))} className="w-full min-w-32 rounded-md bg-transparent px-1 py-1 font-medium text-sage-950 outline-none hover:bg-sage-50 focus:bg-sage-50" aria-label="Concepto" />
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <MoneyInput value={p.budget} onChange={(v) => edit(p.id, (x) => (x.budget = v))} className="h-8 text-right" aria-label={`Presupuesto de ${p.name}`} />
                      </td>
                      <td className="py-2 pr-3">
                        <MoneyInput value={p.actual ?? 0} placeholder="—" onChange={(v) => edit(p.id, (x) => (x.actual = v > 0 ? v : null))} className="h-8 text-right" aria-label={`Valor real de ${p.name}`} />
                        {diff !== 0 && <div className={cx('num mt-0.5 text-right text-[11px]', diff > 0 ? 'text-red-600' : 'text-sage-600')}>{diff > 0 ? `+${cop(diff)}` : cop(diff)} vs. presupuesto</div>}
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <select value={p.status} onChange={(e) => setStatus(p, e.target.value as PurchaseStatus)} className="rounded-lg border border-sage-200 bg-white px-2 py-1 text-xs outline-none" aria-label="Estado">
                            <option value="presupuestado">Presupuesto</option>
                            <option value="comprado">Comprado</option>
                            <option value="financiado">A cuotas</option>
                          </select>
                          {p.status === 'financiado' && (
                            <button onClick={() => navigate('deudas')} title="Ver en deudas" className="text-amber-700">
                              <CreditCard size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        {p.status === 'presupuestado' ? (
                          <Badge tone={STATUS[p.status].tone}>Aún no</Badge>
                        ) : (
                          <select value={p.paidBy} onChange={(e) => edit(p.id, (x) => (x.paidBy = e.target.value as Payer))} className="rounded-lg bg-transparent py-1 text-xs outline-none hover:bg-sage-50" aria-label="Pagó">
                            <option value="juan">{name('juan')}</option>
                            <option value="me">{name('me')}</option>
                            <option value="joint">Ambos</option>
                          </select>
                        )}
                      </td>
                      <td className="py-2">
                        <IconButton icon={Trash2} label="Eliminar" tone="danger" onClick={() => remove(p)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="font-bold text-sage-950">
                  <td className="pt-3">TOTAL</td>
                  <td className="num pr-3 pt-3 text-right">{cop(items.reduce((s, p) => s + p.budget, 0))}</td>
                  <td className="num pr-3 pt-3 text-right">{cop(items.reduce((s, p) => s + (p.actual ?? 0), 0))}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-stone-400">“A cuotas” crea una deuda real para no duplicar: el artículo queda aquí como referencia y el pago se controla en Deudas y cuotas.</p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {items
            .filter((p) => p.status !== 'presupuestado')
            .map((p) => (
              <TextInput key={p.id} className="h-8 text-xs" placeholder={`Nota para ${p.name} (tienda, garantía…)`} value={p.notes} onChange={(e) => edit(p.id, (x) => (x.notes = e.target.value))} />
            ))}
        </div>
      </Card>
    </div>
  )
}
