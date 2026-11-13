// Parte del registro de RPC con tamaño de página: «Tareas sin fecha» de la agenda (7.07-3), las secciones del buscador (7.12-2) los grupos de transporte (6.08-3) y el tablero de la cola web (8.04-2). La guarda
// (`paginas-en-la-base.ts`) suma esta parte a `RPC_PAGINADAS` con `import.meta.glob('./areas-*/paginas-en-la-base.ts')` (`registros-de-carriles.ts`).
import { POR_SECCION } from '../../../src/modules/buscador/entities/ranking'
import {
  TAMANO_DE_PAGINA_POR_DEFECTO,
  TAMANO_DE_VER_MAS,
  TOPE_DEL_EQUIPO,
} from '../../../src/shared/lib/paginacion'
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
  // Las habilitadas de la cola web (8.04-2): tabla de configuración, a lo sumo el equipo; la base acota con `_acotar_pagina(p_tope, 100, 200)`.
  {
    rpc: 'cola_web_tablero',
    parametro: 'p_tope',
    pideElCodigo: TOPE_DEL_EQUIPO,
    lista: 'tablero de la cola web (/configuracion/cola-web)',
  },
  // «Sin asignar» de la cola web (8.04-2), de a `TAMANO_DE_VER_MAS` por cursor `(creado_en, id)` hasta `TOPE_DE_LO_CARGADO`; `_acotar_pagina(p_tamano, 20, 50)`.
  {
    rpc: 'cola_web_solicitudes',
    parametro: 'p_tamano',
    pideElCodigo: TAMANO_DE_VER_MAS,
    lista: 'sin asignar de la cola web, «Ver más»',
  },
]
