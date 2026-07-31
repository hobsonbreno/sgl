const rbt12 = 134712.50;
const faturamentoTotalNossoGlobal = 173659.20;
const faturamentoMensal = faturamentoTotalNossoGlobal;
const rbt12Projetado = rbt12 + faturamentoMensal;

let aliquotaNominal = 0.06;
let parcelaDeduzir = 0;
if (rbt12Projetado <= 180000) { aliquotaNominal = 0.06; parcelaDeduzir = 0; }
else if (rbt12Projetado <= 360000) { aliquotaNominal = 0.112; parcelaDeduzir = 9360; }
else if (rbt12Projetado <= 720000) { aliquotaNominal = 0.135; parcelaDeduzir = 17640; }

const aliquota = ((rbt12Projetado * aliquotaNominal) - parcelaDeduzir) / rbt12Projetado;

console.log("RBT12 Projetado:", rbt12Projetado);
console.log("Aliquota Efetiva:", (aliquota * 100).toFixed(2) + "%");
