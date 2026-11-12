// Las interfaces del área `contenido` de `web`: lo que la composición le da a quien lee o escribe las guías.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { Resultado } from '@/shared/lib/errores'
import type { DireccionDeOrden, ListaDeCategorias } from './categorias'
import type { DocumentoDelSitio } from './documento-limpio'
import type { GuiaCompleta, GuiaDeLista, OpcionesDeGuia } from './guias'
import type { CambiosDeLegales, LegalesDelSitio } from './legales'

// La lista de guías, de la más reciente a la más antigua, con un tope + 1 leído (`hayMas`). `buscar` filtra por título si alcanza el mínimo.
export type LectorDeGuias = (pedido: {
  buscar: string | null
}) => Promise<Resultado<{ filas: GuiaDeLista[]; hayMas: boolean }>>

// La guía entera, o `null` si ya no existe.
export type LectorDeGuia = (id: string) => Promise<Resultado<GuiaCompleta | null>>

// Categorías y autores para los selectores de la guía; la categoría y el autor actuales entran aunque ya no estén activos.
export type LectorDeOpcionesDeGuia = (actuales: {
  categoriaId: string | null
  autorId: string | null
}) => Promise<Resultado<OpcionesDeGuia>>

// Lo que cambia al guardar una guía; vacío es nulo en los campos opcionales.
export type CamposDeGuia = {
  titulo: string
  slug: string
  resumen: string | null
  categoriaId: string | null
  autorId: string | null
  portadaRuta: string | null
  seoTitulo: string | null
  seoDescripcion: string | null
  cuerpoDoc: DocumentoDelSitio | null
}

// Qué pasa con `publicada_en`: se deja como está, se publica (ya), se programa (una fecha ISO) o se despublica.
export type PublicacionDeGuia =
  | { tipo: 'mantener' }
  | { tipo: 'publicar' }
  | { tipo: 'programar'; cuando: string }
  | { tipo: 'despublicar' }

export type EscritorDeGuias = {
  crear: (entrada: {
    titulo: string
    slug: string
  }) => Promise<ResultadoDeAccion<{ id: string; actualizadoEn: string }>>
  guardar: (entrada: {
    id: string
    actualizadoEnEsperado: string
    campos: CamposDeGuia
    publicacion: PublicacionDeGuia
  }) => Promise<ResultadoDeAccion<{ actualizadoEn: string }>>
  eliminar: (entrada: {
    id: string
    actualizadoEnEsperado: string
  }) => Promise<ResultadoDeAccion<null>>
}

// Las categorías por orden y nombre (tope + 1) con su uso («Con guías» / «Sin guías»), leído en una sola consulta acotada.
export type LectorDeCategorias = () => Promise<Resultado<ListaDeCategorias>>

// Lo guardado en `ajustes_web.legales` con la versión de la fila; si falla, falla (nunca un vacío que se guarde encima).
export type LectorDeLegales = () => Promise<Resultado<LegalesDelSitio>>

// La tabla de categorías no tiene versión: la última escritura gana. Una fila que ya no está es `no_encontrado`.
export type EscritorDeCategorias = {
  crear: (entrada: { nombre: string }) => Promise<ResultadoDeAccion<{ id: string }>>
  renombrar: (entrada: { id: string; nombre: string }) => Promise<ResultadoDeAccion<null>>
  activar: (entrada: { id: string; activa: boolean }) => Promise<ResultadoDeAccion<null>>
  mover: (entrada: { id: string; direccion: DireccionDeOrden }) => Promise<ResultadoDeAccion<null>>
  // Sólo sin guías: si alguna la usa, es una `regla`.
  eliminar: (entrada: { id: string }) => Promise<ResultadoDeAccion<null>>
}

// Guarda sólo la clave `legales` de `ajustes_web` por `web_ajustes_guardar` y devuelve la versión nueva de la fila.
export type EscritorDeLegales = (pedido: {
  cambios: CambiosDeLegales
  actualizadoEnEsperado: string
}) => Promise<ResultadoDeAccion<{ actualizadoEn: string }>>
