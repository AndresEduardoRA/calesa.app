// Arma una fórmula entera (la que valida `validarFormula()` y evalúa `evaluar()`) con el contexto de un compilador y lo que
// compiló: los nodos del contexto, los compilados, un tipo de cambio, y los grupos que tienen miembros. Sólo para las pruebas.
import type { ContextoDeCompilacion } from './compilador-nombres'
import type { Nodo } from './nodos'

export type FormulaCruda = { definicion: unknown; params: Record<string, number> }

export function formulaDe(
  ctx: ContextoDeCompilacion,
  compilado: { nodos: readonly Nodo[]; params: Record<string, number> },
): FormulaCruda {
  const tc = ctx.nodos.find((n) => n.tipo === 'tipo_cambio')?.id ?? 'tc'
  const grupos = [...new Set(ctx.nodos.flatMap((n) => (n.grupo === undefined ? [] : [n.grupo])))]
  const nodos = [...ctx.nodos, ...compilado.nodos].map((n) =>
    n.id === ctx.destino.id && grupos.length === 0 ? { ...n, bucket: 'b' } : n,
  )
  const definicion = {
    nodos,
    buckets: { b: tc },
    ...(grupos.length === 0
      ? {}
      : {
          total_en: tc,
          grupos: grupos.map((id) => ({ id, etiqueta: id, tono: 'compra', bucket: 'b' })),
        }),
  }
  return { definicion, params: { ...ctx.params, ...compilado.params } }
}
