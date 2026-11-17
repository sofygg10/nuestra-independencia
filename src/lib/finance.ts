/**
 * Cálculos financieros puros. Nada de React aquí: todo recibe datos y devuelve números,
 * para que la interfaz solo se encargue de mostrar.
 */
import type { AppData, BudgetItem, Debt, Goal, Movement, PersonId, Scenario } from '../types'

// ───────────────────────── Aportes proporcionales ─────────────────────────

export interface Shares {
  me: number
  juan: number
  /** true cuando nadie tiene ingresos y se usa el responsable por defecto */
  fallback: boolean
}

/** Porcentaje individual = ingreso individual / ingresos conjuntos (sin dividir por cero). */
export function computeShares(myIncome: number, juanIncome: number, defaultResponsible: PersonId = 'juan'): Shares {
  const me = Math.max(0, myIncome || 0)
  const juan = Math.max(0, juanIncome || 0)
  const total = me + juan
  if (total <= 0) {
    return defaultResponsible === 'juan' ? { me: 0, juan: 1, fallback: true } : { me: 1, juan: 0, fallback: true }
  }
  return { me: me / total, juan: juan / total, fallback: false }
}

/** Ingreso de una persona en un mes: el de su tablita si lo puso, si no el ingreso base. */
export function monthIncome(data: AppData, id: PersonId, ym?: string): number {
  const p = data.people[id]
  const own = ym ? p.months?.[ym]?.income : null
  return own ?? p.income
}

/** Reparto acordado en “Aportes proporcionales”: según ingresos o un porcentaje fijo. */
export function sharesOf(data: AppData, ym?: string): Shares {
  const split = data.settings.split
  if (split?.mode === 'manual') {
    const me = Math.min(100, Math.max(0, split.mePct || 0)) / 100
    return { me, juan: 1 - me, fallback: false }
  }
  return computeShares(monthIncome(data, 'me', ym), monthIncome(data, 'juan', ym), data.settings.defaultResponsible)
}

/** Lo que cada persona planea gastar/ahorrar para sí en el mes, según su tablita. */
export function personalPlan(data: AppData, id: PersonId, ym: string) {
  const p = data.people[id]
  const sheet = p.months?.[ym]
  if (!sheet) return { hasSheet: false, expenses: p.personalExpenses, savings: p.personalSavings, spentExpenses: 0, spentSavings: 0 }
  const sum = (kind: string, f: 'planned' | 'spent') => sheet.lines.filter((l) => l.kind === kind).reduce((t, l) => t + (l[f] || 0), 0)
  return { hasSheet: true, expenses: sum('gasto', 'planned'), savings: sum('ahorro', 'planned'), spentExpenses: sum('gasto', 'spent'), spentSavings: sum('ahorro', 'spent') }
}

/** Aporte individual = gastos compartidos × porcentaje individual. Redondeado a pesos y sin “peso perdido”. */
export function splitAmount(amount: number, shares: Shares): { me: number; juan: number } {
  const me = Math.round(amount * shares.me)
  return { me, juan: Math.round(amount) - me }
}

// ───────────────────────── Presupuesto mensual ─────────────────────────

export function budgetItemAmount(item: BudgetItem): number {
  if (item.subitems && item.subitems.length > 0) return item.subitems.reduce((s, x) => s + (x.amount || 0), 0)
  return item.amount || 0
}

export function budgetTotals(budget: BudgetItem[]) {
  let total = 0
  let pets = 0
  for (const item of budget) {
    const a = budgetItemAmount(item)
    total += a
    if (item.category === 'Mascotas') pets += a
  }
  return { total, pets, household: total - pets }
}

/**
 * Cuánto del presupuesto del hogar le toca a cada uno: lo asignado a una sola persona
 * va completo a ella; lo compartido se reparte según el acuerdo.
 */
