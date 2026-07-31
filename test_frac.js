const rbt12 = 134712.50;
const faturamentoTotalNossoGlobal = 173659.20;
const mesesContrato = 12;
const faturamentoMensal = faturamentoTotalNossoGlobal / mesesContrato;

function calcularAliquotaEfetivaSimples(rbt) {
  if (rbt <= 0) return 0.06;
  let aliquotaNominal = 0.06;
  let parcelaDeduzir = 0;
  if (rbt <= 180000) { aliquotaNominal = 0.06; parcelaDeduzir = 0; }
  else if (rbt <= 360000) { aliquotaNominal = 0.112; parcelaDeduzir = 9360; }
  else if (rbt <= 720000) { aliquotaNominal = 0.135; parcelaDeduzir = 17640; }
  else if (rbt <= 1800000) { aliquotaNominal = 0.16; parcelaDeduzir = 35640; }
  else if (rbt <= 3600000) { aliquotaNominal = 0.21; parcelaDeduzir = 125640; }
  else { aliquotaNominal = 0.33; parcelaDeduzir = 557640; }
  return ((rbt * aliquotaNominal) - parcelaDeduzir) / rbt;
}

let somaAliquotas = 0;
let rbt12Projetado = rbt12;
for (let i = 0; i < mesesContrato; i++) {
  const al = calcularAliquotaEfetivaSimples(rbt12Projetado);
  console.log(`Month ${i+1}: RBT12=${rbt12Projetado.toFixed(2)}, Aliquota=${(al*100).toFixed(4)}%`);
  somaAliquotas += al;
  rbt12Projetado += faturamentoMensal;
}
console.log("Average:", (somaAliquotas / mesesContrato) * 100 + "%");
