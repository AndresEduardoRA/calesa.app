import 'server-only'
import { StyleSheet } from '@react-pdf/renderer'
import { FAMILIA_DEL_PDF } from './fuentes'

// Los colores neutros del PDF: un espejo de los de `design/tokens.css` en claro (el PDF no lee CSS). Si cambian allá, cambian aquí; es el único lugar del documento que los
// escribe. Los de cada grupo salen del tono `claro` de la lectura de la tarjeta.
export const NEUTROS = {
  tinta: '#1b2130', // --color-ink
  tintaSuave: '#4a5468', // --color-ink-soft
  linea: '#e5e8ee', // --color-line
  lineaFuerte: '#8a8f9b', // --color-line-strong
  superficie: '#ffffff', // --color-surface
  hundida: '#eef0f4', // --color-paper-dim (zonas hundidas)
  peligro: '#b02a2a', // --color-peligro-ink
  peligroSuave: '#fdeeee', // --color-peligro-soft
} as const

// Puntos tipográficos. Lo que va en una misma línea (la etiqueta y su monto) lleva el mismo tamaño.
const TEXTO = 10
const CHICO = 8.5

export const estilos = StyleSheet.create({
  pagina: {
    fontFamily: FAMILIA_DEL_PDF,
    fontSize: TEXTO,
    color: NEUTROS.tinta,
    backgroundColor: NEUTROS.superficie,
    padding: 40,
    gap: 10,
  },
  encabezado: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  encabezadoTexto: { flexGrow: 1, flexShrink: 1, gap: 2 },
  titulo: { fontSize: 14, fontWeight: 600 },
  fila: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  enLinea: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, flexWrap: 'wrap' },
  suave: { color: NEUTROS.tintaSuave },
  vencida: {
    color: NEUTROS.peligro,
    backgroundColor: NEUTROS.peligroSuave,
    fontWeight: 600,
    paddingHorizontal: 4,
  },
  logo: { maxWidth: 120, maxHeight: 48, objectFit: 'contain' },
  vehiculo: {
    backgroundColor: NEUTROS.hundida,
    borderRadius: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontWeight: 600,
  },
  grupo: {
    borderWidth: 1,
    borderColor: NEUTROS.lineaFuerte,
    borderRadius: 6,
    padding: 10,
    gap: 6,
  },
  tituloDelGrupo: { fontWeight: 600 },
  celdas: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  etiquetaDeCelda: { color: NEUTROS.tintaSuave },
  valorDeCelda: { fontWeight: 600 },
  etiquetaDeFila: { flexGrow: 1, flexShrink: 1, gap: 1 },
  leyenda: { fontSize: CHICO, color: NEUTROS.tintaSuave },
  monto: { flexShrink: 0, fontWeight: 600 },
  total: {
    borderWidth: 1,
    borderColor: NEUTROS.lineaFuerte,
    backgroundColor: NEUTROS.hundida,
    borderRadius: 6,
    padding: 10,
    gap: 4,
  },
  filaDelTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    fontSize: 12,
    fontWeight: 600,
  },
  aparte: {
    borderTopWidth: 1,
    borderTopColor: NEUTROS.linea,
    paddingTop: 4,
    gap: 2,
    color: NEUTROS.tintaSuave,
  },
  nota: { fontSize: CHICO, color: NEUTROS.tintaSuave },
})
