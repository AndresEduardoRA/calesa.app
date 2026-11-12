// Las interfaces del área `contenido` de `web`: lo que la composición le da a quien lee o escribe las guías.
import type { ResultadoDeAccion } from '@/shared/lib/enviar-accion'
import type { Resultado } from '@/shared/lib/errores'
import type { DocumentoDelSitio } from './documento-limpio'
import type { GuiaCompleta, GuiaDeLista, OpcionesDeGuia } from './guias'

// La lista de guías, de la más reciente a la más antigua, con un tope + 1 leído (`hayMas`). `buscar` filtra por título si alcanza el mínimo.
export type LectorDeGuias = (pedido: {
  buscar: string | null
}) => Promise<Resultado<{ filas: GuiaDeLista[]; hayMas: boolean }>>

// La guía entera, o `null` si ya no existe.
export type LectorDeGuia = (id: string) => Promise<Resultado<GuiaCompleta | null>>

// Categorías y autores para los selectores de la guía; `categoriaActual` entra aunque esté desactivada.
export type LectorDeOpcionesDeGuia = (
  categoriaActual: string | null,
) => Promise<Resultado<OpcionesDeGuia>>

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
