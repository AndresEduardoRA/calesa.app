## 5.12-2 · «Revisar»: la franja sobre el flujo (2026-11-12)

Parte 2 de 2: cierra el 5.12 (`parcial: false`). La franja llena el hueco `franjaDeRevisar` de la pestaña «Fases»: cerrada, el resumen («Todo en orden»,
«1 error y 3 avisos»); abierta, los avisos de `revisar_flujo()` por nivel con icono, palabra y el texto de la base, y «Abrir la fase» hacia el inspector.
Nace cerrada, se relee tras cada guardado (por la versión del flujo) sin volver al esqueleto y nunca impide guardar. `entities/revisar/avisos.ts` (lectura
con Zod, orden error › aviso › info, resumen con tope de 200) con test; `infra/revisar/leer-avisos.ts` (`limit 201`); la action `leerAvisosDeRevisar` mira
`flujos.configurar` o `repuestos.configurar` antes de la RPC. Sin cambios en `supabase/`. Ficha de `flujos`, `docs/UX.md` › «Flujos: revisar (estados
propios)» y la entrada «Revisar» del glosario.

Verificación (Nivel 1, sólo escritorio: Configuración): `avisos.test.ts` 11 de 11; guardas y mapa, 35 archivos y 1.079 pruebas en verde; e2e
`configuracion-flujos-revisar.spec.ts` (nuevo) y los vecinos `configuracion-flujos`, `-transiciones` y `-requisitos`, 11 en verde; `nivel.mjs` con los
archivos reales → nivel 1 sin disparadores; `mapa.sh --check` y `saltadas.mjs b0023bf6..HEAD` (`n: 0`) en verde.

- e2e completo: no (5.12-2, pantalla Nivel 1, sólo escritorio: lo corre el CI del PR)
