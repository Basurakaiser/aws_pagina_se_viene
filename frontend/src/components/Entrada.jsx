import { useEffect, useRef, useState } from "react";
import "./Entrada.css";

const USUARIOS_TABERNA = ["kaiser", "kano", "ruoye", "vicho", "walalan", "skere", "firitoz", "yurishin", "bentron"];
const IMAGEN_CERRADA = "/recursos/imagenes/entrada_cerrada.png";
const IMAGEN_ABIERTA = "/recursos/imagenes/entrada_abierta.png";

function Entrada({ cambiarPantalla, cambiarUsuario }) {
    const [entrando, setEntrando] = useState(false);
    const [mostrarSelector, setMostrarSelector] = useState(false);
    const [errorLogin, setErrorLogin] = useState("");
    const [cargando, setCargando] = useState(false);
    const googleContenedor = useRef(null);
    const temporizador = useRef(null);

    useEffect(() => {
        // Precargar el sprite abierto para evitar un parpadeo al cambiarlo.
        const imagen = new Image();
        imagen.src = IMAGEN_ABIERTA;
        return () => {
            if (temporizador.current) clearTimeout(temporizador.current);
        };
    }, []);

    const entrarCastillo = () => {
        if (!entrando) setMostrarSelector(true);
    };

    const confirmarEntrada = (usuario) => {
        if (entrando) return;
        localStorage.setItem("taberna_usuario", usuario);
        if (typeof cambiarUsuario === "function") cambiarUsuario(usuario);
        setMostrarSelector(false);
        setEntrando(true);
        temporizador.current = setTimeout(() => cambiarPantalla("taberna"), 1150);
    };

    useEffect(() => {
        if (!mostrarSelector || entrando) return;
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) {
            setErrorLogin("Falta configurar VITE_GOOGLE_CLIENT_ID en frontend/.env.local");
            return;
        }
        let cancelado = false;
        const preparar = () => {
            if (cancelado || !googleContenedor.current || !window.google?.accounts?.id) return;
            googleContenedor.current.innerHTML = "";
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: async ({ credential }) => {
                    if (!credential) return;
                    setCargando(true);
                    setErrorLogin("");
                    try {
                        const respuesta = await fetch(`${import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"}/api/auth/google/`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ credential }),
                        });
                        const datos = await respuesta.json();
                        if (!respuesta.ok) throw new Error(datos.error || "No se pudo iniciar sesión");
                        sessionStorage.setItem("taberna_token", datos.token);
                        confirmarEntrada(datos.aventurero);
                    } catch (error) {
                        setErrorLogin(error.message || "Error de conexión");
                    } finally {
                        setCargando(false);
                    }
                },
            });
            window.google.accounts.id.renderButton(googleContenedor.current, {
                theme: "outline", size: "large", text: "signin_with", shape: "pill",
            });
        };
        if (window.google?.accounts?.id) preparar();
        else {
            const script = document.createElement("script");
            script.src = "https://accounts.google.com/gsi/client";
            script.async = true;
            script.onload = preparar;
            script.onerror = () => setErrorLogin("No se pudo cargar Google Login");
            document.head.appendChild(script);
        }
        return () => { cancelado = true; };
    }, [mostrarSelector, entrando]);

    return (
        <main className={`entrada-escenario ${entrando ? "entrando" : ""}`}>
            <div className="entrada-contenedor-puerta">
                <img
                    src={entrando ? IMAGEN_ABIERTA : IMAGEN_CERRADA}
                    alt="Entrada a la taberna medieval"
                    className="entrada-fondo"
                    draggable="false"
                />
                <button
                    type="button"
                    className="entrada-area-colision"
                    onClick={entrarCastillo}
                    disabled={entrando}
                    aria-label="Entrar a la taberna"
                />
            </div>
            <div className="entrada-fundido" aria-hidden="true" />

            {mostrarSelector && !entrando && (
                <div className="entrada-selector-fondo">
                    <div className="entrada-selector-panel" role="dialog" aria-modal="true" aria-labelledby="entrada-selector-titulo">
                        <h2 id="entrada-selector-titulo">¿Quién entra a la taberna?</h2>
                        <p>Inicia sesión con tu cuenta autorizada de Google</p>
                        <div ref={googleContenedor} style={{ display: "flex", justifyContent: "center", margin: "18px 0" }} />
                        {cargando && <p>Verificando tu cuenta...</p>}
                        {errorLogin && <p role="alert" style={{ color: "#ffb0a0", maxWidth: 350 }}>{errorLogin}</p>}
                        <button type="button" className="entrada-selector-cancelar" onClick={() => setMostrarSelector(false)}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}

export default Entrada;
