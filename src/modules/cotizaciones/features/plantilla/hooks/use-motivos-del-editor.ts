'use client'

import { useEffect } from 'react'
import type { RechazoDePlantilla } from '../../../entities/plantilla/motivos-de-plantilla'
import { esDeUnCampo, motivoDeForma } from '../components/motivos-del-campo'

// Lo que el editor dice de un campo y arriba (4.19-3b). El motivo de un campo es el de la forma si es suyo o, si no, el de la última respuesta de la action (`porCampo`,
// que se va al editar el campo). Lo que la forma rechaza y ningún campo dibuja, y lo que la action rechazó sin campo, se dicen arriba. Tras un rechazo con `porCampo`,
// el foco va al primer campo con motivo (`data-campo`).
export function useMotivosDelEditor(
  rechazoDeForma: RechazoDePlantilla | null,
  porCampo: Readonly<Record<string, string>>,
) {
  const motivoDe = (donde: string): string | undefined =>
    rechazoDeForma?.donde === donde ? motivoDeForma(donde, rechazoDeForma.mensaje) : porCampo[donde]
  const deArriba = [
    ...(rechazoDeForma !== null && !esDeUnCampo(rechazoDeForma.donde)
      ? [rechazoDeForma.mensaje]
      : []),
    ...Object.entries(porCampo)
      .filter(([donde]) => !esDeUnCampo(donde))
      .map(([, mensaje]) => mensaje),
  ]
  const primero = Object.keys(porCampo).find(esDeUnCampo)
  useEffect(() => {
    if (primero === undefined) return
    document.querySelector<HTMLElement>(`[data-campo="${primero}"]`)?.focus()
  }, [primero, porCampo])
  return { motivoDe, deArriba }
}
