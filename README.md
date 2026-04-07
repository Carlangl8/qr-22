<h1 align="center">
  <br>
  <img src="public/assets/quien_admin.jpg" alt="Euphoria Party 22" width="200" style="border-radius: 20px;">
  <br>
  🎉 Fiesta 22 - Sistema Integral de Invitados y Juegos
  <br>
</h1>

<h4 align="center">Una aplicación integral inspirada en la estética Neón/Euphoria para gestionar invitaciones por QR, control de acceso y juegos interactivos en tiempo real.</h4>

<p align="center">
  <a href="#características">Características</a> •
  <a href="#tecnologías-utilizadas">Tecnologías</a> •
  <a href="#instalación">Instalación</a> •
  <a href="#base-de-datos">Base de Datos</a>
</p>

---

## 🌟 Características

Este proyecto proporciona todas las herramientas digitales necesarias para la logística y el entretenimiento de un evento o fiesta privada:

### 1. 🎟️ Generador de Invitaciones con QR
- **Experiencia de Usuario**: Al entrar, los usuarios introducen su nombre y automáticamente se genera una tarjeta de invitación digital de diseño espectacular.
- **Seguridad y Validación**: La tarjeta incluye un código numérico y un QR único asociado en base a su información ingresada.
- **Exportación ágil**: Botón de "Descarga Directa", que permite exportar la invitación como una imagen guardable para presentar en la entrada.

### 2. 🛡️ Panel Multi-Administrador
- Acceso restringido por credenciales para todo el personal autorizado.
- Visualización de la **Lista completa de invitados** y su estado (Ya llegaron / Aun no).
- Funcionalidad de **Escáner** nativo en el dispositivo móvil del organizador para que, leyendo el QR de sus amigos con la cámara del celular, les dé acceso a la fiesta al instante e internamente queden reportados como "Llegados".

### 3. 🎮 Juego Interactivo en Tiempo Real (Tipo Kahoot)
- **Creador Personalizado**: El organizador puede escribir al vuelo 10 preguntas (Ej: *¿Quién se va a perder antes?* o *¿El mejor outfit?*).
- **El Lobby**: Generación de una sala de juego con un código cerrado autogenerado de 4 dígitos. Una gran pantalla virtual muestra a los competidores uniéndose dinámicamente en tiempo real con burbujas de neón.
- **Voto Universal de Invitados**: En vez de preguntas genéricas, las *opciones de respuesta son literalmente la lista de invitados completa*. Cada jugador tiene todo el mundo para votar mediante un sistema de grillas super accesibles.
- **Podio 🏆**: Final lúdico con animaciones de ráfagas de confeti y coronación de medallas a los más votados 🥇🥈🥉.

## 💻 Tecnologías Utilizadas

- **Frontend**: HTML5 Semántico, CSS Módulo (Estilos Neón / Glassmorphism de la serie Euphoria), Vanilla JavaScript moderno.
- **Backend**: Node.js & Express - Rutas serverless diseñadas para ser subidas gratis a repositorios como Vercel `/api/`.
- **Database**: [Supabase](https://supabase.com/) & PostgreSQL.
- **Librerías Extra**:
  - `QRious` (Generación de código QR en canvas).
  - `html2canvas` (Rasterizado del HTML en imágenes descargables).
  - `canvas-confetti` (Emisor dinámico de partículas/fiesta final).

## 🚀 Instalación y Uso en Local

Para visualizar, probar localmente o desarrollar sobre el código, clona o descarga el repositorio y haz lo siguiente:

```bash
# 1. Instalar dependencias (Node)
npm install

# 2. Configurar base de datos
# Copiar el archivo .env.example en un archivo .env y colocar tus tokens de la DB
cp .env.example .env

# 3. Arrancar servidor
npm start
```
Con eso abres el navegador en `http://localhost:3000`.

## 🗄️ Setup Inicial de Base de Datos (Supabase)

Puesto que toda la lógica de validación, asistencia y votos descansa en Supabase, debes crear las siguientes tablas en el panel SQL Editor de tu Dashboard para que el sistema funcione:

```sql
-- TABLA DE INVITADOS BÁSICA --
CREATE TABLE IF NOT EXISTS "Users" (
  id serial PRIMARY KEY,
  name text NOT NULL,
  Code text,
  arrived boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- TABLA DE PREGUNTAS DEL JUEGO --
CREATE TABLE IF NOT EXISTS "Questions" (
  id serial PRIMARY KEY,
  question_text text NOT NULL
);

-- TABLA SESIÓN DEL LOBBY DE HOSTING --
CREATE TABLE IF NOT EXISTS "GameSessions" (
  pin text PRIMARY KEY,
  status text DEFAULT 'waiting', 
  current_question_index integer DEFAULT -1,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- ALMACÉN TOTAL DE VOTOS / JUGADORES ÚNICOS --
CREATE TABLE IF NOT EXISTS "GameVotes" (
  id serial PRIMARY KEY,
  pin text REFERENCES "GameSessions"(pin) ON DELETE CASCADE,
  participant_name text,
  question_index integer,
  voted_guest_id integer
);
```

## 🎨 Arquitectura de Diseño

Todos los activos estáticos y recursos HTML se encuentran expuestos libremente en `public/`.
- Elementos clave compartidos: `public/styles.css` regula centralizadamente los modales oscuros con sombras malvas/púrpuras, fondos profundos reactivos en web y gradientes tipo cristal.
- Al tratarse de JS Puro, los scripts están estrictamente separados de las plantillas para evitar mezclas XSS o de lógica.
