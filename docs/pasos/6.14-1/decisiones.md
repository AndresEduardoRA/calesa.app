# Paso 6.14-1 — El cierre de la Fase 6 (parte 1 de 2): la tarea de oro 3 y el recorrido

Fecha: 2026-11-12 (`TZ=America/La_Paz date +%F`). Sin compuertas ni preguntas abiertas. El plan: `.piloto/planes/6.14-1.md`.

- **D1** El 6.14 se parte en 6.14-1 (la tarea de oro 3, el recorrido y el pulido) y 6.14-2 (el Nivel 3 y los docs de cierre): el completo corre una vez,
  sobre el SHA final, después de cualquier arreglo que pida el recorrido; y los 32 docs de paso de la Fase 6 no caben con margen junto a las hojas de contacto.
- **D2** El spec corre en `escritorio` y `movil`: la tarea de oro 3 es de quien está en el puerto con el celular, y no es Configuración.
- **D3** La medida de logística es con puntero: KLM con 1,3 s por gesto (apuntar 1,1 + clic 0,2), 0,28 por tecla y 1,35 por decisión; en el celular un toque
  cuesta lo que un clic. `Teclado.klm` de la tarea de oro 2 sólo cuenta teclas: el contador `Gestos` vive en el spec.
- **D4** La nota de R1 es corta («Zarpó.»): la fase la exige y el tramo mide mover, no redactar.
- **D5** El contenedor de 8 lleva una unidad sin el BL: «ver antes de confirmar qué falta en cada uno» es la mitad de la meta; el reloj para en el resultado
  («Se movieron 7 de 8.» y la que no). Aprobar y reintentar ya lo prueba `logistica-lote.spec.ts`.
- **D6** La dueña de prueba (rol `dueno`) tiene `flujos.mover`, `logistica.ver`, `logistica.gastos.ver` y `logistica.margen.ver` para todos los orígenes:
  comprobado por SQL antes de escribir R3 y R5; no hizo falta darle un rol de prueba.
- **D7** El conflicto lo provoca la dueña (la segunda cuenta de la fila); su nombre es el que se lee.
- **D8** R6 sólo asserta que cada pantalla carga (la sub-navegación con su pestaña marcada, o `main` en Inicio): es para mirar; lo que se juzga va al pulido.
- **D9** El contenedor se busca como fila **o** tarjeta de lista (`row` o `listitem` con el botón «Abrir el contenedor …»): en el celular
  `/logistica/embarques` dibuja tarjetas. Es del spec, no un defecto.
- **D10** (Para el 6.14-2) 6-4 no lo tomó ningún paso y arreglarlo es código de producto: queda en «los decide la persona», con las dos opciones de su fila.
- **D11** (Para el 6.14-2) El 6-3 de «borrar una nota propia por RPC» (6.04, D22) pasa a **6-7**: el número 6-3 ya era `pago_anular`, cerrado en el 6.10-2.
