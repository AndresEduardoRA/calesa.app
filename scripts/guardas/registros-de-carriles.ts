// Las partes del registro de las guardas (`confirmar-con-url`, `drawers-con-salida`, `paginas-en-la-base`). Cada parte vive en
// `scripts/guardas/areas-*/<guarda>.ts` y exporta `REGISTRO` (un objeto, o una lista en `paginas-en-la-base`). La guarda las descubre con
// `import.meta.glob('./areas-*/<guarda>.ts')` y las suma tras las suyas: sumar una parte no edita la guarda.
type Modulo = { REGISTRO?: unknown }

/** Suma los `REGISTRO` que son objetos (clave → valor), en el orden de las rutas. Uno que no es objeto es un error. */
export function sumarObjetos<T>(modulos: Record<string, Modulo>): Record<string, T> {
  const suma: Record<string, T> = {}
  for (const ruta of Object.keys(modulos).sort()) {
    const registro = modulos[ruta]?.REGISTRO
    if (registro === undefined) continue
    if (typeof registro !== 'object' || registro === null || Array.isArray(registro)) {
      throw new Error(`${ruta}: REGISTRO tiene que ser un objeto`)
    }
    Object.assign(suma, registro)
  }
  return suma
}

/** Suma los `REGISTRO` que son listas, en el orden de las rutas. Uno que no es lista es un error. */
export function sumarListas<T>(modulos: Record<string, Modulo>): T[] {
  const suma: T[] = []
  for (const ruta of Object.keys(modulos).sort()) {
    const registro = modulos[ruta]?.REGISTRO
    if (registro === undefined) continue
    if (!Array.isArray(registro)) throw new Error(`${ruta}: REGISTRO tiene que ser una lista`)
    suma.push(...(registro as T[]))
  }
  return suma
}
