import { SquareFunctionIcon } from 'lucide-react'
import { datosO, type Resultado } from '@/shared/lib/errores'
import type { Permisos } from '@/shared/lib/permisos'
import { EstadoVacio } from '@/shared/ui/estados'
import { leerFormulaDelOrigen } from '../../../areas/formula/composicion'
import { origenesParaConfigurar } from '../../../entities/formula/versiones'
import { origenElegido } from '../../../entities/origenes-para-cotizar'
import { FormulaDelOrigen } from './formula-del-origen'

type Origen = { id: string; nombre: string; activo: boolean }

type Props = {
  // Todos los orígenes del catálogo, también los inactivos: los compone la página (este módulo no depende de `origenes`).
  origenes: Promise<Resultado<readonly Origen[]>>
  permisos: Permisos
  // `?origen=`: uno que no es de los suyos abre el primero.
  origenPedido: string | undefined
}

// La pestaña «Fórmula» de Configuración › Cotización (4.20-2a), leída en el servidor con la sesión de quien mira y detrás de `<Suspense>`: los orígenes donde tiene
// `cotizaciones.configurar` y, del abierto, la publicada, el borrador y la primera página de versiones. La base vuelve a decidir (policy `formulas: leer`). Una lectura
// que falla sube al `error.tsx` de la ruta, que ofrece «Reintentar».
export async function SeccionDeLaFormula({ origenes, permisos, origenPedido }: Props) {
  const visibles = origenesParaConfigurar(permisos, datosO(await origenes)).map(
    ({ id, nombre, activo }) => ({ id, nombre, activo }),
  )
  const origen = origenElegido(visibles, origenPedido)
  if (!origen) {
    return (
      <EstadoVacio
        Icono={SquareFunctionIcon}
        titulo="No hay orígenes donde puedas configurar la fórmula."
        compacto
      />
    )
  }
  const formula = datosO(await leerFormulaDelOrigen(origen.id))
  return <FormulaDelOrigen origenes={visibles} origen={origen} formula={formula} />
}
