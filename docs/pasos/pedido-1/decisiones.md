## 2026-11-07 — Pedido del carril persona (estabilizar-1)

- **Lo no obvio:** un `toPass` que repite un clic para esperar la hidratación tiene que parar cuando el clic anterior ya hizo efecto, y el efecto que se ve
  antes que el modal es la URL (`?panel=`). Repetirlo no es inocuo: suma entradas iguales al historial y rompe «atrás». Un reintento sin esa guarda es una
  carrera propia de la prueba, y sube con la lentitud de la máquina.
- **Cómo se reproduce lo que no cae solo:** frenar la CPU del navegador (CDP `Emulation.setCPUThrottlingRate`, 8 a 16) ensancha las ventanas de hidratación
  mejor que quemar CPU de la máquina (8 procesos dieron 6 de 6 en 4-99; 20 no tocaron 4-80, 4-92, 4-93 ni 4-97). No se dejó en el repo: es un parche de tres líneas
  en `e2e/soporte/prueba.ts` (`process.env.E2E_CPU`).
- **No se subió ningún tiempo:** los topes de 1 s del `toPass` y de 5 s de los `expect` siguen; los clics suman un tope de 3 s para no esperar los 30 s de la prueba.
