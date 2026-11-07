'use client'

import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { Checkbox } from '@/shared/ui/checkbox'
import { useLive } from '@/shared/ui/live'
import { MENSAJE_SIN_LA_CONSTANTE } from '../../../../entities/formula/ajuste'
import { ValorDeNodo } from '../../../hoja/components/valor-de-nodo'
import type { BloqueDeConstante as Bloque } from '../../hooks/use-ajuste-de-constante'
import { EsqueletoDelValor } from './esqueleto-del-valor'

// Las marcas de 1Password, LastPass, Bitwarden y Dashlane para que un campo de contraseña no invite a «Guardar contraseña». Copia de las de la entrada de la XCell
// (`src/shared/ui/xcell/entrada-de-xcell.tsx`, `MARCAS_DE_GESTORES`, que no se exportan): con el Modo Live, «Valor nuevo» se escribe como una celda.
const MARCAS_DE_GESTORES = {
  'data-1p-ignore': 'true',
  'data-lpignore': 'true',
  'data-bwignore': 'true',
  'data-form-type': 'other',
}

type Props = {
  bloque: Bloque
  // Con dos bloques, cada uno dice qué constante cambia.
  conNombre: boolean
  leyendo: boolean
  // Mientras se envía cualquiera de los bloques.
  enCurso: boolean
  // Lo leído ya no vale (otra publicada, o no se sabe si entró): primero «Volver a leer».
  bloqueado: boolean
  alEscribir: (texto: string) => void
  alMarcar: (valor: boolean) => void
  alEnviar: () => void
}

// «Valor nuevo» con el Modo Live (como una celda: contraseña, sin gestores), su aviso y, en un porcentaje, cómo se tipea.
const propsDelCampo = (bloque: Bloque, live: boolean) => ({
  type: live ? 'password' : 'text',
  ...(live ? MARCAS_DE_GESTORES : {}),
  ...(bloque.aviso ? { error: bloque.aviso } : {}),
  ...(bloque.formato === 'pct' ? { ayuda: 'En porcentaje: 13 es 13 %.' } : {}),
})

// Una constante del ⚙ (4.20-3b): su valor por defecto, lo que afecta, «Valor nuevo», «Aplicar también a esta cotización» (sólo si la celda se edita aquí) y el botón.
// Enter envía. El valor por defecto pasa por `<ValorDeNodo>` (el dinero, por `<Monto>`).
export function BloqueDeConstante(props: Props) {
  const { bloque, conNombre, leyendo, enCurso, bloqueado, alEscribir, alMarcar, alEnviar } = props
  const { live } = useLive()
  const apagado = leyendo || enCurso
  return (
    <form
      aria-label={bloque.nombre}
      className="grid gap-3"
      onSubmit={(evento) => {
        evento.preventDefault()
        alEnviar()
      }}
    >
      {conNombre ? (
        <h3 className="text-(length:--text-base) font-medium text-(--color-ink)">
          {bloque.nombre}
        </h3>
      ) : null}
      {!leyendo && bloque.porDefecto === null ? (
        <p className="text-(length:--text-sm) text-(--color-ink-soft)">
          {MENSAJE_SIN_LA_CONSTANTE}
        </p>
      ) : (
        <>
          <p className="text-(length:--text-sm) text-(--color-ink)">
            Valor por defecto:{' '}
            {leyendo ? (
              <EsqueletoDelValor />
            ) : (
              <ValorDeNodo valor={bloque.porDefecto} formato={bloque.formato} />
            )}
          </p>
          <p className="text-(length:--text-sm) text-(--color-ink-faint)">
            Afecta a las cotizaciones nuevas de este origen: publica una versión nueva de la
            fórmula.
          </p>
          <Campo
            nombre={`valor-nuevo-${bloque.nodo}`}
            etiqueta="Valor nuevo"
            inputMode="decimal"
            autoComplete="off"
            {...propsDelCampo(bloque, live)}
            spellCheck={false}
            value={bloque.texto}
            disabled={apagado}
            onChange={(evento) => {
              alEscribir(evento.target.value)
            }}
          />
          {bloque.editable ? (
            <label className="flex min-h-11 items-center gap-2 text-(length:--text-sm) text-(--color-ink) md:min-h-8">
              <Checkbox checked={bloque.aplicar} disabled={apagado} onCheckedChange={alMarcar} />
              Aplicar también a esta cotización
            </label>
          ) : null}
          <Button
            type="submit"
            disabled={apagado || bloqueado}
            className="min-h-11 justify-self-start md:min-h-8"
          >
            {enCurso ? 'Cambiando…' : 'Cambiar el valor por defecto'}
          </Button>
        </>
      )}
    </form>
  )
}
