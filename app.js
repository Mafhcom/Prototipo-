// app.js

document.addEventListener('DOMContentLoaded', () => {
    // --- REGISTRO DEL SERVICE WORKER para OFFLINE (PWA) ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // CORRECCIÓN CRUCIAL PARA AMBIENTES COMO GITHUB PAGES:
            // Se cambió de '/sw.js' (ruta absoluta que fallaba) a './sw.js' (ruta relativa).
            navigator.serviceWorker.register('./sw.js') 
                .then(registration => {
                    console.log('Service Worker registrado con éxito:', registration.scope);
                })
                .catch(err => {
                    console.error('Fallo en el registro del Service Worker:', err);
                });
        });
    }

    // --- DOM ---
    const btnGestion = document.getElementById('btnGestion');
    const btnRegistro = document.getElementById('btnRegistro');
    const vistaGestion = document.getElementById('vistaGestion');
    const vistaRegistro = document.getElementById('vistaRegistro');

    const clienteForm = document.getElementById('clienteForm');
    const listaClientes = document.getElementById('listaClientes');
    const tipoRecipienteForm = document.getElementById('tipoRecipienteForm');
    const listaTiposRecipientes = document.getElementById('listaTiposRecipientes');
    const colorForm = document.getElementById('colorForm');
    const listaColores = document.getElementById('listaColores');

    const registroForm = document.getElementById('registroForm');
    const clienteSelect = document.getElementById('clienteSelect');
    const tipoRecipienteSelect = document.getElementById('tipoRecipienteSelect');
    const colorSelectorDiv = document.getElementById('colorRecipienteDiv');
    const listaRecipientes = document.getElementById('listaRecipientes');
    const fechaActualSpan = document.getElementById('fechaActual');

    const btnGuardarBackup = document.getElementById('guardarBackup');
    const btnRestaurarBackup = document.getElementById('restaurarBackup'); 
    
    const inputRestaurarBackup = document.getElementById('inputRestaurarBackup'); 

    let colorSeleccionado = null;

    // --- Fecha ---
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];
    fechaActualSpan.textContent = today.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });

    // --- Storage Handler (Utilizando las CLAVES ORIGINALES del usuario) ---
    const storage = {
        get(key) {
            return JSON.parse(localStorage.getItem(key)) || [];
        },
        save(key, data) {
            localStorage.setItem(key, JSON.stringify(data));
        },
        // CLAVES ORIGINALES del usuario:
        getClientes: () => storage.get('clientesRegistrados'),
        saveClientes: (data) => storage.save('clientesRegistrados', data),
        getTipos: () => storage.get('tiposRecipientes'),
        saveTipos: (data) => storage.save('tiposRecipientes', data),
        getColores: () => storage.get('coloresRegistrados'),
        saveColores: (data) => storage.save('coloresRegistrados', data),
        getRecipientes: () => storage.get('registrosRecipientes'),
        saveRecipientes: (data) => storage.save('registrosRecipientes', data),
    };

    // SECCIÓN DE DATOS INICIALES (initialData) ELIMINADA.

    /**
     * Función que carga los datos iniciales si LocalStorage está vacío
     * y migra datos antiguos si los encuentra.
     */
    function initialLoadData() {
        // --- Migración de datos (si existen) ---
        let migrated = false;
        const keysToMigrate = {
            'clientesRegistrados': 'nombre',
            'tiposRecipientes': 'nombre',
            'coloresRegistrados': 'nombre'
        };

        for (const key in keysToMigrate) {
            let data = JSON.parse(localStorage.getItem(key));
            
            if (data && Array.isArray(data) && data.length > 0) {
                // Caso 1: Array de strings (Clientes/Tipos - Formato Antiguo)
                if (typeof data[0] === 'string') {
                    console.warn(`[MIGRACIÓN] Convirtiendo ${key}: de string[] a object[].`);
                    const newData = data.map(name => ({
                        nombre: name,
                        id: Date.now() + Math.floor(Math.random() * 1000)
                    }));
                    localStorage.setItem(key, JSON.stringify(newData));
                    migrated = true;
                } 
                // Caso 2: Array de objetos con clave 'valor' en lugar de 'hex' (Colores)
                else if (key === 'coloresRegistrados' && data[0] && data[0].valor && !data[0].hex) {
                    console.warn(`[MIGRACIÓN] Renombrando clave 'valor' a 'hex' en colores.`);
                    const newData = data.map(color => ({
                        nombre: color.nombre,
                        hex: color.valor, // Renombrar 'valor' a 'hex'
                        id: color.id || Date.now() + Math.floor(Math.random() * 1000)
                    }));
                    localStorage.setItem(key, JSON.stringify(newData));
                    migrated = true;
                }
            }
        }
        
        // --- Carga de datos iniciales (Si LocalStorage sigue vacío) ---
        // LÓGICA DE CARGA DE DATOS PREDETERMINADOS ELIMINADA.
        if (storage.getClientes().length === 0 && !migrated) {
            console.log('[INICIO] LocalStorage vacío. No se cargaron datos predeterminados.');
            // Opcional: Mostrar un mensaje diferente al usuario si el localStorage está vacío al inicio.
            // alert('No hay datos. Comience agregando Clientes, Tipos y Colores en la pestaña "Gestión"'); 
        }
    }

    // Ejecutar la carga y migración
    initialLoadData(); 


    // --- Vistas ---
    function switchVista(vistaId) {
        document.querySelectorAll('.vista-content').forEach(vista => {
            vista.classList.remove('active-vista');
        });
        document.getElementById(vistaId).classList.add('active-vista');

        document.querySelectorAll('nav button').forEach(button => {
            button.classList.remove('active');
        });
        document.getElementById(vistaId === 'vistaGestion' ? 'btnGestion' : 'btnRegistro').classList.add('active');

        if (vistaId === 'vistaRegistro') {
            renderSelectores();
            renderRecipientes();
        }
    }

    btnGestion.addEventListener('click', () => switchVista('vistaGestion'));
    btnRegistro.addEventListener('click', () => switchVista('vistaRegistro'));

    // --- RENDERIZADO y CRUD de Clientes/Tipos/Colores (USANDO OBJETOS CON ID) ---
    
    function renderClientes() {
        const clientes = storage.getClientes();
        // APLICAR ORDENAMIENTO ALFABÉTICO
        clientes.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

        listaClientes.innerHTML = '';
        if (clientes.length === 0) {
            listaClientes.innerHTML = '<p class="info-msg">No hay clientes registrados.</p>';
            return;
        }
        clientes.forEach((cliente) => { 
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${cliente.nombre}</span>
                <div class="acciones-li">
                    <button class="editar-cliente-btn" data-id="${cliente.id}">✏️ Editar</button>
                    <button class="eliminar-cliente-btn" data-id="${cliente.id}">❌ Eliminar</button>
                </div>
            `;
            listaClientes.appendChild(li);
        });
        renderSelectores();
    }

    clienteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('nuevoCliente');
        const nombre = input.value.trim();
        if (nombre) {
            let clientes = storage.getClientes();
            if(clientes.some(c => c.nombre.toLowerCase() === nombre.toLowerCase())){
                alert('El cliente ya está registrado.');
                return;
            }
            clientes.push({ nombre, id: Date.now() });
            storage.saveClientes(clientes);
            input.value = '';
            renderClientes();
            preguntarBackup();
        }
    });

    listaClientes.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        if (!id) return;
        
        let clientes = storage.getClientes();
        const clienteIndex = clientes.findIndex(c => c.id == id);
        
        if (e.target.classList.contains('eliminar-cliente-btn')) {
            if (confirm('¿Está seguro de eliminar este cliente? Esto podría afectar registros existentes.')) {
                clientes.splice(clienteIndex, 1);
                storage.saveClientes(clientes);
                renderClientes();
                preguntarBackup();
            }
        } else if (e.target.classList.contains('editar-cliente-btn')) {
            const cliente = clientes[clienteIndex];
            const nuevoNombre = prompt('Editar nombre del cliente:', cliente.nombre);
            if (nuevoNombre && nuevoNombre.trim()) {
                clientes[clienteIndex].nombre = nuevoNombre.trim();
                storage.saveClientes(clientes);
                renderClientes();
                preguntarBackup();
            }
        }
    });
    
    // --- Tipos de Recipientes ---

    function renderTipos() {
        const tipos = storage.getTipos();
        // APLICAR ORDENAMIENTO ALFABÉTICO
        tipos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

        listaTiposRecipientes.innerHTML = '';
        if (tipos.length === 0) {
            listaTiposRecipientes.innerHTML = '<p class="info-msg">No hay tipos de recipientes registrados.</p>';
            return;
        }
        tipos.forEach((tipo) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${tipo.nombre}</span>
                <div class="acciones-li">
                    <button class="editar-tipo-btn" data-id="${tipo.id}">✏️ Editar</button>
                    <button class="eliminar-tipo-btn" data-id="${tipo.id}">❌ Eliminar</button>
                </div>
            `;
            listaTiposRecipientes.appendChild(li);
        });
        renderSelectores();
    }

    tipoRecipienteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('nuevoTipoRecipiente');
        const nombre = input.value.trim();
        if (nombre) {
            let tipos = storage.getTipos();
            if(tipos.some(t => t.nombre.toLowerCase() === nombre.toLowerCase())){
                alert('El tipo de recipiente ya está registrado.');
                return;
            }
            tipos.push({ nombre, id: Date.now() });
            storage.saveTipos(tipos);
            input.value = '';
            renderTipos();
            preguntarBackup();
        }
    });

    listaTiposRecipientes.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        if (!id) return;

        let tipos = storage.getTipos();
        const tipoIndex = tipos.findIndex(t => t.id == id);

        if (e.target.classList.contains('eliminar-tipo-btn')) {
             if (confirm('¿Está seguro de eliminar este tipo de recipiente? Esto podría afectar registros existentes.')) {
                tipos.splice(tipoIndex, 1);
                storage.saveTipos(tipos);
                renderTipos();
                preguntarBackup();
            }
        } else if (e.target.classList.contains('editar-tipo-btn')) {
            const tipo = tipos[tipoIndex];
            const nuevoNombre = prompt('Editar nombre del tipo de recipiente:', tipo.nombre);
            if (nuevoNombre && nuevoNombre.trim()) {
                tipos[tipoIndex].nombre = nuevoNombre.trim();
                storage.saveTipos(tipos);
                renderTipos();
                preguntarBackup();
            }
        }
    });

    // --- Colores ---

    function renderColores() {
        const colores = storage.getColores();
        // APLICAR ORDENAMIENTO ALFABÉTICO
        colores.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
        
        listaColores.innerHTML = '';
        if (colores.length === 0) {
            listaColores.innerHTML = '<p class="info-msg">No hay colores registrados.</p>';
            return;
        }
        colores.forEach((color) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div class="color-rect-peque" style="background-color: ${color.hex};"></div>
                <div class="color-nombre">${color.nombre} (${color.hex})</div>
                <div class="acciones-li">
                    <button class="editar-color-btn" data-id="${color.id}">✏️ Editar</button>
                    <button class="eliminar-color-btn" data-id="${color.id}">❌ Eliminar</button>
                </div>
            `;
            listaColores.appendChild(li);
        });
        renderSelectores();
    }

    colorForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const nombreInput = document.getElementById('nuevoColorNombre'); 
        const hexInput = document.getElementById('nuevoColorValor');

        const nombre = nombreInput.value.trim();
        const hex = hexInput.value.trim().toUpperCase();

        if (nombre && hex) {
            let colores = storage.getColores();
            if(colores.some(c => c.nombre.toLowerCase() === nombre.toLowerCase())){
                 alert('El color ya está registrado.');
                 return;
            }
            colores.push({ nombre, hex, id: Date.now() });
            storage.saveColores(colores);
            nombreInput.value = '';
            hexInput.value = '#000000'; 
            renderColores();
            preguntarBackup();
        }
    });
    
    listaColores.addEventListener('click', (e) => {
        const id = e.target.dataset.id;
        if (!id) return;
        
        let colores = storage.getColores();
        const colorIndex = colores.findIndex(c => c.id == id);
        
        if (e.target.classList.contains('eliminar-color-btn')) {
            if (confirm('¿Está seguro de eliminar este color? Esto podría afectar registros existentes.')) {
                colores.splice(colorIndex, 1);
                storage.saveColores(colores);
                renderColores();
                preguntarBackup();
            }
        } else if (e.target.classList.contains('editar-color-btn')) {
            const color = colores[colorIndex];
            const nuevoNombre = prompt('Editar nombre del color:', color.nombre);
            const nuevoHex = prompt('Editar código HEX del color:', color.hex);

            if (nuevoNombre && nuevoNombre.trim() && nuevoHex && nuevoHex.trim()) {
                colores[colorIndex].nombre = nuevoNombre.trim();
                colores[colorIndex].hex = nuevoHex.trim().toUpperCase();
                storage.saveColores(colores);
                renderColores();
                preguntarBackup();
            }
        }
    });


    // --- Registro de Recipientes y Selectores ---
    function renderSelectores() {
        // Fetching and sorting directly for the selectors
        const clientes = storage.getClientes().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
        const tipos = storage.getTipos().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
        const colores = storage.getColores().sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));


        // 1. Selector de Clientes
        clienteSelect.innerHTML = '<option value="" disabled selected>-- Seleccione un Cliente --</option>';
        clientes.forEach(cliente => {
            const option = document.createElement('option');
            option.value = cliente.id;
            option.textContent = cliente.nombre;
            clienteSelect.appendChild(option);
        });

        // 2. Selector de Tipos
        tipoRecipienteSelect.innerHTML = '<option value="" disabled selected>-- Seleccione un Tipo --</option>';
        tipos.forEach(tipo => {
            const option = document.createElement('option');
            option.value = tipo.id;
            option.textContent = tipo.nombre;
            tipoRecipienteSelect.appendChild(option);
        });

        // 3. Selector de Colores (Círculos)
        colorSelectorDiv.innerHTML = '';
        colorSeleccionado = null; 
        colores.forEach(color => {
            const btn = document.createElement('div');
            btn.className = 'color-circle-selector';
            btn.title = color.nombre;
            btn.style.backgroundColor = color.hex;
            
            btn.addEventListener('click', () => {
                colorSeleccionado = { id: color.id, nombre: color.nombre, hex: color.hex };
                document.querySelectorAll('.color-circle-selector').forEach(d => d.classList.remove('selected'));
                btn.classList.add('selected');
            });
            colorSelectorDiv.appendChild(btn);
        });
    }

    registroForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const clienteId = clienteSelect.value;
        const tipoId = tipoRecipienteSelect.value;

        if (!clienteId || !tipoId || !colorSeleccionado) {
            alert('Por favor, complete todos los campos (Cliente, Tipo y Color).');
            return;
        }

        const clientes = storage.getClientes();
        const tipos = storage.getTipos();
        
        const cliente = clientes.find(c => c.id == clienteId);
        const tipo = tipos.find(t => t.id == tipoId);

        const nuevoRecipiente = {
            id: Date.now().toString(),
            cliente: cliente ? cliente.nombre : 'Cliente Desconocido',
            tipo: tipo ? tipo.nombre : 'Tipo Desconocido',
            color: colorSeleccionado.nombre,
            valorColor: colorSeleccionado.hex, 
            fecha: todayISO
        };

        let recipientes = storage.getRecipientes();
        recipientes.push(nuevoRecipiente);
        storage.saveRecipientes(recipientes);

        alert('Recipiente registrado con éxito. Pendiente de devolución.');
        registroForm.reset();
        document.querySelectorAll('.color-circle-selector').forEach(d => d.classList.remove('selected'));
        colorSeleccionado = null; 
        renderRecipientes();
        preguntarBackup();
    });

    function renderRecipientes() {
        const recipientes = storage.getRecipientes();
        listaRecipientes.innerHTML = '';

        if (recipientes.length === 0) {
            listaRecipientes.innerHTML = '<p class="info-msg">No hay recipientes pendientes de devolución.</p>';
            return;
        }

        // Los registros se siguen mostrando de forma inversa (más reciente primero)
        recipientes.slice().reverse().forEach((r) => {
            const li = document.createElement('li');
            li.className = 'recipiente-item';
            
            const fechaFormateada = new Date(r.fecha + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
            
            li.innerHTML = `
                <div class="registro-info">
                    <p><strong>Cliente:</strong> ${r.cliente}</p>
                    <p><strong>Tipo:</strong> ${r.tipo}</p>
                    <p class="color-pendiente">
                        <span class="color-circle" style="background-color:${r.valorColor}"></span>
                        ${r.color}
                    </p>
                    <p class="fecha">Fecha de entrada: ${fechaFormateada}</p>
                </div>
                <button class="eliminar-btn" data-id="${r.id}">✅ Entregado (Eliminar)</button>
            `;
            listaRecipientes.appendChild(li);
        });
    }

    listaRecipientes.addEventListener('click', (e) => {
        if (e.target.classList.contains('eliminar-btn')) {
            const id = e.target.dataset.id;
             if (confirm('Marcar como entregado y eliminar el registro de este recipiente?')) {
                let recipientes = storage.getRecipientes();
                recipientes = recipientes.filter(r => r.id !== id);
                storage.saveRecipientes(recipientes);
                renderRecipientes();
                preguntarBackup();
            }
        }
    });

    // --- FUNCIONALIDAD DE BACKUP -----------------------------
    
    function cargarDatos(data) {
        // Usando las claves originales del usuario
        storage.saveClientes(data.clientes || []);
        storage.saveTipos(data.tipos || []);
        storage.saveColores(data.colores || []);
        storage.saveRecipientes(data.recipientes || []);

        renderClientes();
        renderTipos();
        renderColores();
        renderSelectores();
        renderRecipientes();

        alert('Datos restaurados ✅');
    }
    
    function preguntarBackup(){
        if(confirm('¿Desea guardar una copia de seguridad de los datos?')){
            guardarBackup();
        }
    }


    // --- Guardar Backup (con descarga) ---
    function guardarBackup(){
        const data = {
            clientes: storage.getClientes(),
            tipos: storage.getTipos(),
            colores: storage.getColores(),
            recipientes: storage.getRecipientes(),
            metadata: {
                fecha: new Date().toISOString(),
                version: '1.4' // Nueva versión
            }
        };

        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_recipientes_${todayISO}.json`;
        a.click();
        URL.revokeObjectURL(url);

        // Guardar también en localStorage como backup interno
        localStorage.setItem('backupAppRecipientes', dataStr);

        alert('Copia de seguridad descargada y guardada internamente ✅');
    }

    // --- Restaurar solo desde copia interna ---
    function restaurarDesdeInterno(){
        const dataStr = localStorage.getItem('backupAppRecipientes');
        if(!dataStr){
            alert('No hay copia de seguridad INTERNA disponible. Intente restaurar desde un archivo.');
            return;
        }
        const data = JSON.parse(dataStr);
        if(confirm('Restaurar desde COPIA INTERNA: Esta acción reemplazará los datos actuales. ¿Desea continuar?')){
            cargarDatos(data);
        }
    }

    // --- Listener para manejar la carga de archivo (si el input existe) ---
    if(inputRestaurarBackup) {
        inputRestaurarBackup.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const data = JSON.parse(event.target.result);
                    // Verificación de claves originales
                    if(data.clientes && data.tipos && data.colores) {
                         if(confirm('Restaurar desde ARCHIVO: Esta acción reemplazará los datos actuales. ¿Desea continuar?')) {
                            cargarDatos(data);
                        }
                    } else {
                        alert('Error: El archivo JSON no parece ser una copia de seguridad válida.');
                    }
                   
                } catch (error) {
                    console.error("Error de parsing/lectura:", error);
                    alert('Error al leer el archivo JSON.');
                }
                e.target.value = null;
            };
            reader.readAsText(file);
        });
    }

    // --- Botones Backup (Lógica unificada para Restaurar) ---
    btnGuardarBackup.addEventListener('click', guardarBackup);
    
    btnRestaurarBackup.addEventListener('click', () => {
        if (inputRestaurarBackup) { 
             const choice = prompt('¿Cómo desea restaurar los datos?\n\n1: Restaurar desde copia INTERNA (último guardado)\n2: Restaurar desde archivo JSON descargado\n\nIngrese 1 o 2:');

            if (choice === '1') {
                restaurarDesdeInterno();
            } else if (choice === '2') {
                inputRestaurarBackup.click(); 
            } else if (choice) {
                alert('Opción no válida. Por favor, ingrese 1 o 2.');
            }
        } else {
            restaurarDesdeInterno();
        }
    });


    // --- Inicialización ---
    renderClientes();
    renderTipos();
    renderColores();
    switchVista('vistaGestion'); 
});
