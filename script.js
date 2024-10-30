// script.js
// Initial variables
var lastPeerId = null;
var peer = null; // own peer object
var conn = null;
const statusMsg = document.getElementById("status-msg");
let hostPlayer = 'X';
let guestPlayer = 'O';
let defaultPlayerOnline = 'X';
let defaultGameActiveOnline = false;
const buttonReset = document.getElementById("button-reset");
const onlineOptions = document.getElementById("online-options");
const gameBoard = document.getElementById("game-board");
const cells = Array.from(document.querySelectorAll(".cell"));
const message = document.getElementById("message");
let board = ["", "", "", "", "", "", "", "", ""];
let player = "X";
let bot = "O";
let gameActive = true;
let mode = "easy";
let scoreX = 0;
let scoreO = 0;
let scoreDraw = 0;


function updateScore() {
    document.getElementById("scoreX").textContent = scoreX;
    document.getElementById("scoreO").textContent = scoreO;
    document.getElementById("scoreDraw").textContent = scoreDraw;
}

updateScore();


cells.forEach(cell => cell.addEventListener("click", handleCellClick));

function setMode() {
    if (mode === "friends" || mode === "online")
    {
        resetScores();
    }
    mode = document.getElementById("mode").value;
    resetGame();
    if (mode === "friends") {
        message.textContent = `Lượt của ${player}`;
        resetScores();
        gameActive = true;
    }
    if (mode === "online") {
        statusMsg.style.removeProperty('display');
        onlineOptions.style.display = 'block';
        resetScores();
        gameBoard.style.display = 'none';
        buttonReset.style.display = 'none';
        message.textContent = '';
        statusMsg.textContent = 'ID của bạn: ' + peer.id;
        gameActive = false;
    } else {
        statusMsg.style.display = 'none';
        onlineOptions.style.display = 'none';
        gameBoard.style.removeProperty('display');
        buttonReset.style.removeProperty('display');
        message.textContent = `Lượt của ${player}`;
        statusMsg.textContent = 'Chờ kết nối!';
    }
}



function Initialize() {
    mode = document.getElementById("mode").value;
    resetGame();
    if (mode === "online") {
        onlineOptions.style.display = 'block';
        resetScores();
        gameBoard.style.display = 'none';
        buttonReset.style.display = 'none';
        message.textContent = '';
        gameActive = false;
    }
    peer = new Peer(null, 
        {
            debug: 2,
        }
    );
    peer.on('open', function(id) {
        if(peer.id === null)
        {
            console.log('NULL ID');
            peer.id = lastPeerId;
        }else
        {
            lastPeerId = peer.id;
        }
        console.log('My peer ID is: ' + peer.id);
        statusMsg.textContent = 'ID của bạn: ' + peer.id;
    });
    peer.on('connection', function(c) {
        if(conn && conn.open)
        {
            c.on('open', function() {
                c.send('Already connected to another client');
                setTimeout(function() { c.close(); }, 500);
            });
            return;
        }
        conn = c;
        conn.on('open', function() {
            console.log('Connected to: ' + conn.peer);
            statusMsg.textContent = 'Đã kết nối với: ' + conn.peer + ' - Bạn là ' + hostPlayer;
            message.textContent = 'Lượt của ' + hostPlayer;
            defaultPlayerOnline = hostPlayer;
            player = hostPlayer;
            gameActive = true;
            defaultGameActiveOnline = true;
            gameBoard.style.removeProperty('display');
            onlineOptions.style.display = 'none';
        });
        readyFromOnline();
    });
    peer.on('disconnected', function() {
        console.log('Connection lost. Please reconnect');
        statusMsg.textContent = 'Kết nối bị mất. Vui lòng kết nối lại';
        gameActive = false;
    });

    peer.on('close', function() {
        conn = null;
        console.log('Connection destroyed');
        statusMsg.textContent = 'Kết nối bị hủy';
        gameActive = false;
    });
    peer.on('error', function(err) {
        console.log(err);
        alert('' + err);
        gameActive = false;
    });
}

