import fs from 'fs'
import path from 'path'
import { shell, clipboard } from 'electron'
import crypto from 'crypto'
import { rendererSend, rendererInvoke, NAMES } from '../../common/ipc'

/**
 * 获取两个数之间的随机整数，大于等于min，小于max
 * @param {*} min
 * @param {*} max
 */
export const getRandom = (min, max) => Math.floor(Math.random() * (max - min)) + min


export const sizeFormate = size => {
  // https://gist.github.com/thomseddon/3511330
  if (!size) return '0 B'
  let units = ['B', 'KB', 'MB', 'GB', 'TB']
  let number = Math.floor(Math.log(size) / Math.log(1024))
  return `${(size / Math.pow(1024, Math.floor(number))).toFixed(2)} ${units[number]}`
}

export const formatPlayTime = time => {
  let m = parseInt(time / 60)
  let s = parseInt(time % 60)
  return m === 0 && s === 0 ? '--/--' : (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s)
}

export const formatPlayTime2 = time => {
  let m = parseInt(time / 60)
  let s = parseInt(time % 60)
  return (m < 10 ? '0' + m : m) + ':' + (s < 10 ? '0' + s : s)
}

export const b64DecodeUnicode = str => {
  // Going backwards: from bytestream, to percent-encoding, to original string.
  return decodeURIComponent(window.atob(str).split('').map(function(c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
  }).join(''))
}

const encodeNames = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
}
export const decodeName = str => str.replace(/(?:&amp;|&lt;|&gt;|&quot;|&apos;)/g, s => encodeNames[s])

const easeInOutQuad = (t, b, c, d) => {
  t /= d / 2
  if (t < 1) return (c / 2) * t * t + b
  t--
  return (-c / 2) * (t * (t - 2) - 1) + b
}
const handleScroll = (element, to, duration = 300, fn = () => {}) => {
  if (!element) return fn()
  const start = element.scrollTop || element.scrollY || 0
  let cancel = false
  if (to > start) {
    let maxScrollTop = element.scrollHeight - element.clientHeight
    if (to > maxScrollTop) to = maxScrollTop
  } else if (to < start) {
    if (to < 0) to = 0
  } else return fn()
  const change = to - start
  const increment = 10
  if (!change) return fn()

  let currentTime = 0
  let val

  const animateScroll = () => {
    currentTime += increment
    val = parseInt(easeInOutQuad(currentTime, start, change, duration))
    if (element.scrollTo) {
      element.scrollTo(0, val)
    } else {
      element.scrollTop = val
    }
    if (currentTime < duration) {
      if (cancel) return fn()
      setTimeout(animateScroll, increment)
    } else {
      fn()
    }
  }
  animateScroll()
  return () => {
    cancel = true
  }
}
/**
 * 设置滚动条位置
 * @param {*} element 要设置滚动的容器 dom
 * @param {*} to 滚动的目标位置
 * @param {*} duration 滚动完成时间 ms
 * @param {*} fn 滚动完成后的回调
 * @param {*} delay 延迟执行时间
 */
export const scrollTo = (element, to, duration = 300, fn = () => {}, delay) => {
  let cancelFn
  let timeout
  if (delay) {
    let scrollCancelFn
    cancelFn = () => {
      timeout == null ? scrollCancelFn && scrollCancelFn() : clearTimeout(timeout)
    }
    timeout = setTimeout(() => {
      timeout = null
      scrollCancelFn = handleScroll(element, to, duration, fn, delay)
    }, delay)
  } else {
    cancelFn = handleScroll(element, to, duration, fn, delay)
  }
  return cancelFn
}

/**
 * 检查路径是否存在
 * @param {*} path 路径
 */
export const checkPath = (path) => new Promise(resolve => {
  fs.access(path, fs.constants.F_OK, err => {
    if (err) return resolve(false)
    resolve(true)
  })
})

/**
 * 选择路径
 * @param {*} 选项
 */
export const selectDir = options => rendererInvoke(NAMES.mainWindow.select_dir, options)

/**
 * 打开保存对话框
 * @param {*} 选项
 */
export const openSaveDir = options => rendererInvoke(NAMES.mainWindow.show_save_dialog, options)

/**
 * 在资源管理器中打开目录
 * @param {*} dir
 */
export const openDirInExplorer = dir => {
  shell.showItemInFolder(dir)
}

// https://stackoverflow.com/a/53387532
export const compareVer = (currentVer, targetVer) => {
  // treat non-numerical characters as lower version
  // replacing them with a negative number based on charcode of each character
  const fix = s => `.${s.toLowerCase().charCodeAt(0) - 2147483647}.`

  currentVer = ('' + currentVer).replace(/[^0-9.]/g, fix).split('.')
  targetVer = ('' + targetVer).replace(/[^0-9.]/g, fix).split('.')
  let c = Math.max(currentVer.length, targetVer.length)
  for (let i = 0; i < c; i++) {
    // convert to integer the most efficient way
    currentVer[i] = ~~currentVer[i]
    targetVer[i] = ~~targetVer[i]
    if (currentVer[i] > targetVer[i]) return 1
    else if (currentVer[i] < targetVer[i]) return -1
  }
  return 0
}

