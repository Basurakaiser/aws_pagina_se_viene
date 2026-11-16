// ==================================================
// API + AUTENTICACIÓN DJANGO (TOKEN BEARER)
// ==================================================

const BASE_URL = `${
    (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000")
        .replace(/\/$/, "")
}/api`;

const CLAVE_TOKEN = "taberna_token";
const EVENTO_SESION_VENCIDA = "taberna:sesion-vencida";

function limpiarSesionLocal() {
    sessionStorage.removeItem(CLAVE_TOKEN);
    // Limpiar el valor antiguo de la versión con selector de personajes.
    localStorage.removeItem("taberna_usuario");
}

function errorDeRespuesta(datos, codigo) {
    if (typeof datos?.error === "string") return datos.error;
    if (typeof datos?.detail === "string") return datos.detail;
    if (datos && typeof datos === "object") {
        const detalles = Object.entries(datos).map(([campo, valor]) =>
            `${campo}: ${Array.isArray(valor) ? valor.join(", ") : String(valor)}`
        );
        if (detalles.length) return detalles.join(" | ");
    }
    return `Error del servidor: ${codigo}`;
}

async function request(url, options = {}, autenticada = true) {
    const token = sessionStorage.getItem(CLAVE_TOKEN);
    if (autenticada && !token) {
        throw new Error("Debes iniciar sesión para continuar.");
    }

    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };
    if (autenticada) headers.Authorization = `Bearer ${token}`;

    // No usamos cookies de sesión: Django valida el token en Authorization.
    const respuesta = await fetch(`${BASE_URL}${url}`, {
        ...options,
        headers,
        credentials: "omit",
    });

    const datos = respuesta.status === 204
        ? null
        : await respuesta.json().catch(() => null);

    if (!respuesta.ok) {
        if (autenticada && respuesta.status === 401) {
            limpiarSesionLocal();
            window.dispatchEvent(new Event(EVENTO_SESION_VENCIDA));
        }
        throw new Error(errorDeRespuesta(datos, respuesta.status));
    }
    return datos;
}

// El login es la única petición que NO necesita un token previo.
export const authApi = {
    hayToken: () => Boolean(sessionStorage.getItem(CLAVE_TOKEN)),

    iniciar: async (usuario, password) => {
        const datos = await request("/auth/login/", {
            method: "POST",
            body: JSON.stringify({ usuario, password }),
        }, false);
        if (!datos?.token || typeof datos?.aventurero !== "string") {
            throw new Error("La respuesta de autenticación no es válida.");
        }
        sessionStorage.setItem(CLAVE_TOKEN, datos.token);
        return datos;
    },

    perfil: () => request("/auth/me/"),

    cerrar: () => request("/auth/logout/", { method: "POST" }),

    limpiarLocal: limpiarSesionLocal,
};

// ==================================================
 // DASHBOARD Y RANKING
 // ==================================================

 export const proyectoApi = {
     dashboard: () => request("/dashboard/"),
     ranking: () => request("/ranking/")
 };

 export const dashboardApi = {
     obtener: () => request("/dashboard/"),
     cargar: () => request("/dashboard/")
 };

 export const rankingApi = {
     obtener: () => request("/ranking/"),
     cargar: () => request("/ranking/")
 };

// ==================================================
// MISIONES
// ==================================================

export const misionesApi = {
    disponibles: () =>
        request("/mision-aleatoria/"),

    activa: (usuario) =>
        request(
            `/mision-activa/${encodeURIComponent(usuario)}/`
        ),

    tomar: (id, usuario) =>
        request(`/misiones/${id}/tomar/`, {
            method: "POST",
            body: JSON.stringify({
                usuario
            })
        }),

    entregar: (
        id,
        {
            enlaceDrive = "",
            comentario = ""
        } = {}
    ) =>
        request(`/misiones/${id}/entregar/`, {
            method: "POST",
            body: JSON.stringify({
                enlace_drive: enlaceDrive,
                comentario
            })
        })
};


// ==================================================
// MIEMBROS
// ==================================================

export const miembrosApi = {
    estadisticas: (usuario) =>
        request(
            `/miembros/${encodeURIComponent(usuario)}/estadisticas/`
        ),

    archivos: (usuario) =>
        request(
            `/miembros/${encodeURIComponent(usuario)}/archivos/`
        )
};


// ==================================================
// PUBLICACIONES
// ==================================================

export const publicacionesApi = {
    listar: () =>
        request("/publicaciones/"),

    listarPorAutor: (autor) =>
        request(
            `/publicaciones/?autor=${encodeURIComponent(autor)}`
        ),

    listarPorAutorYTipo: (autor, tipo) =>
        request(
            `/publicaciones/?autor=${encodeURIComponent(autor)}&tipo=${encodeURIComponent(tipo)}`
        ),

    crear: (publicacion) =>
        request("/publicaciones/", {
            method: "POST",
            body: JSON.stringify(publicacion)
        }),

    actualizar: (id, publicacion) =>
        request(`/publicaciones/${id}/`, {
            method: "PUT",
            body: JSON.stringify(publicacion)
        }),

    eliminar: (id) =>
        request(`/publicaciones/${id}/`, {
            method: "DELETE"
        })
};


// ==================================================
// OPCIONES DE DIÁLOGO
// ==================================================

export const opcionesDialogoApi = {
    listar: () =>
        request("/opciones-dialogo/"),

    listarPorDialogo: (dialogoId) =>
        request(
            `/opciones-dialogo/?dialogo=${encodeURIComponent(dialogoId)}`
        ),

    crear: ({
        dialogoOrigen,
        texto,
        dialogoDestino = null,
        orden = 1,
        activo = true
    }) =>
        request("/opciones-dialogo/", {
            method: "POST",
            body: JSON.stringify({
                dialogo_origen: dialogoOrigen,
                texto,
                dialogo_destino: dialogoDestino,
                orden,
                activo
            })
        }),

    actualizar: (
        id,
        {
            dialogoOrigen,
            texto,
            dialogoDestino = null,
            orden = 1,
            activo = true
        }
    ) =>
        request(`/opciones-dialogo/${id}/`, {
            method: "PUT",
            body: JSON.stringify({
                dialogo_origen: dialogoOrigen,
                texto,
                dialogo_destino: dialogoDestino,
                orden,
                activo
            })
        }),

    eliminar: (id) =>
        request(`/opciones-dialogo/${id}/`, {
            method: "DELETE"
        })
};
