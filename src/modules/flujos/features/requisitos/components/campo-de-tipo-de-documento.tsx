'use client'

import Link from 'next/link'
import { RUTAS } from '@/shared/lib/rutas'
import { CampoSeleccion } from '@/shared/ui/campo-seleccion'
import type { TipoParaRequisito } from '../../../entities/requisitos/opciones'

type Props = {
  // Los tipos activos; nulo mientras se leen.
  tipos: readonly TipoParaRequisito[] | null
  valor: string
  error: string | undefined
  alElegir: (tipoId: string) => void
}

const SUFIJO_DEL_FLUJO = ' · de este flujo'

// El selector del tipo de documento de un requisito. Con tipos de la empresa y del flujo a la vez, los del flujo lo dicen; sin tipos activos lleva a «Documentos».
export function CampoDeTipoDeDocumento({ tipos, valor, error, alElegir }: Props) {
  if (tipos !== null && tipos.length === 0) {
    return (
      <p className="text-(length:--text-sm) text-(--color-ink-soft)">
        No hay tipos de documento activos.{' '}
        <Link className="underline" href={`${RUTAS.configuracionDeFlujos}?seccion=documentos`}>
          Crear uno en Documentos
        </Link>
      </p>
    )
  }
  const lista = tipos ?? []
  const mezclados = lista.some((t) => t.delFlujo) && lista.some((t) => !t.delFlujo)
  return (
    <CampoSeleccion
      nombre="tipo_documento_id"
      etiqueta="Tipo de documento"
      autoFocus
      disabled={tipos === null}
      value={valor}
      opciones={[
        { valor: '', etiqueta: tipos === null ? 'Leyendo tipos…' : 'Elige un tipo' },
        ...lista.map((t) => ({
          valor: t.id,
          etiqueta: mezclados && t.delFlujo ? `${t.nombre}${SUFIJO_DEL_FLUJO}` : t.nombre,
        })),
      ]}
      onChange={(evento) => {
        alElegir(evento.target.value)
      }}
      error={error}
    />
  )
}
