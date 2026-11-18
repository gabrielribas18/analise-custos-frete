
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
    if (campo) campo.textContent = valor;
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

    } catch (erro) {
        console.error("Erro ao carregar os dados:", erro);
    }
}

function atualizarIndicadores(dados) {
    const indicadores = {
        totalFretes: dados.totalFretes,
        totalRegistros: dados.totalRegistros,
        custoTotal: dados.custoTotal,
        custoMedio: dados.custoMedio,
        diesel: dados.dieselS10PR
    };

    // Atualiza somente os elementos que existirem no HTML.
    const campos = {
        totalFretes: ["totalFretes", "kpiFretes"],
        totalRegistros: ["totalRegistros", "kpiRegistros"],
        custoTotal: ["custoTotal", "kpiCustoTotal"],
        custoMedio: ["custoMedio", "kpiCustoMedio"],
        diesel: ["dieselS10", "kpiDiesel"]
    };

    Object.entries(campos).forEach(([chave, ids]) => {
        ids.forEach(id => {
            const campo = elemento(id);
            if (!campo || indicadores[chave] === undefined) return;

            const valor = indicadores[chave];

            campo.textContent =
                chave === "custoTotal" ||
                chave === "custoMedio" ||
                chave === "diesel"
                    ? formatarMoeda(valor)
                    : Number(valor).toLocaleString("pt-BR");
        });
    });
}

/* =========================
   GRÁFICO DE CUSTOS
========================= */

function criarGraficoCustos(dados) {
    const canvas = elemento("graficoCustosChart");

    if (!canvas || typeof Chart === "undefined") return;

    const registros = dados.custosMensais || dados.custosPorMes || dados.mensal || [];

    let labels = [];
    let valores = [];

    if (Array.isArray(registros)) {
        labels = registros.map(item =>
            item.mes || item.periodo || item.label || ""
        );

        valores = registros.map(item =>
            Number(item.custo || item.valor || item.total || 0)
        );
    }

    if (graficoCustos) {
        graficoCustos.destroy();
    }

    graficoCustos = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Custo de fretes",
                data: valores,
                borderColor: "#2563eb",
                backgroundColor: "rgba(37, 99, 235, 0.12)",
                fill: true,
                tension: 0.3
            }]
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
   INTELIGÊNCIA ARTIFICIAL
========================= */

function atualizarInteligenciaArtificial(dados) {
    const ia = dados.lstm || dados.inteligenciaArtificial || dados;

    atualizarTexto("maeLSTM", formatarMoeda(ia.mae));
    atualizarTexto("rmseLSTM", formatarMoeda(ia.rmse));

    atualizarTexto(
        "r2LSTM",
        ia.r2 !== undefined ? Number(ia.r2).toFixed(4) : "--"
    );

    atualizarTexto(
        "totalPredicoes",
        Number(ia.totalPredicoes || ia.totalTeste || 0).toLocaleString("pt-BR")
    );

    criarGraficoLSTM(dados);
}

