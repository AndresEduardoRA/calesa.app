'use client'

import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import { NIVEL_TODOS } from '../../../entities/diseno'
import type { NivelDelDiseno } from '../../../entities/diseno/edicion-del-diseno'

type Props = {
  nombre: string
  etiqueta: string
  // El nivel que rige: el propio, si no el de la sección, si no «todos».
  valor: string
  niveles: readonly NivelDelDiseno[]
  // Un texto de por qué no se puede cambiar (el total y lo que va aparte lo ve todo el mundo); nulo: se puede.
  apagado: string | null
  ocupado: boolean
  alCambiar: (nivel: string) => void
}

// «Todos» y los niveles vivos. Uno retirado o que ya no existe y que el diseño usa se muestra («<Nombre> (retirado)») y se puede cambiar, pero no se ofrece de nuevo.
export function SelectorDeNivel({
  nombre,
  etiqueta,
  valor,
  niveles,
  apagado,
  ocupado,
  alCambiar,
}: Props) {
  const vivos = niveles.filter((n) => !n.retirado)
  const actual = valor === NIVEL_TODOS ? undefined : niveles.find((n) => n.clave === valor)
  const opciones = [
    { valor: NIVEL_TODOS, etiqueta: 'Todos' },
    ...vivos.map((n) => ({ valor: n.clave, etiqueta: n.nombre })),
    ...(valor !== NIVEL_TODOS && !vivos.some((n) => n.clave === valor)
      ? [{ valor, etiqueta: `${actual?.nombre ?? valor} (${actual ? 'retirado' : 'no existe'})` }]
      : []),
  ]
  return (
    <CampoSeleccion
      nombre={nombre}
      etiqueta={etiqueta}
      opciones={opciones}
      value={valor}
      disabled={apagado !== null || ocupado}
      {...(apagado === null ? {} : { ayuda: apagado })}
      onChange={(evento) => {
        alCambiar(evento.target.value)
      }}
    />
  )
}
