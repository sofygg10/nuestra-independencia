# Nuestra Independencia 🌿

Dashboard financiero para Juan y Sofi: presupuesto del hogar, aportes proporcionales a los ingresos, deudas, compras de la mudanza, metas de ahorro y simulador.

## Uso

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # versión de producción en dist/
```

Los datos se guardan en el `localStorage` del navegador. En **Configuración** se pueden exportar e importar como `.json` (para pasarlos a otro dispositivo o tener copia).

## Estructura

- `src/lib/finance.ts`: todos los cálculos (porcentajes, cuotas con interés, saldos, metas, escenarios). No depende de React.
- `src/lib/format.ts`: formato COP ($1.200.000) y fechas.
- `src/store/`: estado global con persistencia y datos iniciales.
- `src/components/ui.tsx`: tarjetas, campos en pesos, modales, confirmaciones.
- `src/pages/`: una página por módulo del menú.
