
"use strict";

/* =========================================================
   FREIGHT ANALYTICS | AGRÁRIA
   Integração de perfis, cadastro, indicadores e simulação
========================================================= */

const CHAVE_FRETES = "freightAnalytics_fretes";
const CHAVE_CONTADOR = "freightAnalytics_contador";

let perfilAtual = null;
let dadosPython = null;
let graficoCustos = null;
let graficoLSTM = null;
let fretes = carregarFretesSalvos();

/* =========================================================
   DADOS INICIAIS
========================================================= */

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
        status: "Disponível",
        data: new Date().toISOString()
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
        status: "Em transporte",
        data: new Date().toISOString()
    }
];

function carregarFretesSalvos() {
    try {
        const salvos = localStorage.getItem(CHAVE_FRETES);

        if (salvos) {
            const lista = JSON.parse(salvos);
            if (Array.isArray(lista)) return lista;
        }
    } catch (erro) {
        console.error("Erro ao carregar fretes:", erro);
    }

    localStorage.setItem(CHAVE_FRETES, JSON.stringify(fretesIniciais));
    localStorage.setItem(CHAVE_CONTADOR, "2");

    return [...fretesIniciais];
}

function salvarFretes() {
    localStorage.setItem(CHAVE_FRETES, JSON.stringify(fretes));
}

function proximoCodigo() {
    let contador = Number(localStorage.getItem(CHAVE_CONTADOR) || 2);
    contador++;
    localStorage.setItem(CHAVE_CONTADOR, String(contador));

    return "FRT" + String(contador).padStart(3, "0");
}

/* =========================================================
   FUNÇÕES AUXILIARES
========================================================= */

function elemento(id) {
    return document.getElementById(id);
}

function texto(id, valor) {
    const el = elemento(id);
    if (el) el.textContent = valor;
}

function formatarMoeda(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatarNumero(valor, casas = 2) {
    return Number(valor || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas
    });
}

function criarElemento(tag, classe, conteudo) {
    const el = document.createElement(tag);

    if (classe) el.className = classe;
    if (conteudo !== undefined) el.textContent = conteudo;

    return el;
}

/* =========================================================
   ESTILOS DOS PAINÉIS DE PERFIL
========================================================= */

function adicionarEstilosPerfis() {
    if (elemento("estilosPerfis")) return;

    const style = document.createElement("style");
    style.id = "estilosPerfis";

    style.textContent = `
        .profile-screen {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 30px 20px;
            background: #f4f6fa;
            font-family: Arial, sans-serif;
        }

        .profile-card {
            width: 100%;
            max-width: 760px;
            background: #fff;
            padding: 42px;
            border-radius: 16px;
            box-shadow: 0 10px 35px rgba(16,39,68,.10);
            text-align: center;
        }

        .profile-card h1 {
            color: #102744;
            margin-bottom: 10px;
        }

        .profile-card > p {
            color: #64748b;
            margin-bottom: 30px;
        }

        .profile-options {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 18px;
        }

        .profile-option {
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 28px 18px;
            background: #fff;
            cursor: pointer;
            transition: .2s;
            color: #102744;
            font-size: 16px;
            font-weight: bold;
        }

        .profile-option:hover {
            border-color: #2563eb;
            transform: translateY(-3px);
            box-shadow: 0 8px 20px rgba(37,99,235,.10);
        }

        .profile-option span {
            display: block;
            margin-top: 10px;
            font-size: 13px;
            line-height: 1.5;
            color: #64748b;
            font-weight: normal;
        }

        .driver-screen {
            min-height: 100vh;
            padding: 35px 20px;
            background: #f4f6fa;
            font-family: Arial, sans-serif;
        }

        .driver-container {
            max-width: 850px;
            margin: 0 auto;
        }

        .driver-panel {
            background: #fff;
            padding: 28px;
            border-radius: 14px;
            box-shadow: 0 5px 20px rgba(16,39,68,.07);
            margin-bottom: 22px;
        }

        .driver-panel h1,
        .driver-panel h2 {
            color: #102744;
            margin-bottom: 12px;
        }

        .driver-search {
            display: flex;
            gap: 10px;
            margin-top: 18px;
        }

        .driver-search input {
            flex: 1;
            min-width: 0;
        }

        .driver-search button,
        .driver-back {
            background: #102744;
            color: white;
            border: 0;
            border-radius: 7px;
            padding: 12px 18px;
            cursor: pointer;
        }

        .driver-result {
            margin-top: 18px;
            padding: 18px;
            background: #f4f6fa;
            border-radius: 9px;
            line-height: 1.8;
        }

        .freight-card {
            background: #fff;
            border: 1px solid #e2e8f0;
            border-radius: 10px;
            padding: 18px;
            margin-bottom: 14px;
        }

        .freight-card h3 {
            color: #102744;
            margin-bottom: 10px;
        }

        .freight-card p {
            margin: 5px 0;
            color: #475569;
        }

        .freight-card button {
            margin-top: 12px;
            margin-right: 8px;
            padding: 9px 13px;
            border: 0;
            border-radius: 6px;
            background: #2563eb;
            color: #fff;
            cursor: pointer;
        }

        .freight-status {
            display: inline-block;
            padding: 5px 9px;
            border-radius: 20px;
            background: #eaf2ff;
            color: #1d4ed8;
            font-size: 12px;
            font-weight: bold;
        }

        #painelQRCode {
            margin-top: 20px;
        }

        #painelQRCode canvas,
        #painelQRCode img {
            display: block;
            margin: 15px 0;
        }

        @media (max-width: 600px) {
            .profile-options {
                grid-template-columns: 1fr;
            }

            .profile-card {
                padding: 28px 18px;
            }

            .driver-search {
                flex-direction: column;
            }
        }
    `;

    document.head.appendChild(style);
}

