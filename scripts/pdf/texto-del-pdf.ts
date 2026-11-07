// El lector del PDF de las pruebas (4.18-3a, C12, P3): lo que dice un PDF de `@react-pdf/renderer` (pdfkit 0.20), sin dependencias (sólo `node:zlib`). Lee el texto de cada
// página por las CMap ToUnicode de sus fuentes, en líneas de arriba abajo (lo que va a la misma altura, de izquierda a derecha y separado por un espacio), cuenta las imágenes
// (sin las máscaras de transparencia) y junta los colores de relleno. Lo que no sabe leer lo dice y no adivina: una fuente sin ToUnicode (Helvetica), un filtro que no es
// FlateDecode, un PDF cifrado o algo que no es un PDF.
import { inflateSync } from 'node:zlib'
import { leerContenido, type Cmap, type Trozo } from './contenido-del-pdf'
import { noEntiende } from './no-entiende'

export type TextoDelPdf = {
  paginas: { lineas: string[] }[]
  imagenes: number
  // `#rrggbb`, sin repetir, en el orden en que aparecen.
  rellenos: string[]
}

type Objeto = { dic: string; datos: Buffer | null }

// Dos trozos a menos de un punto de altura van en la misma línea.
const MISMA_LINEA = 1

function datosDelStream(bytes: Buffer, dic: string, desde: number): Buffer {
  const largo = /\/Length (\d+)/.exec(dic)?.[1]
  if (largo === undefined) {
    noEntiende('un stream sin /Length directo')
  }
  const crudo = bytes.subarray(desde, desde + Number(largo))
  const filtro = /\/Filter\s*\/(\w+)/.exec(dic)?.[1]
  if (filtro === undefined) {
    return crudo
  }
  if (filtro !== 'FlateDecode') {
    noEntiende(`el filtro ${filtro}`)
  }
  return inflateSync(crudo)
}

// Un objeto `N 0 obj … endobj` que empieza en `desde`, saltando su stream por el `/Length` (adentro puede haber cualquier byte). Devuelve dónde sigue.
function leerObjeto(
  bytes: Buffer,
  texto: string,
  desde: number,
): { objeto: Objeto; sigue: number } {
  const fin = texto.indexOf('endobj', desde)
  const marca = texto.indexOf('stream', desde)
  if (marca === -1 || (fin !== -1 && marca > fin)) {
    return {
      objeto: { dic: texto.slice(desde, fin), datos: null },
      sigue: fin === -1 ? texto.length : fin,
    }
  }
  const dic = texto.slice(desde, marca)
  const inicio = marca + (texto[marca + 6] === '\r' ? 8 : 7)
  const datos = datosDelStream(bytes, dic, inicio)
  return { objeto: { dic, datos }, sigue: texto.indexOf('endobj', inicio) }
}

function objetosDe(bytes: Buffer): Map<number, Objeto> {
  const texto = bytes.toString('latin1')
  const objetos = new Map<number, Objeto>()
  const inicio = /(\d+) 0 obj\b/g
  for (let m = inicio.exec(texto); m !== null; m = inicio.exec(texto)) {
    const { objeto, sigue } = leerObjeto(bytes, texto, m.index + m[0].length)
    objetos.set(Number(m[1]), objeto)
    inicio.lastIndex = sigue === -1 ? texto.length : sigue
  }
  return objetos
}

const ref = (dic: string, clave: string): number | null => {
  const m = new RegExp(`/${clave}\\s+(\\d+) 0 R`).exec(dic)
  return m ? Number(m[1]) : null
}

function objeto(objetos: Map<number, Objeto>, n: number | null): Objeto {
  const o = n === null ? undefined : objetos.get(n)
  return o ?? noEntiende(`falta el objeto ${String(n)}`)
}

// Las páginas en el orden de `/Kids`, entrando en los `/Pages` anidados.
function paginasDe(objetos: Map<number, Objeto>, n: number | null): Objeto[] {
  const o = objeto(objetos, n)
  if (/\/Type\s*\/Page\b(?!s)/.test(o.dic)) {
    return [o]
  }
  const hijos = /\/Kids\s*\[([^\]]*)\]/.exec(o.dic)?.[1] ?? ''
  return [...hijos.matchAll(/(\d+) 0 R/g)].flatMap((h) => paginasDe(objetos, Number(h[1])))
}

const desdeUtf16 = (hex: string) => {
  let s = ''
  for (let i = 0; i + 4 <= hex.length; i += 4) {
    s += String.fromCharCode(parseInt(hex.slice(i, i + 4), 16))
  }
  return s
}

function caracteresSueltos(texto: string, codigos: Map<string, string>): void {
  for (const bloque of texto.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const [, codigo = '', unicode = ''] of (bloque[1] ?? '').matchAll(
      /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F\s]+)>/g,
    )) {
      codigos.set(codigo.toLowerCase(), desdeUtf16(unicode.replace(/\s/g, '')))
    }
  }
}

