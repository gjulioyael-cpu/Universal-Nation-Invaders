// ==============================================================================
//                 EL MOTOR EXPLICADO CON PERAS Y MANZANAS 🍎🍏
//                 (EDICIÓN RPG: ESTADOS ALTERADOS + FIXED TIME STEP)
// ==============================================================================

// ==============================================================================
// 🧠 ZONA 0: LA MEMORIA A CORTO PLAZO (Variables)
// ==============================================================================
let partyJugador = ["MEPHIS", "SARAH"]; 
let reservaJugador = []; 
let heroesEnCombate = []; 
let enemigosEnCombate = []; 

let enemigoSeleccionadoParaAtacar = 0; 
let accionesEnemigasPendientes = []; 

const coloresID = {}; 
for (let key in DATOS_HEROES) { coloresID[key] = DATOS_HEROES[key].color; }

const musicaBatalla = new Audio(); musicaBatalla.loop = true; musicaBatalla.volume = 1.0;
const sfxBalazo = new Audio("balazo.mp3"); sfxBalazo.volume = 0.8;

// 🕹️ MANDOS Y PANTALLA
const canvas = document.getElementById("gameCanvas"); const ctx = canvas.getContext("2d");
const joystickZone = document.getElementById("joystickZone"), joystickKnob = document.getElementById("joystickKnob");
let joyVector = { x: 0, y: 0 }; const esMovil = ('ontouchstart' in window || navigator.maxTouchPoints > 0);

if (esMovil) {
    joystickZone.addEventListener("touchstart", manejarToqueJoystick, { passive: false });
    joystickZone.addEventListener("touchmove",  manejarToqueJoystick, { passive: false });
    joystickZone.addEventListener("touchend",   soltarJoystick,       { passive: false });
    joystickZone.addEventListener("touchcancel",soltarJoystick,       { passive: false });
}
function manejarToqueJoystick(e) { e.preventDefault(); let toque = e.targetTouches[0]; if(!toque)return; let rect=joystickZone.getBoundingClientRect(), rb=rect.width/2; let dx=toque.clientX-(rect.left+rb), dy=toque.clientY-(rect.top+rb); let d=Math.hypot(dx,dy), lim=rb-25; if(d>lim){dx=(dx/d)*lim; dy=(dy/d)*lim;} joystickKnob.style.transform=`translate(${dx}px,${dy}px)`; joyVector.x=dx/lim; joyVector.y=dy/lim; }
function soltarJoystick(e) { e.preventDefault(); joystickKnob.style.transform="translate(0,0)"; joyVector={x:0,y:0}; }

const PISO_Y = 360; 
let estadoJuego = "MUNDO"; 
let tiempoAnim = 0, timerShock = 0, frameDesliz = 0, timerFade = 0;
const FRAMES_DESLIZ = 60; 
let camara = { x: 0, y: 0, zoom: 1, amp: 4, freqX: 0.05, freqY: 0.07, tiempo: 0 };
let targetLookX = 350, targetLookY = 225, targetZoom = 1.0, lookX = 350, lookY = 225, screenShake = 0;
const keys = { w:false, a:false, s:false, d:false, ArrowUp:false, ArrowDown:false, ArrowLeft:false, ArrowRight:false, Enter:false };

let animacionTurno = null; 

// 🏥 ZONA MÉDICA
let listaEnfermos = [];
let indiceEnfermoActual = 0;

let enemigoActual = null; let boss = { hp: 0, maxHp: 0, color: "#ff0000" };
let ordenTurnos = [], turnoActualIndex = 0, heroesPendientes = [];
let impactosBoss = [], textoOverworld = "", mensajeTurno = "", esperandoClic = false;
let isDragging = false, trazoAtaque = [], efectosGolpe = [], textosFlotantes = [];
let enemigoGolpeado = false, timerGolpe = 0, timerAtaqueFase = 0, danoAcumulado = 0, cooldownGolpe = 0, timerMostrarDano = 0;
let lastSwipeX = 0, lastSwipeY = 0;

const playerMundo  = { x: 300, y: 220, size: 25, speed: 4, color: "#00ffff" };
const enemyMundo   = { x: 450, y: 220, size: 25, color: "#ff0000" };
const enemyCombate = { x: 0, y: PISO_Y, targetX: 480, startX: 0, sizeX: 40, sizeY: 80, color: "#ff0000", shake: 0 };

// ==============================================================================
// ⚙️ ZONA 1: CREACIÓN DE COMBATE 
// ==============================================================================

function calcularAtaquesEnemigo(en) {
    let baseId = en.id.substring(0, en.id.lastIndexOf('_')); 
    let datos = CATALOGO_ENEMIGOS[baseId];
    if (!datos) return 1;

    let regla = TIPOS_DE_COMBATE[datos.tipoCombate] || TIPOS_DE_COMBATE["NORMAL"];
    if (regla.calculo_ataques === "POR_PARTY") { return heroesEnCombate.filter(h => h.estado === "VIVO").length; } 
    else if (regla.calculo_ataques === "CERO") { return 0; }
    return datos.acciones_por_ronda || 1;
}

function generarEstadoParty() {
    heroesEnCombate = partyJugador.map((id, index) => {
        let d = DATOS_HEROES[id]; 
        let visual = { x: 0, y: PISO_Y, targetX: 180 - (index * 40), startX: 0, sizeX: 25, sizeY: 55, color: d.color };
        return {
            id: id, nombre: d.nombre, hp: d.hp, maxHp: d.maxHp, color: d.color, tipo_ataque: d.tipo_ataque,
            accion: "NADA", estado: "VIVO", turnosCaido: 0, shake: 0, flash: 0, offsetX: 0, offsetY: 0,
            scaleY: 1, targetOffsetX: 0, targetScaleY: 1, velY: 0, visual: visual,
            estadoAlterado: null, turnosEstado: 0, nuevoEstadoPendiente: null, mostrarX: 0
        };
    });
}

function iniciarCombate(idEnemigo) {
    const datos = CATALOGO_ENEMIGOS[idEnemigo];
    if (!datos) return;
    enemigoActual = datos;
    enemyCombate.sizeX = datos.tamano.x; enemyCombate.sizeY = datos.tamano.y; enemyCombate.color = datos.color;

    enemigosEnCombate = [];
    let regla = TIPOS_DE_COMBATE[datos.tipoCombate] || TIPOS_DE_COMBATE["NORMAL"];
    let cant = regla.horda_permitida ? (datos.cantidad_enemigos || 1) : 1; 
    
    let puntoDePartida = 480; 
    for (let i = 0; i < cant; i++) {
        enemigosEnCombate.push({
            id: datos.id + "_" + i, nombre: datos.nombre + (cant > 1 ? (" " + (i+1)) : ""),
            hp: datos.hp, maxHp: datos.hp, x: enemyMundo.x, y: PISO_Y, startX: enemyMundo.x, 
            targetX: puntoDePartida + (i * (datos.tamano.x + 30)), sizeX: datos.tamano.x, sizeY: datos.tamano.y,
            color: datos.color, shake: 0, velocidadReserva: datos.velocidadReserva || 2.5,
            mecanica: datos.mecanica_especial,
            estadoAlterado: null, turnosEstado: 0, nuevoEstadoPendiente: null, mostrarX: 0
        });
        coloresID[datos.id + "_" + i] = datos.color; 
    }
    enemigoSeleccionadoParaAtacar = 0;
    boss.hp = enemigosEnCombate.reduce((s, e) => s + e.hp, 0); boss.maxHp = boss.hp; boss.color = datos.color;
    musicaBatalla.pause(); musicaBatalla.src = datos.musica; musicaBatalla.currentTime = 0;
    textoOverworld = "";
}

function resetGame() {
    playerMundo.x = 300; playerMundo.y = 220; enemyMundo.x  = 450; enemyMundo.y  = 220;
    impactosBoss = []; trazoAtaque = []; efectosGolpe = []; textosFlotantes = [];
    camara.zoom = 1; lookX = 350; lookY = 225;
    estadoJuego = "MUNDO"; timerFade = 0; animacionTurno = null;
    textoOverworld = enemigoActual ? (enemigoActual.texto_revancha || "¿Volver a luchar?") : "¿Quieres volver a luchar?";
    musicaBatalla.pause(); musicaBatalla.currentTime = 0;
}

// ==============================================================================
// 🖱️ ZONA 2: INPUTS Y BOTONES (La magia de los Clics)
// ==============================================================================

