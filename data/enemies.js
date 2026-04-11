// ARCHIVO: datos/enemigos.js

const CATALOGO_ENEMIGOS = {
    "C4C_T4C": {
        id: "C4C_T4C", 
        nombre: "C4C-T4C", 
        hp: 5000, 
        barra_hp: 1000, 
        color: "#ff0000",
        tamano: { x: 40, y: 80 }, 
        musica: "rodeo-de-c4c.mp3", 
        fondo: "DESIERTO",
        tipoCombate: "BOSS", 
        velocidadReserva: 2.5, 
        habilidad_pasiva: "EL_MAS_RAPIDO_DEL_OESTE",
        ataques: ["LLUVIA", "NOPALAZO", "PINCHOS"], 
        texto_intro: "¡SOY EL MAS VELOZ, MUERAN!",
        texto_victoria: "Ugh, ¿en serio?", 
        dano_normal: 1000, 
        dano_esquivado: 500,
        cantidad_enemigos: 1,
        estado: "NINGUNO" // Aquí podrías agregar un estado alterado como "VENENO" o "CONTUSION"
        
    },
    "SLIME": {
        id: "SLIME", 
        nombre: "Slime Verde", 
        hp: 800, 
        barra_hp: 800, 
        color: "#00dd77",
        tamano: { x: 40, y: 45 }, 
        musica: "batalla-normal.mp3", 
        fondo: "BOSQUE",
        tipoCombate: "NORMAL", 
        velocidadReserva: 2.5, 
        acciones_por_ronda: 1,
        ataques: ["LLUVIA", "PINCHOS"], 
        texto_intro: "¡Un Slime bloquea el camino!",
        texto_victoria: "¡El Slime se disuelve en un charco!",
        dano_normal: 600, 
        dano_esquivado: 200,
        cantidad_enemigos: 2,
        estado: "NINGUNO", // Aquí podrías agregar un estado alterado como "VENENO" o "CONTUSION"
        pasiva: "Pasiva_Veneno", // 30% de probabilidad de aplicar veneno al atacar
    },

    "golemites": {
        id: "GOLEMITES", 
        nombre: "Golemites", 
        hp: 10000, 
        barra_hp: 1000, 
        color: "#9e9f9f",
        tamano: { x: 100, y: 25 }, 
        musica: "batalla-normal.mp3", 
        fondo: "BOSQUE",
        tipoCombate: "NORMAL", 
        velocidadReserva: 30, 
        acciones_por_ronda: 1,
        ataques: ["PUÑETAZO", "PINCHOS"], 
        texto_intro: "¡Un Golemite bloquea el camino!",
        texto_victoria: "¡El Golemite se deshace en polvo!",
        dano_normal: 600, 
        dano_esquivado: 200,
        cantidad_enemigos: 3,
        estado: "NINGUNO" // Aquí podrías agregar un estado alterado como "VENENO" o "CONTUSION"
    }
};