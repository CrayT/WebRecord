import React, {useEffect, useRef} from 'react';
import {Button}  from 'antd';
import styles from './index.module.less';
export const ScreenShare = () => {
    const canvasRef = useRef<HTMLVideoElement>(null);

    // 用于MediaSource和SourceBuffer的ref
    const mediaSourceRef = useRef<MediaSource | null>(null);
    const sourceBufferRef = useRef<SourceBuffer | null>(null);
    const bufferQueueRef = useRef<Uint8Array[]>([]);

    // 初始化MediaSource并绑定到video
    const setupReceiver = () => {
        if (!canvasRef.current) return;
        const mediaSource = new MediaSource();
        mediaSourceRef.current = mediaSource;
        canvasRef.current.src = URL.createObjectURL(mediaSource);

        mediaSource.addEventListener('sourceopen', () => {
            // 注意：codecs要和发送端一致
            const mime = 'video/webm; codecs=vp8';
            const sourceBuffer = mediaSource.addSourceBuffer(mime);
            sourceBufferRef.current = sourceBuffer;
            // 处理SourceBuffer的updateend事件，保证队列中的数据都能被append
            sourceBuffer.addEventListener('updateend', () => {
                console.log('updateend',)
                if (bufferQueueRef.current.length > 0 && !sourceBuffer.updating) {
                    const chunk = bufferQueueRef.current.shift();
                    if (chunk) {
                        console.log('updating',)
                        sourceBuffer.appendBuffer(chunk);
                    }
                }
            });
        });
    };
    useEffect(() => {
        setupReceiver()
    });
    const handleData = (data: any) => {
        if (data instanceof ArrayBuffer) {
            // 将收到的数据推入SourceBuffer
            if (mediaSourceRef.current && sourceBufferRef.current) {
                console.log('mediaSourceRef.current')
                if (!sourceBufferRef.current.updating) {
                    sourceBufferRef.current.appendBuffer(new Uint8Array(data));
                } else {
                    // 如果正在更新，暂存数据
                    bufferQueueRef.current.push(new Uint8Array(data));
                }
                canvasRef.current?.play();
            }
        }
    }
    // 测试开启录屏并实时显示
    const handleTestShare = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                    frameRate: 24,
                    width: 1980,
                    height: 1020,
                },
                audio: false,
            });
            // 使用MediaRecorder将流编码为webm数据块
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp8' });
            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    // 读取Blob为ArrayBuffer后发送
                    const reader = new FileReader();
                    reader.onload = function() {
                        console.log(reader.result)
                        handleData(reader.result);
                    };
                    reader.readAsArrayBuffer(event.data);
                }
            };
            mediaRecorder.start(100); // 每100ms发送一次数据
            // 可选：在流结束时关闭WebSocket
            stream.getVideoTracks()[0].onended = () => {
                mediaRecorder.stop();
            };
        } catch (e) {
            console.error('录屏失败: ', e);
        }
    };

    return (<div className={styles['screen-wrapper']}>
        <Button onClick={handleTestShare} >测试</Button>
        <div className={styles['canvas']}>
            <video ref={canvasRef}></video>
        </div>
    </div>);
}