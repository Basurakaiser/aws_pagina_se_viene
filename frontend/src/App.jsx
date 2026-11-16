import { lazy, Suspense, useEffect, useState } from "react";
import Entrada from "./components/Entrada";
import { authApi } from "./api/client";

const Taberna = lazy(() => import("./components/Taberna"));
const TablonQuests = lazy(() => import("./components/TablonQuests"));
const QuestActiva = lazy(() => import("./components/QuestActiva"));
const NPC = lazy(() => import("./components/NPC/NPC"));
const MiPersonaje = lazy(() => import("./components/MiPersonaje"));

const USUARIOS_TABERNA = new Set([
    "kaiser", "kano", "ruoye", "vicho", "walalan",
    "skere", "firitoz", "yurishin", "bentron",
]);

const ESTILO_BOTON = {
    position: "fixed", top: "20px", zIndex: 99999,
    padding: "12px 17px",
    background: "linear-gradient(#c88a32, #754014)",
    color: "#ffe3a3", border: "3px solid #d6a34d",
    borderRadius: "7px", fontFamily: "Georgia, serif",
    fontSize: "16px", fontWeight: "bold", cursor: "pointer",
    boxShadow: "0 5px 12px rgba(0,0,0,.7)",
};

function App() {
    const [pantalla, setPantalla] = useState("entrada");
    const [usuarioActivo, setUsuarioActivo] = useState(null);
    const [comprobandoSesion, setComprobandoSesion] = useState(true);
    const [cerrandoSesion, setCerrandoSesion] = useState(false);
    const [errorSesion, setErrorSesion] = useState("");

    const [npcSeleccionado, setNpcSeleccionado] = useState(null);
    const [salaTaberna, setSalaTaberna] = useState(1);
    const [regresandoDesdeQuest, setRegresandoDesdeQuest] = useState(false);
    const [vistaPreviaMiPersonaje, setVistaPreviaMiPersonaje] = useState(false);

    useEffect(() => {
        let activo = true;

        const invalidarSesion = () => {
            if (!activo) return;
            setUsuarioActivo(null);
            setPantalla("entrada");
            setNpcSeleccionado(null);
            setVistaPreviaMiPersonaje(false);
            setRegresandoDesdeQuest(false);
            setCerrandoSesion(false);
        };
        window.addEventListener("taberna:sesion-vencida", invalidarSesion);

        async function comprobarSesion() {
            if (!authApi.hayToken()) {
                if (activo) setComprobandoSesion(false);
                return;
            }
            try {
                const perfil = await authApi.perfil();
                if (!USUARIOS_TABERNA.has(perfil?.aventurero)) {
                    authApi.limpiarLocal();
                    return;
                }
                if (activo) {
                    setUsuarioActivo(perfil.aventurero);
                    setPantalla("taberna");
                }
            } catch {
                authApi.limpiarLocal();
            } finally {
                if (activo) setComprobandoSesion(false);
            }
        }
        comprobarSesion();
        return () => {
            activo = false;
            window.removeEventListener("taberna:sesion-vencida", invalidarSesion);
        };
    }, []);

    const iniciarSesion = (usuarioVerificado) => {
        // Solo Entrada llama esta función tras un POST exitoso a Django.
        if (!authApi.hayToken() || !USUARIOS_TABERNA.has(usuarioVerificado)) return;
        setUsuarioActivo(usuarioVerificado);
        setNpcSeleccionado(null);
        setSalaTaberna(1);
        setVistaPreviaMiPersonaje(false);
        setRegresandoDesdeQuest(false);
        setErrorSesion("");
    };

    const cambiarPantalla = (destino) => {
        // El temporizador de Entrada puede conservar una referencia antigua a esta
        // función, anterior al cambio de usuarioActivo. El token ya fue emitido
        // por Django antes de comenzar la animación.
        if (destino !== "entrada" && !authApi.hayToken()) return;
        setPantalla(destino);
    };

    const cerrarSesion = async () => {
        if (cerrandoSesion) return;
        setCerrandoSesion(true);
        setErrorSesion("");
        try {
            await authApi.cerrar(); // Django revoca el token antes de salir.
            authApi.limpiarLocal();
            setUsuarioActivo(null);
            setNpcSeleccionado(null);
            setVistaPreviaMiPersonaje(false);
            setRegresandoDesdeQuest(false);
            setSalaTaberna(1);
            setPantalla("entrada");
        } catch (error) {
            // Si el servidor no pudo confirmar, NO afirmamos que el token se revocó.
            setErrorSesion(error.message || "No fue posible cerrar la sesión. Reintenta.");
        } finally {
            setCerrandoSesion(false);
        }
    };

    const abrirNPC = (idPersonaje, salaOrigen) => {
        setSalaTaberna(salaOrigen);
        setVistaPreviaMiPersonaje(false);
        setNpcSeleccionado(idPersonaje);
        setPantalla("npc");
    };

    const previsualizarMiPersonaje = () => {
        setVistaPreviaMiPersonaje(true);
        setNpcSeleccionado(usuarioActivo);
        setPantalla("npc");
    };

    const volverDesdeNPC = () => {
        setNpcSeleccionado(null);
        if (vistaPreviaMiPersonaje) {
            setVistaPreviaMiPersonaje(false);
            setPantalla("miPersonaje");
        } else {
            setPantalla("taberna");
        }
    };

    const volverDesdeQuest = () => {
        setSalaTaberna(1);
        setRegresandoDesdeQuest(true);
        setPantalla("taberna");
    };
    const terminarRegresoQuest = () => setRegresandoDesdeQuest(false);

    if (comprobandoSesion) {
        return <div role="status" style={{ background: "#1b130e", color: "#f0d8aa", minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "Georgia, serif" }}>Comprobando sesión...</div>;
    }

    return (
        <div>
            {usuarioActivo && (
                <>
                    {pantalla === "taberna" && (
                        <button type="button" onClick={() => cambiarPantalla("miPersonaje")}
                            style={{ ...ESTILO_BOTON, left: "20px" }}>
                            👤 Mi personaje
                        </button>
                    )}
                    <button type="button" onClick={cerrarSesion} disabled={cerrandoSesion}
                        style={{ ...ESTILO_BOTON, right: "250px", opacity: cerrandoSesion ? 0.65 : 1 }}>
                        {cerrandoSesion ? "Cerrando sesión..." : "Cerrar sesión"}
                    </button>
                    {errorSesion && <p role="alert" style={{ position: "fixed", top: "72px", right: "20px", zIndex: 99999, background: "#301b11", color: "#ffb3a4", padding: 10, maxWidth: 330 }}>{errorSesion}</p>}
                </>
            )}

            <Suspense fallback={<div role="status">Cargando...</div>}>
                {(!usuarioActivo || pantalla === "entrada") && (
                    <Entrada cambiarPantalla={cambiarPantalla} onLogin={iniciarSesion} />
                )}
                {usuarioActivo && pantalla === "taberna" && (
                    <Taberna cambiarPantalla={cambiarPantalla} abrirNPC={abrirNPC}
                        salaInicial={salaTaberna} setSalaGuardada={setSalaTaberna}
                        regresandoDesdeQuest={regresandoDesdeQuest}
                        terminarRegresoQuest={terminarRegresoQuest}
                        usuarioActivo={usuarioActivo} />
                )}
                {usuarioActivo && pantalla === "tablon" && (
                    <TablonQuests cambiarPantalla={cambiarPantalla} usuarioActivo={usuarioActivo} />
                )}
                {usuarioActivo && pantalla === "questActiva" && (
                    <QuestActiva cambiarPantalla={cambiarPantalla}
                        volverDesdeQuest={volverDesdeQuest} usuarioActivo={usuarioActivo} />
                )}
                {usuarioActivo && pantalla === "npc" && npcSeleccionado && (
                    <NPC personaje={npcSeleccionado} volver={volverDesdeNPC} usuarioActivo={usuarioActivo} />
                )}
                {usuarioActivo && pantalla === "miPersonaje" && (
                    <MiPersonaje cambiarPantalla={cambiarPantalla}
                        verComoMeVen={previsualizarMiPersonaje} usuarioActivo={usuarioActivo} />
                )}
            </Suspense>
        </div>
    );
}

export default App;
