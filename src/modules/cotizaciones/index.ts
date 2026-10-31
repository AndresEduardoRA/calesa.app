// API pública del módulo `cotizaciones`. Lo único que `app/` u otro módulo puede importar.
// Se llena en su fase de docs/PLAN.md; la ficha CLAUDE.md de esta carpeta dice qué entra y qué sale.
//
// Hoy sale lo que el editor de fórmulas (4.21) y el del diseño de la hoja (4.22) van a usar: el compilador de la fórmula como texto,
// sus códigos de error, el tope del texto que guarda una fila, el validador del diseño con sus reglas y las listas cerradas que el
// diseño admite, y los tipos. Todo es puro (`entities/`, cero I/O). Si un editor es un Client Component, saldrá también por `client.ts`.
export { compilarExpresion } from './entities/compilador'
export type {
  ContextoDeCompilacion,
  DestinoDeCompilacion,
  ErrorDeCompilacion,
  ResultadoDeCompilacion,
  Tramo,
} from './entities/compilador'
export { CODIGOS_DE_COMPILACION, type CodigoDeCompilacion } from './entities/motivos-del-compilador'
export { MAXIMO_DE_TEXTO } from './entities/nodos'
export { validarDiseno } from './entities/validar-diseno'
export type { ContextoDeDiseno, ResultadoDeValidacionDeDiseno } from './entities/validar-diseno'
export { REGLAS_DE_DISENO } from './entities/motivos-de-diseno'
export type { RechazoDeDiseno, ReglaDeDiseno } from './entities/motivos-de-diseno'
export {
  ANCHOS,
  EFECTOS_DE_INTERRUPTOR,
  MAXIMO_DE_ATAJOS,
  NIVEL_TODOS,
  PRESENTACIONES,
  SECUNDARIOS,
} from './entities/diseno'
export type {
  CeldaDeDiseno,
  Diseno,
  ItemDeDiseno,
  ModoDeTipoDeCambio,
  SeccionDeDiseno,
} from './entities/diseno'

// Configuración › Cotización › Niveles (4.09): la lectura de los niveles de acceso con el tope, lo que admite cada uno y por qué no se elimina.
// Los componentes salen por `pantallas/configuracion.ts`. Sólo se importa desde un Server Component.
export { leerNivelesDeAcceso } from './composicion'
export type { ListaDeNiveles, NivelDeAcceso } from './entities/nivel'

// La hoja de cotizar (4.13): UNA lectura al abrirla, con el diseño recortado al nivel de quien mira y la versión de la fórmula y la hora de la base para D2. Sólo se importa desde un Server Component.
export { leerHojaParaCotizar } from './composicion'
export type {
  AtajosDeHoja,
  AyudaDeCelda,
  CeldaDeHoja,
  ChipDeAtajos,
  EdicionDeHoja,
  HojaLista,
  HojaParaCotizar,
  HojaSinPublicar,
  InterruptorDeHoja,
  ItemDeHoja,
  MotivoDeCandado,
  NodoDeTarjeta,
  SecundarioDeCelda,
  SeccionDeHoja,
  SubtotalDeHoja,
  TipoDeNodoDeHoja,
  VarianteDeHoja,
} from './entities/hoja'

// La pantalla de cotizar (4.13-2): el primer cálculo que hace el servidor junto con la hoja, qué orígenes se cotizan, qué se ve al abrir y la URL. Los componentes salen por
// `pantallas/cotizar.ts`. `recalcularAlAbrir` sólo se importa desde un Server Component.
export { recalcularAlAbrir } from './composicion'
export { aperturaDe } from './entities/apertura'
export { modoInicial } from './entities/cabecera-de-la-hoja'
export type { Apertura, RecalculoInicial } from './entities/apertura'
export { origenElegido, origenesParaCotizar } from './entities/origenes-para-cotizar'
export {
  CLAVE_DE_LEAD,
  CLAVE_DE_ORIGEN,
  CLAVE_DE_VEHICULO,
  RUTA_DE_LA_HOJA,
  rutaDeLaHoja,
} from './entities/ruta-de-la-hoja'

// El panel del vehículo de la hoja (4.14-2b): «Cotizado (n)», el conteo acotado de las cotizaciones del vehículo que quien mira ve. Sólo se importa desde un Server
// Component. El historial se lee desde el navegador por `composicion.client.ts` y se dibuja con `pantallas/cotizar.ts`.
export { contarCotizacionesDelVehiculo } from './composicion'

// El dato del vehículo de una tabla de la hoja (4.14-2c3): qué campos casan con qué tablas. La página lo pasa al panel del vehículo, que decide cuáles se eligen.
export { datosDelVehiculoDeLaHoja } from './entities/dato-del-vehiculo'
export type { DatoDeLaHoja } from './entities/dato-del-vehiculo'
