# WebRecord
Web record demo by WebRtc.


### constrains
    - getDisplayMedia：
`
{
    video: 
        {
            frameRate: 24, // 帧率
            displaySurface: "monitor" //"window", // window默认窗口，monitor默认屏幕，不设置默认浏览器tab页
        },
    audio: false,
}
`

### 权限
- 提示NotAllowed permission权限error：
    mac：设置 -> 隐私 -> 录屏 -> 开启chrome权限
    ubuntu：没有该项设置，displaySurface为monitor时会报错。todo
    ps: Screenity插件可以录制整个屏幕，但也要弹窗指定录制窗口，底下也有悬浮窗。