import type { UnidadDelGrupo, GrupoLeido } from './grupos'
import {
  CAMPOS_DE_TRANSPORTE,
  normalizarCampo,
  VALORES_VACIOS_DE_TRANSPORTE,
  type CampoDeTransporte,
  type CambiosDeTransporte,
  type ValoresDeTransporte,
} from './transporte'

// «Editar grupo» (6.08-4): lo que cambia el formulario al aplicarse a todas las unidades de un embarque o contenedor. La base lo hace todo o nada por `transporte_grupo_aplicar` (con las
// versiones que vio el resumen); aquí vive qué campos difieren («Varios»), qué cambios se mandan y los textos. `notas` no entra: la base no las admite en el grupo (D39).
export type CampoDelGrupo = Exclude<CampoDeTransporte, 'notas'>
export type CambiosDelGrupo = Omit<CambiosDeTransporte, 'notas'>

export const CAMPOS_DEL_GRUPO: readonly CampoDelGrupo[] = CAMPOS_DE_TRANSPORTE.filter(
  (c): c is CampoDelGrupo => c !== 'notas',
)

// La clave de la base de cada campo del grupo.
const CLAVE_DE_LA_BASE = {
  naviera: 'naviera_id',
  puertoOrigen: 'puerto_origen_id',
  puertoDestino: 'puerto_destino_id',
  contenedor: 'contenedor',
  booking: 'booking',
  zarpe: 'zarpe_el',
  eta: 'eta_el',
  arribo: 'arribo_el',
} as const satisfies Record<CampoDelGrupo, keyof CambiosDelGrupo>

const VALOR_DE: Record<CampoDelGrupo, (u: UnidadDelGrupo) => string | null> = {
  naviera: (u) => u.navieraId,
  puertoOrigen: (u) => u.puertoOrigenId,
  puertoDestino: (u) => u.puertoDestinoId,
  contenedor: (u) => u.contenedor,
  booking: (u) => u.booking,
  zarpe: (u) => u.zarpeEl,
  eta: (u) => u.etaEl,
  arribo: (u) => u.arriboEl,
}

function valorDe(u: UnidadDelGrupo, campo: CampoDelGrupo): string {
  return VALOR_DE[campo](u) ?? ''
}

export type ComunesDelGrupo = {
  // Lo común de cada campo (`''` si es nulo o si las unidades difieren).
  valores: ValoresDeTransporte
  // Los campos donde las unidades vistas difieren («Varios»).
  varios: readonly CampoDelGrupo[]
}

/** Qué comparten las unidades vistas: el valor común de cada campo, o «Varios» si difieren (también «una tiene y otra no»). `notas` sale siempre vacío. */
export function valoresComunes(unidades: readonly UnidadDelGrupo[]): ComunesDelGrupo {
  const valores: ValoresDeTransporte = { ...VALORES_VACIOS_DE_TRANSPORTE }
  const varios: CampoDelGrupo[] = []
  const [primera, ...resto] = unidades
  if (!primera) {
    return { valores, varios }
  }
  for (const campo of CAMPOS_DEL_GRUPO) {
    const primero = normalizarCampo(campo, valorDe(primera, campo))
    if (resto.some((u) => normalizarCampo(campo, valorDe(u, campo)) !== primero)) {
      varios.push(campo)
    } else {
      valores[campo] = primero ?? ''
    }
  }
  return { valores, varios }
}

/**
 * Sólo lo que se toca, con la clave de la base. Un campo común se manda si cambió (vacío = vaciar a todas); un campo en «Varios» sólo si se escribió algo: vacío es no tocar y nunca se
 * vacía un «Varios» (D38). `null` si no hay nada que mandar.
 */
export function cambiosDelGrupo(
  comunes: ComunesDelGrupo,
  valores: ValoresDeTransporte,
): CambiosDelGrupo | null {
  const cambios: CambiosDelGrupo = {}
  for (const campo of CAMPOS_DEL_GRUPO) {
    const nuevo = normalizarCampo(campo, valores[campo])
    const enVarios = comunes.varios.includes(campo)
    const manda = enVarios
      ? nuevo !== null
      : nuevo !== normalizarCampo(campo, comunes.valores[campo])
    if (manda) {
      cambios[CLAVE_DE_LA_BASE[campo]] = nuevo
    }
  }
  return Object.keys(cambios).length === 0 ? null : cambios
}

/** Las versiones que vio el resumen, por transporte: lo que la base compara para no pisar a nadie. */
export function esperadasDelGrupo(unidades: readonly UnidadDelGrupo[]): Record<string, string> {
  return Object.fromEntries(unidades.map((u) => [u.transporteId, u.actualizadoEn]))
}

export type PuedeEditarElGrupo = { puede: true } | { puede: false; motivo: string }

/** Si el grupo se puede editar desde aquí (no mira el permiso: eso es de la página). La base vuelve a decidirlo por unidad. */
export function puedeEditarElGrupo(
  grupo: Pick<GrupoLeido, 'unidades' | 'hayMas' | 'hayOcultas'>,
): PuedeEditarElGrupo {
  if (grupo.unidades.length === 0) {
    return { puede: false, motivo: 'Este grupo no tiene unidades que puedas ver.' }
  }
  if (grupo.hayMas) {
    return {
      puede: false,
      motivo: 'Hay más unidades de las que se muestran: no se puede editar el grupo desde aquí.',
    }
  }
  if (grupo.hayOcultas) {
    return {
      puede: false,
      motivo: 'Hay unidades que no ves: no se puede editar el grupo desde aquí.',
    }
  }
  if (grupo.unidades.some((u) => !u.editable)) {
    return { puede: false, motivo: 'Hay unidades del grupo que no puedes editar.' }
  }
  return { puede: true }
}

export const TEXTO_DE_VARIOS =
  'Varios: cada unidad tiene el suyo. Escribe o elige uno para aplicarlo a todas.'

/** El pie del formulario: a cuántas unidades se aplica. */
export function textoDelPieDelGrupo(n: number): string {
  return n === 1 ? 'Se aplicará a la única unidad.' : `Se aplicará a las ${n} unidades.`
}

/** «No se cambió ninguna: <motivo>»: la base es todo o nada. Baja la primera letra del motivo (salvo si empieza con comillas) y quita el «Recarga.» final, que dice el botón. */
export function textoDelRechazoDelGrupo(mensaje: string): string {
  const sinRecarga = mensaje.replace(/\s*Recarga\.$/, '').trim()
  const primera = sinRecarga.charAt(0)
  const motivo =
    primera !== '' && primera !== primera.toLowerCase()
      ? primera.toLowerCase() + sinRecarga.slice(1)
      : sinRecarga
  return `No se cambió ninguna: ${motivo}`
}
