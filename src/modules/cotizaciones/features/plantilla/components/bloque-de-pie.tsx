'use client'

import { Bloque } from '@/shared/ui/bloque'
import { Interruptor } from '@/shared/ui/interruptor'
import type { Plantilla } from '../../../entities/plantilla/forma-de-plantilla'
import { CampoConContador } from './campo-con-contador'

type Columna = keyof Plantilla['columnas']

type Props = {
  plantilla: Plantilla
  deshabilitado: boolean
  motivoDe: (donde: string) => string | undefined
  alCambiarNota: (texto: string) => void
  alCambiarLogo: (valor: boolean) => void
  alCambiarColumna: (columna: Columna, valor: boolean) => void
}

const COLUMNAS: readonly { clave: Columna; titulo: string; ayuda: string }[] = [
  { clave: 'leyenda', titulo: 'Leyenda', ayuda: 'Una columna con la leyenda de cada fila.' },
  { clave: 'plazo', titulo: 'Plazo', ayuda: 'El plazo de pago de cada grupo.' },
  { clave: 'tipo_cambio', titulo: 'Tipo de cambio', ayuda: 'El tipo de cambio de cada grupo.' },
]

// «Pie y columnas»: la nota, el logo y las tres columnas opcionales de la tarjeta. Plegado: lo que sigue en el DOM no se pierde.
export function BloqueDePie({
  plantilla,
  deshabilitado,
  motivoDe,
  alCambiarNota,
  alCambiarLogo,
  alCambiarColumna,
}: Props) {
  return (
    <Bloque
      titulo="Pie y columnas"
      descripcion="La nota, el logo y las columnas de la tarjeta."
      plegado
      forzarAbierto={motivoDe('nota') !== undefined}
    >
      <div className="grid gap-3">
        <CampoConContador
          nombre="nota"
          donde="nota"
          etiqueta="Nota de la tarjeta"
          valor={plantilla.nota ?? ''}
          tope={300}
          multilinea
          motivo={motivoDe('nota')}
          deshabilitado={deshabilitado}
          alCambiar={alCambiarNota}
        />
        <Interruptor
          titulo="Logo"
          ayuda="Dibuja el logo de la empresa arriba."
          valor={plantilla.logo}
          alCambiar={alCambiarLogo}
          deshabilitado={deshabilitado}
        />
        {COLUMNAS.map((c) => (
          <Interruptor
            key={c.clave}
            titulo={c.titulo}
            ayuda={c.ayuda}
            valor={plantilla.columnas[c.clave]}
            alCambiar={(valor) => {
              alCambiarColumna(c.clave, valor)
            }}
            deshabilitado={deshabilitado}
          />
        ))}
      </div>
    </Bloque>
  )
}
