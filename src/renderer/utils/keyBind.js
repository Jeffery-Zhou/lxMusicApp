import { isMac } from '../../common/utils'

const downKeys = new Set()

const handleEvent = (type, event, keys) => {
  if (isMac) {
    let index = keys.indexOf('meta')
    if (index > -1) keys.splice(index, 1, 'mod')
  } else {
    let index = keys.indexOf('ctrl')
    if (index > -1) keys.splice(index, 1, 'mod')
  }
  let key = keys.join('+')

  switch (type) {
    case 'down':
      downKeys.add(key)
      break
    case 'up':
      downKeys.delete(key)
      break
  }
  handleSendEvent(key, type, event, keys)
}

// 修饰键处理
const eventModifiers = event => {
  let modifiers = []
  if (event.ctrlKey) modifiers.push('ctrl')
  if (event.shiftKey) modifiers.push('shift')
  if (event.altKey) modifiers.push('alt')
  if (event.metaKey) modifiers.push('meta')

  return modifiers
}

// 是否忽略事件（表单元素等默认忽略）
const assertStopCallback = element => {
  // if the element has the class "keybind" then no need to stop
  if (element.classList.contains('key-bind')) return false

  // stop for input, select, and textarea
  switch (element.tagName) {
    case 'INPUT':
    case 'SELECT':
    case 'TEXTAREA':
      return true
    default:
      return element.isContentEditable
  }
}

const handleKeyDown = event => {
  if (assertStopCallback(event.target)) return
  // event.preventDefault()
  let keys = eventModifiers(event)
  switch (event.key) {
    case 'Control':
    case 'Alt':
    case 'Meta':
    case 'Shift':
      break
    case ' ':
      keys.push('space')
      break
    default:
      keys.push((event.code.includes('Numpad') ? event.code.replace(/^Numpad(\w{1,3})\w*$/i, 'num$1') : event.key).toLowerCase())
      break
  }
  handleEvent('down', event, keys)
}

const handleKeyUp = event => {
  if (assertStopCallback(event.target)) return
  event.preventDefault()
  let keys = eventModifiers(event)
  switch (event.key) {
    case 'Control':
      keys.push('ctrl')
      break
    case ' ':
      keys.push('space')
      break
    default:
      keys.push((event.code.includes('Numpad') ? event.code.replace(/^Numpad(\w{1,3})\w*$/i, 'num$1') : event.key).toLowerCase())
      break
  }
  handleEvent('up', event, keys)
}

let handleSendEvent

const bindKey = (handle = () => {}) => {
  handleSendEvent = handle
  document.addEventListener('keydown', handleKeyDown)
  document.addEventListener('keyup', handleKeyUp)
}

const unbindKey = () => {
  document.removeEventListener('keydown', handleKeyDown)
  document.removeEventListener('keyup', handleKeyUp)
}

const clearDownKeys = () => {
  let keys = Array.from(downKeys)
  for (let i = keys.length - 1; i > -1; i--) {
    handleSendEvent(keys[i], 'up')
  }
  downKeys.clear()
}

export default {
  bindKey,
  unbindKey,
  clearDownKeys,
}
