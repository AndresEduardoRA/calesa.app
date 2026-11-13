'use client'

import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import type { RefObject } from 'react'
import { RUTAS } from '@/shared/lib/rutas'
import { avisarExito } from '@/shared/ui/toasts'
import { textoDeLeadGuardado } from '../../../entities/alta'
import { CLAVE_DE_SECCION } from '../../../entities/ficha'
import type { Guardado } from './use-alta-de-lead'
import type { TrasElEnvio } from './use-tras-el-envio'
import type { usePanelDeAlta } from './use-panel-de-alta'

// Lo que pasa al guardar «Nuevo lead», con o sin `?elegir=`. Sin él (la barra superior, la tecla `N`): el aviso con «Abrir ficha» (que lleva a donde se anota
// después si no hubo primer seguimiento) y el alta queda abierta, con el foco otra vez en el teléfono, lista para el siguiente. Con él (el «+» del panel del cliente de
// la hoja de cotizar): el aviso va sin «Abrir ficha» —salir dejaría la cotización a medias— y la pantalla elige al creado (`elegirElCreado`), cerrando el alta.
// El aviso (y elegir al creado) salen cuando el envío terminó (`despues`, 9-7): antes, el aviso entraba con el pie todavía en «Guardando…».
export function useAlGuardarDelAlta(
  panel: Pick<ReturnType<typeof usePanelDeAlta>, 'paraElegir' | 'elegirElCreado'>,
  enfocarTelefonoRef: RefObject<boolean>,
  despues: TrasElEnvio['despues'],
) {
  const router = useRouter()
  return ({ id, numeros, adoptado, conSeguimiento }: Guardado) => {
    const texto = textoDeLeadGuardado({ numeros, adoptado, conSeguimiento })
    if (panel.paraElegir !== null) {
      despues(() => {
        avisarExito(texto)
        panel.elegirElCreado(id)
      })
      return
    }
    // Sin primer seguimiento, «Abrir ficha» lleva a donde se anota después.
    const seccion = conSeguimiento ? '' : `?${CLAVE_DE_SECCION}=seguimientos`
    despues(() => {
      avisarExito(texto, {
        etiqueta: 'Abrir ficha',
        sale: true,
        alHacer: () => {
          router.push(`${RUTAS.leads}/${id}${seccion}` as Route)
        },
      })
    })
    enfocarTelefonoRef.current = true
  }
}
