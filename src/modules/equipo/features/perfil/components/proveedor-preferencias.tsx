'use client'

import { useAction } from 'next-safe-action/hooks'
import { useTheme } from 'next-themes'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { CLAVE_DE_PREFERENCIA_POR_PAGINA, type TamanoDePagina } from '@/shared/lib/paginacion'
import { ProveedorDensidad, type Densidad } from '@/shared/ui/densidad'
import { ProveedorPorPagina, type ResultadoDeGuardar } from '@/shared/ui/por-pagina'
import { avisarError } from '@/shared/ui/toasts'
import { TEMAS, type Preferencias, type Tema } from '../../../entities/preferencias'
import { guardarPreferencia } from '../actions/guardar-preferencia'

function esTema(valor: string | undefined): valor is Tema {
  return TEMAS.some((tema) => tema === valor)
}

type Props = Preferencias & { children: ReactNode }

// Envuelve la app con las preferencias de la persona. La densidad y el tema se cambian desde
// cualquier lado (`useDensidad()`, `useTheme()`): acá se aplican las guardadas al entrar y se
// guarda cada cambio, así la persona las encuentra igual en su otro dispositivo.
export function ProveedorPreferencias({ densidad, tema, porPagina, children }: Props) {
  const { execute } = useAction(guardarPreferencia, {
    onError: ({ error }) => {
      // Sólo lo que la persona tiene que saber (su sesión venció). Si no se pudo guardar, la
      // preferencia igual quedó aplicada en esta pestaña.
      if (error.serverError) {
        avisarError(error.serverError)
      }
    },
  })
  // «Ítems por página» se guarda esperando la respuesta (el selector del listado dice si no quedó y deja reintentar): una
  // action aparte, sin el aviso de arriba.
  const { executeAsync } = useAction(guardarPreferencia)
  const guardarPorPagina = useCallback(
    async (tamano: TamanoDePagina): Promise<ResultadoDeGuardar> => {
      const envio = await enviarAccion(
        executeAsync({ clave: CLAVE_DE_PREFERENCIA_POR_PAGINA, valor: tamano }),
        'No se pudo guardar tu preferencia.',
      )
      if (envio.ok) {
        return { ok: true }
      }
      return { ok: false, sinRed: 'sinRed' in envio, mensaje: envio.error.mensaje }
    },
    [executeAsync],
  )
  const guardar = useRef(execute)
  useEffect(() => {
    guardar.current = execute
  }, [execute])

  const guardarDensidad = useCallback((nueva: Densidad | null) => {
    guardar.current({ clave: 'densidad', valor: nueva })
  }, [])

  const { theme, setTheme } = useTheme()
  const temaGuardado = useRef(tema)
  const yaAplicado = useRef(false)
  useEffect(() => {
    if (!yaAplicado.current) {
      yaAplicado.current = true
      // Al entrar manda lo guardado: en un dispositivo nuevo la app aparece como la dejó.
      if (tema && tema !== theme) {
        setTheme(tema)
        return
      }
    }
    // «Sistema» sin haber elegido nada no es una elección: no se guarda.
    if (esTema(theme) && theme !== (temaGuardado.current ?? 'system')) {
      temaGuardado.current = theme
      guardar.current({ clave: 'tema', valor: theme })
    }
  }, [theme, tema, setTheme])

  return (
    <ProveedorDensidad inicial={densidad} alCambiar={guardarDensidad}>
      <ProveedorPorPagina inicial={porPagina} alGuardar={guardarPorPagina}>
        {children}
      </ProveedorPorPagina>
    </ProveedorDensidad>
  )
}
