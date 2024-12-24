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
    ubuntu：没有该项设置, 但是不报错。
    ps: Screenity插件可以录制整个屏幕，但也要弹窗指定录制窗口，底下也有悬浮窗。

- CPU占用高
    - mac上10%左右，ubuntu到100%。。。

### 非localhost访问(外部ip访问)会提示getDisplayMedia为undefined，原因为chrome安全性问题，只能以localhost方式或https或者file://形式安全访问
解决办法：
打开 chrome://flags/#unsafely-treat-insecure-origin-as-secure
将该 flag 切换成 enable 状态
输入框中填写需要开启的域名，譬如 "http://10.xxx.xxx.xxx:8080"，多个以逗号相连,(必须是http://ip:port形式)
点击右下角 Relaunch 按钮，或者重启后生效


### 存储
- 保存在浏览器的indexDB中，优势
    - 存储无上限，对象存储
    - 持久化
    - 同源限制
    - 可存储二进制数据，如ArrayBuffer和Blob对象
    - 有丰富API提供使用
    - 异步操作