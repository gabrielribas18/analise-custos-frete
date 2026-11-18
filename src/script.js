
/* =====================================================
   FREIGHT ANALYTICS | AGRÁRIA
   Dashboard + Perfis demonstrativos
   ===================================================== */

/* =========================
   VARIÁVEIS GLOBAIS
========================= */

let graficoCustos = null;
let graficoLSTM = null;
let perfilAtual = null;

const CHAVE_FRETES = "freightAnalytics_fretes";

const fretesIniciais = [
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

let fretesDemo = carregarFretesSalvos();

/* =========================
   FUNÇÕES AUXILIARES
========================= */

function elemento(id) {
    return document.getElementById(id);
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function atualizarTexto(id, valor) {
    const campo = elemento(id);

    if (campo) {
        campo.textContent = valor;
    }
}

function carregarFretesSalvos() {
    try {
        const dados = localStorage.getItem(CHAVE_FRETES);

        if (dados) {
            const fretes = JSON.parse(dados);

            if (Array.isArray(fretes)) {
                return fretes;
            }
        }
    } catch (erro) {
        console.error("Erro ao recuperar fretes:", erro);
    }

    return [...fretesIniciais];
}

function salvarFretes() {
    try {
        localStorage.setItem(
            CHAVE_FRETES,
            JSON.stringify(fretesDemo)
        );
    } catch (erro) {
        console.error("Erro ao salvar fretes:", erro);
        alert("Não foi possível salvar os fretes neste navegador.");
    }
}

/* =========================
   CARREGAMENTO DOS DADOS
========================= */

async function carregarDadosPython() {
    try {
        const resposta = await fetch("dados.json?v=" + Date.now());

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar dados.json");
        }

        const dados = await resposta.json();

        atualizarIndicadores(dados);
        criarGraficoCustos(dados);
        atualizarInteligenciaArtificial(dados);

        console.log("Dados do Python carregados com sucesso.");

    } catch (erro) {
        console.error("Erro ao carregar os dados:", erro);
    }
}

/* =========================
   INDICADORES PRINCIPAIS
========================= */

function atualizarIndicadores(dados) {
    const diesel = dados.diesel || {};

    const indicadores = {
        totalFretes: dados.totalFretes,
        totalRegistros: dados.totalRegistros,
        custoTotal: dados.custoTotal,
        custoMedio: dados.custoMedio,
        diesel: diesel.precoMedio
    };

    const campos = {
        totalFretes: ["totalFretes", "kpiFretes"],
        totalRegistros: ["totalRegistros", "kpiRegistros"],
        custoTotal: ["custoTotal", "kpiCustoTotal"],
        custoMedio: ["custoMedio", "kpiCustoMedio"],
        diesel: ["dieselS10", "kpiDiesel", "precoDieselMedio"]
    };

    Object.entries(campos).forEach(([chave, ids]) => {
        ids.forEach(id => {
            const campo = elemento(id);
            const valor = indicadores[chave];

            if (!campo || valor === undefined || valor === null) {
                return;
            }

            campo.textContent =
                ["custoTotal", "custoMedio", "diesel"].includes(chave)
                    ? formatarMoeda(valor)
                    : Number(valor).toLocaleString("pt-BR");
        });
    });

    atualizarTexto(
        "dataDiesel",
        `Fonte: ${diesel.fonte || "ANP"} | ${diesel.periodo || "--"}`
    );

    // Atualiza o preço do diesel nos campos do simulador.
    ["precoDiesel", "diesel"].forEach(id => {
        const campo = elemento(id);

        if (
            campo &&
            diesel.precoMedio !== undefined &&
            campo.tagName === "INPUT"
        ) {
            campo.value = Number(diesel.precoMedio).toFixed(2);
        }
    });
}

/* =========================
   GRÁFICO DE CUSTOS
========================= */

function criarGraficoCustos(dados) {
    const canvas = elemento("graficoCustosChart");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    const registros = dados.custosMensais || {};

    const labels = registros.labels || [];
    const valores = registros.valores || [];

    if (!labels.length || !valores.length) {
        console.warn("Dados mensais não encontrados.");
        return;
    }

    if (graficoCustos) {
        graficoCustos.destroy();
    }

    graficoCustos = new Chart(canvas, {
        type: "line",

        data: {
            labels: labels,

            datasets: [{
                label: "Custo dos fretes",
                data: valores,
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.12)",
                borderWidth: 2,
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
                    display: true
                },

                tooltip: {
                    callbacks: {
                        label: contexto =>
                            formatarMoeda(contexto.raw)
                    }
                }
            },

            scales: {
                y: {
                    beginAtZero: true,

                    ticks: {
                        callback: valor => formatarMoeda(valor)
                    }
                }
            }
        }
    });
}

