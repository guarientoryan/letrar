var height = 6; //número de palpites
var width = 6; //tamanho da palavra

var row = 0; //palpite atual ( tentativa #)
var col = 0; //letra atual para essa tentativa

var gameOver = false;
var won = false; // se o jogador acertou a palavra
var dayNumber = null; // número do dia do jogo, usado no texto de compartilhamento
var results = []; // uma string de emojis (🟩🟨⬛) por tentativa já feita

function getWordOfTheDay(wordList) {
  const epoch = new Date(2024, 0, 1); // dia 0 do seu jogo - pode ser qualquer data fixa
  const now = new Date();

  // zera horas pra não dar problema com fuso/horário
  const startOfEpoch = new Date(
    epoch.getFullYear(),
    epoch.getMonth(),
    epoch.getDate(),
  );
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );

  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSinceEpoch = Math.floor((startOfToday - startOfEpoch) / msPerDay);

  dayNumber = daysSinceEpoch + 1; // dia 1, 2, 3...

  const index = daysSinceEpoch % wordList.length;
  return wordList[index].toUpperCase();
}

var word = getWordOfTheDay(wordList);

console.log(word);

var validGuesses = {}; //normaliza (sem acento) cada palavra do wordList pra validar o input
wordList.concat(extraGuesses).forEach(function (w) {
  let norm = w
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  validGuesses[norm] = w;
});

window.onload = function () {
  intialize();
};

function intialize() {
  //Crie o quadro do jogo
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      let tile = document.createElement("span");
      tile.id = r.toString() + "-" + c.toString();
      tile.classList.add("tile");
      tile.innerText = "";
      document.getElementById("board").appendChild(tile);
    }
  }

  // Crie o teclado
  let keyboard = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Enter", "Z", "X", "C", "V", "B", "N", "M", "⌫"],
  ];

  let keyboardContainer = document.createElement("div"); 
  keyboardContainer.id = "keyboard-container";          

  for (let i = 0; i < keyboard.length; i++) {
    let currRow = keyboard[i];
    let keyboardRow = document.createElement("div");
    keyboardRow.classList.add("keyboard-row");

    for (let j = 0; j < currRow.length; j++) {
      let keyTile = document.createElement("div");

      let key = currRow[j]; 
      keyTile.innerText = key;
      if (key == "Enter") {
        keyTile.id = "Enter";
      } else if (key == "⌫") {
        keyTile.id = "Backspace";
      } else if ("A" <= key && key <= "Z") {
        keyTile.id = "Key" + key; //"Key" + "A"
      }

      keyTile.addEventListener("click", processKey);

      if (key == "Enter") {
        keyTile.classList.add("enter-key-tile");
      } else {
        keyTile.classList.add("key-tile");
      }
      keyboardRow.appendChild(keyTile);
    }
    keyboardContainer.appendChild(keyboardRow);
  }

   document.body.appendChild(keyboardContainer);

  // Captura de Tecla
  document.addEventListener("keydown", (e) => {
    processInput(e);
  });

  // Botão de compartilhar (fica escondido até o jogo acabar)
  let shareContainer = document.createElement("div");
  shareContainer.id = "share-container";

  let shareButton = document.createElement("button");
  shareButton.id = "share-button";
  shareButton.innerText = "Compartilhar resultado";
  shareButton.addEventListener("click", shareResult);

  shareContainer.appendChild(shareButton);
  document.body.appendChild(shareContainer);

  // Restaura o progresso salvo (se for do mesmo dia)
  loadState();
}
function processKey() {
  let e = { code: this.id };
  processInput(e);
}

function processInput(e) {
  if (gameOver) return;

  // Anti-spam de tecla
  if (e.repeat) return;

  // alert(e.code);
  if ("KeyA" <= e.code && e.code <= "KeyZ") {
    if (col < width) {
      let currTile = document.getElementById(
        row.toString() + "-" + col.toString(),
      );
      if (currTile.innerText == "") {
        currTile.innerText = e.code[3];
        col += 1;
      }
    }
  } else if (e.code == "Backspace") {
    if (0 < col && col <= width) {
      col -= 1;
    }
    let currTile = document.getElementById(
      row.toString() + "-" + col.toString(),
    );
    currTile.innerText = "";
  } else if (e.code == "Enter") {
    update();
  }

  if (!gameOver && row == height) {
    gameOver = true;
    document.getElementById("answer").innerText = word;
    endGame();
  }

  saveState();
}

