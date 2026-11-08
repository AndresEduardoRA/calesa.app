'use client'

import { Button } from '@/shared/ui/button'
import type { Grupo } from '../../../../entities/formula'
import type { CambiosDelGrupo, OpcionDeBucket } from '../../../../entities/formula/grupos'
import type { GrupoAbierto, MovidasDelGrupo } from '../../hooks/use-grupos-del-editor'
import type { EstadoDeLosTonos } from '../../hooks/use-tonos'
import type { FilaCandidata, FilaDelGrupo } from './filas-del-grupo'
import { FormularioDelGrupo } from './formulario-del-grupo'

export type GrupoDelEditorProps = {
  grupo: Grupo
  // Las filas del grupo, en el orden de la fórmula.
  miembros: readonly FilaDelGrupo[]
  // Todas las filas que pueden sumar a un grupo, en el orden de la fórmula.
  candidatas: readonly FilaCandidata[]
  tonos: EstadoDeLosTonos
  buckets: readonly OpcionDeBucket[]
  conModos: boolean
  abierto: GrupoAbierto | null
  // Otra cosa abierta o guardándose: «Editar» espera.
  bloqueada: boolean
  // El rechazo de `validarFormula()` que nombra este grupo.
  rechazo: string | null
  movidas: MovidasDelGrupo | null
  alAbrir: (id: string) => void
  alCancelar: () => void
  alAplicar: (cambios: CambiosDelGrupo, tonos: ReadonlySet<string>) => void
  alReintentarTonos: () => void
}

const ESPERA = 'Aplica o cancela la fila abierta.'
const SIN_GRUPO = 'Sin grupo, una fila no entra en el total.'

const nombreDelTono = (tonos: EstadoDeLosTonos, clave: string) =>
  tonos.tipo === 'listo' ? (tonos.tonos.find((t) => t.clave === clave)?.nombre ?? clave) : clave

function LoMovido({ movidas }: { movidas: MovidasDelGrupo }) {
  return (
    <div role="status" className="grid gap-1 text-(--color-ink-soft)">
      {movidas.entraron.map((f) => (
        <p key={f.id}>
          Entró «{f.etiqueta}»{f.desde === null ? '' : ` (estaba en ${f.desde})`}.
        </p>
      ))}
      {movidas.quitadas.map((f) => (
        <p key={f.id}>
          Quedó sin grupo «{f.etiqueta}». {SIN_GRUPO}
        </p>
      ))}
    </div>
  )
}

function Cabecera(p: GrupoDelEditorProps) {
  const { grupo, buckets, miembros } = p
  const cambio = buckets.find((b) => b.bucket === grupo.bucket)
  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
      <span className="font-semibold break-words text-(--color-ink)">{grupo.etiqueta}</span>
      <code className="break-all text-(--color-ink-soft)">{grupo.id}</code>
      <span className="text-(--color-ink-soft)">
        {grupo.plazo === undefined ? 'Sin plazo' : `Plazo: ${grupo.plazo}`}
      </span>
      <span className="text-(--color-ink-soft)">Tono: {nombreDelTono(p.tonos, grupo.tono)}</span>
      <span className="text-(--color-ink-soft)">
        Tipo de cambio: {grupo.bucket}
        {cambio ? ` · ${cambio.etiqueta}` : ''}
      </span>
      <span className="text-(--color-ink-soft)">
        {miembros.length} {miembros.length === 1 ? 'fila' : 'filas'}
      </span>
      {p.abierto ? null : (
        <Button
          type="button"
          variant="outline"
          className="ml-auto min-h-11 md:min-h-9"
          aria-label={`Editar el grupo ${grupo.etiqueta}`}
          disabled={p.bloqueada}
          title={p.bloqueada ? ESPERA : undefined}
          onClick={() => {
            p.alAbrir(grupo.id)
          }}
        >
          Editar
        </Button>
      )}
    </div>
  )
}

// La tarjeta de un grupo en la sección «Grupos» (4.21-3c, C1, C4 y C6): etiqueta, id, plazo, tono, tipo de cambio y cuántas filas suman; el rechazo que lo nombra; lo
// que movió el último «Aplicar»; y, abierta, su formulario.
export function GrupoDelEditor(p: GrupoDelEditorProps) {
  return (
    <li
      data-grupo={p.grupo.id}
      className="grid min-w-0 gap-2 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3 text-(length:--text-sm)"
    >
      <Cabecera {...p} />
      {p.rechazo ? (
        <p
          role="alert"
          className="rounded-(--radius-md) bg-(--color-aviso-soft) p-2 text-(--color-aviso-ink)"
        >
          {p.rechazo}
        </p>
      ) : null}
      {p.movidas ? <LoMovido movidas={p.movidas} /> : null}
      {p.abierto ? (
        <FormularioDelGrupo
          grupo={p.grupo}
          miembros={p.miembros}
          candidatas={p.candidatas}
          errores={p.abierto.errores}
          tonos={p.tonos}
          buckets={p.buckets}
          conModos={p.conModos}
          alAplicar={p.alAplicar}
          alCancelar={p.alCancelar}
          alReintentarTonos={p.alReintentarTonos}
        />
      ) : null}
    </li>
  )
}
