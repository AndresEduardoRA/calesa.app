'use client'

import type { Concesion, Permisos } from '@/shared/lib/permisos'
import { Opciones } from '@/shared/ui/opciones'
import { Switch } from '@/shared/ui/switch'
import { MOTIVO_CONCESION_NO_DOMINADA, alcanceOtorgable } from '../../../entities/dominancia'
import {
  ETIQUETA_ALCANCE,
  SIN_ORIGENES,
  lugaresDe,
  type LugarDeConcesion,
  type OrigenDeLaMatriz,
  type PermisoDelCatalogo,
} from '../../../entities/matriz'
import type { CambioDeConcesion } from '../hooks/use-matriz'

type Props = {
  permiso: PermisoDelCatalogo
  rolNombre: string
  // Las concesiones que este rol tiene de este permiso.
  delPermiso: readonly Concesion[]
  origenes: readonly OrigenDeLaMatriz[]
  // Con qué se decide lo que la persona puede dar.
  misPermisos: Permisos
  ocupado: boolean
  alAplicar: (cambio: CambioDeConcesion) => void
}

const OPCIONES_DE_ALCANCE = [
  { valor: 'propios', etiqueta: ETIQUETA_ALCANCE.propios },
  { valor: 'todos', etiqueta: ETIQUETA_ALCANCE.todos },
] as const

type PropsDeLugar = Omit<Props, 'origenes'> & { lugar: LugarDeConcesion }

// Un renglón: el permiso en un lugar (toda la empresa, todos los orígenes o un origen).
function Lugar({
  permiso,
  rolNombre,
  delPermiso,
  misPermisos,
  ocupado,
  alAplicar,
  lugar,
}: PropsDeLugar) {
  const concesion = delPermiso.find((c) => c.origenId === lugar.origenId)
  // Lo más que la persona puede dar ahí; null = no lo tiene y no lo puede dar.
  const otorgable = alcanceOtorgable(misPermisos, permiso.clave, lugar.origenId)
  const sinDominio = !concesion && otorgable === null
  const lugarEn = { clave: permiso.clave, origenId: lugar.origenId }

  return (
    <li className="grid gap-2 border-b border-(--color-line) py-2 last:border-b-0">
      <div className="flex min-h-11 items-center justify-between gap-3 md:min-h-8">
        <span className="text-(length:--text-sm) text-(--color-ink)">{lugar.etiqueta}</span>
        <Switch
          aria-label={`${permiso.nombre} para ${rolNombre}: ${lugar.etiqueta}`}
          checked={concesion !== undefined}
          disabled={ocupado || sinDominio}
          onCheckedChange={(encendido) => {
            alAplicar(
              encendido
                ? {
                    tipo: 'otorgar',
                    ...lugarEn,
                    alcance: permiso.conAlcance ? (otorgable ?? 'propios') : 'todos',
                  }
                : { tipo: 'revocar', ...lugarEn },
            )
          }}
        />
      </div>
      {sinDominio ? (
        <p className="text-(length:--text-xs) text-(--color-ink-faint)">
          {MOTIVO_CONCESION_NO_DOMINADA}
        </p>
      ) : null}
      {concesion && permiso.conAlcance ? (
        <>
          <Opciones
            etiqueta={`Alcance en ${lugar.etiqueta.toLowerCase()}`}
            opciones={OPCIONES_DE_ALCANCE}
            valor={concesion.alcance}
            deshabilitado={ocupado || otorgable !== 'todos'}
            alCambiar={(alcance) => {
              alAplicar({ tipo: 'otorgar', ...lugarEn, alcance })
            }}
          />
          {otorgable === 'todos' ? null : (
            <p className="text-(length:--text-xs) text-(--color-ink-faint)">
              No puedes cambiar el alcance: aquí tú tienes sólo «lo propio».
            </p>
          )}
        </>
      ) : null}
    </li>
  )
}

// Dónde y con qué alcance tiene un rol un permiso. Cada interruptor y cada cambio de alcance es
// una edición que se guarda sola. Con cero orígenes sólo se ofrece el alcance global.
export function EditorConcesion({ origenes, ...resto }: Props) {
  const { permiso } = resto
  return (
    <div className="grid gap-1">
      <ul>
        {lugaresDe(permiso, origenes).map((lugar) => (
          <Lugar key={lugar.origenId ?? 'general'} lugar={lugar} {...resto} />
        ))}
      </ul>
      {permiso.porOrigen && origenes.length === 0 ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{SIN_ORIGENES}</p>
      ) : null}
    </div>
  )
}
