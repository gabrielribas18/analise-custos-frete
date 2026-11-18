
// ==========================================
// FREIGHT ANALYTICS | AGRÁRIA
// Integração Python + Dashboard + IA + Simulador
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
// CRIAR ÁREA DE DIESEL E INTELIGÊNCIA
// ==========================================

function adicionarAreaInteligencia() {
    const dashboard = document.getElementById("dashboard");
    const simulacao = document.getElementById("simulacao");

    if (!dashboard || !simulacao) return;

    const cards = dashboard.querySelector(".cards");

    if (cards && !document.getElementById("precoDieselMedio")) {
        const cardDiesel = document.createElement("article");
        cardDiesel.className = "card";
        cardDiesel.innerHTML = `
            <span>Diesel S10 médio - Paraná</span>
            <h3 id="precoDieselMedio">Carregando...</h3>
            <small id="dataDiesel">Referência de preço informada no arquivo de dados</small>
        `;
        cards.appendChild(cardDiesel);
    }

    const menu = document.querySelector(".sidebar nav");

    if (menu && !menu.querySelector('a[href="#areaInteligencia"]')) {
        const link = document.createElement("a");
        link.href = "#areaInteligencia";
        link.textContent = "Inteligência Artificial";
        menu.appendChild(link);
    }

    if (!document.getElementById("areaInteligencia")) {
        const secao = document.createElement("section");
        secao.id = "areaInteligencia";

        secao.innerHTML = `
            <div class="section-heading">
                <h2>Inteligência Artificial</h2>
                <p>Resultados do modelo LSTM aplicado aos custos de frete</p>
            </div>

            <div class="cards">
                <article class="card">
                    <span>Erro absoluto médio (MAE)</span>
                    <h3 id="lstmMAE">Aguardando dados...</h3>
                    <small>Erro médio das previsões</small>
                </article>

                <article class="card">
                    <span>Raiz do erro quadrático (RMSE)</span>
                    <h3 id="lstmRMSE">Aguardando dados...</h3>
                    <small>Penaliza erros maiores</small>
                </article>

                <article class="card">
                    <span>R² do modelo</span>
                    <h3 id="lstmR2">Aguardando dados...</h3>
                    <small>Coeficiente de determinação</small>
                </article>

                <article class="card">
                    <span>Total de previsões avaliadas</span>
                    <h3 id="totalPrevisoes">Aguardando dados...</h3>
                    <small>Registros do conjunto de teste</small>
                </article>
            </div>

            <div class="panel">
                <h3>Valores reais x valores previstos</h3>
                <div class="chart-placeholder">
                    <canvas id="graficoLSTM"></canvas>
                </div>
                <small>
                    Gráfico de amostra das previsões do conjunto de teste.
                    Não representa uma previsão garantida de fretes futuros.
                </small>
            </div>
        `;

        simulacao.parentNode.insertBefore(secao, simulacao);
    }
}

// ==========================================
// 1. CARREGAR DADOS DO PYTHON
// ==========================================

async function carregarDadosPython() {
    try {
        const resposta = await fetch("./dados.json?v=" + Date.now(), {
            cache: "no-store"
        });

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar dados.json");
        }

        const dados = await resposta.json();

        document.getElementById("totalFretes").textContent =
            numero.format(dados.totalFretes ?? 0);

        document.getElementById("custoTotal").textContent =
            moeda.format(dados.custoTotal ?? 0);

        document.getElementById("custoMedio").textContent =
            moeda.format(dados.custoMedio ?? 0);

        criarGraficoCustos(dados.custosMensais);

        if (dados.diesel) {
            const precoDiesel = document.getElementById("precoDieselMedio");
            const dataDiesel = document.getElementById("dataDiesel");
            const campoDiesel = document.getElementById("diesel");

            if (precoDiesel) {
                precoDiesel.textContent = moeda.format(dados.diesel.precoMedio);
            }

            if (dataDiesel) {
                dataDiesel.textContent =
                    `${dados.diesel.estado} | ${dados.diesel.periodo} | ${dados.diesel.fonte}`;
            }

            if (campoDiesel && !campoDiesel.value) {
                campoDiesel.value = dados.diesel.precoMedio;
            }
        }

        if (dados.lstm) {
            const modelo = dados.lstm;

            const mae = document.getElementById("lstmMAE");
            const rmse = document.getElementById("lstmRMSE");
            const r2 = document.getElementById("lstmR2");
            const total = document.getElementById("totalPrevisoes");

            if (mae) mae.textContent = moeda.format(modelo.mae);
            if (rmse) rmse.textContent = moeda.format(modelo.rmse);
            if (r2) r2.textContent = Number(modelo.r2).toFixed(4);

            if (total) {
                total.textContent = numero.format(modelo.quantidadePrevisoes);
            }

            criarGraficoLSTM(modelo.previsoes);
        }

        console.log("Dados carregados com sucesso:", dados);

    } catch (erro) {
        console.error("Erro ao carregar dados:", erro);

        document.getElementById("totalFretes").textContent = "Indisponível";
        document.getElementById("custoTotal").textContent = "Indisponível";
        document.getElementById("custoMedio").textContent = "Indisponível";

        const precoDiesel = document.getElementById("precoDieselMedio");

        if (precoDiesel) {
            precoDiesel.textContent = "Indisponível";
        }
    }
}

