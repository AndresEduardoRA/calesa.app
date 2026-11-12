// La tabla de casos de la lista blanca del documento del sitio: la misma para `htmlDelDocumento()` y
// para `_web_doc_html()` de la base. `html` es lo que se deriva (`''` = sin contenido); `motivo`, el
// rechazo. Lo que nunca puede salir: `<script>`, un `javascript:` y una imagen de otro host.
import {
  MOTIVO_DE_ENLACE,
  MOTIVO_DE_FORMATO,
  MOTIVO_DE_IMAGEN,
  MOTIVO_DE_NIVELES,
  MOTIVO_DE_TAMANO,
} from './doc'

type Caso = { nombre: string; documento: unknown } & (
  { html: string; motivo?: never } | { motivo: string; html?: never }
)

const p = (...content: unknown[]) => ({ type: 'paragraph', content })
const t = (text: string, marks?: unknown[]) =>
  marks ? { type: 'text', text, marks } : { type: 'text', text }
const doc = (...content: unknown[]) => ({ type: 'doc', content })
const item = (...content: unknown[]) => ({ type: 'listItem', content })
const vinetas = (...content: unknown[]) => ({ type: 'bulletList', content })
const titulo = (level: unknown, ...content: unknown[]) => ({
  type: 'heading',
  attrs: { level },
  content,
})
const img = (attrs: Record<string, unknown>) => ({ type: 'image', attrs })
const enlace = (href: string) => ({ type: 'link', attrs: { href } })
const conEnlace = (href: string) => doc(p(t('aquí', [enlace(href)])))
const REL = 'rel="noopener noreferrer nofollow"'

// Tres niveles de lista: doc › ul › li › ul › li › ul › li › p › texto (profundidad 8).
const tresNiveles = doc(
  vinetas(item(p(t('a')), vinetas(item(p(t('b')), vinetas(item(p(t('c')))))))),
)

const CASOS_ACEPTADOS: Caso[] = [
  { nombre: 'un párrafo', documento: doc(p(t('Hola'))), html: '<p>Hola</p>' },
  { nombre: 'nulo es vacío', documento: null, html: '' },
  { nombre: 'sin contenido es vacío', documento: { type: 'doc' }, html: '' },
  {
    nombre: 'sólo párrafos vacíos es vacío',
    documento: doc({ type: 'paragraph' }, p(t('  '))),
    html: '',
  },
  {
    nombre: 'negrita, cursiva y un salto',
    documento: doc(
      p(t('Quiere '), t('RAV4', [{ type: 'bold' }, { type: 'italic' }]), { type: 'hardBreak' }),
    ),
    html: '<p>Quiere <em><strong>RAV4</strong></em><br></p>',
  },
  {
    nombre: 'las marcas en otro orden dan el mismo html',
    documento: doc(p(t('x', [{ type: 'italic' }, enlace('https://a.com'), { type: 'bold' }]))),
    html: `<p><a href="https://a.com" ${REL}><em><strong>x</strong></em></a></p>`,
  },
  {
    nombre: 'un salto con marcas sale como salto',
    documento: doc(p(t('a'), { type: 'hardBreak', marks: [{ type: 'bold' }] }, t('b'))),
    html: '<p>a<br>b</p>',
  },
  {
    nombre: 'títulos 2 y 3',
    documento: doc(titulo(2, t('Dos')), titulo(3, t('Tres'))),
    html: '<h2>Dos</h2><h3>Tres</h3>',
  },
  {
    nombre: 'listas con viñetas, numerada desde 3 y anidada',
    documento: doc(
      vinetas(item(p(t('uno')), vinetas(item(p(t('dentro')))))),
      { type: 'orderedList', attrs: { start: 3 }, content: [item(p(t('tres')))] },
      { type: 'orderedList', attrs: { start: 1 }, content: [item(p(t('uno')))] },
    ),
    html:
      '<ul><li><p>uno</p><ul><li><p>dentro</p></li></ul></li></ul>' +
      '<ol start="3"><li><p>tres</p></li></ol><ol><li><p>uno</p></li></ol>',
  },
  {
    nombre: 'una cita con una lista',
    documento: doc({ type: 'blockquote', content: [p(t('Dijo')), vinetas(item(p(t('x'))))] }),
    html: '<blockquote><p>Dijo</p><ul><li><p>x</p></li></ul></blockquote>',
  },
  {
    nombre: 'un script en el texto sale escapado',
    documento: doc(p(t('<script>alert(1)</script>'))),
    html: '<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>',
  },
  {
    nombre: 'comillas y ampersand en texto, href y alt',
    documento: doc(
      p(t(`"a" & 'b'`, [enlace('https://a.com/?x=1&y="2"')])),
      img({ ruta: 'guias/a.webp', alt: `Foto "de" Ana & 'Luis'` }),
    ),
    html:
      `<p><a href="https://a.com/?x=1&amp;y=&quot;2&quot;" ${REL}>&quot;a&quot; &amp; &#39;b&#39;</a></p>` +
      '<img data-ruta="guias/a.webp" alt="Foto &quot;de&quot; Ana &amp; &#39;Luis&#39;">',
  },
  {
    nombre: 'una imagen del bucket sin alt',
    documento: doc(img({ ruta: 'a/b.webp' })),
    html: '<img data-ruta="a/b.webp" alt="">',
  },
  {
    nombre: 'una imagen con alt nulo y jpg',
    documento: doc(img({ ruta: 'portada-1.jpg', alt: null })),
    html: '<img data-ruta="portada-1.jpg" alt="">',
  },
  {
    nombre: 'https en mayúsculas, mailto y tel',
    documento: doc(
      p(t('a', [enlace('HTTPS://A.COM')]), t('b', [enlace('mailto:a@b.co')])),
      p(t('c', [enlace('tel:+59170000000')])),
    ),
    html:
      `<p><a href="HTTPS://A.COM" ${REL}>a</a><a href="mailto:a@b.co" ${REL}>b</a></p>` +
      `<p><a href="tel:+59170000000" ${REL}>c</a></p>`,
  },
]

