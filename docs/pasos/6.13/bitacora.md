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
