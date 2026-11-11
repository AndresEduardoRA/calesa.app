## 2026-11-11 — Paso 6.01-5: arreglar los tres e2e que la entrada de Logística rompió (ci-fix del 6.01)

- **Causa:** el 6.01-4 encendió la entrada de Logística en la navegación y, con el CI de chromium ya arreglado, el e2e completo mostró tres caídas, todas en escritorio y reproducidas en local:
  `presupuesto-js.spec.ts` (el documento de `/perfil` pesa 84.810 B = 82,8 KB, tope 82), `configuracion-logistica.spec.ts` (el hub «no lista» Logística, pero buscaba el enlace en toda la página y ahora
  lo tiene la navegación) y `cotizar-tarea-de-oro-recorrido.spec.ts` (una parada más en el camino: la asesora 57 teclas y la dueña 53; en el celular no cambia, 53 y 49).
- **Hecho:** `PRESUPUESTO_DEL_DOCUMENTO_DE_PERFIL_EN_KB` 82 → 87 (lo medido más un 5 %, con la línea en `docs/RENDIMIENTO.md`); el hub se busca dentro de `main`; `CONTROLES_DE_LA_ASESORA` y `CONTROLES_DE_LA_DUENA` de escritorio +1.
- **Verificación** (`.piloto/salidas/6.01/`): `E2E_SIN_FUNCIONES=1 pnpm test:e2e` de los tres specs, en verde en los dos proyectos (`e2e-ci-fix-2.txt`, `e2e-tarea-de-oro-2.txt`).
- e2e completo: no (6.01-5, sólo specs: lo corre el CI del PR)
