## 2026-11-12 — 7.13-1

- **La visita va por Server Action**, no por un RPC del navegador: es una escritura (D16 de 7.12-2). Cuesta un POST más al abrir una ficha; ningún spec que cuenta acciones lo notó.
- **La lista de atajos es un `Dialog` sin URL**, no un `<Modal>`: es una ayuda de sólo lectura, sin nada escrito que perder.
- **La lista sale del catálogo `ATAJOS`**: un atajo nuevo aparece solo y `teclasDelAtajo` falla en test si no se puede mostrar.
- **`<RegistrarVisita>` va después de las salidas «no disponible»** de cada ficha: lo que la RLS esconde no deja marca.