/* =========================================================
   SELEÇÃO DE PERFIL
========================================================= */

function mostrarSelecaoPerfil() {
    perfilAtual = null;

    const dashboard = elemento("dashboard");
    if (dashboard) dashboard.style.display = "none";

    const motorista = elemento("painelCaminhoneiro");
    if (motorista) motorista.remove();

    let tela = elemento("selecaoPerfil");

    if (!tela) {
        tela = document.createElement("div");
        tela.id = "selecaoPerfil";
        tela.className = "profile-screen";
        document.body.appendChild(tela);
    }

    tela.innerHTML = "";

    const card = criarElemento("div", "profile-card");
    const titulo = criarElemento("h1", "", "FREIGHT ANALYTICS");
    const subtitulo = criarElemento(
        "p",
        "",
        "AGRÁRIA | Selecione o perfil para continuar"
    );

    const opcoes = criarElemento("div", "profile-options");

    const empresa = criarElemento("button", "profile-option");
    empresa.type = "button";
    empresa.append("Empresa");

    const descricaoEmpresa = criarElemento(
        "span",
        "",
        "Cadastro de fretes, indicadores, custos e simulações"
    );
    empresa.appendChild(descricaoEmpresa);

    empresa.addEventListener("click", abrirPerfilEmpresa);

    const caminhoneiro = criarElemento("button", "profile-option");
    caminhoneiro.type = "button";
    caminhoneiro.append("Caminhoneiro");

    const descricaoCaminhoneiro = criarElemento(
        "span",
        "",
        "Consultar fretes utilizando o código de identificação"
    );
    caminhoneiro.appendChild(descricaoCaminhoneiro);

    caminhoneiro.addEventListener("click", abrirPerfilCaminhoneiro);

    opcoes.append(empresa, caminhoneiro);
    card.append(titulo, subtitulo, opcoes);
    tela.appendChild(card);
}

