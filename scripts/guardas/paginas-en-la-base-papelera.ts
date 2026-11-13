// Las RPC con tamaño de página de la papelera de cotizaciones (`LOTES_POR_PAGINA`, 4.24): parte del registro de `RPC_PAGINADAS`
// (`paginas-en-la-base.ts`), que las suma tras las del núcleo (4.15-7).
import { LOTES_POR_PAGINA, PRIMEROS_DEL_LOTE } from '../../src/shared/lib/paginacion'
import type { RpcPaginada } from './paginas-en-la-base'

export const RPC_PAGINADAS_DE_LA_PAPELERA: readonly RpcPaginada[] = [
  // La papelera pide `LOTES_POR_PAGINA + 1` (una fila de más para saber si hay otra página) y de cada lote, los primeros: el resto llega con «Mostrar los N».
  {
    rpc: 'cotizaciones_papelera_listar',
    parametro: 'p_tope',
    pideElCodigo: LOTES_POR_PAGINA + 1,
    lista: 'papelera de cotizaciones',
  },
  {
    rpc: 'cotizaciones_papelera_listar',
    parametro: 'p_primeros',
    pideElCodigo: PRIMEROS_DEL_LOTE,
    lista: 'papelera de cotizaciones, los primeros de un lote',
  },
]
