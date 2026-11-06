// Las RPC con tamaño de página de la papelera de cotizaciones (`LOTES_POR_PAGINA`), del carril C (4.24). Es un pedazo de `RPC_PAGINADAS`
// (`paginas-en-la-base.ts`, del A) en su propio archivo para que el C registre su RPC sin tocar un archivo del A (4.15-7). Hoy, ninguna.
import type { RpcPaginada } from './paginas-en-la-base'

export const RPC_PAGINADAS_DE_LA_PAPELERA: readonly RpcPaginada[] = []
