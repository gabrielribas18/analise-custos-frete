
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

// ==========================================
// 11. INTEGRAÇÃO DIESEL + INTELIGÊNCIA ARTIFICIAL
// ==========================================

let graficoLSTM = null;

function adicionarAreaInteligencia() {
    const menu = document.querySelector(".sidebar nav");

    if (menu && !document.getElementById("linkInteligencia")) {
        const link = document.createElement("a");
        link.id = "linkInteligencia";
        link.href = "#inteligencia";
        link.textContent = "Inteligência Artificial";
        menu.appendChild(link);
    }

    const dashboard = document.getElementById("dashboard");
    const simulacao = document.getElementById("simulacao");

    if (!dashboard || !simulacao ||
        document.getElementById("inteligencia")) return;

    // Card do diesel
    const cards = dashboard.querySelector(".cards");

    if (cards) {
        const card = document.createElement("article");
        card.className = "card";
        card.innerHTML = `
            <span>Diesel S10 - Paraná</span>
            <h3 id="precoDieselMedio">Carregando...</h3>
            <small id="dataDiesel">Fonte: ANP</small>
        `;
        cards.appendChild(card);
    }

    // Área de inteligência artificial
    const secao = document.createElement("section");
    secao.id = "inteligencia";

    secao.innerHTML = `
        <div class="section-heading">
            <h2>Inteligência Artificial</h2>
            <p>Resultados do modelo de previsão LSTM</p>
        </div>

        <div class="cards">
            <article class="card">
                <span>MAE</span>
                <h3 id="lstmMAE">--</h3>
                <small>Erro médio absoluto</small>
            </article>

            <article class="card">
                <span>RMSE</span>
                <h3 id="lstmRMSE">--</h3>
                <small>Raiz do erro quadrático</small>
            </article>

            <article class="card">
                <span>R²</span>
                <h3 id="lstmR2">--</h3>
                <small>Capacidade explicativa</small>
            </article>

            <article class="card">
                <span>Previsões avaliadas</span>
                <h3 id="totalPrevisoes">--</h3>
                <small>Conjunto de teste</small>
            </article>
        </div>

        <div class="panel" style="margin-top:20px;">
            <h3>Valores reais x previstos</h3>
            <div style="height:350px; position:relative;">
                <canvas id="graficoLSTM"></canvas>
            </div>
            <p style="margin-top:15px;color:#64748b;font-size:13px;">
                Comparação histórica entre os valores reais e as
                previsões geradas pelo modelo LSTM.
            </p>
        </div>
    `;

    simulacao.parentNode.insertBefore(secao, simulacao);
}

// ==========================================
// 12. CARREGAR TODOS OS DADOS
// ==========================================

carregarDadosPython = async function() {
    try {
        const resposta = await fetch("./dados.json?v=" + Date.now());

        if (!resposta.ok) {
            throw new Error("Erro ao carregar dados.json");
        }

        const dados = await resposta.json();

        // Indicadores existentes
        document.getElementById("totalFretes").textContent =
            numero.format(dados.totalFretes);

        document.getElementById("custoTotal").textContent =
            moeda.format(dados.custoTotal);

        document.getElementById("custoMedio").textContent =
            moeda.format(dados.custoMedio);

        // Gráfico mensal existente
        criarGraficoCustos(dados.custosMensais);

        // Diesel
        if (dados.diesel) {
            document.getElementById("precoDieselMedio").textContent =
                moeda.format(dados.diesel.precoMedio);

            document.getElementById("dataDiesel").textContent =
                dados.diesel.estado + " | " +
                dados.diesel.periodo + " | " +
                dados.diesel.fonte;

            // Preencher automaticamente o simulador
            const campoDiesel = document.getElementById("diesel");

            if (campoDiesel) {
                campoDiesel.value = dados.diesel.precoMedio;
            }
        }

        // Inteligência artificial
        if (dados.lstm) {
            const modelo = dados.lstm;

            document.getElementById("lstmMAE").textContent =
                moeda.format(modelo.mae);

            document.getElementById("lstmRMSE").textContent =
                moeda.format(modelo.rmse);

            document.getElementById("lstmR2").textContent =
                Number(modelo.r2).toFixed(4);

            document.getElementById("totalPrevisoes").textContent =
                numero.format(modelo.quantidadePrevisoes);

            criarGraficoLSTM(modelo.previsoes);
        }

        console.log("Dados carregados com sucesso!", dados);

    } catch (erro) {
        console.error("Erro na integração:", erro);
    }
};

// ==========================================
// 13. GRÁFICO LSTM
// ==========================================

function criarGraficoLSTM(previsoes) {
    const canvas = document.getElementById("graficoLSTM");

    if (!canvas || typeof Chart === "undefined" ||
        !Array.isArray(previsoes) || !previsoes.length) {
        console.error("Não foi possível criar o gráfico LSTM.");
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
                        label: function(context) {
                            return context.dataset.label + ": " +
                                moeda.format(context.raw);
                        }
                    }
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: value => moeda.format(value)
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
// 14. INICIALIZAÇÃO DA NOVA ÁREA
// ==========================================

adicionarAreaInteligencia();