function avanzarDialogo(e) {
    if (estadoJuego === "GAME_OVER") { resetGame(); if (e && e.target !== joystickZone) e.stopPropagation(); return true; }
    if (!esperandoClic) return false; 
    esperandoClic = false; mensajeTurno = ""; 

    if (estadoJuego === "COMBATE_INTRO") iniciarFaseSeleccion();
    else if (estadoJuego === "VICTORIA") { estadoJuego = "FADE_OUT"; timerFade = 60; }
    
    // 🛡️ COMBATE NORMAL (ZONA SEGURA)
    else if (estadoJuego === "COMBATE_RESOLUCION" && animacionTurno) {
        if (animacionTurno.paso === "GAME_OVER_MSG") { estadoJuego = "GAME_OVER"; animacionTurno = null; }
        else if (animacionTurno.paso === "IMPACTO_BOSS") terminarTurnoBoss();
        else if (animacionTurno.paso === "MENSAJE_HEROE" || animacionTurno.paso === "MENSAJE") terminarTurnoHeroe();
        else if (animacionTurno.paso === "PRE_ATAQUE_HEROE") { 
            let tipo = animacionTurno.tipoMinijuego; animacionTurno = null; iniciarMinijuego(tipo); 
        }
        else if (animacionTurno.paso === "PRE_ATAQUE_BOSS") {
            animacionTurno.paso = "CARGAR_BOSS"; animacionTurno.timer = 45;
        }
        // ❌ NEGACIÓN DE ATAQUE O ESCUDO
        else if (animacionTurno.paso === "MENSAJE_ATURDIDO") {
            animacionTurno = null; 
            turnoActualIndex++; // Se quema la moneda del turno
            ejecutarTurno(); 
        }
        // ❌ NEGACIÓN DE ESQUIVE
        else if (animacionTurno.paso === "MENSAJE_FALLA_ESQUIVE") {
            // Saltamos directo a que el jefe tire el ataque, ignorando el minijuego de deslizar
            animacionTurno.paso = "ATAQUE_ACTIVO_BOSS"; animacionTurno.timer = 150; 
        }
    }
    // 🦠 ZONA DE CONTAGIO
    else if (estadoJuego === "MENSAJE_CONTAGIO") {
        if (animacionTurno && animacionTurno.paso === "FIN_ESQUIVE") {
            terminarTurnoBoss(); 
        } else {
            estadoJuego = "COMBATE_RESOLUCION"; turnoActualIndex++; ejecutarTurno(); 
        }
    }
    // 🩺 ZONA MÉDICA
    else if (estadoJuego === "APLICAR_EFECTOS") {
        procesarSiguienteEnfermo(); 
    }

    if (e && e.target !== joystickZone) e.stopPropagation(); return true;
}

window.addEventListener("pointerdown", (e) => { if (avanzarDialogo(e)) return; }, true);

canvas.addEventListener("pointerdown", (e) => {
    if (esperandoClic || estadoJuego === "GAME_OVER" || estadoJuego === "FADE_OUT") return;
    lastSwipeX = e.clientX; lastSwipeY = e.clientY;
    const rect = canvas.getBoundingClientRect();
    let sx = (e.clientX - rect.left) * (canvas.width  / rect.width), sy = (e.clientY - rect.top)  * (canvas.height / rect.height);
    let wx = (sx - camara.x) / camara.zoom, wy = (sy - camara.y) / camara.zoom;

    if (estadoJuego === "COMBATE_SELECCION" && heroesPendientes.length > 0) {
        let act = heroesEnCombate.find(h => h.id === heroesPendientes[0]);
        if (act && act.estado === "VIVO") {
            let clickedEnemy = false;
            for (let i = 0; i < enemigosEnCombate.length; i++) {
                let en = enemigosEnCombate[i]; if (en.hp <= 0) continue;
                if (wx >= en.x-10 && wx <= en.x+en.sizeX+10 && wy >= en.y-en.sizeY-10 && wy <= en.y+10) { enemigoSeleccionadoParaAtacar = i; clickedEnemy = true; break; }
            }
            if (!clickedEnemy) {
                if (sx > 50 && sx < 300 && sy > canvas.height-150 && sy < canvas.height-30) registrarAccionJugador("ESCUDO");
                else if (sx > canvas.width-300 && sx < canvas.width-50 && sy > canvas.height-150 && sy < canvas.height-30) registrarAccionJugador("ATAQUE");
            }
        }
    } 
    else if (estadoJuego === "ATAQUE_TRAZO") { isDragging = true; agregarPuntoTrazo(wx, wy); } 
    else if (estadoJuego === "ATAQUE_TAP") {
        let obj = enemigosEnCombate[enemigoSeleccionadoParaAtacar];
        if (obj && wx > obj.x-15 && wx < obj.x+obj.sizeX+15 && wy > obj.y-obj.sizeY-15 && wy < obj.y+15) { 
            let dmg = DATOS_ATAQUES["PUNETAZO"].dano; 
            aplicarDanoBoss(dmg, wx, wy); efectosGolpe.push({x: wx, y: wy, life: 10, maxLife: 10}); 
            intentarAplicarEstado("PUNETAZO", obj);
        }
    }
});

canvas.addEventListener("pointermove", (e) => {
    const rect = canvas.getBoundingClientRect();
    let sx = (e.clientX - rect.left) * (canvas.width  / rect.width), sy = (e.clientY - rect.top)  * (canvas.height / rect.height);
    let wx = (sx - camara.x) / camara.zoom, wy = (sy - camara.y) / camara.zoom;

    if (isDragging && estadoJuego === "ATAQUE_TRAZO") { agregarPuntoTrazo(wx, wy); comprobarCorteAlEnemigo(wx, wy); }
    if (estadoJuego === "COMBATE_RESOLUCION" && animacionTurno && (animacionTurno.paso === "PRE_ESQUIVE" || animacionTurno.paso === "ATAQUE_ACTIVO_BOSS")) {
        let dx = e.clientX - lastSwipeX, dy = e.clientY - lastSwipeY;
        if (Math.hypot(dx, dy) > 40) {
            let tObj = animacionTurno.targetRef;
            if (tObj.estadoAlterado !== "CONTUSION") {
                if (Math.abs(dx) > Math.abs(dy)) { tObj.targetOffsetX = dx > 0 ? 80 : -80; } 
                else { if (dy > 0) tObj.targetScaleY = 0.4; else if (tObj.offsetY >= -5) tObj.velY = -14; } 
            }
            lastSwipeX = e.clientX; lastSwipeY = e.clientY;
        }
    }
});
canvas.addEventListener("pointerup", () => { isDragging = false; });
window.addEventListener("keydown", e => { if (keys.hasOwnProperty(e.key)) keys[e.key] = true; if (e.key === "Enter") avanzarDialogo(e); });
window.addEventListener("keyup",   e => { if (keys.hasOwnProperty(e.key)) keys[e.key] = false; });

// ==============================================================================
// ⚔️ ZONA 3: MÁQUINA DE TURNOS (Director de la batalla)
// ==============================================================================

function iniciarFaseSeleccion() {
    estadoJuego = "COMBATE_SELECCION"; 
    ordenTurnos = []; 
    heroesPendientes = [...partyJugador]; 
    impactosBoss = []; accionesEnemigasPendientes = [];
    
    enemigosEnCombate.forEach((en, idx) => {
        if (en.hp > 0) {
            let cantAtks = calcularAtaquesEnemigo(en);
            for(let a = 0; a < cantAtks; a++) {
                let segs = (a === 0 && en.id.startsWith("C4C_T4C")) ? 0.1 : (en.velocidadReserva || 2.5);
                let frames = Math.max(1, Math.floor(segs * 60));
                accionesEnemigasPendientes.push({ id: `ENEMIGO_${idx}`, tiempoMax: frames, tiempoActual: frames });
            }
        }
    });
    if (enemigosEnCombate[enemigoSeleccionadoParaAtacar] && enemigosEnCombate[enemigoSeleccionadoParaAtacar].hp <= 0) {
        let n = enemigosEnCombate.findIndex(e => e.hp > 0);
        if (n !== -1) enemigoSeleccionadoParaAtacar = n;
    }
}

function registrarAccionJugador(accion) {
    if (heroesPendientes.length === 0) return;
    let heroeId = heroesPendientes.shift();
    let heroeObj = heroesEnCombate.find(h => h.id === heroeId);
    heroeObj.accion = accion; 
    
    if (accion === "OBJETO" || accion === "ULTI" || accion === "ESCUDO") ordenTurnos.unshift(heroeId); 
    else ordenTurnos.push(heroeId); 

    if (heroesPendientes.length === 0) {
        accionesEnemigasPendientes.forEach(acc => ordenTurnos.push(acc.id));
        accionesEnemigasPendientes = []; 
        iniciarFaseResolucion(); 
    }
}

function iniciarFaseResolucion() { 
    estadoJuego = "COMBATE_RESOLUCION"; turnoActualIndex = 0; ejecutarTurno(); 
}

