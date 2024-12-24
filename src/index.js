import { addBlob } from "./indexDB.js";

const blobs = [];
let mediaRecorder;
let recordType = 'browser';

function replay() {
    console.log('blobs', blobs)
    const video = document.querySelector('video');
    video.src = URL.createObjectURL(new Blob(blobs, {type: 'video/webm'}));
    video.play();
}
function stopRecord() {
    localStorage.setItem("webRecording", false);
    mediaRecorder && mediaRecorder.stop();
}
function startRecord() {
    // getUserMedia // 摄像头
    // getDisplayMedia // 屏幕
    navigator.mediaDevices.getDisplayMedia(
        {
            video: 
                {
                    frameRate: 30,
                    cursor: "never", // 貌似没用
                    displaySurface: 'monitor' //"monitor", // 屏幕录屏
                },
            audio: false,
        }
    ).then(stream => {
        localStorage.setItem("webRecordStartTime", performance.now());
        localStorage.setItem("webRecording", true);
        mediaRecorder = new MediaRecorder(stream, {type: 'video/webm'});
        mediaRecorder.onstop = (event) => {
            console.log('----onstop----', event);
        }
        mediaRecorder.ondataavailable = (event) => {
            console.log('data', event);
            if(event.data && event.data.size > 0){
                blobs.push(event.data);
                // 存到indexdb内
                addBlob({
                    chunk_id: JSON.stringify(Math.random()),
                    data: event.data,
                })
            }
        }
        mediaRecorder.start(5000);
    });
}
function download() {
    const url = URL.createObjectURL(new Blob(blobs, {type: 'video/webm'}));
    const  a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';
    a.download='record.webm';
    a.click();
}
function init() {
    localStorage.setItem("webRecording", false);
    const recordBrower = document.getElementById('recordBrower');
    const recordCamera = document.getElementById('recordCamera');

    recordBrower.addEventListener("change", () => {
        console.log('recordBrower', recordBrower.checked)
        if (recordBrower.checked) {
            recordCamera.checked = false;
        }
    });
    recordCamera.addEventListener("change", () => {
        console.log('recordCamera', recordCamera.checked)
        if (recordCamera.checked) {
            recordBrower.checked = false;
            recordType = 'camera';
        }
    });

    const start = document.getElementById('startRecord');
    start.onclick = () => {
        console.log('---start record----')
        startRecord();
    }

    const stop = document.getElementById('stopRecord');
    stop.onclick = () => {
        stopRecord();
    }

    const replayBtn = document.getElementById('replayRecord');
    replayBtn.onclick = () => {
        replay();
    }

    const downloadBtn = document.getElementById('downloadRecord');
    downloadBtn.onclick = () => {
        download();
    }

    // 监控内存内用
    const momoryBlock = document.getElementById('momoryBlock');
    const timeBlock = document.getElementById('timeBlock');

    const update = () => {
        momoryBlock.innerHTML=`${performance.memory.usedJSHeapSize/performance.memory.jsHeapSizeLimit*100}%`;
        if(localStorage.getItem('webRecordStartTime') && localStorage.getItem("webRecording") == 'true'){
            timeBlock.innerHTML = `${(performance.now() - localStorage.getItem('webRecordStartTime')) / 1000}s`;
        }
    }
    setInterval(() =>{ update()}, 1000);
}
init();