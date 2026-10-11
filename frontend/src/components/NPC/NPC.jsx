import { useEffect, useMemo, useRef, useState } from "react";
import "./NPC.css";
import { PERSONAJES } from "./personajes";
import { publicacionesApi, miembrosApi } from "../../api/client";


// Frontera de combustión orgánica: Canvas 2D, sin imágenes externas.
// Se anima solamente cuando el pergamino cruza el borde del visor.
// Un solo Canvas para todo el visor. Sin observadores por Quest ni sombras costosas.
function FuegoArchivosLigero({ visorRef }) {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        const scroll = visorRef.current;
        if (!canvas || !scroll) return;
        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) return;
        let raf = 0, last = 0, active = false;
        let w = 1, h = 1;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const host = canvas.closest(".npc-archivos");
        const style = getComputedStyle(host || canvas);
        const cssNum = (key, fallback) => Number.parseFloat(style.getPropertyValue(key)) || fallback;
        const charSize = cssNum("--rpg-carbon-altura", 22);
        const flameSize = cssNum("--fuego-llama-alto", cssNum("--rpg-llama-altura", 37));
        // 100% = ancho original de la franja; 150% = 50% más ancha.
        const flameWidthRaw = style.getPropertyValue("--fuego-llama-ancho").trim();
        const flameWidthParsed = Number.parseFloat(flameWidthRaw);
        const flameWidthFactor = Number.isFinite(flameWidthParsed) && flameWidthParsed > 0
            ? (flameWidthRaw.endsWith("%") ? flameWidthParsed / 100 : flameWidthParsed)
            : 1;
        const speed = cssNum("--rpg-velocidad", 1);
        const brightness = cssNum("--rpg-brillo", 1.1);
        function resize() {
            const r = canvas.getBoundingClientRect();
            w = Math.max(1, r.width); h = Math.max(1, r.height);
            // Renderizar a 70% de resolución: el fuego es naturalmente difuso.
            canvas.width = Math.ceil(w * .7); canvas.height = Math.ceil(h * .7);
            ctx.setTransform(.7, 0, 0, .7, 0, 0);
        }
        function lineY(x, t, seed) {
            return Math.sin(x * .045 + seed + t * 1.7) * 2.2
                + Math.sin(x * .13 + seed * 2 - t * 1.2) * 1.1;
        }
        // Fuego de fantasía oscura: carbonización profunda, llamas curvas y brasas discretas.
        // Se dibuja una sola vez por pergamino en un Canvas compartido.
        function burn(x0, x1, y, t, seed, direction) {
            // AJUSTES DE LA FRANJA NARANJA (no afectan a las Quest).
            // Se consultan al dibujar para poder cambiar el CSS y recargar.
            const fuegoCSS = getComputedStyle(host || canvas);
            const leer = (nombre, defecto) => {
                const numero = Number.parseFloat(fuegoCSS.getPropertyValue(nombre));
                return Number.isFinite(numero) ? numero : defecto;
            };
            const anchoOriginal = x1 - x0;
            const porcentaje = Math.max(1, leer('--franja-fuego-ancho', 100)) / 100;
            const centro = (x0 + x1) / 2 + leer('--franja-fuego-x', 0);
            x0 = centro - anchoOriginal * porcentaje / 2;
            x1 = centro + anchoOriginal * porcentaje / 2;
            y += leer('--franja-fuego-y', 0);
            const grosorFranja = Math.max(0.1, leer('--franja-fuego-grosor', 1));
            const len = x1 - x0;
            if (len < 8) return;
            const count = Math.ceil(len / 6);
            const intensity = u => {
                const edge = Math.min(u, 1 - u);
                const taper = Math.min(1, Math.max(0, edge * 9));
                const varied = .76 + .16 * Math.sin(u * 19 + seed)
                    + .11 * Math.sin(u * 47 - t * .42 + seed * 2);
                return Math.max(0, taper * varied);
            };
            const center = (x) => y + lineY(x, t, seed);

            // Carbonización: velo difuso pegado al borde, sin siluetas triangulares.
            // Un degradado radial local impide que parezcan montañas negras.
            const dark = ctx.createLinearGradient(0, y - charSize * .9, 0, y + charSize * .9);
            dark.addColorStop(0, 'rgba(22,9,5,0)');
            dark.addColorStop(.33, 'rgba(24,10,6,.14)');
            dark.addColorStop(.48, 'rgba(19,8,5,.65)');
            dark.addColorStop(.55, 'rgba(32,11,5,.72)');
            dark.addColorStop(.76, 'rgba(54,21,9,.14)');
            dark.addColorStop(1, 'rgba(22,9,5,0)');
            ctx.save();
            ctx.strokeStyle = dark;
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            for (let i = 0; i < count; i += 4) {
                const u = (i + 2) / count;
                const power = intensity(u);
                if (power < .03) continue;
                ctx.lineWidth = charSize * (.65 + .38 * Math.sin(u * 23 + seed)) * power * grosorFranja;
                ctx.beginPath();
                for (let j = i; j <= Math.min(count, i + 4); j++) {
                    const x = x0 + len * j / count;
                    if (j === i) ctx.moveTo(x, center(x));
                    else ctx.lineTo(x, center(x));
                }
                ctx.stroke();
            }
            ctx.restore();

            // Llamas curvas que ascienden. No se dibujan figuras negras sólidas.
            const flames = Math.ceil(len / 25);
            for (let i = 0; i < flames; i++) {
                const u = (i + .5) / flames, power = intensity(u);
                if (power < .12) continue;
                const x = x0 + len * u, base = center(x);
                const variation = .3 + .7 * (.5 + .5 * Math.sin(i * 2.71 + t * 2.2 + seed));
                const tall = flameSize * power * variation * .85;
                const lean = Math.sin(i * 1.83 + t * 1.2 + seed) * 7;
                const grad = ctx.createLinearGradient(x, base, x + lean, base - tall);
                grad.addColorStop(0, 'rgba(255,180,48,.56)');
                grad.addColorStop(.25, 'rgba(255,106,12,.48)');
                grad.addColorStop(.65, 'rgba(221,53,9,.18)');
                grad.addColorStop(1, 'rgba(180,29,8,0)');
                ctx.fillStyle = grad;
                const spread = 5.5 * power;
                ctx.beginPath();
                ctx.moveTo(x - spread, base);
                ctx.bezierCurveTo(x - spread * 1.2, base - tall * .32,
                    x + lean - 5, base - tall * .85, x + lean, base - tall);
                ctx.bezierCurveTo(x + lean + 4, base - tall * .66,
                    x + spread * 1.2, base - tall * .25, x + spread, base);
                ctx.closePath(); ctx.fill();
            }

            // Humo real: pequeñas volutas difuminadas, ascendentes y semitransparentes.
            // Solo tres por Quest para no perjudicar el rendimiento.
            for (let i = 0; i < 3; i++) {
                const u = .19 + ((i * .31 + seed * .09) % .62);
                const power = intensity(u);
                if (power < .2) continue;
                const phase = (t * (.15 + i * .028) + i * .37 + seed * .11) % 1;
                const x = x0 + len * u + Math.sin(t * .7 + i * 3 + seed) * (5 + phase * 8);
                const yy = center(x) - 8 - phase * 52;
                const radius = 8 + phase * 16;
                const alpha = Math.sin(phase * Math.PI) * .10 * power;
                const smoke = ctx.createRadialGradient(x, yy, 0, x, yy, radius);
                smoke.addColorStop(0, `rgba(52,47,43,${alpha})`);
                smoke.addColorStop(.6, `rgba(46,43,42,${alpha * .36})`);
                smoke.addColorStop(1, 'rgba(40,38,37,0)');
                ctx.fillStyle = smoke;
                ctx.beginPath(); ctx.arc(x, yy, radius, 0, Math.PI * 2); ctx.fill();
            }

            // Una única curva por capa: evita cientos de trazos por fotograma.
            for (const [baseWidth, color] of [
                [14, 'rgba(184,44,5,.25)'],
                [7, 'rgba(255,91,7,.66)'],
                [3.1, 'rgba(255,171,31,.91)'],
                [1.1, 'rgba(255,226,113,.82)']
            ]) {
                // Variación de grosor por grupos, con extremos que se extinguen.
                for (let i = 0; i < count; i += 3) {
                    const u = (i + 1.5) / count, power = intensity(Math.min(1, u));
                    if (power < .025) continue;
                    ctx.strokeStyle = color;
                    ctx.lineWidth = baseWidth * power * brightness * grosorFranja;
                    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                    ctx.beginPath();
                    for (let j = i; j <= Math.min(count, i + 3); j++) {
                        const x = x0 + len * j / count;
                        if (j === i) ctx.moveTo(x, center(x));
                        else ctx.lineTo(x, center(x));
                    }
                    ctx.stroke();
                }
            }

            // Brasas pequeñas y escasas; sin sistema pesado de partículas.
            for (let i = 0; i < 6; i++) {
                const u = ((i * .173 + seed * .071 + t * .027) % .9) + .05;
                const power = intensity(u);
                if (power < .15) continue;
                const x = x0 + len * u + Math.sin(t + i * 2) * 3;
                const rise = (t * (11 + i * 3) + i * 17) % 34;
                ctx.globalAlpha = power * (.34 + .3 * (1 - rise / 34));
                ctx.fillStyle = i % 3 ? '#ff8a28' : '#ffd277';
                ctx.fillRect(x, center(x) - direction * rise, 1.4, 1.4);
            }
            ctx.globalAlpha = 1;
        }
        function draw(now) {
            raf=0;
            if(!active) return;
            if(now-last<40) { raf=requestAnimationFrame(draw);return; } // 25 FPS
            last=now;
            ctx.clearRect(0,0,w,h);
            const box=canvas.getBoundingClientRect();
            const viewport=scroll.getBoundingClientRect();
            // Área de COMBUSTIÓN independiente: no altera el visor, el scroll
            // ni el tamaño/distribución de los pergaminos.
            // Las unidades % se calculan respecto al tamaño del visor.
            const config = getComputedStyle(host || canvas);
            const dimension = (name, base, fallback) => {
                const value = config.getPropertyValue(name).trim();
                if (!value) return fallback;
                if (value.endsWith('%')) {
                    const n = Number.parseFloat(value);
                    return Number.isFinite(n) ? base * n / 100 : fallback;
                }
                const n = Number.parseFloat(value);
                return Number.isFinite(n) ? n : fallback;
            };
            const regionLeft = viewport.left + dimension('--fuego-left', viewport.width, 0);
            const regionTop = viewport.top + dimension('--fuego-top', viewport.height, 0);
            const regionWidth = Math.max(0, dimension('--fuego-width', viewport.width, viewport.width));
            const regionHeight = Math.max(0, dimension('--fuego-height', viewport.height, viewport.height));
            const regionRight = regionLeft + regionWidth;
            const top = regionTop + 8;
            const bottom = regionTop + regionHeight - 8;
            // Los PNG de pergamino tienen margen transparente: la caja HTML
            // toca el borde antes que el papel visible. Retrasar la activación
            // hasta que el papel haya cruzado la línea de fuego.
            const contactoSuperior = Math.max(0, dimension('--fuego-contacto-superior', viewport.height, 18));
            const contactoInferior = Math.max(0, dimension('--fuego-contacto-inferior', viewport.height, 18));
            const cards=scroll.querySelectorAll('.npc-archivo-pergamino');
            let burning = false;
            if (bottom > top && regionRight > regionLeft) for(let i=0;i<cards.length;i++) {
                const r=cards[i].getBoundingClientRect();
                const x0 = Math.max(r.left - 5, regionLeft);
                const x1 = Math.min(r.right + 5, regionRight);
                if (x1 <= x0 || r.bottom <= top || r.top >= bottom) continue;
                // Una Quest puede cruzar ambos bordes a la vez.
                for (const [y, direction, crossed] of [
                    [top, -1, r.top + contactoSuperior < top && r.bottom - contactoInferior > top],
                    [bottom, 1, r.top + contactoSuperior < bottom && r.bottom - contactoInferior > bottom]
                ]) {
                    if (!crossed) continue;
                    // Evitar trabajo si el fuego cae totalmente fuera del Canvas.
                    if (y < box.top - flameSize - charSize || y > box.bottom + charSize) continue;
                    burning = true;
                    // Ensanchar la franja visualmente alrededor del centro de cada Quest.
                    // No cambia los límites de activación ni el tamaño del pergamino.
                    const centerX = (x0 + x1) / 2;
                    const halfWidth = (x1 - x0) * flameWidthFactor / 2;
                    // Separación ENTRE franjas: extensión independiente a cada lado.
                    // Positivo acerca las franjas; negativo las separa.
                    const extension = Number.parseFloat(
                        getComputedStyle(host || canvas).getPropertyValue('--fuego-extension-lateral')
                    );
                    const extra = Number.isFinite(extension) ? extension : 0;
                    burn(centerX - halfWidth - extra - box.left,
                         centerX + halfWidth + extra - box.left,
                         y - box.top, now * .001 * speed, i * 2.3, direction);
                }
            }
            // El fuego depende de la intersección con el visor, no del mouse.
            // Sigue animándose mientras haya un pergamino cortado por el borde.
            if (burning) raf=requestAnimationFrame(draw);
            else {active=false;ctx.clearRect(0,0,w,h);}
        }
        function onScroll() {
            if(!active) { active=true;raf=requestAnimationFrame(draw); }
        }
        const observer=new ResizeObserver(resize);
        observer.observe(canvas);
        resize();
        scroll.addEventListener('scroll',onScroll,{passive:true});
        // También revisar al abrir los archivos o cambiar el tamaño.
        const initialCheck = requestAnimationFrame(onScroll);
        return ()=>{scroll.removeEventListener('scroll',onScroll);observer.disconnect();cancelAnimationFrame(initialCheck);cancelAnimationFrame(raf);};
    },[visorRef]);
    return <canvas ref={canvasRef} className="npc-fuego-unico" aria-hidden="true" />;
}

