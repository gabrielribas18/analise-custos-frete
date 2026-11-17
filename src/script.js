
const origem = document.getElementById("origem");
const destino = document.getElementById("destino");
const tipoPercurso = document.getElementById("tipoPercurso");
const campoRetorno = document.getElementById("campoRetorno");
const destinoRetorno = document.getElementById("destinoRetorno");
const botaoLocalizacao = document.getElementById("usarLocalizacao");
const resultado = document.getElementById("resultadoSimulacao");

let coordenadasOrigem = null;

// Mostrar ou esconder o campo de retorno
tipoPercurso.addEventListener("change", function () {
    campoRetorno.style.display =
        tipoPercurso.value === "personalizado" ? "block" : "none";
});

// Obter localização atual
function obterLocalizacao() {
    if (!navigator.geolocation) {
        resultado.textContent =
            "Seu navegador não oferece suporte à localização.";
        return;
    }

    resultado.textContent = "Obtendo sua localização...";

    navigator.geolocation.getCurrentPosition(
        function (posicao) {
            const latitude = posicao.coords.latitude;
            const longitude = posicao.coords.longitude;

            coordenadasOrigem = {
                latitude,
                longitude
            };

            origem.value =
                `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

            resultado.textContent =
                "Localização identificada. Você também pode alterar a origem manualmente.";
        },
        function (erro) {
            resultado.textContent =
                "Não foi possível obter sua localização. Autorize o acesso ou informe a origem manualmente.";
        },
        {
            enableHighAccuracy: true,
            timeout: 15000
        }
    );
}

// Botão para usar localização atual
botaoLocalizacao.addEventListener("click", obterLocalizacao);

// Tentar obter a localização ao abrir o simulador
obterLocalizacao();

// Limpar coordenadas se a pessoa alterar manualmente a origem
origem.addEventListener("input", function () {
    coordenadasOrigem = null;
});
