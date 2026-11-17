import type { AppData, BudgetItem, Debt, Goal, SetupPurchase } from '../types'
import { addMonths } from '../lib/finance'
import { todayISO, uid } from '../lib/format'

/**
 * Datos iniciales: solo valores que nos dieron (presupuesto, compras de independencia y,
 * desde el archivo de Fleur, el desglose real de mascotas y las metas de España / carro).
 * Ingresos, aportes y movimientos arrancan vacíos: no inventamos cifras reales.
 */
export function createDefaultData(): AppData {
  const budget: BudgetItem[] = [
    { id: uid(), emoji: '🏠', name: 'Arriendo', category: 'Arriendo', amount: 1_200_000 },
    { id: uid(), emoji: '💡', name: 'Servicios públicos y facturas', category: 'Servicios', amount: 350_000 },
    { id: uid(), emoji: '🛒', name: 'Mercado', category: 'Mercado', amount: 500_000 },
    {
      id: uid(),
      emoji: '🐾',
      name: 'Mascotas',
      category: 'Mascotas',
      amount: 480_200,
      subitems: [
        { id: uid(), name: 'Alimentación · Oliver', amount: 244_000 },
        { id: uid(), name: 'Alimentación · gatos', amount: 130_200 },
        { id: uid(), name: 'Alimentación · atunes', amount: 40_000 },
        { id: uid(), name: 'Higiene · arena', amount: 66_000 },
        { id: uid(), name: 'Veterinario', amount: 0 },
        { id: uid(), name: 'Medicamentos', amount: 0 },
        { id: uid(), name: 'Otros', amount: 0 },
      ],
    },
  ]

  const p = (emoji: string, name: string, budget: number): SetupPurchase => ({
    id: uid(),
    emoji,
    name,
    budget,
    actual: null,
    status: 'presupuestado',
    paidBy: 'juan',
    date: '',
    notes: '',
  })
  const purchases: SetupPurchase[] = [
    p('🔑', 'Depósito de vivienda', 1_200_000),
    p('🚚', 'Viaje y mudanza', 400_000),
    p('🧊', 'Nevera', 300_000),
    p('🫧', 'Lavadora', 300_000),
    p('🛏️', 'Cama', 450_000),
    p('💤', 'Colchón', 300_000),
    p('🍳', 'Ollas y sartén', 120_000),
    p('🍽️', 'Platos, vasos y cubiertos', 60_000),
    p('🥄', 'Utensilios de cocina', 40_000),
  ]

  const nextMonth = addMonths(todayISO().slice(0, 7) + '-01', 1)
  const debts: Debt[] = [
    {
      id: uid(),
      name: 'Plan de financiación · compras del hogar',
      kind: 'simulacion',
      total: 1_570_000,
      items: [
        { id: uid(), name: 'Nevera', amount: 300_000 },
        { id: uid(), name: 'Lavadora', amount: 300_000 },
        { id: uid(), name: 'Cama', amount: 450_000 },
        { id: uid(), name: 'Colchón', amount: 300_000 },
        { id: uid(), name: 'Cocina básica', amount: 220_000 },
      ],
      responsible: 'shared',
      splitMode: 'proportional',
      startDate: nextMonth,
      installments: 6,
      rate: 0,
      rateType: 'mensual',
      customInstallment: null,
      paidInstallments: 0,
      status: 'pendiente',
      advances: [],
      notes: 'Ejemplo: 6 meses sin intereses. Es una simulación, no una deuda adquirida.',
    },
  ]

  const g = (emoji: string, name: string, target: number, autoMonths: number | null = null): Goal => ({
    id: uid(),
    emoji,
    name,
    target,
    autoMonths,
    monthlyPlan: 0,
    contributions: [],
  })
  const goals: Goal[] = [
    g('🛟', 'Fondo de emergencia', 0, 3),
    g('✈️', 'Ahorro para España', 10_000_000),
    g('🧳', 'Ahorro para viajes', 0),
    g('🐶', 'Ahorro para nuestras mascotas', 0),
    g('🛋️', 'Compras futuras del hogar', 0),
    g('🚗', 'Pase para el carro', 2_000_000),
  ]

  return {
    version: 1,
    people: {
      juan: { id: 'juan', name: 'Juan', income: 0, personalExpenses: 0, personalSavings: 0, months: {} },
      me: { id: 'me', name: 'Sofi', income: 0, personalExpenses: 0, personalSavings: 0, months: {} },
    },
    budget,
    purchases,
    debts,
    movements: [],
    goals,
    scenarios: [],
    settings: { defaultResponsible: 'juan', split: { mode: 'proporcional', mePct: 0 }, calc: { extras: [], s4Juan: 6_000_000 }, simDraft: null },
  }
}
