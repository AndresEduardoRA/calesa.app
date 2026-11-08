'use client'

import { Bloque } from '@/shared/ui/bloque'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { GrupoDelEditor } from '../../../entities/plantilla/filas-del-editor'
import { nombreDelTono } from '../../../entities/plantilla/filas-del-editor'
import type { TonoDelCatalogo } from '../../../entities/plantilla/lectura-de-la-plantilla'

type Props = {
  grupos: readonly GrupoDelEditor[]
  tonos: readonly TonoDelCatalogo[]
  deshabilitado: boolean
  motivoDe: (donde: string) => string | undefined
  alElegir: (grupo: string, tono: string | null) => void
}

// «Grupos»: cada grupo de la fórmula, en el orden de la plantilla, con el tono que usa la tarjeta. «Del grupo» (valor vacío) quita la clave y usa el de la fórmula; un tono
// elegido que ya no está en el catálogo sale seleccionado como «<clave> (ya no está)».
export function BloqueDeGrupos({ grupos, tonos, deshabilitado, motivoDe, alElegir }: Props) {
  const hayMotivo = grupos.some((_, i) => motivoDe(`grupos[${i}].tono`) !== undefined)
  return (
    <Bloque
      titulo="Grupos"
      descripcion="El tono de cada grupo en la tarjeta."
      forzarAbierto={hayMotivo}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {grupos.map((g, i) => {
          const delCatalogo = new Set(tonos.map((t) => t.clave))
          const sinCatalogo = g.tono !== undefined && !delCatalogo.has(g.tono)
          const delGrupo =
            g.tonoDelGrupo === undefined ? 'sin tono' : nombreDelTono(g.tonoDelGrupo, tonos)
          return (
            <CampoSeleccion
              key={g.id}
              nombre={`tono-${g.id}`}
              data-campo={`grupos[${i}].tono`}
              etiqueta={`Tono de «${g.etiqueta}»`}
              opciones={[
                { valor: '', etiqueta: `Del grupo (${delGrupo})` },
                ...tonos.map((t) => ({ valor: t.clave, etiqueta: t.nombre })),
                ...(sinCatalogo ? [{ valor: g.tono, etiqueta: nombreDelTono(g.tono, tonos) }] : []),
              ]}
              value={g.tono ?? ''}
              disabled={deshabilitado}
              error={motivoDe(`grupos[${i}].tono`)}
              onChange={(evento) => {
                alElegir(g.id, evento.target.value === '' ? null : evento.target.value)
              }}
            />
          )
        })}
      </div>
    </Bloque>
  )
}
