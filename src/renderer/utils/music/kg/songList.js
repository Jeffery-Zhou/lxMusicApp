import { httpFetch } from '../../request'
import { formatPlayTime, sizeFormate } from '../../index'
import { toMD5 } from '../utils'

export default {
  _requestObj_tags: null,
  _requestObj_listInfo: null,
  _requestObj_list: null,
  _requestObj_listRecommend: null,
  _requestObj_listDetail: null,
  listDetailLimit: 10000,
  currentTagInfo: {
    id: undefined,
    info: undefined,
  },
  sortList: [
    {
      name: '推荐',
      id: '5',
    },
    {
      name: '最热',
      id: '6',
    },
    {
      name: '最新',
      id: '7',
    },
    {
      name: '热藏',
      id: '3',
    },
    {
      name: '飙升',
      id: '8',
    },
  ],
  regExps: {
    listData: /global\.data = (\[.+\]);/,
    listInfo: /global = {[\s\S]+?name: "(.+)"[\s\S]+?pic: "(.+)"[\s\S]+?};/,
    // https://www.kugou.com/yy/special/single/1067062.html
    listDetailLink: /^.+\/(\d+)\.html(?:\?.*|&.*$|#.*$|$)/,
  },
  getInfoUrl(tagId) {
    return tagId
      ? `http://www2.kugou.kugou.com/yueku/v9/special/getSpecial?is_smarty=1&cdn=cdn&t=5&c=${tagId}`
      : 'http://www2.kugou.kugou.com/yueku/v9/special/getSpecial?is_smarty=1&'
  },
  getSongListUrl(sortId, tagId, page) {
    if (tagId == null) tagId = ''
    return `http://www2.kugou.kugou.com/yueku/v9/special/getSpecial?is_ajax=1&cdn=cdn&t=${sortId}&c=${tagId}&p=${page}`
  },
  getSongListDetailUrl(id) {
    return `http://www2.kugou.kugou.com/yueku/v9/special/single/${id}-5-9999.html`
  },

  /**
   * 格式化播放数量
   * @param {*} num
   */
  formatPlayCount(num) {
    if (num > 100000000) return parseInt(num / 10000000) / 10 + '亿'
    if (num > 10000) return parseInt(num / 1000) / 10 + '万'
    return num
  },
  filterInfoHotTag(rawData) {
    const result = []
    if (rawData.status !== 1) return result
    for (const key of Object.keys(rawData.data)) {
      let tag = rawData.data[key]
      result.push({
        id: tag.special_id,
        name: tag.special_name,
        source: 'kg',
      })
    }
    return result
  },
  filterTagInfo(rawData) {
    const result = []
    for (const name of Object.keys(rawData)) {
      result.push({
        name,
        list: rawData[name].data.map(tag => ({
          parent_id: tag.parent_id,
          parent_name: tag.pname,
          id: tag.id,
          name: tag.name,
          source: 'kg',
        })),
      })
    }
    return result
  },

  getSongList(sortId, tagId, page, tryNum = 0) {
    if (this._requestObj_list) this._requestObj_list.cancelHttp()
    if (tryNum > 2) return Promise.reject(new Error('try max num'))
    this._requestObj_list = httpFetch(
      this.getSongListUrl(sortId, tagId, page),
    )
    return this._requestObj_list.promise.then(({ body }) => {
      if (!body || body.status !== 1) return this.getSongList(sortId, tagId, page, ++tryNum)
      return this.filterList(body.special_db)
    })
  },
  getSongListRecommend(tryNum = 0) {
    if (this._requestObj_listRecommend) this._requestObj_listRecommend.cancelHttp()
    if (tryNum > 2) return Promise.reject(new Error('try max num'))
    this._requestObj_listRecommend = httpFetch(
      'http://everydayrec.service.kugou.com/guess_special_recommend',
      {
        method: 'post',
        headers: {
          'User-Agent': 'KuGou2012-8275-web_browser_event_handler',
        },
        body: {
          appid: 1001,
          clienttime: 1566798337219,
          clientver: 8275,
          key: 'f1f93580115bb106680d2375f8032d96',
          mid: '21511157a05844bd085308bc76ef3343',
          platform: 'pc',
          userid: '262643156',
          return_min: 6,
          return_max: 15,
        },
      },
    )
    return this._requestObj_listRecommend.promise.then(({ body }) => {
      if (body.status !== 1) return this.getSongListRecommend(++tryNum)
      return this.filterList(body.data.special_list)
    })
  },
  filterList(rawData) {
    return rawData.map(item => ({
      play_count: item.total_play_count || this.formatPlayCount(item.play_count),
      id: 'id_' + item.specialid,
      author: item.nickname,
      name: item.specialname,
      time: item.publish_time || item.publishtime,
      img: item.img || item.imgurl,
      grade: item.grade,
      desc: item.intro,
      source: 'kg',
    }))
  },

  async createHttp(url, options, retryNum = 0) {
    if (retryNum > 2) throw new Error('try max num')
    let result
    try {
      result = await httpFetch(url, options).promise
    } catch (err) {
      console.log(err)
      return this.createHttp(url, options, ++retryNum)
    }
    // console.log(result.statusCode, result.body)
    if (result.statusCode !== 200 ||
      (
        (result.body.error_code !== undefined
          ? result.body.error_code
          : result.body.errcode !== undefined
            ? result.body.errcode
            : result.body.err_code
        ) !== 0)
    ) return this.createHttp(url, options, ++retryNum)
    return result.body.data || result.body.info
  },

  createTask(hashs) {
    let data = {
      appid: 1001,
      clienttime: 639437935,
      clientver: 9020,
      fields:
        'album_info,author_name,audio_info,ori_audio_name',
      is_publish: '1',
      key: '0475af1457cd3363c7b45b871e94428a',
      mid: '21511157a05844bd085308bc76ef3342',
      show_privilege: 1,
    }
    let list = hashs
    let tasks = []
    while (list.length) {
      tasks.push(Object.assign({ data: list.slice(0, 20) }, data))
      if (list.length < 20) break
      list = list.slice(20)
    }
    let url = 'http://kmr.service.kugou.com/v2/album_audio/audio'
    return tasks.map(task => this.createHttp(url, {
      method: 'POST',
      body: task,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
      },
    }).then(data => data.map(s => s[0])))
  },

  async getUserListDetailByCode(id) {
    const songInfo = await this.createHttp('http://t.kugou.com/command/', {
      method: 'POST',
      headers: {
        'KG-RC': 1,
        'KG-THash': 'network_super_call.cpp:3676261689:379',
        'User-Agent': '',
      },
      body: { appid: 1001, clientver: 9020, mid: '21511157a05844bd085308bc76ef3343', clienttime: 640612895, key: '36164c4015e704673c588ee202b9ecb8', data: id },
    })
    // console.log(songInfo)
    let songList
    let info = songInfo.info
    if (info.userid != null) {
      songList = await this.createHttp('http://www2.kugou.kugou.com/apps/kucodeAndShare/app/', {
        method: 'POST',
        headers: {
          'KG-RC': 1,
          'KG-THash': 'network_super_call.cpp:3676261689:379',
          'User-Agent': '',
        },
        body: { appid: 1001, clientver: 9020, mid: '21511157a05844bd085308bc76ef3343', clienttime: 640612895, key: '36164c4015e704673c588ee202b9ecb8', data: { id: info.id, type: 3, userid: info.userid, collect_type: 0, page: 1, pagesize: info.count } },
      })
      // console.log(songList)
    }
    let result = await Promise.all(this.createTask((songList || songInfo.list).map(item => ({ hash: item.hash })))).then(([...datas]) => datas.flat())
    return {
      list: this.filterData2(result) || [],
      page: 1,
      limit: info.count,
      total: info.count,
      source: 'kg',
      info: {
        name: info.name,
        img: (info.img_size && info.img_size.replace('{size}', 240)) || info.img,
        // desc: body.result.info.list_desc,
        author: info.username,
        // play_count: this.formatPlayCount(info.count),
      },
    }
  },

  async getUserListDetail3(chain, page) {
    const songInfo = await this.createHttp(`http://m.kugou.com/schain/transfer?pagesize=${this.listDetailLimit}&chain=${chain}&su=1&page=${page}&n=0.7928855356604456`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
      },
    })
    if (!songInfo.list) {
      if (songInfo.global_collection_id) return this.getUserListDetail2(songInfo.global_collection_id)
      else throw new Error('fail')
    }
    let result = await Promise.all(this.createTask(songInfo.list.map(item => ({ hash: item.hash })))).then(([...datas]) => datas.flat())
    // console.log(info, songInfo)
    return {
      list: this.filterData2(result) || [],
      page: 1,
      limit: this.listDetailLimit,
      total: songInfo.count,
      source: 'kg',
      info: {
        name: songInfo.info.name,
        img: songInfo.info.img,
        // desc: body.result.info.list_desc,
        author: songInfo.info.username,
        // play_count: this.formatPlayCount(info.count),
      },
    }
  },

  async getUserListDetail2(global_collection_id) {
    let id = global_collection_id
    if (id.length > 1000) throw new Error('get list error')
    let info = await this.createHttp('https://mobiles.kugou.com/api/v5/special/info_v2?appid=1058&specialid=0&global_specialid=' + id + '&format=jsonp&srcappid=2919&clientver=20000&clienttime=1586163242519&mid=1586163242519&uuid=1586163242519&dfid=-&signature=' + toMD5('NVPh5oo715z5DIWAeQlhMDsWXXQV4hwtappid=1058clienttime=1586163242519clientver=20000dfid=-format=jsonpglobal_specialid=' + id + 'mid=1586163242519specialid=0srcappid=2919uuid=1586163242519NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt'), {
      headers: {
        mid: '1586163242519',
        Referer: 'https://m3ws.kugou.com/share/index.php',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        dfid: '-',
        clienttime: '1586163242519',
      },
    })
    let songInfo = await this.createHttp('https://mobiles.kugou.com/api/v5/special/song_v2?appid=1058&global_specialid=' + id + '&specialid=0&plat=0&version=8000&pagesize=' + info.songcount + '&srcappid=2919&clientver=20000&clienttime=1586163263991&mid=1586163263991&uuid=1586163263991&dfid=-&signature=' + toMD5('NVPh5oo715z5DIWAeQlhMDsWXXQV4hwtappid=1058clienttime=1586163263991clientver=20000dfid=-global_specialid=' + id + 'mid=1586163263991pagesize=' + info.songcount + 'plat=0specialid=0srcappid=2919uuid=1586163263991version=8000NVPh5oo715z5DIWAeQlhMDsWXXQV4hwt'), {
      headers: {
        mid: '1586163263991',
        Referer: 'https://m3ws.kugou.com/share/index.php',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1',
        dfid: '-',
        clienttime: '1586163263991',
      },
    })
    let result = await Promise.all(this.createTask(songInfo.info.map(item => ({ hash: item.hash })))).then(([...datas]) => datas.flat())
    // console.log(info, songInfo)
    return {
      list: this.filterData2(result) || [],
      page: 1,
      limit: songInfo.total,
      total: songInfo.total,
      source: 'kg',
      info: {
        name: info.specialname,
        img: info.imgurl && info.imgurl.replace('{size}', 240),
        // desc: body.result.info.list_desc,
        author: info.nickname,
        // play_count: this.formatPlayCount(info.count),
      },
    }
  },

  async getUserListDetail(link, page, retryNum = 0) {
    if (retryNum > 3) return Promise.reject(new Error('link try max num'))
    if (link.includes('#')) link = link.replace(/#.*$/, '')
    if (link.includes('global_collection_id')) return this.getUserListDetail2(link.replace(/^.*?global_collection_id=(\w+)(?:&.*$|#.*$|$)/, '$1'))
    if (link.includes('chain=')) return this.getUserListDetail3(link.replace(/^.*?chain=(\w+)(?:&.*$|#.*$|$)/, '$1'), page)
    if (link.includes('.html')) {
      if (link.includes('zlist.html')) {
        link = link.replace(/^(.*)zlist\.html/, 'https://m3ws.kugou.com/zlist/list')
        if (link.includes('pagesize')) {
          link = link.replace('pagesize=30', 'pagesize=' + this.listDetailLimit).replace('page=1', 'page=' + page)
        } else {
          link += `&pagesize=${this.listDetailLimit}&page=${page}`
        }
      } else if (!link.includes('song.html')) return this.getUserListDetail3(link.replace(/.+\/(\w+).html(?:\?.*|&.*$|#.*$|$)/, '$1'), page)
    }
    if (this._requestObj_listDetailLink) this._requestObj_listDetailLink.cancelHttp()

    this._requestObj_listDetailLink = httpFetch(link, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 9_1 like Mac OS X) AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
        Referer: link,
      },
    })
    const { headers: { location }, statusCode, body } = await this._requestObj_listDetailLink.promise
    // console.log(body, location)
    if (statusCode > 400) return this.getUserListDetail(link, page, ++retryNum)
    if (location) {
      if (location.includes('global_collection_id')) return this.getUserListDetail2(location.replace(/^.*?global_collection_id=(\w+)(?:&.*$|#.*$|$)/, '$1'))
      if (location.includes('chain=')) return this.getUserListDetail3(location.replace(/^.*?chain=(\w+)(?:&.*$|#.*$|$)/, '$1'), page)

      // console.log('location', location)
      if (location.includes('.html')) {
        if (location.includes('zlist.html')) {
          let link = location.replace(/^(.*)zlist\.html/, 'https://m3ws.kugou.com/zlist/list')
          if (link.includes('pagesize')) {
            link = link.replace('pagesize=30', 'pagesize=' + this.listDetailLimit).replace('page=1', 'page=' + page)
          } else {
            link += `&pagesize=${this.listDetailLimit}&page=${page}`
          }
          return this.getUserListDetail(link, page, ++retryNum)
        } else return this.getUserListDetail3(location.replace(/.+\/(\w+).html(?:\?.*|&.*$|#.*$|$)/, '$1'), page)
      }
      return this.getUserListDetail(link, page, ++retryNum)
    }
    if (typeof body == 'string') return this.getUserListDetail2(body.replace(/^[\s\S]+?"global_collection_id":"(\w+)"[\s\S]+?$/, '$1'))
    if (body.errcode !== 0) return this.getUserListDetail(link, page, ++retryNum)
    let listInfo = body.info['0']
    let result = body.list.info.map(item => ({ hash: item.hash }))
    result = await Promise.all(this.createTask(result)).then(([...datas]) => datas.flat())
    return {
      list: this.filterData2(result) || [],
      page,
      limit: this.listDetailLimit,
      total: listInfo.count,
      source: 'kg',
      info: {
        name: listInfo.name,
        img: listInfo.pic && listInfo.pic.replace('{size}', 240),
        // desc: body.result.info.list_desc,
        author: listInfo.list_create_username,
        // play_count: this.formatPlayCount(listInfo.count),
      },
    }
  },

  getListDetail(id, page, tryNum = 0) { // 获取歌曲列表内的音乐
    if (this._requestObj_listDetail) this._requestObj_listDetail.cancelHttp()
    if (tryNum > 2) return Promise.reject(new Error('try max num'))

    id = id.toString()
    if (id.includes('special/single/')) {
      id = id.replace(this.regExps.listDetailLink, '$1')
    } else if (/http(?:s):/.test(id)) {
      return this.getUserListDetail(id.replace(/^.*http/, 'http'), page)
    } else if (/^\d+$/.test(id)) {
      return this.getUserListDetailByCode(id)
    } else if (id.startsWith('id_')) {
      id = id.replace('id_', '')
    }

    // if ((/[?&:/]/.test(id))) id = id.replace(this.regExps.listDetailLink, '$1')

    this._requestObj_listDetail = httpFetch(this.getSongListDetailUrl(id))
    return this._requestObj_listDetail.promise.then(({ body }) => {
      let listData = body.match(this.regExps.listData)
      let listInfo = body.match(this.regExps.listInfo)
      if (!listData) return this.getListDetail(id, page, ++tryNum)
      listData = this.filterData(JSON.parse(listData[1]))
      let name
      let pic
      if (listInfo) {
        name = listInfo[1]
        pic = listInfo[2]
      }
      return {
        list: listData,
        page: 1,
        limit: 10000,
        total: listData.length,
        source: 'kg',
        info: {
          name,
          img: pic,
          // desc: body.result.info.list_desc,
          // author: body.result.info.userinfo.username,
          // play_count: this.formatPlayCount(body.result.listen_num),
        },
      }
    })
  },
  filterData(rawList) {
    // console.log(rawList)
    return rawList.map(item => {
      const types = []
      const _types = {}
      if (item.filesize !== 0) {
        let size = sizeFormate(item.filesize)
        types.push({ type: '128k', size, hash: item.hash })
        _types['128k'] = {
          size,
          hash: item.hash,
        }
      }
      if (item.filesize_320 !== 0) {
        let size = sizeFormate(item.filesize_320)
        types.push({ type: '320k', size, hash: item.hash_320 })
        _types['320k'] = {
          size,
          hash: item.hash_320,
        }
      }
      if (item.filesize_ape !== 0) {
        let size = sizeFormate(item.filesize_ape)
        types.push({ type: 'ape', size, hash: item.hash_ape })
        _types.ape = {
          size,
          hash: item.hash_ape,
        }
      }
      if (item.filesize_flac !== 0) {
        let size = sizeFormate(item.filesize_flac)
        types.push({ type: 'flac', size, hash: item.hash_flac })
        _types.flac = {
          size,
          hash: item.hash_flac,
        }
      }
      return {
        singer: item.singername,
        name: item.songname,
        albumName: item.album_name,
        albumId: item.album_id,
        songmid: item.audio_id,
        source: 'kg',
        interval: formatPlayTime(item.duration / 1000),
        img: null,
        lrc: null,
        hash: item.hash,
        types,
        _types,
        typeUrl: {},
      }
    })
  },

  // hash list filter
  filterData2(rawList) {
    // console.log(rawList)
    let ids = new Set()
    let list = []
    rawList.forEach(item => {
      if (!item) return
      if (ids.has(item.audio_info.audio_id)) return
      ids.add(item.audio_info.audio_id)
      const types = []
      const _types = {}
      if (item.audio_info.filesize !== '0') {
        let size = sizeFormate(parseInt(item.audio_info.filesize))
        types.push({ type: '128k', size, hash: item.audio_info.hash })
        _types['128k'] = {
          size,
          hash: item.audio_info.hash,
        }
      }
      if (item.audio_info.filesize_320 !== '0') {
        let size = sizeFormate(parseInt(item.audio_info.filesize_320))
        types.push({ type: '320k', size, hash: item.audio_info.hash_320 })
        _types['320k'] = {
          size,
          hash: item.audio_info.hash_320,
        }
      }
      if (item.audio_info.filesize_flac !== '0') {
        let size = sizeFormate(parseInt(item.audio_info.filesize_flac))
        types.push({ type: 'flac', size, hash: item.audio_info.hash_flac })
        _types.flac = {
          size,
          hash: item.audio_info.hash_flac,
        }
      }
      list.push({
        singer: item.author_name,
        name: item.ori_audio_name,
        albumName: item.album_info.album_name,
        albumId: item.album_info.album_id,
        songmid: item.audio_info.audio_id,
        source: 'kg',
        interval: formatPlayTime(parseInt(item.audio_info.timelength) / 1000),
        img: null,
        lrc: null,
        hash: item.audio_info.hash,
        types,
        _types,
        typeUrl: {},
      })
    })
    return list
  },

  // 获取列表信息
  getListInfo(tagId, tryNum = 0) {
    if (this._requestObj_listInfo) this._requestObj_listInfo.cancelHttp()
    if (tryNum > 2) return Promise.reject(new Error('try max num'))
    this._requestObj_listInfo = httpFetch(this.getInfoUrl(tagId))
    return this._requestObj_listInfo.promise.then(({ body }) => {
      if (body.status !== 1) return this.getListInfo(tagId, ++tryNum)
      return {
        limit: body.data.params.pagesize,
        page: body.data.params.p,
        total: body.data.params.total,
        source: 'kg',
      }
    })
  },

  // 获取列表数据
  getList(sortId, tagId, page) {
    let tasks = [this.getSongList(sortId, tagId, page)]
    tasks.push(
      this.currentTagInfo.id === tagId
        ? Promise.resolve(this.currentTagInfo.info)
        : this.getListInfo(tagId).then(info => {
          this.currentTagInfo.id = tagId
          this.currentTagInfo.info = Object.assign({}, info)
          return info
        }),
    )
    if (!tagId && page === 1 && sortId === this.sortList[0].id) tasks.push(this.getSongListRecommend()) // 如果是所有类别，则顺便获取推荐列表
    return Promise.all(tasks).then(([list, info, recommendList]) => {
      if (recommendList) list.unshift(...recommendList)
      return {
        list,
        ...info,
      }
    })
  },

  // 获取标签
  getTags(tryNum = 0) {
    if (this._requestObj_tags) this._requestObj_tags.cancelHttp()
    if (tryNum > 2) return Promise.reject(new Error('try max num'))
    this._requestObj_tags = httpFetch(this.getInfoUrl())
    return this._requestObj_tags.promise.then(({ body }) => {
      if (body.status !== 1) return this.getTags(++tryNum)
      return {
        hotTag: this.filterInfoHotTag(body.data.hotTag),
        tags: this.filterTagInfo(body.data.tagids),
        source: 'kg',
      }
    })
  },
}

// getList
// getTags
// getListDetail
