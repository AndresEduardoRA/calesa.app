## 2026-11-12 — FLUJO-7: la tarea de oro 2 se mide por KLM y no por la cuenta exacta de teclas

Medido el 2026-11-12, a 23 h de lanzar (39 de 69 pasos; los carriles en sesión el 81–93 % del reloj): de los CI rojos de un PR que no eran
del entorno, el que más se repitió no era de ningún paso.

- **`e2e/cotizar-tarea-de-oro-recorrido.spec.ts` ya no exige la cuenta exacta de teclas de control** (`toBe(60)`, `toBe(56)`): la anota y
  exige lo que pide `docs/UX.md`, KLM ≤ 90 s (hoy ≈ 57 s la asesora y 41 s la dueña; cada parada más son 0,28 s). Tras abrir la hoja el
  foco recorre el marco, así que cada entrada nueva de la navegación sumaba una parada y el spec caía en el PR de **otro** paso, que no
  la había tocado: dos PR en verde, cada uno con su «+1», quedaban en rojo al entrar el segundo. Cayó en 6.01, 7.07, 7.02, 7.09 y 8.09
  (este último, tres CI rojos seguidos y 7 h abierto con el paso terminado): de 1 a 3 h y una sesión de arreglo cada vez, y a las fases 8
  y 9 les faltan más entradas. Se descartó descontar las paradas del marco para conservar la cuenta: pedía medirlas en cada pantalla del
  recorrido y volver a contarlas con el completo local. `cotizar-tarea-de-oro-enlace` conserva su cuenta exacta: arranca en la hoja con
  «Saltar al contenido» y no cruza la navegación.
- **`e2e/configuracion-flujos-requisitos.spec.ts` espera el orden de la lista tras «Subir»** (`expect.poll`) en vez de leerla una vez: la
  base ya había cambiado y la lista se volvía a dibujar un instante después (el 9.04-1, rojo en los dos intentos del CI).
- **Medido y no cambiado:** el reintento a ciegas de un CI rojo. Desde el arreglo de chromium, de 31 reintentos 11 terminaron en verde
  (el FLUJO-6 había contado 2 de 14): vale los ≈ 17 min que cuesta. Los choques «dudosos» de un registro (una línea editada de un lado
  y un agregado encima del otro, `scripts/guardas/areas-c/drawers-con-salida.ts`) siguen yendo al carril: unirlos a ciegas deja un `.ts`
  que no compila.