function joinRoom(roomID) {
    if(conn) conn.close();
    console.log('Joining room: ' + roomID);
    conn = peer.connect(roomID, { reliable: true });
    conn.on('open', function() {
        console.log('Connected to: ' + conn.peer);
        statusMsg.textContent = 'Đã kết nối với: ' + conn.peer + ' - Bạn là ' + guestPlayer; ;
        message.textContent = 'Lượt của ' + hostPlayer;
        player = guestPlayer;
        defaultPlayerOnline = guestPlayer;
        gameActive = false;
        defaultGameActiveOnline = false;
        gameBoard.style.removeProperty('display');
        onlineOptions.style.display = 'none';
    });
    readyFromOnline();
}

function readyFromOnline()
{
    conn.on('data', function(data) {
        board = data.board;
        cells.forEach((cell, index) => {
            cell.textContent = board[index];
            if (board[index] !== "") cell.classList.add("taken");
        });
        player = data.player;
        if (checkWin(player)) {
            if (player === "X") 
            {
                scoreX++;
                updateScore()
                displayMessage("X thắng!");
                gameActive = false;
                if(mode === "online") resetGameInOnline();
            }
            else 
            {
                scoreO++;
                updateScore()
                displayMessage("O thắng!");
                gameActive = false;
                if(mode === "online") resetGameInOnline();
            }
        } else if (board.every(cell => cell !== "")) {
            scoreDraw++;
            updateScore()
            displayMessage("Hòa!");
            gameActive = false;
            if(mode === "online") resetGameInOnline();
        } else {
            player = player === "X" ? "O" : "X";
            displayMessage(`Lượt của ${player}`);
            gameActive = true;
        }
    });
}

function resetGameInOnline() {
    statusMsg.textContent = 'Đếm ngược 3s để bắt đầu game mới';
    setTimeout(function() {
        statusMsg.textContent = 'Đã kết nối với: ' + conn.peer + ' - Bạn là ' + defaultPlayerOnline;
        board = ["", "", "", "", "", "", "", "", ""];
        cells.forEach(cell => {
            cell.textContent = "";
            cell.classList.remove("taken");
        });
        player = defaultPlayerOnline;
        message.textContent = `Lượt của ${player}`;
        gameActive = defaultGameActiveOnline;
    }, 3000);
}

Initialize();

function handleCellClick(event) {
    const cell = event.target;
    const index = cell.getAttribute("data-index");

    if (board[index] === "" && gameActive) {
        // Player's move
        cell.textContent = player;
        board[index] = player;
        cell.classList.add("taken");

        if(mode === "online" && conn && conn.open && gameActive)
        {
            conn.send({index: index, board: board, player: player});
            gameActive = false;
        }

        if (checkWin(player)) {
            if (player === "X") 
            {
                scoreX++;
                updateScore()
                displayMessage("X thắng!");
                gameActive = false;
                if(mode === "online") resetGameInOnline();
            }
            else 
            {
                scoreO++;
                updateScore()
                displayMessage("O thắng!");
                gameActive = false;
                if(mode === "online") resetGameInOnline();
            }
        } else if (board.every(cell => cell !== "")) {
            scoreDraw++;
            updateScore()
            displayMessage("Hòa!");
            gameActive = false;
            if(mode === "online") resetGameInOnline();
        } else {
            displayMessage(`Lượt của O`);
            if (mode !== "friends" && mode !== "online") botMove();
            else
            {
                player = player === "X" ? "O" : "X";
                displayMessage(`Lượt của ${player}`);
            }
        }
    }
}

function resetScores() {
    scoreX = 0;
    scoreO = 0;
    scoreDraw = 0;
    updateScore();
}


