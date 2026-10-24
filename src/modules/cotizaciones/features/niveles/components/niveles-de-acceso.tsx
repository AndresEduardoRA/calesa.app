'use client'

import Link from 'next/link'
import { PlusIcon } from 'lucide-react'
import { RUTAS } from '@/shared/lib/rutas'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import {
  alTopeDeNiveles,
  textoDelTopeDeNiveles,
  type ListaDeNiveles,
} from '../../../entities/nivel'
import { useEliminarNivelPorUrl } from '../hooks/use-eliminar-nivel-por-url'
import { useModalDeNivel } from '../hooks/use-modal-de-nivel'
import { PREFIJO_DE_NIVEL, useFilasDeNiveles } from '../hooks/use-filas-de-niveles'
import { useNiveles, type Niveles } from '../hooks/use-niveles'
import { EliminarNivelDiferido, ModalDeNivelDiferido } from './diferidos'
import { ListaDeNiveles as Lista, type FilaDeNivel } from './lista-de-niveles'

type Props = {
  lista: ListaDeNiveles
  // `equipo.roles.gestionar`: sin él se lee la lista y no se cambia nada (la base lo vuelve a exigir en cada RPC).
  puedeGestionar: boolean
}

const BOTON = 'h-11 md:h-8'

function Encabezado({
  puedeGestionar,
  alNuevo,
  alTope,
}: {
  puedeGestionar: boolean
  alNuevo: () => void
  alTope: boolean
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="grid gap-0.5">
        <h2
          id="titulo-de-niveles"
          className="text-(length:--text-lg) font-semibold text-(--color-ink)"
        >
          Niveles de acceso
        </h2>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          Quién ve y quién edita cada parte de la hoja. Cada nivel es un permiso por origen en{' '}
          <Link
            href={RUTAS.roles}
            className="underline underline-offset-2 hover:text-(--color-ink)"
          >
            Roles y permisos
          </Link>
          .
        </p>
      </div>
      {puedeGestionar ? (
        <Button
          className={BOTON}
          disabled={alTope}
          aria-describedby={alTope ? 'niveles-tope' : undefined}
          onClick={alNuevo}
        >
          <PlusIcon aria-hidden />
          Nuevo nivel
        </Button>
      ) : null}
    </div>
  )
}

function Retirados({
  filas,
  tope,
  conAcciones,
}: {
  filas: readonly FilaDeNivel[]
  tope: number
  conAcciones: boolean
}) {
  if (filas.length === 0) {
    return null
  }
  return (
    <section className="grid gap-2" aria-labelledby="titulo-de-retirados">
      <div className="grid gap-0.5">
        <h3
          id="titulo-de-retirados"
          className="text-(length:--text-base) font-semibold text-(--color-ink)"
        >
          Retirados
        </h3>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          No se ofrecen en un diseño nuevo. Lo que ya los usa se sigue filtrando igual, y cuentan
          para el máximo de {tope} niveles.
        </p>
      </div>
      <Lista filas={filas} prefijo={PREFIJO_DE_NIVEL} conAcciones={conAcciones} />
    </section>
  )
}

// El modal de «Nuevo nivel» y «Renombrar» y la confirmación de eliminar: se piden al abrirse.
function Ventanas({
  niveles,
  modal,
  eliminacion,
}: {
  niveles: Niveles
  modal: ReturnType<typeof useModalDeNivel>
  eliminacion: ReturnType<typeof useEliminarNivelPorUrl>
}) {
  const montar = useAbiertoAlgunaVez(modal.abierto)
  const montarEliminar = useAbiertoAlgunaVez(eliminacion.abierto)
  return (
    <>
      {montar ? (
        <ModalDeNivelDiferido
          key={modal.apertura}
          abierto={modal.abierto}
          alCerrar={modal.alCerrar}
          niveles={niveles}
          original={modal.original}
          noDisponible={modal.noDisponible}
        />
      ) : null}
      {montarEliminar ? (
        <EliminarNivelDiferido
          abierto={eliminacion.abierto}
          alCerrar={eliminacion.cerrar}
          nivel={eliminacion.nivel}
          enCurso={niveles.enCurso}
          alEliminar={niveles.eliminar}
          focoAlCerrar={() =>
            document.querySelector<HTMLElement>(
              `[data-mas-acciones="${PREFIJO_DE_NIVEL}-${eliminacion.nivel?.id ?? ''}-mas"]`,
            ) ?? true
          }
        />
      ) : null}
    </>
  )
}

// Configuración › Cotización › Niveles: se crean, renombran, retiran y restauran; uno que alguna hoja nombra no se elimina, se retira (sigue
// filtrando lo que ya lo usa y no se ofrece en un diseño nuevo). Hasta el tope que dice la base —contando los retirados—; la lista no se pagina.
// Todo cambio lo hace la base por RPC con su versión, y cada respuesta trae la lista entera con el motivo de uso de cada nivel. Quien sólo lee
// (`equipo.roles.ver`) ve la lista sin «Nuevo nivel» ni «⋯».
export function NivelesDeAcceso({ lista: inicial, puedeGestionar }: Props) {
  const niveles = useNiveles(inicial)
  const { lista } = niveles
  const modal = useModalDeNivel(lista, puedeGestionar)
  const eliminacion = useEliminarNivelPorUrl(lista.niveles, puedeGestionar)
  const alTope = alTopeDeNiveles(lista.niveles, lista.tope)
  const filas = useFilasDeNiveles(lista, niveles, puedeGestionar, {
    alRenombrar: modal.abrirRenombre,
    alPedirEliminar: eliminacion.abrir,
  })

  return (
    <section className="grid gap-3" aria-labelledby="titulo-de-niveles">
      <Encabezado puedeGestionar={puedeGestionar} alTope={alTope} alNuevo={modal.abrirNuevo} />
      {alTope && puedeGestionar ? (
        <Aviso tono="aviso">
          <span id="niveles-tope">{textoDelTopeDeNiveles(lista.tope)}</span>
        </Aviso>
      ) : null}
      <Lista filas={filas.enUso} prefijo={PREFIJO_DE_NIVEL} conAcciones={filas.conAcciones} />
      <Retirados filas={filas.retiradas} tope={lista.tope} conAcciones={filas.conAcciones} />
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        {lista.niveles.length} de {lista.tope} niveles posibles.
      </p>
      <p role="status" aria-live="polite" className="sr-only">
        {niveles.anuncio}
      </p>
      <Ventanas niveles={niveles} modal={modal} eliminacion={eliminacion} />
    </section>
  )
}
