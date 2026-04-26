let topic="", level="basic", isRunning=false;
let totalScore=0, questionCount=0, scores=[];
let history=[];
let chart, timer, timeLeft=90;

let recognition=null;
let isListening=false;

// START
function startInterview(){

    topic=document.getElementById("topicInput").value;
    if(!topic) return alert("Enter topic");

    isRunning=true;
    level="basic";
    totalScore=0; questionCount=0; scores=[]; history=[];

    initChart();
    updateDashboard();
    loadQuestion();
}

// STOP INTERVIEW
function stopInterview(){

    isRunning=false;
    clearInterval(timer);

    stopListening();
    speechSynthesis.cancel();

    document.getElementById("timer").innerText="Stopped";

    let html="<h3>📘 Interview Review</h3>";

    history.forEach((h,i)=>{
        html+=`
        <p><b>Q${i+1}:</b> ${h.q}</p>
        <p><b>Explanation:</b> ${h.exp}</p>
        <hr>`;
    });

    document.getElementById("result").innerHTML=html;
}

// LOAD QUESTION
async function loadQuestion(){

    if(!isRunning) return;

    stopListening();

    let res=await fetch(`/question?topic=${topic}&level=${level}&mode=topic`);
    let data=await res.json();

    document.getElementById("question").innerText=data.question;
    document.getElementById("answer").value="";

    setTimeout(()=>speak(data.question),300);

    startTimer();
}

// TIMER
function startTimer(){
    clearInterval(timer);
    timeLeft=90;

    timer=setInterval(()=>{
        if(!isRunning) return clearInterval(timer);

        timeLeft--;
        document.getElementById("timer").innerText=`Time Left: ${timeLeft}`;

        if(timeLeft<=0){
            clearInterval(timer);
            manualSubmit();
        }
    },1000);
}

// 🎤 START MIC
function startListening(){

    if(isListening) return;

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

    recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e)=>{
        let text="";
        for(let i=0;i<e.results.length;i++){
            text+=e.results[i][0].transcript;
        }
        document.getElementById("answer").value=text;
    };

    recognition.start();
    isListening=true;
}

// 🛑 STOP MIC (REAL FIX)
function stopListening(){

    try{
        if(recognition){

            recognition.onresult=null;
            recognition.onend=null;
            recognition.onerror=null;

            recognition.abort();
            recognition.stop();

            recognition=null;
        }
    }catch(e){}

    isListening=false;
}

// SUBMIT
async function manualSubmit(){

    clearInterval(timer);
    stopListening();

    let q=document.getElementById("question").innerText;
    let a=document.getElementById("answer").value.trim();

    if(!a) return alert("Enter answer");

    let res=await fetch("/evaluate",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({question:q,answer:a})
    });

    let data=await res.json();

    let score=data.score;

    totalScore+=score;
    questionCount++;
    scores.push(score);

    history.push({q:q, exp:data.explanation});

    updateDashboard();

    document.getElementById("result").innerHTML=
        `Score: ${score}/10<br>${data.feedback}`;

    if(score>=7 && level==="basic") level="medium";
    else if(score>=8 && level==="medium") level="advanced";

    document.getElementById("answer").value="";

    setTimeout(loadQuestion,2000);
}

// 🔊 SPEAK
function speak(text){

    stopListening(); // 🔥 ensures no capture

    speechSynthesis.cancel();

    let u=new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(u);
}

// CHART
function initChart(){
    let ctx=document.getElementById("chart").getContext("2d");
    chart=new Chart(ctx,{type:"line",data:{labels:[],datasets:[{data:[]}]}})
}

// DASHBOARD
function updateDashboard(){
    document.getElementById("qCount").innerText=questionCount;
    document.getElementById("totalScore").innerText=totalScore;
    document.getElementById("avgScore").innerText=
        (totalScore/questionCount||0).toFixed(2);

    chart.data.labels.push("Q"+questionCount);
    chart.data.datasets[0].data=scores;
    chart.update();
}