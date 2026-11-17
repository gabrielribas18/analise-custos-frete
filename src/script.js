
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

// Mostrar ou esconder o destino de retorno
tipoPercurso.addEventListener("change", function () {
    campoRetorno.style.display =
        tipoPercurso.value === "personalizado" ? "block" : "none";
});

// Obter localização atual
function obterLocalizacao() {
    if (!navigator.geolocation) {
        resultado.textContent = "Seu navegador não suporta localização.";
        return;
    }

    resultado.textContent = "Obtendo sua localização...";

    navigator.geolocation.getCurrentPosition(
        function (posicao) {
            coordenadasOrigem = {
                latitude: posicao.coords.latitude,
                longitude: posicao.coords.longitude
            };

            origem.value =
                `${coordenadasOrigem.latitude}, ${coordenadasOrigem.longitude}`;

            resultado.textContent =
                "Localização identificada com sucesso.";
        },
        function () {
            resultado.textContent =
                "Não foi possível obter sua localização. Informe a origem manualmente.";
        },
        {
            enableHighAccuracy: true,
            timeout: 15000
        }
    );
}

botaoLocalizacao.addEventListener("click", obterLocalizacao);

origem.addEventListener("input", function () {
    coordenadasOrigem = null;
});

// Converter endereço em coordenadas
async function buscarCoordenadas(endereco) {
    const texto = endereco.trim();

    if (!texto) {
        throw new Error("Preencha todos os locais da viagem.");
    }

    // Verificar se o usuário informou latitude e longitude
    const coordenadas = texto.match(
        /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/
    );

    if (coordenadas) {
        const latitude = Number(coordenadas[1]);
        const longitude = Number(coordenadas[2]);

        if (
            latitude < -90 || latitude > 90 ||
            longitude < -180 || longitude > 180
        ) {
            throw new Error("Coordenadas inválidas.");
        }

        return { latitude, longitude };
    }

    const url =
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=${encodeURIComponent(texto)}`;

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error("Erro ao pesquisar o endereço.");
    }

    const dados = await resposta.json();

    if (!dados.length) {
        throw new Error(`Não encontramos o endereço: ${texto}`);
    }

    return {
        latitude: Number(dados[0].lat),
        longitude: Number(dados[0].lon)
    };
}

// Calcular distância rodoviária
async function calcularDistancia(pontoA, pontoB) {
    const url =
        `https://router.project-osrm.org/route/v1/driving/${pontoA.longitude},${pontoA.latitude};${pontoB.longitude},${pontoB.latitude}?overview=false`;

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error("Não foi possível consultar a rota.");
    }

    const dados = await resposta.json();

    if (dados.code !== "Ok" || !dados.routes.length) {
        throw new Error("Não foi encontrada uma rota entre os locais.");
    }

    return dados.routes[0].distance / 1000;
}

// Calcular simulação completa
botaoCalcular.addEventListener("click", async function () {
    try {
        const consumo = Number(
            document.getElementById("consumo").value
        );

        const diesel = Number(
            document.getElementById("diesel").value
        );

        const veiculo = document.getElementById("veiculo").value;

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
        resultado.textContent = "Calculando rota e custos...";

        const pontoOrigem = await buscarCoordenadas(origem.value);
        const pontoDestino = await buscarCoordenadas(destino.value);

        // Primeiro trecho: origem até destino
        const distanciaIda = await calcularDistancia(
            pontoOrigem,
            pontoDestino
        );

        let distanciaRetorno = 0;
        let descricaoRetorno = "Não incluído";

        // Segundo trecho: retorno ao ponto de origem
        if (tipoPercurso.value === "ida_volta") {
            distanciaRetorno = await calcularDistancia(
                pontoDestino,
                pontoOrigem
            );

            descricaoRetorno = "Destino até origem";
        }

        // Segundo trecho: retorno para outro endereço
        if (tipoPercurso.value === "personalizado") {
            const pontoRetorno = await buscarCoordenadas(
                destinoRetorno.value
            );

            distanciaRetorno = await calcularDistancia(
                pontoDestino,
                pontoRetorno
            );

            descricaoRetorno = "Destino até retorno personalizado";
        }

        const distanciaTotal = distanciaIda + distanciaRetorno;
        const litros = distanciaTotal / consumo;
        const custo = litros * diesel;

        resultado.innerHTML = `
            <h3>Resultado da simulação</h3>

            <p>Veículo: ${veiculo}</p>

            <p>Distância de ida:
            ${distanciaIda.toFixed(2)} km</p>

            <p>Distância de retorno:
            ${distanciaRetorno.toFixed(2)} km</p>

            <p>${descricaoRetorno}</p>

            <p><strong>Distância total:
            ${distanciaTotal.toFixed(2)} km</strong></p>

            <p>Combustível necessário:
            ${litros.toFixed(2)} litros</p>

            <p>Preço do diesel:
            ${moeda.format(diesel)}</p>

            <h3>Custo estimado:
            ${moeda.format(custo)}</h3>
        `;

    } catch (erro) {
        resultado.textContent = erro.message;
    } finally {
        botaoCalcular.disabled = false;
    }
});