function normalizarEnlaceExterno(valor) {
    const enlace = String(valor || "").trim();

    if (!enlace) {
        return "";
    }

    if (/^https?:\/\//i.test(enlace)) {
        return enlace;
    }

    return `https://${enlace}`;
}


function obtenerEnlacePreviewDrive(valor) {
    const enlace = normalizarEnlaceExterno(valor);
    if (!enlace) return "";

    try {
        const url = new URL(enlace);
        const host = url.hostname.toLowerCase();

        if (host === "drive.google.com") {
            const archivo = url.pathname.match(/\/file\/d\/([^/]+)/);
            if (archivo?.[1]) return `https://drive.google.com/file/d/${archivo[1]}/preview`;

            const id = url.searchParams.get("id");
            if (id) return `https://drive.google.com/file/d/${id}/preview`;
        }

        if (host === "docs.google.com") {
            const documento = url.pathname.match(
                /^\/(document|spreadsheets|presentation)\/d\/([^/]+)/
            );

            if (documento) {
                const tipo = documento[1];
                const id = documento[2];

                if (tipo === "document") return `https://docs.google.com/document/d/${id}/preview`;
                if (tipo === "spreadsheets") return `https://docs.google.com/spreadsheets/d/${id}/preview`;
                if (tipo === "presentation") return `https://docs.google.com/presentation/d/${id}/preview`;
            }
        }
    } catch (error) {
        console.error("Enlace de Drive inválido:", error);
    }

    return "";
}

