// ignore

//@name:豆瓣电影热映
//@webSite:https://movie.douban.com
//@version:20
//@remark:使用Cookie获取实时数据
//@codeID:
//@env:
//@isAV:0
//@deprecated:0

// ignore

import {
    FilterLabel,
    FilterTitle,
    VideoClass,
    VideoSubclass,
    VideoDetail,
    RepVideoClassList,
    RepVideoSubclassList,
    RepVideoList,
    RepVideoDetail,
    RepVideoPlayUrl,
    UZArgs,
    UZSubclassVideoListArgs,
} from '../core/uzVideo.js'

import {
    UZUtils,
    ProData,
    ReqResponseType,
    ReqAddressType,
    req,
    getEnv,
    setEnv,
    goToVerify,
    openWebToBindEnv,
    toast,
    kIsDesktop,
    kIsAndroid,
    kIsIOS,
    kIsWindows,
    kIsMacOS,
    kIsTV,
    kLocale,
    kAppVersion,
    formatBackData,
} from '../core/uzUtils.js'

import { cheerio, Crypto, Encrypt, JSONbig } from '../core/uz3lib.js'

// ignore

const appConfig = {
    _webSite: 'https://movie.douban.com',
    get webSite() {
        return this._webSite
    },
    set webSite(value) {
        this._webSite = value
    },
    _uzTag: '',
    get uzTag() {
        return this._uzTag
    },
    set uzTag(value) {
        this._uzTag = value
    },
}

// ==========================================
// ⚠️ 请在这里填入你的 Cookie
// ==========================================
const MY_COOKIE = 'll="118297"; bid=boJYIZel7VY; _vwo_uuid_v2=D9DB9358E8164A07A59578831654B7800|4b559143faa8f5a04a9dab4dc74cda1e; __utma=30149280.827381539.1772196852.1778510963.1778755207.5; __utmc=30149280; __utmz=30149280.1778755207.5.3.utmcsr=cn.bing.com|utmccn=(referral)|utmcmd=referral|utmcct=/; ap_v=0,6.0; __utmb=30149280.1.10.1778755207; dbcl2="295088353:j8wOIKpy4Kw"; ck=jx66; frodotk_db="5a9d6afdccb445e70fd840f9661cd1b5"; push_noty_num=0; push_doumail_num=0';

/**
 * 获取分类列表 (对应流程图第一步)
 */
async function getClassList(args) {
    var backData = new RepVideoClassList()
    try {
        // 定义分类
        let classes = [
            { type_id: 'hot', type_name: '🔥 正在热映' },
            { type_id: 'recommend', type_name: '🌟 高分推荐' },
            { type_id: 'coming_soon', type_name: '📅 即将上映' }
        ]
        backData.class = classes
    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

/**
 * 获取视频列表 (对应流程图：点击分类 -> 获取列表)
 */
async function getVideoList(args) {
    var backData = new RepVideoList()
    try {
        let typeId = args.classTypeId // 获取分类ID (hot, recommend, etc.)
        let page = args.page || 1
        let start = (page - 1) * 20 // 豆瓣每页20条

        let tag = ''
        if (typeId === 'hot') tag = '热映'
        else if (typeId === 'recommend') tag = '经典'
        else if (typeId === 'coming_soon') tag = '即将上映'

        // 请求豆瓣接口
        let url = `https://movie.douban.com/j/search_subjects?type=movie&tag=${tag}&sort=recommend&page_limit=20&page_start=${start}`

        let res = await req(url, {
            headers: {
                'Cookie': MY_COOKIE,
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
                'Referer': 'https://movie.douban.com/'
            }
        })

        if (res.code === 200) {
            let json = JSON.parse(res.body)
            if (json.subjects && json.subjects.length > 0) {
                json.subjects.forEach(item => {
                    let video = new VideoDetail() // 复用VideoDetail结构，或者用VideoItem如果UZ有定义
                    video.vod_id = item.url // 传递详情页链接作为ID
                    video.vod_name = item.title
                    video.vod_pic = item.cover // 封面图
                    video.vod_remarks = item.rate // 评分作为备注
                    // UZ列表通常需要 vod_id, vod_name, vod_pic, vod_remarks
                    backData.list.push({
                        vod_id: item.url,
                        vod_name: item.title,
                        vod_pic: item.cover,
                        vod_remarks: "评分: " + item.rate
                    })
                })
            }
        }
    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

/**
 * 获取视频详情 (对应流程图：点击视频 -> 获取详情)
 */
async function getVideoDetail(args) {
    var backData = new RepVideoDetail()
    try {
        let url = args.id // 传入的是详情页链接
        // 这里需要请求详情页获取播放链接（或者直接用接口解析）
        // 为了简化，这里我们尝试直接解析播放源，或者返回一个提示

        // 模拟详情数据
        backData.vod_name = "豆瓣电影详情"
        backData.vod_play_url = "播放测试$https://example.com/test.mp4" // 这里需要真实的解析逻辑
        backData.vod_play_from = "测试源"

    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

/**
 * 搜索视频
 */
async function searchVideo(args) {
    var backData = new RepVideoList()
    try {
        let keyword = args.searchWord
        let page = args.page || 1
        let start = (page - 1) * 20

        let url = `https://movie.douban.com/j/search_subjects?type=movie&tag=%E7%83%AD%E6%98%A0&sort=recommend&page_limit=20&page_start=${start}`
        // 豆瓣搜索接口较复杂，这里简单复用列表逻辑或提示
        backData.error = "暂不支持直接搜索，请通过分类浏览"

    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

// 以下函数如果不使用，保持空实现即可
async function getSubclassList(args) {
    var backData = new RepVideoSubclassList()
    return JSON.stringify(backData)
}

async function getSubclassVideoList(args) {
    var backData = new RepVideoList()
    return JSON.stringify(backData)
}

async function getVideoPlayUrl(args) {
    var backData = new RepVideoPlayUrl()
    // 这里处理真实的播放地址解析
    backData.playUrl = args.playUrl
    return JSON.stringify(backData)
}

// ignore
