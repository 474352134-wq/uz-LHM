// ignore

//@name:豆瓣电影修复版
//@webSite:https://movie.douban.com
//@version:3
//@remark:修复了无数据问题，增加了防拦截请求头
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
}

// 通用请求头，伪装成浏览器，防止被豆瓣屏蔽
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Referer': 'https://www.google.com/',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    // 注意：Cookie 有时会过期，但带上基础的可以防一部分拦截
    'Cookie': 'll="118281"; bid=Fb3x...;' 
}

/**
 * 1. 获取分类列表 (首页显示的菜单)
 */
async function getClassList(args) {
    var backData = new RepVideoClassList()
    try {
        // 手动定义分类，因为豆瓣没有标准的API，硬编码最稳定
        let classes = [
            { type_id: 'nowplaying', type_name: '🔥 正在热映' },
            { type_id: 'soon', type_name: '📅 即将上映' },
            { type_id: 'top250', type_name: '🏆 豆瓣 Top250' },
            { type_id: 'weekly', type_name: '📈 一周口碑榜' }
        ]
        backData.class = classes
    } catch (e) {
        backData.error = '分类获取失败: ' + e.message
        toast('豆瓣源错误: ' + e.message) // 在APP上弹出提示
    }
    return JSON.stringify(backData)
}

/**
 * 2. 获取视频列表 (点击分类后显示的电影)
 */
async function getVideoList(args) {
    var backData = new RepVideoList()
    // args.classifyId 对应上面定义的 type_id
    // args.page 当前页码
    let typeId = args.classifyId
    let page = args.page || 1
    let url = ''

    try {
        // 根据分类ID拼接豆瓣URL
        if (typeId === 'nowplaying') {
            url = 'https://movie.douban.com/cinema/nowplaying/'
        } else if (typeId === 'soon') {
            url = 'https://movie.douban.com/cinema/later/'
        } else if (typeId === 'top250') {
            url = 'https://movie.douban.com/top250?start=' + ((page - 1) * 25)
        } else if (typeId === 'weekly') {
            url = 'https://movie.douban.com/chart'
        } else {
            backData.error = '未知分类'
            return JSON.stringify(backData)
        }

        // 发起请求，必须带 Headers
        let res = await req({
            url: url,
            method: 'GET',
            headers: HEADERS,
            responseType: ReqResponseType.TEXT
        })

        if (!res || !res.body) {
            throw new Error('网络请求为空，可能被豆瓣拦截')
        }

        const $ = cheerio.load(res.body)
        let videos = []

        // --- 解析逻辑：正在热映/即将上映 ---
        if (typeId === 'nowplaying' || typeId === 'soon') {
            // 热映和即将上映的列表结构类似，都在 .lists 里的 li
            $('#nowplaying .lists li, #showing-soon .lists li').each((i, el) => {
                let title = $(el).attr('data-title') || $(el).find('.title').text().trim()
                let cover = $(el).find('img').attr('src')
                // 清洗封面链接，去掉 ?x=xxx 后缀
                if (cover && cover.includes('?')) cover = cover.split('?')[0]
                let url = $(el).find('a').attr('href')

                if (title && url) {
                    videos.push({
                        vod_name: title,
                        vod_pic: cover || '',
                        vod_remarks: $(el).find('.subject-rate').text() || '热映中',
                        vod_url: url // 传递详情页链接
                    })
                }
            })
        }
        
        // --- 解析逻辑：Top250 ---
        else if (typeId === 'top250') {
            $('#content .grid_view li').each((i, el) => {
                let title = $(el).find('.title').text().trim()
                let cover = $(el).find('img').attr('src')
                let url = $(el).find('a').attr('href')
                let score = $(el).find('.rating_num').text().trim()

                if (title && url) {
                    videos.push({
                        vod_name: title,
                        vod_pic: cover,
                        vod_remarks: '评分: ' + score,
                        vod_url: url
                    })
                }
            })
        }

        // --- 解析逻辑：一周口碑榜 ---
        else if (typeId === 'weekly') {
             $('.indent table tr').each((i, el) => {
                // 第一行通常是表头，跳过
                if(i === 0) return; 
                let title = $(el).find('.pl2 a').text().replace(/\n/g, '').trim()
                let cover = $(el).find('img').attr('src')
                let url = $(el).find('.pl2 a').attr('href')
                let desc = $(el).find('.pl').text() // 简介

                if (title && url) {
                    videos.push({
                        vod_name: title,
                        vod_pic: cover,
                        vod_remarks: desc,
                        vod_url: url
                    })
                }
            })
        }

        backData.list = videos

    } catch (e) {
        console.log('豆瓣源错误:', e)
        backData.error = '加载失败: ' + e.message
        toast('豆瓣源错误: ' + e.message)
    }
    return JSON.stringify(backData)
}