function obtenerPergamino(mision) {
    const valor = String(mision?.numero_pergamino ?? "").trim().toLowerCase();
    // Respetar el diseño asignado en Django, incluyendo las variantes de rareza.
    if (/^[1-6](?:_(?:plata|oro|diamante|morado|dragon))?$/.test(valor)) {
        return valor;
    }
    // Compatibilidad con misiones antiguas sin numero_pergamino válido.
    const puntos = Number(mision?.recompensa_puntos);
    if (puntos >= 34) return "1_dragon";
    if (puntos >= 21) return "1_morado";
    if (puntos >= 13) return "1_diamante";
    if (puntos >= 8) return "1_oro";
    if (puntos >= 3) return "1_plata";
    return "1";
}

function NPC({ personaje, usuarioActivo, volver }) {
    const npc = PERSONAJES[personaje];

    const [modo, setModo] = useState("menu");
    const [saliendo, setSaliendo] = useState(false);

    // ==================================================
    // PUBLICACIONES
    // ==================================================

    const [publicaciones, setPublicaciones] = useState([]);
    const [cargandoPublicaciones, setCargandoPublicaciones] = useState(false);
    const [errorPublicaciones, setErrorPublicaciones] = useState("");

    // ==================================================
    // ESTADÍSTICAS
    // ==================================================

    const [estadisticas, setEstadisticas] = useState(null);
    const [cargandoEstadisticas, setCargandoEstadisticas] = useState(false);
    const [errorEstadisticas, setErrorEstadisticas] = useState("");

    // ==================================================
    // ARCHIVOS / QUESTS COMPLETADAS
    // ==================================================

    const [archivos, setArchivos] = useState([]);
    const [cargandoArchivos, setCargandoArchivos] = useState(false);
    const [errorArchivos, setErrorArchivos] = useState("");
    const visorArchivosRef = useRef(null);
    const intervaloFlechaRef = useRef(null);
    const esperaFlechaRef = useRef(null);
    const temporizadorFuegoRef = useRef(null);
    const pulsacionLargaRef = useRef(false);
    const [limitesArchivos, setLimitesArchivos] = useState({ arriba: false, abajo: false });
    const [fuegoActivo, setFuegoActivo] = useState(false);


    // ==================================================
    // CONVERSACIÓN
    // ==================================================

    const [dialogoActual, setDialogoActual] = useState(null);
    const [bolsaDialogos, setBolsaDialogos] = useState([]);
    const [dialogoLocalActual, setDialogoLocalActual] = useState(0);

    // ==================================================
    // REINICIAR AL CAMBIAR DE PERSONAJE
    // ==================================================

    useEffect(() => {
        setModo("menu");
        setSaliendo(false);
        setDialogoActual(null);
        setDialogoLocalActual(0);
        setArchivos([]);
        setErrorArchivos("");
        setFuegoActivo(false);
    }, [personaje]);

    // ==================================================
    // CARGAR PUBLICACIONES DEL NPC SELECCIONADO
    // ==================================================

    useEffect(() => {
        if (!personaje) {
            setPublicaciones([]);
            setBolsaDialogos([]);
            setErrorPublicaciones("");
            setCargandoPublicaciones(false);
            return;
        }

        let cancelado = false;

        async function cargarPublicaciones() {
            try {
                setCargandoPublicaciones(true);
                setPublicaciones([]);
                setErrorPublicaciones("");

                const datos = await publicacionesApi.listarPorAutor(personaje);

                if (cancelado) return;

                const lista = Array.isArray(datos)
                    ? datos.filter((item) => item.activo)
                    : [];

                setPublicaciones(lista);
            } catch (error) {
                console.error(error);

                if (!cancelado) {
                    setPublicaciones([]);
                    setErrorPublicaciones(
                        "No se pudo cargar la información."
                    );
                }
            } finally {
                if (!cancelado) {
                    setCargandoPublicaciones(false);
                }
            }
        }

        cargarPublicaciones();

        return () => {
            cancelado = true;
        };
    }, [personaje]);

    // ==================================================
    // CARGAR ESTADÍSTICAS
    // ==================================================

    useEffect(() => {
        if (!personaje) return;

        let cancelado = false;

        async function cargarEstadisticas() {
            try {
                setCargandoEstadisticas(true);
                setErrorEstadisticas("");

                const datos = await miembrosApi.estadisticas(personaje);

                if (cancelado) return;

                setEstadisticas(datos);
            } catch (error) {
                console.error(error);

                if (!cancelado) {
                    setEstadisticas(null);
                    setErrorEstadisticas(
                        "No se pudieron cargar los puntos."
                    );
                }
            } finally {
                if (!cancelado) {
                    setCargandoEstadisticas(false);
                }
            }
        }

        cargarEstadisticas();

        return () => {
            cancelado = true;
        };
    }, [personaje]);

    // ==================================================
    // DIÁLOGOS
    // ==================================================

    const todosLosDialogos = useMemo(
        () =>
            publicaciones.filter(
                (item) => item.tipo === "dialogo"
            ),
        [publicaciones]
    );

    // ==================================================
    // ESTADO
    // ==================================================

    const estados = useMemo(
        () =>
            publicaciones.filter(
                (item) => item.tipo === "estado"
            ),
        [publicaciones]
    );

    const estadoActual =
        estados.length > 0
            ? estados[0]
            : null;

    // ==================================================
    // RESPUESTAS INTERNAS
    // ==================================================

    const idsDialogosDestino = useMemo(() => {
        const ids = new Set();

        todosLosDialogos.forEach((dialogo) => {
            if (!Array.isArray(dialogo.opciones)) return;

            dialogo.opciones.forEach((opcion) => {
                if (opcion.dialogo_destino) {
                    ids.add(opcion.dialogo_destino);
                }
            });
        });

        return ids;
    }, [todosLosDialogos]);

    // ==================================================
    // DIÁLOGOS PRINCIPALES
    // ==================================================

    const dialogosPrincipales = useMemo(
        () =>
            todosLosDialogos.filter(
                (dialogo) =>
                    !idsDialogosDestino.has(dialogo.id)
            ),
        [todosLosDialogos, idsDialogosDestino]
    );

    const usarBackendDialogos = dialogosPrincipales.length > 0;

    // ==================================================
    // BOLSA DE DIÁLOGOS
    // ==================================================

    useEffect(() => {
        if (
            !dialogosPrincipales.length
        ) {
            setBolsaDialogos([]);
            return;
        }

        setBolsaDialogos(
            dialogosPrincipales.map(
                (dialogo) => dialogo.id
            )
        );
    }, [personaje, dialogosPrincipales]);

    function sacarDialogoDeBolsa() {
        if (!dialogosPrincipales.length) {
            return null;
        }

        const bolsaDisponible =
            bolsaDialogos.length > 0
                ? bolsaDialogos
                : dialogosPrincipales.map(
                      (dialogo) => dialogo.id
                  );

        const indice = Math.floor(
            Math.random() *
                bolsaDisponible.length
        );

        const idElegido =
            bolsaDisponible[indice];

        setBolsaDialogos(
            bolsaDisponible.filter(
                (id) => id !== idElegido
            )
        );

        return (
            dialogosPrincipales.find(
                (dialogo) =>
                    dialogo.id === idElegido
            ) || null
        );
    }

    // ==================================================
    // HABLAR
    // ==================================================

    function hablar() {
        if (usarBackendDialogos) {
            const elegido =
                sacarDialogoDeBolsa();

            if (!elegido) return;

            setDialogoActual(elegido);
            setModo("hablar");
            return;
        }

        const cantidad =
            npc.dialogos?.length || 0;

        if (!cantidad) return;

        const indice = Math.floor(
            Math.random() * cantidad
        );

        setDialogoLocalActual(indice);
        setDialogoActual(null);
        setModo("hablar");
    }

    // ==================================================
    // RESPUESTAS
    // ==================================================

    function elegirRespuesta(opcion) {
        if (!opcion.dialogo_destino) {
            terminarConversacion();
            return;
        }

        const destino =
            todosLosDialogos.find(
                (dialogo) =>
                    dialogo.id ===
                    opcion.dialogo_destino
            );

        if (!destino) {
            terminarConversacion();
            return;
        }

        setDialogoActual(destino);
    }

    function terminarConversacion() {
        setModo("menu");
        setDialogoActual(null);
        setDialogoLocalActual(0);
    }

    const opcionesActuales =
        usarBackendDialogos &&
        dialogoActual &&
        Array.isArray(dialogoActual.opciones)
            ? dialogoActual.opciones.filter(
                  (opcion) => opcion.activo
              )
            : [];

    const tieneOpciones =
        opcionesActuales.length > 0;

    const textoDialogo =
        usarBackendDialogos &&
        dialogoActual
            ? dialogoActual.contenido
            : npc?.dialogos?.[
                  dialogoLocalActual
              ] || "";

    // ==================================================
    // PUNTOS
    // ==================================================

    function mostrarPuntos() {
        setModo("puntos");
    }

    // ==================================================
    // ARCHIVOS
    // ==================================================

    async function mostrarArchivos() {
        setModo("archivos");
        setFuegoActivo(false);
        if (visorArchivosRef.current) visorArchivosRef.current.scrollTop = 0;
        setCargandoArchivos(true);
        setErrorArchivos("");

        try {
            const datos =
                await miembrosApi.archivos(
                    personaje
                );

            const misiones =
                Array.isArray(datos?.misiones)
                    ? datos.misiones
                    : [];

            setArchivos(misiones);
        } catch (error) {
            console.error(error);
            setArchivos([]);
            setErrorArchivos(
                "No se pudieron cargar los archivos."
            );
        } finally {
            setCargandoArchivos(false);
        }
    }

    // ==================================================
    // FORMATEAR FECHA / NAVEGACIÓN DE ARCHIVOS
    // ==================================================

    function formatearFechaCorta(fecha) {
        if (!fecha) return "—";
        const valor = new Date(fecha);
        if (Number.isNaN(valor.getTime())) return "—";

        return valor.toLocaleDateString("es-CL", {
            day: "2-digit",
            month: "2-digit",
            year: "2-digit",
        });
    }

    // El scroll es continuo: las Quest permanecen montadas en el DOM.
    // No cambiamos páginas ni sustituimos filas al pulsar las flechas.
    function actualizarLimitesArchivos() {
        const elemento = visorArchivosRef.current;
        if (!elemento) return;
        const maximo = Math.max(0, elemento.scrollHeight - elemento.clientHeight);
        const arriba = elemento.scrollTop > 2;
        const abajo = elemento.scrollTop < maximo - 2;
        setLimitesArchivos(prev => prev.arriba === arriba && prev.abajo === abajo ? prev : { arriba, abajo });
    }

    useEffect(() => {
        if (modo !== "archivos" || cargandoArchivos) return;
        const id = requestAnimationFrame(() => {
            actualizarLimitesArchivos();
        });
        window.addEventListener("resize", actualizarLimitesArchivos);
        return () => {
            cancelAnimationFrame(id);
            window.removeEventListener("resize", actualizarLimitesArchivos);
        };
    }, [modo, cargandoArchivos, archivos.length]);

    useEffect(() => {
        if (modo !== "archivos" || cargandoArchivos) return;
        const frame = requestAnimationFrame(() => {
            if (visorArchivosRef.current) visorArchivosRef.current.scrollTop = 0;
            actualizarLimitesArchivos();
        });
        return () => cancelAnimationFrame(frame);
    }, [personaje, modo, cargandoArchivos]);

    useEffect(() => () => {
        clearInterval(intervaloFlechaRef.current);
        clearTimeout(esperaFlechaRef.current);
        clearTimeout(temporizadorFuegoRef.current);
    }, []);

    function alDesplazarArchivos() {
        actualizarLimitesArchivos();
    }

    function desplazarArchivos(direccion, distancia = 105) {
        visorArchivosRef.current?.scrollBy({ top: direccion * distancia, behavior: "smooth" });
    }

    function detenerFlecha() {
        clearTimeout(esperaFlechaRef.current);
        clearInterval(intervaloFlechaRef.current);
        esperaFlechaRef.current = null;
        intervaloFlechaRef.current = null;
    }

    function iniciarFlecha(direccion) {
        detenerFlecha();
        pulsacionLargaRef.current = false;
        esperaFlechaRef.current = setTimeout(() => {
            pulsacionLargaRef.current = true;
            intervaloFlechaRef.current = setInterval(() => {
                visorArchivosRef.current?.scrollBy({ top: direccion * 7, behavior: "instant" });
            }, 16);
        }, 230);
    }

    function clicFlecha(direccion) {
        if (!pulsacionLargaRef.current) desplazarArchivos(direccion);
        pulsacionLargaRef.current = false;
    }

    // ==================================================
    // VOLVER AL MENÚ
    // ==================================================

    function volverMenu() {
        setModo("menu");
        setDialogoActual(null);
        setDialogoLocalActual(0);
    }

    // ==================================================
    // VOLVER A LA TABERNA
    // ==================================================

    function regresarTaberna() {
        if (saliendo) return;

        setSaliendo(true);

        setTimeout(() => {
            volver();
        }, 550);
    }

    if (!npc) {
        return null;
    }

    // ==================================================
    // RENDER
    // ==================================================

    return (
        <main
            className={`npc-pantalla ${
                saliendo
                    ? "npc-saliendo"
                    : ""
            }`}
            style={{
                backgroundImage:
                    `url("${npc.imagenDialogo}")`,
            }}
        >
            <div
                className="npc-sombra"
                aria-hidden="true"
            />

            <button
                className="npc-boton-volver"
                onClick={regresarTaberna}
                disabled={saliendo}
            >
                ← Volver a la taberna
            </button>

            {/* IDENTIDAD */}

            <div className="npc-identidad">
                <div className="npc-nombre">
                    {npc.nombre}
                </div>

                <div className="npc-rol">
                    {npc.rol}
                </div>

                {estadoActual && (
                        <div className="npc-estado-publico">
                            <span className="npc-estado-punto" />
                            {estadoActual.contenido}
                        </div>
                    )}
            </div>

            {/* MENÚ */}

            {modo === "menu" && (
                <div className="npc-panel">
                    <div className="npc-panel-titulo">
                        ¿Qué necesitas?
                    </div>

                    <button
                        className="npc-opcion"
                        onClick={hablar}
                        disabled={
                            cargandoPublicaciones
                        }
                    >
                        <span className="npc-icono">
                            💬
                        </span>

                        <span>
                            Hablarle
                        </span>

                        <span className="npc-flecha">
                            ›
                        </span>
                    </button>

                    <button
                        className="npc-opcion"
                        onClick={mostrarPuntos}
                    >
                        <span className="npc-icono">
                            ★
                        </span>

                        <span>
                            ¿Cuántos puntos tienes?
                        </span>

                        <span className="npc-flecha">
                            ›
                        </span>
                    </button>

                    <button
                        className="npc-opcion"
                        onClick={mostrarArchivos}
                    >
                        <span className="npc-icono">
                            📜
                        </span>

                        <span>
                            Muéstrame tus archivos
                        </span>

                        <span className="npc-flecha">
                            ›
                        </span>
                    </button>

                    {errorPublicaciones && (
                            <div className="npc-error-pequeno">
                                {errorPublicaciones}
                            </div>
                        )}
                </div>
            )}

            {/* HABLAR */}

            {modo === "hablar" && (
                <div className="npc-dialogo">
                    <div className="npc-dialogo-nombre">
                        {npc.nombre}
                    </div>

                    <div className="npc-dialogo-texto">
                        “{textoDialogo}”
                    </div>

                    {tieneOpciones ? (
                        <div className="npc-respuestas">
                            {opcionesActuales.map(
                                (opcion) => (
                                    <button
                                        key={
                                            opcion.id
                                        }
                                        className="npc-respuesta"
                                        onClick={() =>
                                            elegirRespuesta(
                                                opcion
                                            )
                                        }
                                    >
                                        <span>
                                            {
                                                opcion.texto
                                            }
                                        </span>

                                        <span className="npc-respuesta-flecha">
                                            ›
                                        </span>
                                    </button>
                                )
                            )}
                        </div>
                    ) : (
                        <button
                            className="npc-boton-continuar"
                            onClick={
                                terminarConversacion
                            }
                        >
                            Volver
                        </button>
                    )}
                </div>
            )}

            {/* PUNTOS */}

            {modo === "puntos" && (
                <div className="npc-dialogo">
                    <div className="npc-dialogo-nombre">
                        {npc.nombre}
                    </div>

                    {cargandoEstadisticas ? (
                        <div className="npc-dialogo-texto">
                            Revisando mis puntos...
                        </div>
                    ) : errorEstadisticas ? (
                        <div className="npc-dialogo-texto">
                            No pude revisar mis puntos.
                        </div>
                    ) : (
                        <div className="npc-dialogo-texto">
                            Actualmente tengo{" "}
                            <strong>
                                {estadisticas
                                    ?.puntos_totales ??
                                    0}{" "}
                                puntos
                            </strong>{" "}
                            en el gremio.
                        </div>
                    )}

                    <button
                        className="npc-boton-continuar"
                        onClick={volverMenu}
                    >
                        Volver
                    </button>
                </div>
            )}

            {/* ARCHIVOS */}

            {modo === "archivos" && (
                <div className="npc-archivos">
                    <img
                        src="/recursos/imagenes/tablon_archivos.png"
                        className="npc-archivos-tablon"
                        alt=""
                        draggable="false"
                        aria-hidden="true"
                    />

                    <div className="npc-archivos-interfaz">
                        <div className="npc-archivos-cabecera">
                            <div>Archivos de {npc.nombre}</div>
                            <button
                                className="npc-cerrar-archivos"
                                onClick={volverMenu}
                                type="button"
                                aria-label="Cerrar archivos"
                            >
                                ×
                            </button>
                        </div>

                        <div className={`npc-archivos-visor ${fuegoActivo ? "npc-archivos-visor-en-movimiento" : ""}`}>
                            <div className="npc-lista-archivos" ref={visorArchivosRef} onScroll={alDesplazarArchivos}>

                            {cargandoArchivos ? (
                                <div className="npc-archivos-vacio">
                                    <div className="npc-archivo-icono">📜</div>
                                    <strong>Revisando el baúl...</strong>
                                    <p>Buscando las Quests completadas.</p>
                                </div>
                            ) : errorArchivos ? (
                                <div className="npc-archivos-vacio">
                                    <div className="npc-archivo-icono">⚠</div>
                                    <strong>No pude abrir el baúl</strong>
                                    <p>{errorArchivos}</p>
                                </div>
                            ) : archivos.length === 0 ? (
                                <div className="npc-archivos-vacio">
                                    <div className="npc-archivo-icono">📜</div>
                                    <strong>El baúl está vacío</strong>
                                    <p>{npc.nombre} todavía no tiene Quests completadas.</p>
                                </div>
                            ) : (
                                <div className="npc-archivos-grid">
                                    {archivos.map((mision) => {
                                        const numeroPergamino = obtenerPergamino(mision);
                                        const enlaceEntrega = mision.entrega?.enlace_drive
                                            ? normalizarEnlaceExterno(mision.entrega.enlace_drive)
                                            : "";
                                        const enlacePreview = obtenerEnlacePreviewDrive(
                                            mision.entrega?.enlace_drive
                                        );

                                        return (
                                            <article key={mision.id} className="npc-archivo-pergamino" data-pergamino={numeroPergamino}>
                                                <img
                                                    src={`/recursos/imagenes/quest/${numeroPergamino}.png`}
                                                    className="npc-archivo-pergamino-fondo"
                                                    alt=""
                                                    draggable="false"
                                                    aria-hidden="true"
                                                />

                                                <div className="npc-archivo-pergamino-contenido">
                                                    <div className="npc-archivo-quest-superior">
                                                        <span className="npc-archivo-categoria">
                                                            {mision.categoria_nombre || mision.categoria}
                                                        </span>
                                                        <span className="npc-archivo-puntos">
                                                            ★ {mision.recompensa_puntos} pts
                                                        </span>
                                                    </div>

                                                    <div className="npc-archivo-descripcion">
                                                        {mision.descripcion}
                                                    </div>

                                                    <div className="npc-archivo-preview">
                                                        {enlacePreview ? (
                                                            <iframe
                                                                src={enlacePreview}
                                                                title={`Entrega de Quest ${mision.id}`}
                                                                loading="lazy"
                                                                allow="autoplay"
                                                            />
                                                        ) : enlaceEntrega ? (
                                                            <div className="npc-archivo-preview-error">
                                                                No se puede previsualizar este enlace.
                                                            </div>
                                                        ) : (
                                                            <div className="npc-archivo-preview-error">
                                                                Sin entrega registrada.
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="npc-archivo-fechas">
                                                        <span>{formatearFechaCorta(mision.fecha_tomada)}</span>
                                                        <span className="npc-archivo-fecha-linea">—</span>
                                                        <span>{formatearFechaCorta(mision.fecha_entregada)}</span>
                                                    </div>

                                                    {enlaceEntrega ? (
                                                        <a
                                                            className="npc-archivo-abrir"
                                                            href={enlaceEntrega}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            Abrir entrega <span>↗</span>
                                                        </a>
                                                    ) : (
                                                        <div className="npc-archivo-sin-enlace">
                                                            Esta Quest no tiene un enlace de entrega.
                                                        </div>
                                                    )}
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                            <FuegoArchivosLigero visorRef={visorArchivosRef} />
                        </div>
                        {!cargandoArchivos && !errorArchivos && archivos.length > 0 && (
                            <div className="npc-archivos-controles" aria-label="Desplazamiento de archivos">
                                <button type="button" className="npc-archivos-flecha" disabled={!limitesArchivos.arriba}
                                    onPointerDown={() => iniciarFlecha(-1)} onPointerUp={detenerFlecha}
                                    onPointerLeave={detenerFlecha} onPointerCancel={detenerFlecha}
                                    onClick={() => clicFlecha(-1)} aria-label="Desplazar Quest hacia arriba">▲</button>
                                <div className="npc-archivos-controles-linea" aria-hidden="true" />
                                <button type="button" className="npc-archivos-flecha" disabled={!limitesArchivos.abajo}
                                    onPointerDown={() => iniciarFlecha(1)} onPointerUp={detenerFlecha}
                                    onPointerLeave={detenerFlecha} onPointerCancel={detenerFlecha}
                                    onClick={() => clicFlecha(1)} aria-label="Desplazar Quest hacia abajo">▼</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div
                className="npc-transicion"
                aria-hidden="true"
            />
        </main>
    );
}

export default NPC;