export function budgetSplit(data: AppData, ym?: string) {
  const shares = sharesOf(data, ym)
  const blank = () => ({ household: 0, pets: 0, own: 0 })
  const r = { me: blank(), juan: blank(), sharedTotal: 0 }
  for (const item of data.budget) {
    const a = budgetItemAmount(item)
    const key = item.category === 'Mascotas' ? 'pets' : 'household'
    const who = item.assignedTo ?? 'shared'
    if (who === 'shared') {
      const sp = splitAmount(a, shares)
      r.me[key] += sp.me
      r.juan[key] += sp.juan
      r.sharedTotal += a
    } else {
      r[who][key] += a
      r[who].own += a
    }
  }
  return r
}

// ───────────────────────── Deudas ─────────────────────────

export function debtTotal(debt: Debt): number {
  if (debt.items.length > 0) return debt.items.reduce((s, x) => s + (x.amount || 0), 0)
  return debt.total || 0
}

/** Tasa mensual en fracción. Convierte E.A. → mensual: (1 + EA)^(1/12) − 1 */
export function monthlyRate(debt: Pick<Debt, 'rate' | 'rateType'>): number {
  const r = Math.max(0, debt.rate || 0) / 100
  if (r === 0) return 0
  return debt.rateType === 'ea' ? Math.pow(1 + r, 1 / 12) - 1 : r
}

/** Cuota fija (sistema francés). Sin interés: total / cuotas. */
export function computeInstallment(principal: number, rate: number, n: number): number {
  if (n <= 0 || principal <= 0) return 0
  if (rate === 0) return principal / n
  return (principal * rate) / (1 - Math.pow(1 + rate, -n))
}

export function installmentOf(debt: Debt): number {
  if (debt.customInstallment && debt.customInstallment > 0) return debt.customInstallment
  return Math.round(computeInstallment(debtTotal(debt), monthlyRate(debt), debt.installments))
}

/** Saldo de capital después de k cuotas pagadas. */
export function balanceAfter(debt: Debt, k: number): number {
  const P = debtTotal(debt)
  const n = debt.installments
  if (n <= 0) return P
  const paid = Math.min(Math.max(0, k), n)
  if (paid >= n) return 0
  const r = monthlyRate(debt)
  const c = installmentOf(debt)
  if (r === 0) return Math.max(0, P - c * paid)
  const g = Math.pow(1 + r, paid)
  return Math.max(0, P * g - (c * (g - 1)) / r)
}

export function advancesTotal(debt: Debt): number {
  return debt.advances.reduce((s, a) => s + (a.amount || 0), 0)
}

export interface DebtSummary {
  total: number
  installment: number
  totalToPay: number
  interestCost: number
  paid: number
  pending: number
  balance: number
  progress: number
  endDate: string
  status: Debt['status']
}

export function summarizeDebt(debt: Debt): DebtSummary {
  const total = debtTotal(debt)
  const installment = installmentOf(debt)
  const n = Math.max(0, debt.installments)
  const paid = Math.min(Math.max(0, debt.paidInstallments), n)
  const totalToPay = installment * n
  const advances = advancesTotal(debt)
  const balance = Math.max(0, balanceAfter(debt, paid) - advances)
  const status: Debt['status'] = (n > 0 && paid >= n) || (total > 0 && balance === 0) ? 'pagada' : debt.status
  const progress = total > 0 ? Math.min(1, 1 - balance / total) : 0
  return {
    total,
    installment,
    totalToPay,
    interestCost: debt.rate > 0 || debt.customInstallment ? Math.max(0, totalToPay - total) : 0,
    paid,
    pending: Math.max(0, n - paid),
    balance,
    progress,
    endDate: addMonths(debt.startDate, n),
    status,
  }
}

/** Una deuda cobra cuota en el mes si es real, está activa y el mes cae en su plazo. */
export function debtChargesInMonth(debt: Debt, ym: string): boolean {
  if (debt.kind !== 'real') return false
  const s = summarizeDebt(debt)
  if (s.status !== 'activa') return false
  const start = (debt.startDate || '').slice(0, 7)
  if (!start) return true
  const end = addMonths(debt.startDate, debt.installments).slice(0, 7)
  return ym >= start && ym < end
}

