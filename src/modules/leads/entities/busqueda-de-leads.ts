// Qué busca el campo «Nombre o número» del listado de leads (5a-8). Puro. Vive aparte de `filtros.ts` porque lo preguntan también los tachados
// ocultos y la constancia de la exportación (`filtros-de-marcas.ts`, `exportacion.ts`), que `filtros.ts` importa.
import { cumpleElMinimo, type MinimoDeBusqueda } from '@/shared/lib/filtros'

// El nombre se busca con 3 letras o dígitos seguidos (un trigrama: con menos, el índice no tiene qué buscar y la base camina la cartera de quien
// busca, 139 a 217 ms la dueña con 212.000 leads; no se pagan n-gramas de 1 y 2 caracteres: `docs/DECISIONES.md`, «5a-8»). Un número vale con
// menos: «5» y «#5» buscan el lead número 5. Es el mismo `[[:alnum:]]{3}` de `_leads_candidatos_indexable()`.
export const MINIMO_DE_BUSQUEDA: MinimoDeBusqueda = {
  letras: 3,
  numerosLibres: true,
  aviso: 'Escribe al menos 3 letras',
}

// Un número de lead son hasta 15 dígitos: cabe entero en un `number` sin perder nada.
const NUMERO_DE_LEAD = /^\d{1,15}$/

// «124» busca el lead con ese número y también los nombres que contienen «124»; «#124» busca sólo el número, y «12» (menos que el mínimo
// del nombre) también. El número es el que la persona ve primero (el global con el permiso, el propio sin él: lo resuelve la base). Nunca el
// teléfono: buscar dígitos sobre lo ajeno sería un oráculo para saber si un número ya está cargado. Nulo = no busca (vacío o menos que el
// mínimo): ni nombre, ni número.
export function interpretarBusqueda(
  texto: string,
): { texto: string; numero: number | null; soloNumero: boolean } | null {
  const recortado = texto.trim()
  const limpio = recortado.replace(/^#/, '').trim()
  if (!cumpleElMinimo(limpio, MINIMO_DE_BUSQUEDA)) {
    return null
  }
  const numero = NUMERO_DE_LEAD.test(limpio) ? Number(limpio) : null
  return {
    texto: limpio,
    numero,
    soloNumero:
      numero !== null && (recortado.startsWith('#') || limpio.length < MINIMO_DE_BUSQUEDA.letras),
  }
}
