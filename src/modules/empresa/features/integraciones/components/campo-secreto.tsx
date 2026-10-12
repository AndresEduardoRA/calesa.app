'use client'

import { useId, useState } from 'react'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { enfocarPrimerError, errorDeCampo, valoresDe } from '@/shared/lib/formularios'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { useRegional } from '@/shared/ui/regional'
import type { EdicionesDeApibara } from '../hooks/use-apibara'

type Props = {
  // ISO: cuándo se guardó la clave, o null si todavía no hay.
  guardadoEn: string | null
  puedeEditar: boolean
  ediciones: EdicionesDeApibara
}

// La clave de la API. Nunca se muestra: de la que está guardada sólo se sabe cuándo se guardó, y
// se puede reemplazar por otra. El campo nace vacío siempre.
export function CampoSecreto({ guardadoEn, puedeEditar, ediciones }: Props) {
  const { zonaHoraria } = useRegional()
  const idFormulario = useId()
  const [reemplazando, setReemplazando] = useState(false)
  const pidiendo = guardadoEn === null || reemplazando

  async function guardar(elemento: HTMLFormElement) {
    const guardada = await ediciones.guardarClave(valoresDe(elemento, ['secreto']).secreto)
    if (!guardada) {
      enfocarPrimerError(elemento)
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid gap-0.5">
          <span className="text-(length:--text-sm) font-medium text-(--color-ink)">
            Clave de la API
          </span>
          <span className="text-(length:--text-sm) text-(--color-ink-faint)">
            {guardadoEn
              ? `Guardada el ${formatearFechaHora(guardadoEn, { zona: zonaHoraria })}. No se puede ver: sólo reemplazar.`
              : 'Todavía no hay una clave guardada.'}
          </span>
        </div>
        {guardadoEn && !reemplazando && puedeEditar ? (
          <Button
            type="button"
            variant="outline"
            className="h-11 md:h-8"
            onClick={() => {
              setReemplazando(true)
            }}
          >
            Reemplazar
          </Button>
        ) : null}
      </div>
      {pidiendo && puedeEditar ? (
        <form
          id={idFormulario}
          noValidate
          className="grid gap-3"
          onSubmit={(evento) => {
            evento.preventDefault()
            void guardar(evento.currentTarget)
          }}
        >
          <Campo
            nombre="secreto"
            etiqueta={guardadoEn ? 'Clave nueva' : 'Clave'}
            type="password"
            // Que el navegador no proponga una contraseña guardada ni ofrezca guardar esta.
            autoComplete="new-password"
            spellCheck={false}
            error={errorDeCampo(ediciones.errores.secreto, 'secreto')}
            ayuda="Se guarda cifrada y no vuelve a mostrarse."
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="h-11 md:h-9" disabled={ediciones.enCurso}>
              {ediciones.enCurso ? 'Guardando…' : 'Guardar clave'}
            </Button>
            {reemplazando ? (
              <Button
                type="button"
                variant="ghost"
                className="h-11 md:h-9"
                disabled={ediciones.enCurso}
                onClick={() => {
                  setReemplazando(false)
                }}
              >
                Cancelar
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  )
}
