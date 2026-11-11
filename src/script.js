
const botaoSimulacao = document.getElementById("calcularSimulacao");

const resultado = document.getElementById("resultadoSimulacao");

const moeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});

botaoSimulacao.addEventListener("click", function () {

    // Capturar valores dos campos
    const distancia = Number(document.getElementById("distancia").value);

    const consumo = Number(document.getElementById("consumo").value);

    const diesel = Number(document.getElementById("diesel").value);

    // Validar informações
    if (
        !Number.isFinite(distancia) ||
        !Number.isFinite(consumo) ||
        !Number.isFinite(diesel) ||
        distancia <= 0 ||
        consumo <= 0 ||
        diesel <= 0
    ) {
        resultado.textContent =
            "Preencha todos os campos com valores maiores que zero.";

        return;
    }

    // Calcular combustível necessário
    const litrosNecessarios = distancia / consumo;

    // Calcular custo estimado
    const custoCombustivel = litrosNecessarios * diesel;

    // Apresentar resultado
    resultado.innerHTML = `
        <h3>Resultado da simulação</h3>

        <p>Distância: ${distancia.toLocaleString("pt-BR")} km</p>

        <p>Combustível necessário:
        ${litrosNecessarios.toFixed(2)} litros</p>

        <p>Preço do diesel: ${moeda.format(diesel)}</p>

        <h3>Custo estimado:
        ${moeda.format(custoCombustivel)}</h3>
    `;
});
