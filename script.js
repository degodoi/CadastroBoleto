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
            const parcelas = calcularParcelas(vencimento, quantidade);
            const descricao = `Parcela ${nome}`;
            const boleto = { descricao, valor, vencimento, quantidade, parcelas, valorTotal };

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
                parcelas.push(novaData.toISOString().split('T')[0]);
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
                            ${boleto.parcelas.map((parcela, index) => `<span>Parcela ${index + 1}: ${parcela}</span>`).join('')}
                        </div>
                        <div class="total">
                        Valor Total: R$${boleto.valorTotal.toFixed(2)}
                    </div>
                    <button onclick="removeBoleto(${boleto.id})">Remover</button>
                `;
                boletoList.appendChild(li);
            });
        };
    }

    window.removeBoleto = (id) => {
        const transaction = db.transaction(['boletos'], 'readwrite');
        const store = transaction.objectStore('boletos');
        store.delete(id);

        transaction.oncomplete = () => {
            displayBoletos();
        };
    };

    function checkVencimentos() {
        const transaction = db.transaction(['boletos'], 'readonly');
        const store = transaction.objectStore('boletos');
        const request = store.getAll();
        const today = new Date().toISOString().split('T')[0];

        request.onsuccess = () => {
            request.result.forEach((boleto) => {
                boleto.parcelas.forEach((parcela) => {
                    if (parcela === today) {
                        notifyUser(boleto.descricao);
                    }
                });
            });
        };
    }

    function notifyUser(descricao) {
        if (Notification.permission === 'granted') {
            new Notification('Lembrete de Boleto', {
                body: `O boleto ${descricao} vence hoje!`,
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then((permission) => {
                if (permission === 'granted') {
                    new Notification('Lembrete de Boleto', {
                        body: `O boleto ${descricao} vence hoje!`,
                    });
                }
            });
        }
    }

    displayBoletos();
    checkVencimentos();
    setInterval(checkVencimentos, 86400000); // Check daily
};

request.onerror = (event) => {
    console.error('Database error: ' + event.target.errorCode);
};
});
