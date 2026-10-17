// Las RPC que reciben un tamaño de página y lo que el código le pide a cada una (9g, `.claude/rules/escala.md`). Es el
// registro que `paginas.test.ts` cruza con las migraciones: la última definición de cada RPC acota ese parámetro con
// `_acotar_pagina(parámetro, por_defecto, máximo)`, y su máximo no es menor que lo que pide el código. Una RPC nueva con
// tamaño que no figura acá rompe `pnpm test`; una que figura y ya nadie llama, también.
import {
  LOTES_POR_PAGINA,
  TAMANO_DE_COLUMNA,
  TAMANO_DE_VER_MAS,
  TOPE_DE_LO_CARGADO,
} from '../../src/shared/lib/paginacion'

export type RpcPaginada = {
  rpc: string
  parametro: string
  // Lo que el código le pide (un valor de `shared/lib/paginacion.ts`): el máximo de la base no puede ser menor.
  pideElCodigo: number
  // Qué lista es, para el mensaje de un fallo.
  lista: string
}

export const RPC_PAGINADAS: readonly RpcPaginada[] = [
  {
    rpc: 'lead_seguimientos',
    parametro: 'p_tamano',
    pideElCodigo: TAMANO_DE_VER_MAS,
    lista: '«Ver más» de seguimientos',
  },
  {
    rpc: 'lead_recordatorios',
    parametro: 'p_tamano',
    pideElCodigo: TAMANO_DE_VER_MAS,
    lista: '«Ver más» de recordatorios',
  },
  // La papelera pide `LOTES_POR_PAGINA + 1` (una fila de más para saber si hay otra página).
  {
    rpc: 'leads_papelera_listar',
    parametro: 'p_tope',
    pideElCodigo: LOTES_POR_PAGINA + 1,
    lista: 'papelera de leads',
  },
  {
    rpc: 'vehiculos_papelera_listar',
    parametro: 'p_tope',
    pideElCodigo: LOTES_POR_PAGINA + 1,
    lista: 'papelera de vehículos',
  },
  {
    rpc: 'embudo_tablero',
    parametro: 'p_tope',
    pideElCodigo: TAMANO_DE_COLUMNA,
    lista: 'kanban, cada columna',
  },
  {
    rpc: 'embudo_tablero',
    parametro: 'p_tope_total',
    pideElCodigo: TOPE_DE_LO_CARGADO,
    lista: 'kanban, total de una columna',
  },
  {
    rpc: 'embudo_etapa_pagina',
    parametro: 'p_tope',
    pideElCodigo: TAMANO_DE_COLUMNA,
    lista: 'kanban, «Ver más»',
  },
]
