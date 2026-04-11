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
    "LADRON_TURNO": {
        nombre: "Robo de Turno y Disparo",
        tipo: "ROBO_TURNO_BALAZO",
        sfx: "balazo.mp3",
        volumen: 0.2
    }
    // Aquí el día de mañana podrías poner:
    // "VENENO": { tipo: "DANO_POR_TURNO", dano: 50 }
};

const ESTADOS_ALTERADOS = {
    "VENENO": {
        tipo: "DANO_POR_TURNO",
      
        dmg: 5,
        turnos: 3,
        primer_mensaje: (nombre) => `${nombre} ha sido envenenado!`,
        mensaje_por_turno: (nombre, dmg) => `${nombre} sufre ${dmg} de daño por el veneno.`
    },

    "CONTUSION": {
        tipo: "ATURDIDO",
  
        turnos: [2, 4], // La contusión dura entre 2 y 4 turnos
        primer_mensaje: (nombre) => `${nombre} ha sido contusionado!`,
        mensaje_por_turno: (nombre) => `${nombre} no se puede mover por la contusión.`
    }
}