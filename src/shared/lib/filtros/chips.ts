// Los filtros activos dichos en palabras: un chip por cada cosa que se puede quitar sola.
import { formatearFecha } from '../fechas'
import { formatearNumero } from '../formato'
import type { DefFiltro, EsquemaDeFiltros, ValorDeFiltro, ValoresDeFiltros } from './esquema'
import { escribirFiltro } from './url'

export type Chip = {
  // Estable entre renders: sirve de `key`.
  id: string
  texto: string
  // Lo que hay que poner en la URL para quitar justo este chip.
  alQuitar: Record<string, string | null>
}

type Formato = { locale?: string; zona?: string }

function rango(desde: string | null, hasta: string | null): string {
  if (desde !== null && hasta !== null) {
    return desde === hasta ? desde : `${desde} a ${hasta}`
  }
  return desde !== null ? `desde ${desde}` : `hasta ${hasta ?? ''}`
}

function chipsDeUno(def: DefFiltro, valor: ValorDeFiltro, formato: Formato): Chip[] {
  const quitarTodo = escribirFiltro(def, null)
  const uno = (texto: string): Chip[] => [
    { id: def.clave, texto: `${def.etiqueta}: ${texto}`, alQuitar: quitarTodo },
  ]
  switch (valor.tipo) {
    case 'texto':
      return uno(`«${valor.texto}»`)
    case 'booleano':
      return uno(valor.valor ? 'sí' : 'no')
    case 'opciones': {
      const opciones = def.tipo === 'opciones' ? def.opciones : []
      // Una opción elegida = un chip: se quita ésa y quedan las demás.
      return valor.valores.map((elegido) => ({
        id: `${def.clave}:${elegido}`,
        texto: `${def.etiqueta}: ${opciones.find((opcion) => opcion.valor === elegido)?.etiqueta ?? elegido}`,
        alQuitar: escribirFiltro(def, {
          tipo: 'opciones',
          valores: valor.valores.filter((otro) => otro !== elegido),
        }),
      }))
    }
    case 'rango_numero': {
      const sinMiles = def.tipo === 'rango_numero' && def.sinMiles === true
      const escribir = (numero: number | null) =>
        numero === null
          ? null
          : sinMiles
            ? String(numero)
            : formatearNumero(numero, { locale: formato.locale })
      return uno(rango(escribir(valor.min), escribir(valor.max)))
    }
    case 'rango_fecha': {
      const escribir = (dia: string | null) =>
        dia === null ? null : formatearFecha(dia, { zona: formato.zona })
      return uno(rango(escribir(valor.desde), escribir(valor.hasta)))
    }
  }
}

export function chipsDe(
  esquema: EsquemaDeFiltros,
  valores: ValoresDeFiltros,
  formato: Formato = {},
): Chip[] {
  const chips: Chip[] = []
  if (esquema.busqueda && valores.busqueda !== '') {
    chips.push({
      id: esquema.busqueda.clave,
      texto: `«${valores.busqueda}»`,
      alQuitar: { [esquema.busqueda.clave]: null },
    })
  }
  for (const def of esquema.filtros) {
    const valor = valores.porClave[def.clave]
    if (valor) {
      chips.push(...chipsDeUno(def, valor, formato))
    }
  }
  return chips
}
