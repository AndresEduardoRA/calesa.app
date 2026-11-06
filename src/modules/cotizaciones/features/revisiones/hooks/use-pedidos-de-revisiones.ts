'use client'

import { TOPE_DE_LO_CARGADO } from '@/shared/lib/paginacion'
import { leerRevisiones } from '../../../composicion-revisiones.client'
import { hastaDeUnDia, type PaginaDeRevisiones } from '../../../entities/revisiones'
import { useTurno } from './use-turno'
import {
  juntar,
  reemplazar,
  type Estado,
  type Fallido,
  type Pidiendo,
} from './ventana-de-revisiones'

type Cursor = { antes: number | null; hasta: string | null }

// Los pedidos de lo ya leído de un panel de revisiones: «Ver más» (junta), «Ir a una fecha» y «Volver a las más recientes» (reemplazan, con su `desde`) y «Reintentar» (repite el que
// falló). Uno a la vez, por `useTurno`. Falle como falle, lo leído y su `desde` se quedan; «Ver más» limpia el error al pedir, los otros no (su aviso se queda hasta que llega el nuevo).
export function usePedidosDeRevisiones(
  cotizacionId: string,
  estado: Estado,
  aplicar: (cambio: (antes: Estado) => Estado) => void,
) {
  const { pedir } = useTurno(cotizacionId, estado.version)
  const pedirPagina = (
    pidiendo: Exclude<Pidiendo, null>,
    cursor: Cursor,
    llegada: (e: Estado, pagina: PaginaDeRevisiones) => Estado,
    fallido: Fallido | null,
  ) => {
    if (estado.pidiendo !== null || !estado.leido) {
      return
    }
    const empezo = pedir(
      () => leerRevisiones({ cotizacionId, ...cursor }),
      (r) => {
        aplicar((e) =>
          r.ok ? llegada(e, r.data) : { ...e, pidiendo: null, error: r.error, fallido },
        )
      },
    )
    if (empezo) {
      aplicar((e) => ({ ...e, pidiendo, ...(pidiendo === 'mas' ? { error: null } : {}) }))
    }
  }
  const saltar = (dia: string, hasta: string) => {
    pedirPagina('salto', { antes: null, hasta }, (e, p) => reemplazar(e, p, dia), {
      clase: 'salto',
      dia,
      hasta,
    })
  }
  const volver = () => {
    pedirPagina('volver', { antes: null, hasta: null }, (e, p) => reemplazar(e, p, null), {
      clase: 'volver',
    })
  }
  const pedirMas = (antes: number) => {
    pedirPagina('mas', { antes, hasta: null }, juntar, null)
  }

  const hayMasParaPedir = estado.siguiente !== null && estado.revisiones.length < TOPE_DE_LO_CARGADO
  return {
    hayMasParaPedir,
    enElTope: estado.siguiente !== null && estado.revisiones.length >= TOPE_DE_LO_CARGADO,
    verMas: () => {
      if (hayMasParaPedir && estado.siguiente !== null) {
        pedirMas(estado.siguiente)
      }
    },
    irAUnaFecha: (dia: string, zona: string) => {
      const hasta = hastaDeUnDia(dia, zona)
      if (hasta !== null) {
        saltar(dia, hasta)
      }
    },
    volverALasMasRecientes: volver,
    reintentar: () => {
      if (estado.pidiendo !== null) {
        return
      }
      if (estado.fallido?.clase === 'salto') {
        saltar(estado.fallido.dia, estado.fallido.hasta)
      } else if (estado.fallido?.clase === 'volver') {
        volver()
      } else if (estado.leido && estado.siguiente !== null) {
        pedirMas(estado.siguiente)
      } else if (!estado.leido) {
        // Limpiar el error vuelve a disparar la lectura de la primera página.
        aplicar((e) => ({ ...e, error: null }))
      }
    },
  }
}
