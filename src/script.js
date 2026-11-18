
// ==========================================
// FREIGHT ANALYTICS | AGRÁRIA
// Dashboard + Inteligência Artificial + Simulador
// ==========================================

const moeda = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});

const numero = new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0
});

let graficoCustos = null;
let graficoLSTM = null;

// ==========================================
// 1. CARREGAR DADOS DO PYTHON
// ==========================================

async function carregarDadosPython() {
    try {
        const resposta = await fetch("./dados.json?v=" + Date.now(), {
            cache: "no-store"
        });

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar o arquivo dados.json.");
        }

        const dados = await resposta.json();

        // Indicadores do dashboard
        atualizarTexto("totalFretes", numero.format(dados.totalFretes ?? 0));
        atualizarTexto("custoTotal", moeda.format(dados.custoTotal ?? 0));
        atualizarTexto("custoMedio", moeda.format(dados.custoMedio ?? 0));

        // Gráfico de custos mensais
        criarGraficoCustos(dados.custosMensais);

        // Indicadores do diesel
        if (dados.diesel) {
            atualizarTexto(
                "precoDieselMedio",
                moeda.format(dados.diesel.precoMedio)
            );

            atualizarTexto(
                "dataDiesel",
                `${dados.diesel.estado} | ${dados.diesel.periodo} | ${dados.diesel.fonte}`
            );

            const campoDiesel = document.getElementById("diesel");

            if (campoDiesel && !campoDiesel.value) {
                campoDiesel.value = dados.diesel.precoMedio;
            }
        }

        // Indicadores e gráfico da inteligência artificial
        if (dados.lstm) {
            const modelo = dados.lstm;

            atualizarTexto("lstmMAE", moeda.format(modelo.mae));
            atualizarTexto("lstmRMSE", moeda.format(modelo.rmse));
            atualizarTexto("lstmR2", Number(modelo.r2).toFixed(4));

            atualizarTexto(
                "totalPrevisoes",
                numero.format(modelo.quantidadePrevisoes)
            );

            criarGraficoLSTM(modelo.previsoes);
        }

        console.log("Dados do Python carregados com sucesso.");

    } catch (erro) {
        console.error("Erro ao carregar dados:", erro);

        atualizarTexto("totalFretes", "Erro ao carregar");
        atualizarTexto("custoTotal", "Erro ao carregar");
        atualizarTexto("custoMedio", "Erro ao carregar");
        atualizarTexto("precoDieselMedio", "Erro ao carregar");
        atualizarTexto("lstmMAE", "Erro ao carregar");
        atualizarTexto("lstmRMSE", "Erro ao carregar");
        atualizarTexto("lstmR2", "Erro ao carregar");
        atualizarTexto("totalPrevisoes", "Erro ao carregar");
    }
}

// ==========================================
// 2. ATUALIZAR TEXTO DOS ELEMENTOS
// ==========================================

function atualizarTexto(id, valor) {
    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.textContent = valor;
    }
}

// ==========================================
// 3. GRÁFICO DE CUSTOS MENSAIS
// ==========================================

