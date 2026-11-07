'use client'

import { useEffect, useId } from 'react'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { Label } from '@/shared/ui/label'
import { Textarea } from '@/shared/ui/textarea'
import type {
  CampoDeFilaNueva,
  ErrorDeFilaNueva,
  PedidoDeFilaNueva,
  TipoDeFilaNueva,
} from '../../../../entities/formula/fila-nueva'
import { useFormularioDeFilaNueva } from '../../hooks/use-formulario-de-fila-nueva'

type Props = {
  ocupados: ReadonlySet<string>
  // El error del último «Crear fila», junto a su campo.
  error: ErrorDeFilaNueva | null
  alCrear: (pedido: Omit<PedidoDeFilaNueva, 'despuesDe'>) => void
  alCancelar: () => void
}

const TIPOS: { tipo: TipoDeFilaNueva; etiqueta: string }[] = [
  { tipo: 'calculo', etiqueta: 'Cálculo' },
  { tipo: 'constante', etiqueta: 'Constante' },
]

const AVISO_DE_LA_CONSTANTE =
  'Una constante nueva aún no aparece en la hoja: hay que colocarla en el diseño.'

function TipoDeLaFilaNueva({
  nombre,
  tipo,
  alCambiar,
}: {
  nombre: string
  tipo: TipoDeFilaNueva
  alCambiar: (tipo: TipoDeFilaNueva) => void
}) {
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1 text-(length:--text-sm) font-medium text-(--color-ink)">Tipo</legend>
      <div className="flex flex-wrap gap-4">
        {TIPOS.map((opcion) => (
          <label key={opcion.tipo} className="flex min-h-11 items-center gap-2 md:min-h-9">
            <input
              type="radio"
              name={nombre}
              checked={tipo === opcion.tipo}
              onChange={() => {
                alCambiar(opcion.tipo)
              }}
            />
            {opcion.etiqueta}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function TextoDeLaFilaNueva({
  id,
  tipo,
  texto,
  error,
  alCambiar,
}: {
  id: string
  tipo: TipoDeFilaNueva
  texto: string
  error: string | undefined
  alCambiar: (texto: string) => void
}) {
  const idDelError = `${id}-error`
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>Texto</Label>
      <Textarea
        id={id}
        className="font-mono"
        spellCheck={false}
        placeholder={tipo === 'calculo' ? 'a+b' : '0'}
        value={texto}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? idDelError : undefined}
        onChange={(evento) => {
          alCambiar(evento.target.value)
        }}
      />
      {error ? (
        <p id={idDelError} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
      {tipo === 'constante' ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">{AVISO_DE_LA_CONSTANTE}</p>
      ) : null}
    </div>
  )
}

// El formulario de «Sumar fila» (4.21-3a-2, C5, P6): etiqueta, tipo, nombre propuesto y texto, bajo la fila. «Crear fila» o Ctrl/Cmd+Enter crean; Esc cancela; un error se
// dice junto a su campo (`aria-invalid`, `aria-describedby`), con el foco en él, y lo escrito queda.
export function SumarFila({ ocupados, error, alCrear, alCancelar }: Props) {
  const f = useFormularioDeFilaNueva(ocupados)
  const uid = useId()
  const campoId = (campo: CampoDeFilaNueva) => `${uid}-${campo}`
  const deError = (campo: CampoDeFilaNueva) => (error?.campo === campo ? error.mensaje : undefined)

  // Al abrir (sin error) el foco va a la etiqueta; con un error nuevo, a su campo.
  useEffect(() => {
    document.getElementById(`${uid}-${error?.campo ?? 'etiqueta'}`)?.focus()
  }, [uid, error])

  return (
    <div
      className="grid min-w-0 gap-3 rounded-(--radius-md) border border-(--color-line) p-3"
      onKeyDown={(evento) => {
        if (evento.key === 'Escape') {
          evento.preventDefault()
          alCancelar()
        } else if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
          evento.preventDefault()
          alCrear(f.pedido())
        }
      }}
    >
      <Campo
        nombre={campoId('etiqueta')}
        etiqueta="Etiqueta"
        value={f.etiqueta}
        error={deError('etiqueta')}
        onChange={(evento) => {
          f.cambiarEtiqueta(evento.target.value)
        }}
      />
      <TipoDeLaFilaNueva nombre={`${uid}-tipo`} tipo={f.tipo} alCambiar={f.cambiarTipo} />
      <Campo
        nombre={campoId('id')}
        etiqueta="Nombre"
        className="h-11 font-mono md:h-9"
        spellCheck={false}
        value={f.id}
        error={deError('id')}
        ayuda="Es el nombre que usan los textos de las demás filas."
        onChange={(evento) => {
          f.cambiarId(evento.target.value)
        }}
      />
      <TextoDeLaFilaNueva
        id={campoId('texto')}
        tipo={f.tipo}
        texto={f.texto}
        error={deError('texto')}
        alCambiar={f.cambiarTexto}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="min-h-11 md:min-h-9"
          onClick={() => {
            alCrear(f.pedido())
          }}
        >
          Crear fila
        </Button>
        <Button
          type="button"
          variant="outline"
          className="min-h-11 md:min-h-9"
          onClick={alCancelar}
        >
          Cancelar
        </Button>
      </div>
    </div>
  )
}
