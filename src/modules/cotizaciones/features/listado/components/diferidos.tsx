'use client'

import { diferido } from '@/shared/ui/diferido'

// El resumen entero llega recién al abrirse: el listado no carga su drawer ni su lectura para mostrar sus filas. Sin red, el aviso va en una barra fija (un panel no tiene lugar
// propio hasta que abre).
export const ResumenDeCotizacionDiferido = diferido(() =>
  import('./resumen-de-cotizacion').then((modulo) => modulo.ResumenDeCotizacion),
)
