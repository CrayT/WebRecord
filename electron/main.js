/**
 * 主进程
 */
const { app, BrowserWindow, ipcMain, Menu, WebContentsView, desktopCapturer, session, systemPreferences, dialog, shell } = require('electron');
const path = require('node:path')

const createWindow = () => {
    const win = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    // 开启支持SharedArrayBuffer
    win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      details.responseHeaders['Cross-Origin-Opener-Policy'] = ['same-origin'];
      details.responseHeaders['Cross-Origin-Embedder-Policy'] = ['require-corp'];
      callback({ responseHeaders: details.responseHeaders });
  });

    win.on('resize', (e) => {
      console.log(win.getSize());
    })
    // 多页面同时渲染
    const view1 = new WebContentsView()
    win.contentView.addChildView(view1)
    view1.webContents.loadURL('https://electronjs.org')
    view1.setBounds({ x: 0, y: 0, width: 800, height: 400 })


    const view2 = new WebContentsView({
      resizable: true,
      movable: true,
      // parent:win,
      frame: false,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
      },
    })
    // win.contentView.addChildView(view2)
    view2.webContents.loadFile('./recorder/index.html')
    view2.setBounds({ x: 0, y: 0, width: 400, height: 400 })
    view2.webContents.openDevTools();

    const moveableWin = new BrowserWindow({
      parent: win,
      width: 400,
      height: 400,
      movable: true,
      resizable: true,
      frame: false,
      webPreferences:{

      }
    });
    moveableWin.contentView.addChildView(view2);

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

    // win.loadFile('./recorder/index.html')

    win.webContents.openDevTools();
}

// 主进程监听set-title函数，让渲染进程通过预加载脚本向其暴露的setTitle函数主动修改窗口title
function setTitle(event, title){
  const webContents = event.sender;
  const win = BrowserWindow.fromWebContents(webContents)
  win.setTitle(title)
}

async function checkPrevilage() {
  console.log('systemPreferences', systemPreferences)
  // systemPreferences.getMediaAccessStatus接口只在mac和windows上有效
  if(process.platform === 'linux') {
    return false;
  }
  const devicePrivilege = systemPreferences.getMediaAccessStatus('screen');
  console.log('checkPrevilage: ', devicePrivilege)
  if(devicePrivilege !== 'granted') {
    const res = await dialog.showMessageBox({
      type: "info",
      title: `${process.resourcesPath}`,
      message: `${process.resourcesPath}`,
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
  console.log("platform: ",process.platform)
  console.log("arch: ",process.arch)
  console.log('resourcesPath:',process.resourcesPath)
  console.log('app.getPath()', app.getPath('appData'))
  // 检查权限
  ipcMain.handle('check-access', checkPrevilage);

  ipcMain.on('set-title', setTitle);
  const res = await dialog.showMessageBox({
    type: "info",
    title: `${process.resourcesPath}`,
    message: `${process.resourcesPath}`,
    buttons: ['打开系统录屏设置', '取消'],
  });
  createWindow();

  app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
  });
  // 本地应用数据目录 通过app获取 
  // const localUserDataPath = app.getPath('userData');
  // console.log('userData: ', localUserDataPath)
}); 

app.on('window-all-closed', () => {
  console.log("quit: ",process.platform)
  if (process.platform !== 'darwin') app.quit()
});