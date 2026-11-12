'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import { rutaDeLaCotizacion } from '../../../entities/cotizador/cotizacion'
import { crearCotizacion } from '../actions/crear-cotizacion'

type Args = { proyectoId: string; monedaInicial: string }

const MENSAJE_DE_VALIDACION = 'Elige una moneda activa.'

// «Nueva cotización» (8.12-3, C10): crea un borrador por su Server Action y va a su hoja. El id sale una vez por intento y se conserva mientras falla
// (la RPC es idempotente por id: reintentar no duplica, D32); se renueva al salir bien y al cambiar la moneda, porque la pantalla conserva su estado
// al volver y el mismo id devolvería la cotización ya creada.
export function useNuevaCotizacion({ proyectoId, monedaInicial }: Args) {
  const router = useRouter()
  const [moneda, setMoneda] = useState(monedaInicial)
  const [intento, setIntento] = useState(() => crypto.randomUUID())
  const [enCurso, setEnCurso] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const [porCampo, setPorCampo] = useState<Record<string, string>>({})

  function limpiar() {
    setAviso(null)
    setPorCampo({})
  }

  function elegirMoneda(codigo: string) {
    setMoneda(codigo)
    setIntento(crypto.randomUUID())
    limpiar()
  }

  async function crear() {
    limpiar()
    setEnCurso(true)
    const envio = await enviarAccion(
      crearCotizacion({ id: intento, proyectoId, moneda }),
      MENSAJE_DE_VALIDACION,
    )
    setEnCurso(false)
    if (envio.ok) {
      setIntento(crypto.randomUUID())
      avisarExito(`Cotización #${String(envio.data.numero)} creada.`)
      router.push(rutaDeLaCotizacion(proyectoId, envio.data.id) as Route)
      return
    }
    if ('porCampo' in envio && envio.porCampo && Object.keys(envio.porCampo).length > 0) {
      setPorCampo(envio.porCampo)
    } else {
      setAviso(envio.error.mensaje)
    }
  }

  return { moneda, elegirMoneda, crear, enCurso, aviso, porCampo }
}
