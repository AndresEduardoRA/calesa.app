// Lo que los e2e de «Avanzado» y de la ayuda de la hoja (paso 4.13-4a) preparan y miran: el orden que declara el diseño separado en lo que va en la hoja y lo que va detrás del
// botón «Avanzado», y una variante de la fórmula de prueba cuya sección del nivel «costos» es `avanzado` (la semilla de la subasta no trae una ayuda de texto en «Avanzado»).
import { formulaDePrueba } from './cotizar-formula'
import { literal, sql } from './sql'

type Item = { tipo: string; nodo: string }
type Seccion = { id: string; presentacion: string; items: Item[] }

type Orden = { secciones: string[]; nodos: string[]; atajos: string[] }

const ordenDe = (secciones: Seccion[], sin: readonly string[]): Orden => {
  const dibujados = secciones
    .map((s) => ({
      id: s.id,
      items: s.items.filter((i) => !(i.tipo === 'celda' && sin.includes(i.nodo))),
    }))
    .filter((s) => s.items.length > 0)
  return {
    secciones: dibujados.map((s) => s.id),
    nodos: dibujados.flatMap((s) => s.items.filter((i) => i.tipo !== 'atajos').map((i) => i.nodo)),
    atajos: dibujados.flatMap((s) => s.items.filter((i) => i.tipo === 'atajos').map((i) => i.nodo)),
  }
}

// El orden declarado de un origen para quien ve todos los niveles, separado como lo dibuja la hoja: `hoja` (las secciones principales), `avanzado` (las avanzadas, en el modal) y
// `botonDespuesDe`, la sección principal que va justo antes del botón «Avanzado» (nula si va primero). `sin` son nodos que la hoja no dibuja con su interruptor de «muestra» apagado.
export function ordenConAvanzado(claveDelOrigen: string, sin: readonly string[] = ['garantia']) {
  const { secciones } = JSON.parse(
    sql(
      `select f.diseno from public.formulas f join public.origenes o on o.id = f.origen_id where o.clave = ${literal(claveDelOrigen)} and f.estado = 'publicada'`,
    ),
  ) as { secciones: Seccion[] }
  const primera = secciones.findIndex((s) => s.presentacion === 'avanzado')
  const antes = secciones
    .slice(0, Math.max(primera, 0))
    .filter((s) => s.presentacion !== 'avanzado')
  return {
    hoja: ordenDe(
      secciones.filter((s) => s.presentacion !== 'avanzado'),
      sin,
    ),
    avanzado: ordenDe(
      secciones.filter((s) => s.presentacion === 'avanzado'),
      sin,
    ),
    botonDespuesDe: antes.at(-1)?.id ?? null,
  }
}

// Publica en un origen la fórmula de prueba con la sección del nivel «costos» como `avanzado`: el modal trae un interruptor, dos celdas (una con ayuda de texto), unos atajos y un
// subtotal; el total la suma (`x_celda`), así que tipear ahí cambia el total de la hoja.
export function publicarFormulaConAvanzado(origenId: string): void {
  const { definicion, params, diseno } = formulaDePrueba()
  const conAvanzado = {
    ...diseno,
    secciones: diseno.secciones.map((s) =>
      s.id === 'del_nivel' ? { ...s, presentacion: 'avanzado' } : s,
    ),
  }
  const json = (valor: unknown) => `$e2e$${JSON.stringify(valor)}$e2e$::jsonb`
  sql(`
    do $f$
    declare v_def jsonb := ${json(definicion)}; v_par jsonb := ${json(params)}; v_dis jsonb := ${json(conAvanzado)};
    begin
      delete from public.formulas where origen_id = ${literal(origenId)}::uuid;
      insert into public.formulas (origen_id, version, estado, definicion, params, diseno, visibilidad, nota, publicado_en)
      values (${literal(origenId)}::uuid, 1, 'publicada', v_def, v_par, v_dis, public._preparar_publicacion(v_def, v_par, v_dis, false), 'E2E 4.13-4a', now());
    end $f$`)
}
