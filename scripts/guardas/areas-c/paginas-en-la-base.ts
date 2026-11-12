// Las RPC con tamaño de página del carril C que no son de la papelera (4.27-2): los comentarios de una cotización. Es un pedazo de `RPC_PAGINADAS`
// (`paginas-en-la-base.ts`, del A) que la guarda suma con `import.meta.glob('./areas-*/paginas-en-la-base.ts')` (`registros-de-carriles.ts`).
import { TAMANO_DE_PAGINA_POR_DEFECTO, TAMANO_DE_VER_MAS } from '../../../src/shared/lib/paginacion'
import { TOPE_DE_FUERA_DE_REGLA } from '../../../src/modules/flujos/entities/requisitos/fuera-de-regla'
import { TOPE_DE_IMPACTO } from '../../../src/modules/flujos/entities/requisitos/impacto'
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
  // «Bloqueante» de un requisito de fase (5.08): cuántas unidades de la fase quedarían fuera de regla (hasta `TOPE_DE_IMPACTO`, y la base dice si hay más).
  {
    rpc: 'requisito_impacto',
    parametro: 'p_tope',
    pideElCodigo: TOPE_DE_IMPACTO,
    lista: 'unidades que quedarían fuera de regla al volver bloqueante un requisito',
  },
  // El aviso «unidades fuera de regla» sobre las fases de un flujo y su panel (5.08), de a `TOPE_DE_FUERA_DE_REGLA` y con «Verlas en el inventario» por fase.
  {
    rpc: 'flujo_fuera_de_regla',
    parametro: 'p_tope',
    pideElCodigo: TOPE_DE_FUERA_DE_REGLA,
    lista: 'unidades fuera de regla de un flujo',
  },
  // `/logistica/gastos` (6.11-3): una página de `TAMANO_DE_PAGINA_POR_DEFECTO` por cursor `(fecha, id)`, sin selector `?por=`.
  {
    rpc: 'gastos_listar',
    parametro: 'p_tope',
    pideElCodigo: TAMANO_DE_PAGINA_POR_DEFECTO,
    lista: 'gastos de /logistica/gastos',
  },
  {
    rpc: 'pagos_listar',
    parametro: 'p_tope',
    pideElCodigo: TAMANO_DE_PAGINA_POR_DEFECTO,
    lista: 'pagos de /logistica/gastos',
  },
  // `/logistica/aduana` (6.09-1): una página de `TAMANO_DE_PAGINA_POR_DEFECTO` por cursor `(creado_en, id)`, sin selector `?por=`.
  {
    rpc: 'declaraciones_listar',
    parametro: 'p_tope',
    pideElCodigo: TAMANO_DE_PAGINA_POR_DEFECTO,
    lista: 'declaraciones de /logistica/aduana',
  },
  // `/chat` (7.09-1): la lista de mis conversaciones por cursor `(ultimo_mensaje_en, id)`, de a `TAMANO_DE_VER_MAS` («Ver más», hasta `TOPE_DE_LO_CARGADO`).
  {
    rpc: 'chat_conversaciones',
    parametro: 'p_tamano',
    pideElCodigo: TAMANO_DE_VER_MAS,
    lista: 'mis conversaciones del chat',
  },
]