function criarGraficoCustos(dadosMensais) {
    const canvas = document.getElementById("graficoCustosChart");

    if (!canvas || typeof Chart === "undefined") {
        console.error("Gráfico de custos ou Chart.js não encontrado.");
        return;
    }

    if (
        !dadosMensais ||
        !Array.isArray(dadosMensais.labels) ||
        !Array.isArray(dadosMensais.valores)
    ) {
        console.error("Estrutura dos custos mensais inválida.");
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
                pointRadius: 3
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
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
// 4. GRÁFICO DA INTELIGÊNCIA ARTIFICIAL
// VALORES REAIS X VALORES PREVISTOS
// ==========================================

function criarGraficoLSTM(previsoes) {
    const canvas = document.getElementById("graficoLSTM");

    if (!canvas || typeof Chart === "undefined") {
        console.error("Gráfico LSTM ou Chart.js não encontrado.");
        return;
    }

    if (!Array.isArray(previsoes) || previsoes.length === 0) {
        console.error("Nenhuma previsão encontrada no dados.json.");
        return;
    }

    // Organiza os dados recebidos do Python
    const dadosValidos = previsoes.filter(item => {
        return (
            item &&
            Number.isFinite(Number(item.real)) &&
            Number.isFinite(Number(item.previsto))
        );
    });

    if (dadosValidos.length === 0) {
        console.error(
            "Não foram encontrados valores reais e previstos válidos."
        );
        return;
    }

    const labels = dadosValidos.map((item, index) => {
        return item.data || `Registro ${index + 1}`;
    });

    const valoresReais = dadosValidos.map(item => Number(item.real));

    const valoresPrevistos = dadosValidos.map(item => Number(item.previsto));

    // Impede a criação de gráficos duplicados
    if (graficoLSTM) {
        graficoLSTM.destroy();
        graficoLSTM = null;
    }

    graficoLSTM = new Chart(canvas, {
        type: "line",

        data: {
            labels: labels,

            datasets: [
                {
                    label: "Valores reais",

                    data: valoresReais,

                    borderColor: "#2563eb",
                    backgroundColor: "rgba(37, 99, 235, 0.10)",

                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.2
                },

                {
                    label: "Valores previstos (LSTM)",

                    data: valoresPrevistos,

                    borderColor: "#e58a26",
                    backgroundColor: "rgba(229, 138, 38, 0.10)",

                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.2
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                mode: "index",
                intersect: false
            },

            plugins: {
                legend: {
                    display: true,
                    position: "top"
                },

                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return (
                                context.dataset.label +
                                ": " +
                                moeda.format(context.raw)
                            );
                        }
                    }
                }
            },

            scales: {
                y: {
                    title: {
                        display: true,
                        text: "Custo do frete (R$)"
                    },

                    ticks: {
                        callback: function(valor) {
                            return moeda.format(valor);
                        }
                    }
                },

                x: {
                    title: {
                        display: true,
                        text: "Registros analisados"
                    },

                    ticks: {
                        maxTicksLimit: 10
                    }
                }
            }
        }
    });

    console.log(
        `Gráfico LSTM criado com ${dadosValidos.length} registros.`
    );
}

// ==========================================
// 5. OBTER LOCALIZAÇÃO
// ==========================================

function obterLocalizacao() {
    const campoOrigem = document.getElementById("origem");

    if (!navigator.geolocation) {
        alert("Seu navegador não suporta localização.");
        return;
    }

    campoOrigem.placeholder = "Obtendo localização...";

    navigator.geolocation.getCurrentPosition(
        async function(posicao) {
            const latitude = posicao.coords.latitude;
            const longitude = posicao.coords.longitude;

            try {
                const endereco = await buscarEndereco(
                    latitude,
                    longitude
                );

                campoOrigem.value = endereco;

            } catch (erro) {
                campoOrigem.value = `${latitude}, ${longitude}`;
            }
        },

        function() {
            campoOrigem.placeholder = "Digite sua localização";
            alert("Não foi possível obter sua localização.");
        },

        {
            enableHighAccuracy: true,
            timeout: 10000
        }
    );
}

// ==========================================
// 6. CONVERTER COORDENADAS EM ENDEREÇO
// ==========================================

