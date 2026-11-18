
// ==========================================
// FREIGHT ANALYTICS | AGRÁRIA
// Integração com Python + Gráfico + Simulador
// ==========================================

const moeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});

const numero = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0
});

let graficoCustos = null;

// ==========================================
// 1. CARREGAR DADOS DO PYTHON
// ==========================================

async function carregarDadosPython() {
    try {
        const resposta = await fetch("./dados.json?v=" + Date.now());

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar dados.json");
        }

        const dados = await resposta.json();

        // Atualiza os indicadores
        document.getElementById("totalFretes").textContent =
            numero.format(dados.totalFretes);

        document.getElementById("custoTotal").textContent =
            moeda.format(dados.custoTotal);

        document.getElementById("custoMedio").textContent =
            moeda.format(dados.custoMedio);

        // Atualiza o gráfico mensal
        criarGraficoCustos(dados.custosMensais);

        console.log("Dados do Python carregados:", dados);

    } catch (erro) {
        console.error("Erro ao carregar dados:", erro);

        document.getElementById("totalFretes").textContent = "Indisponível";
        document.getElementById("custoTotal").textContent = "Indisponível";
        document.getElementById("custoMedio").textContent = "Indisponível";
    }
}

// ==========================================
// 2. CRIAR GRÁFICO DE CUSTOS MENSAIS
// ==========================================

function criarGraficoCustos(dadosMensais) {
    const canvas = document.getElementById("graficoCustosChart");

    if (!canvas || typeof Chart === "undefined") {
        console.error("Canvas ou biblioteca Chart.js não encontrados.");
        return;
    }

    if (!dadosMensais || !dadosMensais.labels || !dadosMensais.valores) {
        console.error("Dados mensais não encontrados no JSON.");
        return;
    }

    if (graficoCustos) {
        graficoCustos.destroy();
    }

    graficoCustos = new Chart(canvas, {
        type: "line",

        data: {
            labels: dadosMensais.labels,

            datasets: [{
                label: "Custo dos fretes",
                data: dadosMensais.valores,
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.12)",
                borderWidth: 3,
                fill: true,
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: true,
                    position: "top"
                },

                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return "Custo: " + moeda.format(context.raw);
                        }
                    }
                }
            },

            scales: {
                y: {
                    beginAtZero: true,

                    ticks: {
                        callback: function(valor) {
                            return moeda.format(valor);
                        }
                    }
                },

                x: {
                    title: {
                        display: true,
                        text: "Mês"
                    }
                }
            }
        }
    });
}

// ==========================================
// 3. LOCALIZAÇÃO DO USUÁRIO
// ==========================================

async function obterLocalizacao() {
    const campoOrigem = document.getElementById("origem");

    if (!navigator.geolocation) {
        campoOrigem.placeholder = "Localização não suportada";
        return;
    }

    campoOrigem.placeholder = "Obtendo localização...";

    navigator.geolocation.getCurrentPosition(
        async function(posicao) {
            const latitude = posicao.coords.latitude;
            const longitude = posicao.coords.longitude;

            try {
                const endereco = await buscarEndereco(latitude, longitude);

                campoOrigem.value = endereco;

            } catch (erro) {
                campoOrigem.value = `${latitude}, ${longitude}`;
            }
        },

        function() {
            campoOrigem.placeholder = "Digite sua localização";
        },

        {
            enableHighAccuracy: true,
            timeout: 10000
        }
    );
}

// ==========================================
// 4. BUSCAR ENDEREÇO PELO GPS
// ==========================================

async function buscarEndereco(latitude, longitude) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error("Erro ao buscar endereço.");
    }

    const dados = await resposta.json();

    return dados.display_name;
}

// ==========================================
// 5. TRANSFORMAR ENDEREÇO EM COORDENADAS
// ==========================================

async function buscarCoordenadas(endereco) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(endereco)}`;

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error("Erro ao pesquisar endereço.");
    }

    const dados = await resposta.json();

    if (!dados.length) {
        throw new Error("Endereço não encontrado: " + endereco);
    }

    return {
        latitude: parseFloat(dados[0].lat),
        longitude: parseFloat(dados[0].lon)
    };
}

// ==========================================
// 6. CALCULAR DISTÂNCIA PELA ROTA
// ==========================================

async function calcularDistancia(origem, destino) {
    const pontoOrigem = await buscarCoordenadas(origem);
    const pontoDestino = await buscarCoordenadas(destino);

    const url = `https://router.project-osrm.org/route/v1/driving/${pontoOrigem.longitude},${pontoOrigem.latitude};${pontoDestino.longitude},${pontoDestino.latitude}?overview=false`;

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error("Erro ao calcular a rota.");
    }

    const dados = await resposta.json();

    if (!dados.routes || !dados.routes.length) {
        throw new Error("Não foi possível encontrar uma rota.");
    }

    return {
        distancia: dados.routes[0].distance / 1000,
        duracao: dados.routes[0].duration / 3600
    };
}