function ejecutarTurno() {
    let todosMuertos = enemigosEnCombate.length > 0 ? enemigosEnCombate.every(en => en.hp <= 0) : (boss.hp <= 0);
    if (todosMuertos) { estadoJuego = "VICTORIA"; animacionTurno = null; mensajeTurno = enemigoActual ? enemigoActual.texto_victoria : "..."; esperandoClic = true; return; }
    
    if (turnoActualIndex >= ordenTurnos.length) { 
        estadoJuego = "APLICAR_EFECTOS"; 
        listaEnfermos = [...heroesEnCombate, ...enemigosEnCombate]; 
        indiceEnfermoActual = 0;
        procesarSiguienteEnfermo(); 
        return; 
    } 

    let turnoDe = ordenTurnos[turnoActualIndex]; mensajeTurno = "";

    // 🛑 EL GUARDIA DE SEGURIDAD (VIGILANCIA DE ATAQUE Y ESCUDO)
    let entidadActual = turnoDe.startsWith("ENEMIGO_") 
        ? enemigosEnCombate[parseInt(turnoDe.split("_")[1])] 
        : heroesEnCombate.find(h => h.id === turnoDe);

    if (entidadActual && entidadActual.hp > 0 && entidadActual.estadoAlterado === "CONTUSION") {
        entidadActual.mostrarX = 60; // ❌ ACTIVAR LA X DRAMÁTICA
        entidadActual.accion = "NADA"; // Se le cancela el escudo forzosamente
        entidadActual.turnosEstado--;
        
        let datosEfecto = ESTADOS_ALTERADOS["CONTUSION"];
        mensajeTurno = datosEfecto.mensaje_por_turno(entidadActual.nombre);
        
        if (entidadActual.turnosEstado <= 0) {
            mensajeTurno += `\n¡${entidadActual.nombre} se ha recuperado!`;
            entidadActual.estadoAlterado = null; 
        }
        
        animacionTurno = { paso: "MENSAJE_ATURDIDO", targetVisual: entidadActual.visual || null };
        esperandoClic = true;
        return; // SE DETIENE LA EJECUCIÓN, EL TURNO SE PIERDE
    }

    // 😈 INICIA TURNO DEL ENEMIGO (Normal)
    if (turnoDe.startsWith("ENEMIGO_")) {
        let idx = parseInt(turnoDe.split("_")[1]); let en = enemigosEnCombate[idx];
        if (en && en.hp > 0) {
            let vivosAhora = heroesEnCombate.filter(h => h.estado === "VIVO");
            if (vivosAhora.length === 0) {
                animacionTurno = { paso: "GAME_OVER_MSG", targetVisual: enemyCombate };
                mensajeTurno = "¡EL EQUIPO HA SIDO ANIQUILADO!"; esperandoClic = true;
            } else {
                let target = vivosAhora[Math.floor(Math.random() * vivosAhora.length)];
                let ataques = enemigoActual ? enemigoActual.ataques : ["LLUVIA"];
                let elegido = ataques[Math.floor(Math.random() * ataques.length)]; 
                
                let nomAtk = DATOS_ATAQUES[elegido] ? DATOS_ATAQUES[elegido].nombre : elegido;
                mensajeTurno = `¡Turno de ${en.nombre}!\nUtiliza ${nomAtk}.`;
                animacionTurno = { paso: "PRE_ATAQUE_BOSS", targetRef: target, obstaculos: [], atacanteActual: en, ataqueElegido: elegido };
                esperandoClic = true;
            }
        } else { terminarTurnoBoss(); return; } 
    }
    // 🦸‍♂️ INICIA TURNO DEL HÉROE (Normal)
    else {
        let char = heroesEnCombate.find(h => h.id === turnoDe);
        if (char.estado === "CAIDO") {
            char.turnosCaido--;
            if (char.turnosCaido <= 0) { char.hp = Math.floor(char.maxHp / 2); char.estado = "VIVO"; char.accion = "NADA"; mensajeTurno = `¡${char.nombre} se ha recuperado!`; }
            else { mensajeTurno = `${char.nombre} está débil...`; }
            animacionTurno = { paso: "MENSAJE_HEROE", targetVisual: char.visual }; esperandoClic = true;
        } 
        else if (char.accion === "ESCUDO") {
            mensajeTurno = `${char.nombre} mantiene la guardia firme.`; 
            animacionTurno = { paso: "MENSAJE_HEROE", targetVisual: char.visual }; esperandoClic = true;
        } 
        else if (char.accion === "ATAQUE") { 
            let idAtk = char.tipo_ataque === "TRAZO" ? "CORTE" : "PUNETAZO";
            let nomAtk = DATOS_ATAQUES[idAtk] ? DATOS_ATAQUES[idAtk].nombre : idAtk;
            mensajeTurno = `¡Turno de ${char.nombre}!\nUtiliza ${nomAtk}.`;
            animacionTurno = { paso: "PRE_ATAQUE_HEROE", targetVisual: char.visual, tipoMinijuego: `ATAQUE_${char.tipo_ataque}` }; 
            esperandoClic = true;
        } 
    }
}
function terminarTurnoBoss()  { animacionTurno = null; turnoActualIndex++; ejecutarTurno(); }
function terminarTurnoHeroe() { animacionTurno = null; turnoActualIndex++; ejecutarTurno(); }

// ==============================================================================
// 💥 ZONA 4: DAÑO, MINIJUEGOS Y EFECTOS
// ==============================================================================

function intentarAplicarEstado(idAtaque, victima) {
    if (!victima || victima.hp <= 0) return; 
    let ataque = DATOS_ATAQUES[idAtaque];
    if (!ataque || !ataque.pasiva) return; 
    
    let pasiva = PASIVAS_DE_ATAQUES[ataque.pasiva];
    if (!pasiva) return;

    if (Math.random() <= pasiva.Probabilidad) {
        victima.nuevoEstadoPendiente = pasiva.Efecto; 
        victima.estadoAlterado = pasiva.Efecto;
        
        let datosEfecto = ESTADOS_ALTERADOS[pasiva.Efecto];
        if (Array.isArray(datosEfecto.turnos)) {
            let min = datosEfecto.turnos[0], max = datosEfecto.turnos[1];
            victima.turnosEstado = Math.floor(Math.random() * (max - min + 1)) + min;
        } else if (typeof datosEfecto.turnos === 'number') {
            victima.turnosEstado = datosEfecto.turnos;
        } else {
            victima.turnosEstado = 3; 
        }
    }
}

function procesarSiguienteEnfermo() {
    if (indiceEnfermoActual >= listaEnfermos.length) {
        iniciarFaseSeleccion();
        return;
    }

    let paciente = listaEnfermos[indiceEnfermoActual];
    indiceEnfermoActual++; 

    if (paciente && paciente.hp > 0 && paciente.estadoAlterado) {
        let datosEfecto = ESTADOS_ALTERADOS[paciente.estadoAlterado];
        if (!datosEfecto) { procesarSiguienteEnfermo(); return; } 

        if (datosEfecto.tipo === "DANO_POR_TURNO") {
            let dmg = datosEfecto.dmg || 0;
            paciente.hp -= dmg;
            if (paciente.hp <= 0) paciente.hp = 0; 
            
            if (paciente.id.startsWith("C4C") || paciente.id.startsWith("SLIME") || paciente.id.startsWith("GOLEM")) {
                boss.hp = enemigosEnCombate.reduce((sum, en) => sum + en.hp, 0); 
            } else if (paciente.hp === 0) {
                paciente.estado = "CAIDO"; paciente.turnosCaido = 3; paciente.accion = "CAIDO";
            }
            
            let px = paciente.visual ? paciente.visual.x : paciente.x;
            let py = paciente.visual ? paciente.visual.y - 30 : paciente.y - 30;
            textosFlotantes.push({ texto: dmg, color: "#9900ff", x: px + 10, y: py, velY: -1, life: 60, maxLife: 60 });
            
            mensajeTurno = datosEfecto.mensaje_por_turno(paciente.nombre, dmg);

            paciente.turnosEstado--;
            if (paciente.turnosEstado <= 0) {
                mensajeTurno += `\n¡El efecto ha terminado!`;
                paciente.estadoAlterado = null; 
            }
            
            esperandoClic = true; 
        } 
        else {
            procesarSiguienteEnfermo(); 
        }
    } else {
        procesarSiguienteEnfermo();
    }
}

function agregarPuntoTrazo(wx, wy) { trazoAtaque.push({x: wx, y: wy, life: 15, maxLife: 15}); }

function aplicarDanoBoss(dano, x, y) {
    enemigoGolpeado = true; timerGolpe = 6; screenShake = 5; danoAcumulado += dano;
    if (enemigosEnCombate.length > 0) {
        let obj = enemigosEnCombate[enemigoSeleccionadoParaAtacar];
        if (obj && obj.hp > 0) {
            obj.hp -= dano; if (obj.hp < 0) obj.hp = 0; 
            boss.hp = enemigosEnCombate.reduce((sum, en) => sum + en.hp, 0); 
            if (obj.hp <= 0) { let nA = enemigosEnCombate.findIndex(e => e.hp > 0); if (nA !== -1) enemigoSeleccionadoParaAtacar = nA; }
        }
    }
    textosFlotantes.push({ texto: dano, color: "#ffcc00", x: x + (Math.random()*40-20), y: y + (Math.random()*40-20), velY: -1 - Math.random(), life: 40, maxLife: 40 });
}

function aplicarDanoHeroe(heroeObj, dano) {
    heroeObj.hp -= dano; heroeObj.shake = 15; heroeObj.flash = 20; screenShake = 15; let visual = heroeObj.visual;
    textosFlotantes.push({ texto: dano, color: "#ff0000", x: visual.x + visual.sizeX/2, y: visual.y + heroeObj.offsetY - visual.sizeY, velY: -2, life: 60, maxLife: 60 });
    if (heroeObj.hp <= 0) { heroeObj.hp = 0; heroeObj.estado = "CAIDO"; heroeObj.turnosCaido = 3; heroeObj.accion = "CAIDO"; }
}

