
import {
    lazy,
    Suspense,
    useState,
} from "react";

import Entrada from "./components/Entrada";

const Taberna = lazy(() => import("./components/Taberna"));
const TablonQuests = lazy(() => import("./components/TablonQuests"));
const QuestActiva = lazy(() => import("./components/QuestActiva"));
const NPC = lazy(() => import("./components/NPC/NPC"));
const MiPersonaje = lazy(() => import("./components/MiPersonaje"));

const USUARIOS_TABERNA = [
    "kaiser",
    "kano",
    "ruoye",
    "vicho",
    "walalan",
    "lea",
    "hisoka",
];

function App() {

    const [pantalla, setPantalla] = useState("entrada");

    // =========================================
    // USUARIO ACTIVO DE LA TABERNA
    // =========================================

    const [usuarioActivo, setUsuarioActivo] = useState(() => {
        const guardado = localStorage.getItem("taberna_usuario");

        return USUARIOS_TABERNA.includes(guardado)
            ? guardado
            : "kaiser";
    });

    const cambiarUsuario = (usuario) => {
        if (!USUARIOS_TABERNA.includes(usuario)) return;

        localStorage.setItem("taberna_usuario", usuario);
        setUsuarioActivo(usuario);

        // Evitar conservar una selección del usuario anterior.
        setNpcSeleccionado(null);
        setVistaPreviaMiPersonaje(false);
        setRegresandoDesdeQuest(false);
    };

    const [npcSeleccionado, setNpcSeleccionado] = useState(null);

    const [salaTaberna, setSalaTaberna] = useState(1);

    const [regresandoDesdeQuest, setRegresandoDesdeQuest] =
        useState(false);

    const [vistaPreviaMiPersonaje, setVistaPreviaMiPersonaje] =
        useState(false);

    // =========================================
    // ABRIR NPC DESDE LA TABERNA
    // =========================================

    const abrirNPC = (idPersonaje, salaOrigen) => {

        setSalaTaberna(salaOrigen);
        setVistaPreviaMiPersonaje(false);
        setNpcSeleccionado(idPersonaje);
        setPantalla("npc");
    };

    // =========================================
    // VER MI PERSONAJE COMO LO VEN LOS DEMÁS
    // =========================================

    const previsualizarMiPersonaje = () => {

        setVistaPreviaMiPersonaje(true);

        // Ahora se previsualiza el usuario activo,
        // no siempre Kaiser.
        setNpcSeleccionado(usuarioActivo);

        setPantalla("npc");
    };

    // =========================================
    // VOLVER DESDE NPC
    // =========================================

    const volverDesdeNPC = () => {

        setNpcSeleccionado(null);

        if (vistaPreviaMiPersonaje) {

            setVistaPreviaMiPersonaje(false);
            setPantalla("miPersonaje");

            return;
        }

        setPantalla("taberna");
    };

    // =========================================
    // QUEST
    // =========================================

    const volverDesdeQuest = () => {

        setSalaTaberna(1);
        setRegresandoDesdeQuest(true);
        setPantalla("taberna");
    };

    const terminarRegresoQuest = () => {
        setRegresandoDesdeQuest(false);
    };

    return (
        <div>

            {pantalla === "taberna" && (
                <button
                    onClick={() => setPantalla("miPersonaje")}
                    style={{
                        position: "fixed",
                        top: "20px",
                        left: "20px",
                        zIndex: 99999,
                        padding: "15px 25px",
                        background: "linear-gradient(#c88a32, #754014)",
                        color: "#ffe3a3",
                        border: "3px solid #d6a34d",
                        borderRadius: "7px",
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        fontSize: "18px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        boxShadow: "0 5px 12px rgba(0,0,0,.7)",
                        textShadow: "0 2px 2px #000",
                        letterSpacing: "0.4px",
                    }}
                >
                    👤 Mi personaje
                </button>
            )}

            <Suspense fallback={null}>

                {pantalla === "entrada" && (
                    <Entrada
                        cambiarPantalla={setPantalla}
                        cambiarUsuario={cambiarUsuario}
                    />
                )}

                {pantalla === "taberna" && (
                    <Taberna
                        cambiarPantalla={setPantalla}
                        abrirNPC={abrirNPC}
                        salaInicial={salaTaberna}
                        setSalaGuardada={setSalaTaberna}
                        regresandoDesdeQuest={regresandoDesdeQuest}
                        terminarRegresoQuest={terminarRegresoQuest}
                        usuarioActivo={usuarioActivo}
                    />
                )}

                {pantalla === "tablon" && (
                    <TablonQuests
                        cambiarPantalla={setPantalla}
                        usuarioActivo={usuarioActivo}
                    />
                )}

                {pantalla === "questActiva" && (
                    <QuestActiva
                        cambiarPantalla={setPantalla}
                        volverDesdeQuest={volverDesdeQuest}
                        usuarioActivo={usuarioActivo}
                    />
                )}

                {pantalla === "npc" && npcSeleccionado && (
                    <NPC
                        personaje={npcSeleccionado}
                        volver={volverDesdeNPC}
                        usuarioActivo={usuarioActivo}
                    />
                )}

                {pantalla === "miPersonaje" && (
                    <MiPersonaje
                        cambiarPantalla={setPantalla}
                        verComoMeVen={previsualizarMiPersonaje}
                        usuarioActivo={usuarioActivo}
                    />
                )}

            </Suspense>

        </div>
    );
}

export default App;
