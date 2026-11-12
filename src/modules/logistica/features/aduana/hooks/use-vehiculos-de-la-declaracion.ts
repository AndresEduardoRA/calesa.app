'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisarExito } from '@/shared/ui/toasts'
import type { DeclaracionLeida } from '../../../entities/aduana/declaracion'
import { motivoParaNoGuardarVehiculos } from '../../../entities/aduana/escritura'
import { avisarCambioDeLaUnidad } from '../../nucleo/hooks/eventos-de-la-unidad'
import { ponerVehiculos } from '../actions/poner-vehiculos'
import { useSeleccionDeVehiculos } from './use-seleccion-de-vehiculos'

const MENSAJE_DE_VALIDACION = 'Revisa los vehículos elegidos.'
const SIN_RED = 'No pudimos llegar al servidor. Lo que elegiste sigue acá: vuelve a intentar.'

// La composición de una declaración (6.09-2, D5): lo que se agrega y lo que se quita se acumula en pantalla y sale en **un solo envío** con la versión que se leyó. Un conflicto espera
// «Recargar», que vuelve a leer la declaración y conserva lo elegido que aún aplique (un vehículo ya quitado o ya agregado por la otra persona se descarta solo).
export function useVehiculosDeLaDeclaracion(declaracion: DeclaracionLeida) {
  const router = useRouter()
  const seleccion = useSeleccionDeVehiculos()
  const [aviso, setAviso] = useState<string | null>(null)
  const [choque, setChoque] = useState<{ mensaje: string; version: string } | null>(null)
  const [enCurso, setEnCurso] = useState(false)

  const vivos = new Set(declaracion.vehiculos.map((v) => v.vehiculoId))
  // Lo elegido que todavía aplica a la declaración que se está viendo.
  const quitar = seleccion.aQuitar.filter((id) => vivos.has(id))
  const agregar = seleccion.aAgregar.filter((u) => !vivos.has(u.id))
  const hayCambios = quitar.length + agregar.length > 0

  async function enviar() {
    if (enCurso || choque?.version === declaracion.actualizadoEn) {
      return
    }
    const cambios = { agregar: agregar.map((u) => u.id), quitar }
    const motivo = motivoParaNoGuardarVehiculos(cambios)
    if (motivo !== null) {
      setAviso(motivo)
      return
    }
    setAviso(null)
    setEnCurso(true)
    const envio = await enviarAccion(
      ponerVehiculos({
        declaracionId: declaracion.id,
        actualizadoEnEsperado: declaracion.actualizadoEn,
        ...cambios,
      }),
      MENSAJE_DE_VALIDACION,
    )
    setEnCurso(false)
    if (envio.ok) {
      if (envio.data.sinCambios) {
        setAviso('No hay cambios en los vehículos.')
        return
      }
      for (const id of [...cambios.agregar, ...cambios.quitar]) {
        avisarCambioDeLaUnidad(id)
      }
      avisarExito('Vehículos guardados.')
      seleccion.limpiar()
      router.refresh()
    } else if ('sinRed' in envio) {
      setAviso(SIN_RED)
    } else if (envio.error.codigo === 'conflicto') {
      setChoque({ mensaje: envio.error.mensaje, version: declaracion.actualizadoEn })
    } else {
      setAviso(envio.error.mensaje)
    }
  }

  return {
    quitar,
    agregar,
    hayCambios,
    enCurso,
    aviso,
    conflicto:
      choque !== null && choque.version === declaracion.actualizadoEn ? choque.mensaje : null,
    marcarParaQuitar: seleccion.marcarParaQuitar,
    deshacerQuitar: seleccion.deshacerQuitar,
    sumar: seleccion.sumar,
    noSumar: seleccion.noSumar,
    enviar,
    recargar: () => {
      router.refresh()
    },
  }
}
