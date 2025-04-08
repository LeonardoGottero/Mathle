// Lógica principal del juego Mathle irá aquí.

document.addEventListener('DOMContentLoaded', () => {
    const gameBoard = document.getElementById('game-board');
    const keyboard = document.getElementById('keyboard');
    const messageContainer = document.getElementById('messages'); // Nuevo elemento de mensajes
    const modeSelect = document.getElementById('mode-select'); // Selector de modo reactivado

    // --- Listas de Ecuaciones Diarias por Dificultad ---
    const equationLists = {
        easy: [
            "1+1=2", "2+3=5", "4-1=3", "5-2=3", "6/3=2", "2*2=4", "3+4=7", "8-3=5",
            // ... añadir más ecuaciones fáciles ...
        ],
        medium: [
            "4*3=12", "1+7=8", "9-2=7", "15/3=5", "2*6=12", "8+5=13", "10-4=6", "21/7=3",
            "3*4=12", "5+6=11", "14-8=6", "18/2=9", "7*2=14", "9+1=10", "11-5=6",
            "20/4=5", "6*3=18", "2+9=11", "16-7=9", "24/8=3",
             // ... añadir más ecuaciones medias ...
        ],
        hard: [
            "12*3=36", "25+17=42", "50-18=32", "100/4=25", "7*8=56", "34+19=53",
             "61-23=38", "99/9=11", "13*5=65", "45+36=81", "72-27=45", "144/12=12",
             // ... añadir más ecuaciones difíciles ...
        ]
    };

     // --- Claves de Almacenamiento Local por Dificultad ---
     const localStorageKeys = {
        easy: 'mathleStateEasy',
        medium: 'mathleStateMedium',
        hard: 'mathleStateHard'
     };

    // --- Configuración del Juego ---
    let currentMode = 'medium'; // Se actualizará en initializeGame
    let TARGET_EQUATION = "";
    let EQUATION_LENGTH = 0;
    const MAX_ATTEMPTS = 6;
    const FLIP_ANIMATION_DELAY = 300;
    const BOUNCE_ANIMATION_DELAY = 100;

    // --- Estado del Juego (se carga/reinicia en initializeGame) ---
    let attempts = [];
    let currentRow = 0;
    let currentTile = 0;
    let isGameOver = false;
    let keyboardColors = {};
    let isProcessing = false;

    // --- Funciones de Fecha y Selección de Ecuación ---
    function getTodaysDateString() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0'); // Meses son 0-indexados
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Obtiene un índice determinista basado en la fecha
    function getIndexForDate(dateString, listLength) { // Ahora necesita la longitud de la lista
        let hash = 0;
        for (let i = 0; i < dateString.length; i++) {
            const char = dateString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        // Asegurarse de que la lista tenga elementos
        return listLength > 0 ? Math.abs(hash) % listLength : 0;
    }

    // --- Gestión del Estado (localStorage) - Usa clave dinámica ---
    function loadGameState(mode) {
        const storageKey = localStorageKeys[mode];
        if (!storageKey) return false; // No intentar cargar si el modo no es válido

        const savedState = localStorage.getItem(storageKey);
        const todaysDate = getTodaysDateString();

        if (savedState) {
            try {
                const state = JSON.parse(savedState);
                if (state.date === todaysDate) {
                    TARGET_EQUATION = state.targetEquation;
                    EQUATION_LENGTH = TARGET_EQUATION.length;
                    attempts = state.attempts;
                    currentRow = state.currentRow;
                    isGameOver = state.isGameOver;
                    keyboardColors = state.keyboardColors || {};
                    console.log(`Estado cargado para modo ${mode} de hoy:`, state);
                    return true;
                } else {
                    console.log(`Estado guardado para modo ${mode} es de fecha anterior.`);
                }
            } catch (e) {
                console.error(`Error al parsear estado guardado para modo ${mode}:`, e);
            }
        }
        return false;
    }

    function saveGameState() {
         const storageKey = localStorageKeys[currentMode]; // Usa el modo actual
         if (!storageKey) return; // No guardar si el modo no es válido

        const state = {
            date: getTodaysDateString(),
            targetEquation: TARGET_EQUATION,
            attempts: attempts,
            currentRow: currentRow,
            isGameOver: isGameOver,
            keyboardColors: keyboardColors
        };
        try {
            localStorage.setItem(storageKey, JSON.stringify(state));
             console.log(`Estado del juego guardado para modo ${currentMode}.`);
        } catch (e) {
            console.error(`Error al guardar estado para modo ${currentMode}:`, e);
        }
    }

    // --- Sistema de Mensajes ---
    function showMessage(text, duration = 2000) {
        messageContainer.innerHTML = ''; // Limpiar mensajes anteriores
        const messageElement = document.createElement('div');
        messageElement.textContent = text;
        messageElement.classList.add('message');
        messageContainer.appendChild(messageElement);

        // Forzar reflow para que la transición funcione
        void messageElement.offsetWidth;

        messageElement.classList.add('show');

        // Ocultar después de la duración
        if (duration) {
            setTimeout(() => {
                messageElement.classList.remove('show');
                // Opcional: eliminar el elemento del DOM después de la transición
                 setTimeout(() => { if (messageContainer.contains(messageElement)) messageContainer.removeChild(messageElement); }, 500); // 500ms = duración de la transición de opacidad
            }, duration);
        }
    }

    // --- Inicialización del Tablero y Juego ---
    function initializeGame() {
        currentMode = modeSelect.value; // Obtener modo seleccionado
        console.log("Inicializando modo:", currentMode);

        const stateLoaded = loadGameState(currentMode);
        const relevantEquationList = equationLists[currentMode];
        const storageKey = localStorageKeys[currentMode];

         if (!relevantEquationList || !storageKey) {
             console.error("Modo seleccionado inválido:", currentMode);
             // Opcional: poner un modo por defecto o mostrar error
             currentMode = 'medium'; // Volver a medio como fallback
             initializeGame(); // Reintentar con el modo por defecto
             return;
         }

        if (!stateLoaded) {
            // Iniciar nuevo juego diario para este modo
            const todaysDate = getTodaysDateString();
            const listLength = relevantEquationList.length;
            const dailyIndex = getIndexForDate(todaysDate, listLength);
            TARGET_EQUATION = listLength > 0 ? relevantEquationList[dailyIndex] : "1+1=2"; // Ecuación por defecto si la lista está vacía

            console.log(`Iniciando nuevo juego para modo ${currentMode}, fecha ${todaysDate}. Ecuación #${dailyIndex}: ${TARGET_EQUATION}`);

            EQUATION_LENGTH = TARGET_EQUATION.length;
            attempts = Array.from({ length: MAX_ATTEMPTS }, () => Array(EQUATION_LENGTH).fill(''));
            currentRow = 0;
            isGameOver = false;
            keyboardColors = {};
            saveGameState(); // Guardar estado inicial para este modo
        }
        else {
            // El estado se cargó, asegurarse de tener la longitud correcta
            EQUATION_LENGTH = TARGET_EQUATION.length;
            console.log(`Continuando juego para modo ${currentMode}, fecha ${getTodaysDateString()}. Ecuación: ${TARGET_EQUATION}`);
        }

        buildBoardUI();
        updateKeyboardUI();

        // Mostrar mensaje si el juego cargado ya estaba terminado
        if (stateLoaded && isGameOver) {
             handleLoadedGameOver();
        } else {
             // Asegurar que el teclado esté habilitado si el juego no ha terminado
             document.querySelectorAll('#keyboard button').forEach(btn => { btn.disabled = false; });
        }
        console.log("Juego listo.");
    }

    // --- Función para manejar mensajes de juego terminado al cargar ---
    function handleLoadedGameOver(){
         const lastGuess = attempts[currentRow > 0 ? currentRow -1 : 0].join('');
         if (lastGuess === TARGET_EQUATION && currentRow > 0) {
             showMessage(`¡Ya resolviste el modo ${currentMode} de hoy!`, null);
             // Aplicar animación de victoria a la última fila llena
             const lastRowTiles = gameBoard.querySelectorAll(`.tile:nth-child(n+${(currentRow-1) * EQUATION_LENGTH + 1}):nth-child(-n+${currentRow * EQUATION_LENGTH})`);
             lastRowTiles.forEach((tile, index) => {
                 tile.classList.add('correct', 'reveal', 'bounce'); // Asegura que se vea correcto y animado
                 tile.style.animationDelay = `${index * BOUNCE_ANIMATION_DELAY}ms`;
             });
         } else if (currentRow >= MAX_ATTEMPTS){
             showMessage(`¡Sin intentos! La ecuación (${currentMode}) era: ${TARGET_EQUATION}`, null);
         }
         // Asegurar que el teclado esté deshabilitado
         document.querySelectorAll('#keyboard button').forEach(btn => { btn.disabled = true; });
    }

    function buildBoardUI() {
        gameBoard.style.gridTemplateColumns = `repeat(${EQUATION_LENGTH}, 1fr)`;
        gameBoard.innerHTML = '';
        messageContainer.innerHTML = '';

        attempts.forEach((attempt, i) => {
            for (let j = 0; j < EQUATION_LENGTH; j++) {
                const tile = document.createElement('div');
                tile.classList.add('tile');
                tile.id = `tile-${i}-${j}`;
                const char = attempt[j];
                if (char) {
                    tile.textContent = char;
                    tile.classList.add('filled'); // Marcar como rellenada
                    // Si estamos reconstruyendo un tablero de un juego cargado,
                    // aplicar colores basados en intentos anteriores YA procesados
                    if (i < currentRow) {
                        // Determinar color (lógica simplificada aquí, idealmente la guardas)
                        const { tileColor } = getTileStatus(char, j, attempts[i].join(''), TARGET_EQUATION);
                         if(tileColor) {
                              tile.classList.add(tileColor, 'reveal'); // Añadir color y estado revelado
                         }
                    }
                }
                gameBoard.appendChild(tile);
            }
        });
         // Establecer la posición correcta para escribir (si el juego no ha terminado)
         currentTile = isGameOver ? 0 : attempts[currentRow].findIndex(c => c === '');
         if (currentTile === -1 && !isGameOver) currentTile = EQUATION_LENGTH; // Si la fila actual está llena
         else if (currentTile === -1 && isGameOver) currentTile = 0;
    }

    // Función auxiliar para determinar estado de una celda (reutilizada para reconstrucción)
    function getTileStatus(char, index, guess, target) {
        const targetChars = target.split('');
        const guessChars = guess.split('');
        let tileColor = 'absent';
        let keyColor = 'absent';

        // Contar target para manejar duplicados correctamente al determinar 'present'
        const targetCharCounts = {};
        targetChars.forEach(c => { targetCharCounts[c] = (targetCharCounts[c] || 0) + 1; });

        // Marcar correctos primero
        guessChars.forEach((gChar, gIndex) => {
            if (gChar === targetChars[gIndex]) {
                if(gIndex === index && gChar === char) tileColor = 'correct';
                 if(gChar === char) keyColor = 'correct'; // Prioridad para tecla
                 targetCharCounts[gChar]--;
            }
        });

        // Marcar presentes (solo si no fue 'correct')
        if (tileColor !== 'correct' && keyColor !== 'correct'){
             guessChars.forEach((gChar, gIndex) => {
                 // Saltar si ya es correcto o no es el tile/char actual
                if(gChar === targetChars[gIndex]) return;

                 if (targetChars.includes(gChar) && targetCharCounts[gChar] > 0) {
                      if (gIndex === index && gChar === char) tileColor = 'present';
                      if (gChar === char) keyColor = 'present';
                      targetCharCounts[gChar]--;
                 }
             });
        }
        // Si la tecla ya era verde, mantenerla verde
         if(keyboardColors[char] === 'correct') keyColor = 'correct';
         // Si era amarilla y el nuevo estado no es verde, mantener amarilla
         else if(keyboardColors[char] === 'present' && keyColor !== 'correct') keyColor = 'present';

        return { tileColor, keyColor };
    }

    function updateKeyboardUI() {
        document.querySelectorAll('#keyboard button[data-key]').forEach(btn => {
            const key = btn.dataset.key;
            btn.classList.remove('correct', 'present', 'absent'); // Limpiar clases previas
            if (keyboardColors[key]) {
                btn.classList.add(keyboardColors[key]);
            }
             btn.disabled = isGameOver; // Deshabilitar si el juego terminó
        });
    }

    // --- Manejo de Entrada ---
    function handleKeyPress(key) {
        if (isGameOver || isProcessing) return;

        if (key === 'ENTER') {
            if (currentTile === EQUATION_LENGTH) {
                processAttempt();
            } else {
                shakeRow();
                showMessage("Ecuación incompleta");
            }
        } else if (key === 'BACKSPACE') {
            deleteChar();
        } else if (currentTile < EQUATION_LENGTH && isValidKey(key)) {
            addChar(key);
        }
    }

    function isValidKey(key) {
        return /^[0-9+\-*/=]$/.test(key);
    }

    function addChar(char) {
        if (currentTile < EQUATION_LENGTH && currentRow < MAX_ATTEMPTS) {
            const tileElement = document.getElementById(`tile-${currentRow}-${currentTile}`);
            tileElement.textContent = char;
            tileElement.classList.add('filled');
            attempts[currentRow][currentTile] = char;
            currentTile++;
            tileElement.style.transform = 'scale(1.1)';
            setTimeout(() => { tileElement.style.transform = 'scale(1)'; }, 50);
        }
    }

    function deleteChar() {
        if (currentTile > 0) {
            currentTile--;
            const tileElement = document.getElementById(`tile-${currentRow}-${currentTile}`);
            tileElement.textContent = '';
            tileElement.classList.remove('filled');
            attempts[currentRow][currentTile] = '';
        }
    }

    // --- Animación Shake ---
    function shakeRow() {
        const rowTiles = getCurrentRowTiles();
        rowTiles.forEach(tile => tile.classList.add('shake'));
        setTimeout(() => {
            rowTiles.forEach(tile => tile.classList.remove('shake'));
        }, 600);
    }

    function getCurrentRowTiles() {
         return gameBoard.querySelectorAll(`.tile:nth-child(n+${currentRow * EQUATION_LENGTH + 1}):nth-child(-n+${(currentRow + 1) * EQUATION_LENGTH})`);
    }

    // --- Procesar Intento ---
    async function processAttempt() {
        const currentGuess = attempts[currentRow].join('');
        isProcessing = true;

        if (!currentGuess.includes('=')) {
            shakeRow();
            showMessage('La ecuación debe contener un signo =');
            isProcessing = false;
            return;
        }

        // Validación matemática (opcional pero recomendada)
        /* try {
             const parts = currentGuess.split('=');
             if (parts.length !== 2 || parts[0] === '' || parts[1] === '') throw new Error();
             // ¡CUIDADO CON EVAL! Alternativa: usar una librería como math.js
             if (Math.abs(eval(parts[0]) - eval(parts[1])) > 1e-9) { // Comparar con tolerancia por decimales
                shakeRow();
                showMessage('La ecuación no es matemáticamente correcta.');
                isProcessing = false;
                return;
             }
        } catch (e) {
            shakeRow();
            showMessage('Ecuación inválida.');
            isProcessing = false;
            return;
        } */

        await flipTiles(currentGuess);

        // Actualizar estado del teclado DESPUÉS de flipTiles
        updateKeyboardUI();

        // Guardar estado DESPUÉS de procesar el intento y actualizar colores teclado
         saveGameState();

        if (currentGuess === TARGET_EQUATION) {
            winGame();
            return;
        }

        currentRow++;
        currentTile = 0;

        if (currentRow >= MAX_ATTEMPTS) {
            loseGame();
        } else {
            isProcessing = false;
        }
    }

    function winGame() {
        showMessage('¡Correcto! ¡Has ganado!', null);
        bounceRow();
        isGameOver = true;
        isProcessing = false;
        document.querySelectorAll('#keyboard button').forEach(btn => { btn.disabled = true; });
        saveGameState(); // Guardar estado final
    }

    function loseGame() {
        showMessage(`¡Sin intentos! La ecuación era: ${TARGET_EQUATION}`, null);
        isGameOver = true;
        isProcessing = false;
        document.querySelectorAll('#keyboard button').forEach(btn => { btn.disabled = true; });
        saveGameState(); // Guardar estado final
    }

     // --- Animación Bounce (Victoria) ---
    function bounceRow() {
        const rowTiles = getCurrentRowTiles();
        rowTiles.forEach((tile, index) => {
            setTimeout(() => {
                tile.classList.add('bounce');
                 tile.style.animationDelay = `${index * BOUNCE_ANIMATION_DELAY}ms`; // Aplicar delay directo
            }, index * BOUNCE_ANIMATION_DELAY);
        });
    }

    // --- Actualizar UI (Flip y Colores) ---
    function flipTiles(guess) {
        return new Promise(resolve => {
            const targetChars = TARGET_EQUATION.split('');
            const guessChars = guess.split('');
            const rowTiles = getCurrentRowTiles();

            const targetCharCounts = {};
            targetChars.forEach(char => { targetCharCounts[char] = (targetCharCounts[char] || 0) + 1; });

            const tileResults = Array(EQUATION_LENGTH).fill(null);
            const keyUpdates = {}; // Almacenar actualizaciones para el teclado

            // Primera pasada: Determinar 'correct'
            guessChars.forEach((char, index) => {
                if (char === targetChars[index]) {
                    tileResults[index] = 'correct';
                    keyUpdates[char] = 'correct'; // Verde tiene prioridad
                    targetCharCounts[char]--;
                }
            });

            // Segunda pasada: Determinar 'present' y 'absent'
            guessChars.forEach((char, index) => {
                if (tileResults[index] === null) { // Solo si no fue 'correct'
                    if (targetChars.includes(char) && targetCharCounts[char] > 0) {
                        tileResults[index] = 'present';
                        // Solo actualizar tecla a presente si no es ya correcta
                        if (keyUpdates[char] !== 'correct') {
                            keyUpdates[char] = 'present';
                        }
                        targetCharCounts[char]--;
                    } else {
                        tileResults[index] = 'absent';
                         // Solo actualizar tecla a ausente si no es correcta ni presente
                         if (keyUpdates[char] !== 'correct' && keyUpdates[char] !== 'present') {
                             keyUpdates[char] = 'absent';
                         }
                    }
                }
            });

            // Aplicar clases y animaciones con delay
            rowTiles.forEach((tile, index) => {
                setTimeout(() => {
                    const status = tileResults[index];
                    if (status) {
                         tile.classList.add(status);
                         tile.classList.add('reveal');
                         // Actualizar estado global del teclado
                         const char = guessChars[index];
                         updateKeyboardButtonState(char, status);
                    }
                }, index * FLIP_ANIMATION_DELAY);
            });

            const totalAnimationDuration = (EQUATION_LENGTH - 1) * FLIP_ANIMATION_DELAY + 600;
            setTimeout(resolve, totalAnimationDuration);
        });
    }

    // Helper para actualizar el estado global keyboardColors (prioriza verde > amarillo > gris)
    function updateKeyboardButtonState(key, status) {
        if (!key) return;
        const currentStatus = keyboardColors[key];
        if (status === 'correct') {
            keyboardColors[key] = 'correct';
        } else if (status === 'present' && currentStatus !== 'correct') {
            keyboardColors[key] = 'present';
        } else if (status === 'absent' && currentStatus !== 'correct' && currentStatus !== 'present') {
            keyboardColors[key] = 'absent';
        }
    }

    // --- Event Listeners ---
    keyboard.addEventListener('click', (event) => {
        if (event.target.tagName === 'BUTTON' && !event.target.disabled) {
            const key = event.target.dataset.key;
            if (key) handleKeyPress(key);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (isProcessing) return; // Ignorar teclado físico durante procesamiento
        let key = event.key;
        if (key === 'Enter') {
            key = 'ENTER';
        } else if (key === 'Backspace') {
            key = 'BACKSPACE';
        } else if (!isValidKey(key) || event.ctrlKey || event.altKey || event.metaKey) {
             // Ignorar teclas no válidas y modificadores
             return;
        }

        handleKeyPress(key);
        event.preventDefault(); // Prevenir comportamiento por defecto si es una tecla válida del juego
    });

    modeSelect.addEventListener('change', initializeGame); // Reactivado y funcional para cambiar modo diario

    // --- Iniciar Juego --- Llama a initializeGame al cargar la página
    initializeGame();

    // Aquí iría la lógica para:
    // 1. Generar la ecuación diaria
    // 2. Manejar la entrada del usuario (teclado físico o virtual)
    // 3. Validar la ecuación introducida
    // 4. Comparar con la solución y actualizar los colores de las celdas (.correct, .present, .absent)
    // 5. Controlar el número de intentos
    // 6. Mostrar mensajes de victoria o derrota
    // 7. Integración con AdSense, banners y donaciones (puede requerir JS adicional o configuraciones del lado del servidor)
}); 