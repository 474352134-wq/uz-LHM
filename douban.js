// ignore

//@name:豆瓣电影稳定版
//@version:7
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
// 核心配置 (请填入你的 Cookie)
// ==========================================
const appConfig = {
    _webSite: 'https://movie.douban.com',
    get webSite() { return this._webSite },
    set webSite(value) { this._webSite = value },
    _uzTag: '',
    get uzTag() { return this._uzTag },
    set uzTag(value) { this._uzTag = value },
    // 👇 把你的 Cookie 粘贴在这里
    cookie: 'll="118297"; bid=boJYIZel7VY; _vwo_uuid_v2=D9DB9358E8164A07A59578831654B7800|4b559143faa8f5a04a9dab4dc74cda1e; dbcl2="295088353:J8wOlKpy4Kw"; push_noty_num=0; push_doumail_num=0; ck=jx66; ap_v=0,6.0; frodotk_db="a9ffbd125fbd0de6bfdf37371f129b41"; __utmc=30149280; __utmz=30149280.1779154707.6.4.utmcsr=cn.bing.com|utmccn=(referral)|utmcmd=referral|utmcct=/; __utmv=30149280.29508; __utma=30149280.827381539.1772196852.1779154707.1779157261.7; __utmb=30149280.0.10.1779157261'
}

// ==========================================
// 1. 获取分类列表 (硬编码，确保显示)
// ==========================================
async function getClassList(args) {
    let backData = new RepVideoClassList()
    try {
        backData.data = [
            { type_id: '/explore', type_name: '豆瓣热榜', hasSubclass: false },
            { type_id: '/cinema/now_playing/', type_name: '正在热映', hasSubclass: false },
            { type_id: '/chart', type_name: '豆瓣Top250', hasSubclass: false },
            { type_id: '/tv/', type_name: '热播剧集', hasSubclass: false },
            { type_id: '/variety/', type_name: '热播综艺', hasSubclass: false },
            { type_id: '/anime/', type_name: '高分动漫', hasSubclass: false }
        ]
    } catch (e) {
        backData.error = e.message
    }
    return JSON.stringify(backData)
}

// ==========================================
// 2. 获取视频列表 (核心抓取逻辑)
// ==========================================
async function getVideoList(args) {
    let backData = new RepVideoList()
    let videos = []
    try {
        let url = appConfig.webSite + args.url
        if (args.page > 1) {
            url += (args.url.includes('?') ? '&' : '?') + 'start=' + (args.page - 1) * 20
        }

        const pro = await req(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Cookie': appConfig.cookie
            }
        })

        if (pro.data) {
            const $ = cheerio.load(pro.data)

            // 针对不同页面的选择器适配
            // 热榜/Top250/热映: grid_view
            // 剧集/综艺: .tv-content
            $('.grid_view .item, .grid-view .item, .tv-content .item').each((_, e) => {
                let video = new VideoDetail()
                // 链接
                video.vod_id = $(e).find('a').attr('href')
                // 标题
                video.vod_name = $(e).find('.title, .title a').text().trim()
                // 图片
                video.vod_pic = $(e).find('img').attr('src') || $(e).find('img').attr('data-original')
                // 评分/备注
                video.vod_remarks = $(e).find('.rating_nums').text().trim() || $(e).find('.playable').text().trim()

                if (video.vod_id) videos.push(video)
            })
        }
    } catch (e) {
        backData.error = e.message
    }
    backData.data = videos
    return JSON.stringify(backData)
}

// ==========================================
// 3. 获取详情 (解析播放源)
// ==========================================
async function getVideoDetail(args) {
    let backData = new RepVideoDetail()
    try {
        let url = appConfig.webSite + args.url
        const pro = await req(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Cookie': appConfig.cookie
            }
        })

        if (pro.data) {
            const $ = cheerio.load(pro.data)
            let detail = new VideoDetail()

            detail.vod_name = $('#content h1 span').first().text().trim()
            detail.vod_pic = $('#mainpic img').attr('src')

            // 简单的简介提取
            let intro = $('#link-report .all').text() || $('#link-report .short').text()
            detail.vod_content = intro.replace('收起', '').trim()

            // 提取年份/地区等 (简单拼接)
            let info = $('#info').text()
            detail.vod_year = info.match(/(\d{4})/) ? info.match(/(\d{4})/)[1] : ''

            backData.data = detail
        }
    } catch (e) {
        backData.error = e.message
    }
    return JSON.stringify(backData)
}

// ==========================================
// 4. 搜索功能
// ==========================================
async function searchVideo(args) {
    let backData = new RepVideoList()
    try {
        let url = `${appConfig.webSite}/search?q=${encodeURIComponent(args.searchWord)}`
        const pro = await req(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Cookie': appConfig.cookie
            }
        })

        if (pro.data) {
            const $ = cheerio.load(pro.data)
            $('.result-list .result').each((_, e) => {
                let video = new VideoDetail()
                video.vod_id = $(e).find('h3 a').attr('href')
                video.vod_name = $(e).find('h3 a').text().trim()
                video.vod_pic = $(e).find('img').attr('src')
                video.vod_remarks = $(e).find('.rating').text().trim()
                if (video.vod_id) backData.data.push(video)
            })
        }
    } catch (e) {
        backData.error = e.message
    }
    return JSON.stringify(backData)
}

// ==========================================
// 必须导出的对象 (修复报错的关键)
// ==========================================
export default {
    getClassList: getClassList,
    getVideoList: getVideoList,
    getVideoDetail: getVideoDetail,
    searchVideo: searchVideo,
    // 占位函数，防止报错
    getSubclassList: () => JSON.stringify(new RepVideoSubclassList()),
    getSubclassVideoList: () => JSON.stringify(new RepVideoList()),
    getVideoPlayUrl: () => JSON.stringify(new RepVideoPlayUrl())
}