function abrirPerfilEmpresa() {
    perfilAtual = "empresa";

    const tela = elemento("selecaoPerfil");
    if (tela) tela.remove();

    const motorista = elemento("painelCaminhoneiro");
    if (motorista) motorista.remove();

    const dashboard = elemento("dashboard");

    if (dashboard) {
        dashboard.style.display = "block";
    }

    carregarDadosPython();
    renderizarFretesEmpresa();
    configurarBotaoTrocarPerfil();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function abrirPerfilCaminhoneiro() {
    perfilAtual = "caminhoneiro";

    const tela = elemento("selecaoPerfil");
    if (tela) tela.remove();

    const dashboard = elemento("dashboard");
    if (dashboard) dashboard.style.display = "none";

    criarPainelCaminhoneiro();
}

function configurarBotaoTrocarPerfil() {
    const botao = elemento("btnTrocarPerfil");

    if (!botao) return;

    botao.onclick = mostrarSelecaoPerfil;
}

/* =========================================================
   PAINEL DO CAMINHONEIRO
========================================================= */

function criarPainelCaminhoneiro() {
    let painel = elemento("painelCaminhoneiro");

    if (!painel) {
        painel = document.createElement("div");
        painel.id = "painelCaminhoneiro";
        painel.className = "driver-screen";
        document.body.appendChild(painel);
    }

    painel.innerHTML = "";

    const container = criarElemento("div", "driver-container");
    const cabecalho = criarElemento("div", "driver-panel");

    const titulo = criarElemento("h1", "", "Consulta de fretes");
    const descricao = criarElemento(
        "p",
        "",
        "Informe o código do frete para consultar os dados da operação."
    );

    const busca = criarElemento("div", "driver-search");
    const campo = document.createElement("input");

    campo.type = "text";
    campo.id = "codigoConsulta";
    campo.placeholder = "Ex.: FRT001";
    campo.autocomplete = "off";

    const botaoConsultar = criarElemento(
        "button",
        "",
        "Consultar"
    );
    botaoConsultar.type = "button";

    botaoConsultar.addEventListener("click", consultarFreteCaminhoneiro);

    campo.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter") consultarFreteCaminhoneiro();
    });

    busca.append(campo, botaoConsultar);

    const resultado = criarElemento("div", "driver-result");
    resultado.id = "resultadoConsulta";
    resultado.textContent = "Digite o código do frete para iniciar a consulta.";

    cabecalho.append(titulo, descricao, busca, resultado);

    const listaPainel = criarElemento("div", "driver-panel");
    const tituloLista = criarElemento("h2", "", "Fretes disponíveis");
    const lista = criarElemento("div");
    lista.id = "listaFretesCaminhoneiro";

    const voltar = criarElemento(
        "button",
        "driver-back",
        "Trocar perfil"
    );
    voltar.type = "button";
    voltar.addEventListener("click", mostrarSelecaoPerfil);

    listaPainel.append(tituloLista, lista);
    container.append(cabecalho, listaPainel, voltar);
    painel.appendChild(container);

    renderizarFretesCaminhoneiro();
}

function consultarFreteCaminhoneiro() {
    if (perfilAtual !== "caminhoneiro") return;

    const campo = elemento("codigoConsulta");
    const resultado = elemento("resultadoConsulta");

    if (!campo || !resultado) return;

    const codigo = campo.value.trim().toUpperCase();

    if (!codigo) {
        resultado.textContent = "Digite um código de frete.";
        return;
    }

    const frete = fretes.find(
        item => String(item.codigo).toUpperCase() === codigo
    );

    resultado.innerHTML = "";

    if (!frete) {
        resultado.textContent = "Nenhum frete encontrado com esse código.";
        return;
    }

    const titulo = criarElemento("h3", "", `Frete ${frete.codigo}`);
    const dados = [
        `Origem: ${frete.origem}`,
        `Destino: ${frete.destino}`,
        `Carga: ${frete.carga}`,
        `Peso: ${formatarNumero(frete.peso, 1)} toneladas`,
        `Motorista: ${frete.motorista}`,
        `Placa: ${frete.placa}`,
        `Valor: ${formatarMoeda(frete.valor)}`,
        `Status: ${frete.status}`
    ];

    resultado.appendChild(titulo);

    dados.forEach(item => {
        resultado.appendChild(criarElemento("p", "", item));
    });
}

function renderizarFretesCaminhoneiro() {
    const lista = elemento("listaFretesCaminhoneiro");
    if (!lista) return;

    lista.innerHTML = "";

    if (fretes.length === 0) {
        lista.textContent = "Nenhum frete cadastrado.";
        return;
    }

    [...fretes].reverse().forEach(frete => {
        const card = criarElemento("div", "freight-card");
        card.appendChild(
            criarElemento("h3", "", `Frete ${frete.codigo}`)
        );
        card.appendChild(
            criarElemento("p", "", `${frete.origem} → ${frete.destino}`)
        );
        card.appendChild(
            criarElemento("p", "", `Carga: ${frete.carga}`)
        );
        card.appendChild(
            criarElemento("p", "", `Status: ${frete.status}`)
        );

        const botao = criarElemento("button", "", "Consultar");
        botao.type = "button";
        botao.addEventListener("click", () => {
            const campo = elemento("codigoConsulta");
            if (campo) campo.value = frete.codigo;
            consultarFreteCaminhoneiro();
            window.scrollTo({ top: 0, behavior: "smooth" });
        });

        card.appendChild(botao);
        lista.appendChild(card);
    });
}

