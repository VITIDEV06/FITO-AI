const MockData = {
  cultivos: [
    { id: 'tomate', nombre: 'Tomate', icono: '🍅' },
    { id: 'maiz', nombre: 'Maíz', icono: '🌽' },
    { id: 'trigo', nombre: 'Trigo', icono: '🌾' },
    { id: 'arroz', nombre: 'Arroz', icono: '🍚' },
    { id: 'papa', nombre: 'Papa', icono: '🥔' },
    { id: 'cebolla', nombre: 'Cebolla', icono: '🧅' },
    { id: 'lechuga', nombre: 'Lechuga', icono: '🥬' },
    { id: 'frijol', nombre: 'Frijol', icono: '🫘' },
    { id: 'cafe', nombre: 'Café', icono: '☕' },
    { id: 'aguacate', nombre: 'Aguacate', icono: '🥑' },
    { id: 'platano', nombre: 'Plátano', icono: '🍌' },
    { id: 'otro', nombre: 'Otro cultivo', icono: '🌱' }
  ],

  historialEjemplo: [
    {
      id: 'h001',
      fecha: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      textoOriginal: 'Las hojas de mis tomates están amarillas y algunas tienen manchas oscuras en los bordes.',
      cultivo: 'Tomate',
      observacion: 'Las hojas de mis tomates están amarillas y algunas tienen manchas oscuras en los bordes.',
      analisis: {
        cultivo: 'Tomate',
        sintomas: ['Amarillamiento foliar', 'Manchas oscuras en bordes', 'Clorosis internervial'],
        posiblesCausas: ['Deficiencia de nitrógeno', 'Marchitez por Fusarium', 'Estrés hídrico severo'],
        nivelCertidumbre: 'medio',
        proximosPasos: ['Revisar el sistema de riego', 'Analizar el pH del suelo', 'Inspeccionar la raíz en busca de pudrición'],
        informacionFaltante: ['Edad de la planta', 'Historial de riego', 'Último fertilizante aplicado'],
        descargoResponsabilidad: 'FITOAI proporciona orientación basada en la información disponible y no sustituye la evaluación de un especialista agrícola.'
      },
      metadata: { imagen: false, tipo: 'analisis' }
    },
    {
      id: 'h002',
      fecha: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
      textoOriginal: 'El maíz tiene las hojas enrolladas y el tallo se ve débil, como si le faltara nutrientes.',
      cultivo: 'Maíz',
      observacion: 'El maíz tiene las hojas enrolladas y el tallo se ve débil, como si le faltara nutrientes.',
      analisis: {
        cultivo: 'Maíz',
        sintomas: ['Hojas enrolladas', 'Tallo debilitado', 'Crecimiento lento'],
        posiblesCausas: ['Deficiencia de potasio', 'Plaga de taladrador del tallo', 'Falta de luz solar'],
        nivelCertidumbre: 'bajo',
        proximosPasos: ['Aplicar fertilizante rico en potasio', 'Revisar presencia de plagas', 'Verificar densidad de siembra'],
        informacionFaltante: ['Variedad de maíz', 'Condiciones climáticas recientes', 'Tipo de suelo'],
        descargoResponsabilidad: 'FITOAI proporciona orientación basada en la información disponible y no sustituye la evaluación de un especialista agrícola.'
      },
      metadata: { imagen: false, tipo: 'analisis' }
    },
    {
      id: 'h003',
      fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      textoOriginal: 'La papa tiene manchas blancas en las hojas y parece que se está secando por partes.',
      cultivo: 'Papa',
      observacion: 'La papa tiene manchas blancas en las hojas y parece que se está secando por partes.',
      analisis: {
        cultivo: 'Papa',
        sintomas: ['Manchas blancas foliares', 'Secado parcial', 'Necrosis en márgenes'],
        posiblesCausas: ['Tizón tardío (Phytophthora)', 'Mildiu velloso', 'Estrés por sequía'],
        nivelCertidumbre: 'medio',
        proximosPasos: ['Aplicar fungicida preventivo', 'Mejorar drenaje del suelo', 'Retirar plantas infectadas'],
        informacionFaltante: ['Temperatura máxima diaria', 'Humedad del ambiente', 'Historial de plagas'],
        descargoResponsabilidad: 'FITOAI proporciona orientación basada en la información disponible y no sustituye la evaluación de un especialista agrícola.'
      },
      metadata: { imagen: true, tipo: 'imagen' }
    },
    {
      id: 'h004',
      fecha: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      textoOriginal: 'Mis lechugas tienen los bordes de las hojas quemados, como si fueran marrones y secos.',
      cultivo: 'Lechuga',
      observacion: 'Mis lechugas tienen los bordes de las hojas quemados, como si fueran marrones y secos.',
      analisis: {
        cultivo: 'Lechuga',
        sintomas: ['Quemadura en bordes foliares', 'Necrosis marginal', 'Marchitez parcial'],
        posiblesCausas: ['Quemadura por exceso de sol', 'Deficiencia de calcio', 'Acumulación de sales en el suelo'],
        nivelCertidumbre: 'alto',
        proximosPasos: ['Proporcionar sombra parcial', 'Regar en horas de la mañana', 'Lavar el suelo con agua abundante'],
        informacionFaltante: ['Horas de exposición solar', 'Tipo de riego actual', 'Conductividad eléctrica del suelo'],
        descargoResponsabilidad: 'FITOAI proporciona orientación basada en la información disponible y no sustituye la evaluación de un especialista agrícola.'
      },
      metadata: { imagen: false, tipo: 'analisis' }
    }
  ],

  analisisMock: {
    cultivo: 'Tomate',
    sintomas: ['Amarillamiento foliar progresivo', 'Manchas necróticas irregulares', 'Pérdida de turgencia'],
    posiblesCausas: ['Marchitez por Fusarium oxysporum', 'Deficiencia de magnesio', 'Estrés hídrico acumulado'],
    nivelCertidumbre: 'medio',
    proximosPasos: [
      'Cortar y retirar las hojas afectadas',
      'Revisar el sistema de riego por posibles encharcamientos',
      'Aplicar fertilizante con magnesio en la próxima semana',
      'Monitorear la evolución en los próximos 5 días'
    ],
    informacionFaltante: [
      'Variedad del tomate',
      'Tiempo desde la siembra',
      'Historial de fertilización',
      'Condiciones de humedad del suelo'
    ],
    descargoResponsabilidad: 'Este análisis es orientativo y no sustituye la evaluación de un especialista agrícola.'
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MockData
}