// `<a> <b> <d>`: de a hasta b, d y los que siguen; `<a> <b> [<d1> <d2> …]`: uno por código.
function rango(a: string, b: string, destino: string, codigos: Map<string, string>): void {
  const lista = [...destino.matchAll(/<([0-9a-fA-F\s]+)>/g)].map((d) =>
    (d[1] ?? '').replace(/\s/g, ''),
  )
  const desde = parseInt(a, 16)
  const primero = parseInt(lista[0] ?? '0', 16)
  for (let c = desde; c <= parseInt(b, 16); c++) {
    const unicode = destino.startsWith('[')
      ? desdeUtf16(lista[c - desde] ?? '')
      : String.fromCharCode(primero + c - desde)
    codigos.set(c.toString(16).padStart(a.length, '0'), unicode)
  }
}

function cmapDe(texto: string): Cmap {
  const codigos = new Map<string, string>()
  const largo = /begincodespacerange\s*<([0-9a-fA-F]+)>/.exec(texto)?.[1]?.length ?? 4
  caracteresSueltos(texto, codigos)
  for (const bloque of texto.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    const rangos = (bloque[1] ?? '').matchAll(
      /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(\[[^\]]*\]|<[0-9a-fA-F\s]+>)/g,
    )
    for (const [, a = '', b = '', destino = ''] of rangos) {
      rango(a, b, destino, codigos)
    }
  }
  return { largo, codigos }
}

// Las fuentes de una página por su nombre de recurso (`F1`), con su CMap ToUnicode; sin ToUnicode, nulo (y se dice al usarla).
function fuentesDe(objetos: Map<number, Objeto>, pagina: Objeto): Map<string, Cmap | null> {
  const nRecursos = ref(pagina.dic, 'Resources')
  const recursos = nRecursos === null ? pagina.dic : objeto(objetos, nRecursos).dic
  const fuentes = new Map<string, Cmap | null>()
  const lista = /\/Font\s*<<([^>]*)>>/.exec(recursos)?.[1] ?? ''
  for (const [, nombre = '', n = ''] of lista.matchAll(/\/([^\s/]+)\s+(\d+) 0 R/g)) {
    const unicode = ref(objeto(objetos, Number(n)).dic, 'ToUnicode')
    const datos = unicode === null ? null : objeto(objetos, unicode).datos
    fuentes.set(nombre, datos === null ? null : cmapDe(datos.toString('latin1')))
  }
  return fuentes
}

// Los trozos en líneas: de arriba abajo (la `y` de la página crece hacia arriba) y, en cada una, de izquierda a derecha.
function lineasDe(trozos: Trozo[]): string[] {
  const lineas: { y: number; trozos: Trozo[] }[] = []
  for (const t of [...trozos].sort((a, b) => b.y - a.y)) {
    const linea = lineas.find((l) => Math.abs(l.y - t.y) < MISMA_LINEA)
    if (linea) {
      linea.trozos.push(t)
    } else {
      lineas.push({ y: t.y, trozos: [t] })
    }
  }
  const unir = (ts: Trozo[]) =>
    ts
      .sort((a, b) => a.x - b.x)
      .map((t) => t.texto.trim())
      .filter((s) => s !== '')
      .join(' ')
  return lineas.map((l) => unir(l.trozos)).filter((l) => l !== '')
}

function paginaLeida(objetos: Map<number, Objeto>, pagina: Objeto, rellenos: Set<string>) {
  const fuentes = fuentesDe(objetos, pagina)
  const contenidos = /\/Contents\s*(\[[^\]]*\]|\d+ 0 R)/.exec(pagina.dic)?.[1] ?? ''
  const trozos = [...contenidos.matchAll(/(\d+) 0 R/g)].flatMap((c) => {
    const datos = objeto(objetos, Number(c[1])).datos ?? noEntiende('un contenido sin stream')
    return leerContenido(datos.toString('latin1'), fuentes, rellenos)
  })
  return { lineas: lineasDe(trozos) }
}

// Las imágenes que se dibujan: los XObject `/Image` que no son la `/SMask` (la transparencia) de otro.
function imagenesDe(objetos: Map<number, Objeto>): number {
  const todos = [...objetos]
  const mascaras = new Set(
    todos.flatMap(([, o]) => [...o.dic.matchAll(/\/SMask\s+(\d+) 0 R/g)].map((m) => Number(m[1]))),
  )
  return todos.filter(([n, o]) => /\/Subtype\s*\/Image\b/.test(o.dic) && !mascaras.has(n)).length
}

export function textoDelPdf(bytes: Uint8Array): TextoDelPdf {
  const crudo = Buffer.from(bytes)
  if (crudo.subarray(0, 5).toString('latin1') !== '%PDF-') {
    noEntiende('no empieza por %PDF-')
  }
  const objetos = objetosDe(crudo)
  const todos = [...objetos.values()]
  if (todos.some((o) => /\/Encrypt\b/.test(o.dic))) {
    noEntiende('está cifrado')
  }
  const raiz = todos.find((o) => /\/Type\s*\/Catalog\b/.test(o.dic)) ?? noEntiende('sin /Catalog')
  const rellenos = new Set<string>()
  const paginas = paginasDe(objetos, ref(raiz.dic, 'Pages')).map((p) =>
    paginaLeida(objetos, p, rellenos),
  )
  return { paginas, imagenes: imagenesDe(objetos), rellenos: [...rellenos] }
}
