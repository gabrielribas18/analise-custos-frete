
const origem = document.getElementById("origem");
const destino = document.getElementById("destino");
const tipoPercurso = document.getElementById("tipoPercurso");
const campoRetorno = document.getElementById("campoRetorno");
const destinoRetorno = document.getElementById("destinoRetorno");

const botaoLocalizacao = document.getElementById("usarLocalizacao");
const botaoCalcular = document.getElementById("calcularSimulacao");
const resultado = document.getElementById("resultadoSimulacao");

let coordenadasOrigem = null;

const moeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});

const numero = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 2
});

// --------------------------------------------------
// CONEXÃO COM OS DADOS DO PYTHON
// --------------------------------------------------

async function carregarDadosPython() {

    try {

        const resposta = await fetch("./dados.json?v=" + Date.now());

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar os dados.");
        }

        const dados = await resposta.json();

        document.getElementById("totalFretes").textContent =
            numero.format(dados.totalFretes);

        document.getElementById("custoTotal").textContent =
            moeda.format(dados.custoTotal);

        document.getElementById("custoMedio").textContent =
            moeda.format(dados.custoMedio);

        console.log("Dados do Python carregados:", dados);

    } catch (erro) {

        console.error("Erro ao carregar dados do Python:", erro);

    }
}

// --------------------------------------------------
// OPÇÕES DE PERCURSO
// --------------------------------------------------

tipoPercurso.addEventListener("change", function () {
    campoRetorno.style.display =
        tipoPercurso.value === "personalizado" ? "block" : "none";
});

// --------------------------------------------------
// LOCALIZAÇÃO AUTOMÁTICA
// --------------------------------------------------

function obterLocalizacao() {

    if (!navigator.geolocation) {
        resultado.textContent =
            "Seu navegador não oferece suporte à localização.";
        return;
    }

    botaoLocalizacao.disabled = true;
    resultado.textContent = "Identificando sua localização...";

    navigator.geolocation.getCurrentPosition(

        function (posicao) {

            coordenadasOrigem = {
                latitude: posicao.coords.latitude,
                longitude: posicao.coords.longitude
            };

            origem.value = "Minha localização atual";

            resultado.textContent =
                "Localização identificada. Informe o destino para calcular a rota.";

            botaoLocalizacao.disabled = false;
        },

        function (erro) {

            const mensagens = {
                1: "Acesso à localização negado. Autorize o GPS no navegador.",
                2: "Não foi possível identificar sua posição.",
                3: "O tempo para obter a localização terminou."
            };

            resultado.textContent =
                mensagens[erro.code] ||
                "Não foi possível obter sua localização.";

            botaoLocalizacao.disabled = false;
        },

        {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 60000
        }
    );
}

botaoLocalizacao.addEventListener("click", obterLocalizacao);

origem.addEventListener("input", function () {
    coordenadasOrigem = null;
});

// --------------------------------------------------
// BUSCA DE ENDEREÇOS
// --------------------------------------------------

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function buscarCoordenadas(endereco) {

    const texto = endereco.trim();

    if (!texto) {
        throw new Error("Informe um endereço válido.");
    }

    if (texto === "Minha localização atual" && coordenadasOrigem) {
        return coordenadasOrigem;
    }

    const correspondencia = texto.match(
        /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/
    );

    if (correspondencia) {

        const latitude = Number(correspondencia[1]);
        const longitude = Number(correspondencia[2]);

        if (
            latitude < -90 || latitude > 90 ||
            longitude < -180 || longitude > 180
        ) {
            throw new Error("Coordenadas inválidas.");
        }

        return { latitude, longitude };
    }

    const url =
        "https://nominatim.openstreetmap.org/search" +
        "?format=jsonv2&limit=1&countrycodes=br&q=" +
        encodeURIComponent(texto);

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error("Falha ao pesquisar o endereço.");
    }

    const dados = await resposta.json();

    if (!dados.length) {
        throw new Error("Endereço não encontrado: " + texto);
    }

    return {
        latitude: Number(dados[0].lat),
        longitude: Number(dados[0].lon)
    };
}

// --------------------------------------------------
// CÁLCULO DA DISTÂNCIA RODOVIÁRIA
// --------------------------------------------------

