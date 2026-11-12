## 2026-11-12 · Paso 8.01-3: `/configuracion/web` con sus pestañas y los huecos nulos (parte 3 de 4 del 8.01)

- **Hecho:**
  - **Huecos.** Uno por pestaña en `src/modules/web/pantallas/sitio-{ajustes,legales,guias,faqs,testimonios}.ts` (`PESTANA_DE_<X>`, tipo
    `HuecoDePestana` de `entities/nucleo/hueco-de-pestana.ts`), nulos hasta su paso. `sitio-legales` pasa al área `contenido` en la guarda.
  - **Rutas.** `RUTAS.configuracionDeWeb` y `RUTAS.configuracionDeColaWeb` (esta sin pantalla: la trae el 8.04).
  - **Pantalla.** `src/app/(app)/configuracion/web/`: `pestanas.ts` (`ajustes` y `legales` con `web.ajustes.gestionar`; `guias`, `faqs` y `testimonios` con
    `web.contenido.gestionar`; una pestaña nula no se dibuja), `page.tsx` («No tienes permiso» sin ninguna clave; el vacío de Logística si tiene alguna
    pero nada lleno), `seccion-abierta.tsx` (el registro de cuerpos, vacío), `pestanas-de-web.tsx` (la barra, con dos o más) y `loading.tsx`.
  - **Hub.** `seccion.ts` con `SECCIONES_DE_WEB`, vacía mientras ninguna pestaña esté llena: hoy el hub no cambia. Decisiones en `decisiones.md` (D1–D7).
- **Commits:** `1e98549c` (huecos), `0df396c7` (rutas), `cacdd52c` (pantalla), `517a1acb` (hub) y el de docs.
- **Falta (8.01-4):** la pestaña «Ajustes» y su e2e: llenar `PESTANA_DE_AJUSTES` con `HuecoDePestana<Props>` (sin quitar el `| null`), registrar su cuerpo
  en `seccion-abierta.tsx`; entonces «Sitio web» aparece en el hub para quien tiene `web.ajustes.gestionar` y `secciones.test.ts` ya la espera. Cierra
  «`ajustes_web.direccion_publica` no tiene pantalla».
- **Verificación** (`.piloto/salidas/8.01-3/`): `pestanas.test.ts` 6 ✓ (`pestanas.txt`); `vitest related` 118 archivos, 869 ✓ (`related.txt`); guarda de
  web 13 ✓ (`guarda-web.txt`); `scripts/guardas` 1.108 ✓ (`guardas.txt`); `typecheck` y `lint` sin errores; `mapa.sh --check` limpio; e2e dirigidos 32 ✓ en
  escritorio (`e2e.txt`).
- e2e completo: no (8.01-3, Nivel 2 por src/shared: lo prueba el CI del PR; dirigidos: configuracion-200, configuracion-repuestos-catalogos, configuracion-logistica)
