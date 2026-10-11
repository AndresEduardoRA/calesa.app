// Lo mínimo de la empresa que la app necesita en toda pantalla, incluso antes de ingresar:
// identidad, formato regional y si alguien puede crear su cuenta. Sólo lectura. El resto de
// `ajustes_empresa` (datos legales, políticas) lo lee su formulario de configuración.
import { z } from 'zod'
import { NOMBRE_POR_DEFECTO } from '@/shared/config/app'
import { LOCALE_POR_DEFECTO } from '@/shared/lib/formato'

export type Ajustes = {
  nombre: string
  // Ruta dentro del bucket público `marca`, o null si la empresa todavía no cargó su logo.
  logoRuta: string | null
  locale: string
  monedaBase: string
  // El interruptor de Configuración › Empresa, tal cual está guardado.
  registroAbierto: boolean
  // Todavía no hay nadie en el equipo: la primera cuenta nace siempre (y nace dueña).
  primerRegistro: boolean
}

// Lo que se muestra si la base no respondió: la identidad neutra y el registro cerrado. La
// pantalla de ingreso tiene que poder dibujarse igual; cerrado es el lado seguro del error.
export const AJUSTES_POR_DEFECTO: Ajustes = {
  nombre: NOMBRE_POR_DEFECTO,
  logoRuta: null,
  locale: LOCALE_POR_DEFECTO,
  monedaBase: 'USD',
  registroAbierto: false,
  primerRegistro: false,
}

// Una fila de la RPC `web.ajustes_acceso()`.
const esquemaFila = z.object({
  nombre: z.string().min(1),
  logo_ruta: z.string().nullable(),
  locale: z.string().min(2),
  moneda_base: z.string().length(3),
  registro_abierto: z.boolean(),
  primer_registro: z.boolean(),
})

// Devuelve null si la respuesta no tiene la forma esperada: quien llama decide qué mostrar.
export function ajustesDesde(fila: unknown): Ajustes | null {
  const leida = esquemaFila.safeParse(fila)
  if (!leida.success) {
    return null
  }
  const { nombre, logo_ruta, locale, moneda_base, registro_abierto, primer_registro } = leida.data
  return {
    nombre,
    logoRuta: logo_ruta,
    locale,
    monedaBase: moneda_base,
    registroAbierto: registro_abierto,
    primerRegistro: primer_registro,
  }
}

// Misma condición que el trigger `auth_registro_permitido()`: se puede crear una cuenta si el
// registro está abierto o si todavía no hay nadie. La UI lo usa para mostrar u ocultar «Crear
// cuenta»; quien lo hace cumplir es la base.
export function registroDisponible(ajustes: Pick<Ajustes, 'registroAbierto' | 'primerRegistro'>) {
  return ajustes.registroAbierto || ajustes.primerRegistro
}
