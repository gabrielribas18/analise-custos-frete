
// =====================================
// ANÁLISE DE CUSTOS DE FRETE
// Projeto Agrária
// =====================================

// Dados iniciais do painel
const projeto = {
    nome: "Análise de Custos de Frete",
    empresa: "Agrária",
    status: "Em desenvolvimento"
};

// Indicadores
const indicadores = {
    totalFretes: 0,
    custoTotal: 0,
    custoMedio: 0,
    distanciaTotal: 0
};

// Exibir informações no console
console.log("Projeto:", projeto.nome);
console.log("Empresa:", projeto.empresa);
console.log("Status:", projeto.status);

console.log("Indicadores iniciais:", indicadores);

// Função para calcular o custo médio
function calcularCustoMedio(custoTotal, quantidadeFretes) {
    if (quantidadeFretes === 0) {
        return 0;
    }

    return custoTotal / quantidadeFretes;
}

console.log(
    "Teste de cálculo:",
    calcularCustoMedio(10000, 20)
);

