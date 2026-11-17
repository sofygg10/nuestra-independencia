/**
 * Paleta categórica validada (daltonismo + contraste) con el validador de dataviz.
 * Orden fijo: nunca se cicla. Juan y yo siempre llevan el mismo color.
 */
export const SERIES = ['#1F7A4D', '#A0529C', '#C9692E', '#2F72B8', '#A9850F', '#C2456B'] as const

export const PERSON_COLOR = { juan: SERIES[0], me: SERIES[1], joint: '#64896d' } as const

/** Referencia neutra (presupuesto, “meta”) frente a la serie medida. */
export const REFERENCE = '#cfd6cf'
export const GRID = '#e8ebe6'
export const AXIS = '#7b857e'
