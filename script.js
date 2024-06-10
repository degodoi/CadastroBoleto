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
            const boleto = getFormData();
            const transaction = db.transaction(['boletos'], 'readwrite');
            const store = transaction.objectStore('boletos');
            store.add(boleto);

            transaction.oncomplete = () => {
                displayBoletos();
                boletoForm.reset();
                showAlert('Boleto cadastrado com sucesso!', 'success');
            };
        });

        window.toggleParcela = (id, index) => {
            const transaction = db.transaction(['boletos'], 'readwrite');
            const store = transaction.objectStore('boletos');
            const request = store.get(id);

            request.onsuccess = () => {
                const boleto = request.result;
                boleto.parcelas[index].paga = !boleto.parcelas[index].paga;
                store.put(boleto).onsuccess = displayBoletos;
            };
        };

        window.removeBoleto = (id) => {
            const transaction = db.transaction(['boletos'], 'readwrite');
            const store = transaction.objectStore('boletos');
            store.delete(id).onsuccess = () => {
                displayBoletos();
                showAlert('Boleto removido com sucesso!', 'danger');
            };
        };

        function getFormData() {
            const nome = document.getElementById('nome').value;
            const valor = parseFloat(document.getElementById('valor').value);
            const vencimento = document.getElementById('vencimento').value;
            const quantidade = Math.min(parseInt(document.getElementById('quantidade').value, 10), 5); // Limitar a 5 parcelas
            const valorTotal = valor * quantidade;
            const valorRecebido = 0;
            const parcelas = calcularParcelas(vencimento, quantidade);
            const descricao = `Parcela ${nome}`;
            return { descricao, valor, vencimento, quantidade, parcelas, valorTotal, valorRecebido };
        }

        function calcularParcelas(dataInicial, quantidade) {
            const parcelas = [];
            const data = new Date(dataInicial);
            for (let i = 0; i < quantidade; i++) {
                const novaData = new Date(data);
                novaData.setMonth(novaData.getMonth() + i);
                parcelas.push({ data: formatDateBR(novaData), paga: false });
            }
            return parcelas;
        }

        function formatDateBR(date) {
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0'); // January is 0
            const year = String(date.getFullYear()).slice(2); // Get last two digits of the year
            return `${day}-${month}-${year}`;
        }

        function calcularValorRecebido(parcelas, valorParcela) {
            return parcelas.reduce((total, parcela) => total + (parcela.paga ? valorParcela : 0), 0);
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
                        Vencimento Inicial: ${formatDateBR(new Date(boleto.vencimento))}<br>
                        Quantidade de Parcelas: ${boleto.quantidade}<br>
                        <div class="parcelas">
                            ${boleto.parcelas.map((parcela, index) => `
                                <span class="${parcela.paga ? 'paga' : ''}">
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
                        <button class="remove-button" onclick="removeBoleto(${boleto.id})">Remover</button>
                    `;
                    boletoList.appendChild(li);
                });
            };
        }

        function showAlert(message, type) {
            const alertBox = document.createElement('div');
            alertBox.className = `alert alert-${type}`;
            alertBox.appendChild(document.createTextNode(message));
            document.querySelector('.container').insertBefore(alertBox, document.querySelector('.content'));
            setTimeout(() => alertBox.remove(), 3000);
        }

        displayBoletos();
    };

    request.onerror = (event) => {
        console.error('Database error: ' + event.target.errorCode);
    };
});
