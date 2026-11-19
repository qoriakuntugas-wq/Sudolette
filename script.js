
const boardElement = document.getElementById("board");
const numbersElement = document.getElementById("numbers");

let solution = [];
let puzzle = [];
let current = [];
let selected = -1;
let notesMode = false;
let notes = Array.from({length:81}, () => new Set());
let history = [];
let seconds = 0;
let timerInterval;
let finished = false;
let conflictCells = new Set();

function emptyBoard() {
  return Array.from({length:9}, () => Array(9).fill(0));
}

function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

function generateSolution() {
  const base = [0,1,2,3,4,5,6,7,8];

  const rows = shuffle([0,1,2]).flatMap(group =>
    shuffle([0,1,2]).map(row => group * 3 + row)
  );

  const cols = shuffle([0,1,2]).flatMap(group =>
    shuffle([0,1,2]).map(col => group * 3 + col)
  );

  const nums = shuffle([1,2,3,4,5,6,7,8,9]);

  return rows.map(r =>
    cols.map(c =>
      nums[(r * 3 + Math.floor(r / 3) + c) % 9]
    )
  );
}

function newGame() {
  clearInterval(timerInterval);

  solution = generateSolution();
  puzzle = solution.map(row => [...row]);

  const level = document.getElementById("level").value;

  const removeCount = {
    easy: 38,
    medium: 48,
    hard: 55
  }[level];

  let positions = shuffle(
    Array.from({length:81}, (_,i) => i)
  );

  for (let i = 0; i < removeCount; i++) {
    let pos = positions[i];
    puzzle[Math.floor(pos / 9)][pos % 9] = 0;
  }

  current = puzzle.flat();
  puzzle = puzzle.flat();

  selected = -1;
  conflictCells.clear();
  notes = Array.from({length:81}, () => new Set());
  history = [];
  notesMode = false;
  seconds = 0;
  finished = false;

  document.getElementById("message").textContent =
    "Choose a cell and start playing! ♡";

  document.getElementById("timer").textContent = "00:00";

  timerInterval = setInterval(() => {
    if (!finished) {
      seconds++;

      let m = Math.floor(seconds / 60);
      let s = seconds % 60;

      document.getElementById("timer").textContent =
        String(m).padStart(2,"0") + ":" +
        String(s).padStart(2,"0");
    }
  }, 1000);

  render();
}

function render() {
  boardElement.innerHTML = "";

  for (let i = 0; i < 81; i++) {
    const cell = document.createElement("button");
    cell.className = "cell";

    const row = Math.floor(i / 9);
    const col = i % 9;

    if (puzzle[i] !== 0) cell.classList.add("fixed");

    if (selected === i) cell.classList.add("selected");

    if (selected !== -1) {
      const sr = Math.floor(selected / 9);
      const sc = selected % 9;

      if (
        sr === row || sc === col ||
        (Math.floor(sr/3) === Math.floor(row/3) &&
         Math.floor(sc/3) === Math.floor(col/3))
      ) {
        cell.classList.add("related");
      }

      if (
        current[i] !== 0 &&
        current[i] === current[selected]
      ) {
        cell.classList.add("same");
      }
    }

    if (conflictCells.has(i)) cell.classList.add("error");

    if (current[i] !== 0) {
      cell.textContent = current[i];
    } else if (notes[i].size > 0) {
      cell.textContent = [...notes[i]].sort().join(" ");
      cell.style.fontSize = "10px";
    }

    cell.onclick = () => {
      selected = i;
      render();
    };

    boardElement.appendChild(cell);
  }

  renderNumbers();
}

function renderNumbers() {
  numbersElement.innerHTML = "";

  for (let n = 1; n <= 9; n++) {
    const btn = document.createElement("button");
    btn.className = "num";
    btn.textContent = n;

    const count = current.filter(v => v === n).length;
    btn.disabled = count >= 9 || finished;

    btn.onclick = () => enterNumber(n);

    numbersElement.appendChild(btn);
  }
}

function hasConflict(index, value) {
  const row = Math.floor(index / 9);
  const col = index % 9;

  return current.some((cellValue, otherIndex) => {
    if (otherIndex === index || cellValue !== value) return false;

    const otherRow = Math.floor(otherIndex / 9);
    const otherCol = otherIndex % 9;
    return otherRow === row || otherCol === col ||
      (Math.floor(otherRow / 3) === Math.floor(row / 3) &&
       Math.floor(otherCol / 3) === Math.floor(col / 3));
  });
}