function comprobarCorteAlEnemigo(wx, wy) {
    if (cooldownGolpe > 0) return; let obj = enemigosEnCombate[enemigoSeleccionadoParaAtacar];
    if (obj && wx > obj.x && wx < obj.x + obj.sizeX && wy > obj.y - obj.sizeY && wy < obj.y) {
        if (trazoAtaque.length > 2) {
            let p1 = trazoAtaque[trazoAtaque.length - 1], p2 = trazoAtaque[trazoAtaque.length - 3];
            if (Math.hypot(p1.x - p2.x, p1.y - p2.y) > 5) { 
                let dmg = DATOS_ATAQUES["CORTE"].dano; 
                aplicarDanoBoss(dmg, wx, wy); cooldownGolpe = 12; 
                intentarAplicarEstado("CORTE", obj);
            }
        }
    }
}

function iniciarMinijuego(tipo) { estadoJuego = tipo; timerAtaqueFase = 60 * 5; danoAcumulado = 0; cooldownGolpe = 0; enemigoGolpeado = false; trazoAtaque = []; efectosGolpe = []; textosFlotantes = []; }

function crearObstaculo(idAtaque, targetVisual) {
    let tx = targetVisual.x + targetVisual.sizeX/2, ty = targetVisual.y;
    let obs = { tipo: idAtaque, hit: false, life: 0, warning: 30, targetX: tx, targetY: ty };
    let origenAtk = animacionTurno.atacanteActual || enemyCombate;
    
    let datosAtk = DATOS_ATAQUES[idAtaque] || DATOS_ATAQUES["LLUVIA"]; 
    if (datosAtk.tipo_obstaculo === "CAIDA") { obs.x = tx - 12 + (Math.random()*24-12); obs.y = ty - 400; obs.width = 25; obs.height = 40; obs.velY = datosAtk.velocidad || 16; obs.maxLife = 60; } 
    else if (datosAtk.tipo_obstaculo === "BARRIDO") { obs.x = origenAtk.x; obs.y = ty - 35; obs.width = 30; obs.height = 30; obs.velX = datosAtk.velocidad || -18; obs.maxLife = 60; } 
    else if (datosAtk.tipo_obstaculo === "SUELO") { obs.x = tx - 35; obs.y = ty + 5; obs.width = 70; obs.height = 0; obs.maxLife = 45; }
    return obs;
}

