## 2026-11-12 — Paso 7.13-1: la lista de atajos `?` y las visitas (parte 1 de 3 del 7.13)

- **Hecho:**
  - `teclasDelAtajo()` y `esMac()` en `src/shared/lib/atajos.ts`, con su test (todo atajo del catálogo tiene teclas que mostrar).
  - `<AyudaDeAtajos>` y `<ListaDeAtajos>` en `src/shared/ui/atajos/`: `?` abre «Atajos de teclado», un `Dialog` sin URL, por `diferido()`; montado en
    `_shell/huecos/buscador.tsx` sin cambiar el botón de la barra.
  - `registrarVisita` (Server Action sobre `visita_registrar`), su repositorio, infra y composición, y `<RegistrarVisita>` por `buscador/pantallas/visita.ts`,
    montado en las tres fichas después de sus salidas «no disponible».
  - `e2e/buscador.spec.ts`: `?` lista los atajos y no se dispara escribiendo; abrir una ficha deja una sola visita y un lead ajeno no deja marca.
- **Commits:** `feat(shared)` ×2, `feat(buscador)`, `feat(app)`, `test(buscador)` y el de docs.
- **Verificación** (`.piloto/salidas/7.13-1/`): `atajos.test.ts` 9 ✓; `scripts/guardas` 36 archivos y 1.113 pruebas ✓; typecheck y eslint limpios;
  e2e dirigidos en escritorio y celular (`e2e-dirigidos.log`): 102 ✓, 13 saltadas, 0 caídas (buscador, barra-superior-celular, presupuesto-js,
  cotizar-tarea-de-oro-recorrido, leads-portal, leads-recorrido-cierre-2, leads-alta-casos, cotizar-guardada, leads-ficha). La visita no rompió ningún contador de acciones (R1).
- e2e completo: no (7.13-1, Nivel 2: lo prueba el CI del PR; dirigidos: buscador, barra-superior-celular, presupuesto-js, cotizar-tarea-de-oro-recorrido, leads-portal, leads-recorrido-cierre-2, leads-alta-casos, cotizar-guardada, leads-ficha)
- **Para el carril A:**
  - En `docs/PLAN.md`, fila 7.13: «**7.13-1 hecha** (`?` abre «Atajos de teclado»; `<RegistrarVisita>` en las tres fichas; `docs/pasos/7.13-1/`)». Siguen 7.13-2 (la lógica de la paleta) y 7.13-3 (`<Buscador>`).
  - Cerrado: «el atajo `?` sin lista» (`docs/PLAN.md:1562`) y «nadie escribe `visitados`» (`docs/PLAN.md:1551`).
