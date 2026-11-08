'use client'

import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { ModoDeTipoDeCambio } from '../../../entities/diseno'
import {
  MAXIMO_DEL_NOMBRE_DE_MODO,
  type CambioDeModo,
  type TipoDeCambioDelDiseno,
} from '../../../entities/diseno/edicion-de-la-cabecera'

type Props = {
  modo: ModoDeTipoDeCambio
  tipos: readonly TipoDeCambioDelDiseno[]
  ocupado: boolean
  alPonerModo: (cambios: CambioDeModo) => void
  alQuitar: () => void
}

// Las opciones de un select de tipo de cambio: los de la fórmula y, si el modo guardado nombra otro (ya no existe o no es un tipo de cambio), ése también, para verlo.
function opcionesCon(tipos: readonly TipoDeCambioDelDiseno[], actual: string) {
  const lista = tipos.some((t) => t.id === actual)
    ? tipos
    : [...tipos, { id: actual, etiqueta: actual }]
  return lista.map((t) => ({ valor: t.id, etiqueta: t.etiqueta }))
}

// Un modo de tipo de cambio: su nombre, el tipo de cambio de cada bucket y el del total en moneda local. Cada cambio se aplica en el acto; el nombre, al salir del campo
// (la base pide de 1 a 40 caracteres y no se corta lo que se escribe a medias).
export function ModoEditable({ modo, tipos, ocupado, alPonerModo, alQuitar }: Props) {
  const base = `modo-${modo.clave}`
  return (
    <li
      className="@container min-w-0 rounded-(--radius-md) border border-(--color-line) p-3"
      data-modo={modo.clave}
    >
      <div className="grid min-w-0 gap-2 @md:grid-cols-2">
        <Campo
          key={modo.nombre}
          nombre={`${base}-nombre`}
          etiqueta="Nombre"
          maxLength={MAXIMO_DEL_NOMBRE_DE_MODO}
          defaultValue={modo.nombre}
          disabled={ocupado}
          onBlur={(evento) => {
            if (evento.target.value !== modo.nombre) alPonerModo({ nombre: evento.target.value })
          }}
        />
        <CampoSeleccion
          nombre={`${base}-total`}
          etiqueta="Total en"
          opciones={opcionesCon(tipos, modo.total_en)}
          value={modo.total_en}
          disabled={ocupado}
          onChange={(evento) => {
            alPonerModo({ total_en: evento.target.value })
          }}
        />
        {modo.buckets.map((e) => (
          <CampoSeleccion
            key={e.bucket}
            nombre={`${base}-bucket-${e.bucket}`}
            etiqueta={`Tipo de cambio de ${e.bucket}`}
            opciones={opcionesCon(tipos, e.nodo)}
            value={e.nodo}
            disabled={ocupado}
            onChange={(evento) => {
              alPonerModo({ bucket: { bucket: e.bucket, nodo: evento.target.value } })
            }}
          />
        ))}
      </div>
      <Button variant="outline" size="sm" className="mt-2" disabled={ocupado} onClick={alQuitar}>
        Quitar el modo
      </Button>
    </li>
  )
}