// ==============================================================================
// ⏱️ ZONA 5: BUCLE PRINCIPAL / UPDATE() 
// ==============================================================================
function update() {
    joystickZone.style.display = (estadoJuego === "MUNDO" && esMovil) ? "block" : "none";
    if (estadoJuego !== "MUNDO") { joyVector.x = 0; joyVector.y = 0; }

    if (estadoJuego === "MUNDO") {
        playerMundo.x += joyVector.x * playerMundo.speed; playerMundo.y += joyVector.y * playerMundo.speed;
        if (keys.ArrowUp || keys.w) playerMundo.y -= playerMundo.speed; if (keys.ArrowDown || keys.s) playerMundo.y += playerMundo.speed;
        if (keys.ArrowLeft || keys.a) playerMundo.x -= playerMundo.speed; if (keys.ArrowRight|| keys.d) playerMundo.x += playerMundo.speed;

        if (Math.abs(playerMundo.x - enemyMundo.x) < playerMundo.size && Math.abs(playerMundo.y - enemyMundo.y) < playerMundo.size) {
            generarEstadoParty(); iniciarCombate("C4C_T4C"); estadoJuego = "CONGELADO"; timerShock = 60;
            heroesEnCombate.forEach(h => { h.visual.startX = playerMundo.x; h.visual.x = playerMundo.x; });
            enemyCombate.startX = enemyMundo.x; enemyCombate.x = enemyCombate.startX;
        }
    }
    else if (estadoJuego === "CONGELADO") { timerShock--; if (timerShock <= 0) { estadoJuego = "TRANSICION"; frameDesliz = 0; lookX = 350; lookY = 225; camara.zoom = 1.0; } }
    else if (estadoJuego === "TRANSICION") {
        frameDesliz++; let t = frameDesliz / FRAMES_DESLIZ; let ease = 1 - Math.pow(1 - t, 3);
        if (t >= 1) { estadoJuego = "COMBATE_INTRO"; esperandoClic = true; }
        heroesEnCombate.forEach(h => { h.visual.x = h.visual.startX + ease * (h.visual.targetX - h.visual.startX); });
        enemyCombate.x = enemyCombate.startX + ease * (enemyCombate.targetX - enemyCombate.startX);
        enemigosEnCombate.forEach(en => { en.x = en.startX + ease * (en.targetX - en.startX); });
        musicaBatalla.play().catch(e => console.log(e));
    }
    else if (estadoJuego === "FADE_OUT") { timerFade--; if (timerFade <= 0) resetGame(); }
    
    else if (estadoJuego !== "MUNDO" && estadoJuego !== "GAME_OVER") {
        tiempoAnim += 0.15;
        
        heroesEnCombate.forEach(p => {
            if (p.flash > 0) p.flash--; if (p.shake > 0.5) p.shake *= 0.85; else p.shake = 0;
            if (p.mostrarX > 0) p.mostrarX--; 
            if (p.estado !== "VIVO") return;
            p.offsetX += (p.targetOffsetX - p.offsetX) * 0.25; p.targetOffsetX *= 0.85; p.offsetY += p.velY;
            if (p.offsetY < 0) p.velY += 1.5; else { p.offsetY = 0; p.velY = 0; }
            p.scaleY += (p.targetScaleY - p.scaleY) * 0.3; p.targetScaleY += (1 - p.targetScaleY) * 0.15;
        });
        enemigosEnCombate.forEach(en => {
            if (en.mostrarX > 0) en.mostrarX--; 
        });

        for (let i = textosFlotantes.length - 1; i >= 0; i--) { textosFlotantes[i].y += textosFlotantes[i].velY; textosFlotantes[i].life--; if (textosFlotantes[i].life <= 0) textosFlotantes.splice(i, 1); }

        if (estadoJuego === "COMBATE_SELECCION") {
            if (heroesPendientes.length > 0) {
                let actual = heroesEnCombate.find(h => h.id === heroesPendientes[0]);
                if (actual && actual.estado === "CAIDO") registrarAccionJugador("CAIDO");
                else if (actual) { targetLookX = actual.visual.x + actual.visual.sizeX/2; targetLookY = actual.visual.y - actual.visual.sizeY/2; targetZoom  = 1.5; }
            }
            if (accionesEnemigasPendientes.length > 0) {
                let acc = accionesEnemigasPendientes[0]; acc.tiempoActual--;
                if (acc.tiempoActual <= 0) {
                    ordenTurnos.push(acc.id); accionesEnemigasPendientes.shift();
                    let idx = parseInt(acc.id.split("_")[1]); let enemigoFisico = enemigosEnCombate[idx];
                    
                    if (enemigoFisico && enemigoFisico.mecanica) {
                        let pasiva = HABILIDADES_PASIVAS[enemigoFisico.mecanica];
                        if (pasiva && pasiva.tipo === "ROBO_TURNO_BALAZO") {
                            impactosBoss.push({ x: canvas.width - 175 + (Math.random()*80-40), y: canvas.height - 90  + (Math.random()*40-20), rotacion: Math.random() * Math.PI, frameTexto: 30 });
                            if (pasiva.sfx) { let s = new Audio(pasiva.sfx); s.volume = pasiva.volumen; s.play().catch(e => console.log("")); }
                        }
                    }
                }
            }
        }
        
        else if (estadoJuego === "COMBATE_RESOLUCION") {
            if (animacionTurno) {
                let objTarget = animacionTurno.targetRef; let objVisual = objTarget ? objTarget.visual : null; let atacanteActual = animacionTurno.atacanteActual || enemyCombate;

                if (animacionTurno.paso === "PRE_ATAQUE_BOSS") { targetLookX = atacanteActual.x + atacanteActual.sizeX/2; targetLookY = atacanteActual.y - atacanteActual.sizeY/2; targetZoom  = 1.4; }
                else if (animacionTurno.paso === "MENSAJE_HEROE" || animacionTurno.paso === "MENSAJE" || animacionTurno.paso === "PRE_ATAQUE_HEROE") { targetLookX = animacionTurno.targetVisual.x + animacionTurno.targetVisual.sizeX/2; targetLookY = animacionTurno.targetVisual.y - animacionTurno.targetVisual.sizeY/2; targetZoom  = 1.4; }
                else if (animacionTurno.paso === "CARGAR_BOSS") {
                    animacionTurno.timer--; targetLookX = atacanteActual.x + atacanteActual.sizeX/2; targetLookY = atacanteActual.y - atacanteActual.sizeY/2; targetZoom  = 1.4;
                    atacanteActual.shake = (Math.random()*10) - 5;
                    if (animacionTurno.timer <= 0) {
                        atacanteActual.shake = 0;
                        if (objTarget && objTarget.accion === "ESCUDO") { 
                            animacionTurno.paso = "IMPACTO_BOSS"; mensajeTurno = `¡${objTarget.nombre} aguantó el ataque!`; objTarget.shake = 5; esperandoClic = true; 
                        } 
                        // ❌ INTERCEPTACIÓN DE ESQUIVE
                        else if (objTarget && objTarget.estadoAlterado === "CONTUSION") {
                            objTarget.mostrarX = 60; // X DRAMÁTICA
                            objTarget.turnosEstado--;
                            mensajeTurno = `¡${objTarget.nombre} está aturdido y no puede esquivar!`;
                            
                            if (objTarget.turnosEstado <= 0) {
                                mensajeTurno += `\n¡Se ha recuperado!`;
                                objTarget.estadoAlterado = null;
                            }
                            
                            animacionTurno.paso = "MENSAJE_FALLA_ESQUIVE";
                            esperandoClic = true;
                        }
                        else { 
                            animacionTurno.paso = "PRE_ESQUIVE"; animacionTurno.timer = 60; 
                        }
                    }
                }
                else if (animacionTurno.paso === "PRE_ESQUIVE") {
                    targetLookX = objVisual.x + objVisual.sizeX/2; targetLookY = objVisual.y - objVisual.sizeY/2; targetZoom  = 1.4;
                    animacionTurno.timer--; if (animacionTurno.timer <= 0) { animacionTurno.paso  = "ATAQUE_ACTIVO_BOSS"; animacionTurno.timer = 150; }
                }
                else if (animacionTurno.paso === "ATAQUE_ACTIVO_BOSS") { 
                    targetLookX = objVisual.x + objVisual.sizeX/2; targetLookY = objVisual.y - objVisual.sizeY/2; targetZoom  = 1.3; animacionTurno.timer--;

                    if (animacionTurno.timer === 150 || animacionTurno.timer === 100 || animacionTurno.timer === 50) {
                        let elegido = animacionTurno.ataqueElegido || "LLUVIA"; animacionTurno.obstaculos.push(crearObstaculo(elegido, objVisual)); atacanteActual.shake = 10;
                    }

                    let rectPj = { left: objVisual.x + objTarget.offsetX, right: objVisual.x + objTarget.offsetX + objVisual.sizeX, top: objVisual.y + objTarget.offsetY - (objVisual.sizeY * objTarget.scaleY), bottom: objVisual.y + objTarget.offsetY };

                    for (let i = animacionTurno.obstaculos.length - 1; i >= 0; i--) {
                        let obs = animacionTurno.obstaculos[i]; if (obs.warning > 0) { obs.warning--; continue; } obs.life++;
                        let datosAtk = DATOS_ATAQUES[obs.tipo] || DATOS_ATAQUES["LLUVIA"];

                        if (datosAtk.tipo_obstaculo === "CAIDA") obs.y += obs.velY; else if (datosAtk.tipo_obstaculo === "BARRIDO") obs.x += obs.velX; else if (datosAtk.tipo_obstaculo === "SUELO") { if (obs.life < 10) obs.height = Math.min(30, obs.height + 6); else if (obs.life > 35) obs.height = Math.max(0, obs.height - 6); }
                        if (obs.life > obs.maxLife) { animacionTurno.obstaculos.splice(i, 1); continue; }
                        
                        if (!obs.hit && obs.height > 0) {
                            let rL = obs.x, rR = obs.x + obs.width, rT = obs.y - obs.height, rB = obs.y;
                            if (rectPj.left < rR && rectPj.right > rL && rectPj.top < rB && rectPj.bottom > rT) {
                                obs.hit = true; let esDodge = Math.abs(objTarget.offsetX) > 20 || objTarget.offsetY < -10 || objTarget.scaleY < 0.8;
                                let dmg = esDodge ? datosAtk.dano_esquivado : datosAtk.dano;
                                aplicarDanoHeroe(objTarget, dmg);
                                intentarAplicarEstado(obs.tipo, objTarget);
                            }
                        }
                    }
                    if (animacionTurno.timer <= 0) { animacionTurno.paso  = "FIN_ESQUIVE"; animacionTurno.timer = 30; }
                }
                else if (animacionTurno.paso === "FIN_ESQUIVE") { 
                    animacionTurno.timer--; 
                    if (animacionTurno.timer <= 0) { 
                        if (objTarget && objTarget.nuevoEstadoPendiente) {
                            estadoJuego = "MENSAJE_CONTAGIO";
                            let ef = ESTADOS_ALTERADOS[objTarget.nuevoEstadoPendiente];
                            mensajeTurno = ef ? ef.primer_mensaje(objTarget.nombre) : `¡${objTarget.nombre} infectado!`;
                            esperandoClic = true;
                            objTarget.nuevoEstadoPendiente = null;
                        } else {
                            terminarTurnoBoss(); 
                        }
                    } 
                }
            } else { targetLookX = 350; targetLookY = 225; targetZoom = 1.0; }
        }
        
        else if (estadoJuego.startsWith("ATAQUE_")) {
            let obj = enemigosEnCombate[enemigoSeleccionadoParaAtacar]; if (obj) { targetLookX = obj.x + obj.sizeX/2; targetLookY = obj.y - obj.sizeY/2; }
            targetZoom  = 1.3; timerAtaqueFase--; if (cooldownGolpe > 0) cooldownGolpe--;
            for (let i = trazoAtaque.length-1;  i >= 0; i--) { trazoAtaque[i].life--;  if (trazoAtaque[i].life  <= 0) trazoAtaque.splice(i, 1); }
            for (let i = efectosGolpe.length-1; i >= 0; i--) { efectosGolpe[i].life--; if (efectosGolpe[i].life <= 0) efectosGolpe.splice(i, 1); }
            if (enemigoGolpeado) { timerGolpe--; if (timerGolpe <= 0) enemigoGolpeado = false; }
            
            if (timerAtaqueFase <= 0) { estadoJuego = "MOSTRAR_DANO"; timerMostrarDano = 90; isDragging = false; enemigoGolpeado = false; }
        }
        else if (estadoJuego === "MOSTRAR_DANO") { 
            targetLookX = 350; targetLookY = 225; targetZoom = 1.0; timerMostrarDano--; 
            if (timerMostrarDano <= 0) { 
                let jefe = enemigosEnCombate[enemigoSeleccionadoParaAtacar];
                if (jefe && jefe.nuevoEstadoPendiente) {
                    estadoJuego = "MENSAJE_CONTAGIO";
                    let ef = ESTADOS_ALTERADOS[jefe.nuevoEstadoPendiente];
                    mensajeTurno = ef ? ef.primer_mensaje(jefe.nombre) : `¡${jefe.nombre} infectado!`;
                    esperandoClic = true;
                    jefe.nuevoEstadoPendiente = null;
                } else {
                    estadoJuego = "COMBATE_RESOLUCION"; turnoActualIndex++; ejecutarTurno(); 
                }
            } 
        } 
        
        else { targetLookX = 350; targetLookY = 225; targetZoom = 1.0; }

        for (let imp of impactosBoss) { if (imp.frameTexto > 0) imp.frameTexto--; }
        lookX += (targetLookX - lookX) * 0.1; lookY += (targetLookY - lookY) * 0.1; camara.zoom += (targetZoom - camara.zoom) * 0.1; camara.tiempo++;
        let bX = (canvas.width/2)  - (lookX * camara.zoom), bY = (canvas.height/2) - (lookY * camara.zoom), shX = 0, shY = 0;
        if (screenShake > 0.5) { shX = (Math.random()-0.5) * screenShake; shY = (Math.random()-0.5) * screenShake; screenShake *= 0.9; }
        camara.x = bX + Math.sin(camara.tiempo * camara.freqX) * camara.amp + shX; camara.y = bY + Math.cos(camara.tiempo * camara.freqY) * camara.amp * 0.7 + shY;
    }
}

// ==============================================================================
// 🎨 ZONA 6: DIBUJO (El Pintor de la pantalla)
// ==============================================================================
function drawFondo(nombre, ctx, canvas) {
    const pisoCombateY = 360;
    if (nombre === "DESIERTO") {
        let grd = ctx.createLinearGradient(0, 0, 0, pisoCombateY); grd.addColorStop(0, "#e8cca6"); grd.addColorStop(0.8, "#c18c60"); ctx.fillStyle = grd; ctx.fillRect(-200, -200, canvas.width + 400, pisoCombateY + 200);
        ctx.fillStyle = "#8a5733"; ctx.fillRect(-200, pisoCombateY - 100, canvas.width + 400, 100); ctx.fillStyle = "#2e153e"; ctx.fillRect(-200, pisoCombateY, canvas.width + 400, canvas.height - pisoCombateY + 200); ctx.fillStyle = "#d08266"; ctx.fillRect(-200, pisoCombateY + 10, canvas.width + 400, 5);
    } else if (nombre === "BOSQUE") {
        let grd = ctx.createLinearGradient(0, 0, 0, pisoCombateY); grd.addColorStop(0, "#3a5a8c"); grd.addColorStop(0.7, "#5a8c60"); ctx.fillStyle = grd; ctx.fillRect(-200, -200, canvas.width + 400, pisoCombateY + 200);
        ctx.fillStyle = "#2d5a2d"; ctx.fillRect(-200, pisoCombateY - 80, canvas.width + 400, 80); ctx.fillStyle = "#1a3a1a"; ctx.fillRect(-200, pisoCombateY, canvas.width + 400, canvas.height - pisoCombateY + 200); ctx.fillStyle = "#4a8a4a"; ctx.fillRect(-200, pisoCombateY + 10, canvas.width + 400, 5);
    } else { ctx.fillStyle = "#1a1a2e"; ctx.fillRect(-200, -200, canvas.width + 400, canvas.height + 400); ctx.fillStyle = "#16213e"; ctx.fillRect(-200, pisoCombateY, canvas.width + 400, canvas.height + 200); }
}

