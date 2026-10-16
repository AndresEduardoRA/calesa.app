'use client'

import { diferido } from '@/shared/ui/diferido'

// El diálogo de exportar se pide recién al abrirse: el listado no carga su código para mostrar el
// botón. Se monta con `useAbiertoAlgunaVez()`.
export const DialogoDeExportarDiferido = diferido(() =>
  import('./dialogo-de-exportar').then((modulo) => modulo.DialogoDeExportar),
)
