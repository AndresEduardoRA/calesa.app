// Una fórmula sintética de unos `n` nodos con todas las formas que crecen: cadenas de dos referencias, un `suma` de n/2, n/4
// constantes en params, n/10 grupos y una variante de 50 claves con `solo_en` largos. La usan la prueba de escala del validador
// (`validar-escala.test.ts`) y, volcada a `supabase/tests/corpus-de-formula.json`, la medición de `validar_formula()` en la base.
export function formulaSintetica(n: number) {
  const opciones = Array.from({ length: 50 }, (_, i) => ({
    clave: `o${i}`,
    etiqueta: `O${i}`,
    titulo: `Opción ${i}`,
  }))
  const soloEn = opciones.slice(0, 25).map((o) => o.clave)
  const grupos = Array.from({ length: n / 10 }, (_, i) => ({
    id: `g${i}`,
    etiqueta: `G${i}`,
    tono: 't',
    bucket: `b${i % 2}`,
  }))
  const nodos: Record<string, unknown>[] = [
    { id: 'tc_a', tipo: 'tipo_cambio', clave: 'oficial', etiqueta: 'A', formato: 'raw' },
    { id: 'tc_b', tipo: 'tipo_cambio', clave: 'paralelo', etiqueta: 'B', formato: 'raw' },
    { id: 'variante', tipo: 'opcion', etiqueta: 'V', opciones },
    { id: 'pct', tipo: 'constante', etiqueta: 'P', formato: 'pct' },
  ]
  const params: Record<string, number> = { pct: 0.1 }
  const ids: string[] = []
  // Los miembros se reparten en orden entre los grupos: ninguno queda vacío.
  for (let k = 0, miembro = 0; nodos.length < n - 1; k += 1) {
    const id = `x${k}`
    const grupo = `g${miembro % grupos.length}`
    if (k % 4 !== 3) miembro += 1
    const [a, b] = [ids[k - 1] ?? 'pct', ids[k - 2] ?? 'pct']
    if (k % 4 === 0) {
      nodos.push({ id, tipo: 'constante', etiqueta: id, grupo })
      params[id] = k
    } else if (k % 4 === 1) nodos.push({ id, tipo: 'input', etiqueta: id, grupo })
    else if (k % 4 === 2)
      nodos.push({
        id,
        tipo: 'calculo',
        op: 'porcentaje_de',
        de: [a, b],
        pct: 'pct',
        etiqueta: id,
        grupo,
      })
    else
      nodos.push({
        id,
        tipo: 'calculo',
        op: 'multiplicar',
        de: [a, b],
        etiqueta: id,
        solo_en: soloEn,
      })
    ids.push(id)
  }
  nodos.push({
    id: 'total',
    tipo: 'calculo',
    op: 'suma',
    de: ids.filter((_, i) => i % 2 === 0),
    etiqueta: 'T',
    salida: 'total',
  })
  return {
    definicion: { nodos, buckets: { b0: 'tc_a', b1: 'tc_b' }, total_en: 'tc_b', grupos },
    params,
  }
}

export type FormulaSintetica = ReturnType<typeof formulaSintetica>