function drawX_Dramatica(x, y, size) {
    ctx.strokeStyle = "rgba(170, 0, 255, 0.9)"; 
    ctx.lineWidth = 12; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x - size, y - size); ctx.lineTo(x + size, y + size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + size, y - size); ctx.lineTo(x - size, y + size); ctx.stroke();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (estadoJuego === "MUNDO" || estadoJuego === "CONGELADO") {
        ctx.fillStyle = estadoJuego === "MUNDO" ? "#2d4a22" : "black"; ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = playerMundo.color; ctx.fillRect(playerMundo.x, playerMundo.y, playerMundo.size, playerMundo.size);
        ctx.fillStyle = enemyMundo.color; ctx.fillRect(enemyMundo.x,  enemyMundo.y,  enemyMundo.size,  enemyMundo.size);
        if (textoOverworld !== "" && estadoJuego === "MUNDO") { ctx.fillStyle = "white"; ctx.font = "bold 16px Courier"; ctx.textAlign = "center"; ctx.fillText(textoOverworld, enemyMundo.x + enemyMundo.size/2, enemyMundo.y - 15); ctx.textAlign = "left"; }
    }
    else if (estadoJuego === "GAME_OVER") {
        ctx.fillStyle = "black"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "red"; ctx.font = "bold 60px Courier"; ctx.textAlign = "center"; ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2 - 20);
        ctx.fillStyle = "white"; ctx.font = "20px Courier"; ctx.fillText("Toca para reiniciar", canvas.width/2, canvas.height/2 + 40); ctx.textAlign = "left";
    }
    else {
        ctx.save(); ctx.translate(camara.x, camara.y); ctx.scale(camara.zoom, camara.zoom); drawEscenaCombate();

        if (estadoJuego === "COMBATE_RESOLUCION" && animacionTurno && (animacionTurno.paso === "PRE_ESQUIVE" || animacionTurno.paso === "ATAQUE_ACTIVO_BOSS" || animacionTurno.paso === "FIN_ESQUIVE")) {
            let tVis = animacionTurno.targetRef.visual; let cx = tVis.x + tVis.sizeX/2, cy = tVis.y - tVis.sizeY/2;
            ctx.fillStyle = "rgba(0,0,0,0.75)"; ctx.beginPath(); ctx.rect(-1000, -1000, 3000, 3000); ctx.arc(cx, cy, 80, 0, Math.PI*2, true); ctx.fill();
            if (animacionTurno.paso === "PRE_ESQUIVE") { ctx.fillStyle = "white"; ctx.strokeStyle = "red"; ctx.lineWidth = 3; ctx.font = "bold 30px Courier"; ctx.textAlign = "center"; ctx.strokeText("¡ESQUIVA!", cx, cy-80); ctx.fillText("¡ESQUIVA!", cx, cy-80); ctx.textAlign = "left"; }
        }
        if (estadoJuego === "COMBATE_RESOLUCION" && animacionTurno && (animacionTurno.paso === "ATAQUE_ACTIVO_BOSS" || animacionTurno.paso === "FIN_ESQUIVE")) drawObstaculos();

        if (estadoJuego === "ATAQUE_TRAZO" && trazoAtaque.length > 1) {
            for (let i = 1; i < trazoAtaque.length; i++) { let l = trazoAtaque[i].life / trazoAtaque[i].maxLife; ctx.beginPath(); ctx.moveTo(trazoAtaque[i-1].x, trazoAtaque[i-1].y); ctx.lineTo(trazoAtaque[i].x,   trazoAtaque[i].y); ctx.strokeStyle = `rgba(255, 0, 85, ${l})`; ctx.lineWidth = (1 + l*8) / camara.zoom; ctx.lineCap = "round"; ctx.stroke(); }
        }
        for (let tf of textosFlotantes) { let alfa = tf.life / tf.maxLife; ctx.fillStyle = tf.color; ctx.strokeStyle = `rgba(0,0,0,${alfa})`; ctx.lineWidth = 3; ctx.font = `bold ${15 + alfa*10}px Courier`; ctx.globalAlpha = alfa; ctx.strokeText(tf.texto, tf.x, tf.y); ctx.fillText(tf.texto, tf.x, tf.y); ctx.globalAlpha = 1.0; }
        if (estadoJuego === "MOSTRAR_DANO") {
            let obj = enemigosEnCombate[enemigoSeleccionadoParaAtacar]; if(obj){ let bx = obj.x + obj.sizeX/2, by = obj.y - obj.sizeY - 30; ctx.textAlign = "center"; ctx.fillStyle = "#ffcc00"; ctx.strokeStyle = "black"; ctx.lineWidth = 4; ctx.font = "bold 26px Courier"; ctx.strokeText("TOTAL: " + danoAcumulado, bx, by); ctx.fillText("TOTAL: " + danoAcumulado, bx, by); ctx.textAlign = "left"; }
        }
        ctx.restore();

        drawPlayerHP(); drawUIBossHealth();
        if      (estadoJuego === "COMBATE_SELECCION")  drawUISeleccion();
        else if (estadoJuego === "COMBATE_RESOLUCION" || estadoJuego === "MOSTRAR_DANO") drawTurnTimeline();
        else if (estadoJuego.startsWith("ATAQUE_"))    drawUIAtaque();

        drawImpactosBoss();
        if (estadoJuego === "FADE_OUT") { let alpha = 1 - (timerFade / 60); ctx.fillStyle = `rgba(0,0,0,${alpha})`; ctx.fillRect(0, 0, canvas.width, canvas.height); }
    }
    updateDialogHTML();
}

function drawEscenaCombate() {
    drawFondo(enemigoActual ? enemigoActual.fondo : "GENERICO", ctx, canvas); let respira = Math.sin(tiempoAnim) * 3;

    heroesEnCombate.forEach(h => {
        let vis = h.visual; let hx = vis.x + (h.shake || 0) + h.offsetX;
        let altoH = (h.estado === "CAIDO" ? vis.sizeY/2 : vis.sizeY) * h.scaleY;
        let flashH = h.flash > 0 && Math.floor(h.flash/3) % 2 === 0;
        
        let col = vis.color;
        if (h.estadoAlterado === "VENENO") col = "#88ff88"; 
        else if (h.estadoAlterado === "CONTUSION") col = "#aa88cc";

        ctx.fillStyle = flashH ? "white" : (h.estado === "CAIDO" ? "#442222" : col);
        let finalY = vis.y + h.offsetY - altoH - (h.estado==="CAIDO"?0:respira);
        ctx.fillRect(hx, finalY, vis.sizeX, altoH + (h.estado==="CAIDO"?0:respira));
        
        if (h.mostrarX > 0) drawX_Dramatica(hx + vis.sizeX/2, finalY + altoH/2, 20 + (Math.sin(h.mostrarX)*5));
    });

    if (enemigosEnCombate.length > 0) {
        enemigosEnCombate.forEach((en, index) => {
            if (en.hp <= 0) return; 
            let bx = en.x + (en.shake || 0);
            if (estadoJuego === "COMBATE_SELECCION" && enemigoSeleccionadoParaAtacar === index) { ctx.strokeStyle = "yellow"; ctx.lineWidth = 3; ctx.strokeRect(bx - 3, en.y - en.sizeY - respira - 3, en.sizeX + 6, en.sizeY + respira + 6); }
            
            let colJefe = en.color;
            if (en.estadoAlterado === "VENENO") colJefe = "#88ff88"; 
            else if (en.estadoAlterado === "CONTUSION") colJefe = "#aa88cc";

            ctx.fillStyle = (enemigoGolpeado && timerGolpe > 0 && enemigoSeleccionadoParaAtacar === index) ? "white" : colJefe; 
            let finalYBoss = en.y - en.sizeY - respira;
            ctx.fillRect(bx, finalYBoss, en.sizeX, en.sizeY + respira);
            
            if (en.mostrarX > 0) drawX_Dramatica(bx + en.sizeX/2, finalYBoss + en.sizeY/2, 30 + (Math.sin(en.mostrarX)*10));
        });
    }
    for (let ef of efectosGolpe) { ctx.beginPath(); ctx.arc(ef.x, ef.y, 5 + (ef.maxLife - ef.life)*3, 0, Math.PI*2); ctx.fillStyle = `rgba(255,255,100,${ef.life/ef.maxLife})`; ctx.fill(); }
}

function drawCactus(x, y, scale=1, rot=0) { ctx.save(); ctx.translate(x,y); ctx.rotate(rot); ctx.scale(scale,scale); ctx.fillStyle = "#87e376"; ctx.fillRect(-7.5,-40,15,40); ctx.fillRect(-22.5,-20,15,10); ctx.fillRect(7.5,-30,15,10); ctx.restore(); }