function enterNumber(n) {
  if (selected === -1) {
    notify("Pilih kotak terlebih dahulu!");
    return;
  }

  if (puzzle[selected] !== 0 || finished) return;

  if (!notesMode && hasConflict(selected, n)) {
    conflictCells = new Set(
      current.flatMap((value, index) =>
        value === n && (
          Math.floor(index / 9) === Math.floor(selected / 9) ||
          index % 9 === selected % 9 ||
          (Math.floor(index / 27) === Math.floor(selected / 27) &&
           Math.floor((index % 9) / 3) === Math.floor((selected % 9) / 3))
        ) ? [index] : []
      )
    );
    conflictCells.add(selected);
    render();
    setTimeout(() => {
      conflictCells.clear();
      render();
    }, 1200);
    notify("Angka yang sama tidak boleh satu baris, kolom, atau kotak 3×3!");
    return;
  }

  history.push({
    index: selected,
    value: current[selected],
    notes: [...notes[selected]]
  });

  if (notesMode) {
    if (notes[selected].has(n)) {
      notes[selected].delete(n);
    } else {
      notes[selected].add(n);
    }
  } else {
    current[selected] = n;
    notes[selected].clear();
  }

  render();

  if (!notesMode) {
    checkWin();
  }
}

function eraseCell() {
  if (selected === -1 || finished) return;
  if (puzzle[selected] !== 0) return;

  history.push({
    index: selected,
    value: current[selected],
    notes: [...notes[selected]]
  });

  current[selected] = 0;
  notes[selected].clear();

  render();
}

function toggleNotes() {
  notesMode = !notesMode;

  notify(notesMode ? "Notes mode ON ✎" : "Notes mode OFF");
}

function hint() {
  if (selected === -1 || finished) {
    notify("Pilih kotak kosong terlebih dahulu!");
    return;
  }

  if (puzzle[selected] !== 0) {
    notify("Kotak ini sudah memiliki angka awal!");
    return;
  }

  history.push({
    index: selected,
    value: current[selected],
    notes: [...notes[selected]]
  });

  current[selected] = solution.flat()[selected];
  notes[selected].clear();

  render();
  checkWin();

  if (!finished) notify("Hint berhasil digunakan! 💡");
}

function undo() {
  if (finished) return;

  const last = history.pop();

  if (!last) {
    notify("Tidak ada langkah sebelumnya!");
    return;
  }

  current[last.index] = last.value;
  notes[last.index] = new Set(last.notes);

  selected = last.index;
  render();

  notify("Langkah berhasil dikembalikan.");
}

function checkGame() {
  if (finished) return;

  let empty = current.includes(0);

  if (empty) {
    notify("Masih ada kotak yang kosong!");
    return;
  }

  const correct = current.every(
    (value, i) => value === solution.flat()[i]
  );

  if (correct) {
    win();
  } else {
    notify("Masih ada angka yang salah. Coba lagi!");
  }
}

function checkWin() {
  if (current.every((value, i) =>
    value === solution.flat()[i]
  )) {
    win();
  }
}

function win() {
  finished = true;
  clearInterval(timerInterval);

  notify("🎉 Congratulations! Sudoku completed!");

  renderNumbers();
}

function solveGame() {
  if (finished) return;

  current = solution.flat();
  finished = true;
  clearInterval(timerInterval);

  render();

  notify("Puzzle solved! 🌷");
}

function notify(text) {
  document.getElementById("message").textContent = text;
}

// Keyboard controls
document.addEventListener("keydown", e => {
  if (finished) return;

  if (e.key >= "1" && e.key <= "9") {
    enterNumber(Number(e.key));
  }

  if (e.key === "Backspace" || e.key === "Delete") {
    eraseCell();
  }

  if (e.key.startsWith("Arrow") && selected !== -1) {
    e.preventDefault();

    let row = Math.floor(selected / 9);
    let col = selected % 9;

    if (e.key === "ArrowUp") row = Math.max(0,row-1);
    if (e.key === "ArrowDown") row = Math.min(8,row+1);
    if (e.key === "ArrowLeft") col = Math.max(0,col-1);
    if (e.key === "ArrowRight") col = Math.min(8,col+1);

    selected = row * 9 + col;
    render();
  }
});

newGame();
