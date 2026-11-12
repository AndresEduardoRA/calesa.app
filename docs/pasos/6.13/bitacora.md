## 6.13-1 · el campo «principal» de un origen: la base y la capa de datos (2026-11-11)

Parte 1 de 2 (`parcial: true`). Entró: `origenes_campos.principal` con el índice único parcial `origenes_campos_principal_unico` y dos
`check` (activo, no `moneda`); `origen_campo_crear` (drop + create con `p_principal`, devuelve `desmarcado`) y `origen_campo_guardar`
(misma firma; toma el origen `for no key update` antes que el campo) marcan uno y desmarcan el anterior; desactivar el principal lo
desmarca; un `23505` del índice sale `PT409`. Pruebas: `supabase/tests/areas/origenes/principal.sql` (8 bloques) y las carreras K1 y K2
(`supabase/tests/areas/origenes/carreras.mjs`). En `origenes`: `CampoDeLayout.principal`, `principal` en `CambiosDeCampo` y en los
esquemas, `leerCampoPrincipal()` por `composicion.ts` e `index.ts`. GLOSARIO: «Campo principal». Abierto **6-1**: en curso, base hecha.

Sigue **6.13-2** (servida en `.piloto/planes/6.13.md` › «6.13-2 servida»): el interruptor «Principal» del panel del campo con su ayuda,
el aviso y la insignia; `identidadDeVehiculo` e `identidadEnUnaLinea` con su Vitest; la fila, la tarjeta y el resumen de `/vehiculos`;
el panel de logística por la composición del núcleo; `e2e/origenes-campo-principal.spec.ts`; fichas de `vehiculos` y `logistica`.

- e2e completo: no (6.13-1, Nivel 2: lo corre el CI del PR)

## 6.13-2 · el campo «principal»: el interruptor, la identidad y las pantallas (2026-11-11)

Parte 2 de 2: termina el paso. Entró: la bandera «Principal» en el panel del campo de un origen, con su ayuda, una línea de aviso (monto,
desactivado o «<otro> deja de ser el principal») y la insignia «Principal» en la fila del layout; `identidadDeVehiculo`,
`identidadEnUnaLinea` y `campoPrincipalDe` en `vehiculos/entities/identidad.ts` con su Vitest; la fila, la tarjeta y el resumen de
`/vehiculos` se nombran por el valor del principal (el título va debajo); el panel de la unidad de logística dice «<principal> · <título>»
(`features/nucleo/unidad-con-identidad.ts`, con el formato de la empresa); `e2e/origenes-campo-principal.spec.ts` (escritorio).
Sin cambios de base. Abierto **6-1**: cerrado.

- e2e completo: no (6.13-2, Nivel 2: lo corre el CI del PR)

## 6.13 · retoma por el CI en rojo (2026-11-11)

El bloque 3 del e2e caía en `leads-portal-acceso` › tarea de oro 4 (33 teclas, tope 32): el mismo rojo que arregló el 6.10 en el PR #105,
todavía sin integrar. Traído con `cherry-pick -x` (el spec espera la sección «Portal» y el foco en la pestaña antes de tabular); en local,
24/24 con `--repeat-each=3` y 16 teclas en escritorio y celular. Sin cambios de producto ni de base; al integrarse los dos PR el cambio es
el mismo.

- e2e completo: no (6.13, retoma del CI: sólo `leads-portal-acceso`; lo prueba el CI del PR)
