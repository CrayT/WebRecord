import { addBlob, clearAll, getAllBlobs } from "./indexDB.js";
import {fixWebmDuration} from "./fix-webm-duration.js";
import { base64ToUint8Array, blobToBase64 } from "./util.js";

const blobs = [];
let mediaRecorder;
let recordType = 'browser';

const format = 'mp4';

const ww = new Worker('./worker.js');
window.myworker = ww;

function replay() {
    console.log('blobs', blobs)
    const video = document.querySelector('video');
    video.src = URL.createObjectURL(new Blob(blobs, {type: 'video/webm'}));
    video.play();
}
function stopRecord() {
    localStorage.setItem("webRecording", false);
    mediaRecorder && mediaRecorder.stream.getVideoTracks()[0].stop();
}
function startRecord() {
    clearAll();
    blobs.length = 0;
    // getUserMedia // 摄像头
    // getDisplayMedia // 屏幕
    // getUserMedia({video: {mediaSource: 'screen'}}) // fireFox的调用方法
    navigator.mediaDevices.getDisplayMedia(
        {
            video: 
                {
                    frameRate: 30,
                    displaySurface: 'monitor', //"monitor", // 屏幕录屏
                    width: {
                        ideal: 4096,
                        max: 4096,
                    },
                    height: {
                        ideal: 2160,
                        max: 2160,
                    },
                },
            audio: false,
        }
    )
    .then(stream => {
        localStorage.setItem("webRecordStartTime", Date.now());
        localStorage.setItem("webRecording", true);
        mediaRecorder = new MediaRecorder(stream, {type: `video/${format}`});
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
        mediaRecorder.start(1000);
    });
}
async function download() {
    getAllBlobs().then(async (data) => {
        console.log('download get all:', data)
        console.time('---start')

        const uArrys = [];
        for(let i = 0; i < data.length; i++) {
            const base64 = await blobToBase64(data[i]);
            const uArry = base64ToUint8Array(base64);
            uArrys.push(uArry);
        }
        const blob = new Blob(uArrys, {
            type: "video/mp4",
          });
        fixWebmDuration(
            blob,
            Date.now() - localStorage.getItem('webRecordStartTime'),
            async (fixedWebm) => {
                const reader = new FileReader();
                reader.onloadend = function () {
                    const base64data = reader.result;
                    console.log('base64data',base64data)

                    const finalUArray = base64ToUint8Array(base64data);
                    console.log('final finalUArray', finalUArray)

                    const url = URL.createObjectURL(new Blob([finalUArray]), { type: `video/${format}` }); // todo 下载的有时无法播放，有点问题
                    console.timeEnd('---start')
                    const  a = document.createElement('a');
                    a.href = url;
                    a.style.display = 'none';
                    a.download='record.' + format;
                    a.click();
                    
                };
                reader.readAsDataURL(fixedWebm);
            }
        );

        // const url = URL.createObjectURL(new Blob(blobs), { type: `video/${format}` }); // todo 下载的有时无法播放，有点问题
        // const  a = document.createElement('a');
        // a.href = url;
        // a.style.display = 'none';
        // a.download=`record.${format}`;
        // a.click();

    }).catch(e => {
        console.log('download get all error', e)
    });
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
        if(localStorage.getItem('webRecordStartTime') && localStorage.getItem("webRecording") == 'true'){
            timeBlock.innerHTML = `${(Date.now() - localStorage.getItem('webRecordStartTime')) / 1000}s`;
        }
    }
    setInterval(() =>{ update()}, 1000);
}
init();