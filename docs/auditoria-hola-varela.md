# Auditoría de Hola Varela

Fecha: 23 de mayo de 2026

## Resumen ejecutivo

Hola Varela ya está operando en Cloudflare Workers con dominio propio, base en Supabase y flujo público activo para eventos, comercios, cursos e instituciones. La plataforma está en una etapa buena para crecer, pero debe sostener tres frentes: estabilidad post migración, SEO local y conversión comunitaria.

El foco inmediato debe ser monitorear errores reales, cerrar detalles técnicos de calidad y completar analítica externa. La base de performance y SEO ya fue mejorada con cache, metadata, sitemap, skeletons, ajustes mobile, rutas de Cloudflare y limpieza programada de eventos pasados.

## Crítica

### Estabilidad post migración a Cloudflare

Estado: parcialmente resuelto.

Impacto técnico: el sitio ya responde desde Cloudflare en `holavarela.uy` y `www.holavarela.uy`, pero conviene observar logs y métricas durante 24 a 48 horas para detectar errores 5xx, rutas lentas o diferencias con Vercel.

Impacto de negocio: si el sitio falla en mobile o en horarios de tráfico, se pierden publicaciones, visitas a comercios y confianza en la plataforma.

Acciones recomendadas:

- Revisar Cloudflare Workers Metrics durante los primeros días.
- Confirmar que no haya errores recurrentes en `/eventos`, `/comercios`, perfiles y panel admin.
- Mantener Vercel disponible solo como respaldo temporal y apagarlo cuando Cloudflare este estable.

### Variables sensibles y accesos

Estado: resuelto en lo principal.

Impacto técnico: las variables críticas están cargadas en Cloudflare. La `SUPABASE_SERVICE_ROLE_KEY` debe seguir tratándose como secreto y nunca exponerse al cliente.

Impacto de negocio: una fuga de credenciales puede comprometer datos, publicaciones, usuarios y reputación.

Acciones recomendadas:

- Mantener `SUPABASE_SERVICE_ROLE_KEY` solo como secret.
- Revisar que ninguna variable sensible esté en código, capturas o texto público.
- Rotar claves si alguna vez se compartieron por error.

## Alta

### Performance y Core Web Vitals

Estado: parcialmente resuelto.

Impacto técnico: se agregaron cache/revalidación, skeletons y mejoras de carga percibida. Queda medir LCP, INP y CLS con tráfico real en Cloudflare y Search Console.

Impacto de negocio: una web más rápida mejora retención, visitas a comercios y participación en eventos, especialmente en celulares con datos móviles.

Acciones realizadas:

- Cache/revalidación en listados públicos.
- Skeletons en listados.
- Ajustes mobile en perfiles.
- Optimización visual del hero principal.

Acciones pendientes:

- Medir Core Web Vitals reales.
-- Revisar imágenes pesadas cargadas por usuarios.
- Seguir reduciendo JS cliente donde sea posible.
- Evitar requests innecesarias en componentes interactivos.

### SEO local

Estado: parcialmente resuelto.

Impacto técnico: ya hay sitemap, robots, metadata y mejoras de páginas públicas. Queda fortalecer datos estructurados y Search Console.

Impacto de negocio: el SEO local es clave para que vecinos encuentren eventos, comercios y cursos desde Google sin depender solo de redes sociales.

Acciones realizadas:

- `sitemap.xml`.
- `robots.txt`.
-- Metadata base y dinámica en páginas importantes.
-- URLs públicas para eventos, comercios, cursos e instituciones.

Acciones pendientes:

- Conectar Google Search Console.
- Validar indexacion de `holavarela.uy`.
-- Revisar Open Graph de todos los perfiles.
- Agregar o completar schema.org para eventos, comercios y cursos.

### Experiencia mobile

Estado: parcialmente resuelto.

Impacto técnico: se mejoraron perfiles premium y el hero mobile. Queda testear flujos completos en celulares reales.

Impacto de negocio: la mayoría del uso comunitario probablemente venga desde WhatsApp, Instagram y celulares. Si mobile falla, baja la conversión.

Acciones realizadas:

-- Priorización de nombre, fotos, contacto y ubicación en perfiles.
- Ajuste de hero sin guiones y con nombre más claro.
- Burbuja discreta para sorteo en eventos.

Acciones pendientes:

- Probar crear/editar eventos desde mobile.
- Revisar cards con textos largos.
- Validar que modales, botones y formularios no se corten en pantallas chicas.

### Analitica

Estado: pendiente.

Impacto técnico: Cloudflare muestra datos básicos, pero falta analítica de producto para entender clics, conversiones y orígenes.

