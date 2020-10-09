const { app, Menu } = require('electron')
const { isMac } = require('../../common/utils')

if (isMac) {
  const template = [
    {
      label: app.getName(),
      submenu: [
        { label: '关于洛雪音乐', role: 'about' },
        { type: 'separator' },
        { label: '隐藏', role: 'hide' },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'Command+Q',
          click() {
            global.isQuitting = true
            app.quit()
          },
        },
      ],
    },
    {
      label: '窗口',
      role: 'window',
      submenu: [
        { label: '最小化', role: 'minimize', accelerator: 'Command+W' },
        { label: '关闭', role: 'close' },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'Command+Z', role: 'undo' },
        { label: '恢复', accelerator: 'Shift+Command+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'Command+X', role: 'cut' },
        { label: '复制', accelerator: 'Command+C', role: 'copy' },
        { label: '粘贴', accelerator: 'Command+V', role: 'paste' },
        { label: '选择全部', accelerator: 'Command+A', role: 'selectAll' },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
} else {
  Menu.setApplicationMenu(null)
}
