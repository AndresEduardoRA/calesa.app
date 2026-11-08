'use client'

import { useId, useMemo } from 'react'
import { textoDelTope } from '@/shared/lib/conteo'
import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { AvisoDeTope } from '@/shared/ui/aviso-de-tope'
import type { Formula } from '../../../../entities/formula'
import { opcionesDeBucket, type CambiosDelGrupo } from '../../../../entities/formula/grupos'
import type { Diseno } from '../../../../entities/diseno'
import type { EditorDeLaFormula, RechazoEnElEditor } from '../../hooks/use-editor-de-la-formula'
import type { GrupoAbierto, MovidasDelGrupo } from '../../hooks/use-grupos-del-editor'
import { useTonos } from '../../hooks/use-tonos'
import { GrupoDelEditor } from './grupo-del-editor'

type Props = {
  trabajo: Formula
  abierto: GrupoAbierto | null
  movidas: MovidasDelGrupo | null
  rechazo: RechazoEnElEditor | null
  // Otra cosa abierta o guardándose: «Editar» espera.
  bloqueada: boolean
  conModos: boolean
  alAbrir: (id: string) => void
  alCancelar: () => void
  alAplicar: (cambios: CambiosDelGrupo, tonos: ReadonlySet<string>) => void
}

// Se monta sólo con grupos: una fórmula sin grupos no la dibuja, no ofrece convertirla (P2) y no lee los tonos.
export function GruposDeLaFormula({
  editor,
  diseno,
}: {
  editor: EditorDeLaFormula
  diseno: Diseno | null
}) {
  if ((editor.trabajo.definicion.grupos ?? []).length === 0) return null
  return (
    <SeccionDeGrupos
      trabajo={editor.trabajo}
      abierto={editor.grupos.abierto}
      movidas={editor.grupos.movidas}
      rechazo={editor.rechazo}
      bloqueada={!editor.libre}
      conModos={(diseno?.cabecera.modos.length ?? 0) > 0}
      alAbrir={editor.abrirGrupo}
      alCancelar={editor.grupos.cancelar}
      alAplicar={editor.grupos.aplicar}
    />
  )
}

type Miembro = { id: string; etiqueta: string }

// Las filas de cada grupo, de un solo recorrido de los nodos por fórmula de trabajo.
function miembrosPorGrupo(trabajo: Formula): Map<string, Miembro[]> {
  const por = new Map<string, Miembro[]>()
  for (const n of trabajo.definicion.nodos) {
    if (n.grupo === undefined) continue
    const lista = por.get(n.grupo) ?? []
    lista.push({ id: n.id, etiqueta: n.etiqueta })
    por.set(n.grupo, lista)
  }
  return por
}

const SIN_MIEMBROS: Miembro[] = []

// La sección «Grupos» del editor de la fórmula (4.21-3c, C1): una tarjeta por grupo, en el orden de `grupos`, hasta `TOPE_DE_LO_CARGADO`. Los tonos del catálogo se
// leen al montarse (C3).
function SeccionDeGrupos(p: Props) {
  const tonos = useTonos()
  const idDelTitulo = useId()
  const grupos = p.trabajo.definicion.grupos ?? []
  const buckets = useMemo(() => opcionesDeBucket(p.trabajo), [p.trabajo])
  const miembros = useMemo(() => miembrosPorGrupo(p.trabajo), [p.trabajo])
  return (
    <section aria-labelledby={idDelTitulo} className="grid min-w-0 gap-2">
      <h4 id={idDelTitulo} className="text-(length:--text-sm) font-semibold text-(--color-ink)">
        Grupos
      </h4>
      <ul aria-label="Grupos de la fórmula" className="grid grid-cols-[minmax(0,1fr)] gap-2">
        {grupos.slice(0, TOPE_DE_LO_CARGADO).map((grupo) => {
          const abierto = p.abierto?.id === grupo.id ? p.abierto : null
          return (
            <GrupoDelEditor
              key={grupo.id}
              grupo={grupo}
              miembros={miembros.get(grupo.id) ?? SIN_MIEMBROS}
              tonos={tonos.estado}
              buckets={buckets}
              conModos={p.conModos}
              abierto={abierto}
              bloqueada={p.bloqueada}
              rechazo={p.rechazo?.grupoId === grupo.id ? p.rechazo.mensaje : null}
              movidas={p.movidas?.grupoId === grupo.id ? p.movidas : null}
              alAbrir={p.alAbrir}
              alCancelar={p.alCancelar}
              alAplicar={p.alAplicar}
              alReintentarTonos={tonos.reintentar}
            />
          )
        })}
      </ul>
      {grupos.length > TOPE_DE_LO_CARGADO ? (
        <AvisoDeTope
          texto={textoDelTope(TOPE_DE_LO_CARGADO, { orden: 'primeros grupos', articulo: 'los' })}
          camino="Busca una fila por su nombre o su etiqueta."
        />
      ) : null}
    </section>
  )
}
