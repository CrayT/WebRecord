import './version.js';
import { myDB } from "./indexDB.js";
import {fixWebmDuration} from "./fix-webm-duration.js";
import { base64ToUint8Array } from "./util.js";

const blobs = [];
let mediaRecorder;

const format = 'webm';

localStorage.setItem("webRecording", false);
localStorage.setItem("webRecordDuration", 0);

async function readyWork() {
    await myDB.clearAll();
}
readyWork();

async function replay() {
    const all = await myDB.getAllBlobs();
    const data = await fixDurationTime(all.map(d => d.data));
    const url = URL.createObjectURL(new Blob([data], { type: `video/${format}` }));
    const video = document.querySelector('video');
    video.src = url;
    video.play();
}

function pauseRecord() {
    localStorage.setItem("webRecording", false);
    const webRecordDuration = localStorage.getItem("webRecordDuration") ? Number(localStorage.getItem("webRecordDuration")) : 0;
    localStorage.setItem("webRecordDuration", webRecordDuration + (Date.now() - Number(localStorage.getItem("webRecordStartTime"))) / 1000);

    mediaRecorder && mediaRecorder.pause();
}
function resumeRecord() {
    localStorage.setItem("webRecording", true);
    localStorage.setItem("webRecordStartTime", Date.now());
    mediaRecorder && mediaRecorder.resume();
}
async function stopRecord() {
    console.log('stopRecord',mediaRecorder )
    localStorage.setItem("webRecording", false);
    const webRecordDuration = localStorage.getItem("webRecordDuration") ? Number(localStorage.getItem("webRecordDuration")) : 0;
    localStorage.setItem("webRecordDuration", webRecordDuration + (Date.now() - Number(localStorage.getItem("webRecordStartTime"))) / 1000);
    mediaRecorder && mediaRecorder.stream.getVideoTracks()[0].stop();
    replay();
}

async function startRecord() {
    console.log(navigator.mediaDevices)
    blobs.length = 0;
    localStorage.setItem("webRecording", false);
    localStorage.setItem("webRecordDuration", 0);
    await myDB.clearAll();
    navigator.mediaDevices.getDisplayMedia(
        {
            video: 
                {
                    frameRate: 24,
                    width: 1980,
                    height: 1020,
                },
            audio: false,
        }
    )
    .then(stream => {
        localStorage.setItem("webRecording", true);
        localStorage.setItem("webRecordStartTime", Date.now());

        mediaRecorder = new MediaRecorder(stream, {type: `video/${format}`});
        const tracks = mediaRecorder.stream.getVideoTracks();
        const hint = 'detail';
        tracks.forEach((track) => {
            if ("contentHint" in track) {
                track.contentHint = hint;
                if (track.contentHint !== hint) {
                    console.error(`Invalid video track contentHint: "${hint}"`);
                }
            } else {
            console.error("MediaStreamTrack contentHint attribute not supported");
            }
        });
        mediaRecorder.onstop = (event) => {
            console.log('----onstop----', event);
        }
        mediaRecorder.ondataavailable = async (event) => {
            console.log('data', event);
            if(event.data && event.data.size > 0){
                blobs.push(event.data);
                myDB.addBlob({
                    chunk_id: Date.now(), // 用递增的时间戳作为主键
                    data: event.data,
                    type: 'origin',
                });
            }
        }
        mediaRecorder.start(1000);
    }).catch(e => {
        console.log('getDisplayMedia error: ', e)
    });
}

async function fixDurationTime(blobs) {
    return new Promise((resolve, _reject) => {
        console.log('fix duration time:', blobs)
        const blob = new Blob(blobs, {
            type: "video/webm"
        });
        const durationTime = localStorage.getItem("webRecordDuration") ? Number(localStorage.getItem("webRecordDuration")) : 0;
        console.log('real durationTime in download:', durationTime)
        fixWebmDuration(
            blob,
            durationTime,
            async (fixedWebm) => {
                const reader = new FileReader();
                reader.onloadend = function () {
                    const base64data = reader.result;
                    const finalUArray = base64ToUint8Array(base64data);
                    console.log('final finalUArray', finalUArray)                        
                    resolve(finalUArray);
                };
                reader.readAsDataURL(fixedWebm);
            }
        );
    });
}

async function download() {
    const all = await myDB.getAllBlobs();
    const data = await fixDurationTime(all.map(d => d.data));
    const url = URL.createObjectURL(new Blob([data], { type: `video/${format}` }));
    const  a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';
    a.download='record.' + format;
    a.click();
    return true;
}

function init() {

    const start = document.getElementById('startRecord');
    start.onclick = () => {
        console.log('---start record----')
        startRecord();
    }

    const stop = document.getElementById('stopRecord');
    stop.onclick = () => {
        stopRecord();
    }

    const pause = document.getElementById('pauseRecord');
    pause.onclick = () => {
        pauseRecord();
    }

    const resume = document.getElementById('resumeRecord');
    resume.onclick = () => {
        resumeRecord();
    }

    const replayBtn = document.getElementById('replayRecord');
    replayBtn.onclick = () => {
        replay();
    }

    const downloadBtn = document.getElementById('downloadRecord');
    downloadBtn.onclick = () => {
        download();
    }

    const timeBlock = document.getElementById('timeBlock');
    const update = () => {
        if(localStorage.getItem('webRecordStartTime') && localStorage.getItem("webRecording") == 'true'){
            let webRecordDuration = localStorage.getItem("webRecordDuration") ? Number(localStorage.getItem("webRecordDuration")) : 0;
            webRecordDuration += (Date.now() - Number(localStorage.getItem("webRecordStartTime"))) / 1000;
            timeBlock.innerHTML = `${webRecordDuration}s`;
        }
    }
    setInterval(() =>{ update()}, 100);
}
init();