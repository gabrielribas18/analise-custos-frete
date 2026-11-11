
async function carregarDados() {
    try {
        const resposta = await fetch("dados/fretes.csv");

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar o arquivo CSV.");
        }

        const csv = await resposta.text();

        const linhas = csv.trim().split(/\r?\n/);

        const cabecalhos = linhas[0].split(";");

        console.log("Colunas encontradas:", cabecalhos);
        console.log("Quantidade de registros:", linhas.length - 1);

        document.getElementById("analiseFretes").innerHTML = `
            <p>Arquivo carregado com sucesso!</p>
            <p>Registros encontrados: ${linhas.length - 1}</p>
        `;

    } catch (erro) {
        console.error("Erro:", erro);

        document.getElementById("analiseFretes").textContent =
            "Erro ao carregar os dados. Verifique o arquivo CSV.";
    }
}

carregarDados();
