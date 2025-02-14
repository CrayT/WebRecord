/**
 * 主进程
 */
const { app, BrowserWindow, ipcMain, Menu, desktopCapturer, session, systemPreferences, dialog, shell } = require('electron');
const path = require('node:path')

const createWindow = () => {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js')
      },
    });

    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
      desktopCapturer.getSources({types: ['screen',]}).then((sources) => {
        console.log('source', sources)
        callback({video: sources[0]})
      })
    }, {useSystemPicker: true});

    
    const menu = Menu.buildFromTemplate([
      {
        label: app.name,
        submenu: [
          {
            click: () => win.webContents.send('test-test', 1),
            label: '没啥用'
          },
        ]
      }
  
    ])
    Menu.setApplicationMenu(menu);

    win.loadFile('./recorder/index.html')
    win.webContents.openDevTools();
}

// 主进程监听set-title函数，让渲染进程通过预加载脚本向其暴露的setTitle函数主动修改窗口title
function setTitle(event, title){
  const webContents = event.sender;
  const win = BrowserWindow.fromWebContents(webContents)
  win.setTitle(title)
}

async function checkPrevilage() {
  const devicePrivilege = systemPreferences.getMediaAccessStatus('screen');
  console.log('checkPrevilage: ', devicePrivilege)
  if(devicePrivilege !== 'granted') {
    const res = await dialog.showMessageBox({
      type: "info",
      title: "需要开启录屏权限",
      message: "在系统设置中开启录屏权限",
      buttons: ['打开系统录屏设置', '取消'],
    });
    if(res.response === 0) {
      // 适用mac
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
    }
  }
  return devicePrivilege;
}

app.whenReady().then(async () => {
    // 检查权限
    ipcMain.handle('check-access', checkPrevilage);

    ipcMain.on('set-title', setTitle);

    createWindow();
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
});