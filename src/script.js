
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

// ==========================================
// 12. PERFIS DEMONSTRATIVOS
// ==========================================

let perfilAtual = null;

let fretesDemo = [
    {
        codigo: "FRT001",
        origem: "Guarapuava - PR",
        destino: "Cascavel - PR",
        carga: "Soja",
        peso: 32,
        motorista: "Carlos Henrique",
        placa: "ABC-1D23",
        valor: 2800,
        status: "Disponível"
    },
    {
        codigo: "FRT002",
        origem: "Guarapuava - PR",
        destino: "Ponta Grossa - PR",
        carga: "Milho",
        peso: 28,
        motorista: "João Martins",
        placa: "DEF-4G56",
        valor: 2200,
        status: "Em transporte"
    }
];

function carregarBibliotecaQR() {
    return new Promise((resolve, reject) => {
        if (window.QRCode) {
            resolve();
            return;
        }

        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

        script.onload = resolve;
        script.onerror = reject;

        document.head.appendChild(script);
    });
}

function criarInterfacePerfis() {
    const estilo = document.createElement("style");

    estilo.textContent = `
        #areaPerfis {
            position: fixed;
            inset: 0;
            z-index: 9999;
            background: #f3f5f8;
            overflow-y: auto;
            padding: 35px 20px;
            color: #1e293b;
            font-family: Arial, sans-serif;
        }

        .perfil-container {
            max-width: 1050px;
            margin: 35px auto;
        }

        .perfil-cabecalho {
            text-align: center;
            margin-bottom: 35px;
        }

        .perfil-cabecalho h1 {
            font-size: 30px;
            margin-bottom: 10px;
        }

        .perfil-opcoes {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 22px;
        }

        .perfil-card {
            background: white;
            padding: 35px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            cursor: pointer;
            transition: .2s;
        }

        .perfil-card:hover {
            transform: translateY(-4px);
            border-color: #2563eb;
            box-shadow: 0 8px 25px rgba(0,0,0,.07);
        }

        .perfil-card h2 {
            margin: 15px 0 10px;
        }

        .perfil-icone {
            font-size: 35px;
        }

        .perfil-botao {
            background: #2563eb;
            color: white;
            border: none;
            border-radius: 7px;
            padding: 12px 18px;
            cursor: pointer;
            margin-top: 15px;
            font-size: 14px;
        }

        .perfil-botao.secundario {
            background: #475569;
        }

        .perfil-painel {
            background: white;
            padding: 25px;
            border-radius: 12px;
            margin-top: 20px;
            border: 1px solid #e2e8f0;
        }

        .perfil-formulario {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 15px;
        }

        .perfil-formulario label {
            display: block;
            font-size: 13px;
            margin-bottom: 6px;
            font-weight: bold;
        }

        .perfil-formulario input,
        .perfil-formulario select {
            width: 100%;
            padding: 11px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            box-sizing: border-box;
        }

        .frete-demo {
            padding: 17px 0;
            border-bottom: 1px solid #e2e8f0;
        }

        .frete-demo:last-child {
            border-bottom: none;
        }

        .frete-demo h3 {
            margin: 0 0 8px;
        }

        .frete-demo p {
            margin: 5px 0;
            color: #64748b;
            font-size: 14px;
        }

        .perfil-acoes {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 20px;
        }

        #qrResultado {
            margin-top: 20px;
            text-align: center;
        }

        #qrResultado canvas,
        #qrResultado img {
            margin: 15px auto;
        }

        .perfil-etiqueta {
            display: inline-block;
            padding: 5px 9px;
            border-radius: 5px;
            background: #e0edff;
            color: #1d4ed8;
            font-size: 12px;
        }

        @media(max-width: 650px) {
            .perfil-opcoes,
            .perfil-formulario {
                grid-template-columns: 1fr;
            }

            .perfil-card {
                padding: 25px;
            }
        }
    `;

    document.head.appendChild(estilo);

    const area = document.createElement("div");
    area.id = "areaPerfis";

    document.body.appendChild(area);

    mostrarSelecaoPerfis();
}

function mostrarSelecaoPerfis() {
    const area = document.getElementById("areaPerfis");

    area.innerHTML = `
        <div class="perfil-container">

            <div class="perfil-cabecalho">
                <h1>FREIGHT ANALYTICS</h1>
                <p>AGRÁRIA | Plataforma de gestão de transporte</p>
                <span class="perfil-etiqueta">AMBIENTE DEMONSTRATIVO</span>
                <h2 style="margin-top:35px">Selecione seu perfil</h2>
                <p>Escolha como deseja acessar a plataforma.</p>
            </div>

            <div class="perfil-opcoes">

                <div class="perfil-card" onclick="abrirPerfil('empresa')">
                    <div class="perfil-icone">🏢</div>
                    <h2>Empresa</h2>
                    <p>Gerenciamento de fretes, cadastro de cargas,
                    motoristas e acompanhamento das viagens.</p>
                    <button class="perfil-botao">Acessar como empresa</button>
                </div>

                <div class="perfil-card" onclick="abrirPerfil('caminhoneiro')">
                    <div class="perfil-icone">🚛</div>
                    <h2>Caminhoneiro</h2>
                    <p>Consulta de fretes, informações da carga,
                    rotas e detalhes da viagem.</p>
                    <button class="perfil-botao">Acessar como caminhoneiro</button>
                </div>

            </div>
        </div>
    `;
}

