'use client'

import { formatearFecha, inicioDelDia } from '@/shared/lib/fechas'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import type { Seguimientos } from '../hooks/use-seguimientos'

// El aviso del tope de una línea de tiempo larga, que casi nunca hace falta. Se pide al dibujarse
// (`diferidos.tsx`), junto con «Ir a una fecha» y «Desde el …» (de `shared/ui`): la línea de tiempo
// viaja en el JS de todas las pantallas por la entrada del módulo.

const fechaDe = (dia: string, zona: string) => formatearFecha(inicioDelDia(dia, { zona }), { zona })

type Props = { seguimientos: Seguimientos; zona: string }

// En el tope de lo cargado, en lugar de «Ver más»: cuántos se muestran y por dónde seguir.
export function AvisoDelTope({ seguimientos, zona }: Props) {
  const { desde } = seguimientos
  return (
    <p role="status" className="text-(length:--text-sm) text-(--color-ink-soft)">
      {desde === null
        ? `Mostrando los ${String(TOPE_DE_LO_CARGADO)} más recientes.`
        : `Mostrando ${String(TOPE_DE_LO_CARGADO)} desde el ${fechaDe(desde, zona)}.`}{' '}
      Para ver anteriores, ve a una fecha.
    </p>
  )
}
