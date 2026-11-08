'use client'

import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import {
  COLORES_DE_UN_TEMA,
  contrasteDeUnTema,
  normalizarColor,
  type ColorDeUnTema,
  type ColoresDeUnTema,
  type TemaDeUnTono,
} from '../../../entities/diseno/tonos'

const TITULO: Record<TemaDeUnTono, string> = { claro: 'Tema claro', oscuro: 'Tema oscuro' }
const COLOR: Record<ColorDeUnTema, string> = { fondo: 'Fondo', borde: 'Borde', tinta: 'Tinta' }

type Props = {
  tema: TemaDeUnTono
  colores: ColoresDeUnTema
  // Los motivos por campo: `claro.fondo`… (un hex mal escrito) y `claro` (el AA).
  errores: Readonly<Record<string, string>>
  alEscribir: (color: ColorDeUnTema, valor: string) => void
}

function FilaDeColor({
  tema,
  color,
  valor,
  error,
  alEscribir,
}: {
  tema: TemaDeUnTono
  color: ColorDeUnTema
  valor: string
  error: string | undefined
  alEscribir: (valor: string) => void
}) {
  const id = `tono-${tema}-${color}`
  return (
    <div className="grid gap-1">
      <Label htmlFor={id}>{COLOR[color]}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${COLOR[color]} del ${TITULO[tema].toLowerCase()}, selector`}
          className="h-11 w-12 shrink-0 cursor-pointer rounded-md border border-(--color-line) bg-transparent p-1 md:h-9"
          value={normalizarColor(valor) ?? '#000000'}
          onChange={(evento) => {
            alEscribir(evento.target.value)
          }}
        />
        <Input
          id={id}
          name={id}
          autoComplete="off"
          spellCheck={false}
          placeholder="#rrggbb"
          maxLength={20}
          className="h-11 font-mono md:h-9"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          value={valor}
          onChange={(evento) => {
            alEscribir(evento.target.value)
          }}
        />
      </div>
      {error ? (
        <p id={`${id}-error`} className="text-(length:--text-sm) text-(--color-peligro-ink)">
          {error}
        </p>
      ) : null}
    </div>
  )
}

// Un tema de un tono: sus tres colores (un selector nativo y el campo `#rrggbb`, que escriben el mismo valor), la muestra «Aa» y el contraste de la tinta sobre el
// fondo en vivo. El motivo del AA que da la base (o `validarTono()` al enviar) reemplaza a la línea en vivo y marca la tinta; «Guardar» no se apaga por él.
export function CamposDeColor({ tema, colores, errores, alEscribir }: Props) {
  const medido = contrasteDeUnTema(tema, colores)
  const motivo = errores[tema]
  const texto = motivo ?? medido?.texto ?? null
  const malo = motivo !== undefined || medido?.cumple === false
  const fondo = normalizarColor(colores.fondo)
  const borde = normalizarColor(colores.borde)
  const tinta = normalizarColor(colores.tinta)
  return (
    <fieldset className="grid gap-3 rounded-(--radius-card) border border-(--color-line) p-3">
      <legend className="px-1 text-(length:--text-sm) font-semibold text-(--color-ink)">
        {TITULO[tema]}
      </legend>
      {COLORES_DE_UN_TEMA.map((color) => (
        <FilaDeColor
          key={color}
          tema={tema}
          color={color}
          valor={colores[color]}
          error={errores[`${tema}.${color}`] ?? (color === 'tinta' ? motivo : undefined)}
          alEscribir={(valor) => {
            alEscribir(color, valor)
          }}
        />
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <span
          aria-hidden
          className="inline-flex h-10 items-center rounded-md border-2 px-3 font-semibold"
          style={{
            backgroundColor: fondo ?? 'transparent',
            borderColor: borde ?? 'transparent',
            color: tinta ?? 'inherit',
          }}
        >
          Aa Así se lee
        </span>
        <p
          role="status"
          className={
            malo
              ? 'text-(length:--text-sm) text-(--color-peligro-ink)'
              : 'text-(length:--text-sm) text-(--color-positivo-ink)'
          }
        >
          {texto}
        </p>
      </div>
    </fieldset>
  )
}