async function calcularDistancia(pontoA, pontoB) {

    const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${pontoA.longitude},${pontoA.latitude};` +
        `${pontoB.longitude},${pontoB.latitude}` +
        "?overview=false";

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error("Não foi possível consultar a rota.");
    }

    const dados = await resposta.json();

    if (dados.code !== "Ok" || !dados.routes.length) {
        throw new Error("Não existe uma rota disponível entre os locais.");
    }

    return {
        distancia: dados.routes[0].distance / 1000,
        duracao: dados.routes[0].duration / 3600
    };
}

// --------------------------------------------------
// EXIBIÇÃO DO RESULTADO
// --------------------------------------------------

function apresentarResultado(dados) {

    resultado.innerHTML = `
        <h3>Resultado da simulação</h3>

        <p>Veículo: ${dados.veiculo}</p>

        <p>Distância de ida:
        ${numero.format(dados.distanciaIda)} km</p>

        <p>Distância de retorno:
        ${numero.format(dados.distanciaRetorno)} km</p>

        <p><strong>Distância total:
        ${numero.format(dados.distanciaTotal)} km</strong></p>

        <p>Tempo estimado de condução:
        ${numero.format(dados.duracaoTotal)} horas</p>

        <p>Consumo médio:
        ${numero.format(dados.consumo)} km/L</p>

        <p>Combustível necessário:
        ${numero.format(dados.litros)} litros</p>

        <p>Preço do diesel:
        ${moeda.format(dados.diesel)}</p>

        <h3>Custo estimado:
        ${moeda.format(dados.custo)}</h3>
    `;
}

// --------------------------------------------------
// SIMULAÇÃO COMPLETA
// --------------------------------------------------

botaoCalcular.addEventListener("click", async function () {

    try {

        const consumo = Number(
            document.getElementById("consumo").value
        );

        const diesel = Number(
            document.getElementById("diesel").value
        );

        const veiculo =
            document.getElementById("veiculo").selectedOptions[0].textContent;

        if (!origem.value.trim() || !destino.value.trim()) {
            throw new Error("Informe a origem e o destino.");
        }

        if (
            !Number.isFinite(consumo) ||
            !Number.isFinite(diesel) ||
            consumo <= 0 ||
            diesel <= 0
        ) {
            throw new Error("Informe consumo e preço do diesel válidos.");
        }

        if (
            tipoPercurso.value === "personalizado" &&
            !destinoRetorno.value.trim()
        ) {
            throw new Error("Informe o destino do retorno.");
        }

        botaoCalcular.disabled = true;
        resultado.textContent = "Consultando endereços e calculando rota...";

        const pontoOrigem = await buscarCoordenadas(origem.value);

        await esperar(1100);

        const pontoDestino = await buscarCoordenadas(destino.value);

        const ida = await calcularDistancia(
            pontoOrigem,
            pontoDestino
        );

        let distanciaRetorno = 0;
        let duracaoRetorno = 0;

        if (tipoPercurso.value === "ida_volta") {

            const volta = await calcularDistancia(
                pontoDestino,
                pontoOrigem
            );

            distanciaRetorno = volta.distancia;
            duracaoRetorno = volta.duracao;
        }

        if (tipoPercurso.value === "personalizado") {

            await esperar(1100);

            const pontoRetorno = await buscarCoordenadas(
                destinoRetorno.value
            );

            const volta = await calcularDistancia(
                pontoDestino,
                pontoRetorno
            );

            distanciaRetorno = volta.distancia;
            duracaoRetorno = volta.duracao;
        }

        const distanciaTotal = ida.distancia + distanciaRetorno;
        const duracaoTotal = ida.duracao + duracaoRetorno;

        const litros = distanciaTotal / consumo;
        const custo = litros * diesel;

        apresentarResultado({
            veiculo,
            distanciaIda: ida.distancia,
            distanciaRetorno,
            distanciaTotal,
            duracaoTotal,
            consumo,
            diesel,
            litros,
            custo
        });

    } catch (erro) {

        resultado.textContent = erro.message;

    } finally {

        botaoCalcular.disabled = false;
    }
});

// --------------------------------------------------
// INICIAR
// --------------------------------------------------

carregarDadosPython();
obterLocalizacao();
