// Las RPC con tamaño de página del carril B: «Tareas sin fecha» de la agenda (7.07-3), las secciones del buscador (7.12-2) y los grupos de transporte (6.08-3). Es un pedazo de `RPC_PAGINADAS`
// (`paginas-en-la-base.ts`, del A) que la guarda suma con `import.meta.glob('./areas-*/paginas-en-la-base.ts')` (`registros-de-carriles.ts`).
import { POR_SECCION } from '../../../src/modules/buscador/entities/ranking'
import { TAMANO_DE_PAGINA_POR_DEFECTO, TAMANO_DE_VER_MAS } from '../../../src/shared/lib/paginacion'
import type { RpcPaginada } from '../paginas-en-la-base'

export const REGISTRO: readonly RpcPaginada[] = [
  // De a `TAMANO_DE_VER_MAS` tareas, por cursor `(creado_en, id)` («Ver más», hasta `TOPE_DE_LO_CARGADO`); la base acota con `_acotar_pagina(…, 20, 50)`.
  {
    rpc: 'agenda_tareas_sin_fecha',
    parametro: 'p_tamano',
    pideElCodigo: TAMANO_DE_VER_MAS,
    lista: 'tareas sin fecha de la agenda, «Ver más»',
  },
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
  // Embarques y contenedores de `/logistica/embarques` (6.08-3), por cursor opaco; la base acota con `_acotar_pagina(p_tope, 50, 100)` y recorre a lo sumo 2.000 filas por llamada.
  {
    rpc: 'transporte_grupos',
    parametro: 'p_tope',
    pideElCodigo: TAMANO_DE_PAGINA_POR_DEFECTO,
    lista: 'embarques y contenedores de /logistica/embarques',
  },
]