function abrirPerfil(perfil) {
    perfilAtual = perfil;

    if (perfil === "empresa") {
        mostrarPainelEmpresa();
    } else {
        mostrarPainelCaminhoneiro();
    }
}

function mostrarPainelEmpresa() {
    const area = document.getElementById("areaPerfis");

    area.innerHTML = `
        <div class="perfil-container">

            <h1>Painel da Empresa</h1>
            <p>Gerenciamento demonstrativo de fretes e viagens.</p>

            <div class="perfil-acoes">
                <button class="perfil-botao secundario"
                    onclick="mostrarSelecaoPerfis()">
                    Trocar perfil
                </button>

                <button class="perfil-botao"
                    onclick="abrirDashboardOriginal()">
                    Abrir dashboard analítico
                </button>
            </div>

            <div class="perfil-painel">
                <h2>Cadastrar novo frete</h2>

                <form id="formFrete" class="perfil-formulario">

                    <div>
                        <label>Origem</label>
                        <input name="origem" required placeholder="Ex: Guarapuava - PR">
                    </div>

                    <div>
                        <label>Destino</label>
                        <input name="destino" required placeholder="Ex: Curitiba - PR">
                    </div>

                    <div>
                        <label>Tipo de carga</label>
                        <input name="carga" required placeholder="Ex: Soja">
                    </div>

                    <div>
                        <label>Peso (toneladas)</label>
                        <input name="peso" type="number" min="0.1" step="0.1" required>
                    </div>

                    <div>
                        <label>Motorista</label>
                        <input name="motorista" required>
                    </div>

                    <div>
                        <label>Placa do veículo</label>
                        <input name="placa" required placeholder="ABC-1D23">
                    </div>

                    <div>
                        <label>Valor do frete (R$)</label>
                        <input name="valor" type="number" min="0.01" step="0.01" required>
                    </div>

                    <div style="align-self:end">
                        <button class="perfil-botao" type="submit">
                            Cadastrar frete
                        </button>
                    </div>

                </form>
            </div>

            <div class="perfil-painel">
                <h2>Fretes cadastrados</h2>
                <div id="listaFretesEmpresa"></div>
            </div>

            <div class="perfil-painel" id="qrResultado">
                <h2>QR Code do frete</h2>
                <p>Selecione um frete para gerar seu código de consulta.</p>
            </div>

        </div>
    `;

    document.getElementById("formFrete").addEventListener("submit", cadastrarFreteDemo);

    atualizarListaEmpresa();
}

function cadastrarFreteDemo(evento) {
    evento.preventDefault();

    const formulario = new FormData(evento.target);

    const novoFrete = {
        codigo: "FRT" + String(Date.now()).slice(-6),
        origem: formulario.get("origem").trim(),
        destino: formulario.get("destino").trim(),
        carga: formulario.get("carga").trim(),
        peso: Number(formulario.get("peso")),
        motorista: formulario.get("motorista").trim(),
        placa: formulario.get("placa").trim().toUpperCase(),
        valor: Number(formulario.get("valor")),
        status: "Disponível"
    };

    if (
        !Number.isFinite(novoFrete.peso) ||
        novoFrete.peso <= 0 ||
        !Number.isFinite(novoFrete.valor) ||
        novoFrete.valor <= 0
    ) {
        alert("Informe peso e valor válidos.");
        return;
    }

    fretesDemo.push(novoFrete);

    evento.target.reset();

    atualizarListaEmpresa();

    alert("Frete demonstrativo cadastrado com sucesso!");
}

function atualizarListaEmpresa() {
    const lista = document.getElementById("listaFretesEmpresa");

    if (!lista) return;

    lista.replaceChildren();

    fretesDemo.forEach(frete => {
        const item = document.createElement("div");
        item.className = "frete-demo";

        const titulo = document.createElement("h3");
        titulo.textContent = `${frete.codigo} | ${frete.carga}`;

        const detalhes = document.createElement("p");
        detalhes.textContent = `${frete.origem} → ${frete.destino}`;

        const motorista = document.createElement("p");
        motorista.textContent = `Motorista: ${frete.motorista} | Placa: ${frete.placa}`;

        const valor = document.createElement("p");
        valor.textContent = `Peso: ${frete.peso} t | Valor: ${moeda.format(frete.valor)}`;

        const botao = document.createElement("button");
        botao.className = "perfil-botao";
        botao.textContent = "Gerar QR Code";

        botao.addEventListener("click", () => gerarQRCodeFrete(frete));

        item.append(titulo, detalhes, motorista, valor, botao);
        lista.appendChild(item);
    });
}

