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
function solveBoard(board) {
    debugCallCount++;
    let hasValidLine = false;
    let hasCompletedLine = false;
    for (let line of lines) {
        if (line.every(position => board[position] == true)) {
            hasCompletedLine = true;
            break;
        }
        if (!line.some(position => board[position] == false)) {
            hasValidLine = true;
        }
    }
    if (hasCompletedLine || !hasValidLine) {
        return {
            results: [],
            scoreChain: []
        };
    }
    let maxScore = Array(size).fill(0);
    let candidates = [];
    for (let square = 0; square < size * size; square++) {
        if (board[square] != undefined)
            continue;
        let score = Array(size).fill(0);
        for (let line of linesLookup[square]) {
            let count = 0;
            for (let position of line) {
                let state = board[position];
                if (state == false) {
                    count = undefined;
                    break;
                }
                if (state == true) {
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
    for (let candidate of candidates) {
        let copiedBoard = copyBoard(board);
        copiedBoard[candidate] = true;
        let { scoreChain } = solveBoard(copiedBoard);
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
    maxScoreChain ??= [];
    maxScoreChain.push(maxScore);
    return { results: results, scoreChain: maxScoreChain };
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
}
function setText(element) {
    const index = element.data("index");
    const state = board[index];
    let text = "";
    let color = "black";
    if (state == true) {
        text = "〇";
        color = "#e00";
    }
    else if (state == false) {
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
        if (state == undefined) {
            state = false;
        }
        else if (state == false) {
            state = true;
        }
        else {
            state = undefined;
        }
    }
    else {
        if (state == undefined) {
            state = true;
        }
        else if (state == true) {
            state = false;
        }
        else {
            state = undefined;
        }
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
    board = Array(size * size).fill(undefined);
    solve();
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
}
$("input#size").on("input", function (event) {
    let newSize = Number.parseInt(this.value);
    if (!Number.isFinite(newSize))
        return;
    newSize = Math.min(Math.max(newSize, 1), 7);
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
