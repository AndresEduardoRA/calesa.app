// Los registros por carril de las guardas (`confirmar-con-url`, `drawers-con-salida`, `paginas-en-la-base`). Cada guarda es del A, pero un
// carril registra lo suyo sin pedirle nada: crea su archivo en `scripts/guardas/areas-<carril>/<guarda>.ts` (la carpeta es de su
// `dueno_de` en `docs/plan.yaml`) y exporta `REGISTRO` (un objeto, o una lista en `paginas-en-la-base`). La guarda los descubre con
// `import.meta.glob('./areas-*/<guarda>.ts')` y los suma tras los suyos: un archivo nuevo no se toca en ningún archivo del A.
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
