// ignore

//@name:豆瓣电影最终修复版
//@webSite:https://movie.douban.com
//@version:5
//@remark:分类硬编码，确保显示
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

// ignore

const appConfig = {
    _webSite: 'https://movie.douban.com',
    get webSite() { return this._webSite },
    set webSite(value) { this._webSite = value },
    _uzTag: '',
    get uzTag() { return this._uzTag },
    set uzTag(value) { this._uzTag = value },
    // 👇 必须填入你的 Cookie，否则无法加载列表
    _cookie: 'll="118297"; bid=boJYIZel7VY; _vwo_uuid_v2=D9DB9358E8164A07A59578831654B7800|4b559143faa8f5a04a9dab4dc74cda1e; dbcl2="295088353:j8wOlKpy4Kw"; push_noty_num=0; push_doumail_num=0; ck=jx66; ap_v=0,6.0; frodok_db="a9ffbd125fb0de6bfdff37371f129b41"; __utmc=30149280; __utmz=30149280.1779154707.6.4.utmcsr=cn.bing.com|utmccn=(referral)|utmcmd=referral|utmcct=/; __utmv=30149280.29508; __utma=30149280.827381539.1772196852.1779154707.1779157261.7; __utmb=30149280.0.10.1779157261',
}

// 定义固定的分类数据，确保分类一定能显示
const fixedCategories = [
    { type_name: '豆瓣热映', url: '/cinema/nowplaying/' },
    { type_name: '豆瓣即将上映', url: '/cinema/later/' },
    { type_name: '豆瓣Top250', url: '/top250' },
    { type_name: '豆瓣高分', url: '/explore?tags=%E9%AB%98%E5%88%86' },
    { type_name: '一周口碑榜', url: '/weekly' },
]

/**
 * 获取分类列表
 */
async function getClassList(args) {
    try {
        // 直接返回硬编码的分类，不依赖网络请求，确保分类100%显示
        let list = fixedCategories.map(item => {
            let vc = new VideoClass()
            vc.type_name = item.type_name
            vc.type_id = item.url // 使用 URL 作为 ID
            return vc
        })
        return new RepVideoClassList(list)
    } catch (e) {
        console.error('分类获取失败:', e)
        return new RepVideoClassList([])
    }
}

/**
 * 获取视频列表
 */
async function getVideoList(args) {
    let typeId = args.filter[0].id // 获取分类 ID (即 URL)
    let url = appConfig.webSite + typeId

    try {
        // 发起请求
        const response = await req({
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Cookie': appConfig._cookie,
                'Referer': appConfig.webSite,
            },
            responseType: ReqResponseType.STRING
        })

        let html = response.data
        let $ = cheerio.load(html)
        let videoList = []

        // 针对不同的分类 URL 使用不同的解析逻辑
        if (typeId === '/cinema/nowplaying/' || typeId === '/cinema/later/') {
            // 解析热映/即将上映 (结构: ul.lists -> li.list-item)
            $('ul.lists li.list-item').each((index, element) => {
                let $el = $(element)
                let title = $el.attr('data-title') || $el.find('img').attr('alt')
                let cover = $el.find('img').attr('src')
                let href = $el.attr('data-subject') || $el.find('a').attr('href')

                if (title && href) {
                    // 处理封面图（如果是空或者占位符则跳过）
                    if (!cover || cover.includes('s_ratio')) cover = $el.find('img').attr('data-original')

                    let item = new VideoSubclassVideoListArgs()
                    item.vod_name = title
                    item.vod_pic = cover || '' // 防空
                    item.vod_remarks = $el.attr('data-score') || '暂无评分' // 评分
                    item.vod_id = href // 详情页链接
                    videoList.push(item)
                }
            })
        } else if (typeId === '/top250') {
            // 解析 Top250 (结构: ol.grid_view -> li)
            $('ol.grid_view li').each((index, element) => {
                let $el = $(element)
                let title = $el.find('span.title').first().text()
                let cover = $el.find('img').attr('src')
                let href = $el.find('a').attr('href')
                let rating = $el.find('span.rating_num').text()

                if (title && href) {
                    let item = new VideoSubclassVideoListArgs()
                    item.vod_name = title
                    item.vod_pic = cover || ''
                    item.vod_remarks = '评分: ' + rating
                    item.vod_id = href
                    videoList.push(item)
                }
            })
        } else {
            // 通用解析逻辑（用于其他页面）
            // 尝试匹配常见的电影列表结构
            $('div.article div.grid_view li, ul.subject-list li').each((index, element) => {
                let $el = $(element)
                let title = $el.find('img').attr('alt')
                let cover = $el.find('img').attr('src')
                let href = $el.find('a.cover').attr('href')
                let rating = $el.find('.rating_nums').text()

                if (title && href) {
                    let item = new VideoSubclassVideoListArgs()
                    item.vod_name = title
                    item.vod_pic = cover || ''
                    item.vod_remarks = rating ? ('评分: ' + rating) : '无评分'
                    item.vod_id = href
                    videoList.push(item)
                }
            })
        }

        return new RepVideoList(videoList)

    } catch (e) {
        console.error('列表获取失败:', e)
        toast('加载失败，请检查Cookie是否过期')
        return new RepVideoList([])
    }
}

/**
 * 获取视频详情（这里简单处理，直接返回标题）
 */
async function getVideoDetail(args) {
    let url = args.videoId
    if (!url.startsWith('http')) {
        url = appConfig.webSite + url
    }

    try {
        const response = await req({
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Cookie': appConfig._cookie,
            },
            responseType: ReqResponseType.STRING
        })

        let $ = cheerio.load(response.data)
        let title = $('#content h1 span.property').first().text() || $('title').text().replace(' (豆瓣)', '')

        let detail = new VideoDetail()
        detail.vod_name = title
        detail.vod_content = $('#link-report span.all.hidden').text() || $('#link-report .intro p').first().text() || '暂无简介'

        // 提取年份用于搜索
        let year = $('#content h1 .year').text().replace(/[()]/g, '')

        // 构造搜索关键词
        let query = title
        if (year) query += ' ' + year

        detail.vod_play_url = '搜索播放$SEARCH:' + encodeURIComponent(query)

        return new RepVideoDetail(detail)

    } catch (e) {
        console.error('详情获取失败:', e)
        return new RepVideoDetail(new VideoDetail())
    }
}

/**
 * 播放链接（这里直接触发搜索）
 */
async function getVideoPlayUrl(args) {
    // 这里的逻辑是：UZ 影视接收到 SEARCH: 前缀后，会自动触发全局搜索
    return args.playUrl
}

// 导出函数
export { getClassList, getVideoList, getVideoDetail, getVideoPlayUrl }
