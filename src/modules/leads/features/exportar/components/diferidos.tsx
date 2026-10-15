'use client'

import dynamic from 'next/dynamic'

// El diálogo de exportar se pide recién al abrirse: el listado no carga su código para mostrar el
// botón. Se monta con `useAbiertoAlgunaVez()`.
export const DialogoDeExportarDiferido = dynamic(
  () => import('./dialogo-de-exportar').then((modulo) => modulo.DialogoDeExportar),
  { ssr: false },
)