/**
 * 3. 获取详情 (核心：提取名字并触发搜索)
 */
async function getVideoDetail(args) {
    var backData = new RepVideoDetail()
    try {
        // 获取详情页内容
        let res = await req({
            url: args.vodId, // args.vodId 就是列表传来的 vod_url
            method: 'GET',
            headers: HEADERS,
            responseType: ReqResponseType.TEXT
        })

        if (!res || !res.body) throw new Error('详情页获取失败')

        const $ = cheerio.load(res.body)
        
        // 提取电影名称：通常在 <span property="v:itemreviewed">
        let title = $('span[property="v:itemreviewed"]').text().trim()
        
        // 提取封面
        let cover = $('#mainpic img').attr('src')
        if (cover && cover.includes('?')) cover = cover.split('?')[0]

        // 提取年份
        let year = $('span[property="v:initialReleaseDate"]').text().trim().split('-')[0]

        if (!title) throw new Error('无法提取电影名')

        // 设置返回数据
        backData.vod_name = title
        backData.vod_pic = cover
        backData.vod_year = year
        backData.vod_content = $('span[property="v:summary"]').text().replace(/\s+/g, '').substring(0, 200) + '...'

        // 【关键】告诉 UZ 去搜索这个标题
        // UZ 会自动拿着 vod_name 去所有启用的搜索源里搜索
        backData.vod_play_url = '点击搜索播放$SEARCH://' + title

    } catch (e) {
        backData.error = e.message
        toast('详情错误: ' + e.message)
    }
    return JSON.stringify(backData)
}

// 播放地址处理
async function getVideoPlayUrl(args) {
    var backData = new RepVideoPlayUrl()
    // 如果是 SEARCH 协议，直接返回空，UZ 会自动跳转搜索
    if (args.flag === 'SEARCH') {
        backData.playUrl = '' 
    }
    return JSON.stringify(backData)
}

// 搜索功能（可选，这里直接复用豆瓣搜索页）
async function searchVideo(args) {
    var backData = new RepVideoList()
    let keyword = args.searchWord
    let url = `https://movie.douban.com/subject_search?search_text=${encodeURIComponent(keyword)}`

    try {
        let res = await req({
            url: url,
            headers: HEADERS,
            responseType: ReqResponseType.TEXT
        })
        
        const $ = cheerio.load(res.body)
        let videos = []

        // 搜索结果解析（搜索结果页面结构比较复杂，这里抓取主要结果）
        $('.item-root').each((i, el) => {
            let title = $(el).find('.title-text').text() || $(el).find('a').attr('title')
            let cover = $(el).find('img').attr('src')
            let url = $(el).find('a').attr('href')
            
            if(title && url && url.includes('/subject/')) {
                 videos.push({
                    vod_name: title,
                    vod_pic: cover,
                    vod_remarks: '豆瓣搜索',
                    vod_url: url
                })
            }
        })
        backData.list = videos
    } catch (e) {
        backData.error = e.message
    }
    return JSON.stringify(backData)
}

// 忽略其他未实现的函数
async function getSubclassList(args) { return JSON.stringify(new RepVideoSubclassList()) }
async function getSubclassVideoList(args) { return JSON.stringify(new RepVideoList()) }
