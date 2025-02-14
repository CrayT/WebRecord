/**
 * 预加载脚本可安全地暴露部分api至渲染进程，
 * To add features to your renderer that require privileged access, you can define global objects through the contextBridge API.
 */
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  
  // invoke-handle处理双向数据：渲染进程 <-> 主进程
  checkAccess: () => ipcRenderer.invoke('check-access'),
  // on-send处理单向数据：渲染进程 -> 主进程
  setTitle: (title) => ipcRenderer.send('set-title', title),

  onUpdateCounter: (cb) => ipcRenderer.on('test-test', (_event, value) => cb(value) ),

})