// ==========================================
// 7. EXIBIR RESULTADO DA SIMULAÇÃO
// ==========================================

function exibirResultado(resultado) {
    const area = document.getElementById("resultadoSimulacao");

    area.innerHTML = `
        <h3>Resultado da simulação</h3>

        <p><strong>Veículo:</strong> ${resultado.veiculo}</p>

        <p><strong>Distância total:</strong>
            ${resultado.distancia.toFixed(1)} km
        </p>

        <p><strong>Tempo estimado:</strong>
            ${resultado.tempo.toFixed(1)} horas
        </p>

        <p><strong>Consumo estimado:</strong>
            ${resultado.litros.toFixed(2)} litros
        </p>

        <p><strong>Preço do diesel:</strong>
            ${moeda.format(resultado.precoDiesel)}
        </p>

        <p><strong>Custo estimado:</strong>
            ${moeda.format(resultado.custo)}
        </p>
    `;
}

// ==========================================
// 8. CALCULAR SIMULAÇÃO
// ==========================================

async function calcularSimulacao() {
    const origem = document.getElementById("origem").value.trim();
    const destino = document.getElementById("destino").value.trim();

    const tipoPercurso = document.getElementById("tipoPercurso").value;
    const destinoRetorno = document.getElementById("destinoRetorno").value.trim();

    const veiculo = document.getElementById("veiculo").value;

    const consumo = parseFloat(document.getElementById("consumo").value);
    const diesel = parseFloat(document.getElementById("diesel").value);

    const area = document.getElementById("resultadoSimulacao");
    const botao = document.getElementById("calcularSimulacao");

    // Validação dos campos
    if (!origem || !destino) {
        alert("Informe o local de partida e o destino.");
        return;
    }

    if (tipoPercurso === "personalizado" && !destinoRetorno) {
        alert("Informe o destino do retorno.");
        return;
    }

    if (!consumo || consumo <= 0 || !diesel || diesel <= 0) {
        alert("Informe valores válidos para consumo e preço do diesel.");
        return;
    }

    botao.disabled = true;
    botao.textContent = "Calculando rota...";

    area.textContent = "Consultando os endereços e calculando a distância...";

    try {
        // Calcula a ida
        const ida = await calcularDistancia(origem, destino);

        let distanciaTotal = ida.distancia;
        let tempoTotal = ida.duracao;

        // Ida e volta: retorna ao local de origem
        if (tipoPercurso === "ida_volta") {
            distanciaTotal += ida.distancia;
            tempoTotal += ida.duracao;
        }

        // Retorno personalizado: destino até outro endereço
        if (tipoPercurso === "personalizado") {
            const retorno = await calcularDistancia(
                destino,
                destinoRetorno
            );

            distanciaTotal += retorno.distancia;
            tempoTotal += retorno.duracao;
        }

        // Cálculo de combustível e custo
        const litros = distanciaTotal / consumo;
        const custo = litros * diesel;

        exibirResultado({
            veiculo: veiculo,
            distancia: distanciaTotal,
            tempo: tempoTotal,
            litros: litros,
            precoDiesel: diesel,
            custo: custo
        });

    } catch (erro) {
        console.error(erro);

        area.textContent =
            "Não foi possível calcular a rota. Verifique os endereços e tente novamente.";
    }

    botao.disabled = false;
    botao.textContent = "Calcular custo da viagem";
}

// ==========================================
// 9. CONTROLES DO SIMULADOR
// ==========================================

document.getElementById("usarLocalizacao").addEventListener("click", function() {
    obterLocalizacao();
});

document.getElementById("calcularSimulacao").addEventListener("click", function() {
    calcularSimulacao();
});

document.getElementById("tipoPercurso").addEventListener("change", function() {
    const campoRetorno = document.getElementById("campoRetorno");

    if (this.value === "personalizado") {
        campoRetorno.style.display = "block";
    } else {
        campoRetorno.style.display = "none";
    }
});

// ==========================================
// 10. INICIALIZAÇÃO
// ==========================================

document.addEventListener("DOMContentLoaded", function() {
    carregarDadosPython();
    obterLocalizacao();
});