export const isObject = item => item && typeof item === 'object' && !Array.isArray(item)

/**
 * 对象深度合并
 * @param  {} target 要合并源对象
 * @param  {} source 要合并目标对象
 */
export const objectDeepMerge = (target, source, mergedObj) => {
  if (!mergedObj) {
    mergedObj = new Set()
    mergedObj.add(target)
  }
  let base = {}
  Object.keys(source).forEach(item => {
    if (isObject(source[item])) {
      if (mergedObj.has(source[item])) return
      if (!isObject(target[item])) target[item] = {}
      mergedObj.add(source[item])
      objectDeepMerge(target[item], source[item], mergedObj)
      return
    }
    base[item] = source[item]
  })
  Object.assign(target, base)
}

/**
 * 在浏览器打开URL
 * @param {*} url
 */
export const openUrl = url => {
  shell.openExternal(url)
}

/**
 * 设置标题
 */
let dom_title = document.getElementsByTagName('title')[0]
export const setTitle = (title = '洛雪音乐助手') => {
  dom_title.innerText = title
}


/**
 * 创建 MD5 hash
 * @param {*} str
 */
export const toMD5 = str => crypto.createHash('md5').update(str).digest('hex')

/**
 * 复制文本到剪贴板
 * @param {*} str
 */
export const clipboardWriteText = str => clipboard.writeText(str)

/**
 * 从剪贴板读取文本
 * @param {*} str
 */
export const clipboardReadText = str => clipboard.readText()

/**
 * 设置音频 meta 信息
 * @param {*} filePath
 * @param {*} meta
 */
export const setMeta = (filePath, meta) => {
  rendererSend(NAMES.mainWindow.set_music_meta, { filePath, meta })
}

/**
 * 保存歌词文件
 * @param {*} filePath
 * @param {*} lrc
 */
export const saveLrc = (filePath, lrc) => {
  fs.writeFile(filePath, lrc, 'utf8', err => {
    if (err) console.log(err)
  })
}

/**
 * 生成节流函数
 * @param {*} fn
 * @param {*} delay
 */
export const throttle = (fn, delay = 100) => {
  let timer = null
  let _args = null
  return function(...args) {
    _args = args
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      fn.apply(this, _args)
    }, delay)
  }
}

/**
 * 生成防抖函数
 * @param {*} fn
 * @param {*} delay
 */
export const debounce = (fn, delay = 100) => {
  let timer = null
  let _args = null
  return function(...args) {
    _args = args
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn.apply(this, _args)
    }, delay)
  }
}

const async_removeItem = (arr, num, callback) => window.requestAnimationFrame(() => {
  let len = arr.length
  if (len > num) {
    arr.splice(0, num)
    return async_removeItem(arr, num, callback)
  } else {
    arr.splice(0, len)
    return callback()
  }
})
const async_addItem = (arr, newArr, num, callback) => window.requestAnimationFrame(() => {
  let len = newArr.length
  if (len > num) {
    arr.push(...newArr.splice(0, num))
    return async_addItem(arr, newArr, num, callback)
  } else {
    arr.push(...newArr.splice(0, len))
    return callback()
  }
})
/**
 * 异步设置数组
 * @param {*} from 原数组
 * @param {*} to 设置后的数组内容
 * @param {*} num 每次设置的个数
 */
export const asyncSetArray = (from, to, num = 100) => new Promise(resolve => {
  async_removeItem(from, num, () => {
    async_addItem(from, Array.from(to), num, () => {
      resolve()
    })
  })
})

/**
 * 获取缓存大小
 */
export const getCacheSize = () => rendererInvoke(NAMES.mainWindow.get_cache_size)

/**
 * 清除缓存
 */
export const clearCache = () => rendererInvoke(NAMES.mainWindow.clear_cache)

/**
 * 设置窗口大小
 * @param {*} width
 * @param {*} height
 */
export const setWindowSize = (width, height) => rendererSend(NAMES.mainWindow.set_window_size, { width, height })


export const getProxyInfo = () => window.globalObj.proxy.enable
  ? `http://${window.globalObj.proxy.username}:${window.globalObj.proxy.password}@${window.globalObj.proxy.host}:${window.globalObj.proxy.port};`
  : undefined


export const assertApiSupport = source => window.globalObj.qualityList[source] != undefined

export const getSetting = () => rendererInvoke(NAMES.mainWindow.get_setting)
export const saveSetting = () => rendererInvoke(NAMES.mainWindow.set_app_setting)

export const getPlayList = () => rendererInvoke(NAMES.mainWindow.get_playlist).catch(error => {
  rendererInvoke(NAMES.mainWindow.get_data_path).then(dataPath => {
    let filePath = path.join(dataPath, 'playList.json.bak')
    rendererInvoke(NAMES.mainWindow.show_dialog, {
      type: 'error',
      message: window.i18n.t('store.state.load_list_file_error_title'),
      detail: window.i18n.t('store.state.load_list_file_error_detail', {
        path: filePath,
        detail: error.message,
      }),
    }).then(() => openDirInExplorer(filePath))
  })
  return rendererInvoke(NAMES.mainWindow.get_playlist, true)
})