function drawObstaculos() {
    animacionTurno.obstaculos.forEach(obs => {
        let datosAtk = DATOS_ATAQUES[obs.tipo] || DATOS_ATAQUES["LLUVIA"]; 
        if (obs.warning > 0) {
            let op = (Math.floor(tiempoAnim*4)%2===0) ? 0.8 : 0.4; ctx.fillStyle = `rgba(255,0,0,${op})`; ctx.strokeStyle = "red"; ctx.lineWidth = 2;
            if (datosAtk.tipo_obstaculo === "CAIDA") { ctx.fillRect(obs.x-5, obs.targetY-400, obs.width+10, 400); ctx.strokeRect(obs.x-5, obs.targetY-400, obs.width+10, 400); }
            else if (datosAtk.tipo_obstaculo === "BARRIDO") { ctx.fillRect(obs.targetX-200, obs.y-obs.height/2-5, 400, obs.height+10); ctx.strokeRect(obs.targetX-200, obs.y-obs.height/2-5, 400, obs.height+10); }
            else if (datosAtk.tipo_obstaculo === "SUELO") { ctx.fillRect(obs.x-5, obs.targetY-15, obs.width+10, 15); ctx.strokeRect(obs.x-5, obs.targetY-15, obs.width+10, 15); }
        } else {
            if (datosAtk.tipo_obstaculo === "CAIDA") drawCactus(obs.x+obs.width/2, obs.y, 0.8, Math.PI); 
            else if (datosAtk.tipo_obstaculo === "BARRIDO") drawCactus(obs.x+obs.width/2, obs.y-obs.height/2, 0.8, tiempoAnim*5);
            else if (datosAtk.tipo_obstaculo === "SUELO") { ctx.fillStyle = "silver"; for (let i=0; i<3; i++) { ctx.beginPath(); let bx2 = obs.x+(i*23), tipy = obs.y-obs.height; ctx.moveTo(bx2,obs.y); ctx.lineTo(bx2+11,tipy); ctx.lineTo(bx2+22,obs.y); ctx.fill(); } }
        }
    });
}

function updateDialogHTML() {
    const dBox  = document.getElementById("dialogBox"), dName = document.getElementById("dialogName"), dText = document.getElementById("dialogText"), dIcon = document.getElementById("dialogIcon");
    if (estadoJuego === "GAME_OVER" || estadoJuego === "MUNDO" || estadoJuego === "CONGELADO"  || estadoJuego === "FADE_OUT") { dBox.style.visibility = "hidden"; return; }
    if (estadoJuego === "COMBATE_INTRO") { dBox.style.visibility = "visible"; dName.innerText = enemigoActual ? enemigoActual.nombre : "???"; dText.innerText = enemigoActual ? enemigoActual.texto_intro : "..."; } 
    else if (estadoJuego === "VICTORIA") { dBox.style.visibility = "visible"; dName.innerText = enemigoActual ? enemigoActual.nombre : "???"; dText.innerText = mensajeTurno; dIcon.style.display = esperandoClic ? "block" : "none"; musicaBatalla.pause(); musicaBatalla.currentTime = 0; } 
    else if (mensajeTurno !== "") {
        dBox.style.visibility = "visible"; let nick = "SISTEMA";
        if (ordenTurnos[turnoActualIndex]) { 
            let t = ordenTurnos[turnoActualIndex]; let heroe = heroesEnCombate.find(h=>h.id === t); 
            if(heroe) { nick = heroe.nombre; } 
            else if (t.startsWith("ENEMIGO_")) { let idx = parseInt(t.split("_")[1]); if (enemigosEnCombate[idx]) nick = enemigosEnCombate[idx].nombre; } 
            else { nick = enemigoActual ? enemigoActual.nombre : "???"; }
        }
        
        if (estadoJuego === "APLICAR_EFECTOS" || estadoJuego === "MENSAJE_CONTAGIO") nick = "SISTEMA";
        
        dName.innerText = nick.toUpperCase(); dText.innerText = mensajeTurno; dIcon.style.display = esperandoClic ? "block" : "none";
    } else { dBox.style.visibility = "hidden"; }
}

function drawPlayerHP() { heroesEnCombate.forEach((char, index) => { drawHPCircle(50, 60 + (index * 80), char); }); }
function drawHPCircle(cx, cy, char) {
    ctx.beginPath(); ctx.arc(cx,cy,30,0,Math.PI*2); ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = "#333"; ctx.stroke();
    if (char.hp > 0) { ctx.beginPath(); ctx.arc(cx,cy,30,-Math.PI/2,-Math.PI/2+(Math.PI*2*(char.hp/char.maxHp))); ctx.strokeStyle = char.color; ctx.stroke(); }
    ctx.fillStyle = "white"; ctx.font = "bold 12px Courier"; ctx.fillText(char.nombre.substring(0,3).toUpperCase(), cx-12, cy-5); ctx.font = "10px Courier"; ctx.fillText(char.estado === "CAIDO" ? "UFF" : `${char.hp}`, cx-12, cy+12);
    if (char.estado === "CAIDO") { ctx.strokeStyle = "red"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(cx-15,cy-15); ctx.lineTo(cx+15,cy+15); ctx.stroke(); ctx.beginPath(); ctx.moveTo(cx+15,cy-15); ctx.lineTo(cx-15,cy+15); ctx.stroke(); }
    
    if (char.estadoAlterado) {
        ctx.fillStyle = char.estadoAlterado === "VENENO" ? "#88ff88" : "#aa88cc";
        ctx.beginPath(); ctx.arc(cx+20,cy-20,10,0,Math.PI*2); ctx.fill();
        ctx.fillStyle = "black"; ctx.font = "bold 10px Courier"; ctx.fillText(char.turnosEstado, cx+17, cy-17);
    }
}

function drawUIBossHealth() {
    if (!enemigoActual) return;
    let barra = enemigoActual.barra_hp || (enemigoActual.hp * (enemigosEnCombate.length || 1));
    let barrasRest = Math.ceil(boss.hp / barra); let hpEnBarra  = boss.hp % barra; if (hpEnBarra === 0 && boss.hp > 0) hpEnBarra = barra;
    let p = hpEnBarra / barra; let colores = ["#00ffff","#00ff00","#ffff00","#ff8800","#ff0000"]; let colorAct = colores[Math.max(0, barrasRest-1)];
    ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(canvas.width-420, 10, 400, 35); ctx.fillStyle = colorAct; ctx.fillRect(canvas.width-415, 15, 390*p, 15); ctx.fillStyle = "white"; ctx.font = "bold 14px Courier";
    let titulo = enemigosEnCombate.length > 1 ? "Horda de " + enemigoActual.nombre : enemigoActual.nombre; ctx.fillText(`${titulo} [x${barrasRest}] HP: ${boss.hp}/${boss.maxHp}`, canvas.width-410, 42);
}

function drawUISeleccion() {
    ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0,0,canvas.width,canvas.height);
    if (heroesPendientes.length > 0) {
        let heroActual = heroesEnCombate.find(h => h.id === heroesPendientes[0]);
        let para = heroActual ? heroActual.nombre : "???";
        ctx.fillStyle = "white"; ctx.font = "bold 24px Courier"; ctx.fillText(`¿Qué hará ${para}?`, canvas.width/2-120, canvas.height/2-60);
        ctx.fillStyle = "rgba(0,50,150,0.8)";  ctx.fillRect(50, canvas.height-150, 250, 120); ctx.fillStyle = "rgba(150,0,0,0.8)";   ctx.fillRect(canvas.width-300, canvas.height-150, 250, 120);
        ctx.fillStyle = "white"; ctx.font = "bold 30px Courier"; ctx.fillText("ESCUDO", 110, canvas.height-85); ctx.fillText("ATAQUE", canvas.width-240, canvas.height-85);
    }
    drawTurnTimeline();
    if (accionesEnemigasPendientes.length > 0) {
        let acc = accionesEnemigasPendientes[0]; let pct = Math.max(0, acc.tiempoActual / acc.tiempoMax); let longBarra = 250 * pct;
        ctx.strokeStyle = "#ffff00"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(canvas.width-300+125-longBarra/2, canvas.height-155); ctx.lineTo(canvas.width-300+125+longBarra/2, canvas.height-155); ctx.stroke();
        ctx.beginPath(); ctx.arc(canvas.width-175, canvas.height-175, 20, 0, Math.PI*2); ctx.fillStyle = "red"; ctx.fill(); ctx.stroke(); ctx.fillStyle = "black"; ctx.font = "12px Courier"; ctx.fillText(">:)", canvas.width-186, canvas.height-171);
    }
}

function drawUIAtaque() {
    drawTurnTimeline(); let txt = estadoJuego === "ATAQUE_TRAZO" ? "¡CORTA!" : "¡GOLPEA!"; let totalF = 60*5;
    if (timerAtaqueFase > totalF-45) { ctx.textAlign = "center"; ctx.font = "bold 60px Courier"; ctx.fillStyle = "white"; ctx.strokeStyle = "black"; ctx.lineWidth = 6; ctx.strokeText(txt, canvas.width/2, canvas.height/2); ctx.fillText(txt, canvas.width/2, canvas.height/2); ctx.textAlign = "left"; } 
    else { let segs = Math.ceil(timerAtaqueFase/60); ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(canvas.width-120, 60, 100, 40); ctx.fillStyle = segs <= 2 ? "#ff0000" : "#ffff00"; ctx.font = "bold 24px Courier"; ctx.fillText(`00:0${segs}`, canvas.width-105, 88); }
}

