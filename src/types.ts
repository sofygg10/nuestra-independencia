export type PersonId = 'juan' | 'me'
export type Payer = PersonId | 'joint'

export const CATEGORIES = [
  'Arriendo',
  'Servicios',
  'Mercado',
  'Mascotas',
  'Transporte',
  'Salud',
  'Hogar',
  'Deudas',
  'Entretenimiento',
  'Gastos personales',
  'Ahorro',
  'Otros',
] as const
export type Category = (typeof CATEGORIES)[number]

export const PAYMENT_METHODS = ['Efectivo', 'Débito', 'Tarjeta de crédito', 'Transferencia', 'Nequi / Daviplata', 'Otro'] as const

export type LineKind = 'gasto' | 'ahorro'

/** Un renglón de la tablita personal del mes (estilo “Mujer independiente”). */
export interface PersonalLine {
  id: string
  emoji: string
  name: string
  kind: LineKind
  planned: number
  spent: number
}

export interface PersonalMonth {
  /** null = usa el ingreso base de la persona */
  income: number | null
  lines: PersonalLine[]
}

export interface Person {
  id: PersonId
  name: string
  /** Ingreso base: se usa en los meses que no tienen uno propio */
  income: number
  /** Respaldo para meses sin tablita */
  personalExpenses: number
  personalSavings: number
  /** Tablita personal por mes, clave YYYY-MM */
  months: Record<string, PersonalMonth>
}

export interface SubItem {
  id: string
  name: string
  amount: number
}

export interface BudgetItem {
  id: string
  emoji: string
  name: string
  category: Category
  amount: number
  /** Quién lo paga: compartido (según el reparto) o una sola persona */
  assignedTo?: Responsible
  /** If present, amount = sum of subitems */
  subitems?: SubItem[]
}

export type PurchaseStatus = 'presupuestado' | 'comprado' | 'financiado'

export interface SetupPurchase {
  id: string
  emoji: string
  name: string
  budget: number
  actual: number | null
  status: PurchaseStatus
  paidBy: Payer
  date: string
  notes: string
}

export type DebtStatus = 'pendiente' | 'activa' | 'pagada'
export type DebtKind = 'real' | 'simulacion'
export type Responsible = PersonId | 'shared'
export type RateType = 'mensual' | 'ea'

export interface Advance {
  id: string
  date: string
  amount: number
  paidBy: PersonId
  note: string
}

export interface Debt {
  id: string
  name: string
  kind: DebtKind
  total: number
  items: SubItem[]
  responsible: Responsible
  splitMode: 'proportional' | 'equal'
  startDate: string // YYYY-MM-DD
  installments: number
  rate: number // percent
  rateType: RateType
  customInstallment: number | null
  paidInstallments: number
  status: DebtStatus
  advances: Advance[]
  notes: string
}

export interface Movement {
  id: string
  date: string
  description: string
  category: Category
  amount: number
  paidBy: Payer
  shared: boolean
  method: string
  notes: string
}

export interface GoalContribution {
  id: string
  date: string
  amount: number
  person: Payer
}

export interface Goal {
  id: string
  emoji: string
  name: string
  target: number
  /** Emergency fund: target = months × essential monthly expenses */
  autoMonths: number | null
  monthlyPlan: number
  contributions: GoalContribution[]
}

export interface Scenario {
  id: string
  name: string
  myIncome: number
  juanIncome: number
  sharedExpenses: number
  debtInstallments: number
  monthlySavings: number
  myPersonal: number
  juanPersonal: number
}

export interface SplitAgreement {
  /** proporcional = según ingresos; manual = porcentaje acordado */
  mode: 'proporcional' | 'manual'
  /** % que aporta Sofi cuando el modo es manual (0–100) */
  mePct: number
}

export interface CalcState {
  /** Gastos adicionales de la calculadora de aportes */
  extras: SubItem[]
  /** Salario de Juan en el escenario 4 */
  s4Juan: number
}

export interface Settings {
  defaultResponsible: PersonId
  split: SplitAgreement
  calc: CalcState
  /** Escenario que se está armando en el simulador (se conserva al salir) */
  simDraft: { scenario: Scenario; labels: string[] } | null
}

export interface AppData {
  version: 1
  people: Record<PersonId, Person>
  budget: BudgetItem[]
  purchases: SetupPurchase[]
  debts: Debt[]
  movements: Movement[]
  goals: Goal[]
  scenarios: Scenario[]
  settings: Settings
}
