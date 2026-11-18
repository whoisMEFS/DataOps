document.addEventListener("DOMContentLoaded", function () {
    // ==========================================
    // NAVEGAÇÃO ENTRE AS PÁGINAS
    // ==========================================

    const botoes = document.querySelectorAll(".menu-item[data-page]");
    const telas = document.querySelectorAll(".page-section");

    const titulos = {
        overview: {
            titulo: "Visão geral",
            subtitulo: "Acompanhe os indicadores do seu DataOps."
        },
        analytics: {
            titulo: "Análises",
            subtitulo: "Explore os indicadores e a evolução dos dados."
        },
        data: {
            titulo: "Central de Dados",
            subtitulo: "Importe, consulte e organize os dados da plataforma."
        },
        finance: {
            titulo: "Financeiro",
            subtitulo: "Receitas, despesas, custos e resultados."
        },
        commercial: {
            titulo: "Comercial",
            subtitulo: "Vendas, pedidos, metas e desempenho."
        },
        logistics: {
            titulo: "Logística",
            subtitulo: "Entregas, estoque, atrasos e pendências."
        },
        it: {
            titulo: "TI",
            subtitulo: "Chamados, problemas e tempo de resolução."
        },
        reports: {
            titulo: "Relatórios",
            subtitulo: "Consulte e exporte relatórios."
        },
        settings: {
            titulo: "Configurações",
            subtitulo: "Personalize as opções do DataOps."
        }
    };

    function abrirPagina(idTela) {
        const tela = document.getElementById(idTela);

        if (!tela || !titulos[idTela]) {
            console.error("Página não encontrada:", idTela);
            return;
        }

        telas.forEach(function (pagina) {
            pagina.classList.remove("active");
            pagina.hidden = true;
            pagina.style.setProperty("display", "none", "important");
        });

        tela.hidden = false;
        tela.classList.add("active");
        tela.style.setProperty("display", "block", "important");

        botoes.forEach(function (botao) {
            botao.classList.toggle("active", botao.dataset.page === idTela);
        });

        // Atualiza o título da página, se o elemento existir.
        const elementoTitulo = document.getElementById("pageTitle");
        const elementoSubtitulo = document.getElementById("pageSubtitle");

        if (elementoTitulo) {
            elementoTitulo.textContent = titulos[idTela].titulo;
        }

        if (elementoSubtitulo) {
            elementoSubtitulo.textContent = titulos[idTela].subtitulo;
        }

        // Atualiza o tamanho dos gráficos ao abrir uma página.
        setTimeout(function () {
            if (mainChart) mainChart.resize();
            if (distributionChart) distributionChart.resize();
            if (analyticsChart) analyticsChart.resize();
        }, 100);
    }

    botoes.forEach(function (botao) {
        botao.addEventListener("click", function (evento) {
            evento.preventDefault();

            const idTela = botao.dataset.page;

            abrirPagina(idTela);
            history.replaceState(null, "", "#" + idTela);
        });
    });

    // ==========================================
    // CONFIGURAÇÃO DOS GRÁFICOS
    // ==========================================

    let mainChart = null;
    let distributionChart = null;
    let analyticsChart = null;

    // Preenchimentos dos gráficos: usam os efeitos de JS/graficos-efeitos.js
    // quando o arquivo está carregado; sem ele, usam a cor translúcida.
    function preenchimento(tipo, cor) {
        const efeitos = window.DataOpsCharts;

        if (efeitos && typeof efeitos[tipo] === "function") {
            return efeitos[tipo](cor);
        }

        return /^#[0-9a-f]{6}$/i.test(cor) ? cor + "55" : cor;
    }

    const cores = {
        azul: "#3984ff",
        verde: "#34d399",
        roxo: "#a78bfa",
        laranja: "#fb923c",
        texto: "#94a3b8",
        grade: "rgba(148, 163, 184, 0.12)"
    };

    function criarOpcoesGrafico() {
        return {
            responsive: true,
            maintainAspectRatio: false,

            interaction: {
                intersect: false,
                mode: "index"
            },

            animation: {
                duration: 650,
                easing: "easeOutQuart"
            },

            locale: "pt-BR",

            layout: {
                padding: {
                    top: 12,
                    right: 12,
                    bottom: 4,
                    left: 4
                }
            },

            plugins: {
                legend: {
                    position: "top",

                    labels: {
                        color: cores.texto,
                        usePointStyle: true,
                        pointStyle: "circle",
                        padding: 20,
                        boxWidth: 8,
                        boxHeight: 8,
                        font: {
                            size: 12
                        }
                    }
                },

                tooltip: {
                    enabled: true,
                    backgroundColor: "#111a2a",
                    titleColor: "#f1f5f9",
                    bodyColor: "#f1f5f9",
                    borderColor: "rgba(57, 132, 255, 0.35)",
                    borderWidth: 1,
                    padding: 12,
                    cornerRadius: 10,
                    displayColors: true,

                    titleFont: {
                        size: 13,
                        weight: "bold"
                    },

                    bodyFont: {
                        size: 12
                    },

                    callbacks: {
                        label: function (contexto) {
                            const nome = contexto.dataset.label || "Valor";

                            const valor = Number(
                                contexto.parsed.y ??
                                contexto.raw ??
                                0
                            );

                            return nome + ": " +
                                valor.toLocaleString("pt-BR", {
                                    maximumFractionDigits: 1
                                });
                        }
                    }
                }
            },

            scales: {
                x: {
                    ticks: {
                        color: cores.texto,
                        maxRotation: 0,
                        autoSkip: true,
                        padding: 8,
                        font: {
                            size: 11
                        }
                    },

                    grid: {
                        display: false
                    },

                    border: {
                        display: false
                    }
                },

                y: {
                    beginAtZero: true,

                    ticks: {
                        color: cores.texto,
                        precision: 0,
                        padding: 10,
                        font: {
                            size: 11
                        }
                    },

                    grid: {
                        color: cores.grade,
                        drawTicks: false
                    },

                    border: {
                        display: false
                    }
                }
            }
        };
    }

    // Estado vindo do Supabase. Não há dados fixos no navegador.
    let resumoGeral = null;          // resultado de rpc_overview_summary
    let estadoCarga = "carregando";  // carregando | ok | erro
    let mensagemErroCarga = "";
    let versaoCarga = 0;             // descarta respostas antigas

    const NOMES_DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const NOMES_MESES = [
        "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
        "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ];

    function criarGraficos() {
        if (typeof Chart === "undefined") {
            console.error(
                "Chart.js não foi carregado. Verifique sua conexão com a internet."
            );
            return;
        }

        if (typeof ChartDataLabels !== "undefined") {
            Chart.register(ChartDataLabels);
        } else {
            console.warn("O plugin ChartDataLabels não foi carregado.");
        }

        const canvasPrincipal = document.getElementById("mainChart");
        const canvasDistribuicao = document.getElementById("distributionChart");
        const canvasAnalises = document.getElementById("analyticsChart");

        // ==========================================
        // GRÁFICO PRINCIPAL: EVOLUÇÃO DOS REGISTROS
        // ==========================================

        if (canvasPrincipal) {
            mainChart = new Chart(canvasPrincipal, {
                type: "line",

                data: {
                    labels: [],

                    datasets: [
                        {
                            label: "Registros",
                            data: [],
                            borderColor: cores.azul,
                            backgroundColor: preenchimento("areaFill", cores.azul),
                            borderWidth: 3,
                            pointBackgroundColor: cores.azul,
                            pointBorderColor: "#111a2a",
                            pointBorderWidth: 2,
                            pointRadius: 0,
                            pointHoverRadius: 7,
                            tension: 0.4,
                            fill: true
                        },
                        {
                            label: "Processos concluídos",
                            data: [],
                            borderColor: cores.verde,
                            backgroundColor: preenchimento("areaFill", cores.verde),
                            borderWidth: 3,
                            pointBackgroundColor: cores.verde,
                            pointBorderColor: "#111a2a",
                            pointBorderWidth: 2,
                            pointRadius: 0,
                            pointHoverRadius: 7,
                            tension: 0.4,
                            fill: true
                        }
                    ]
                },

                options: criarOpcoesGrafico()
            });
        }

        // ==========================================
        // GRÁFICO DE ROSCA: DISTRIBUIÇÃO POR STATUS
        // ==========================================

        if (canvasDistribuicao) {
            distributionChart = new Chart(canvasDistribuicao, {
                type: "doughnut",

                data: {
                    labels: [],

                    datasets: [
                        {
                            data: [],

                            backgroundColor: [
                                cores.azul,
                                cores.verde,
                                cores.laranja
                            ],

                            borderColor: "#111a2a",
                            borderWidth: 4,
                            hoverOffset: 12,
                            borderRadius: 8,
                            spacing: 2
                        }
                    ]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false,

                    cutout: "72%",
                    radius: "94%",

                    animation: {
                        animateRotate: true,
                        animateScale: true,
                        duration: 650,
                        easing: "easeOutQuart"
                    },

                    plugins: {
                        legend: {
                            position: "bottom",

                            labels: {
                                color: cores.texto,
                                padding: 18,
                                usePointStyle: true,
                                pointStyle: "circle",
                                boxWidth: 8,
                                boxHeight: 8,

                                font: {
                                    size: 12
                                }
                            }
                        },

                        tooltip: {
                            backgroundColor: "#111a2a",
                            titleColor: "#f1f5f9",
                            bodyColor: "#f1f5f9",
                            borderColor: "rgba(57, 132, 255, 0.35)",
                            borderWidth: 1,
                            padding: 12,
                            cornerRadius: 10,

                            callbacks: {
                                label: function (contexto) {
                                    const quantidade = Number(contexto.raw) || 0;
                                    const dados = contexto.dataset.data;

                                    const total = dados.reduce(function (soma, valor) {
                                        return soma + (Number(valor) || 0);
                                    }, 0);

                                    const percentual = total > 0
                                        ? (quantidade / total) * 100
                                        : 0;

                                    return `${contexto.label}: ${quantidade.toLocaleString("pt-BR")} registro(s) (${percentual.toLocaleString("pt-BR", {
                                        maximumFractionDigits: 1
                                    })}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // ==========================================
        // GRÁFICO DE ANÁLISES: COMPARAÇÃO POR PERÍODO
        // ==========================================

        if (canvasAnalises) {
            analyticsChart = new Chart(canvasAnalises, {
                type: "bar",

                data: {
                    labels: [],

                    datasets: [
                        {
                            label: "Registros",
                            data: [],
                            backgroundColor: preenchimento("barFill", cores.azul),
                            hoverBackgroundColor: "#5b9aff",
                            borderColor: cores.azul,
                            borderWidth: 1,
                            borderRadius: 8,
                            borderSkipped: false,
                            maxBarThickness: 42
                        },
                        {
                            label: "Processos concluídos",
                            data: [],
                            backgroundColor: preenchimento("barFill", cores.verde),
                            hoverBackgroundColor: "#5ee5b5",
                            borderColor: cores.verde,
                            borderWidth: 1,
                            borderRadius: 8,
                            borderSkipped: false,
                            maxBarThickness: 42
                        }
                    ]
                },

                options: {
                    ...criarOpcoesGrafico(),

                    plugins: {
                        ...criarOpcoesGrafico().plugins,

                        datalabels: {
                            display: function (contexto) {
                                return contexto.dataset.data[contexto.dataIndex] > 0;
                            },

                            color: "#f1f5f9",
                            anchor: "end",
                            align: "top",
                            offset: 3,
                            clamp: true,

                            font: {
                                weight: "bold",
                                size: 10
                            },

                            formatter: function (valor) {
                                return Number(valor).toLocaleString("pt-BR");
                            }
                        }
                    }
                }
            });
        }

        // Os dados chegam do Supabase em carregarTudo().
    }

    // ==========================================
    // FILTRO DE PERÍODO
    // ==========================================

    const filtroPeriodo = document.getElementById("periodFilter");

    // ==========================================
    // INDICADORES E GRÁFICOS (calculados no banco)
    // ==========================================

    function formatarNumero(valor, casas) {
        return Number(valor || 0).toLocaleString("pt-BR", {
            minimumFractionDigits: casas,
            maximumFractionDigits: casas
        });
    }

    function animarContador(contador, valorFinal, casasDecimais) {
        contador.dataset.value = valorFinal;
        contador.dataset.decimals = casasDecimais;

        const reduzir =
            document.documentElement.classList.contains("reduce-motion") ||
            (window.matchMedia &&
                window.matchMedia("(prefers-reduced-motion: reduce)").matches);

        if (reduzir) {
            contador._animacao = (contador._animacao || 0) + 1;
            contador.textContent = formatarNumero(valorFinal, casasDecimais);
            return;
        }

        const inicio = performance.now();
        const duracao = 1000;
        const marca = (contador._animacao = (contador._animacao || 0) + 1);

        function animar(tempoAtual) {
            if (contador._animacao !== marca) return;

            const progresso = Math.min((tempoAtual - inicio) / duracao, 1);

            contador.textContent = formatarNumero(valorFinal * progresso, casasDecimais);

            if (progresso < 1) requestAnimationFrame(animar);
        }

        requestAnimationFrame(animar);
    }

    function limparIndicadores() {
        document.querySelectorAll("#overview .stat-card .counter").forEach(function (contador) {
            contador._animacao = (contador._animacao || 0) + 1;
            contador.textContent = "—";
        });
    }

    function aplicarResumo(resumo) {
        const total = Number(resumo.total) || 0;
        const concluidos = Number(resumo.concluidos) || 0;
        const pendentes = Number(resumo.pendentes) || 0;
        const andamento = Number(resumo.em_andamento) || 0;
        const taxa = Number(resumo.taxa_sucesso) || 0;

        // Os quatro indicadores da Visão Geral.
        const valores = [total, concluidos, pendentes, taxa];

        document.querySelectorAll("#overview .stat-card .counter").forEach(function (indicador, indice) {
            if (indice >= valores.length) return;

            animarContador(indicador, valores[indice], indice === 3 ? 1 : 0);
        });

        // Distribuição por status (rosca).
        if (!distributionChart) return;

        if (total === 0) {
            distributionChart.data.labels = ["Sem registros"];
            distributionChart.data.datasets[0].data = [1];
            distributionChart.data.datasets[0].backgroundColor = ["rgba(148, 163, 184, 0.35)"];

            distributionChart.options.plugins.tooltip.callbacks.label = function () {
                return "Nenhum registro importado";
            };

            distributionChart.update();
            return;
        }

        const coresStatus = {
            "Concluídos": cores.azul,
            "Em andamento": cores.verde,
            "Pendentes": cores.laranja,
            "Outros status": cores.roxo
        };

        const statusResumo = {
            "Concluídos": concluidos,
            "Em andamento": andamento,
            "Pendentes": pendentes,
            "Outros status": total - concluidos - andamento - pendentes
        };

        const statusFiltrados = Object.entries(statusResumo)
            .filter(([nome, quantidade]) => quantidade > 0);

        distributionChart.data.labels = statusFiltrados.map(([nome]) => nome);
        distributionChart.data.datasets[0].data = statusFiltrados.map(([nome, quantidade]) => quantidade);
        distributionChart.data.datasets[0].backgroundColor = statusFiltrados.map(([nome]) => coresStatus[nome]);

        distributionChart.options.plugins.tooltip.callbacks.label =
            function (contexto) {
                const quantidade = contexto.raw;
                const percentual = total > 0 ? (quantidade / total) * 100 : 0;

                return `${contexto.label}: ${quantidade} registro(s) (${percentual.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1
                })}%)`;
            };

        distributionChart.update();
    }

    // Gráfico da página Análises: registros e concluídos por categoria.
    function aplicarCategorias(linhas) {
        if (!analyticsChart) return;

        analyticsChart.data.labels = linhas.map(linha => linha.category);
        analyticsChart.data.datasets[0].data = linhas.map(linha => Number(linha.registros) || 0);
        analyticsChart.data.datasets[1].data = linhas.map(linha => Number(linha.concluidos) || 0);
        analyticsChart.update();
    }

    function rotulosDoPeriodo(periodo, linhas) {
        if (periodo === "month") {
            return ["Sem. 1", "Sem. 2", "Sem. 3", "Sem. 4"];
        }

        return linhas.map(function (linha) {
            if (periodo === "year") {
                return NOMES_MESES[Number(String(linha.bucket_start).slice(5, 7)) - 1];
            }

            // A data chega como AAAA-MM-DD; meio-dia evita virada de fuso.
            return NOMES_DIAS[new Date(linha.bucket_start + "T12:00:00").getDay()];
        });
    }

    // Gráfico principal: registros criados e concluídos no período.
    function aplicarSerie(periodo, linhas) {
        if (!mainChart) return;

        mainChart.data.labels = rotulosDoPeriodo(periodo, linhas);
        mainChart.data.datasets[0].data = linhas.map(linha => Number(linha.registros) || 0);
        mainChart.data.datasets[1].data = linhas.map(linha => Number(linha.processos) || 0);
        mainChart.update();
    }

    function mensagemAmigavel(erro, padrao) {
        return erro && erro.amigavel ? erro.message : padrao;
    }

    async function atualizarIndicadores() {
        const minhaVersao = ++versaoCarga;
        const filtro = document.getElementById("periodFilter");
        const periodo = filtro ? filtro.value : "week";

        try {
            const api = await window.DataOpsReady;

            const [resumo, categorias, serie] = await Promise.all([
                api.data.resumoGeral(),
                api.data.registrosPorCategoria(),
                api.data.serieDoPeriodo(periodo)
            ]);

            if (minhaVersao !== versaoCarga) return;

            resumoGeral = resumo;
            estadoCarga = "ok";
            mensagemErroCarga = "";

            aplicarResumo(resumo);
            aplicarCategorias(categorias);
            aplicarSerie(periodo, serie);
        } catch (erro) {
            if (minhaVersao !== versaoCarga) return;

            console.error("DataOps: falha ao carregar indicadores", erro);

            resumoGeral = null;
            estadoCarga = "erro";
            mensagemErroCarga = mensagemAmigavel(
                erro,
                "Não foi possível carregar os indicadores. Tente novamente."
            );

            limparIndicadores();
        }

        atualizarAlertasInteligentes();
    }

    if (filtroPeriodo) {
        filtroPeriodo.addEventListener("change", atualizarIndicadores);
    }

    criarGraficos();

    // Os contadores da Visão Geral são animados em aplicarResumo(),
    // quando os valores reais chegam do banco.

    // ==========================================
    // IMPORTAÇÃO DE ARQUIVOS CSV
    // ==========================================

    const importForm = document.getElementById("importForm");
    const importFile = document.getElementById("importFile");
    const selectedFileName = document.getElementById("selectedFileName");
    const importMessage = document.getElementById("importMessage");
    const importSector = document.getElementById("importSector");

    if (importFile && selectedFileName) {
        importFile.addEventListener("change", function () {
            const arquivo = this.files[0];

            selectedFileName.textContent = arquivo
                ? "Arquivo selecionado: " + arquivo.name
                : "Nenhum arquivo selecionado";
        });
    }

    let importando = false;

    function lerArquivoTexto(arquivo) {
        return new Promise(function (resolve, reject) {
            const leitor = new FileReader();

            leitor.onload = function () { resolve(String(leitor.result)); };
            leitor.onerror = function () {
                reject(Object.assign(new Error("Não foi possível ler o arquivo."), { amigavel: true }));
            };

            leitor.readAsText(arquivo, "UTF-8");
        });
    }

    function falhaDeImportacao(mensagem) {
        return Object.assign(new Error(mensagem), { amigavel: true });
    }

    if (importForm) {
        importForm.addEventListener("submit", async function (evento) {
            evento.preventDefault();

            // Evita envios duplicados por cliques repetidos.
            if (importando) return;

            const arquivo = importFile.files[0];
            const setor = importSector.value;

            if (!arquivo) {
                importMessage.textContent = "Selecione um arquivo CSV.";
                return;
            }

            if (!arquivo.name.toLowerCase().endsWith(".csv")) {
                importMessage.textContent = "Selecione um arquivo com extensão .csv.";
                return;
            }

            const botaoImportar = importForm.querySelector('button[type="submit"]');

            importando = true;
            if (botaoImportar) botaoImportar.disabled = true;
            importMessage.textContent = "Importando...";

            try {
                const api = await window.DataOpsReady;
                const texto = await lerArquivoTexto(arquivo);
                const csv = api.data.lerCsv(texto);

                if (csv.aspasAbertas) {
                    throw falhaDeImportacao("O arquivo CSV está malformado (aspas sem fechamento).");
                }

                if (csv.linhas.length < 1) {
                    throw falhaDeImportacao("O arquivo está vazio ou não possui registros.");
                }

                const indiceId = csv.cabecalho.indexOf("id");
                const indiceRegistro = csv.cabecalho.indexOf("registro");
                const indiceCategoria = csv.cabecalho.indexOf("categoria");
                const indiceStatus = csv.cabecalho.indexOf("status");

                if (
                    indiceId === -1 ||
                    indiceRegistro === -1 ||
                    indiceCategoria === -1 ||
                    indiceStatus === -1
                ) {
                    throw falhaDeImportacao(
                        "O CSV precisa ter as colunas: id, registro, categoria e status."
                    );
                }

                const itens = csv.linhas.map(function (colunas) {
                    return {
                        id: colunas[indiceId],
                        registro: colunas[indiceRegistro],
                        categoria: colunas[indiceCategoria],
                        status: colunas[indiceStatus]
                    };
                });

                // Só indica sucesso depois que o banco confirmar a gravação.
                const resultado = await api.data.importarRegistros(setor, itens);

                const nomeSetor =
                    importSector.options[importSector.selectedIndex].text;

                const avisos =
                    (resultado.duplicados > 0
                        ? " " + resultado.duplicados + " registro(s) duplicado(s) ignorado(s)."
                        : "") +
                    (resultado.invalidos > 0
                        ? " " + resultado.invalidos + " linha(s) inválida(s) ignorada(s) (id ou registro ausente, ou texto longo demais)."
                        : "") +
                    (resultado.statusDesconhecidos > 0
                        ? " " + resultado.statusDesconhecidos + " com status não reconhecido (gravados como Outro)."
                        : "");

                if (resultado.importados > 0) {
                    // Atualiza tabela, indicadores, gráficos e alertas com o que está no banco.
                    await carregarTudo();

                    importMessage.textContent =
                        resultado.importados + " registro(s) importado(s) para " + nomeSetor + "." + avisos;

                    // Tela de confirmação (se existir no HTML desta versão).
                    const campoQuantidade = document.getElementById("successImportCount");
                    const campoSetor = document.getElementById("successImportSector");
                    const campoArquivo = document.getElementById("successImportFile");
                    const modal = document.getElementById("importSuccessModal");

                    if (campoQuantidade && campoSetor && campoArquivo && modal) {
                        campoQuantidade.textContent = resultado.importados;
                        campoSetor.textContent = nomeSetor;
                        campoArquivo.textContent = arquivo.name;

                        modal.hidden = false;
                    }

                    // Limpa o formulário após a importação.
                    importForm.reset();

                    if (selectedFileName) {
                        selectedFileName.textContent = "Nenhum arquivo selecionado";
                    }
                } else if (resultado.duplicados > 0) {
                    importMessage.textContent =
                        "Nenhum registro novo foi importado." + avisos;
                } else {
                    importMessage.textContent =
                        "Nenhum registro válido foi encontrado no arquivo." + avisos;
                }
            } catch (erro) {
                console.error("DataOps: falha na importação", erro);

                importMessage.textContent = mensagemAmigavel(
                    erro,
                    "Não foi possível importar o arquivo. Tente novamente."
                );
            } finally {
                importando = false;
                if (botaoImportar) botaoImportar.disabled = false;
            }
        });
    }

    // ==========================================
    // BOTÕES DA TELA DE CONFIRMAÇÃO
    // ==========================================

    const importSuccessModal =
        document.getElementById("importSuccessModal");

    const closeImportModal =
        document.getElementById("closeImportModal");

    const viewImportedData =
        document.getElementById("viewImportedData");

    // Botão Voltar.
    if (closeImportModal && importSuccessModal) {
        closeImportModal.addEventListener("click", function () {
            importSuccessModal.hidden = true;
        });
    }

    // Botão Visualizar dados.
    if (viewImportedData && importSuccessModal) {
        viewImportedData.addEventListener("click", function () {
            // Fecha completamente a tela de confirmação.
            importSuccessModal.hidden = true;

            // Remove os estilos aplicados diretamente pelo JavaScript, se existirem.
            importSuccessModal.style.removeProperty("position");
            importSuccessModal.style.removeProperty("inset");
            importSuccessModal.style.removeProperty("width");
            importSuccessModal.style.removeProperty("height");
            importSuccessModal.style.removeProperty("display");
            importSuccessModal.style.removeProperty("background");
            importSuccessModal.style.removeProperty("z-index");
            importSuccessModal.style.removeProperty("visibility");
            importSuccessModal.style.removeProperty("opacity");

            // Localiza a tabela de dados.
            const tabela = document.getElementById("dataTableBody");

            if (tabela) {
                tabela.closest(".page-section")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }
        });
    }

    // Fechar a tela ao clicar no fundo escuro.
    if (importSuccessModal) {
        importSuccessModal.addEventListener("click", function (evento) {
            if (evento.target === importSuccessModal) {
                importSuccessModal.hidden = true;
            }
        });
    }

    // Fechar a tela com a tecla ESC.
    document.addEventListener("keydown", function (evento) {
        if (evento.key === "Escape" && importSuccessModal) {
            importSuccessModal.hidden = true;
        }
    });

    // ==========================================
    // ALERTAS INTELIGENTES DO DATAOPS
    // ==========================================

    function atualizarAlertasInteligentes() {
        const tabela = document.getElementById("dataTableBody");
        const visaoGeral = document.getElementById("overview");

        if (!tabela || !visaoGeral) return;

        // Cria o painel somente uma vez.
        let painel = document.getElementById("intelligentAlertsPanel");

        if (!painel) {
            painel = document.createElement("div");
            painel.id = "intelligentAlertsPanel";
            painel.className = "panel intelligent-alerts-panel";

            painel.innerHTML = `
                <div class="alerts-header">
                    <div>
                        <h2>Alertas inteligentes</h2>
                        <p>Acompanhe registros que precisam de atenção.</p>
                    </div>

                    <div class="alerts-header-actions">
                        <div id="systemHealth" class="system-health health-healthy">
                            <span class="health-indicator"></span>
                            <span id="systemHealthText">Saudável</span>
                        </div>

                        <span id="alertsTotal" class="alerts-total">0 alertas</span>
                    </div>
                </div>

                <div id="alertsList" class="alerts-list"></div>
            `;

            const gradeIndicadores = visaoGeral.querySelector(".stats-grid");

            if (gradeIndicadores) {
                gradeIndicadores.insertAdjacentElement("afterend", painel);
            } else {
                visaoGeral.prepend(painel);
            }
        }

        let pendentes = 0;
        let andamento = 0;
        let problemas = 0;

        const alertas = [];

        if (estadoCarga === "carregando" && !resumoGeral) {
            alertas.push({
                tipo: "loading",
                icone: "⏳",
                titulo: "Carregando indicadores",
                descricao: "Buscando os dados no servidor..."
            });
        } else if (estadoCarga === "erro") {
            alertas.push({
                tipo: "error",
                icone: "⚠️",
                titulo: "Não foi possível carregar os dados",
                descricao: mensagemErroCarga || "Tente novamente em instantes."
            });
        } else if (resumoGeral) {
            // Contagens calculadas no banco (todas as linhas, não só as exibidas).
            pendentes = Number(resumoGeral.pendentes) || 0;
            andamento = Number(resumoGeral.em_andamento) || 0;
            problemas = Number(resumoGeral.erros) || 0;

            if (problemas > 0) {
                alertas.push({
                    tipo: "danger",
                    icone: "🔴",
                    titulo: "Problemas identificados",
                    descricao: `${problemas} registro(s) com erro ou falha. Verifique os dados.`
                });
            }

            if (pendentes > 0) {
                alertas.push({
                    tipo: "warning",
                    icone: "🟠",
                    titulo: "Registros pendentes",
                    descricao: `${pendentes} registro(s) aguardando conclusão.`
                });
            }

            if (andamento > 0) {
                alertas.push({
                    tipo: "info",
                    icone: "🔵",
                    titulo: "Processos em andamento",
                    descricao: `${andamento} registro(s) ainda em processamento.`
                });
            }

            if (alertas.length === 0) {
                if (Number(resumoGeral.total) === 0) {
                    alertas.push({
                        tipo: "success",
                        icone: "🟢",
                        titulo: "Nenhum registro importado",
                        descricao: "Importe um arquivo CSV na Central de Dados para acompanhar os alertas."
                    });
                } else {
                    alertas.push({
                        tipo: "success",
                        icone: "🟢",
                        titulo: "Tudo certo!",
                        descricao: "Nenhum registro pendente ou com problema foi identificado."
                    });
                }
            }
        }

        // Atualiza o indicador de saúde do sistema.
        const indicadorSaude = document.getElementById("systemHealth");
        const textoSaude = document.getElementById("systemHealthText");

        if (indicadorSaude && textoSaude) {
            indicadorSaude.classList.remove(
                "health-healthy",
                "health-warning",
                "health-critical"
            );

            if (estadoCarga === "erro") {
                indicadorSaude.classList.add("health-warning");
                textoSaude.textContent = "Indisponível";
            } else if (estadoCarga === "carregando" && !resumoGeral) {
                indicadorSaude.classList.add("health-warning");
                textoSaude.textContent = "Verificando";
            } else if (problemas > 0) {
                indicadorSaude.classList.add("health-critical");
                textoSaude.textContent = "Crítico";
            } else if (pendentes > 0 || andamento > 0) {
                indicadorSaude.classList.add("health-warning");
                textoSaude.textContent = "Atenção";
            } else {
                indicadorSaude.classList.add("health-healthy");
                textoSaude.textContent = "Saudável";
            }
        }

        // Atualiza a lista de alertas.
        const lista = document.getElementById("alertsList");
        const total = document.getElementById("alertsTotal");

        lista.replaceChildren();

        alertas.forEach(alerta => {
            const item = document.createElement("div");
            item.className = `alert-item alert-${alerta.tipo}`;
            if (alerta.tipo === "error") item.classList.add("alert-danger");

            const icone = document.createElement("span");
            icone.className = "alert-icon";
            icone.textContent = alerta.icone;

            const conteudo = document.createElement("div");
            conteudo.className = "alert-content";

            const titulo = document.createElement("h3");
            titulo.textContent = alerta.titulo;

            const descricao = document.createElement("p");
            descricao.textContent = alerta.descricao;

            conteudo.append(titulo, descricao);
            item.append(icone, conteudo);

            // Define a ação correspondente ao tipo de alerta.
            const filtrosAlerta = {
                warning: {
                    status: "pendente",
                    texto: "Ver pendentes"
                },
                info: {
                    status: "andamento",
                    texto: "Ver processos"
                },
                danger: {
                    status: "erro",
                    texto: "Ver erros"
                }
            };

            const configuracao = filtrosAlerta[alerta.tipo];

            if (configuracao) {
                const botao = document.createElement("button");

                botao.type = "button";
                botao.className = "alert-action-button";
                botao.textContent = configuracao.texto;

                botao.addEventListener("click", function () {
                    // Localiza os controles da Central de Dados.
                    const pesquisa = document.getElementById("searchData");
                    const categoria = document.getElementById("filterCategoria");
                    const status = document.getElementById("filterStatus");
                    const setor = document.getElementById("filterSetor");

                    // Limpa os filtros anteriores.
                    if (pesquisa) pesquisa.value = "";
                    if (categoria) categoria.value = "";
                    if (setor) setor.value = "";

                    if (status) {
                        // Garante que a opção do filtro exista.
                        let opcao = Array.from(status.options).find(
                            opt => opt.value === configuracao.status
                        );

                        if (!opcao) {
                            opcao = document.createElement("option");
                            opcao.value = configuracao.status;
                            opcao.textContent = configuracao.status === "erro"
                                ? "Com erro"
                                : configuracao.status === "pendente"
                                    ? "Pendente"
                                    : "Em andamento";

                            status.appendChild(opcao);
                        }

                        status.value = configuracao.status;
                    }

                    // Abre a Central de Dados e aplica o filtro.
                    abrirPagina("data");
                    atualizarOpcoesCategoria();
                    aplicarFiltros();
                });

                item.appendChild(botao);
            }

            lista.appendChild(item);
        });

        const quantidadeAlertas = alertas.filter(
            alerta => !["success", "loading"].includes(alerta.tipo)
        ).length;

        total.textContent =
            `${quantidadeAlertas} ${quantidadeAlertas === 1 ? "alerta" : "alertas"}`;
    }

    // Os alertas são atualizados em atualizarIndicadores(), a partir
    // das contagens calculadas no banco.

    // ==========================================
    // PESQUISA E FILTROS AVANÇADOS
    // ==========================================

    const campoPesquisa = document.getElementById("searchData");
    const corpoTabela = document.getElementById("dataTableBody");
    const filtroCategoria = document.getElementById("filterCategoria");
    const filtroStatus = document.getElementById("filterStatus");
    const filtroSetor = document.getElementById("filterSetor");
    const botaoLimparFiltros = document.getElementById("clearFilters");
    const contadorResultados = document.getElementById("filterResultCount");

    // Normaliza textos para facilitar a comparação.
    function normalizarTexto(valor) {
        return String(valor || "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    // Grupos de status usados pelos filtros.
    const gruposStatus = {
        concluido: [
            "concluido", "concluida", "concluidos", "concluidas",
            "finalizado", "finalizada", "finalizados", "finalizadas",
            "completed", "complete", "done", "success", "sucesso"
        ],
        pendente: ["pendente", "pendentes", "pending", "aguardando"],
        andamento: [
            "em andamento", "em_andamento", "andamento", "processando",
            "em processamento", "in progress", "in_progress", "processing"
        ],
        erro: [
            "erro", "error", "falha", "falhou", "falhado", "falhada",
            "com erro", "erro de processamento", "failed", "failure",
            "rejected", "rejeitado", "rejeitada"
        ]
    };

    // Verifica se o status da linha corresponde ao filtro escolhido.
    function statusCorresponde(filtro, statusLinha) {
        if (!filtro) return true;
        if (!gruposStatus[filtro]) return statusLinha === filtro;

        return gruposStatus[filtro].includes(statusLinha);
    }

    // Preenche as categorias existentes na tabela.
    function atualizarOpcoesCategoria() {
        if (!corpoTabela || !filtroCategoria) return;

        const categoriaSelecionada = filtroCategoria.value;
        const setorSelecionado = filtroSetor?.value || "";
        const statusSelecionado = normalizarTexto(filtroStatus?.value);

        const categorias = [
            ...new Set(
                Array.from(corpoTabela.querySelectorAll("tr"))
                    .filter(linha => {
                        const setorLinha = linha.dataset.setor || "";
                        const statusLinha = normalizarTexto(linha.cells[3]?.textContent);

                        const correspondeSetor =
                            !setorSelecionado || setorLinha === setorSelecionado;

                        return correspondeSetor &&
                            statusCorresponde(statusSelecionado, statusLinha);
                    })
                    .map(linha => linha.cells[2]?.textContent.trim())
                    .filter(Boolean)
            )
        ].sort((a, b) => a.localeCompare(b, "pt-BR"));

        filtroCategoria.replaceChildren(new Option("Todas as categorias", ""));

        categorias.forEach(function (categoria) {
            filtroCategoria.appendChild(new Option(categoria, categoria));
        });

        filtroCategoria.value = categorias.includes(categoriaSelecionada)
            ? categoriaSelecionada
            : "";
    }

    // Aplica pesquisa, categoria, status e setor à tabela.
    function aplicarFiltros() {
        if (!corpoTabela) return;

        const termo = normalizarTexto(campoPesquisa?.value);
        const categoria = filtroCategoria?.value || "";
        const status = normalizarTexto(filtroStatus?.value);
        const setor = filtroSetor?.value || "";

        const linhas = Array.from(corpoTabela.querySelectorAll("tr"));
        let visiveis = 0;

        linhas.forEach(function (linha) {
            const textoLinha = normalizarTexto(linha.textContent);
            const categoriaLinha = linha.cells[2]?.textContent.trim() || "";
            const statusLinha = normalizarTexto(linha.cells[3]?.textContent);
            const setorLinha = linha.dataset.setor || "";

            const mostrar =
                (!termo || textoLinha.includes(termo)) &&
                (!categoria || categoriaLinha === categoria) &&
                statusCorresponde(status, statusLinha) &&
                (!setor || setorLinha === setor);

            linha.hidden = !mostrar;

            if (mostrar) visiveis++;
        });

        if (contadorResultados) {
            contadorResultados.textContent =
                visiveis + (visiveis === 1 ? " resultado" : " resultados");
        }
    }

    function atualizarFiltrosTabela() {
        atualizarOpcoesCategoria();
        aplicarFiltros();
    }

    if (campoPesquisa) {
        campoPesquisa.addEventListener("input", aplicarFiltros);
    }

    if (filtroCategoria) {
        filtroCategoria.addEventListener("change", aplicarFiltros);
    }

    if (filtroStatus) {
        filtroStatus.addEventListener("change", function () {
            atualizarOpcoesCategoria();
            aplicarFiltros();
        });
    }

    if (filtroSetor) {
        filtroSetor.addEventListener("change", function () {
            atualizarOpcoesCategoria();
            aplicarFiltros();
        });
    }

    if (botaoLimparFiltros) {
        botaoLimparFiltros.addEventListener("click", function () {
            if (campoPesquisa) campoPesquisa.value = "";
            if (filtroCategoria) filtroCategoria.value = "";
            if (filtroStatus) filtroStatus.value = "";
            if (filtroSetor) filtroSetor.value = "";

            atualizarFiltrosTabela();
        });
    }

    // ==========================================
    // CARREGAMENTO DOS DADOS (SUPABASE)
    // ==========================================

    const estadoTabela = document.getElementById("dataTableState");

    function mostrarEstadoTabela(texto, erro) {
        if (!estadoTabela) return;

        estadoTabela.textContent = texto || "";
        estadoTabela.classList.toggle("error", Boolean(erro));
        estadoTabela.hidden = !texto;
    }

    const CLASSE_STATUS = {
        concluido: "success",
        pendente: "pending",
        em_andamento: "progress",
        erro: "danger",
        outro: "neutral"
    };

    function renderizarTabela(api, registros) {
        if (!corpoTabela) return;

        const fragmento = document.createDocumentFragment();

        registros.forEach(function (registro) {
            const tr = document.createElement("tr");
            tr.dataset.setor = registro.sector;

            [registro.external_id, registro.title, registro.category]
                .forEach(function (valor) {
                    const td = document.createElement("td");
                    td.textContent = valor;
                    tr.appendChild(td);
                });

            const tdStatus = document.createElement("td");
            const selo = document.createElement("span");

            selo.className = "table-status " + (CLASSE_STATUS[registro.status] || "neutral");
            selo.textContent = api.data.ROTULO_STATUS[registro.status] || registro.status;

            tdStatus.appendChild(selo);
            tr.appendChild(tdStatus);

            fragmento.appendChild(tr);
        });

        corpoTabela.replaceChildren(fragmento);
    }

    async function carregarRegistros() {
        mostrarEstadoTabela("Carregando registros...");

        try {
            const api = await window.DataOpsReady;
            const { registros, truncado } = await api.data.listarRegistros();

            renderizarTabela(api, registros);
            atualizarFiltrosTabela();

            if (registros.length === 0) {
                mostrarEstadoTabela("Nenhum registro encontrado. Importe um arquivo CSV para começar.");
            } else if (truncado) {
                mostrarEstadoTabela("Exibindo os primeiros 10.000 registros. Use os filtros para refinar.");
            } else {
                mostrarEstadoTabela("");
            }
        } catch (erro) {
            console.error("DataOps: falha ao carregar registros", erro);

            // Erro não vira lista vazia: a tabela é limpa e o erro é mostrado.
            if (corpoTabela) corpoTabela.replaceChildren();
            atualizarFiltrosTabela();

            mostrarEstadoTabela(
                mensagemAmigavel(erro, "Não foi possível carregar os registros. Tente novamente."),
                true
            );
        }
    }

    function iconeDaAtividade(status) {
        if (status === "concluido") return { cor: "green", icone: "bx-check-circle" };
        if (status === "erro") return { cor: "red", icone: "bx-error-circle" };
        if (status === "pendente") return { cor: "orange", icone: "bx-time-five" };

        return { cor: "blue", icone: "bx-data" };
    }

    function formatarQuando(iso) {
        const data = new Date(iso);

        return data.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    async function atualizarAtividades() {
        const lista = document.getElementById("recentActivity");

        if (!lista) return;

        try {
            const api = await window.DataOpsReady;
            const recentes = await api.data.registrosRecentes(5);

            lista.replaceChildren();

            if (recentes.length === 0) {
                const vazio = document.createElement("p");
                vazio.className = "table-state";
                vazio.textContent = "Nenhuma atividade ainda. Os registros importados aparecerão aqui.";
                lista.appendChild(vazio);
                return;
            }

            recentes.forEach(function (registro) {
                const visual = iconeDaAtividade(registro.status);

                const item = document.createElement("div");
                item.className = "activity-item";

                const icone = document.createElement("span");
                icone.className = "activity-icon " + visual.cor;

                const i = document.createElement("i");
                i.className = "bx " + visual.icone;
                icone.appendChild(i);

                const texto = document.createElement("div");

                const titulo = document.createElement("strong");
                titulo.textContent = registro.title;

                const detalhe = document.createElement("p");
                detalhe.textContent =
                    registro.category + " · " + api.data.ROTULO_STATUS[registro.status] +
                    " · " + formatarQuando(registro.created_at);

                texto.append(titulo, detalhe);
                item.append(icone, texto);
                lista.appendChild(item);
            });
        } catch (erro) {
            console.error("DataOps: falha ao carregar atividades", erro);

            lista.replaceChildren();

            const falha = document.createElement("p");
            falha.className = "table-state error";
            falha.textContent = mensagemAmigavel(
                erro,
                "Não foi possível carregar as atividades recentes."
            );
            lista.appendChild(falha);
        }
    }

    // Recarrega tudo que depende dos registros (após importar, por exemplo).
    async function carregarTudo() {
        await Promise.all([
            carregarRegistros(),
            atualizarIndicadores(),
            atualizarAtividades()
        ]);
    }

    // ==========================================
    // INICIALIZAÇÃO
    // ==========================================

    limparIndicadores();
    atualizarAlertasInteligentes();
    carregarTudo();

    // Abre a página indicada no endereço (#overview, #data...) ou a Visão Geral.
    const paginaInicial = location.hash.replace("#", "");
    abrirPagina(titulos[paginaInicial] ? paginaInicial : "overview");
});

