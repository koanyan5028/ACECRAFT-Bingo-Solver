"use strict";

$("div#main").css("display","unset");
setInterval(()=>{
	$("div#main").css("display","unset");
},1000);
console.log("script loaded!");

setInterval(()=>{
	let bodyHeight=$("body").height()!;
	let windowHeight=$(window).height()!;
	if(windowHeight<bodyHeight+7){
		let overflow=bodyHeight+8-windowHeight;
		let margin=parseFloat($("footer").css("margin-top"))-overflow;
		$("footer").css("margin-top",Math.max(margin,0));
		if(margin<0){
			$("body").css("overflow","auto");
		}else{
			$("body").css("overflow","hidden");
		}
		return;
	}
	let footerHeight=$("footer").outerHeight()!;
	let footerPosition=$("footer").position()!.top;
	$("footer").css("margin-top",bodyHeight-footerPosition-footerHeight);
	$("body").css("overflow","hidden");
});


const boardElement=$("div#board");

let lines :number[][]=[];
let linesLookup :number[][][]=[];
// 0: empty
// 1: hit
// 2: miss
let board :number[]=[];
let size :number=0;

function copyBoard(board: number[]) :number[]{
	return Array.from(board);
}

function compareScores(a :number[],b :number[]) :number{
	for(let i=size-1;i>=0;i--){
		let compare=a[i]-b[i];
		if(compare!=0) return compare;
	}
	return 0;
}

function compareScoreChains(a :number[][],b :number[][]) :number{
	for(let i=a.length-1;i>=0;i--){
		let compare=compareScores(a[i],b[i]);
		if(compare!=0) return compare;
	}
	return 0;
}

let debugCallCount :number=0;
function solveBoard(board :number[]) :{results :number[],scoreChain :number[][]}{
	debugCallCount++;

	let hasValidLine=false;
	let hasCompletedLine=false;
	for(let line of lines){
		if(line.every(position=>board[position]==1)){
			hasCompletedLine=true;
			break;
		}
		if(!line.some(position=>board[position]==2)){
			hasValidLine=true;
		}
	}
	if(hasCompletedLine || !hasValidLine){
		return {
			results: [],
			scoreChain: []
		};
	}

	let maxScore :number[]=Array(size).fill(0);
	let candidates :number[]=[];
	for(let square=0;square<size*size;square++){
		if(board[square]!=0) continue;

		let score :number[]=Array(size).fill(0);
		for(let line of linesLookup[square]){
			let count :number|undefined=0;
			for(let position of line){
				let state=board[position];
				if(state==2){
					count=undefined;
					break;
				}
				if(state==1){
					count++;
				}
			}
			if(count!=undefined){
				score[count]++;
			}
		}

		let compareResult=compareScores(score,maxScore);

		if(compareResult>0){
			maxScore=score;
			candidates=[square];
		}else if(compareResult==0){
			candidates.push(square);
		}
	}

	let maxScoreChain :number[][]|undefined=undefined;
	let results :number[]=[];
	for(let candidate of candidates){
		let copiedBoard=copyBoard(board);
		copiedBoard[candidate]=1;
		let {scoreChain}=solveBoard(copiedBoard);
		if(maxScoreChain==undefined){
			maxScoreChain=scoreChain;
			results.push(candidate);
		}else{
			let compareResult=compareScoreChains(scoreChain,maxScoreChain);
			if(compareResult>0){
				maxScoreChain=scoreChain;
				results=[candidate];
			}else if(compareResult==0){
				results.push(candidate);
			}
		}
	}

	maxScoreChain??=[];
	maxScoreChain.push(maxScore)
	return {results: results,scoreChain: maxScoreChain};
}

function solve(){
	$("div.square.highlighted").removeClass("highlighted");

	debugCallCount=0;
	let started=performance.now();
	let {results}=solveBoard(board);
	let ellapsed=performance.now()-started;
	console.log(`debugCallCount: ${debugCallCount}`);
	console.log(`ellapsed: ${ellapsed.toFixed(1)}ms`);
	
	for(let candidate of results){
		$(`div.square`).filter(function(){return $(this).data("index")==candidate;}).addClass("highlighted");
	}
}

function setText(element :JQuery){
	const index: number=element.data("index");
	const state=board[index];
	let text="";
	let color="black";
	if(state==1){
		text="〇";
		color="#e00";
	}else if(state==2){
		text="✖";
		color="darkcyan";
	}
	element.text(text);
	element.css("text-stroke-color",color);
	element.css("-webkit-text-stroke-color",color);
}

function onClick(element :JQuery,reversed :boolean=false){
		let index :number=element.data("index");
		let state=board[index];
		if(reversed){
			state-=1;
			if(state<0) state=2;
		}else{
			state=(state+1)%3;
		}
		board[index]=state;

		setText(element);
		solve();
}

function reset(newSize :number){
	console.log(`resetting with new size: ${newSize}`);
	size=newSize;

	boardElement.empty();
	boardElement.css("grid-template-columns",`repeat(${size},1fr)`);

	let squares=[];
	for(let y=0;y<size;y++){
		for(let x=0;x<size;x++){
			boardElement.append($('<div class="square" tabindex="0"></div>').data("index",x+y*size));
		}
	}

	lines=[];
	// orthogonal lines
	for(let line=0;line<size;line++){
		let horizontal :number[]=[];
		let vertical :number[]=[];
		for(let i=0;i<size;i++){
			horizontal.push(line*size+i);
			vertical.push(i*size+line);
		}
		lines.push(horizontal,vertical);
	}
	// diagonal lines
	let diagonal0: number[]=[];
	let diagonal1: number[]=[];
	for(let i=0;i<size;i++){
		diagonal0.push(i*(size+1));
		diagonal1.push((i+1)*(size-1));
	}
	lines.push(diagonal0,diagonal1);

	linesLookup=[];
	for(let i=0;i<size*size;i++){
		linesLookup.push(lines.filter(line=>line.includes(i)));
	}

	board=Array(size*size).fill(0);
	solve();

	// TODO: Implement arrow key thing
	boardElement.children().on("click",function(event){
		onClick($(this));
	}).on("keydown",function(event){
		if(event.code=="Enter"){
			onClick($(this),event.shiftKey || event.ctrlKey);
		}
	}).on("contextmenu",function(event){
		event.preventDefault();

		onClick($(this),true);
	});
}

$("input#size").on("input",function(event){
	let newSize=Number.parseInt((this as HTMLInputElement).value);
	if(!Number.isFinite(newSize)) return;

	newSize=Math.min(Math.max(newSize,1),7);
	reset(newSize);
});

$("input#clear").on("click",function(event){
	reset(size);
});

$("div#board-container").on("contextmenu",function(event){
	event.preventDefault();
});

$("div#size-container").on("contextmenu",function(event){
	event.stopPropagation();
});

reset(4);
