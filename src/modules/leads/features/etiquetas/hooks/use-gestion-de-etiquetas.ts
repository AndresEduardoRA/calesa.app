'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { enviarAccion } from '@/shared/lib/enviar-accion'
import { avisar, avisarConDeshacer, avisarError, avisarExito } from '@/shared/ui/toasts'
import {
  conEtiqueta,
  sinEtiqueta,
  type ColorDeEtiqueta,
  type EtiquetaConUso,
} from '../../../entities/etiqueta'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { crearEtiqueta } from '../actions/crear-etiqueta'
import { eliminarEtiqueta } from '../actions/eliminar-etiqueta'
import { guardarEtiqueta } from '../actions/guardar-etiqueta'
import type { Etiquetas } from './use-etiquetas'
import { useEtiquetasConUso } from './use-etiquetas-con-uso'

// «Gestionar etiquetas»: la lista con a cuántos leads toca cada una se lee al montarse (el diálogo
// la monta al abrirse), así el número que se confirma al eliminar es el de ahora y no el de cuando
// se cargó la página. Renombrar y recolorear piden la versión: si otra pestaña la cambió, se dice y
// se vuelve a leer, conservando lo escrito en el campo. Lo que cambia se avisa a la lista de la
// pantalla (`etiquetas`).
export function useGestionDeEtiquetas(etiquetas: Etiquetas) {
  const router = useRouter()
  const { estado, leer, cambiar: enLista } = useEtiquetasConUso()
  const guardar = useAction(guardarEtiqueta)
  const eliminar = useAction(eliminarEtiqueta)
  const crear = useAction(crearEtiqueta)

  // Renombrar o recolorear. Devuelve el motivo para decirlo junto al campo, o null si quedó.
  async function guardarCambios(
    una: EtiquetaConUso,
    cambios: { nombre?: string; color?: ColorDeEtiqueta },
  ): Promise<string | null> {
    const envio = await enviarAccion(
      guardar.executeAsync({ id: una.id, actualizadoEnEsperado: una.actualizadoEn, ...cambios }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      if (envio.error.codigo === 'conflicto' || envio.error.codigo === 'sin_permiso') {
        avisarError(envio.error)
        leer()
      }
      return ('porCampo' in envio ? envio.porCampo?.['nombre'] : undefined) ?? envio.error.mensaje
    }
    const quedo = envio.data.etiqueta
    if (quedo) {
      enLista((lista) => conEtiqueta(lista, { ...quedo, leads: una.leads }))
      etiquetas.poner(quedo)
      router.refresh()
    }
    return null
  }

  async function recrear(una: EtiquetaConUso) {
    const envio = await enviarAccion(
      crear.executeAsync({ id: una.id, nombre: una.nombre, color: una.color }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      avisarError(envio.error)
      return
    }
    if (!envio.data.etiqueta) {
      return
    }
    const vuelta = envio.data.etiqueta
    enLista((lista) => conEtiqueta(lista, { ...vuelta, leads: 0 }))
    etiquetas.poner(vuelta)
    router.refresh()
    avisarExito('Etiqueta restituida.')
  }

  async function eliminarUna(una: EtiquetaConUso): Promise<boolean> {
    const envio = await enviarAccion(
      eliminar.executeAsync({ id: una.id, actualizadoEnEsperado: una.actualizadoEn }),
      MENSAJE_DE_VALIDACION,
    )
    if (!envio.ok) {
      avisarError(envio.error)
      if (envio.error.codigo === 'conflicto') {
        leer()
      }
      return false
    }
    enLista((lista) => sinEtiqueta(lista, una.id))
    etiquetas.quitar(una.id)
    router.refresh()
    if (envio.data.resultado === 'sin_cambios') {
      avisar('Esa etiqueta ya no estaba: la eliminaste en otra ventana.')
    } else if (envio.data.leads === 0) {
      // Sin leads, recrearla con su id la deja como estaba: se ofrece deshacer en vez de confirmar.
      avisarConDeshacer('Etiqueta eliminada.', () => void recrear(una))
    } else {
      avisarExito('Etiqueta eliminada.')
    }
    return true
  }

  return {
    estado,
    leer,
    guardar: guardarCambios,
    eliminar: eliminarUna,
    // Una nueva desde el diálogo: entra a la lista con 0 leads.
    sumar: (una: EtiquetaConUso) => enLista((lista) => conEtiqueta(lista, una)),
    enCurso: guardar.isPending || eliminar.isPending || crear.isPending,
  }
}

export type GestionDeEtiquetas = ReturnType<typeof useGestionDeEtiquetas>
