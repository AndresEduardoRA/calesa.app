// La entrada de CLIENTE del módulo `empresa`: lo que puede importar un Client Component de `app/` o de otro
// módulo (`@/modules/empresa/client`). Sólo la action del tipo de cambio, para el ⚙ de una celda de la hoja
// (4.20), y el tipo de su entrada. Nada de servidor: para eso está `index.ts`.
export { guardarTipoCambio } from './features/tipos-cambio/actions/guardar-tipo-cambio'
export type { EntradaDeGuardarTipoCambio } from './features/tipos-cambio/schemas/tipos-cambio'
