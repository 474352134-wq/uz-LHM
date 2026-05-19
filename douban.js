// ignore

//@name:豆瓣电影稳定版
//@version:8
//@webSite:https://movie.douban.com
//@remark:修复语法错误，硬编码分类
//@isAV:0
//@deprecated:0

// ignore
import {
    VideoClass,
    RepVideoClassList,
    RepVideoList,
    RepVideoDetail,
    RepVideoPlayUrl,
    UZArgs,
    UZSubclassVideoListArgs,
} from '../core/uzVideo.js'

import {
    UZUtils,
    req,
    ReqResponseType,
    toast,
} from '../core/uzUtils.js'

import { cheerio } from '../core/uz3lib.js'

// ==========================================
// 核心配置 (Cookie 请填入这里)
// ==========================================
const appConfig = {
    _webSite: 'https://movie.douban.com',
    get webSite() { return this._webSite },
    set webSite(value) { this._webSite = value },
    _uzTag: '',
    get uzTag() { return this._uzTag },
    set uzTag(value) { this._uzTag = value },
    // 👇 把你的 Cookie 粘贴在这里，保持单引号
    _cookie: 'll="118297"; bid=boJYIZel7VY; _vwo_uuid_v2=D9DB9358E8164A07A59578831654B7800|4b559143faa8f5a04a9dab4dc74cda1e; dbcl2="295088353:8wOlKpy4Kw"; push_noty_num=0; push_doumail_num=0; ck=jx66; ap_v=0,6.0; frodotk_db="a9ffbd125fb0de6bfdff37371f129b41"; __utmc=30149280; __utmz=30149280.1779154707.6.4.utmcsr=cn.bing.com|utmccn=(referral)|utmcmd=referral|utmcct=/; __utmv=30149280.29508; __utma=30149280.827381539.1772196852.1779154707.1779157261.7; __utmb=30149280.0.10.1779157261',
}

// ==========================================
// 获取分类列表 (硬编码，确保显示)
// ==========================================
async function getClassList(args) {
    let backData = new RepVideoClassList()
    let classes = []

    // 手动定义分类，防止网页改版导致抓不到
    classes.push({ type_id: 'nowplaying', type_name: '热映中', hasSubclass: false })
    classes.push({ type_id: 'coming_soon', type_name: '即将上映', hasSubclass: false })
    classes.push({ type_id: 'top250', type_name: 'Top250', hasSubclass: false })
    classes.push({ type_id: 'weekly', type_name: '口碑榜', hasSubclass: false })
    classes.push({ type_id: 'movie', type_name: '最新电影', hasSubclass: false })
    classes.push({ type_id: 'tv', type_name: '最新剧集', hasSubclass: false })

    backData.data = classes
    return JSON.stringify(backData)
}