/* =========================================================
   CADASTRO E LISTAGEM DE FRETES
========================================================= */

function configurarCadastroFrete() {
    const formulario = elemento("formFreteDemo");
    if (!formulario) return;

    formulario.addEventListener("submit", (evento) => {
        evento.preventDefault();

        if (perfilAtual !== "empresa") return;

        const origem = elemento("demoOrigem").value.trim();
        const destino = elemento("demoDestino").value.trim();
        const carga = elemento("demoCarga").value.trim();
        const peso = Number(elemento("demoPeso").value);
        const motorista = elemento("demoMotorista").value.trim();
        const placa = elemento("demoPlaca").value.trim().toUpperCase();
        const valor = Number(elemento("demoValor").value);

        if (
            !origem || !destino || !carga ||
            !motorista || !placa ||
            !Number.isFinite(peso) || peso <= 0 ||
            !Number.isFinite(valor) || valor < 0
        ) {
            alert("Confira os dados preenchidos antes de cadastrar.");
            return;
        }

        const novoFrete = {
            codigo: proximoCodigo(),
            origem,
            destino,
            carga,
            peso,
            motorista,
            placa,
            valor,
            status: "Disponível",
            data: new Date().toISOString()
        };

        fretes.push(novoFrete);
        salvarFretes();

        formulario.reset();
        renderizarFretesEmpresa();

        alert(`Frete ${novoFrete.codigo} cadastrado com sucesso!`);

        gerarQRCode(novoFrete.codigo);
    });
}

function renderizarFretesEmpresa() {
    if (perfilAtual !== "empresa") return;

    const lista = elemento("listaFretesEmpresa");
    if (!lista) return;

    lista.innerHTML = "";

    if (fretes.length === 0) {
        lista.textContent = "Nenhum frete cadastrado.";
        return;
    }

    [...fretes].reverse().forEach(frete => {
        const card = criarElemento("div", "freight-card");

        card.appendChild(
            criarElemento("h3", "", `Frete ${frete.codigo}`)
        );

        card.appendChild(
            criarElemento("p", "", `${frete.origem} → ${frete.destino}`)
        );

        card.appendChild(
            criarElemento("p", "", `Carga: ${frete.carga}`)
        );

        card.appendChild(
            criarElemento(
                "p",
                "",
                `Motorista: ${frete.motorista} | Placa: ${frete.placa}`
            )
        );

        card.appendChild(
            criarElemento(
                "p",
                "",
                `Peso: ${formatarNumero(frete.peso, 1)} t | Valor: ${formatarMoeda(frete.valor)}`
            )
        );

        const status = criarElemento("span", "freight-status", frete.status);
        card.appendChild(status);

        const botaoQR = criarElemento("button", "", "Gerar QR Code");
        botaoQR.type = "button";
        botaoQR.addEventListener("click", () => gerarQRCode(frete.codigo));

        const botaoStatus = criarElemento("button", "", "Alterar status");
        botaoStatus.type = "button";
        botaoStatus.addEventListener("click", () => alterarStatusFrete(frete.codigo));

        card.append(botaoQR, botaoStatus);
        lista.appendChild(card);
    });
}

function alterarStatusFrete(codigo) {
    if (perfilAtual !== "empresa") return;

    const frete = fretes.find(item => item.codigo === codigo);
    if (!frete) return;

    const statusPossiveis = [
        "Disponível",
        "Em transporte",
        "Concluído",
        "Cancelado"
    ];

    const atual = statusPossiveis.indexOf(frete.status);
    const proximo = (atual + 1) % statusPossiveis.length;

    frete.status = statusPossiveis[proximo];

    salvarFretes();
    renderizarFretesEmpresa();

    alert(`Status do frete ${codigo}: ${frete.status}`);
}

