const { BrowserWindow } = require('electron')
const { winLyric: WIN_LYRIC_EVENT_NAME } = require('../../events/_name')
const { debounce } = require('../../../common/utils')
const { getLyricWindowBounds } = require('./utils')

require('./event')
require('./rendererEvent')

global.lx_event.winLyric.on(WIN_LYRIC_EVENT_NAME.create, () => {
  createWindow()
})
global.lx_event.winLyric.on(WIN_LYRIC_EVENT_NAME.close, () => {
  closeWindow()
})

let winURL = global.isDev ? 'http://localhost:9081/lyric.html' : `file://${__dirname}/lyric.html`

const setLyricsConfig = debounce(config => {
  // if (x != null) bounds.x = x
  // if (y != null) bounds.y = y
  // if (width != null) bounds.width = width
  // if (height != null) bounds.height = height
  global.lx_event.common.setAppConfig({ desktopLyric: config }, WIN_LYRIC_EVENT_NAME.name)
}, 500)

const winEvent = lyricWindow => {
  // let bounds
  // lyricWindow.on('close', event => {
  //   if (global.isQuitting || !global.appSetting.tray.isToTray || (!isWin && !global.isTrafficLightClose)) {
  //     lyricWindow.setProgressBar(-1)
  //     return
  //   }

  //   if (global.isTrafficLightClose) global.isTrafficLightClose = false
  //   event.preventDefault()
  //   lyricWindow.hide()
  // })

  lyricWindow.on('closed', () => {
    lyricWindow = global.modules.lyricWindow = null
  })


  lyricWindow.on('move', event => {
    // bounds = lyricWindow.getBounds()
    // console.log(bounds)
    setLyricsConfig(lyricWindow.getBounds())
  })

  lyricWindow.on('resize', event => {
    // bounds = lyricWindow.getBounds()
    // console.log(bounds)
    setLyricsConfig(lyricWindow.getBounds())
  })

  // lyricWindow.on('restore', () => {
  //   lyricWindow.webContents.send('restore')
  // })
  // lyricWindow.on('focus', () => {
  //   lyricWindow.webContents.send('focus')
  // })

  lyricWindow.once('ready-to-show', () => {
    lyricWindow.show()
    if (global.appSetting.desktopLyric.isLock) {
      global.modules.lyricWindow.setIgnoreMouseEvents(true, { forward: false })
    }
  })
}

const createWindow = () => {
  if (global.modules.lyricWindow) return
  if (!global.appSetting.desktopLyric.enable) return
  // const windowSizeInfo = getWindowSizeInfo(global.appSetting)
  let { x, y, width, height, isAlwaysOnTop } = global.appSetting.desktopLyric
  let { width: screenWidth, height: screenHeight } = global.envParams.workAreaSize
  if (x == null) {
    x = screenWidth - width
    y = screenHeight - height
  }
  if (global.appSetting.desktopLyric.isLockScreen) {
    let bounds = getLyricWindowBounds({ x, y, width, height }, { x: null, y: null, w: width, h: height })
    x = bounds.x
    y = bounds.y
    width = bounds.width
    height = bounds.height
  }
  /**
   * Initial window options
   */
  global.modules.lyricWindow = new BrowserWindow({
    height,
    width,
    x,
    y,
    minWidth: 380,
    minHeight: 80,
    useContentSize: true,
    frame: false,
    transparent: true,
    enableRemoteModule: false,
    // icon: path.join(global.__static, isWin ? 'icons/256x256.ico' : 'icons/512x512.png'),
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    alwaysOnTop: isAlwaysOnTop,
    skipTaskbar: true,
    webPreferences: {
      // contextIsolation: true,
      webSecurity: !global.isDev,
      nodeIntegration: true,
    },
  })

  global.modules.lyricWindow.loadURL(winURL)

  winEvent(global.modules.lyricWindow)
  // mainWindow.webContents.openDevTools()
}

const closeWindow = () => {
  if (!global.modules.lyricWindow) return
  global.modules.lyricWindow.close()
}
