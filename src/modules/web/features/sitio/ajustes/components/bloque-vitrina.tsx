'use client'

import { useId } from 'react'
import type { ConteoAcotado } from '@/shared/lib/conteo'
import { Aviso } from '@/shared/ui/aviso'
import { Bloque } from '@/shared/ui/bloque'
import { Checkbox } from '@/shared/ui/checkbox'
import { Interruptor } from '@/shared/ui/interruptor'
import { avisoDeOrigenApagado } from '../../../../entities/sitio/ajustes'
import type { ErroresDeAjustesDelSitio } from '../hooks/use-guardar-ajustes-del-sitio'

type Props = {
  // Los orígenes activos, en el orden en que llegan (los nombres salen de la base).
  origenes: readonly { id: string; nombre: string }[]
  // Los que hoy se ven en la web (lo guardado), para avisar al destildar uno.
  guardados: readonly string[]
  tildados: readonly string[]
  alTildar: (id: string, tildado: boolean) => void
  conteos: Record<string, ConteoAcotado | null>
  mostrarMonedaSecundaria: boolean
  alCambiarMoneda: (valor: boolean) => void
  deshabilitado: boolean
  errores: ErroresDeAjustesDelSitio
}

// Qué orígenes se ven en la web y si los precios van también en la moneda secundaria. Destildar uno que hoy se ve avisa cuántos
// vehículos publicados dejan de verse (antes de guardar; guardar es reversible).
export function BloqueVitrina(props: Props) {
  const { origenes, guardados, tildados, alTildar, conteos, errores, deshabilitado } = props
  const id = useId()
  const error = errores['origenesVisibles']
  return (
    <Bloque titulo="Vitrina" descripcion="Lo que la web muestra del inventario.">
      <fieldset
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={error ? true : undefined}
        className="grid min-w-0 gap-1 border-0 p-0"
      >
        <legend className="mb-1 text-(length:--text-sm) font-medium text-(--color-ink)">
          Orígenes que se ven en la web
        </legend>
        {error ? (
          <p id={`${id}-error`} className="text-(length:--text-sm) text-(--color-peligro-ink)">
            {error}
          </p>
        ) : null}
        {origenes.length === 0 ? (
          <p className="text-(length:--text-sm) text-(--color-ink-soft)">
            Todavía no hay orígenes activos.
          </p>
        ) : (
          origenes.map((origen) => {
            const tildado = tildados.includes(origen.id)
            const aviso =
              !tildado && guardados.includes(origen.id)
                ? avisoDeOrigenApagado(origen.nombre, conteos[origen.id] ?? null)
                : null
            return (
              <div key={origen.id} className="grid gap-1">
                <label
                  htmlFor={`${id}-${origen.id}`}
                  className="flex min-h-11 items-center gap-2 text-(length:--text-sm) break-words md:min-h-0"
                >
                  <Checkbox
                    id={`${id}-${origen.id}`}
                    checked={tildado}
                    disabled={deshabilitado}
                    onCheckedChange={(marcada) => {
                      alTildar(origen.id, marcada)
                    }}
                  />
                  {origen.nombre}
                </label>
                {aviso ? <Aviso tono="aviso">{aviso}</Aviso> : null}
              </div>
            )
          })
        )}
      </fieldset>
      <Interruptor
        titulo="Mostrar la moneda secundaria"
        ayuda="El sitio muestra cada precio también en la moneda secundaria."
        valor={props.mostrarMonedaSecundaria}
        alCambiar={props.alCambiarMoneda}
        deshabilitado={deshabilitado}
      />
    </Bloque>
  )
}