/* =========================================================
   QR CODE
========================================================= */

function carregarBibliotecaQRCode() {
    return new Promise((resolve) => {
        if (window.QRCode) {
            resolve(true);
            return;
        }

        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js";

        script.onload = () => resolve(true);
        script.onerror = () => resolve(false);

        document.head.appendChild(script);
    });
}

async function gerarQRCode(codigo) {
    if (perfilAtual !== "empresa") return;

    const painel = elemento("painelQRCode");
    if (!painel) return;

    painel.innerHTML = "";

    const titulo = criarElemento("h3", "", `QR Code do frete ${codigo}`);
    const explicacao = criarElemento(
        "p",
        "",
        "Este QR Code contém o código de identificação do frete."
    );

    const imagem = criarElemento("div");
    imagem.id = "qrImagem";

    painel.append(titulo, explicacao, imagem);

    const carregou = await carregarBibliotecaQRCode();

    if (perfilAtual !== "empresa") return;

    if (!carregou || !window.QRCode) {
        imagem.textContent = `Código para consulta: ${codigo}`;
        return;
    }

    new QRCode(imagem, {
        text: codigo,
        width: 180,
        height: 180,
        colorDark: "#102744",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });
}

/* =========================================================
   CARREGAMENTO DOS DADOS PYTHON
========================================================= */

async function carregarDadosPython() {
    try {
        const resposta = await fetch("dados.json?v=" + Date.now(), {
            cache: "no-store"
        });

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar dados.json");
        }

        dadosPython = await resposta.json();

        atualizarIndicadores();
        criarGraficoCustos();
        atualizarInteligenciaArtificial();
        criarGraficoLSTM();
    } catch (erro) {
        console.error("Erro ao carregar dados Python:", erro);

        texto("totalFretes", "Indisponível");
        texto("totalRegistros", "Indisponível");
        texto("custoTotal", "Indisponível");
        texto("custoMedio", "Indisponível");
    }
}

function atualizarIndicadores() {
    if (!dadosPython) return;

    texto(
        "totalFretes",
        Number(dadosPython.totalFretes || 0).toLocaleString("pt-BR")
    );

    texto(
        "totalRegistros",
        Number(dadosPython.totalRegistros || 0).toLocaleString("pt-BR")
    );

    texto("custoTotal", formatarMoeda(dadosPython.custoTotal));
    texto("custoMedio", formatarMoeda(dadosPython.custoMedio));

    const diesel = dadosPython.diesel || {};

    texto(
        "dieselS10",
        diesel.precoMedio != null
            ? formatarMoeda(diesel.precoMedio) + "/L"
            : "--"
    );

    texto(
        "dataDiesel",
        diesel.periodo
            ? `Período: ${diesel.periodo} | Fonte: ${diesel.fonte || "ANP"}`
            : `Fonte: ${diesel.fonte || "ANP"}`
    );

    const campoDiesel = elemento("diesel");

    if (campoDiesel && diesel.precoMedio != null && !campoDiesel.value) {
        campoDiesel.value = Number(diesel.precoMedio).toFixed(2);
    }
}

/* =========================================================
   GRÁFICO DE CUSTOS MENSAIS
========================================================= */

