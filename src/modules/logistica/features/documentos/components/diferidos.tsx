'use client'

import { diferido } from '@/shared/ui/diferido'

// El hueco «Documentos» se pide recién al abrir su bloque (o su pestaña): el panel de la unidad y la ficha no cargan el código de la lista para dibujarse. Recibe sólo `{ unidad }`.
export const HuecoDeDocumentosDiferido = diferido(() =>
  import('./hueco-de-documentos').then((modulo) => modulo.HuecoDeDocumentos),
)

// El hueco de subir un documento a las unidades de un grupo (6.06-3): también se pide al abrir su bloque. Recibe sólo `{ grupo }`.
export const HuecoDeDocumentosDelGrupoDiferido = diferido(() =>
  import('./hueco-de-documentos-del-grupo').then((modulo) => modulo.HuecoDeDocumentosDelGrupo),
)
