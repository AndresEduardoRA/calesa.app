'use client'

import { useAction } from 'next-safe-action/hooks'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { enviarAccion, type Envio } from '@/shared/lib/enviar-accion'
import { avisarConDeshacer, avisarError } from '@/shared/ui/toasts'
import { MENSAJE_DE_LEAD_NO_DISPONIBLE } from '../../../entities/ficha'
import {
  conEtiquetaPuesta,
  conFavorito,
  conTachado,
  firmaDeMarcas,
  type MarcasDeLead,
} from '../../../entities/marcas'
import { MENSAJE_DE_VALIDACION } from '../../ficha/resultado'
import { ponerEtiquetas } from '../actions/poner-etiquetas'
import { ponerFavorito } from '../actions/poner-favorito'
import { ponerTachado } from '../actions/poner-tachado'

// Las marcas de quien mira sobre un lead, con lo que se ve mientras viaja el pedido: se dibuja el
// valor pedido y, si la base lo rechaza, vuelve el anterior y se dice por qué. Poner, no alternar:
// cada pedido lleva el valor que se quiere, así un doble clic o un reintento no lo deja al revés.
// Lo que trae el servidor (después de `router.refresh()`) manda sobre lo local.
export function useMarcas(leadId: string, inicial: MarcasDeLead) {
  const router = useRouter()
  const firma = firmaDeMarcas(inicial)
  const [vista, setVista] = useState(firma)
  const [marcas, setMarcas] = useState(inicial)
  if (vista !== firma) {
    setVista(firma)
    setMarcas(inicial)
  }
  const favorito = useAction(ponerFavorito)
  const tachado = useAction(ponerTachado)
  const etiquetas = useAction(ponerEtiquetas)

  // Lo que vuelve: si falló, el valor de antes y el motivo (si el lead ya no se ve, se relee).
  function cerrar<T>(envio: Envio<T>, antes: MarcasDeLead): T | null {
    if (envio.ok) {
      router.refresh()
      return envio.data
    }
    setMarcas(antes)
    avisarError(envio.error)
    if (envio.error.mensaje === MENSAJE_DE_LEAD_NO_DISPONIBLE) {
      router.refresh()
    }
    return null
  }

  async function ponerFavoritoA(valor: boolean) {
    const antes = marcas
    setMarcas(conFavorito(antes, valor))
    cerrar(
      await enviarAccion(favorito.executeAsync({ leadId, valor }), MENSAJE_DE_VALIDACION),
      antes,
    )
  }

  async function ponerTachadoA(valor: boolean) {
    const antes = marcas
    setMarcas(conTachado(antes, valor))
    const hecho = cerrar(
      await enviarAccion(tachado.executeAsync({ leadId, valor }), MENSAJE_DE_VALIDACION),
      antes,
    )
    // Tachar lo saca del listado: se ofrece volver atrás. Destachar no necesita aviso.
    if (hecho && valor && hecho.resultado === 'puesto') {
      avisarConDeshacer('Lead tachado.', () => void ponerTachadoA(false))
    }
  }

  async function ponerEtiqueta(id: string, valor: boolean) {
    const antes = marcas
    setMarcas(conEtiquetaPuesta(antes, id, valor))
    const hecho = cerrar(
      await enviarAccion(
        etiquetas.executeAsync({ leadId, etiquetas: [id], valor }),
        MENSAJE_DE_VALIDACION,
      ),
      antes,
    )
    if (hecho) {
      setMarcas((ahora) => ({ ...ahora, etiquetas: hecho.etiquetas }))
    }
  }

  return {
    marcas,
    favorito: ponerFavoritoA,
    tachado: ponerTachadoA,
    etiqueta: ponerEtiqueta,
    // Cada marca espera a su pedido: mientras viaja, su control no acepta otro.
    enCurso: {
      favorito: favorito.isPending,
      tachado: tachado.isPending,
      etiquetas: etiquetas.isPending,
    },
  }
}

export type Marcas = ReturnType<typeof useMarcas>
