// ARCHIVO: datos/reglas_batalla.js

const TIPOS_DE_COMBATE = {
    "NORMAL": {
        calculo_ataques: "INDIVIDUAL", // El enemigo ataca las veces que diga su estadística
        horda_permitida: true // Pueden aparecer 3 Slimes al mismo tiempo
    },
    "BOSS": {
        calculo_ataques: "POR_PARTY", // Ataca 1 vez por cada héroe vivo que tengas
        horda_permitida: false // Un jefe siempre pelea solo
    },
    "NIVEL_BONUS": { // ¡Tu ejemplo!
        calculo_ataques: "CERO", // Los enemigos no atacan, solo se mueven
        horda_permitida: true
    }
};

const HABILIDADES_PASIVAS = {
    "EL_MAS_RAPIDO_DEL_OESTE": {
        nombre: "El Más Rápido del Oeste",
        tipo: "ROBO_TURNO_BALAZO",
        sfx: "balazo.mp3",
        volumen: 0.2,
        velocidad_robo: 0.1
    },
    // Alias para compatibilidad (puedes cambiar esto a lo que quieras)
    "LADRON_TURNO": {
        nombre: "Robo de Turno y Disparo",
        tipo: "ROBO_TURNO_BALAZO",
        sfx: "balazo.mp3",
        volumen: 0.2,
        velocidad_robo: 0.1
    }
    // Aquí el día de mañana podrías poner más habilidades:
    // "ESCUDO_MAGICO": { tipo: "REDUCIR_DANO", reduccion: 0.5 }
    // "REGENERACION": { tipo: "DANO_INVERSO", dano: 10 }
};

const ESTADOS_ALTERADOS = {
    "VENENO": {
        tipo: "DANO_POR_TURNO",
      
        dmg: 5,
        turnos: 3,
        primer_mensaje: (nombre) => `${nombre} ha sido envenenado!`,
        mensaje_por_turno: (nombre, dmg) => `${nombre} sufre ${dmg} de daño por el veneno.`,
        icono: "img/ico-veneno.jpg"
    },

    "CONTUSION": {
        tipo: "ATURDIDO",
  
        turnos: [2, 4], // La contusión dura entre 2 y 4 turnos
        primer_mensaje: (nombre) => `${nombre} ha sido contusionado!`,
        mensaje_por_turno: (nombre) => `${nombre} no se puede mover por la contusión.`,
        icono: "img/ico-contusion.png"
    },

    "DORMIDO": {
        tipo: "ATURDIDO",
        turnos: 2, // El personaje dormido no puede actuar durante 2 turnos
        primer_mensaje: (nombre) => `${nombre} se ha quedado dormido!`,
        mensaje_por_turno: (nombre) => `${nombre} no puede actuar porque está dormido.`,
        icono: "img/ico-dormido.png"
    }
}