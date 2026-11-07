'use client'

import { diferido } from '@/shared/ui/diferido'

// El panel del ⚙ de una celda se pide recién al abrirse: la hoja no carga el panel, su hook, la lectura del valor por defecto ni la action para mostrarse (4.20-3b). Aparte
// del `diferidos.tsx` de la pestaña «Fórmula», que trae los modales de publicar y revertir.
export const PanelDelAjusteDiferido = diferido(
  () => import('./panel-del-ajuste').then((modulo) => modulo.PanelDelAjuste),
  { aviso: 'pantalla' },
)
