'use client'

import { PlusIcon } from 'lucide-react'
import { Aviso } from '@/shared/ui/aviso'
import { Button } from '@/shared/ui/button'
import { ListaDeCatalogo } from '@/shared/ui/lista-de-catalogo/lista-de-catalogo'
import { useFocoTrasMover } from '@/shared/ui/lista-de-catalogo/use-foco-tras-mover'
import {
  TOPE_DE_TIPOS_POR_GRUPO,
  type ClaveDeGrupo,
} from '../../../entities/documentos/tipo-de-documento'
import {
  alTopeDelGrupo,
  firmaDelOrden,
  motivoDeSoloLectura,
  textoDelTope,
  type VistaDeGrupo,
} from '../../../entities/documentos/vista-de-grupo'
import type { TiposDeDocumento } from '../hooks/use-tipos-de-documento'
import { filasDeTipos } from './filas-de-tipos'

type Props = {
  clave: ClaveDeGrupo
  vista: VistaDeGrupo
  // «De toda la empresa» o «Sólo de este flujo»: el título del grupo; `detalle` dice para qué sirve.
  titulo: string
  detalle: string
  vacio: string
  tipos: TiposDeDocumento
  alNuevo: (clave: ClaveDeGrupo) => void
  alEditar: (id: string) => void
  alPedirEliminar: (id: string) => void
}

const BOTON = 'h-11 md:h-8'

type PropsDelEncabezado = {
  idDeTitulo: string
  titulo: string
  detalle: string
  // Por qué «Nuevo tipo» está apagado (sin permiso, o al tope); nulo si se puede.
  motivoNuevo: string | null
  idDelMotivo: string
  alNuevo: () => void
}

function EncabezadoDeGrupo(props: PropsDelEncabezado) {
  const { idDeTitulo, titulo, detalle, motivoNuevo, idDelMotivo, alNuevo } = props
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
      <div className="grid gap-0.5">
        <h2 id={idDeTitulo} className="text-(length:--text-lg) font-semibold text-(--color-ink)">
          {titulo}
        </h2>
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{detalle}</p>
      </div>
      <Button
        className={BOTON}
        disabled={motivoNuevo !== null}
        aria-describedby={motivoNuevo === null ? undefined : idDelMotivo}
        onClick={alNuevo}
      >
        <PlusIcon aria-hidden />
        Nuevo tipo
      </Button>
    </div>
  )
}

// Un grupo de tipos de documento (los de toda la empresa o los de un flujo): su encabezado con «Nuevo tipo», el aviso de sólo lectura si quien
// mira no lo cambia, la lista con su orden por botones y el pie «N de 100 tipos posibles». Sin permiso, «Nuevo tipo» y «Editar» se ven apagados
// con su motivo: nunca desaparecen en silencio.
export function GrupoDeTipos({
  clave,
  vista,
  titulo,
  detalle,
  vacio,
  tipos,
  alNuevo,
  alEditar,
  alPedirEliminar,
}: Props) {
  const { grupo, puedeCambiar } = vista
  const prefijo = `tipo-de-documento-${clave}`
  const idDeTitulo = `titulo-de-tipos-${clave}`
  const alTope = alTopeDelGrupo(grupo)
  const motivoNuevo = puedeCambiar
    ? alTope
      ? textoDelTope(grupo.tope)
      : null
    : motivoDeSoloLectura(clave)
  // El foco vuelve al botón cuando la lista ya está reordenada: la página trae el orden nuevo después de la respuesta, y mover la fila lo quitaría antes.
  const movido = tipos.movimiento?.grupo === clave ? tipos.movimiento : null
  useFocoTrasMover(
    prefijo,
    movido && firmaDelOrden(grupo.tipos) !== movido.firmaAntes ? movido : null,
  )

  const filas = filasDeTipos(vista, clave, {
    alEditar,
    alActivar: (uno, activo) => void tipos.activar(uno, activo),
    alPedirEliminar,
  })

  return (
    <section className="grid gap-3" aria-labelledby={idDeTitulo}>
      <EncabezadoDeGrupo
        idDeTitulo={idDeTitulo}
        titulo={titulo}
        detalle={detalle}
        motivoNuevo={motivoNuevo}
        idDelMotivo={`${prefijo}-motivo`}
        alNuevo={() => {
          alNuevo(clave)
        }}
      />
      {motivoNuevo === null ? null : (
        <Aviso tono={puedeCambiar ? 'aviso' : 'info'}>
          <span id={`${prefijo}-motivo`}>{motivoNuevo}</span>
        </Aviso>
      )}
      {filas.length === 0 ? (
        <p className="rounded-(--radius-card) border border-(--color-line) bg-(--color-surface) p-4 text-(--color-ink-soft)">
          {vacio}
        </p>
      ) : (
        <ListaDeCatalogo
          filas={filas}
          prefijo={prefijo}
          columnaDeUso="Uso"
          alAbrir={(id) => {
            if (puedeCambiar) {
              alEditar(id)
            }
          }}
          alMover={(id, direccion) => {
            const tipo = grupo.tipos.find((uno) => uno.id === id)
            if (tipo && puedeCambiar) void tipos.mover(tipo, direccion)
          }}
        />
      )}
      <p className="text-(length:--text-sm) text-(--color-ink-faint)">
        {grupo.tipos.length} de {TOPE_DE_TIPOS_POR_GRUPO} tipos posibles.
      </p>
    </section>
  )
}
