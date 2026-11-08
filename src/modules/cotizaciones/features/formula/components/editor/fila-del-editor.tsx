'use client'

import { memo } from 'react'
import type { ErrorDeFila } from '../../../../entities/formula/compilar-fila'
import type { ErrorDeFilaNueva, PedidoDeFilaNueva } from '../../../../entities/formula/fila-nueva'
import type { CifraDeLaFila } from '../../../../entities/formula/vista-previa'
import type { FilaAbierta } from '../../hooks/use-editor-de-la-formula'
import { editable, type FilaParaDibujar } from '../../hooks/use-editor-de-la-formula.soporte'
import { BotonesDeLaFila } from './botones-de-la-fila'
import { CamposDeLaFila } from './campos-de-la-fila'
import { CifraDePrueba } from './cifra-de-prueba'
import { EstadoDelTexto } from './estado-del-texto'
import { SumarFila } from './sumar-fila'
import { TextoDeLaFila } from './texto-de-la-fila'

export type FilaDelEditorProps = {
  fila: FilaParaDibujar
  // La cifra de prueba de la fila (vista previa, 4.21-3a-2).
  cifra: CifraDeLaFila
  // La etiqueta de su grupo (4.21-3c, C7), o nula si no tiene.
  grupo: string | null
  abierta: FilaAbierta | null
  // Otra fila está abierta: «Editar» espera.
  bloqueada: boolean
  // El rechazo de `validarFormula()` que nombra esta fila.
  rechazo: string | null
  // Lo que el último «Aplicar» soltó de esta fila.
  soltados: string[]
  alAbrir: (id: string) => void
  alCancelar: () => void
  alAplicar: (texto: string, confirmaPisar?: boolean) => void
  // «Sumar fila» (4.21-3a-2): el formulario abierto bajo esta fila (con el error del último intento), o nulo.
  sumando: { error: ErrorDeFilaNueva | null } | null
  // Hay algo abierto: «Sumar fila» espera.
  sumarBloqueado: boolean
  // La fila acaba de crearse: el foco va a su «Editar».
  enfocar: boolean
  ocupados: ReadonlySet<string>
  alSumar: (id: string) => void
  alCancelarSumar: () => void
  alCrear: (pedido: Omit<PedidoDeFilaNueva, 'despuesDe'>) => void
}

const TIPOS: Record<FilaParaDibujar['nodo']['tipo'], string> = {
  input: 'Input',
  constante: 'Constante',
  tipo_cambio: 'Tipo de cambio',
  campo_vehiculo: 'Campo del vehículo',
  bandera: 'Bandera',
  opcion: 'Variante',
  tabla: 'Tabla',
  tramo: 'Tramo',
  calculo: 'Cálculo',
}

// Los nombres de los campos que una fila deja de llevar al compilar su texto (`soltados` de `compilarFila()`).
const CAMPOS: Record<string, string> = {
  sobrescribible: 'se puede modificar',
  condicion: 'interruptor',
  solo_en: 'variantes',
  formato: 'formato',
}

// Lo que el último «Aplicar» soltó de la fila.
function LoSoltado({ soltados }: { soltados: string[] }) {
  if (soltados.length === 0) return null
  return (
    <p className="text-(--color-ink-soft)">
      Esta fila dejó de llevar: {soltados.map((campo) => CAMPOS[campo] ?? campo).join(', ')}.
    </p>
  )
}

const textoInicial = (fila: FilaParaDibujar) => ('texto' in fila.texto ? fila.texto.texto : '')

export const FilaDelEditor = memo(function FilaDelEditor({
  fila,
  cifra,
  grupo,
  abierta,
  bloqueada,
  rechazo,
  soltados,
  alAbrir,
  alCancelar,
  alAplicar,
  sumando,
  sumarBloqueado,
  enfocar,
  ocupados,
  alSumar,
  alCancelarSumar,
  alCrear,
}: FilaDelEditorProps) {
  const error: ErrorDeFila | null = abierta?.error ?? null
  return (
    <li
      data-fila={fila.id}
      className="grid min-w-0 gap-1 rounded-(--radius-lg) border border-(--color-line) bg-(--color-surface) p-3 text-(length:--text-sm)"
    >
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="font-semibold break-words text-(--color-ink)">{fila.etiqueta}</span>
        <code className="break-all text-(--color-ink-soft)">{fila.id}</code>
        <span className="text-(--color-ink-soft)">{TIPOS[fila.nodo.tipo]}</span>
        {grupo === null ? null : <span className="text-(--color-ink-soft)">Grupo: {grupo}</span>}
        <CifraDePrueba cifra={cifra} />
        <BotonesDeLaFila
          etiqueta={fila.etiqueta}
          puedeEditar={editable(fila) && !abierta}
          bloqueada={bloqueada}
          sumarBloqueado={sumarBloqueado}
          enfocar={enfocar}
          alEditar={() => {
            alAbrir(fila.id)
          }}
          alSumar={() => {
            alSumar(fila.id)
          }}
        />
      </div>
      {abierta ? (
        <TextoDeLaFila
          fila={fila}
          inicial={textoInicial(fila)}
          error={error}
          alCancelar={alCancelar}
          alAplicar={alAplicar}
        />
      ) : fila.texto.modo === 'campos' ? (
        <CamposDeLaFila nodo={fila.nodo} valor={fila.valor} />
      ) : (
        <EstadoDelTexto texto={fila.texto} />
      )}
      <LoSoltado soltados={soltados} />
      {rechazo ? (
        <p
          role="alert"
          className="rounded-(--radius-md) bg-(--color-aviso-soft) p-2 text-(--color-aviso-ink)"
        >
          {rechazo}
        </p>
      ) : null}
      {sumando ? (
        <SumarFila
          ocupados={ocupados}
          error={sumando.error}
          alCrear={alCrear}
          alCancelar={alCancelarSumar}
        />
      ) : null}
    </li>
  )
})
