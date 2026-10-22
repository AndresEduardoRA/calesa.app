'use client'

import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DEL_EQUIPO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import { EstadoSinResultados } from '@/shared/ui/estados'
import { UnaSolaVista } from '@/shared/ui/lista'
import type { PersonaDelEquipo } from '../../../entities/persona'
import type { AccionesDeLaLista } from './menu-persona'
import { TablaEquipo } from './tabla-equipo'
import { TarjetasEquipo } from './tarjetas-equipo'

type Props = {
  personas: PersonaDelEquipo[]
  // Había más personas que el tope: la lista lo dice y ofrece el camino a las demás.
  hayMas: boolean
  lista: AccionesDeLaLista
  alLimpiar: () => void
}

// Lo que dibuja la lista del equipo: una sola vista (la tabla o las tarjetas), «Nada coincide» si el filtro no deja a nadie, y al pie el aviso del
// tope (5a-21: las primeras 100 por nombre; el resto se busca o se filtra por estado).
export function ResultadoEquipo({ personas, hayMas, lista, alLimpiar }: Props) {
  return (
    <>
      {personas.length === 0 ? (
        <EstadoSinResultados alLimpiar={alLimpiar} />
      ) : (
        <UnaSolaVista
          tabla={() => <TablaEquipo personas={personas} lista={lista} />}
          tarjetas={() => <TarjetasEquipo personas={personas} lista={lista} />}
        />
      )}
      {hayMas ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DEL_EQUIPO, { articulo: 'las', orden: 'primeras por nombre' })}
          camino="Busca por nombre o correo, o filtra por estado."
        />
      ) : null}
    </>
  )
}
