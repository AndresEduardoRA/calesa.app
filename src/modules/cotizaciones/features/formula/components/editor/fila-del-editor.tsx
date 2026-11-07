'use client'

import { memo } from 'react'
import { Button } from '@/shared/ui/button'
import type { ErrorDeFila } from '../../../../entities/formula/compilar-fila'
import type { CifraDeLaFila } from '../../../../entities/formula/vista-previa'
import type { FilaAbierta } from '../../hooks/use-editor-de-la-formula'
import { editable, type FilaParaDibujar } from '../../hooks/use-editor-de-la-formula.soporte'
import { CamposDeLaFila } from './campos-de-la-fila'
import { CifraDePrueba } from './cifra-de-prueba'
import { EstadoDelTexto } from './estado-del-texto'
import { TextoDeLaFila } from './texto-de-la-fila'

type Props = {
  fila: FilaParaDibujar
  // La cifra de prueba de la fila (vista previa, 4.21-3a-2).
  cifra: CifraDeLaFila
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

const textoInicial = (fila: FilaParaDibujar) => ('texto' in fila.texto ? fila.texto.texto : '')

export const FilaDelEditor = memo(function FilaDelEditor({
  fila,
  cifra,
  abierta,
  bloqueada,
  rechazo,
  soltados,
  alAbrir,
  alCancelar,
  alAplicar,
}: Props) {
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
        <CifraDePrueba cifra={cifra} />
        {editable(fila) && !abierta ? (
          <Button
            type="button"
            variant="outline"
            className="ml-auto min-h-11 md:min-h-9"
            aria-label={`Editar ${fila.etiqueta}`}
            disabled={bloqueada}
            title={bloqueada ? 'Aplica o cancela la fila abierta.' : undefined}
            onClick={() => {
              alAbrir(fila.id)
            }}
          >
            Editar
          </Button>
        ) : null}
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
      {soltados.length > 0 ? (
        <p className="text-(--color-ink-soft)">
          Esta fila dejó de llevar: {soltados.map((campo) => CAMPOS[campo] ?? campo).join(', ')}.
        </p>
      ) : null}
      {rechazo ? (
        <p
          role="alert"
          className="rounded-(--radius-md) bg-(--color-aviso-soft) p-2 text-(--color-aviso-ink)"
        >
          {rechazo}
        </p>
      ) : null}
    </li>
  )
})