function botMove() {
    if (!gameActive) return;

    let botIndex;
    if (mode === "easy") {
        botIndex = getEasyMove();
    } else if (mode === "medium") {
        botIndex = getMediumMove();
    } else {
        botIndex = getBestMove(); 
    }

    board[botIndex] = bot;
    cells[botIndex].textContent = bot;
    cells[botIndex].classList.add("taken");

    if (checkWin(bot)) {
        scoreO++;
        updateScore();
        displayMessage("O thắng!");
        gameActive = false;
    } else if (board.every(cell => cell !== "")) {
        scoreDraw++;
        updateScore();
        displayMessage("Hòa!");
        gameActive = false;
    }else {
        displayMessage("Lượt của X");
    }
}

function getEasyMove() {
    const emptyCells = board.map((cell, index) => cell === "" ? index : null).filter(index => index !== null);
    const corners = [0, 2, 6, 8];

    if (emptyCells.length === 9) { 
        return corners[Math.floor(Math.random() * corners.length)]; 
    }


    for (let i = 0; i < emptyCells.length; i++) {
        const index = emptyCells[i];
        board[index] = player;
        if (checkWin(player)) {
            board[index] = "";
            continue; 
        }
        board[index] = "";
    }

    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function getMediumMove() {

    const emptyCells = board.map((cell, index) => cell === "" ? index : null).filter(index => index !== null);
    const edges = [1, 3, 5, 7];
    const center = 4;

    if (emptyCells.length === 8 && board[center] === player) { 
        return edges[Math.floor(Math.random() * edges.length)]; 
    }


    for (let i = 0; i < emptyCells.length; i++) {
        const index = emptyCells[i];
        board[index] = player;
        if (checkWin(player)) {
            board[index] = "";
            return index; 
        }
        board[index] = "";
    }


    for (let i = 0; i < emptyCells.length; i++) {
        const adjacentCells = getAdjacentCells(bot); 
        if (adjacentCells.includes(emptyCells[i])) {
            return emptyCells[i];
        }
    }


    return emptyCells[Math.floor(Math.random() * emptyCells.length)];
}

function getAdjacentCells(bot) {
    const adjacents = {
        0: [1, 3], 1: [0, 2, 4], 2: [1, 5],
        3: [0, 4, 6], 4: [1, 3, 5, 7], 5: [2, 4, 8],
        6: [3, 7], 7: [4, 6, 8], 8: [5, 7]
    };
    const botCells = board.map((cell, index) => cell === bot ? index : null).filter(index => index !== null);
    return botCells.reduce((acc, index) => acc.concat(adjacents[index] || []), []);
}



function getBestMove() {
    let bestScore = -Infinity;
    let move;

    for (let i = 0; i < board.length; i++) {
        if (board[i] === "") {
            board[i] = bot;
            let score = minimax(board, 0, false);
            board[i] = "";
            if (score > bestScore) {
                bestScore = score;
                move = i;
            }
        }
    }
    return move;
}

function minimax(newBoard, depth, isMaximizing) {
    if (checkWin(bot)) return 10 - depth;
    if (checkWin(player)) return depth - 10;
    if (newBoard.every(cell => cell !== "")) return 0;

    if (isMaximizing) {
        let bestScore = -Infinity;
        for (let i = 0; i < newBoard.length; i++) {
            if (newBoard[i] === "") {
                newBoard[i] = bot;
                let score = minimax(newBoard, depth + 1, false);
                newBoard[i] = "";
                bestScore = Math.max(score, bestScore);
            }
        }
        return bestScore;
    } else {
        let bestScore = Infinity;
        for (let i = 0; i < newBoard.length; i++) {
            if (newBoard[i] === "") {
                newBoard[i] = player;
                let score = minimax(newBoard, depth + 1, true);
                newBoard[i] = "";
                bestScore = Math.min(score, bestScore);
            }
        }
        return bestScore;
    }
}

function checkWin(currentPlayer) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    return winPatterns.some(pattern => {
        return pattern.every(index => board[index] === currentPlayer);
    });
}

function displayMessage(msg) {
    message.textContent = msg;
}

function resetGame() {
    board = ["", "", "", "", "", "", "", "", ""];
    cells.forEach(cell => {
        cell.textContent = "";
        cell.classList.remove("taken");
    });
    player = "X";
    message.textContent = `Lượt của ${player}`;
    gameActive = true;
}
