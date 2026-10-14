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

export type ResultadoDeFotos = {
  // Cuántas había por traer, cuántas quedaron guardadas y por qué no las demás (si hay un motivo).
  total: number
  guardadas: number
  motivo?: string
}

// Lo que se le dice a la persona cuando terminó de traer las fotos. El vehículo ya está guardado:
// lo que falta se puede traer después, y el mensaje lo dice con cuántas son.
export function resumenDeFotosDeSubasta({ total, guardadas, motivo }: ResultadoDeFotos): string {
  if (total === 0) {
    return 'No hay fotos nuevas que traer.'
  }
  if (guardadas === total) {
    return total === 1
      ? 'Se guardó la foto de la subasta.'
      : `Se guardaron las ${String(total)} fotos de la subasta.`
  }
  const porque = motivo ? ` ${motivo}` : ''
  if (guardadas === 0) {
    return `No se pudo traer ninguna foto de la subasta.${porque} Puedes intentarlo desde Fotos.`
  }
  const faltan = total - guardadas
  return `Se guardaron ${String(guardadas)} de ${String(total)} fotos de la subasta. ${
    faltan === 1 ? 'Falta 1' : `Faltan ${String(faltan)}`
  }.${porque} Puedes traerlas desde Fotos.`
}
