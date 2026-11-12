## 2026-11-12 · Paso 8.09-5: arreglar el CI en rojo del 8.09 (cuenta de teclas de la tarea de oro)

### Hecho

- Causa: con «Repuestos» encendido en el menú, la dueña (tiene `repuestos.ver`) pulsa una tecla más en escritorio: 57 y no 56. Un solo cambio, `e2e/cotizar-tarea-de-oro-recorrido.spec.ts` (valor y la historia de la cuenta en su comentario).
- Verificado: el spec entero, escritorio y celular, 6 de 6 (`.piloto/salidas/8.09-5/e2e.txt`).

e2e completo: no (8.09-5, arreglo de una cuenta; el CI del PR lo vuelve a correr)