// ==========================================
// 2. GRÁFICO DE CUSTOS MENSAIS
// ==========================================

function criarGraficoCustos(dadosMensais) {
    const canvas = document.getElementById("graficoCustosChart");

    if (!canvas || typeof Chart === "undefined") {
        console.error("Canvas ou Chart.js não encontrados.");
        return;
    }

    if (
        !dadosMensais ||
        !Array.isArray(dadosMensais.labels) ||
        !Array.isArray(dadosMensais.valores)
    ) {
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
                pointRadius: 3
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
                        label: context =>
                            "Custo: " + moeda.format(context.raw)
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: valor => moeda.format(valor)
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
// 3. GRÁFICO DE PREVISÕES LSTM
// ==========================================

function criarGraficoLSTM(previsoes) {
    const canvas = document.getElementById("graficoLSTM");

    if (!canvas || typeof Chart === "undefined") {
        console.error("Canvas ou Chart.js não encontrados para a LSTM.");
        return;
    }

    if (!Array.isArray(previsoes) || previsoes.length === 0) {
        console.error("Não existem previsões da LSTM no JSON.");
        return;
    }

    if (graficoLSTM) {
        graficoLSTM.destroy();
    }

    graficoLSTM = new Chart(canvas, {
        type: "line",
        data: {
            labels: previsoes.map((item, index) =>
                item.data || "Registro " + (index + 1)
            ),
            datasets: [
                {
                    label: "Valor real",
                    data: previsoes.map(item => item.real),
                    borderColor: "#2563eb",
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.2
                },
                {
                    label: "Valor previsto (LSTM)",
                    data: previsoes.map(item => item.previsto),
                    borderColor: "#e58a26",
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
                    position: "top"
                },
                tooltip: {
                    callbacks: {
                        label: context =>
                            context.dataset.label + ": " +
                            moeda.format(context.raw)
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: valor => moeda.format(valor)
                    }
                },
                x: {
                    ticks: {
                        maxTicksLimit: 10
                    }
                }
            }
        }
    });
}

// ==========================================
// 4. LOCALIZAÇÃO DO USUÁRIO
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
// 5. BUSCAR ENDEREÇO PELO GPS
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
// 6. TRANSFORMAR ENDEREÇO EM COORDENADAS
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
// 7. CALCULAR DISTÂNCIA PELA ROTA
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
// 8. EXIBIR RESULTADO DA SIMULAÇÃO
// ==========================================

function exibirResultado(resultado) {
    const area = document.getElementById("resultadoSimulacao");

    area.innerHTML = `
        <h3>Resultado da simulação</h3>
        <p><strong>Veículo:</strong> ${resultado.veiculo}</p>
        <p><strong>Distância total:</strong> ${resultado.distancia.toFixed(1)} km</p>
        <p><strong>Tempo estimado:</strong> ${resultado.tempo.toFixed(1)} horas</p>
        <p><strong>Consumo estimado:</strong> ${resultado.litros.toFixed(2)} litros</p>
        <p><strong>Preço do diesel:</strong> ${moeda.format(resultado.precoDiesel)}</p>
        <p><strong>Custo estimado:</strong> ${moeda.format(resultado.custo)}</p>
    `;
}

// ==========================================
// 9. CALCULAR SIMULAÇÃO
// ==========================================

async function calcularSimulacao() {
    const origem = document.getElementById("origem").value.trim();
    const destino = document.getElementById("destino").value.trim();

    const tipoPercurso = document.getElementById("tipoPercurso").value;
    const destinoRetorno =
        document.getElementById("destinoRetorno").value.trim();

    const veiculo = document.getElementById("veiculo").value;

    const consumo = parseFloat(document.getElementById("consumo").value);
    const diesel = parseFloat(document.getElementById("diesel").value);

    const area = document.getElementById("resultadoSimulacao");
    const botao = document.getElementById("calcularSimulacao");

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
    area.textContent = "Consultando endereços e calculando a distância...";

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
            veiculo,
            distancia: distanciaTotal,
            tempo: tempoTotal,
            litros,
            precoDiesel: diesel,
            custo
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
// 10. INICIALIZAÇÃO DOS CONTROLES
// ==========================================

document.addEventListener("DOMContentLoaded", function() {

    adicionarAreaInteligencia();

    carregarDadosPython();

    const botaoLocalizacao = document.getElementById("usarLocalizacao");

    if (botaoLocalizacao) {
        botaoLocalizacao.addEventListener("click", obterLocalizacao);
    }

    const botaoSimulacao = document.getElementById("calcularSimulacao");

    if (botaoSimulacao) {
        botaoSimulacao.addEventListener("click", calcularSimulacao);
    }

    const tipoPercurso = document.getElementById("tipoPercurso");

    if (tipoPercurso) {
        tipoPercurso.addEventListener("change", function() {
            const campoRetorno = document.getElementById("campoRetorno");

            if (campoRetorno) {
                campoRetorno.style.display =
                    this.value === "personalizado" ? "block" : "none";
            }
        });
    }

    obterLocalizacao();
});