function criarGraficoCustos() {
    if (!dadosPython || !window.Chart) return;

    const canvas = elemento("graficoCustosChart");
    if (!canvas) return;

    const custos = dadosPython.custosMensais || {};
    const labels = custos.labels || [];
    const valores = custos.valores || [];

    if (graficoCustos) graficoCustos.destroy();

    graficoCustos = new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Custo mensal de frete",
                data: valores,
                backgroundColor: "#2563eb",
                borderRadius: 5
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
                        label: contexto => formatarMoeda(contexto.raw)
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

/* =========================================================
   INDICADORES E GRÁFICO LSTM
========================================================= */

function atualizarInteligenciaArtificial() {
    if (!dadosPython) return;

    const lstm = dadosPython.lstm || {};

    texto("lstmMAE", formatarNumero(lstm.mae));
    texto("lstmRMSE", formatarNumero(lstm.rmse));
    texto("lstmR2", formatarNumero(lstm.r2, 4));

    texto(
        "totalPrevisoes",
        Number(lstm.quantidadePrevisoes || 0).toLocaleString("pt-BR")
    );
}

function criarGraficoLSTM() {
    if (!dadosPython || !window.Chart) return;

    const canvas = elemento("graficoLSTM");
    if (!canvas) return;

    const previsoes = dadosPython.lstm?.previsoes || [];

    if (graficoLSTM) graficoLSTM.destroy();

    if (!previsoes.length) return;

    // Limita a quantidade de pontos para manter o gráfico legível.
    const limite = 150;
    const passo = Math.max(1, Math.ceil(previsoes.length / limite));

    const amostra = previsoes.filter((item, indice) => {
        return indice % passo === 0;
    });

    const labels = amostra.map((item, indice) => {
        return item.data ? `${item.data} (${indice + 1})` : `Registro ${indice + 1}`;
    });

    const valoresReais = amostra.map(item => item.real ?? null);
    const valoresPrevistos = amostra.map(item => item.previsto ?? null);

    graficoLSTM = new Chart(canvas, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Valor real",
                    data: valoresReais,
                    borderColor: "#102744",
                    backgroundColor: "rgba(16,39,68,.08)",
                    borderWidth: 2,
                    pointRadius: 1,
                    tension: 0.2
                },
                {
                    label: "Valor previsto",
                    data: valoresPrevistos,
                    borderColor: "#2563eb",
                    backgroundColor: "rgba(37,99,235,.08)",
                    borderWidth: 2,
                    pointRadius: 1,
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: "index"
            },
            plugins: {
                legend: {
                    display: true
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxTicksLimit: 10
                    }
                },
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

/* =========================================================
   SIMULAÇÃO DE TRANSPORTE
========================================================= */

function configurarSimulacao() {
    const tipo = elemento("tipoPercurso");
    const botao = elemento("calcularSimulacao");
    const localizacao = elemento("usarLocalizacao");

    if (tipo) {
        tipo.addEventListener("change", atualizarCampoRetorno);
        atualizarCampoRetorno();
    }

    if (botao) {
        botao.addEventListener("click", calcularSimulacao);
    }

    if (localizacao) {
        localizacao.addEventListener("click", usarMinhaLocalizacao);
    }
}

function atualizarCampoRetorno() {
    const tipo = elemento("tipoPercurso");
    const campo = elemento("campoRetorno");
    const destinoRetorno = elemento("destinoRetorno");

    if (!tipo || !campo) return;

    const personalizado = tipo.value === "personalizado";

    campo.style.display = personalizado ? "block" : "none";

    if (destinoRetorno) {
        destinoRetorno.required = personalizado;
    }
}

async function geocodificar(endereco) {
    const url =
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
        encodeURIComponent(endereco);

    const resposta = await fetch(url, {
        headers: {
            "Accept": "application/json"
        }
    });

    if (!resposta.ok) {
        throw new Error("Falha ao localizar o endereço.");
    }

    const resultados = await resposta.json();

    if (!resultados.length) {
        throw new Error(`Endereço não encontrado: ${endereco}`);
    }

    return {
        lat: Number(resultados[0].lat),
        lon: Number(resultados[0].lon)
    };
}

async function obterDistancia(origem, destino) {
    const pontoOrigem = await geocodificar(origem);
    const pontoDestino = await geocodificar(destino);

    const coordenadas =
        `${pontoOrigem.lon},${pontoOrigem.lat};` +
        `${pontoDestino.lon},${pontoDestino.lat}`;

    const url =
        `https://router.project-osrm.org/route/v1/driving/${coordenadas}` +
        "?overview=false";

    const resposta = await fetch(url);

    if (!resposta.ok) {
        throw new Error("Não foi possível calcular a rota.");
    }

    const dados = await resposta.json();

    if (!dados.routes || !dados.routes.length) {
        throw new Error("Não foi encontrada uma rota entre os locais.");
    }

    return dados.routes[0].distance / 1000;
}

async function calcularSimulacao() {
    if (perfilAtual !== "empresa") return;

    const origem = elemento("origem")?.value.trim();
    const destino = elemento("destino")?.value.trim();
    const consumo = Number(elemento("consumo")?.value);
    const precoDiesel = Number(elemento("diesel")?.value);
    const tipoPercurso = elemento("tipoPercurso")?.value;
    const retorno = elemento("destinoRetorno")?.value.trim();
    const resultado = elemento("resultadoSimulacao");

    if (!resultado) return;

    if (!origem || !destino || consumo <= 0 || precoDiesel <= 0) {
        resultado.textContent =
            "Preencha origem, destino, consumo e preço do diesel corretamente.";
        return;
    }

    if (tipoPercurso === "personalizado" && !retorno) {
        resultado.textContent = "Informe o destino do retorno.";
        return;
    }

    resultado.textContent = "Calculando rota e estimando custos...";

    const botao = elemento("calcularSimulacao");
    if (botao) botao.disabled = true;

    try {
        const distanciaIda = await obterDistancia(origem, destino);
        let distanciaTotal = distanciaIda;
        let descricaoPercurso = "Somente ida";

        if (tipoPercurso === "ida_volta") {
            const distanciaVolta = await obterDistancia(destino, origem);
            distanciaTotal = distanciaIda + distanciaVolta;
            descricaoPercurso = "Ida e volta";
        }

        if (tipoPercurso === "personalizado") {
            const distanciaVolta = await obterDistancia(destino, retorno);
            distanciaTotal = distanciaIda + distanciaVolta;
            descricaoPercurso = `Retorno para ${retorno}`;
        }

        const litros = distanciaTotal / consumo;
        const custo = litros * precoDiesel;

        resultado.innerHTML = "";

        const titulo = criarElemento("h3", "", "Resultado da simulação");
        const itens = [
            `Veículo: ${elemento("veiculo")?.value || "Não informado"}`,
            `Percurso: ${descricaoPercurso}`,
            `Distância de ida: ${formatarNumero(distanciaIda)} km`,
            `Distância total: ${formatarNumero(distanciaTotal)} km`,
            `Consumo estimado: ${formatarNumero(litros)} litros`,
            `Preço do diesel: ${formatarMoeda(precoDiesel)}/L`,
            `Custo estimado de combustível: ${formatarMoeda(custo)}`
        ];

        resultado.appendChild(titulo);

        itens.forEach(item => {
            resultado.appendChild(criarElemento("p", "", item));
        });

        resultado.appendChild(
            criarElemento(
                "small",
                "",
                "Estimativa baseada na rota rodoviária e no consumo informado. Não inclui pedágios, manutenção ou outros custos."
            )
        );

    } catch (erro) {
        console.error("Erro na simulação:", erro);
        resultado.textContent =
            erro.message || "Não foi possível concluir a simulação.";
    } finally {
        if (botao) botao.disabled = false;
    }
}

function usarMinhaLocalizacao() {
    if (!navigator.geolocation) {
        alert("Seu navegador não oferece suporte à localização.");
        return;
    }

    const botao = elemento("usarLocalizacao");
    if (botao) botao.disabled = true;

    navigator.geolocation.getCurrentPosition(
        async (posicao) => {
            try {
                const lat = posicao.coords.latitude;
                const lon = posicao.coords.longitude;

                const url =
                    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;

                const resposta = await fetch(url);
                const dados = await resposta.json();

                const endereco = dados.display_name;

                if (endereco && elemento("origem")) {
                    elemento("origem").value = endereco;
                } else {
                    elemento("origem").value = `${lat}, ${lon}`;
                }
            } catch (erro) {
                console.error("Erro ao obter endereço:", erro);
                alert("Localização obtida, mas não foi possível converter em endereço.");
            } finally {
                if (botao) botao.disabled = false;
            }
        },
        (erro) => {
            console.error("Erro de localização:", erro);
            alert("Não foi possível acessar sua localização. Verifique a permissão do navegador.");
            if (botao) botao.disabled = false;
        },
        {
            enableHighAccuracy: true,
            timeout: 15000
        }
    );
}

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

function iniciarAplicacao() {
    adicionarEstilosPerfis();

    configurarCadastroFrete();
    configurarSimulacao();

    mostrarSelecaoPerfil();

    console.log("Freight Analytics iniciado.");
}

document.addEventListener("DOMContentLoaded", iniciarAplicacao);
