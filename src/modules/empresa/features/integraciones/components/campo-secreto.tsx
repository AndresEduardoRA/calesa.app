'use client'

import { useId, useState } from 'react'
import { formatearFechaHora } from '@/shared/lib/fechas'
import { enfocarPrimerError, errorDeCampo, valoresDe } from '@/shared/lib/formularios'
import { Button } from '@/shared/ui/button'
import { Campo } from '@/shared/ui/campo'
import { useRegional } from '@/shared/ui/regional'
import type { ClaveIntegracion } from '../../../entities/integraciones'

// Los textos de cada integración con secreto. El `nombre` del campo es su `id` en la página: con
// dos tarjetas, la etiqueta de una no puede apuntar al campo de la otra.
const TEXTOS = {
  apibara: {
    nombre: 'secreto',
    titulo: 'Clave de la API',
    etiqueta: 'Clave',
    etiquetaNueva: 'Clave nueva',
    guardar: 'Guardar clave',
    vacio: 'Todavía no hay una clave guardada.',
    guardado: 'Guardada el',
  },
  web_publica: {
    nombre: 'secretoDeRevalidacion',
    titulo: 'Secreto de revalidación',
    etiqueta: 'Secreto',
    etiquetaNueva: 'Secreto nuevo',
    guardar: 'Guardar secreto',
    vacio: 'Todavía no hay un secreto guardado.',
    guardado: 'Guardado el',
  },
} as const satisfies Partial<Record<ClaveIntegracion, Record<string, string>>>

type Props = {
  clave: keyof typeof TEXTOS
  // ISO: cuándo se guardó el secreto, o null si todavía no hay.
  guardadoEn: string | null
  puedeEditar: boolean
  guardar: (secreto: string) => Promise<boolean>
  enCurso: boolean
  // Los errores de validación de `esquemaGuardarSecreto`.
  errores: Partial<Record<'secreto', string[]>> | undefined
}

// El secreto de una integración. Nunca se muestra: del que está guardado sólo se sabe cuándo se
// guardó, y se puede reemplazar por otro. El campo nace vacío siempre.
export function CampoSecreto({ clave, guardadoEn, puedeEditar, guardar, enCurso, errores }: Props) {
  const { zonaHoraria } = useRegional()
  const idFormulario = useId()
  const [reemplazando, setReemplazando] = useState(false)
  const pidiendo = guardadoEn === null || reemplazando
  const textos = TEXTOS[clave]

  async function enviar(elemento: HTMLFormElement) {
    const guardado = await guardar(valoresDe(elemento, [textos.nombre])[textos.nombre])
    if (!guardado) {
      enfocarPrimerError(elemento)
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid gap-0.5">
          <span className="text-(length:--text-sm) font-medium text-(--color-ink)">
            {textos.titulo}
          </span>
          <span className="text-(length:--text-sm) text-(--color-ink-faint)">
            {guardadoEn
              ? `${textos.guardado} ${formatearFechaHora(guardadoEn, { zona: zonaHoraria })}. No se puede ver: sólo reemplazar.`
              : textos.vacio}
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
            void enviar(evento.currentTarget)
          }}
        >
          <Campo
            nombre={textos.nombre}
            etiqueta={guardadoEn ? textos.etiquetaNueva : textos.etiqueta}
            type="password"
            // Que el navegador no proponga una contraseña guardada ni ofrezca guardar esta.
            autoComplete="new-password"
            spellCheck={false}
            error={errorDeCampo(errores, 'secreto')}
            ayuda="Se guarda cifrada y no vuelve a mostrarse."
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" className="h-11 md:h-9" disabled={enCurso}>
              {enCurso ? 'Guardando…' : textos.guardar}
            </Button>
            {reemplazando ? (
              <Button
                type="button"
                variant="ghost"
                className="h-11 md:h-9"
                disabled={enCurso}
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