Impacto de negocio: sin medición fina es difícil saber qué comercios reciben visitas, qué CTA convierte y qué contenido mueve participación.

Acciones pendientes:

- Implementar Google Analytics 4.
- Conectar Google Search Console.
- Agregar Microsoft Clarity para mapas de calor.
-- Medir clics en WhatsApp, compartir, ver más, corazones y publicaciones.
- Crear eventos personalizados para conversiones.

## Media

### Conversión y participación comunitaria

Estado: en progreso.

Impacto técnico: ya se agregaron mejoras de CTA y sorteo/corazones. Falta medir si realmente aumentan interacciones.

Impacto de negocio: mejores CTAs pueden aumentar registros, publicaciones, visitas a comercios y participación en eventos.

Acciones realizadas:

- CTA para sumar aviso.
- Burbuja de sorteo discreta.
- Corazones conectados al flujo de participación.
- Secciones y cards públicas más claras.

Acciones pendientes:

- Crear secciones de comercios destacados.
-- Crear eventos populares o recomendados con reglas claras.
-- Mostrar recomendaciones por categoría o cercanía temporal.
-- Medir conversión de cada CTA.

### Calidad de código

Estado: parcialmente resuelto.

Impacto técnico: el build compila correctamente y el lint no tiene errores, pero queda una advertencia vieja en `app/admin/sorteos/page.tsx`.

Impacto de negocio: menos deuda técnica reduce fallos al publicar nuevas funciones y mejora velocidad de iteración.

Acciones pendientes:

- Corregir warning de dependencia en `useEffect` en `app/admin/sorteos/page.tsx`.
- Revisar componentes grandes para separar responsabilidades.
- Agregar pruebas simples para rutas criticas si el proyecto sigue creciendo.

### Manejo de errores

Estado: pendiente parcial.

Impacto técnico: se detectaron previamente errores de timeout y diferencias entre Vercel/Cloudflare. Conviene mostrar mensajes claros y registrar fallos.

Impacto de negocio: mensajes claros evitan abandono cuando un usuario intenta publicar, editar o cargar eventos.

Acciones pendientes:

- Revisar errores 404.
- Revisar errores 4xx/5xx en Cloudflare.
- Mejorar mensajes de error en admin y usuario.
- Agregar estados de reintento en cargas importantes.

## Baja

### Accesibilidad

Estado: pendiente.

Impacto técnico: hay botones y controles interactivos; conviene revisar foco, labels y contraste.

Impacto de negocio: mejora uso en celulares, personas mayores y usuarios con dificultades visuales.

Acciones pendientes:

-- Revisar navegación por teclado.
-- Validar contraste de textos secundarios.
-- Asegurar `aria-label` en botones icónicos.
-- Revisar tamaños de toque en mobile.

### Contenido y ortografía

Estado: parcialmente resuelto.

Impacto técnico: se corrigieron tildes principales como "Institución" y textos del hero. Aún conviene hacer una pasada editorial completa.

Impacto de negocio: textos cuidados dan más confianza a comercios, instituciones y usuarios.

Acciones pendientes:

- Auditar acentos en todo el sitio público.
-- Unificar "Promocion" a "Promoción" donde corresponda.
- Revisar textos de admin, usuarios y mails si existen.

### Documentación operativa

Estado: en progreso.

Impacto técnico: la migración y decisiones principales deberían quedar documentadas para futuras actualizaciones.

Impacto de negocio: facilita mantener la plataforma sin depender de memoria o conversaciones previas.

Acciones pendientes:

- Documentar deploy a Cloudflare.
- Documentar variables requeridas.
-- Documentar cómo activar/desactivar Vercel.
- Documentar cron de limpieza de eventos.

## Cambios ya implementados

-- Migración funcional a Cloudflare Workers.
- Rutas para `holavarela.uy` y `www.holavarela.uy`.
- Variables de Supabase y Mercado Pago en Cloudflare.
- Cron mensual para limpieza de eventos pasados.
-- Correcciones de tildes principales.
- Mejoras iniciales de performance y SEO.
- Skeletons y mejoras de carga percibida.
- Mejoras mobile en perfiles premium.
- Ajustes visuales del hero principal.
- Burbuja discreta para sorteo en eventos.
-- Flujo de corazones conectado a participación del sorteo.

## Próximos pasos sugeridos

1. Monitorear Cloudflare por 24 a 48 horas.
2. Corregir warning de lint en `app/admin/sorteos/page.tsx`.
3. Activar Google Search Console.
4. Implementar GA4 y Microsoft Clarity.
5. Revisar errores 4xx/5xx reales.
6. Probar flujos mobile de publicar, editar y contactar.
7. Apagar Vercel cuando Cloudflare este estable.