function update() {
  let guess = "";
  document.getElementById("answer").innerText = "";

  //string up the guesses into the word
  for (let c = 0; c < width; c++) {
    let currTile = document.getElementById(row.toString() + "-" + c.toString());
    let letter = currTile.innerText;
    guess += letter;
  }

  guess = guess.toLowerCase(); //case sensitive
  console.log(guess);

  if (!(guess in validGuesses)) {
    document.getElementById("answer").innerText = "Palavra não encontrada";
    return;
  }

  let normWord = word.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); //remove acentos p/ comparar com o input (sempre sem acento)

  let correct = 0;
  let letterCount = {}; //TESTES -> {T:2, E:2, S:2}
  for (let i = 0; i < normWord.length; i++) {
    letter = normWord[i];
    if (letterCount[letter]) {
      letterCount[letter] += 1;
    } else {
      letterCount[letter] = 1;
    }
  }

  //primeira interação, cheque todas as letras corretas
  for (let c = 0; c < width; c++) {
    let currTile = document.getElementById(row.toString() + "-" + c.toString());
    let letter = currTile.innerText;

    //a letra está na posição correta?
    if (normWord[c] == letter) {
      currTile.classList.add("correct");
      let keyTile = document.getElementById("Key" + letter);
      keyTile.classList.remove("present");
      keyTile.classList.add("correct");
      currTile.innerText = word[c]; //mostra a letra real (com acento, se houver)
      correct += 1;
      letterCount[letter] -= 1;
    }

    if (correct == width) {
      gameOver = true;
      won = true;
    }
  }

  //cheque de novo e marque quais estão presentes porém em posições erradas
  for (let c = 0; c < width; c++) {
    let currTile = document.getElementById(row.toString() + "-" + c.toString());
    let letter = currTile.innerText;

    if (!currTile.classList.contains("correct")) {
      let keyTile = document.getElementById("Key" + letter);

      // a letra está na palavra?
      if (normWord.includes(letter) && letterCount[letter] > 0) {
        currTile.classList.add("present");
        if (!keyTile.classList.contains("correct")) {
          keyTile.classList.add("present");
        }
        letterCount[letter] -= 1;
      }
      // não  está na palavra
      else {
        currTile.classList.add("absent");
        if (
          !keyTile.classList.contains("correct") &&
          !keyTile.classList.contains("present")
        ) {
          keyTile.classList.add("absent");
        }
      }
    }
  }

  // Monta a linha de emojis dessa tentativa (🟩🟨⬛) pra usar no compartilhamento
  let emojiRow = "";
  for (let c = 0; c < width; c++) {
    let currTile = document.getElementById(row.toString() + "-" + c.toString());
    if (currTile.classList.contains("correct")) {
      emojiRow += "🟩";
    } else if (currTile.classList.contains("present")) {
      emojiRow += "🟨";
    } else {
      emojiRow += "⬛";
    }
  }
  results.push(emojiRow);

  row += 1; //começar nova linha
  col = 0; // começar do 0 para uma nova linha

  if (won) {
    endGame();
  }
}

function endGame() {
  document.getElementById("share-container").classList.add("visible");
}

function shareResult() {
  let attempts = won ? results.length : "X";
  let title =
    "Letrar" +
    (dayNumber !== null ? " #" + dayNumber : "") +
    " " +
    attempts +
    "/" +
    height;
  let text =
    title + "\n\n" + results.join("\n") + "\n\n" + window.location.href;

  let shareButton = document.getElementById("share-button");

  if (navigator.share) {
    navigator.share({ text: text }).catch(() => {});
    return;
  }

  if (navigator.clipboard) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        let original = shareButton.innerText;
        shareButton.innerText = "Copiado!";
        setTimeout(() => {
          shareButton.innerText = original;
        }, 2000);
      })
      .catch(() => {
        prompt("Copie seu resultado:", text);
      });
  } else {
    prompt("Copie seu resultado:", text);
  }
}

const STORAGE_KEY = "letrar-state";

function saveState() {
  let tiles = [];
  for (let r = 0; r < height; r++) {
    for (let c = 0; c < width; c++) {
      let tile = document.getElementById(r + "-" + c);
      tiles.push({ text: tile.innerText, cls: tile.className });
    }
  }

  let keys = {};
  document.querySelectorAll(".key-tile, .enter-key-tile").forEach((k) => {
    if (k.id) keys[k.id] = k.className;
  });

  let state = {
    day: dayNumber,
    row: row,
    col: col,
    gameOver: gameOver,
    won: won,
    results: results,
    tiles: tiles,
    keys: keys,
    answerShown: document.getElementById("answer").innerText,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    // localStorage indisponível (modo privado, etc) - sem problema, só não persiste
  }
}

function loadState() {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    return;
  }
  if (!raw) return;

  let state;
  try {
    state = JSON.parse(raw);
  } catch (e) {
    return;
  }

  // progresso de um dia diferente (a palavra já mudou) - ignora
  if (state.day !== dayNumber) return;

  row = state.row;
  col = state.col;
  gameOver = state.gameOver;
  won = state.won;
  results = state.results || [];

  state.tiles.forEach((t, i) => {
    let r = Math.floor(i / width);
    let c = i % width;
    let tile = document.getElementById(r + "-" + c);
    tile.innerText = t.text;
    tile.className = t.cls;
  });

  Object.keys(state.keys).forEach((id) => {
    let el = document.getElementById(id);
    if (el) el.className = state.keys[id];
  });

  if (state.answerShown) {
    document.getElementById("answer").innerText = state.answerShown;
  }

  if (gameOver) {
    endGame();
  }
}