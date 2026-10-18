// El «⋯» de un lead, dicho una sola vez: qué acciones tiene, en qué orden y quién las ve. La fila del listado, la tarjeta del kanban, el
// resumen y la ficha dibujan esta lista (`features/marcas/components/menu-de-lead.tsx`); ninguna escribe la suya. Lo que una persona no
// puede hacer no aparece, y los permisos son los de siempre: esta lista no decide nada nuevo.
import { ETIQUETA_DE_FAVORITO, ETIQUETA_DE_TACHADO } from './marcas'
import { ETIQUETA_DE_ENVIAR } from './papelera'

export type ClaveDeAccionDeLead =
  'agendar' | 'anotar' | 'etiquetas' | 'favorito' | 'tachado' | 'papelera'

// El texto de cada una. Las que abren algo encima (un modal, el selector de etiquetas) llevan «…»; «Favorito» y «Tachado» son casillas.
export const ETIQUETA_DE_ACCION_DE_LEAD: Readonly<Record<ClaveDeAccionDeLead, string>> = {
  agendar: 'Agendar recordatorio…',
  anotar: 'Anotar seguimiento…',
  etiquetas: 'Etiquetas…',
  favorito: ETIQUETA_DE_FAVORITO,
  tachado: ETIQUETA_DE_TACHADO,
  papelera: ETIQUETA_DE_ENVIAR,
}

// El orden, en tres bloques: lo que se hace seguido arriba (agendar y anotar), lo que se marca en medio (etiquetas, favorito y tachado) y
// lo destructivo al final y separado (la papelera). Entre dos bloques con algo va un separador.
export const BLOQUES_DEL_MENU_DE_LEAD: readonly (readonly ClaveDeAccionDeLead[])[] = [
  ['agendar', 'anotar'],
  ['etiquetas', 'favorito', 'tachado'],
  ['papelera'],
]

export type PermisosDelMenuDeLead = {
  // Con el lead en la cartera y `leads.editar`: agendar un recordatorio y anotar un seguimiento.
  actuar: boolean
  // Con `leads.eliminar` sobre este lead (`puedeEnviarLead()`).
  enviar: boolean
}

// Las acciones que quien mira tiene sobre este lead, en su orden y por bloques (sin bloques vacíos). Marcar (etiquetas, favorito y
// tachado) basta con ver el lead: no pide poder editarlo.
export function accionesDeLead(puede: PermisosDelMenuDeLead): ClaveDeAccionDeLead[][] {
  const visible: Readonly<Record<ClaveDeAccionDeLead, boolean>> = {
    agendar: puede.actuar,
    anotar: puede.actuar,
    etiquetas: true,
    favorito: true,
    tachado: true,
    papelera: puede.enviar,
  }
  return BLOQUES_DEL_MENU_DE_LEAD.map((bloque) => bloque.filter((clave) => visible[clave])).filter(
    (bloque) => bloque.length > 0,
  )
}