async function gerarQRCodeFrete(frete) {
    const resultado = document.getElementById("qrResultado");

    resultado.innerHTML = `
        <h2>QR Code do frete</h2>
        <p>Código: ${frete.codigo}</p>
        <div id="qrImagem"></div>
        <p>O caminhoneiro pode informar este código no perfil de consulta.</p>
    `;

    try {
        await carregarBibliotecaQR();

        new QRCode(document.getElementById("qrImagem"), {
            text: frete.codigo,
            width: 180,
            height: 180
        });
    } catch (erro) {
        resultado.insertAdjacentText(
            "beforeend",
            "Não foi possível carregar o gerador de QR Code."
        );
    }
}

function mostrarPainelCaminhoneiro() {
    const area = document.getElementById("areaPerfis");

    area.innerHTML = `
        <div class="perfil-container">

            <h1>Painel do Caminhoneiro</h1>
            <p>Consulte as informações da sua viagem.</p>

            <div class="perfil-acoes">
                <button class="perfil-botao secundario"
                    onclick="mostrarSelecaoPerfis()">
                    Trocar perfil
                </button>

                <button class="perfil-botao"
                    onclick="abrirDashboardOriginal()">
                    Abrir dashboard analítico
                </button>
            </div>

            <div class="perfil-painel">
                <h2>Consultar frete</h2>

                <label for="codigoConsulta">Código do frete</label>

                <input
                    id="codigoConsulta"
                    placeholder="Ex: FRT001"
                    style="padding:12px;width:100%;max-width:350px;
                    border:1px solid #cbd5e1;border-radius:6px;
                    box-sizing:border-box;"
                >

                <button class="perfil-botao"
                    onclick="consultarFreteDemo()">
                    Consultar viagem
                </button>

                <div id="resultadoFreteMotorista" style="margin-top:20px"></div>
            </div>

            <div class="perfil-painel">
                <h2>Fretes disponíveis</h2>
                <div id="fretesDisponiveis"></div>
            </div>

        </div>
    `;

    atualizarFretesCaminhoneiro();
}

function consultarFreteDemo() {
    const codigo = document.getElementById("codigoConsulta")
        .value.trim().toUpperCase();

    const frete = fretesDemo.find(item => item.codigo === codigo);

    const resultado = document.getElementById("resultadoFreteMotorista");

    resultado.replaceChildren();

    if (!frete) {
        resultado.textContent = "Frete não encontrado. Confira o código informado.";
        return;
    }

    const titulo = document.createElement("h3");
    titulo.textContent = `Viagem ${frete.codigo}`;

    const dados = [
        `Origem: ${frete.origem}`,
        `Destino: ${frete.destino}`,
        `Carga: ${frete.carga}`,
        `Peso: ${frete.peso} toneladas`,
        `Motorista: ${frete.motorista}`,
        `Placa: ${frete.placa}`,
        `Valor do frete: ${moeda.format(frete.valor)}`,
        `Situação: ${frete.status}`
    ];

    resultado.appendChild(titulo);

    dados.forEach(texto => {
        const paragrafo = document.createElement("p");
        paragrafo.textContent = texto;
        resultado.appendChild(paragrafo);
    });
}

function atualizarFretesCaminhoneiro() {
    const lista = document.getElementById("fretesDisponiveis");

    if (!lista) return;

    lista.replaceChildren();

    fretesDemo.forEach(frete => {
        const item = document.createElement("div");
        item.className = "frete-demo";

        const titulo = document.createElement("h3");
        titulo.textContent = `${frete.codigo} | ${frete.carga}`;

        const rota = document.createElement("p");
        rota.textContent = `${frete.origem} → ${frete.destino}`;

        const situacao = document.createElement("p");
        situacao.textContent = `Situação: ${frete.status}`;

        const botao = document.createElement("button");
        botao.className = "perfil-botao";
        botao.textContent = "Consultar este frete";

        botao.addEventListener("click", () => {
            document.getElementById("codigoConsulta").value = frete.codigo;
            consultarFreteDemo();
        });

        item.append(titulo, rota, situacao, botao);
        lista.appendChild(item);
    });
}

function abrirDashboardOriginal() {
    document.getElementById("areaPerfis").style.display = "none";

    const botao = document.getElementById("botaoTrocarPerfil");

    if (botao) {
        botao.remove();
    }

    const novoBotao = document.createElement("button");

    novoBotao.id = "botaoTrocarPerfil";
    novoBotao.className = "perfil-botao";
    novoBotao.textContent = "Trocar perfil";

    novoBotao.style.position = "fixed";
    novoBotao.style.top = "20px";
    novoBotao.style.right = "20px";
    novoBotao.style.zIndex = "10000";

    novoBotao.addEventListener("click", () => {
        document.getElementById("areaPerfis").style.display = "block";
        mostrarSelecaoPerfis();
        novoBotao.remove();
    });

    document.body.appendChild(novoBotao);

    window.location.hash = "dashboard";
}

// Inicia a tela de seleção de perfis
document.addEventListener("DOMContentLoaded", criarInterfacePerfis);
