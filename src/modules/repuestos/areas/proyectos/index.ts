// La API de servidor del área `proyectos` de `repuestos` (8.09-1): el listado de `/repuestos`. Sale por el `index.ts` de la raíz.
export { leerProyectosDelListado } from '../../infra/proyectos/listar'
export { leerProyecto } from '../../infra/proyectos/leer'
export { PROYECTO_YA_NO_ESTA, type ProyectoDetallado } from '../../entities/proyectos/detalle'
export { rutaDelProyecto } from '../../entities/proyectos/rutas'
export {
  CLAVE_DE_BUSQUEDA_DE_PROYECTOS,
  CLAVE_DE_ESTADO_DE_PROYECTOS,
  ESTADOS_DEL_LISTADO,
  MAXIMO_DE_PAGINA_DE_REPUESTOS,
  armarPaginaDeProyectos,
  esquemaDelListado,
  estadoDelListadoDe,
  leerCursorDeProyectos,
  pedidoDelListado,
  type EstadoDelListado,
  type FilaDeProyecto,
  type PaginaDeProyectos,
  type PedidoDelListado,
} from '../../entities/proyectos/listado'
export { estadoDelProyecto, type EstadoDelProyecto } from '../../entities/proyectos/estado'
export {
  CLAVE_DE_VEHICULO,
  MENSAJE_VEHICULO_QUE_NO_SE_VE,
  PANEL_NUEVO_PROYECTO,
} from '../../entities/proyectos/paneles'
export {
  leerResumenDeVehiculo,
  proyectoDe,
  type ResumenDeVehiculo,
} from '../../infra/proyectos/resumen'
export {
  NOMBRE_SIN_FASE,
  ofertaDelResumen,
  type GrupoDelResumen,
  type OfertaDelResumen,
  type ProyectoDeVehiculo,
  type ResumenDeItems,
} from '../../entities/proyectos/resumen'
