// La tabla de casos de la lista blanca del documento: la misma para `validarDocumento()` y para
// `_seguimiento_detalle()` de la base. `texto` es lo que se deriva (`null` = sin detalle); `motivo`,
// el rechazo.
import {
  MOTIVO_DE_ENLACE,
  MOTIVO_DE_FORMATO,
  MOTIVO_DE_LARGO,
  MOTIVO_DE_NIVELES,
  MOTIVO_DE_TAMANO,
} from './documento'

type Caso = { nombre: string; documento: unknown } & (
  { texto: string | null; motivo?: never } | { motivo: string; texto?: never }
)

const p = (...content: unknown[]) => ({ type: 'paragraph', content })
const t = (text: string, marks?: unknown[]) =>
  marks ? { type: 'text', text, marks } : { type: 'text', text }
const doc = (...content: unknown[]) => ({ type: 'doc', content })
const item = (...content: unknown[]) => ({ type: 'listItem', content })
const vinetas = (...content: unknown[]) => ({ type: 'bulletList', content })
const enlace = (href: string, attrs?: Record<string, unknown>) => ({
  type: 'link',
  attrs: attrs ?? { href },
})

export const CASOS_DE_DOCUMENTO: Caso[] = [
  { nombre: 'un párrafo', documento: doc(p(t('Hola'))), texto: 'Hola' },
  { nombre: 'nulo es sin detalle', documento: null, texto: null },
  {
    nombre: 'negrita, cursiva y un salto',
    documento: doc(
      p(
        t('Quiere '),
        t('RAV4', [{ type: 'bold' }, { type: 'italic' }]),
        { type: 'hardBreak' },
        t('2019'),
      ),
    ),
    texto: 'Quiere RAV4\n2019',
  },
  {
    nombre: 'dos párrafos y uno vacío en medio',
    documento: doc(p(t('a')), { type: 'paragraph' }, p(t('b'))),
    texto: 'a\n\nb',
  },
  {
    nombre: 'listas con viñetas y numerada desde 3',
    documento: doc(vinetas(item(p(t('uno'))), item(p(t('dos')))), {
      type: 'orderedList',
      attrs: { start: 3 },
      content: [item(p(t('tres')))],
    }),
    texto: '• uno\n• dos\n3. tres',
  },
  {
    nombre: 'una lista dentro de otra (dos niveles)',
    documento: doc(vinetas(item(p(t('a')), vinetas(item(p(t('b'))))))),
    texto: '• a\n• b',
  },
  {
    nombre: 'tres niveles de lista',
    documento: doc(vinetas(item(p(t('a')), vinetas(item(p(t('b')), vinetas(item(p(t('c'))))))))),
    motivo: MOTIVO_DE_NIVELES,
  },
  {
    nombre: 'sólo párrafos vacíos',
    documento: doc({ type: 'paragraph' }, { type: 'paragraph' }),
    texto: null,
  },
  { nombre: 'un ítem vacío', documento: doc(vinetas(item({ type: 'paragraph' }))), texto: null },
  {
    nombre: 'espacios en los bordes se recortan',
    documento: doc(p(t('  hola  ')), p(t(' '))),
    texto: 'hola',
  },
  {
    nombre: 'un <script> es texto',
    documento: doc(p(t('<script>alert(1)</script>'))),
    texto: '<script>alert(1)</script>',
  },
  {
    nombre: 'enlace https',
    documento: doc(p(t('ver', [enlace('https://ejemplo.com/a?b=1')]))),
    texto: 'ver',
  },
  {
    nombre: 'enlace mailto y tel',
    documento: doc(p(t('m', [enlace('mailto:a@b.co')]), t('t', [enlace('tel:+59170011002')]))),
    texto: 'mt',
  },
  {
    nombre: 'enlace javascript:',
    documento: doc(p(t('x', [enlace('javascript:alert(1)')]))),
    motivo: MOTIVO_DE_ENLACE,
  },
  {
    nombre: 'enlace JavaScript: con mayúsculas',
    documento: doc(p(t('x', [enlace('JaVaScRiPt:alert(1)')]))),
    motivo: MOTIVO_DE_ENLACE,
  },
  {
    nombre: 'enlace data:',
    documento: doc(p(t('x', [enlace('data:text/html,<b>x</b>')]))),
    motivo: MOTIVO_DE_ENLACE,
  },
  {
    nombre: 'enlace con espacios',
    documento: doc(p(t('x', [enlace('https://a.com/ b')]))),
    motivo: MOTIVO_DE_ENLACE,
  },
  {
    nombre: 'enlace con tabulación en el protocolo',
    documento: doc(p(t('x', [enlace('java\tscript:alert(1)')]))),
    motivo: MOTIVO_DE_ENLACE,
  },
  {
    nombre: 'enlace relativo',
    documento: doc(p(t('x', [enlace('/leads')]))),
    motivo: MOTIVO_DE_ENLACE,
  },
  {
    nombre: 'enlace con target y rel',
    documento: doc(p(t('x', [enlace('', { href: 'https://a.com', target: '_blank', rel: 'x' })]))),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'una marca que no se admite',
    documento: doc(p(t('x', [{ type: 'underline' }]))),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'una marca repetida',
    documento: doc(p(t('x', [{ type: 'bold' }, { type: 'bold' }]))),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'una negrita con atributos',
    documento: doc(p(t('x', [{ type: 'bold', attrs: { style: 'color:red' } }]))),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'un nodo que no se admite (imagen)',
    documento: doc({ type: 'image', attrs: { src: 'https://a.com/x.png' } }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'un encabezado',
    documento: doc({ type: 'heading', attrs: { level: 1 }, content: [t('x')] }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'un párrafo con estilo',
    documento: doc({ type: 'paragraph', attrs: { style: 'x' }, content: [t('x')] }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'un texto con onerror',
    documento: doc(p({ type: 'text', text: 'x', onerror: 'alert(1)' })),
    motivo: MOTIVO_DE_FORMATO,
  },
  { nombre: 'texto fuera de un párrafo', documento: doc(t('x')), motivo: MOTIVO_DE_FORMATO },
  { nombre: 'un párrafo dentro de otro', documento: doc(p(p(t('x')))), motivo: MOTIVO_DE_FORMATO },
  { nombre: 'una raíz que no es doc', documento: p(t('x')), motivo: MOTIVO_DE_FORMATO },
  { nombre: 'un texto vacío', documento: doc(p(t(''))), motivo: MOTIVO_DE_FORMATO },
  { nombre: 'una lista sin ítems', documento: doc(vinetas()), motivo: MOTIVO_DE_FORMATO },
  {
    nombre: 'una lista numerada con type',
    documento: doc({
      type: 'orderedList',
      attrs: { start: 1, type: 'a' },
      content: [item(p(t('x')))],
    }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'una lista numerada desde 0',
    documento: doc({ type: 'orderedList', attrs: { start: 0 }, content: [item(p(t('x')))] }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'un contenido que no es lista',
    documento: { type: 'doc', content: 'x' },
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'un texto que no es texto',
    documento: doc(p({ type: 'text', text: 3 })),
    motivo: MOTIVO_DE_FORMATO,
  },
  { nombre: 'una cadena suelta', documento: 'hola', motivo: MOTIVO_DE_FORMATO },
  {
    nombre: 'más de 5000 caracteres',
    documento: doc(p(t('a'.repeat(5001)))),
    motivo: MOTIVO_DE_LARGO,
  },
  {
    nombre: 'justo 5000 caracteres',
    documento: doc(p(t('a'.repeat(5000)))),
    texto: 'a'.repeat(5000),
  },
  // 18.026 bytes en JSON compacto y 20.128 como lo escribe la base: se rechaza aunque el compacto entre.
  {
    nombre: 'cerca de 20 KB, medido como la base',
    documento: doc(...Array.from({ length: 300 }, () => p(t('b')))),
    motivo: MOTIVO_DE_TAMANO,
  },
  {
    nombre: 'más de 20 KB',
    documento: doc(...Array.from({ length: 700 }, () => p(t('ab', [{ type: 'bold' }])))),
    motivo: MOTIVO_DE_TAMANO,
  },
]
