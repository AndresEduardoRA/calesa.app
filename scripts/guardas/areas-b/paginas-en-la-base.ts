// Las RPC con tamaño de página del carril B (7.12-2): una sección del buscador, de a `POR_SECCION`. Es un pedazo de `RPC_PAGINADAS`
// (`paginas-en-la-base.ts`, del A) que la guarda suma con `import.meta.glob('./areas-*/paginas-en-la-base.ts')` (`registros-de-carriles.ts`).
import { POR_SECCION } from '../../../src/modules/buscador/entities/ranking'
import type { RpcPaginada } from '../paginas-en-la-base'

export const REGISTRO: readonly RpcPaginada[] = [
  // `_acotar_pagina(p_tamano, 5, 20)` en las tres: el defecto es `POR_SECCION` y el máximo deja a 7.10 pedir más sin migración.
  {
    rpc: 'buscador_leads',
    parametro: 'p_tamano',
    pideElCodigo: POR_SECCION,
    lista: 'buscador, sección leads',
  },
  {
    rpc: 'buscador_vehiculos',
    parametro: 'p_tamano',
    pideElCodigo: POR_SECCION,
    lista: 'buscador, sección vehículos',
  },
  {
    rpc: 'buscador_cotizaciones',
    parametro: 'p_tamano',
    pideElCodigo: POR_SECCION,
    lista: 'buscador, sección cotizaciones',
  },
]