/** Parte de la cuota que le corresponde a cada persona. */
export function debtSplit(debt: Debt, amount: number, shares: Shares): { me: number; juan: number } {
  if (debt.responsible === 'me') return { me: amount, juan: 0 }
  if (debt.responsible === 'juan') return { me: 0, juan: amount }
  if (debt.splitMode === 'equal') return splitAmount(amount, { me: 0.5, juan: 0.5, fallback: false })
  return splitAmount(amount, shares)
}

export function monthlyDebtLoad(debts: Debt[], ym: string, shares: Shares) {
  let total = 0
  let me = 0
  let juan = 0
  for (const d of debts) {
    if (!debtChargesInMonth(d, ym)) continue
    const c = installmentOf(d)
    const sp = debtSplit(d, c, shares)
    total += c
    me += sp.me
    juan += sp.juan
  }
  return { total, me, juan }
}

export function realDebtBalance(debts: Debt[]): number {
  return debts.filter((d) => d.kind === 'real').reduce((s, d) => s + summarizeDebt(d).balance, 0)
}

// ───────────────────────── Fechas ─────────────────────────

export function addMonths(isoDate: string, months: number): string {
  if (!isoDate) return ''
  const [y, m, d] = isoDate.split('-').map(Number)
  const date = new Date(y, (m || 1) - 1 + months, 1)
  const day = Math.min(d || 1, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate())
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function shiftYM(ym: string, delta: number): string {
  return addMonths(`${ym}-01`, delta).slice(0, 7)
}

// ───────────────────────── Movimientos ─────────────────────────

export function movementsInMonth(movements: Movement[], ym: string) {
  return movements.filter((m) => m.date.startsWith(ym))
}

/** Gasto real: todo menos lo que se mueve a ahorro. */
export function isSpending(m: Movement) {
  return m.category !== 'Ahorro'
}

export function spentByCategory(movements: Movement[]) {
  const map = new Map<string, number>()
  for (const m of movements) if (isSpending(m)) map.set(m.category, (map.get(m.category) || 0) + m.amount)
  return map
}

/**
 * Balance de la pareja: en gastos compartidos (y pagos adelantados de deudas compartidas)
 * cada uno debería haber pagado su porcentaje. Positivo = a Juan le deben; negativo = a mí me deben.
 */
export function coupleBalance(data: AppData, shares: Shares) {
  let juanPaid = 0
  let mePaid = 0
  let juanExpected = 0
  let meExpected = 0
  const add = (amount: number, paidBy: string, split: { me: number; juan: number }) => {
    if (paidBy === 'juan') juanPaid += amount
    else if (paidBy === 'me') mePaid += amount
    else {
      juanPaid += split.juan
      mePaid += split.me
    }
    juanExpected += split.juan
    meExpected += split.me
  }
  for (const m of data.movements) {
    if (!m.shared || !isSpending(m)) continue
    add(m.amount, m.paidBy, splitAmount(m.amount, shares))
  }
  for (const d of data.debts) {
    if (d.responsible !== 'shared') continue
    for (const a of d.advances) add(a.amount, a.paidBy, debtSplit(d, a.amount, shares))
  }
  return { juanPaid, mePaid, juanExpected, meExpected, juanIsOwed: juanPaid - juanExpected }
}

// ───────────────────────── Finanzas individuales ─────────────────────────

export function personSummary(data: AppData, id: PersonId, ym: string) {
  const shares = sharesOf(data, ym)
  const share = shares[id]
  const split = budgetSplit(data, ym)[id]
  const debt = monthlyDebtLoad(data.debts, ym, shares)
  const p = data.people[id]
  const income = monthIncome(data, id, ym)
  const plan = personalPlan(data, id, ym)
  const householdContribution = split.household
  const petsContribution = split.pets
  const debtContribution = debt[id]
  const totalOut = householdContribution + petsContribution + debtContribution + plan.savings + plan.expenses
  return {
    person: p,
    share,
    fallback: shares.fallback,
    householdContribution,
    petsContribution,
    debtContribution,
    income,
    plan,
    savings: plan.savings,
    personalExpenses: plan.expenses,
    assignedOwn: split.own,
    contribution: householdContribution + petsContribution + debtContribution,
    /** Lo que puede dar: ingreso menos sus propias cosas (gastos y ahorro de su tablita) */
    capacity: income - plan.expenses - plan.savings,
    totalOut,
    /** > 0 puede ayudar más · < 0 se excede de lo que puede dar */
    remaining: income - totalOut,
  }
}

/** Lo que ya pagó cada uno en el mes (movimientos registrados) para cuadrar su tablita. */
export function sharedSpentBy(data: AppData, id: PersonId, ym: string) {
  const householdCats = new Set(data.budget.filter((b) => b.category !== 'Mascotas').map((b) => b.category))
  let household = 0
  let pets = 0
  let debts = 0
  for (const m of movementsInMonth(data.movements, ym)) {
    if (m.paidBy !== id || !isSpending(m)) continue
    if (m.category === 'Mascotas') pets += m.amount
    else if (m.category === 'Deudas') debts += m.amount
    else if (householdCats.has(m.category)) household += m.amount
  }
  return { household, pets, debts }
}

// ───────────────────────── Metas ─────────────────────────

/** Gastos esenciales = todo el presupuesto mensual compartido + cuotas de deudas reales activas. */
export function essentialMonthly(data: AppData, ym: string) {
  return budgetTotals(data.budget).total + monthlyDebtLoad(data.debts, ym, sharesOf(data, ym)).total
}

export function goalTarget(goal: Goal, essentials: number) {
  return goal.autoMonths && goal.autoMonths > 0 ? Math.round(essentials * goal.autoMonths) : goal.target
}

export function goalSaved(goal: Goal, upTo?: string) {
  return goal.contributions.filter((c) => !upTo || c.date <= upTo).reduce((s, c) => s + c.amount, 0)
}

export function goalSummary(goal: Goal, essentials: number) {
  const target = goalTarget(goal, essentials)
  const saved = goalSaved(goal)
  const remaining = Math.max(0, target - saved)
  const progress = target > 0 ? Math.min(1, saved / target) : 0
  let monthly = goal.monthlyPlan
  let basis: 'plan' | 'promedio' | null = monthly > 0 ? 'plan' : null
  if (monthly <= 0 && goal.contributions.length > 0) {
    const first = goal.contributions.map((c) => c.date).sort()[0]
    const [fy, fm] = first.split('-').map(Number)
    const now = new Date()
    const months = Math.max(1, (now.getFullYear() - fy) * 12 + (now.getMonth() + 1 - fm) + 1)
    monthly = saved / months
    basis = 'promedio'
  }
  const monthsLeft = remaining === 0 ? 0 : monthly > 0 ? Math.ceil(remaining / monthly) : null
  const now = new Date()
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const eta = monthsLeft === null ? null : addMonths(today, monthsLeft).slice(0, 7)
  return { target, saved, remaining, progress, monthsLeft, eta, monthly, basis }
}

// ───────────────────────── Simulador ─────────────────────────

export function runScenario(s: Scenario, defaultResponsible: PersonId) {
  const shares = computeShares(s.myIncome, s.juanIncome, defaultResponsible)
  const totalIncome = s.myIncome + s.juanIncome
  const shared = splitAmount(s.sharedExpenses, shares)
  const debt = splitAmount(s.debtInstallments, shares)
  const savings = splitAmount(s.monthlySavings, shares)
  const totalOut = s.sharedExpenses + s.debtInstallments + s.monthlySavings + s.myPersonal + s.juanPersonal
  return {
    shares,
    totalIncome,
    totalOut,
    available: totalIncome - totalOut,
    me: {
      contribution: shared.me + debt.me,
      savings: savings.me,
      free: s.myIncome - shared.me - debt.me - savings.me - s.myPersonal,
    },
    juan: {
      contribution: shared.juan + debt.juan,
      savings: savings.juan,
      free: s.juanIncome - shared.juan - debt.juan - savings.juan - s.juanPersonal,
    },
    savingsRate: totalIncome > 0 ? s.monthlySavings / totalIncome : 0,
  }
}
