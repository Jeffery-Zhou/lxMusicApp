import { httpFetch } from '../../request'
import { sizeFormate } from '../../index'

export default {
  _requestObj_tags: null,
  _requestObj_list: null,
  _requestObj_listDetail: null,
  limit_list: 10,
  limit_song: 10000,
  successCode: '000000',
  sortList: [
    {
      name: '推荐',
      id: '15127315',
      // id: '1',
    },
    {
      name: '最新',
      id: '15127272',
      // id: '2',
    },
  ],
  regExps: {
    list: /<li><div class="thumb">.+?<\/li>/g,
    listInfo: /.+data-original="(.+?)".*data-id="(\d+)".*<div class="song-list-name"><a\s.*?>(.+?)<\/a>.+<i class="iconfont cf-bofangliang"><\/i>(.+?)<\/div>/,

    // http://music.migu.cn/v3/music/playlist/161044573?page=1
    listDetailLink: /^.+\/playlist\/(\d+)(?:\?.*|&.*$|#.*$|$)/,
  },
  tagsUrl: 'https://app.c.nf.migu.cn/MIGUM2.0/v1.0/content/indexTagPage.do?needAll=0',
  getSongListUrl(sortId, tagId, page) {
    // if (tagId == null) {
    //   return sortId == 'recommend'
    //     ? `http://music.migu.cn/v3/music/playlist?page=${page}&from=migu`
    //     : `http://music.migu.cn/v3/music/playlist?sort=${sortId}&page=${page}&from=migu`
    // }
    // return `http://music.migu.cn/v3/music/playlist?tagId=${tagId}&page=${page}&from=migu`
    if (tagId == null) {
      // return `http://app.c.nf.migu.cn/MIGUM2.0/v2.0/content/getMusicData.do?count=${this.limit_list}&start=${page}&templateVersion=5&type=1`
      // return `https://c.musicapp.migu.cn/MIGUM2.0/v2.0/content/getMusicData.do?count=${this.limit_list}&start=${page}&templateVersion=5&type=${sortId}`
      // http://app.c.nf.migu.cn/MIGUM2.0/v2.0/content/getMusicData.do?count=50&start=2&templateVersion=5&type=1
      return `http://m.music.migu.cn/migu/remoting/playlist_bycolumnid_tag?playListType=2&type=1&columnId=${sortId}&startIndex=${(page - 1) * 10}`
    }
    // return `https://app.c.nf.migu.cn/MIGUM2.0/v2.0/content/getMusicData.do?area=2&count=${this.limit_list}&start=${page}&tags=${tagId}&templateVersion=5&type=3`
    return `http://m.music.migu.cn/migu/remoting/playlist_bycolumnid_tag?playListType=2&type=1&tagId=${tagId}&startIndex=${(page - 1) * 10}`
  },
  getSongListDetailUrl(id, page) {
    return `https://app.c.nf.migu.cn/MIGUM2.0/v1.0/user/queryMusicListSongs.do?musicListId=${id}&pageNo=${page}&pageSize=${this.limit_song}`
  },
  defaultHeaders: {
    language: 'Chinese',
    ua: 'Android_migu',
    mode: 'android',
    version: '6.8.5',
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

  getListDetail(id, page, tryNum = 0) { // 获取歌曲列表内的音乐
    if (this._requestObj_listDetail) this._requestObj_listDetail.cancelHttp()
    if (tryNum > 2) return Promise.reject(new Error('try max num'))

    if ((/[?&:/]/.test(id))) id = id.replace(this.regExps.listDetailLink, '$1')

    this._requestObj_listDetail = httpFetch(this.getSongListDetailUrl(id, page), { headers: this.defaultHeaders })
    return this._requestObj_listDetail.promise.then(({ body }) => {
      if (body.code !== this.successCode) return this.getListDetail(id, page, ++tryNum)
      // console.log(JSON.stringify(body))
      console.log(body)
      return {
        list: this.filterListDetail(body.list),
        page,
        limit: this.limit_song,
        total: body.totalCount,
        source: 'mg',
        // info: {
        //   // name: body.result.info.list_title,
        //   // img: body.result.info.list_pic,
        //   // desc: body.result.info.list_desc,
        //   // author: body.result.info.userinfo.username,
        //   // play_count: this.formatPlayCount(body.result.listen_num),
        // },
      }
    })
  },
  filterListDetail(rawList) {
    // console.log(rawList)
    let ids = new Set()
    const list = []
    rawList.forEach(item => {
      if (ids.has(item.songId)) return
      ids.add(item.songId)
      const types = []
      const _types = {}
      item.rateFormats && item.rateFormats.forEach(type => {
        let size
        switch (type.formatType) {
          case 'PQ':
            size = sizeFormate(type.size)
            types.push({ type: '128k', size })
            _types['128k'] = {
              size,
            }
            break
          case 'HQ':
            size = sizeFormate(type.size)
            types.push({ type: '320k', size })
            _types['320k'] = {
              size,
            }
            break
          case 'SQ':
            size = sizeFormate(type.size)
            types.push({ type: 'flac', size })
            _types.flac = {
              size,
            }
            break
        }
      })


      list.push({
        singer: item.singer,
        name: item.songName,
        albumName: item.album,
        albumId: item.albumId,
        songmid: item.copyrightId,
        copyrightId: item.copyrightId,
        source: 'mg',
        interval: null,
        img: item.albumImgs && item.albumImgs.length ? item.albumImgs[0].img : null,
        lrc: null,
        lrcUrl: item.lrcUrl,
        types,
        _types,
        typeUrl: {},
      })
    })
    return list
  },

  // 获取列表数据
  getList(sortId, tagId, page, tryNum = 0) {
    if (this._requestObj_list) this._requestObj_list.cancelHttp()
    if (tryNum > 2) return Promise.reject(new Error('try max num'))
    this._requestObj_list = httpFetch(this.getSongListUrl(sortId, tagId, page), {
      // headers: {
      //   sign: 'c3b7ae985e2206e97f1b2de8f88691e2',
      //   timestamp: 1578225871982,
      //   appId: 'yyapp2',
      //   mode: 'android',
      //   ua: 'Android_migu',
      //   version: '6.9.4',
      //   osVersion: 'android 7.0',
      //   'User-Agent': 'okhttp/3.9.1',
      // },
    })
    // return this._requestObj_list.promise.then(({ statusCode, body }) => {
    //   if (statusCode !== 200) return this.getList(sortId, tagId, page)
    //   let list = body.replace(/[\r\n]/g, '').match(this.regExps.list)
    //   if (!list) return Promise.reject('获取列表失败')
    //   return list.map(item => {
    //     let info = item.match(this.regExps.listInfo)
    //     return {
    //       play_count: info[4],
    //       id: info[2],
    //       author: '',
    //       name: info[3],
    //       time: '',
    //       img: info[1],
    //       grade: 0,
    //       desc: '',
    //       source: 'mg',
    //     }
    //   })
    // })
    return this._requestObj_list.promise.then(({ body }) => {
      if (body.retCode !== '100000' || body.retMsg.code !== this.successCode) return this.getList(sortId, tagId, page, ++tryNum)
      // console.log(body)
      return {
        list: this.filterList(body.retMsg.playlist),
        total: parseInt(body.retMsg.countSize),
        page,
        limit: this.limit_list,
        source: 'mg',
      }
    })
    // return this._requestObj_list.promise.then(({ body }) => {
    //   if (body.retCode !== '100000') return this.getList(sortId, tagId, page, ++tryNum)
    //   // if (body.code !== '000000') return this.getList(sortId, tagId, page, ++tryNum)
    //   console.log(body)
    //   // return {
    //   //   list: this.filterList(body.data.contentItemList[0].itemList),
    //   //   total: parseInt(body.retMsg.countSize),
    //   //   page,
    //   //   limit: this.limit_list,
    //   //   source: 'mg',
    //   // }
    // })
  },
  filterList(rawData) {
    return rawData.map(item => ({
      play_count: this.formatPlayCount(item.playCount),
      id: item.playListId,
      author: item.createName,
      name: item.playListName,
      time: item.createTime,
      img: item.image,
      grade: item.grade,
      desc: item.summary,
      source: 'mg',
    }))
  },

  // 获取标签
  getTag(tryNum = 0) {
    if (this._requestObj_tags) this._requestObj_tags.cancelHttp()
    if (tryNum > 2) return Promise.reject(new Error('try max num'))
    this._requestObj_tags = httpFetch(this.tagsUrl, { headers: this.defaultHeaders })
    return this._requestObj_tags.promise.then(({ body }) => {
      if (body.code !== this.successCode) return this.getTag(++tryNum)
      return this.filterTagInfo(body.columnInfo.contents)
    })
  },
  filterTagInfo(rawList) {
    return {
      hotTag: rawList[0].objectInfo.contents.map(item => ({
        id: item.objectInfo.tagId,
        name: item.objectInfo.tagName,
        source: 'mg',
      })),
      tags: rawList.slice(1).map(({ objectInfo }) => ({
        name: objectInfo.columnTitle,
        list: objectInfo.contents.map(item => ({
          parent_id: objectInfo.columnId,
          parent_name: objectInfo.columnTitle,
          id: item.objectInfo.tagId,
          name: item.objectInfo.tagName,
          source: 'mg',
        })),
      })),
      source: 'mg',
    }
  },
  getTags() {
    return this.getTag()
  },
}

// getList
// getTags
// getListDetail