function drawTurnTimeline() {
    let numTokens = Math.min(ordenTurnos.length, 8); 
    if (numTokens === 0 && !["COMBATE_SELECCION", "COMBATE_RESOLUCION", "MOSTRAR_DANO"].includes(estadoJuego) && !estadoJuego.startsWith("ATAQUE_")) return;

    let anchoCaja = 60 + (numTokens * 28); let cx = canvas.width/2 - anchoCaja/2;
    ctx.fillStyle = "rgba(0,0,0,0.8)"; ctx.fillRect(cx, 60, anchoCaja, 40);
    ctx.fillStyle = "white"; ctx.font = "bold 12px Courier"; ctx.fillText("COLA:", cx + 10, 85);

    for (let i = 0; i < numTokens; i++) {
        let cx2 = cx + 60 + (i * 26); let cy2 = 80; let id = ordenTurnos[i]; let colToUse = "#888";
        
        if (id.startsWith("ENEMIGO_")) {
            let idx = parseInt(id.split("_")[1]); if (enemigosEnCombate[idx]) colToUse = coloresID[enemigosEnCombate[idx].id] || "#ff0000";
        } else {
            colToUse = coloresID[id] || "#888";
        }

        ctx.beginPath(); ctx.arc(cx2, cy2, 12, 0, Math.PI*2); ctx.fillStyle = colToUse; ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx2, cy2, 8, 0, Math.PI*2); ctx.stroke();

        let char = heroesEnCombate.find(h=>h.id === id);
        if (char && char.estado === "CAIDO") {
            ctx.strokeStyle = "rgba(255,0,0,0.8)"; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(cx2-8, cy2-8); ctx.lineTo(cx2+8, cy2+8); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx2+8, cy2-8); ctx.lineTo(cx2-8, cy2+8); ctx.stroke();
        }
        
        if (i === turnoActualIndex && animacionTurno && (animacionTurno.paso === "MENSAJE_ATURDIDO" || animacionTurno.paso === "MENSAJE_FALLA_ESQUIVE")) {
            ctx.strokeStyle = "rgba(170, 0, 255, 0.9)"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(cx2-10, cy2-10); ctx.lineTo(cx2+10, cy2+10); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(cx2+10, cy2-10); ctx.lineTo(cx2-10, cy2+10); ctx.stroke();
        } else {
            ctx.strokeStyle = (i === turnoActualIndex && estadoJuego === "COMBATE_RESOLUCION") ? "yellow" : "white";
            ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx2, cy2, 12, 0, Math.PI*2); ctx.stroke();
        }
    }
}

function drawImpactosBoss() {
    for (let imp of impactosBoss) {
        ctx.save(); ctx.translate(imp.x, imp.y); ctx.rotate(imp.rotacion); ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = 1; ctx.beginPath();
        for (let j=0; j<5; j++) { let ang = (Math.PI*2/5)*j; ctx.moveTo(0,0); ctx.lineTo(Math.cos(ang)*16, Math.sin(ang)*16); ctx.moveTo(Math.cos(ang)*8, Math.sin(ang)*8); ctx.lineTo(Math.cos(ang+0.5)*14, Math.sin(ang+0.5)*14); }
        ctx.stroke(); ctx.beginPath(); ctx.arc(0,0,4,0,Math.PI*2); ctx.fillStyle = "black"; ctx.fill(); ctx.restore();
        if (imp.frameTexto > 0) { ctx.fillStyle = "yellow"; ctx.font = "bold 22px Courier"; ctx.fillText("¡TAAS!", imp.x-30, imp.y-20-(30-imp.frameTexto)); }
    }
}


// ==============================================================================
// ⏱️ LA MAGIA DEL FIXED TIME STEP (INDEPENDENCIA DE FPS)
// ==============================================================================
let lastTime = 0;
let accumulator = 0;
const TIME_STEP = 1000 / 60; // Obligamos a la lógica a correr siempre a 60 FPS (aprox 16.66ms)

function gameLoop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    let dt = timestamp - lastTime;
    lastTime = timestamp;

    // Límite de seguridad: Si cambias de pestaña y regresas, el 'dt' será gigantesco.
    // Esto evita que el juego intente calcular 5000 frames de golpe y se congele.
    if (dt > 250) dt = 250; 

    accumulator += dt;

    // Mientras tengamos tiempo acumulado en el banco, ejecutamos la lógica.
    // En pantallas de 144Hz, el ciclo 'while' a veces no se ejecuta en un frame (porque pasó muy poco tiempo).
    // En pantallas lentas, el ciclo 'while' puede ejecutarse 2 o 3 veces seguidas para "alcanzar" el tiempo real.
    while (accumulator >= TIME_STEP) {
        update(); 
        accumulator -= TIME_STEP;
    }

    // Dibujamos tan rápido como la pantalla lo permita.
    draw(); 
    requestAnimationFrame(gameLoop); 
}
requestAnimationFrame(gameLoop);

// ==============================================================================
// 📋 ZONA FINAL: SISTEMA UI DRAG & DROP DE PARTY
// ==============================================================================
let isDraggingCard = false; let draggedHeroId = null; let dropSnapshotId = null;

function abrirCajonParty() { 
    if (estadoJuego !== "MUNDO") { alert("Solo puedes editar la party en el mapa (MUNDO)."); return; }
    document.getElementById("partyDrawer").style.display = "flex"; 
    renderPartyUI(); 
}
function cerrarCajonParty() { document.getElementById("partyDrawer").style.display = "none"; }

function renderPartyUI() {
    const slots = document.getElementById("partySlots"); const reserve = document.getElementById("partyReserve");
    slots.innerHTML = ""; reserve.innerHTML = "";

    for (let i = 0; i < 4; i++) {
        let slot = document.createElement("div"); slot.className = "party-slot"; slot.dataset.index = i;
        if (i < partyJugador.length) { 
            let card = createCardDOM(partyJugador[i]);
            if (partyJugador[i] === dropSnapshotId) { card.classList.add("brinquito"); dropSnapshotId = null; }
            slot.appendChild(card); 
        }
        slots.appendChild(slot);
    }
    reservaJugador.forEach(id => { 
        let card = createCardDOM(id);
        if (id === dropSnapshotId) { card.classList.add("brinquito"); dropSnapshotId = null; }
        reserve.appendChild(card); 
    });
}

function createCardDOM(id) {
    let hero = DATOS_HEROES[id];
    let c = document.createElement("div"); c.className = "hero-card"; c.dataset.id = id;
    c.innerHTML = `<div class="hero-card-color" style="background:${hero.color}"></div><div class="hero-card-name">${hero.nombre}</div>`;
    
    c.onpointerdown = (e) => {
        isDraggingCard = true; draggedHeroId = id; c.setPointerCapture(e.pointerId);
        c.style.position = "fixed"; c.style.zIndex = 9000; c.style.left = (e.clientX - 45) + "px"; c.style.top = (e.clientY - 65) + "px";
        partyJugador = partyJugador.filter(x => x !== id); reservaJugador = reservaJugador.filter(x => x !== id); 
    };
    c.onpointermove = (e) => {
        if(!isDraggingCard) return;
        c.style.left = (e.clientX - 45) + "px"; c.style.top = (e.clientY - 65) + "px";
        document.querySelectorAll(".party-slot").forEach(s => { 
            let r = s.getBoundingClientRect();
            if(e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) s.classList.add("magnet-hover");
            else s.classList.remove("magnet-hover");
        });
    };
    c.onpointerup = (e) => {
        if(!isDraggingCard) return;
        isDraggingCard = false; c.releasePointerCapture(e.pointerId);
        
        let droppedInSlot = false; let slotsNodes = document.querySelectorAll(".party-slot");
        for(let i=0; i<slotsNodes.length; i++) {
            let r = slotsNodes[i].getBoundingClientRect();
            if(e.clientX > r.left && e.clientX < r.right && e.clientY > r.top && e.clientY < r.bottom) {
                partyJugador.splice(i, 0, id); 
                if(partyJugador.length > 4) { let overflow = partyJugador.pop(); reservaJugador.push(overflow); } 
                droppedInSlot = true; dropSnapshotId = id; break;
            }
        }
        if(!droppedInSlot) {
            let resRect = document.getElementById("partyReserve").getBoundingClientRect();
            if (e.clientY > resRect.top && partyJugador.length >= 1) { reservaJugador.push(id); dropSnapshotId = id; } 
            else { partyJugador.push(id); dropSnapshotId = id; } 
        }
        renderPartyUI(); 
    };
    return c;
}

function testAgregarDummys() {
    ["DUMMY_1", "DUMMY_2", "DUMMY_3", "DUMMY_4"].forEach(d => {
        if (!partyJugador.includes(d) && !reservaJugador.includes(d)) reservaJugador.push(d);
    });
    if (document.getElementById("partyDrawer").style.display === "flex") renderPartyUI();
}

function cambiarMusicaDebug() {
    // 1. Ahora leemos el menú desplegable (que se llama dp-musica)
    let nombreCancion = document.getElementById("dp-musica").value;

    // 2. Cambiamos el disco
    musicaBatalla.pause();
    musicaBatalla.src = nombreCancion;
    musicaBatalla.currentTime = 0;

    // 3. ¡Play!
    musicaBatalla.play().catch(e => {
        console.log("El navegador bloqueó el audio.", e);
    });
}