async function buscarEndereco(latitude, longitude) {
    const url =
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`;

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error("Erro ao buscar endereço.");
    }

    const dados = await resposta.json();

    return dados.display_name;
}

// ==========================================
// 7. CONVERTER ENDEREÇO EM COORDENADAS
// ==========================================

async function buscarCoordenadas(endereco) {
    const url =
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(endereco)}`;

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
// 8. CALCULAR DISTÂNCIA DA ROTA
// ==========================================

async function calcularDistancia(origem, destino) {
    const pontoOrigem = await buscarCoordenadas(origem);
    const pontoDestino = await buscarCoordenadas(destino);

    const url =
        `https://router.project-osrm.org/route/v1/driving/${pontoOrigem.longitude},${pontoOrigem.latitude};${pontoDestino.longitude},${pontoDestino.latitude}?overview=false`;

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
// 9. EXIBIR RESULTADO DA SIMULAÇÃO
// ==========================================

function exibirResultado(resultado) {
    const area = document.getElementById("resultadoSimulacao");

    area.innerHTML = `
        <h3>Resultado da simulação</h3>

        <p><strong>Veículo:</strong> ${resultado.veiculo}</p>

        <p><strong>Distância total:</strong>
        ${resultado.distancia.toFixed(1)} km</p>

        <p><strong>Tempo estimado:</strong>
        ${resultado.tempo.toFixed(1)} horas</p>

        <p><strong>Consumo estimado:</strong>
        ${resultado.litros.toFixed(2)} litros</p>

        <p><strong>Preço do diesel:</strong>
        ${moeda.format(resultado.precoDiesel)}</p>

        <p><strong>Custo estimado:</strong>
        ${moeda.format(resultado.custo)}</p>
    `;
}

// ==========================================
// 10. CALCULAR SIMULAÇÃO
// ==========================================

async function calcularSimulacao() {
    const origem = document.getElementById("origem").value.trim();
    const destino = document.getElementById("destino").value.trim();

    const tipoPercurso =
        document.getElementById("tipoPercurso").value;

    const destinoRetorno =
        document.getElementById("destinoRetorno").value.trim();

    const veiculo =
        document.getElementById("veiculo").value;

    const consumo =
        parseFloat(document.getElementById("consumo").value);

    const diesel =
        parseFloat(document.getElementById("diesel").value);

    const area =
        document.getElementById("resultadoSimulacao");

    const botao =
        document.getElementById("calcularSimulacao");

    if (!origem || !destino) {
        alert("Informe o local de partida e o destino.");
        return;
    }

    if (tipoPercurso === "personalizado" && !destinoRetorno) {
        alert("Informe o destino do retorno.");
        return;
    }

    if (
        !Number.isFinite(consumo) ||
        consumo <= 0 ||
        !Number.isFinite(diesel) ||
        diesel <= 0
    ) {
        alert("Informe valores válidos para consumo e preço do diesel.");
        return;
    }

    botao.disabled = true;
    botao.textContent = "Calculando rota...";

    area.textContent =
        "Consultando endereços e calculando a distância...";

    try {
        const ida = await calcularDistancia(origem, destino);

        let distanciaTotal = ida.distancia;
        let tempoTotal = ida.duracao;

        if (tipoPercurso === "ida_volta") {
            distanciaTotal += ida.distancia;
            tempoTotal += ida.duracao;
        }

        if (tipoPercurso === "personalizado") {
            const retorno = await calcularDistancia(
                destino,
                destinoRetorno
            );

            distanciaTotal += retorno.distancia;
            tempoTotal += retorno.duracao;
        }

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
        console.error("Erro na simulação:", erro);

        area.textContent =
            "Não foi possível calcular a rota. Verifique os endereços e tente novamente.";

    } finally {
        botao.disabled = false;
        botao.textContent = "Calcular custo da viagem";
    }
}

// ==========================================
// 11. INICIALIZAÇÃO
// ==========================================

document.addEventListener("DOMContentLoaded", function() {

    // Carrega os dados sem criar novas seções no HTML
    carregarDadosPython();

    // Botão de localização
    const botaoLocalizacao =
        document.getElementById("usarLocalizacao");

    if (botaoLocalizacao) {
        botaoLocalizacao.addEventListener(
            "click",
            obterLocalizacao
        );
    }

    // Botão de simulação
    const botaoSimulacao =
        document.getElementById("calcularSimulacao");

    if (botaoSimulacao) {
        botaoSimulacao.addEventListener(
            "click",
            calcularSimulacao
        );
    }

    // Campo de retorno personalizado
    const tipoPercurso =
        document.getElementById("tipoPercurso");

    if (tipoPercurso) {
        tipoPercurso.addEventListener("change", function() {

            const campoRetorno =
                document.getElementById("campoRetorno");

            if (campoRetorno) {
                campoRetorno.style.display =
                    this.value === "personalizado"
                        ? "block"
                        : "none";
            }
        });
    }

    console.log("Freight Analytics iniciado.");
});