function criarGraficoLSTM(dados) {
    const canvas = elemento("graficoLSTM");

    if (!canvas || typeof Chart === "undefined") return;

    const ia = dados.lstm || dados.inteligenciaArtificial || dados;

    const real = ia.valoresReais || ia.real || [];
    const previsto = ia.valoresPrevistos || ia.previsto || [];

    if (!real.length || !previsto.length) return;

    if (graficoLSTM) {
        graficoLSTM.destroy();
    }

    graficoLSTM = new Chart(canvas, {
        type: "line",
        data: {
            labels: real.map((_, i) => i + 1),
            datasets: [
                {
                    label: "Valores reais",
                    data: real,
                    borderColor: "#2563eb",
                    pointRadius: 0,
                    tension: 0.2
                },
                {
                    label: "Valores previstos",
                    data: previsto,
                    borderColor: "#f59e0b",
                    pointRadius: 0,
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
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

    if (!consumo || !precoDiesel) {
        alert("Informe o consumo do veículo e o preço do diesel.");
        return;
    }

    if (resultado) {
        resultado.textContent = "Calculando rota...";
    }

    try {
        const coordenadasOrigem = await buscarCoordenadas(origem);
        const coordenadasDestino = await buscarCoordenadas(destino);

        const rota = await buscarRota(
            coordenadasOrigem,
            coordenadasDestino
        );

        const distancia = rota.distance / 1000;
        const duracao = rota.duration / 3600;

        const litros = distancia / consumo;
        const custoCombustivel = litros * precoDiesel;

        const retorno = elemento("tipoRota")?.value || "somente_ida";

        let distanciaTotal = distancia;

        if (retorno === "ida_volta") {
            distanciaTotal *= 2;
        }

        const litrosTotal = distanciaTotal / consumo;
        const custoTotal = litrosTotal * precoDiesel;

        if (resultado) {
            resultado.innerHTML = `
                <h3>Resultado da simulação</h3>
                <p><strong>Distância de ida:</strong> ${distancia.toFixed(1)} km</p>
                <p><strong>Distância considerada:</strong> ${distanciaTotal.toFixed(1)} km</p>
                <p><strong>Tempo estimado de ida:</strong> ${duracao.toFixed(1)} horas</p>
                <p><strong>Combustível estimado:</strong> ${litrosTotal.toFixed(1)} litros</p>
                <p><strong>Custo estimado:</strong> ${formatarMoeda(custoTotal)}</p>
            `;
        }

    } catch (erro) {
        console.error("Erro na simulação:", erro);

        if (resultado) {
            resultado.textContent =
                "Não foi possível calcular a rota. Verifique os endereços informados.";
        }
    }
}

async function buscarCoordenadas(endereco) {
    const resposta = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(endereco)}`
    );

    const dados = await resposta.json();

    if (!dados.length) {
        throw new Error("Endereço não encontrado: " + endereco);
    }

    return {
        lat: Number(dados[0].lat),
        lon: Number(dados[0].lon)
    };
}

async function buscarRota(origem, destino) {
    const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${origem.lon},${origem.lat};${destino.lon},${destino.lat}` +
        "?overview=false";

    const resposta = await fetch(url);
    const dados = await resposta.json();

    if (!dados.routes || !dados.routes.length) {
        throw new Error("Não foi possível encontrar a rota.");
    }

    return dados.routes[0];
}

/* =====================================================
   PERFIS DEMONSTRATIVOS
===================================================== */

/* =========================
   CARREGAR BIBLIOTECA QR
========================= */

function carregarBibliotecaQR() {
    if (window.QRCode) return Promise.resolve();

    return new Promise((resolve, reject) => {
        const script = document.createElement("script");

        script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

        script.onload = resolve;
        script.onerror = reject;

        document.head.appendChild(script);
    });
}

/* =========================
   INTERFACE DOS PERFIS
========================= */

function criarInterfacePerfis() {
    if (elemento("areaPerfis")) return;

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

        .perfil-painel {
            background: white;
            padding: 25px;
            border-radius: 12px;
            width: 100%;
            max-width: 900px;
            margin: auto;
            box-shadow: 0 5px 25px rgba(0,0,0,.06);
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
            z-index: 9998;
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
                    <p>Cadastre fretes demonstrativos, acompanhe registros e gere QR Codes.</p>
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

    document.body.appendChild(area);
}

/* =========================
   SELEÇÃO DE PERFIL
========================= */

function mostrarSelecaoPerfis() {
    const area = elemento("areaPerfis");

    if (!area) return;

    area.innerHTML = `
        <div class="perfil-container">
            <div class="perfil-titulo">
                <h1>Freight Analytics | Agrária</h1>
                <p>Selecione seu perfil demonstrativo.</p>
            </div>

            <div class="perfil-opcoes">
                <div class="perfil-card" onclick="abrirPerfil('empresa')">
                    <h2>Empresa</h2>
                    <p>Gerencie fretes e gere QR Codes.</p>
                    <button class="perfil-botao">Acessar</button>
                </div>

                <div class="perfil-card" onclick="abrirPerfil('caminhoneiro')">
                    <h2>Caminhoneiro</h2>
                    <p>Consulte fretes e informações de transporte.</p>
                    <button class="perfil-botao">Acessar</button>
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

/* =========================
   PAINEL EMPRESA
========================= */

function mostrarPainelEmpresa() {
    const area = elemento("areaPerfis");

    area.innerHTML = `
        <div class="perfil-painel">
            <h2>Painel da Empresa</h2>
            <p>Cadastro de fretes demonstrativos.</p>

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
                <button class="perfil-secundario" onclick="abrirDashboardOriginal()">
                    Abrir dashboard analítico
                </button>

                <button class="perfil-secundario" onclick="mostrarSelecaoPerfis()">
                    Trocar perfil
                </button>
            </div>
        </div>
    `;

    elemento("formFreteDemo").addEventListener("submit", cadastrarFreteDemo);

    atualizarListaEmpresa();
}

function cadastrarFreteDemo(evento) {
    evento.preventDefault();

    const novoFrete = {
        codigo: "FRT" + String(Date.now()).slice(-6),
        origem: elemento("demoOrigem").value,
        destino: elemento("demoDestino").value,
        carga: elemento("demoCarga").value,
        peso: Number(elemento("demoPeso").value),
        motorista: elemento("demoMotorista").value,
        placa: elemento("demoPlaca").value.toUpperCase(),
        valor: Number(elemento("demoValor").value),
        status: "Disponível"
    };

    fretesDemo.push(novoFrete);

    atualizarListaEmpresa();

    elemento("formFreteDemo").reset();

    alert("Frete demonstrativo cadastrado com sucesso!");
}

function atualizarListaEmpresa() {
    const lista = elemento("listaFretesEmpresa");

    if (!lista) return;

    lista.innerHTML = "";

    fretesDemo.forEach(frete => {
        const card = document.createElement("div");
        card.className = "perfil-frete";

        const titulo = document.createElement("strong");
        titulo.textContent = `${frete.codigo} | ${frete.origem} → ${frete.destino}`;

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
        botao.addEventListener("click", () => gerarQRCodeFrete(frete.codigo));

        card.append(titulo, detalhes, valor, status, botao);
        lista.appendChild(card);
    });
}

/* =========================
   GERAÇÃO DE QR CODE
========================= */

async function gerarQRCodeFrete(codigo) {
    const frete = fretesDemo.find(item => item.codigo === codigo);

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
            <h3>QR Code do frete ${frete.codigo}</h3>
            <div id="qrImagem" style="margin:15px 0;"></div>
            <p>Use o código ou QR Code para consultar este frete.</p>
            <strong>${frete.codigo}</strong>
        `;

        new QRCode(elemento("qrImagem"), {
            text: frete.codigo,
            width: 180,
            height: 180
        });

        painelQR.scrollIntoView({ behavior: "smooth" });

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

    area.innerHTML = `
        <div class="perfil-painel">
            <h2>Painel do Caminhoneiro</h2>
            <p>Consulte os fretes disponíveis no ambiente demonstrativo.</p>

            <label>Código do frete</label>
            <input id="codigoConsulta" placeholder="Ex.: FRT001">

            <button class="perfil-botao" onclick="consultarFreteDemo()">
                Consultar frete
            </button>

            <div id="resultadoConsulta" style="margin-top:20px;"></div>

            <hr style="margin:25px 0;border:0;border-top:1px solid #e2e8f0;">

            <h2>Fretes demonstrativos</h2>
            <div id="listaFretesCaminhoneiro"></div>

            <div class="perfil-acoes">
                <button class="perfil-secundario" onclick="abrirDashboardOriginal()">
                    Abrir dashboard analítico
                </button>

                <button class="perfil-secundario" onclick="mostrarSelecaoPerfis()">
                    Trocar perfil
                </button>
            </div>
        </div>
    `;

    atualizarFretesCaminhoneiro();
}

function consultarFreteDemo() {
    const codigo = elemento("codigoConsulta").value.trim().toUpperCase();

    const frete = fretesDemo.find(
        item => item.codigo.toUpperCase() === codigo
    );

    const resultado = elemento("resultadoConsulta");

    if (!frete) {
        resultado.textContent = "Nenhum frete encontrado com esse código.";
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

function atualizarFretesCaminhoneiro() {
    const lista = elemento("listaFretesCaminhoneiro");

    if (!lista) return;

    lista.innerHTML = "";

    fretesDemo.forEach(frete => {
        const card = document.createElement("div");
        card.className = "perfil-frete";

        const titulo = document.createElement("strong");
        titulo.textContent = `${frete.codigo} | ${frete.origem} → ${frete.destino}`;

        const carga = document.createElement("p");
        carga.textContent = `Carga: ${frete.carga} | ${frete.peso} toneladas`;

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
            const tela = elemento("areaPerfis");

            if (tela) {
                tela.style.display = "flex";
                mostrarSelecaoPerfis();
            }
        });

        document.body.appendChild(botao);
    }

    const dashboard = elemento("dashboard");

    if (dashboard) {
        dashboard.scrollIntoView({ behavior: "smooth" });
    } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}

/* =========================
   INICIALIZAÇÃO
========================= */

function iniciarAplicacao() {
    carregarDadosPython();

    const botaoLocalizacao = elemento("btnLocalizacao");
    if (botaoLocalizacao) {
        botaoLocalizacao.addEventListener("click", obterLocalizacao);
    }

    const botaoCalcular = elemento("btnCalcular");
    if (botaoCalcular) {
        botaoCalcular.addEventListener("click", calcularSimulacao);
    }

    criarInterfacePerfis();
}

// Garante a execução mesmo se o DOM já estiver carregado.
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciarAplicacao);
} else {
    iniciarAplicacao();
}
