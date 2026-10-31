'use client'

import { Interruptor } from '@/shared/ui/interruptor'
import { ofreceVerTotalBs } from '../../../entities/cabecera-de-la-hoja'
import type { HojaLista } from '../../../entities/hoja'
import { ModosDeLaHoja } from './modos-de-la-hoja'

type Props = {
  cabecera: HojaLista['cabecera']
  modoElegido: string | null
  alElegirModo: (clave: string) => void
  verTotalBs: boolean
  alCambiarVerTotalBs: (valor: boolean) => void
}

// Lo que es de la hoja entera y va arriba de las secciones (`docs/UX.md` › «Cotizar»). Los modos de tipo de cambio sólo se dibujan si hay dos o más: con uno no hay qué elegir
// (el resumen dice cuál es) y sin modos no hay nada. «Ver total Bs» sólo si el diseño lo ofrece y hay con qué moneda escribirlo (P6); nace apagado (P5) y ningún texto fijo
// nombra una moneda: su código sale de la base. Si nada se dibuja, tampoco la caja.
export function CabeceraDeHoja({
  cabecera,
  modoElegido,
  alElegirModo,
  verTotalBs,
  alCambiarVerTotalBs,
}: Props) {
  const conModos = cabecera.modos.length >= 2
  const conTotalBs = ofreceVerTotalBs(cabecera)
  if (!conModos && !conTotalBs) {
    return null
  }
  return (
    <div data-cabecera="" className="grid min-w-0 gap-3">
      {conModos ? (
        <ModosDeLaHoja modos={cabecera.modos} elegido={modoElegido} alElegir={alElegirModo} />
      ) : null}
      {conTotalBs ? (
        <Interruptor
          titulo="Ver total en moneda local"
          ayuda="Suma al resumen el total en moneda local y se guarda con la cotización."
          valor={verTotalBs}
          alCambiar={alCambiarVerTotalBs}
        />
      ) : null}
    </div>
  )
}
