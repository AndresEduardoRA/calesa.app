// Las RPC con tamaño de página del carril C que no son de la papelera (4.27-2): los comentarios de una cotización. Es un pedazo de `RPC_PAGINADAS`
// (`paginas-en-la-base.ts`, del A) que la guarda suma con `import.meta.glob('./areas-*/paginas-en-la-base.ts')` (`registros-de-carriles.ts`).
import { TAMANO_DE_VER_MAS } from '../../../src/shared/lib/paginacion'
import type { RpcPaginada } from '../paginas-en-la-base'

export const REGISTRO: readonly RpcPaginada[] = [
  // De a `TAMANO_DE_VER_MAS` raíces, cada una con sus primeras `TAMANO_DE_VER_MAS` respuestas («Ver más comentarios», hasta `TOPE_DE_LO_CARGADO`).
  {
    rpc: 'cotizacion_comentarios',
    parametro: 'p_tope',
    pideElCodigo: TAMANO_DE_VER_MAS,
    lista: 'comentarios de una cotización',
  },
  {
    rpc: 'cotizacion_comentarios',
    parametro: 'p_primeros',
    pideElCodigo: TAMANO_DE_VER_MAS,
    lista: 'comentarios de una cotización, las primeras respuestas de cada uno',
  },
  {
    rpc: 'cotizacion_comentario_respuestas',
    parametro: 'p_tope',
    pideElCodigo: TAMANO_DE_VER_MAS,
    lista: '«Ver más respuestas» de un comentario',
  },
]
