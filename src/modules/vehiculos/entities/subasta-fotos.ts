// Las fotos de la respuesta de apibara: cuáles se traen y cuáles faltan.
import { MAXIMO_DE_FOTOS } from './foto'
import { valorEnRuta } from './subasta'

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === 'object' && !Array.isArray(valor)
}

export type FotoDeSubasta = { url: string; orden: number }

function direccionDeFoto(item: unknown): string | undefined {
  if (!esObjeto(item) || item['type'] !== 'image') {
    return undefined
  }
  for (const clave of ['full', 'large', 'thumb']) {
    const valor = item[clave]
    if (typeof valor === 'string' && /^https:\/\/\S+$/.test(valor)) {
      return valor
    }
  }
  return undefined
}

// Las primeras 24, en el orden de la respuesta (la primera es la portada). La mejor calidad que
// trae cada una: `full`, si no `large`. El video y el 360° no son fotos: quedan en el bruto.
export function fotosDeSubasta(raw: unknown): FotoDeSubasta[] {
  const items = valorEnRuta(raw, 'media.items')
  const direcciones = Array.isArray(items)
    ? items.flatMap((item) => {
        const url = direccionDeFoto(item)
        return url === undefined ? [] : [url]
      })
    : []
  const vistas = new Set<string>()
  const unicas = direcciones.filter((url) => {
    if (vistas.has(url)) {
      return false
    }
    vistas.add(url)
    return true
  })
  return unicas.slice(0, MAXIMO_DE_FOTOS).map((url, indice) => ({ url, orden: indice + 1 }))
}

// Las que la respuesta tiene y el vehículo todavía no registró (por la dirección de origen).
export function fotosQueFaltan(raw: unknown, registradas: readonly string[]): FotoDeSubasta[] {
  const tiene = new Set(registradas)
  return fotosDeSubasta(raw).filter((foto) => !tiene.has(foto.url))
}
