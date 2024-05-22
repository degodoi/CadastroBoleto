document.addEventListener('DOMContentLoaded', () => {
    const boletoForm = document.getElementById('boletoForm');
    const boletoList = document.getElementById('boletoList');
    
    const request = indexedDB.open('boletoDB', 1);

    request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const store = db.createObjectStore('boletos', { keyPath: 'id', autoIncrement: true });
        store.createIndex('nome', 'nome', { unique: false });
        store.createIndex('valor', 'valor', { unique: false });
        store.createIndex('vencimento', 'vencimento', { unique: false });
        store.createIndex('quantidade', 'quantidade', { unique: false });
        store.createIndex('parcelas', 'parcelas', { unique: false });
        store.createIndex('valorTotal', 'valorTotal', { unique: false });
        store.createIndex('valorRecebido', 'valorRecebido', { unique: false });
    };

    request.onsuccess = (event) => {
        const db = event.target.result;

        boletoForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nome = document.getElementById('nome').value;
            const valor = parseFloat(document.getElementById('valor').value);
            const vencimento = document.getElementById('vencimento').value;
            const quantidade = parseInt(document.getElementById('quantidade').value, 10);
            const valorTotal = valor * quantidade;
            const valorRecebido = 0;
            const parcelas = calcularParcelas(vencimento, quantidade);
            const descricao = `Parcela ${nome}`;
            const boleto = { descricao, valor, vencimento, quantidade, parcelas, valorTotal, valorRecebido };

            const transaction = db.transaction(['boletos'], 'readwrite');
            const store = transaction.objectStore('boletos');
            store.add(boleto);

            transaction.oncomplete = () => {
                displayBoletos();
                boletoForm.reset();
            };
        });

        function calcularParcelas(dataInicial, quantidade) {
            const parcelas = [];
            const data = new Date(dataInicial);
            for (let i = 0; i < quantidade; i++) {
                const novaData = new Date(data);
                novaData.setMonth(novaData.getMonth() + i);
                parcelas.push({ data: novaData.toISOString().split('T')[0], paga: false });
            }
            return parcelas;
        }

        function displayBoletos() {
            const transaction = db.transaction(['boletos'], 'readonly');
            const store = transaction.objectStore('boletos');
            const request = store.getAll();

            request.onsuccess = () => {
                boletoList.innerHTML = '';
                request.result.forEach((boleto) => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <strong>${boleto.descricao}</strong><br>
                        Valor por Parcela: R$${boleto.valor.toFixed(2)}<br>
                        Vencimento Inicial: ${boleto.vencimento}<br>
                        Quantidade de Parcelas: ${boleto.quantidade}<br>
                        <div class="parcelas">
                            ${boleto.parcelas.map((parcela, index) => `
                                <span>
                                    Parcela ${index + 1}: ${parcela.data}
                                    <button class="receber-button" onclick="toggleParcela(${boleto.id}, ${index})">
                                        ${parcela.paga ? 'Paga' : 'RECEBER'}
                                    </button>
                                </span>`).join('')}
                        </div>
                        <div class="total">
                            Valor Total: R$${boleto.valorTotal.toFixed(2)}<br>
                            Valor Recebido: R$${calcularValorRecebido(boleto.parcelas, boleto.valor).toFixed(2)}
                        </div>
                        <button onclick="removeBoleto(${boleto.id})">Remover</button>
                    `;
                    boletoList.appendChild(li);
                });
            };
        }

        window.toggleParcela = (id, index) => {
            const transaction = db.transaction(['boletos'], 'readwrite');
            const store = transaction.objectStore('boletos');
            const request = store.get(id);

            request.onsuccess = () => {
                const boleto = request.result;
                boleto.parcelas[index].paga = !boleto.parcelas[index].paga;

                const updateRequest = store.put(boleto);

                updateRequest.onsuccess = () => {
                    displayBoletos();
                };
            };
        };

        window.removeBoleto = (id) => {
            const transaction = db.transaction(['boletos'], 'readwrite');
            const store = transaction.objectStore('boletos');
            store.delete(id);

            transaction.oncomplete = () => {
                displayBoletos();
            };
        };

        function calcularParcelas(dataInicial, quantidade) {
            const parcelas = [];
            const data = new Date(dataInicial);
            for (let i = 0; i < quantidade; i++) {
                const novaData = new Date(data);
                novaData.setMonth(novaData.getMonth() + i);
                parcelas.push({ data: novaData.toISOString().split('T')[0], paga: false });
            }
            return parcelas;
        }

        function calcularValorRecebido(parcelas, valorParcela) {
            let valorRecebido = 0;
            parcelas.forEach((parcela) => {
                if (parcela.paga) {
                    valorRecebido += valorParcela;
                }
            });
            return valorRecebido;
        }

        function displayBoletos() {
            const transaction = db.transaction(['boletos'], 'readonly');
            const store = transaction.objectStore('boletos');
            const request = store.getAll();

            request.onsuccess = () => {
                boletoList.innerHTML = '';
                request.result.forEach((boleto) => {
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <strong>${boleto.descricao}</strong><br>
                        Valor por Parcela: R$${boleto.valor.toFixed(2)}<br>
                        Vencimento Inicial: ${boleto.vencimento}<br>
                        Quantidade de Parcelas: ${boleto.quantidade}<br>
                        <div class="parcelas">
                            ${boleto.parcelas.map((parcela, index) => `
                                <span>
                                    Parcela ${index + 1}: ${parcela.data}
                                    <button class="receber-button" onclick="toggleParcela(${boleto.id}, ${index})">
                                        ${parcela.paga ? 'Paga' : 'RECEBER'}
                                    </button>
                                </span>`).join('')}
                        </div>
                        <div class="total">
                            Valor Total: R$${boleto.valorTotal.toFixed(2)}<br>
                            Valor Recebido: R$${calcularValorRecebido(boleto.parcelas, boleto.valor).toFixed(2)}
                        </div>
                        <button onclick="removeBoleto(${boleto.id})">Remover</button>
                    `;
                    boletoList.appendChild(li);
                });
            };
        }

        displayBoletos();
    };

    request.onerror = (event) => {
        console.error('Database error: ' + event.target.errorCode);
    };
});
