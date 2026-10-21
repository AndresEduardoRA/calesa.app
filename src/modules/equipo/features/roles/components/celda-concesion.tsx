'use client'

import type { Concesion, Permisos } from '@/shared/lib/permisos'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/shared/ui/popover'
import { Switch } from '@/shared/ui/switch'
import { MOTIVO_CONCESION_NO_DOMINADA, alcanceOtorgable } from '../../../entities/dominancia'
import {
  esSimple,
  resumenDeCelda,
  type OrigenDeLaMatriz,
  type PermisoDelCatalogo,
} from '../../../entities/matriz'
import type { CambioDeConcesion } from '../hooks/use-matriz'
import { EditorConcesion } from './editor-concesion'

type Props = {
  permiso: PermisoDelCatalogo
  rolNombre: string
  delPermiso: readonly Concesion[]
  origenes: readonly OrigenDeLaMatriz[]
  misPermisos: Permisos
  // La persona gestiona roles y domina este: puede cambiarlo.
  editable: boolean
  ocupado: boolean
  alAplicar: (cambio: CambioDeConcesion) => void
}

// Lo que tiene un rol de un permiso. Si es un sí o un no, un interruptor; si se acota por origen
// o distingue alcance, el resumen abre el editor. Sin poder editar, sólo se lee.
export function CeldaConcesion(props: Props) {
  const { permiso, rolNombre, delPermiso, origenes, misPermisos, editable, ocupado, alAplicar } =
    props
  const resumen = resumenDeCelda(permiso, delPermiso, origenes)

  if (!editable) {
    return (
      <span
        className={
          delPermiso.length > 0
            ? 'text-(length:--text-sm) text-(--color-ink)'
            : 'text-(length:--text-sm) text-(--color-ink-faint)'
        }
      >
        {resumen}
      </span>
    )
  }

  if (esSimple(permiso)) {
    const loTiene = delPermiso.length > 0
    // Quitarlo siempre se puede (domina el rol); darlo, sólo si la persona lo tiene.
    const sinDominio = !loTiene && alcanceOtorgable(misPermisos, permiso.clave, null) === null
    return (
      <span
        className="inline-flex min-h-11 items-center md:min-h-8"
        title={sinDominio ? MOTIVO_CONCESION_NO_DOMINADA : undefined}
      >
        <Switch
          aria-label={
            sinDominio
              ? `${permiso.nombre} para ${rolNombre}. ${MOTIVO_CONCESION_NO_DOMINADA}`
              : `${permiso.nombre} para ${rolNombre}`
          }
          checked={loTiene}
          disabled={ocupado || sinDominio}
          onCheckedChange={(encendido) => {
            alAplicar(
              encendido
                ? { tipo: 'otorgar', clave: permiso.clave, origenId: null, alcance: 'todos' }
                : { tipo: 'revocar', clave: permiso.clave, origenId: null },
            )
          }}
        />
      </span>
    )
  }

  return (
    <Popover>
      <PopoverTrigger
        aria-label={`${permiso.nombre} para ${rolNombre}: ${resumen}. Cambiar`}
        className="inline-flex min-h-11 max-w-full items-center rounded-(--radius-md) border border-(--color-line) bg-(--color-surface) px-2.5 text-(length:--text-sm) text-(--color-ink) outline-none hover:bg-(--color-surface-3) focus-visible:shadow-(--shadow-focus) md:min-h-8 md:max-w-44"
      >
        <span className="truncate">{resumen}</span>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)]">
        <PopoverHeader>
          <PopoverTitle>
            {permiso.nombre} · {rolNombre}
          </PopoverTitle>
          <PopoverDescription>{permiso.descripcion}</PopoverDescription>
        </PopoverHeader>
        <EditorConcesion
          permiso={permiso}
          rolNombre={rolNombre}
          delPermiso={delPermiso}
          origenes={origenes}
          misPermisos={misPermisos}
          ocupado={ocupado}
          alAplicar={alAplicar}
        />
      </PopoverContent>
    </Popover>
  )
}
