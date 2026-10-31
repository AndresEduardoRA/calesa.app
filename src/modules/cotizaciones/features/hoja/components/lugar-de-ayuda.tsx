'use client'

import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import type { ContextoDeHoja } from '../../../entities/binding'
import type { SeccionDeHoja } from '../../../entities/hoja'
import type { AyudaDeLaHoja } from '../hooks/use-ayuda-de-la-hoja'
import { AyudaDeCeldaDiferida, AyudaDeTablaDiferida } from './diferidos'

type Props = { secciones: readonly SeccionDeHoja[]; contexto: ContextoDeHoja; ayuda: AyudaDeLaHoja }

// Los paneles de ayuda de un conjunto de secciones (la hoja, o el modal «Avanzado»): el código de cada uno se pide la primera vez que la URL nombra una celda de su tipo.
export function LugarDeAyuda({ secciones, contexto, ayuda }: Props) {
  const montarTexto = useAbiertoAlgunaVez(ayuda.texto.nodo !== null)
  const montarTabla = useAbiertoAlgunaVez(ayuda.tabla.nodo !== null)
  return (
    <>
      {montarTexto ? (
        <AyudaDeCeldaDiferida secciones={secciones} contexto={contexto} ayuda={ayuda.texto} />
      ) : null}
      {montarTabla ? (
        <AyudaDeTablaDiferida
          secciones={secciones}
          contexto={contexto}
          ayuda={ayuda.tabla}
          lectura={ayuda.lectura}
        />
      ) : null}
    </>
  )
}
