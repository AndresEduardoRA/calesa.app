// La clave con que el límite por IP del portal cuenta un intento (`web.portal_intento`, 8.07-1). Una IPv4 cuenta por sí misma; una
// IPv6, por su /64, lo mínimo que se le asigna a un cliente: recorrer el /64 no salta el límite ni llena la tabla. Una IPv4 mapeada
// (`::ffff:a.b.c.d`) cuenta como su IPv4. Lo que no es una IP da nulo (la RPC lo cuenta como «desconocida»). Pura.

const LARGO_MAXIMO = 64
const OCTETO = /^\d{1,3}$/
const GRUPO = /^[0-9a-f]{1,4}$/i

function ipv4(texto: string): number[] | null {
  const partes = texto.split('.')
  if (partes.length !== 4) return null
  const octetos = partes.map((p) => (OCTETO.test(p) ? Number(p) : Number.NaN))
  return octetos.every((o) => o <= 255) ? octetos : null
}

// Los grupos de un lado del `::` (o de toda la dirección), con la cola en IPv4 convertida a dos grupos.
function grupos(texto: string, admiteIpv4: boolean): number[] | null {
  if (texto === '') return []
  const partes = texto.split(':')
  const ultima = partes[partes.length - 1] ?? ''
  const cola: number[] = []
  if (admiteIpv4 && ultima.includes('.')) {
    const o = ipv4(ultima)
    if (!o) return null
    cola.push(((o[0] ?? 0) << 8) | (o[1] ?? 0), ((o[2] ?? 0) << 8) | (o[3] ?? 0))
    partes.pop()
  }
  if (!partes.every((p) => GRUPO.test(p))) return null
  return [...partes.map((p) => parseInt(p, 16)), ...cola]
}

function ipv6(texto: string): number[] | null {
  const lados = texto.split('::')
  if (lados.length > 2) return null
  const [izquierda = '', derecha] = lados
  if (derecha === undefined) {
    const todos = grupos(izquierda, true)
    return todos?.length === 8 ? todos : null
  }
  const antes = grupos(izquierda, false)
  const despues = grupos(derecha, true)
  if (!antes || !despues || antes.length + despues.length > 7) return null
  return [...antes, ...Array<number>(8 - antes.length - despues.length).fill(0), ...despues]
}

// Sin espacios, corchetes ni zona (`%eth0`); nulo si vacía o demasiado larga.
function normalizar(ip: string | null | undefined): string | null {
  let texto = (ip ?? '').trim()
  if (texto === '' || texto.length > LARGO_MAXIMO) return null
  if (texto.startsWith('[') && texto.endsWith(']')) texto = texto.slice(1, -1)
  return texto.split('%')[0] ?? ''
}

function claveDeIpv6(g: readonly number[]): string {
  const mapeada = g.slice(0, 5).every((x) => x === 0) && g[5] === 0xffff
  if (mapeada) {
    const [alto = 0, bajo = 0] = g.slice(6)
    return [alto >> 8, alto & 0xff, bajo >> 8, bajo & 0xff].join('.')
  }
  return `${g
    .slice(0, 4)
    .map((x) => x.toString(16))
    .join(':')}::/64`
}

export function agruparIp(ip: string | null | undefined): string | null {
  const texto = normalizar(ip)
  if (!texto) return null
  if (!texto.includes(':')) return ipv4(texto)?.join('.') ?? null
  const g = ipv6(texto)
  return g ? claveDeIpv6(g) : null
}
