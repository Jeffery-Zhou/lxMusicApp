import leaderboard from './leaderboard'
import { apis } from '../api-source'
import getLyric from './lyric'
import getMusicInfo from './musicInfo'
import musicSearch from './musicSearch'
import songList from './songList'
import hotSearch from './hotSearch'

const wy = {
  leaderboard,
  musicSearch,
  songList,
  hotSearch,
  getMusicUrl(songInfo, type) {
    return apis('wy').getMusicUrl(songInfo, type)
  },
  getLyric(songInfo) {
    return getLyric(songInfo.songmid)
  },
  getPic(songInfo) {
    return getMusicInfo(songInfo.songmid).then(info => info.al.picUrl)
  },
  getMusicDetailPageUrl(songInfo) {
    return `https://music.163.com/#/song?id=${songInfo.songmid}`
  },
}

export default wy
