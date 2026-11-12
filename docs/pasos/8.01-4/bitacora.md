## 2026-11-12 · Paso 8.01-4: la pestaña «Ajustes» de Configuración › Sitio web (parte 4 de 4; 8.01 completo)

- **Hecho:**
  - **Lectura y escritura** (área `sitio`): `entities/sitio/ajustes.ts` (`AjustesDelSitio`, `cambiosDeAjustes` —sólo las claves del sitio, nunca `legales` ni
    la cola—, `origenesAGuardar` —un origen visible inactivo se conserva—, `avisoDeOrigenApagado`), `infra/sitio/{ajustes,guardar-ajustes,vehiculos-que-dejan-de-verse}.ts`
    (la RPC `web_ajustes_guardar` con versión; el error 22023 va a su campo por el `hint`; el conteo, de `web.vehiculos` con `limit 51`).
  - **Action** `guardarAjustesDelSitio`: exige `web.ajustes.gestionar` antes de llamar a la base y revalida `/configuracion/web`.
  - **Formulario** en cinco bloques (Identidad, Contacto con la dirección pública, Vitrina con los orígenes y la moneda secundaria, Redes y Buscadores
    plegados), borrador de los textos, `<AvisoDeConflicto>` dentro del formulario, aviso sin red; viaja diferido (D1).
  - **Pestaña**: `PESTANA_DE_AJUSTES` lleno, `seccion-ajustes.tsx` (compone los orígenes de `getOrigenes()` y los conteos) registrada en `seccion-abierta.tsx`.
    «Sitio web» aparece en el hub para quien tiene `web.ajustes.gestionar`, sin barra de pestañas (una sola llena).
  - **e2e** `e2e/configuracion-web-ajustes.spec.ts` (escritorio): guardar el lema y la dirección pública entrando por el hub; destildar un origen, ver
    «deja de verse en la web 1 vehículo publicado de …», guardar y que la vitrina pública ya no lo traiga. `e2e/soporte/base.ts` suelta
    `ajustes_web.actualizado_por` de las cuentas de prueba antes de borrarlas (FK sin `on delete`, como `comprobantes_ajustes`).
  - Sin `supabase/`, sin permisos nuevos (tipo pantalla, sin auditor). Decisiones en `decisiones.md` (D1–D10).
- **Commits:** `ac1de1ac` (lectura y escritura), `3f1ae19e` (action), `fc559964` (formulario), `5ca43aa9` (pestaña), `2e18f60d` (limpieza de e2e),
  `7b41afa3` (e2e) y el de docs.
- **Cierra:** «`ajustes_web.direccion_publica` no tiene pantalla» (`docs/PLAN.md:1780`, arrastrado de la Fase 3): se carga en Configuración › Sitio web › Ajustes.
- **Para el carril a:** marcar la fila 8.01 (completa con esta parte); sacar el arrastrado de `docs/PLAN.md:1780`; sumar a `docs/UX.md` la fila de la
  pestaña con los estados de D10 de `decisiones.md`.
- **Verificación** (`.piloto/salidas/8.01-4/`): `entities/sitio/ajustes.test.ts` 8 ✓ (`ajustes-entities.txt`); `guardar-ajustes.test.ts` 4 ✓
  (`accion.txt`); `src/app/(app)/configuracion` + `src/modules/web` 17 archivos, 181 ✓ (`configuracion-y-web.txt`); `scripts/guardas` 1.109 ✓
  (`guardas.txt`); `typecheck` y `eslint` sin errores; `mapa.sh --check` limpio; e2e dirigidos en escritorio: 40 ✓ y 3 rojos por la limpieza
  (`e2e.txt`; arreglado en `2e18f60d`), luego los tres specs afectados 17 ✓ (`e2e-3.txt`).
- e2e completo: no (8.01-4, Nivel 1; el paso es Nivel 2 y lo prueba el CI del PR; dirigidos: configuracion-web-ajustes, configuracion-200, configuracion-cotizacion-ajustes, configuracion-flujos, configuracion-logistica, configuracion-repuestos-catalogos, configuracion-cotizacion-niveles-permisos, vehiculos-vitrina, leads-portal)