// ==========================================
// 获取视频列表 (适配豆瓣最新结构)
// ==========================================
async function getVideoList(args) {
    let backData = new RepVideoList()
    let videos = []

    // 构造请求头，带上 Cookie
    let headers = {
        'Cookie': appConfig._cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://movie.douban.com/'
    }

    try {
        let url = ''
        // 根据不同的分类 ID 请求不同的接口
        if (args.url === 'nowplaying') {
            url = 'https://m.douban.com/rexxar/api/v2/movie/now_playing?start=0&count=20&loc_id=108288&_=0'
        } else if (args.url === 'coming_soon') {
            url = 'https://m.douban.com/rexxar/api/v2/movie/coming_soon?start=0&count=20&loc_id=108288&_=0'
        } else if (args.url === 'top250') {
            url = `https://m.douban.com/rexxar/api/v2/movie/top250?start=${(args.page-1)*20}&count=20&_=0`
        } else if (args.url === 'weekly') {
            url = 'https://m.douban.com/rexxar/api/v2/movie/weekly?start=0&count=20&_=0'
        } else if (args.url === 'movie') {
            url = `https://m.douban.com/rexxar/api/v2/subject_collection/movie_latest/items?start=${(args.page-1)*20&count=20&_=0`
        } else if (args.url === 'tv') {
            url = `https://m.douban.com/rexxar/api/v2/subject_collection/tv_hot/items?start=${(args.page-1)*20}&count=20&_=0`
        }

        if (!url) {
            backData.error = '未知分类'
            return JSON.stringify(backData)
        }

        // 发送请求
        const pro = await req(url, { headers: headers })

        if (pro.error) {
            backData.error = pro.error
            return JSON.stringify(backData)
        }

        // 解析 JSON 数据
        let jsonData = JSON.parse(pro.data)
        let items = jsonData.subjects || jsonData.items || []

        items.forEach(item => {
            let video = new VideoDetail()
            // 兼容性处理：有的字段叫 id，有的叫 target
            let id = item.id || (item.target ? item.target.id : '')
            let title = item.title || (item.target ? item.target.title : '')
            let cover = item.cover || (item.target ? item.target.cover_url : '')
            let rate = item.rate || (item.target ? item.target.rating ? item.target.rating.value : '' : '')

            video.vod_id = id.toString()
            video.vod_name = title
            video.vod_pic = cover
            video.vod_remarks = rate ? '评分: ' + rate : ''

            videos.push(video)
        })

        backData.data = videos

    } catch (e) {
        backData.error = '解析失败: ' + e.message
    }

    return JSON.stringify(backData)
}

// ==========================================
// 获取详情页 (简单适配)
// ==========================================
async function getVideoDetail(args) {
    let backData = new RepVideoDetail()
    try {
        let url = `https://m.douban.com/rexxar/api/v2/movie/${args.url}`
        let headers = {
            'Cookie': appConfig._cookie,
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://movie.douban.com/'
        }

        // 这里因为豆瓣详情页需要复杂的解析，且接口通常返回 JSON，
        // 为了稳定性，我们直接返回一个包含简介的假数据，或者尝试抓取移动版页面
        let pro = await req(`https://movie.douban.com/subject/${args.url}/`, { headers: headers })
        if (!pro.error) {
            const $ = cheerio.load(pro.data)
            let detail = new VideoDetail()
            detail.vod_id = args.url
            detail.vod_name = $('h1 span[property="v:itemreviewed"]').text()
            detail.vod_pic = $('a.nbgnbg img').attr('src')
            detail.vod_content = $('span[property="v:summary"]').text().trim()
            detail.vod_year = $('span[property="v:initialReleaseDate"]').text().substring(0, 4)

            // 构造播放列表 (这里仅作演示，实际豆瓣无直接播放源)
            let playUrls = []
            playUrls.push({ url: 'https://movie.douban.com/subject/' + args.url + '/', name: '去豆瓣查看' })
            detail.vod_play_list = playUrls

            backData.data = detail
        }
    } catch (e) {
        backData.error = e.message
    }
    return JSON.stringify(backData)
}

// ==========================================
// 搜索功能
// ==========================================
async function searchVideo(args) {
    let backData = new RepVideoList()
    // 豆瓣搜索接口较复杂，这里暂用列表接口逻辑复用或提示
    backData.error = '豆瓣搜索暂不支持，请使用分类浏览'
    return JSON.stringify(backData)
}

// ==========================================
// 必须导出的对象 (防止 ReferenceError)
// ==========================================
const appObj = {
    getClassList: getClassList,
    getVideoList: getVideoList,
    getVideoDetail: getVideoDetail,
    searchVideo: searchVideo,
    getSubclassList: async (args) => JSON.stringify(new RepVideoSubclassList()), // 空实现
    getSubclassVideoList: async (args) => JSON.stringify(new RepVideoList()), // 空实现
    getVideoPlayUrl: async (args) => JSON.stringify(new RepVideoPlayUrl()), // 空实现
}

export default appObj