/* =========================
   INTELIGÊNCIA ARTIFICIAL
========================= */

function atualizarInteligenciaArtificial(dados) {
    const ia = dados.lstm || {};

    atualizarTexto(
        "maeLSTM",
        ia.mae !== undefined ? formatarMoeda(ia.mae) : "--"
    );

    atualizarTexto(
        "rmseLSTM",
        ia.rmse !== undefined ? formatarMoeda(ia.rmse) : "--"
    );

    atualizarTexto(
        "r2LSTM",
        ia.r2 !== undefined
            ? Number(ia.r2).toFixed(4)
            : "--"
    );

    atualizarTexto(
        "totalPredicoes",
        Number(ia.quantidadePrevisoes || 0).toLocaleString("pt-BR")
    );

    criarGraficoLSTM(dados);
}

/* =========================
   GRÁFICO LSTM
========================= */

function criarGraficoLSTM(dados) {
    const canvas = elemento("graficoLSTM");

    if (!canvas || typeof Chart === "undefined") {
        return;
    }

    const previsoes = dados.lstm?.previsoes || [];

    if (!previsoes.length) {
        return;
    }

    // Limita a amostra para manter o gráfico legível.
    const quantidade = Math.min(150, previsoes.length);
    const passo = previsoes.length / quantidade;

    const amostra = Array.from(
        { length: quantidade },
        (_, indice) => previsoes[Math.floor(indice * passo)]
    );

    const labels = amostra.map(item => item.data);
    const reais = amostra.map(item => Number(item.real));
    const previstos = amostra.map(item => Number(item.previsto));

    if (graficoLSTM) {
        graficoLSTM.destroy();
    }

    graficoLSTM = new Chart(canvas, {
        type: "line",

        data: {
            labels: labels,

            datasets: [
                {
                    label: "Valores reais",
                    data: reais,
                    borderColor: "#2563eb",
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.2
                },
                {
                    label: "Valores previstos",
                    data: previstos,
                    borderColor: "#f59e0b",
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.2
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            plugins: {
                legend: {
                    display: true
                }
            },

            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

/* =========================
   LOCALIZAÇÃO
========================= */

async function obterLocalizacao() {
    if (!navigator.geolocation) {
        alert("Seu navegador não oferece suporte à localização.");
        return;
    }

    navigator.geolocation.getCurrentPosition(
        async posicao => {
            const latitude = posicao.coords.latitude;
            const longitude = posicao.coords.longitude;

            const campo = elemento("origem");

            if (campo) {
                campo.value = `${latitude}, ${longitude}`;
            }

            try {
                const resposta = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
                );

                if (!resposta.ok) {
                    throw new Error("Erro ao consultar endereço.");
                }

                const dados = await resposta.json();

                if (campo && dados.display_name) {
                    campo.value = dados.display_name;
                }

            } catch (erro) {
                console.error("Erro ao consultar endereço:", erro);
            }
        },

        erro => {
            console.error(erro);
            alert("Não foi possível obter sua localização.");
        },

        {
            enableHighAccuracy: true,
            timeout: 15000
        }
    );
}

/* =========================
   BUSCA DE COORDENADAS
========================= */

async function buscarCoordenadas(endereco) {
    const resposta = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`
    );

    if (!resposta.ok) {
        throw new Error("Erro ao consultar localização.");
    }

    const dados = await resposta.json();

    if (!dados.length) {
        throw new Error("Endereço não encontrado: " + endereco);
    }

    return {
        lat: Number(dados[0].lat),
        lon: Number(dados[0].lon)
    };
}

/* =========================
   BUSCA DE ROTAS
========================= */

async function buscarRota(origem, destino) {
    const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${origem.lon},${origem.lat};${destino.lon},${destino.lat}` +
        "?overview=false";

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error("Erro ao consultar a rota.");
    }

    const dados = await resposta.json();

    if (
        dados.code !== "Ok" ||
        !dados.routes ||
        !dados.routes.length
    ) {
        throw new Error("Não foi possível encontrar a rota.");
    }

    return dados.routes[0];
}

/* =========================
   SIMULAÇÃO DE FRETE
========================= */

async function calcularSimulacao() {
    const origem = elemento("origem")?.value.trim();
    const destino = elemento("destino")?.value.trim();

    const consumo = Number(
        elemento("consumo")?.value ||
        elemento("consumoVeiculo")?.value
    );

    const precoDiesel = Number(
        elemento("precoDiesel")?.value ||
        elemento("diesel")?.value
    );

    const resultado = elemento("resultadoSimulacao");

    if (!origem || !destino) {
        alert("Informe a origem e o destino.");
        return;
    }

    if (
        !Number.isFinite(consumo) ||
        consumo <= 0 ||
        !Number.isFinite(precoDiesel) ||
        precoDiesel <= 0
    ) {
        alert("Informe um consumo e um preço de diesel válidos.");
        return;
    }

    if (resultado) {
        resultado.textContent = "Calculando rota...";
    }

    try {
        const coordenadasOrigem = await buscarCoordenadas(origem);
        const coordenadasDestino = await buscarCoordenadas(destino);

        const rotaIda = await buscarRota(
            coordenadasOrigem,
            coordenadasDestino
        );

        const distanciaIda = rotaIda.distance / 1000;
        const tempoIda = rotaIda.duration / 3600;

        const tipoRota =
            elemento("tipoRota")?.value ||
            elemento("tipoPercurso")?.value ||
            "somente_ida";

        let distanciaTotal = distanciaIda;
        let tempoTotal = tempoIda;
        let distanciaRetorno = 0;

        if (tipoRota === "ida_volta") {
            distanciaRetorno = distanciaIda;
        }

        if (tipoRota === "personalizado") {
            const destinoRetorno = elemento("destinoRetorno")?.value.trim();

            if (!destinoRetorno) {
                alert("Informe o destino de retorno.");
                return;
            }

            const coordenadasRetorno =
                await buscarCoordenadas(destinoRetorno);

            const rotaRetorno = await buscarRota(
                coordenadasDestino,
                coordenadasRetorno
            );

            distanciaRetorno = rotaRetorno.distance / 1000;
            tempoTotal += rotaRetorno.duration / 3600;
        }

        distanciaTotal += distanciaRetorno;

        const litrosTotal = distanciaTotal / consumo;
        const custoTotal = litrosTotal * precoDiesel;

        if (resultado) {
            resultado.innerHTML = "";

            const titulo = document.createElement("h3");
            titulo.textContent = "Resultado da simulação";

            const informacoes = [
                `Distância de ida: ${distanciaIda.toFixed(1)} km`,
                `Distância de retorno: ${distanciaRetorno.toFixed(1)} km`,
                `Distância total: ${distanciaTotal.toFixed(1)} km`,
                `Tempo estimado: ${tempoTotal.toFixed(1)} horas`,
                `Combustível estimado: ${litrosTotal.toFixed(1)} litros`,
                `Preço do diesel: ${formatarMoeda(precoDiesel)}`,
                `Custo estimado: ${formatarMoeda(custoTotal)}`
            ];

            resultado.appendChild(titulo);

            informacoes.forEach(texto => {
                const paragrafo = document.createElement("p");
                paragrafo.textContent = texto;
                resultado.appendChild(paragrafo);
            });
        }

    } catch (erro) {
        console.error("Erro na simulação:", erro);

        if (resultado) {
            resultado.textContent =
                "Não foi possível calcular a rota. Verifique os endereços e tente novamente.";
        }
    }
}

/* =========================
   CAMPO DE RETORNO
========================= */

function controlarCampoRetorno() {
    const tipo =
        elemento("tipoRota") ||
        elemento("tipoPercurso");

    const campo = elemento("campoRetorno");

    if (!tipo || !campo) {
        return;
    }

    campo.style.display =
        tipo.value === "personalizado" ? "block" : "none";
}

/* =====================================================
   PERFIS DEMONSTRATIVOS
===================================================== */

/* =========================
   BIBLIOTECA QR CODE
========================= */

function carregarBibliotecaQR() {
    if (window.QRCode) {
        return Promise.resolve();
    }

    if (window.promessaQRCode) {
        return window.promessaQRCode;
    }

    window.promessaQRCode = new Promise((resolve, reject) => {
        const script = document.createElement("script");

        script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

        script.onload = resolve;

        script.onerror = () => {
            window.promessaQRCode = null;
            reject(new Error("Não foi possível carregar o QR Code."));
        };

        document.head.appendChild(script);
    });

    return window.promessaQRCode;
}

/* =========================
   INTERFACE DOS PERFIS
========================= */

function criarInterfacePerfis() {
    if (elemento("areaPerfis")) {
        return;
    }

    const estilos = document.createElement("style");

    estilos.textContent = `
        #areaPerfis {
            position: fixed;
            inset: 0;
            z-index: 99999;
            background: #f3f5f8;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            overflow-y: auto;
            font-family: Arial, sans-serif;
        }

        .perfil-container {
            width: 100%;
            max-width: 850px;
            margin: auto;
        }

        .perfil-titulo {
            text-align: center;
            margin-bottom: 30px;
            color: #172033;
        }

        .perfil-titulo h1 {
            margin-bottom: 10px;
            font-size: 30px;
        }

        .perfil-titulo p {
            color: #64748b;
        }

        .perfil-opcoes {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
            gap: 20px;
        }

        .perfil-card {
            background: white;
            padding: 30px;
            border-radius: 14px;
            border: 1px solid #e2e8f0;
            cursor: pointer;
            transition: .2s;
            text-align: center;
        }

        .perfil-card:hover {
            transform: translateY(-4px);
            border-color: #2563eb;
            box-shadow: 0 8px 25px rgba(0,0,0,.08);
        }

        .perfil-card h2 {
            color: #172033;
            margin-bottom: 12px;
        }

        .perfil-card p {
            color: #64748b;
            line-height: 1.5;
            margin-bottom: 20px;
        }

        .perfil-botao {
            background: #2563eb;
            color: white;
            border: 0;
            padding: 12px 20px;
            border-radius: 7px;
            cursor: pointer;
            font-size: 14px;
        }

        .perfil-botao:hover {
            background: #1d4ed8;
        }

        .perfil-painel {
            background: white;
            padding: 25px;
            border-radius: 12px;
            width: 100%;
            max-width: 900px;
            margin: auto;
            box-shadow: 0 5px 25px rgba(0,0,0,.06);
            max-height: 90vh;
            overflow-y: auto;
        }

        .perfil-painel h2 {
            margin-bottom: 20px;
            color: #172033;
        }

        .perfil-painel input,
        .perfil-painel select {
            width: 100%;
            padding: 11px;
            margin: 7px 0 14px;
            border: 1px solid #cbd5e1;
            border-radius: 6px;
            box-sizing: border-box;
        }

        .perfil-painel label {
            font-size: 13px;
            font-weight: bold;
            color: #334155;
        }

        .perfil-frete {
            padding: 15px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            margin: 12px 0;
            background: #fff;
        }

        .perfil-frete p {
            margin: 6px 0;
            color: #475569;
        }

        .perfil-acoes {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 15px;
        }

        .perfil-secundario {
            background: #64748b;
            color: white;
            border: 0;
            padding: 11px 16px;
            border-radius: 6px;
            cursor: pointer;
        }

        #botaoTrocarPerfil {
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 99998;
            background: #172033;
            color: white;
            border: 0;
            border-radius: 8px;
            padding: 13px 18px;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,.2);
        }

        @media(max-width: 600px) {
            .perfil-titulo h1 {
                font-size: 24px;
            }

            .perfil-painel {
                padding: 18px;
            }
        }
    `;

    document.head.appendChild(estilos);

    const area = document.createElement("div");
    area.id = "areaPerfis";

    document.body.appendChild(area);

    mostrarSelecaoPerfis();
}

/* =========================
   SELEÇÃO DE PERFIL
========================= */

function mostrarSelecaoPerfis() {
    const area = elemento("areaPerfis");

    if (!area) return;

    perfilAtual = null;

    area.style.display = "flex";

    const botao = elemento("botaoTrocarPerfil");

    if (botao) {
        botao.remove();
    }

    area.innerHTML = `
        <div class="perfil-container">

            <div class="perfil-titulo">
                <h1>Freight Analytics | Agrária</h1>
                <p>Selecione um perfil para acessar o ambiente demonstrativo.</p>
                <p><strong>Ambiente de demonstração</strong></p>
            </div>

            <div class="perfil-opcoes">

                <div class="perfil-card" onclick="abrirPerfil('empresa')">
                    <h2>Empresa</h2>
                    <p>Cadastre fretes, acompanhe registros e acesse a análise de custos.</p>
                    <button class="perfil-botao">Acessar como empresa</button>
                </div>

                <div class="perfil-card" onclick="abrirPerfil('caminhoneiro')">
                    <h2>Caminhoneiro</h2>
                    <p>Consulte fretes disponíveis e visualize informações de transporte.</p>
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
        return;
    }

    if (perfil === "caminhoneiro") {
        mostrarPainelCaminhoneiro();
    }
}

/* =========================
   PAINEL EMPRESA
========================= */

function mostrarPainelEmpresa() {
    const area = elemento("areaPerfis");

    if (!area) return;

    area.style.display = "flex";

    area.innerHTML = `
        <div class="perfil-painel">

            <h2>Painel da Empresa</h2>
            <p>Cadastro e gerenciamento de fretes demonstrativos.</p>

            <form id="formFreteDemo">

                <label>Origem</label>
                <input id="demoOrigem" required placeholder="Ex.: Guarapuava - PR">

                <label>Destino</label>
                <input id="demoDestino" required placeholder="Ex.: Cascavel - PR">

                <label>Tipo de carga</label>
                <input id="demoCarga" required placeholder="Ex.: Soja">

                <label>Peso (toneladas)</label>
                <input id="demoPeso" type="number" min="0.1" step="0.1" required>

                <label>Motorista</label>
                <input id="demoMotorista" required>

                <label>Placa do veículo</label>
                <input id="demoPlaca" required>

                <label>Valor do frete (R$)</label>
                <input id="demoValor" type="number" min="0" step="0.01" required>

                <button class="perfil-botao" type="submit">
                    Cadastrar frete
                </button>

            </form>

            <hr style="margin:25px 0;border:0;border-top:1px solid #e2e8f0;">

            <h2>Fretes cadastrados</h2>

            <div id="listaFretesEmpresa"></div>

            <div class="perfil-acoes">

                <button class="perfil-botao" onclick="abrirDashboardOriginal()">
                    Abrir dashboard analítico
                </button>

                <button class="perfil-secundario" onclick="mostrarSelecaoPerfis()">
                    Trocar perfil
                </button>

            </div>
        </div>
    `;

    elemento("formFreteDemo").addEventListener(
        "submit",
        cadastrarFreteDemo
    );

    atualizarListaEmpresa();
}

/* =========================
   CADASTRAR FRETE
========================= */

function cadastrarFreteDemo(evento) {
    evento.preventDefault();

    if (perfilAtual !== "empresa") {
        return;
    }

    const novoFrete = {
        codigo: "FRT" + Date.now().toString().slice(-8),

        origem: elemento("demoOrigem").value.trim(),
        destino: elemento("demoDestino").value.trim(),
        carga: elemento("demoCarga").value.trim(),
        peso: Number(elemento("demoPeso").value),
        motorista: elemento("demoMotorista").value.trim(),
        placa: elemento("demoPlaca").value.trim().toUpperCase(),
        valor: Number(elemento("demoValor").value),

        status: "Disponível"
    };

    if (
        !novoFrete.origem ||
        !novoFrete.destino ||
        !novoFrete.carga ||
        !novoFrete.motorista ||
        !novoFrete.placa ||
        novoFrete.peso <= 0 ||
        novoFrete.valor < 0
    ) {
        alert("Verifique os dados do frete.");
        return;
    }

    fretesDemo.push(novoFrete);

    salvarFretes();
    atualizarListaEmpresa();

    elemento("formFreteDemo").reset();

    alert("Frete demonstrativo cadastrado com sucesso!");
}

/* =========================
   LISTA DA EMPRESA
========================= */

function atualizarListaEmpresa() {
    const lista = elemento("listaFretesEmpresa");

    if (!lista) return;

    lista.innerHTML = "";

    if (!fretesDemo.length) {
        lista.textContent = "Nenhum frete cadastrado.";
        return;
    }

    fretesDemo.forEach(frete => {
        const card = document.createElement("div");
        card.className = "perfil-frete";

        const titulo = document.createElement("strong");

        titulo.textContent =
            `${frete.codigo} | ${frete.origem} → ${frete.destino}`;

        const detalhes = document.createElement("p");

        detalhes.textContent =
            `Carga: ${frete.carga} | ${frete.peso} toneladas | ${frete.motorista} | ${frete.placa}`;

        const valor = document.createElement("p");
        valor.textContent = `Valor: ${formatarMoeda(frete.valor)}`;

        const status = document.createElement("p");
        status.textContent = `Status: ${frete.status}`;

        const botao = document.createElement("button");

        botao.className = "perfil-botao";
        botao.textContent = "Gerar QR Code";

        botao.addEventListener("click", () => {
            gerarQRCodeFrete(frete.codigo);
        });

        card.append(titulo, detalhes, valor, status, botao);

        lista.appendChild(card);
    });
}

/* =========================
   GERAÇÃO DE QR CODE
========================= */

async function gerarQRCodeFrete(codigo) {
    if (perfilAtual !== "empresa") {
        return;
    }

    const frete = fretesDemo.find(
        item => item.codigo === codigo
    );

    if (!frete) return;

    try {
        await carregarBibliotecaQR();

        const area = elemento("areaPerfis");

        let painelQR = elemento("painelQRCode");

        if (!painelQR) {
            painelQR = document.createElement("div");

            painelQR.id = "painelQRCode";
            painelQR.className = "perfil-frete";

            area.querySelector(".perfil-painel").appendChild(painelQR);
        }

        painelQR.innerHTML = `
            <h3>QR Code do frete</h3>
            <div id="qrImagem" style="margin:15px 0;"></div>
            <p>Use o código ou QR Code para consultar este frete.</p>
            <strong></strong>
        `;

        painelQR.querySelector("strong").textContent = frete.codigo;

        const imagem = elemento("qrImagem");

        new QRCode(imagem, {
            text: frete.codigo,
            width: 180,
            height: 180
        });

        painelQR.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });

    } catch (erro) {
        console.error(erro);
        alert("Não foi possível carregar o gerador de QR Code.");
    }
}

/* =========================
   PAINEL CAMINHONEIRO
========================= */

function mostrarPainelCaminhoneiro() {
    const area = elemento("areaPerfis");

    if (!area) return;

    area.style.display = "flex";

    area.innerHTML = `
        <div class="perfil-painel">

            <h2>Painel do Caminhoneiro</h2>

            <p>Consulte os fretes disponíveis no ambiente demonstrativo.</p>

            <label>Código do frete</label>

            <input
                id="codigoConsulta"
                placeholder="Ex.: FRT001"
            >

            <button class="perfil-botao" onclick="consultarFreteDemo()">
                Consultar frete
            </button>

            <div id="resultadoConsulta" style="margin-top:20px;"></div>

            <hr style="margin:25px 0;border:0;border-top:1px solid #e2e8f0;">

            <h2>Fretes demonstrativos</h2>

            <div id="listaFretesCaminhoneiro"></div>

            <div class="perfil-acoes">

                <button class="perfil-secundario" onclick="mostrarSelecaoPerfis()">
                    Trocar perfil
                </button>

            </div>
        </div>
    `;

    atualizarFretesCaminhoneiro();
}

/* =========================
   CONSULTAR FRETE
========================= */

function consultarFreteDemo() {
    if (perfilAtual !== "caminhoneiro") {
        return;
    }

    const campo = elemento("codigoConsulta");

    const codigo = campo.value.trim().toUpperCase();

    const frete = fretesDemo.find(
        item => item.codigo.toUpperCase() === codigo
    );

    const resultado = elemento("resultadoConsulta");

    if (!frete) {
        resultado.textContent =
            "Nenhum frete encontrado com esse código.";

        return;
    }

    resultado.innerHTML = "";

    const titulo = document.createElement("h3");

    titulo.textContent = `Frete ${frete.codigo}`;

    const informacoes = document.createElement("div");

    informacoes.className = "perfil-frete";

    [
        `Origem: ${frete.origem}`,
        `Destino: ${frete.destino}`,
        `Carga: ${frete.carga}`,
        `Peso: ${frete.peso} toneladas`,
        `Motorista: ${frete.motorista}`,
        `Placa: ${frete.placa}`,
        `Valor: ${formatarMoeda(frete.valor)}`,
        `Status: ${frete.status}`
    ].forEach(texto => {
        const p = document.createElement("p");

        p.textContent = texto;

        informacoes.appendChild(p);
    });

    resultado.append(titulo, informacoes);
}

/* =========================
   LISTA DO CAMINHONEIRO
========================= */

function atualizarFretesCaminhoneiro() {
    const lista = elemento("listaFretesCaminhoneiro");

    if (!lista) return;

    lista.innerHTML = "";

    if (!fretesDemo.length) {
        lista.textContent = "Nenhum frete disponível.";
        return;
    }

    fretesDemo.forEach(frete => {
        const card = document.createElement("div");

        card.className = "perfil-frete";

        const titulo = document.createElement("strong");

        titulo.textContent =
            `${frete.codigo} | ${frete.origem} → ${frete.destino}`;

        const carga = document.createElement("p");

        carga.textContent =
            `Carga: ${frete.carga} | ${frete.peso} toneladas`;

        const status = document.createElement("p");

        status.textContent = `Status: ${frete.status}`;

        const botao = document.createElement("button");

        botao.className = "perfil-botao";
        botao.textContent = "Consultar";

        botao.addEventListener("click", () => {
            elemento("codigoConsulta").value = frete.codigo;
            consultarFreteDemo();
        });

        card.append(titulo, carga, status, botao);

        lista.appendChild(card);
    });
}

/* =========================
   ACESSO AO DASHBOARD
========================= */

function abrirDashboardOriginal() {
    // Bloqueia o acesso caso o perfil não seja Empresa.
    if (perfilAtual !== "empresa") {
        alert("O dashboard analítico é exclusivo do perfil Empresa.");
        return;
    }

    const area = elemento("areaPerfis");

    if (area) {
        area.style.display = "none";
    }

    let botao = elemento("botaoTrocarPerfil");

    if (!botao) {
        botao = document.createElement("button");

        botao.id = "botaoTrocarPerfil";
        botao.textContent = "Trocar perfil";

        botao.addEventListener("click", () => {
            mostrarSelecaoPerfis();
        });

        document.body.appendChild(botao);
    }

    botao.style.display = "block";

    const dashboard = elemento("dashboard");

    if (dashboard) {
        dashboard.scrollIntoView({
            behavior: "smooth"
        });
    } else {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    }
}

/* =========================
   INICIALIZAÇÃO
========================= */

function iniciarAplicacao() {
    carregarDadosPython();

    const botaoLocalizacao = elemento("btnLocalizacao");

    if (botaoLocalizacao) {
        botaoLocalizacao.addEventListener(
            "click",
            obterLocalizacao
        );
    }

    const botaoCalcular = elemento("btnCalcular");

    if (botaoCalcular) {
        botaoCalcular.addEventListener(
            "click",
            calcularSimulacao
        );
    }

    const tipoRota =
        elemento("tipoRota") ||
        elemento("tipoPercurso");

    if (tipoRota) {
        tipoRota.addEventListener(
            "change",
            controlarCampoRetorno
        );

        controlarCampoRetorno();
    }

    criarInterfacePerfis();
}

/* =========================
   EXECUÇÃO
========================= */

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        iniciarAplicacao
    );
} else {
    iniciarAplicacao();
}
