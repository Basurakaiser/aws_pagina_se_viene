import { useEffect, useRef, useState } from "react";
import "./Entrada.css";
import { authApi } from "../api/client";

const USUARIOS_TABERNA = ["kaiser", "kano", "ruoye", "vicho", "walalan", "skere", "firitoz", "yurishin", "bentron"];
const IMAGEN_CERRADA = "/recursos/imagenes/entrada_cerrada.png";
const IMAGEN_ABIERTA = "/recursos/imagenes/entrada_abierta.png";

function Entrada({ cambiarPantalla, onLogin }) {
    const [entrando, setEntrando] = useState(false);
    const [mostrarSelector, setMostrarSelector] = useState(false);
    const [errorLogin, setErrorLogin] = useState("");
    const [cargando, setCargando] = useState(false);
    const [usuario, setUsuario] = useState("");
    const [password, setPassword] = useState("");
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
        onLogin(usuario);
        setMostrarSelector(false);
        setEntrando(true);
        temporizador.current = setTimeout(() => cambiarPantalla("taberna"), 1150);
    };

    const iniciarSesion = async (evento) => {
        evento.preventDefault();
        if (cargando || entrando) return;
        setErrorLogin("");
        setCargando(true);
        try {
            const datos = await authApi.iniciar(usuario.trim().toLowerCase(), password);
            if (!USUARIOS_TABERNA.includes(datos.aventurero)) {
                authApi.limpiarLocal();
                throw new Error("Cuenta no autorizada en el gremio.");
            }
            setPassword("");
            confirmarEntrada(datos.aventurero);
        } catch (error) {
            setErrorLogin(error.message || "No se pudo conectar con Django.");
        } finally {
            setCargando(false);
        }
    };

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
                        <p>Ingresa tu usuario y contraseña del gremio.</p>
                        <form className="entrada-formulario-login" onSubmit={iniciarSesion}>
                            <label htmlFor="entrada-usuario">Usuario</label>
                            <input
                                id="entrada-usuario"
                                type="text"
                                list="entrada-lista-usuarios"
                                autoComplete="username"
                                value={usuario}
                                onChange={(evento) => setUsuario(evento.target.value)}
                                required
                                disabled={cargando}
                                placeholder="Por ejemplo, kaiser"
                            />
                            <datalist id="entrada-lista-usuarios">
                                {USUARIOS_TABERNA.map((nombre) => (
                                    <option key={nombre} value={nombre} />
                                ))}
                            </datalist>
                            <label htmlFor="entrada-password">Contraseña</label>
                            <input
                                id="entrada-password"
                                type="password"
                                autoComplete="current-password"
                                value={password}
                                onChange={(evento) => setPassword(evento.target.value)}
                                required
                                disabled={cargando}
                                placeholder="Ingresa tu contraseña"
                            />
                            {errorLogin && <p role="alert" className="entrada-login-error">{errorLogin}</p>}
                            <button className="entrada-selector-confirmar" type="submit" disabled={cargando}>
                                {cargando ? "Comprobando credenciales..." : "Entrar a la taberna"}
                            </button>
                        </form>
                        <button type="button" className="entrada-selector-cancelar" disabled={cargando} onClick={() => {
                            setMostrarSelector(false);
                            setErrorLogin("");
                            setPassword("");
                        }}>
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </main>
    );
}

export default Entrada;
