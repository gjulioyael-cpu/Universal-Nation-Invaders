// ARCHIVO: datos/ataques.js
const PASIVAS_DE_ATAQUES = { 

  "Pasiva_Veneno": {
    Probabilidad: 1, // 100% de probabilidad de aplicar el veneno
    Efecto: "VENENO", // Tipo de efecto que se aplicará
  },

  "Pasiva_Arma_Grande": {
    Probabilidad: 1, // 100% de probabilidad de aplicar la contusión
    Efecto: "CONTUSION", // Tipo de efecto que se aplicará
  },

  "Pasiva_aletargar": {
    Probabilidad: 1, // 100% de probabilidad de aplicar la contusión
    Efecto: "DORMIDO", // Tipo de efecto que se aplicará
  }

}

const DATOS_ATAQUES = {
    // === ATAQUES DE JEFES ===
    "LLUVIA": { 
        nombre: "Lluvia de Espinas", 
        dano: 200, 
        dano_esquivado: 100, 
        tipo_obstaculo: "CAIDA", // Cae desde arriba
        velocidad: 16,
        pasiva: "Pasiva_Arma_Grande" // 100% de probabilidad de aplicar contusión al atacar
    },
    "NOPALAZO": { 
        nombre: "Golpe de Nopal", 
        dano: 200, 
        dano_esquivado: 100, 
        tipo_obstaculo: "BARRIDO", // Viene de un lado
        velocidad: -18,
        pasiva: "Pasiva_Arma_Grande" // 100% de probabilidad de aplicar contusión al atacar
    },
    "PINCHOS": { 
        nombre: "Pinchos de Tierra", 
        dano: 200, 
        dano_esquivado: 100, 
        tipo_obstaculo: "SUELO", // Sale de abajo
        velocidad: 6,
        pasiva: "Pasiva_Veneno" // 100% de probabilidad de aplicar veneno al atacar
    },

    // === ATAQUES DE HÉROES ===

    "y mi ataque?": {
        nombre: "¡¿Y MI ATAQUE?!",
        dano: 0,
        descripcion: "¡NO ENCONTRE EL ATAQUE...",
        tipo_ataque: "TAP",
    },

    "PUNETAZO": { 
        nombre: "Puñetazo Recto", 
        dano: 10, 
        descripcion: "Un golpe aficionado pero muy pesado.", // ¡Perfecto para Sarah!
        pasiva: "Pasiva_Arma_Grande", // 100% de probabilidad de aplicar contusión al atacar
        tipo_ataque: "TAP"
        
        
    },
    "CORTE": { 
        nombre: "Trazo Veloz", 
        dano: 100, 
        descripcion: "Un corte preciso de energía." ,
        pasiva: "Pasiva_aletargar", // 100% de probabilidad de aplicar dormido al atacar
        tipo_ataque: "TRAZO"
    }
};

