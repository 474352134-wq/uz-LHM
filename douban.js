// ==UserScript==
// @name         UZ-豆瓣电影源 (修正版)
// @namespace    https://uzapp.io/
// @version      19
// @description  适配UZ播放器，修复Cookie验证，支持实时热映数据
// @author       UZ-Dev
// @match        *://*/*
// @grant        none
// ==/UserScript==

/**
 * ==========================================
 * 配置区域
 * ==========================================
 */

// ⚠️ 注意：这里必须填入你抓包获取的最新 Cookie，否则接口会返回 403 或空数据
const MY_COOKIE = 'll="118297"; bid=boJYIZel7VY; _vwo_uuid_v2=D9DB9358E8164A07A59578831654B7800|4b559143faa8f5a04a9dab4dc74cda1e; __utma=30149280.827381539.1772196852.1778510963.1778755207.5; __utmc=30149280; __utmz=30149280.1778755207.5.3.utmcsr=cn.bing.com|utmccn=(referral)|utmcmd=referral|utmcct=/; ap_v=0,6.0; __utmb=30149280.1.10.1778755207; dbcl2="295088353:j8wOIKpy4Kw"; ck=jx66; frodotk_db="5a9d6afdccb445e70fd840f9661cd1b5"; push_noty_num=0; push_doumail_num=0';

// 豆瓣接口地址
const DOUBAN_API = 'https://movie.douban.com/j/search_subjects';

/**
 * ==========================================
 * UZ 脚本核心逻辑
 * ==========================================
 */

// 忽略导入提示
// import { ... } from '../core/uzVideo.js' ... (UZ环境已内置，无需显式导入)

const appConfig = {
    _webSite: 'https://movie.douban.com',
    get webSite() { return this._webSite; },
    set webSite(value) { this._webSite = value; },
    _uzTag: 'douban_movie',
    get uzTag() { return this._uzTag; },
    set uzTag(value) { this._uzTag = value; },
};

/**
 * 1. 获取分类列表 (getClassList)
 * 这里我们定义两个分类：热映、高分
 */
async function getClassList(args) {
    let backData = new RepVideoClassList();
    try {
        // 定义分类
        let class1 = new VideoClass();
        class1.type_name = "正在热映";
        class1.type_id = "hot"; // 对应接口 tag=热门

        let class2 = new VideoClass();
        class2.type_name = "高分经典";
        class2.type_id = "classic"; // 对应接口 tag=经典

        backData.class_list = [class1, class2];
    } catch (e) {
        backData.error = e.toString();
    }
    return JSON.stringify(backData);
}

/**
 * 2. 获取视频列表 (getVideoList)
 * 核心逻辑：调用豆瓣 API 并解析
 */
async function getVideoList(args) {
    let backData = new RepVideoList();
    try {
        // 解析分页参数
        let page = args.page || 1;
        let limit = 20;
        let start = (page - 1) * limit;

        // 确定接口参数
        let tag = "热门"; // 默认热映
        if (args.class && args.class.type_id === "classic") {
            tag = "经典";
        }

        // 构造请求 URL
        let url = `${DOUBAN_API}?type=movie&tag=${encodeURIComponent(tag)}&sort=recommend&page_limit=${limit}&page_start=${start}`;

        // 发起请求 (关键：带上 Cookie)
        let res = await req(url, {
            method: 'GET',
            headers: {
                'Cookie': MY_COOKIE,
                'Referer': 'https://movie.douban.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        // 解析 JSON
        let json = JSON.parse(res.content);

        if (json.subjects && json.subjects.length > 0) {
            json.subjects.forEach(item => {
                let video = new VideoDetail(); // UZ中 VideoList 也是用 VideoDetail 结构或者简易结构
                video.vod_name = item.title;
                video.vod_pic = item.cover; // 封面图
                video.vod_remarks = item.rate; // 评分
                // 详情页链接，用于后续获取详情
                video.vod_url = item.url;
                // 传递必要的参数给下一级
                video.vod_id = item.url;

                backData.video_list.push(video);
            });
        } else {
            backData.error = "暂无数据或Cookie失效";
        }

    } catch (e) {
        backData.error = "请求失败: " + e.toString();
    }
    return JSON.stringify(backData);
}

/**
 * 3. 获取视频详情 (getVideoDetail)
 * 豆瓣本身不提供播放源，这里我们模拟一个“暂无播放源”或者跳转到外部
 */
async function getVideoDetail(args) {
    let backData = new RepVideoDetail();
    try {
        // 我们直接使用列表页传来的数据填充详情
        // 实际场景中，这里可以再次请求详情页抓取简介
        backData.vod_name = "豆瓣电影详情";
        backData.vod_content = "数据来源：豆瓣电影\n注意：豆瓣仅提供数据索引，不提供直接播放资源。";
        backData.vod_pic = args.vod_pic;

        // 构造一个假的播放集数，点击后通过 getVideoPlayUrl 跳转
        let episode = new VideoDetail();
        episode.vod_name = "去网页查看";
        episode.vod_url = args.vod_url; // 传递原始豆瓣链接

        backData.vod_play_url = "查看页面$" + args.vod_url;
        backData.vod_play_from = "豆瓣链接";

    } catch (e) {
        backData.error = e.toString();
    }
    return JSON.stringify(backData);
}

/**
 * 4. 获取播放地址 (getVideoPlayUrl)
 * 直接返回豆瓣的电影详情页链接，UZ播放器通常支持直接打开网页
 */
async function getVideoPlayUrl(args) {
    let backData = new RepVideoPlayUrl();
    try {
        // 返回原始链接，UZ 会尝试用内置浏览器打开
        backData.url = args.vod_url;
    } catch (e) {
        backData.error = e.toString();
    }
    return JSON.stringify(backData);
}

/**
 * 5. 搜索 (searchVideo)
 * 豆瓣搜索接口
 */
async function searchVideo(args) {
    let backData = new RepVideoList();
    try {
        let keyword = args.searchWord;
        let start = 0; // 搜索默认第一页

        // 豆瓣搜索接口
        let url = `https://movie.douban.com/j/search_subjects?type=movie&tag=%E7%83%AD%E9%97%A8&sort=recommend&page_limit=20&page_start=${start}&q=${encodeURIComponent(keyword)}`;

        let res = await req(url, {
            method: 'GET',
            headers: {
                'Cookie': MY_COOKIE,
                'Referer': 'https://movie.douban.com/'
            }
        });

        let json = JSON.parse(res.content);
        if (json.subjects) {
            json.subjects.forEach(item => {
                let video = new VideoDetail();
                video.vod_name = item.title;
                video.vod_pic = item.cover;
                video.vod_remarks = item.rate;
                video.vod_url = item.url;
                backData.video_list.push(video);
            });
        }

    } catch (e) {
        backData.error = e.toString();
    }
    return JSON.stringify(backData);
}

// ==========================================
// 必须导出的对象 (UZ 加载入口)
// ==========================================
export {
    getClassList,
    getSubclassList, // 如果需要二级分类可以实现，这里留空
    getVideoList,
    getSubclassVideoList, // 如果需要二级列表可以实现
    getVideoDetail,
    getVideoPlayUrl,
    searchVideo
};
