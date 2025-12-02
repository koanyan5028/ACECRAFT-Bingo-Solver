"use strict";
$("div#main").css("display", "unset");
setInterval(() => {
    $("div#main").css("display", "unset");
}, 1000);
console.log("script loaded!");
setInterval(() => {
    let bodyHeight = $("body").height();
    let windowHeight = $(window).height();
    if (windowHeight < bodyHeight + 7) {
        let overflow = bodyHeight + 8 - windowHeight;
        let margin = parseFloat($("footer").css("margin-top")) - overflow;
        $("footer").css("margin-top", Math.max(margin, 0));
        if (margin < 0) {
            $("body").css("overflow", "auto");
        }
        else {
            $("body").css("overflow", "hidden");
        }
        return;
    }
    let footerHeight = $("footer").outerHeight();
    let footerPosition = $("footer").position().top;
    $("footer").css("margin-top", bodyHeight - footerPosition - footerHeight);
    $("body").css("overflow", "hidden");
});
const boardElement = $("div#board");
let lines = [];
let linesLookup = [];
// 0: empty
// 1: hit
// 2: miss
let board = [];
let size = 0;
function copyBoard(board) {
    return Array.from(board);
}
function compareScores(a, b) {
    for (let i = size - 1; i >= 0; i--) {
        let compare = a[i] - b[i];
        if (compare != 0)
            return compare;
    }
    return 0;
}
function compareScoreChains(a, b) {
    for (let i = a.length - 1; i >= 0; i--) {
        let compare = compareScores(a[i], b[i]);
        if (compare != 0)
            return compare;
    }
    return 0;
}
let debugCallCount = 0;
const maxCacheSize = 2 ** 20;
let cache = new Map();
function solveBoard(board, leastSteps, candidateLines) {
    debugCallCount++;
    let key = board.join("");
    if (cache.has(key)) {
        return cache.get(key);
    }
    if (leastSteps == undefined) {
        // TODO: Add an optimization for X-only boards
        let hasValidLine = false;
        let hasCompletedLine = false;
        let maxCount = 0;
        candidateLines = [];
        if (board.every(cell => cell == 0)) {
            hasValidLine = true;
            candidateLines = lines.slice(-2);
        }
        else {
            for (let line of lines) {
                if (line.some(position => board[position] == 2))
                    continue;
                hasValidLine = true;
                let count = line.filter(position => board[position] == 1).length;
                if (count == size) {
                    hasCompletedLine = true;
                    break;
                }
                if (maxCount < count) {
                    maxCount = count;
                    candidateLines = [line];
                }
                else if (maxCount == count) {
                    candidateLines.push(line);
                }
            }
        }
        if (hasCompletedLine || !hasValidLine) {
            return {
                results: [],
                scoreChain: []
            };
        }
        leastSteps = size - maxCount;
    }
    let maxScore = Array(size).fill(0);
    let candidates = [];
    for (let square of Array.from(new Set(candidateLines.flat()))) {
        if (board[square] != 0)
            continue;
        let score = Array(size).fill(0);
        for (let line of linesLookup[square]) {
            let count = 0;
            for (let position of line) {
                let state = board[position];
                if (state == 2) {
                    count = undefined;
                    break;
                }
                if (state == 1) {
                    count++;
                }
            }
            if (count != undefined) {
                score[count]++;
            }
        }
        let compareResult = compareScores(score, maxScore);
        if (compareResult > 0) {
            maxScore = score;
            candidates = [square];
        }
        else if (compareResult == 0) {
            candidates.push(square);
        }
    }
    let maxScoreChain = undefined;
    let results = [];
    if (leastSteps <= 1) {
        results = candidates;
    }
    else {
        for (let candidate of candidates) {
            let copiedBoard = copyBoard(board);
            copiedBoard[candidate] = 1;
            let lines = linesLookup[candidate];
            let { scoreChain } = solveBoard(copiedBoard, leastSteps - 1, candidateLines.filter(line => lines.includes(line)));
            if (maxScoreChain == undefined) {
                maxScoreChain = scoreChain;
                results.push(candidate);
            }
            else {
                let compareResult = compareScoreChains(scoreChain, maxScoreChain);
                if (compareResult > 0) {
                    maxScoreChain = scoreChain;
                    results = [candidate];
                }
                else if (compareResult == 0) {
                    results.push(candidate);
                }
            }
        }
    }
    maxScoreChain ??= [];
    maxScoreChain = maxScoreChain.slice();
    maxScoreChain.push(maxScore);
    if (cache.size >= maxCacheSize) {
        console.log("Max cache size reached! Clearing cache...");
        cache.clear();
    }
    let ret = { results: results, scoreChain: maxScoreChain };
    cache.set(key, ret);
    return ret;
}
function solve() {
    $("div.square.highlighted").removeClass("highlighted");
    debugCallCount = 0;
    let started = performance.now();
    let { results } = solveBoard(board);
    let ellapsed = performance.now() - started;
    console.log(`debugCallCount: ${debugCallCount}`);
    console.log(`ellapsed: ${ellapsed.toFixed(1)}ms`);
    for (let candidate of results) {
        $(`div.square`).filter(function () { return $(this).data("index") == candidate; }).addClass("highlighted");
    }
    return {
        callCount: debugCallCount,
        ellapsed
    };
}
function setText(element) {
    const index = element.data("index");
    const state = board[index];
    let text = "";
    let color = "black";
    if (state == 1) {
        text = "〇";
        color = "#e00";
    }
    else if (state == 2) {
        text = "✖";
        color = "darkcyan";
    }
    element.text(text);
    element.css("text-stroke-color", color);
    element.css("-webkit-text-stroke-color", color);
}
function onClick(element, reversed = false) {
    let index = element.data("index");
    let state = board[index];
    if (reversed) {
        state -= 1;
        if (state < 0)
            state = 2;
    }
    else {
        state = (state + 1) % 3;
    }
    board[index] = state;
    setText(element);
    solve();
}
function reset(newSize) {
    console.log(`resetting with new size: ${newSize}`);
    size = newSize;
    boardElement.empty();
    boardElement.css("grid-template-columns", `repeat(${size},1fr)`);
    let squares = [];
    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            boardElement.append($('<div class="square" tabindex="0"></div>').data("index", x + y * size));
        }
    }
    lines = [];
    // orthogonal lines
    for (let line = 0; line < size; line++) {
        let horizontal = [];
        let vertical = [];
        for (let i = 0; i < size; i++) {
            horizontal.push(line * size + i);
            vertical.push(i * size + line);
        }
        lines.push(horizontal, vertical);
    }
    // diagonal lines
    let diagonal0 = [];
    let diagonal1 = [];
    for (let i = 0; i < size; i++) {
        diagonal0.push(i * (size + 1));
        diagonal1.push((i + 1) * (size - 1));
    }
    lines.push(diagonal0, diagonal1);
    linesLookup = [];
    for (let i = 0; i < size * size; i++) {
        linesLookup.push(lines.filter(line => line.includes(i)));
    }
    // TODO: Implement arrow key thing
    boardElement.children().on("click", function (event) {
        onClick($(this));
    }).on("keydown", function (event) {
        if (event.code == "Enter") {
            onClick($(this), event.shiftKey || event.ctrlKey);
        }
    }).on("contextmenu", function (event) {
        event.preventDefault();
        onClick($(this), true);
    });
    board = Array(size * size).fill(0);
    return solve();
}
let sizeElement = $("input#size");
sizeElement.on("input", function (event) {
    let newSize = Number.parseInt(this.value);
    if (!Number.isFinite(newSize))
        return;
    newSize = Math.min(Math.max(newSize, 1), Number.parseInt(sizeElement.attr("max")));
    reset(newSize);
});
$("input#clear").on("click", function (event) {
    reset(size);
});
$("div#board-container").on("contextmenu", function (event) {
    event.preventDefault();
});
$("div#size-container").on("contextmenu", function (event) {
    event.stopPropagation();
});
reset(4);
async function benchmark(boardSize = 12, count = 50) {
    let preSize = size;
    let preBoard = board;
    // JIT compiler thing
    reset(4);
    for (let i = 0; i < 1000; i++) {
        solveBoard(Array(16).fill(0));
    }
    reset(boardSize);
    // Mark center as miss if the size is odd, so the complexity increases continuously as the size increases
    if (boardSize % 2 == 1) {
        board[(boardSize * boardSize - 1) / 2] = 2;
    }
    console.log(`%cStarting benchmark\n\n%c- size: ${boardSize}\n- count: ${count}`, "font-size: 200%;font-weight: bold;", "");
    let ellapsed = 0;
    console.log(`0/${count}`);
    for (let i = 0; i < count; i++) {
        ellapsed += solve().ellapsed;
        // Right before the new Promise() to prevent console from flashing too much
        console.log(`${i + 1}/${count}`);
        // Enables reloading while running benchmark
        cache.clear();
        await new Promise(resolve => setTimeout(resolve, 1));
    }
    console.log(`%cBenchmark finished!!\n\n%c- ellapsed: ${ellapsed.toFixed(1)}ms\n- average: ${(ellapsed / count).toFixed(3)}ms`, "font-size: 200%;font-weight: bold;", "");
    // Reset the board to its original state
    reset(preSize);
    board = preBoard;
    $("div.square").each((index, element) => setText($(element)));
    solve();
}
