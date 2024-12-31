import { myDB } from "./indexDB.js";
import {fixWebmDuration} from "./fix-webm-duration.js";
import { base64ToUint8Array, blobToBase64 } from "./util.js";

const blobs = [];
let mediaRecorder;
window.currentBlob = blobs;

const format = 'webm';

let grouId = Math.random().toString(30).slice(-8); // 8位随机字符串
const filter = function(data){
    return data.type === 'origin';
}

async function readyWork() {
    if(localStorage.getItem("webRecording") == 'true'){
        // 2，将已存的数据保存为webm
        await downloadBase64(); //download()
        const blobs = await mergeBatchBlobs();
        await deleteBlobs(blobs);
        // 4, 继续录制
        startRecord();
    } else {
        // 清空数据库数据
        await myDB.clearAll();
    }
}
readyWork();

function replay(data) {
    console.log('blobs', data, blobs)
    const video = document.querySelector('video');
    video.src = URL.createObjectURL(new Blob(data ? data : blobs, {type: 'video/webm'}));
    video.play();
}
function pauseRecord() {
    mediaRecorder && mediaRecorder.pause();
}
function resumeRecord() {
    mediaRecorder && mediaRecorder.resume();
}
async function stopRecord() {
    localStorage.setItem("webRecording", false);
    localStorage.setItem("webRecordStopTime", Date.now());
    mediaRecorder && mediaRecorder.stream.getVideoTracks()[0].stop();
    // await download(); // test
    const blobs = await mergeBatchBlobs();
    replay();
}

window.addEventListener('unload', function (e) {
    e.preventDefault();
    // 刷新后设置当前时刻时间即当前被动结束录制时间
    localStorage.setItem("webRecordStopTime", Date.now());
    mediaRecorder && mediaRecorder.stream.getVideoTracks()[0].stop();
});

async function startRecord() {
    // 非录制中时，清空db
    if(localStorage.getItem("webRecording") !== 'true') {
        await myDB.clearAll();
    }
    blobs.length = 0;
    // getUserMedia // 摄像头
    // getDisplayMedia // 屏幕
    // getUserMedia({video: {mediaSource: 'screen'}}) // fireFox的调用方法
    navigator.mediaDevices.getDisplayMedia(
        {
            video: 
                {
                    frameRate: 24,
                    displaySurface: 'monitor', //"monitor", // 屏幕录屏
                    width: {
                        ideal: 1980,
                        max: 1980,
                    },
                    height: {
                        ideal: 1020,
                        max: 1020,
                    },
                },
            audio: false,
        }
    )
    .then(stream => {
        localStorage.setItem("webRecordStartTime", Date.now());
        localStorage.setItem("webRecording", true);
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
        mediaRecorder.ondataavailable = (event) => {
            console.log('data', event);
            if(event.data && event.data.size > 0 && localStorage.getItem("webRecording") == 'true'){
                blobs.push(event.data);
                myDB.addBlob({
                    chunk_id: Date.now(), // 用递增的时间戳作为主键
                    data: event.data,
                    group_id: grouId,
                    type: 'origin',
                });
            }
        }
        mediaRecorder.start(1000);
    });
}

async function fixDurationTime(blobs) {
    return new Promise((resolve, _reject) => {
        console.log('fix duration time:', blobs)
        const blob = new Blob(blobs, {
            type: "video/webm"
        });
        const durationTime = Number(localStorage.getItem("webRecordStopTime")) -  Number(localStorage.getItem("webRecordStartTime"))
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

async function mergeBatchBlobs() {
    const blobs = await myDB.getAllBlobs(filter);
    console.log('mergeBatchBlobs:', blobs);
    if(blobs.length) {
        // 先合并上一次的数据
        await myDB.addBlob({
            chunk_id: Date.now(),
            data: new Blob(blobs.map(d => d.data), {type: blobs[0].data.type}),
            type: 'batch',
            duration: Number(localStorage.getItem("webRecordStopTime")) -  Number(localStorage.getItem("webRecordStartTime")),
        });
    }
    return blobs;
    // 再把合并后的数据删除
    // await myDB.deleteObjectsById(blobs.map(d => d.chunk_id));
}
async function deleteBlobs(blobs) {
    await myDB.deleteObjectsById(blobs.map(d => d.chunk_id));
}

async function download() {
    const all = await myDB.getAllBlobs(filter);
    const data = await fixDurationTime(all.map(d => d.data));
    const url = URL.createObjectURL(new Blob([data], { type: `video/${format}` }));
    const  a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';
    a.download='record.' + format;
    a.click();
    return true;
}

async function downloadBase64() {
    const all = await myDB.getAllBlobs(filter);
    const data = await fixDurationTime(all.map(d => d.data));
    // const base64 = await blobToBase64(data);
    const url = URL.createObjectURL(new Blob([data],{ type: `video/webm` }));
    const  a = document.createElement('a');
    a.href = url;
    a.style.display = 'none';
    a.download='record.' + 'webm';
    a.click();
    return true;
}
function init() {
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
            timeBlock.innerHTML = `${(Date.now() - localStorage.getItem('webRecordStartTime')) / 1000}s`;
        }
    }
    setInterval(() =>{ update()}, 1000);
}
init();