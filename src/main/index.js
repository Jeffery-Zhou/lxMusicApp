const { app, BrowserWindow, shell } = require('electron')
const path = require('path')

// 单例应用程序
if (!app.requestSingleInstanceLock()) {
  app.quit()
  return
}
if (!global.modules) global.modules = {}
app.on('second-instance', (event, argv, cwd) => {
  if (global.modules.mainWindow) {
    if (global.modules.mainWindow.isMinimized()) {
      global.modules.mainWindow.restore()
    }
    if (global.modules.mainWindow.isVisible()) {
      global.modules.mainWindow.focus()
    } else {
      global.modules.mainWindow.show()
    }
  } else {
    app.quit()
  }
})

const isDev = global.isDev = process.env.NODE_ENV !== 'production'
require('./env')
const { navigationUrlWhiteList } = require('../common/config')
const { getWindowSizeInfo } = require('./utils')
const { isMac, isLinux, initSetting, initHotKey } = require('../common/utils')


// https://github.com/electron/electron/issues/22691
app.commandLine.appendSwitch('wm-window-animations-disabled')

// https://github.com/electron/electron/issues/18397
// 开发模式下为true时 多次引入native模块会导致渲染进程卡死
// https://github.com/electron/electron/issues/22791
app.allowRendererProcessReuse = !isDev


app.on('web-contents-created', (event, contents) => {
  contents.on('will-navigate', (event, navigationUrl) => {
    if (isDev) return console.log('navigation to url:', navigationUrl)
    if (!navigationUrlWhiteList.some(url => url.test(navigationUrl))) return event.preventDefault()
    console.log('navigation to url:', navigationUrl)
  })
  contents.on('new-window', async(event, navigationUrl) => {
    event.preventDefault()
    if (/^devtools/.test(navigationUrl)) return
    console.log(navigationUrl)
    await shell.openExternal(navigationUrl)
  })
  contents.on('will-attach-webview', (event, webPreferences, params) => {
    // Strip away preload scripts if unused or verify their location is legitimate
    delete webPreferences.preload
    delete webPreferences.preloadURL

    // Disable Node.js integration
    webPreferences.nodeIntegration = false

    // Verify URL being loaded
    if (!navigationUrlWhiteList.some(url => url.test(params.src))) {
      event.preventDefault()
    }
  })
})


require('../common/error')
require('./events')
require('./event')
require('./rendererEvents')
const winEvent = require('./rendererEvents/winEvent')
const autoUpdate = require('./utils/autoUpdate')


let winURL

if (isDev) {
  // eslint-disable-next-line no-undef
  global.__static = __static
  winURL = 'http://localhost:9080'
} else {
  global.__static = path.join(__dirname, '/static')
  winURL = `file://${__dirname}/index.html`
}

function createWindow() {
  const windowSizeInfo = getWindowSizeInfo(global.appSetting)
  /**
   * Initial window options
   */
  global.modules.mainWindow = new BrowserWindow({
    height: windowSizeInfo.height,
    useContentSize: true,
    width: windowSizeInfo.width,
    frame: false,
    transparent: !isLinux && !global.envParams.nt,
    enableRemoteModule: false,
    // icon: path.join(global.__static, isWin ? 'icons/256x256.ico' : 'icons/512x512.png'),
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    webPreferences: {
      // contextIsolation: true,
      webSecurity: !isDev,
      nodeIntegration: true,
    },
  })

  global.modules.mainWindow.loadURL(winURL)

  winEvent(global.modules.mainWindow)
  // global.modules.mainWindow.webContents.openDevTools()

  if (!isDev) autoUpdate()
}

global.appHotKey = {
  enable: true,
  config: {},
  state: null,
}

function init() {
  const info = initSetting()
  global.appSetting = info.setting
  global.appSettingVersion = info.version
  global.appHotKey.config = initHotKey()
  global.lx_event.common.initSetting()
  global.lx_event.hotKey.init()
  createWindow()
}

app.on('ready', init)

app.on('activate', () => {
  if (global.modules.mainWindow) {
    if (global.modules.mainWindow.isMinimized()) {
      global.modules.mainWindow.restore()
    } else if (global.modules.mainWindow.isVisible()) {
      global.modules.mainWindow.focus()
    } else {
      global.modules.mainWindow.show()
    }
  } else if (global.modules.mainWindow === null) {
    init()
  }
})

app.on('window-all-closed', () => {
  if (isMac) {
    global.lx_event.tray.destroy()
  } else {
    app.quit()
  }
})

require('./modules')