const CASOS_RECHAZADOS: Caso[] = [
  {
    nombre: 'un nodo html',
    documento: doc({ type: 'html', content: [] }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'un nodo script',
    documento: doc({ type: 'script', content: [t('x')] }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'un enlace javascript',
    documento: conEnlace('javascript:alert(1)'),
    motivo: MOTIVO_DE_ENLACE,
  },
  {
    nombre: 'un enlace JavaScript',
    documento: conEnlace('JavaScript:alert(1)'),
    motivo: MOTIVO_DE_ENLACE,
  },
  {
    nombre: 'un enlace con tab delante',
    documento: conEnlace('\tjavascript:x'),
    motivo: MOTIVO_DE_ENLACE,
  },
  {
    nombre: 'un enlace con espacio delante',
    documento: conEnlace(' https://a.com'),
    motivo: MOTIVO_DE_ENLACE,
  },
  {
    nombre: 'una imagen de otro host',
    documento: doc(img({ ruta: 'https://otro.host/x.png' })),
    motivo: MOTIVO_DE_IMAGEN,
  },
  {
    nombre: 'una imagen sin esquema',
    documento: doc(img({ ruta: '//otro.host/x.png' })),
    motivo: MOTIVO_DE_IMAGEN,
  },
  {
    nombre: 'una imagen que sube carpetas',
    documento: doc(img({ ruta: '../x.png' })),
    motivo: MOTIVO_DE_IMAGEN,
  },
  {
    nombre: 'una imagen en mayúsculas',
    documento: doc(img({ ruta: 'a/X.PNG' })),
    motivo: MOTIVO_DE_IMAGEN,
  },
  {
    nombre: 'una imagen con comillas',
    documento: doc(img({ ruta: 'a"b.png' })),
    motivo: MOTIVO_DE_IMAGEN,
  },
  {
    nombre: 'una imagen con src',
    documento: doc(img({ src: 'a/b.webp' })),
    motivo: MOTIVO_DE_FORMATO,
  },
  { nombre: 'una imagen sin attrs', documento: doc({ type: 'image' }), motivo: MOTIVO_DE_FORMATO },
  {
    nombre: 'una imagen con alt que no es texto',
    documento: doc(img({ ruta: 'a.png', alt: 3 })),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'una imagen dentro de un párrafo',
    documento: doc(p(img({ ruta: 'a.png' }))),
    motivo: MOTIVO_DE_FORMATO,
  },
  { nombre: 'un título 1', documento: doc(titulo(1, t('x'))), motivo: MOTIVO_DE_FORMATO },
  {
    nombre: 'un título 2 en texto',
    documento: doc(titulo('2', t('x'))),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'un título sin attrs',
    documento: doc({ type: 'heading', content: [t('x')] }),
    motivo: MOTIVO_DE_FORMATO,
  },
  { nombre: 'tres niveles de lista', documento: tresNiveles, motivo: MOTIVO_DE_NIVELES },
  {
    nombre: 'una marca repetida',
    documento: doc(p(t('x', [{ type: 'bold' }, { type: 'bold' }]))),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'una marca desconocida',
    documento: doc(p(t('x', [{ type: 'underline' }]))),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'un enlace con target',
    documento: doc(
      p(t('x', [{ type: 'link', attrs: { href: 'https://a.com', target: '_blank' } }])),
    ),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'una clave de más en el párrafo',
    documento: doc({ type: 'paragraph', attrs: { class: 'x' }, content: [t('x')] }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'una clave de más en el texto',
    documento: doc(p({ type: 'text', text: 'x', style: 'color:red' })),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'una clave de más en la cita',
    documento: doc({ type: 'blockquote', attrs: {}, content: [p(t('x'))] }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'una clave de más en el título',
    documento: doc({ type: 'heading', attrs: { level: 2, id: 'x' }, content: [t('x')] }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'una cita vacía',
    documento: doc({ type: 'blockquote', content: [] }),
    motivo: MOTIVO_DE_FORMATO,
  },
  { nombre: 'una lista vacía', documento: doc(vinetas()), motivo: MOTIVO_DE_FORMATO },
  { nombre: 'un texto vacío', documento: doc(p(t(''))), motivo: MOTIVO_DE_FORMATO },
  {
    nombre: 'una lista numerada desde 0',
    documento: doc({ type: 'orderedList', attrs: { start: 0 }, content: [item(p(t('x')))] }),
    motivo: MOTIVO_DE_FORMATO,
  },
  { nombre: 'la raíz no es doc', documento: p(t('x')), motivo: MOTIVO_DE_FORMATO },
  {
    nombre: 'más de 100 KB',
    documento: doc(p(t('a'.repeat(102400)))),
    motivo: MOTIVO_DE_TAMANO,
  },
]

export const CASOS_DEL_DOCUMENTO: Caso[] = [...CASOS_ACEPTADOS, ...CASOS_RECHAZADOS]
