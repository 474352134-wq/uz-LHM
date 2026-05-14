// ignore

//@name:豆瓣电影热映
//@webSite:https://movie.douban.com
//@version:21
//@remark:需填入Cookie才能使用
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
    get webSite() { return this._webSite },
    set webSite(value) { this._webSite = value },
    _uzTag: 'douban_movie',
    get uzTag() { return this._uzTag },
    set uzTag(value) { this._uzTag = value },
}

// ⚠️ 注意：这里必须填入你抓包获取的最新 Cookie，否则接口会返回 403 或空数据
// 格式示例: 'll="118297"; bid=xxxx; _vwo_uuid_v2=xxxx; dbcl2="xxxx:xxxx"; ck=xxxx'
const MY_COOKIE = 'll="118297"; bid=boJYIZel7VY; _vwo_uuid_v2=D9DB9358E8164A07A59578831654B7800|4b559143faa8f5a04a9dab4dc74cda1e; __utma=30149280.827381539.1772196852.1778510963.1778755207.5; __utmc=30149280; __utmz=30149280.1778755207.5.3.utmcsr=cn.bing.com|utmccn=(referral)|utmcmd=referral|utmcct=/; ap_v=0,6.0; __utmb=30149280.1.10.1778755207; dbcl2="295088353:j8wOIKpy4Kw"; ck=jx66; frodotk_db="5a9d6afdccb445e70fd840f9661cd1b5"; push_noty_num=0; push_doumail_num=0';

// 豆瓣接口地址
const DOUBAN_API = 'https://movie.douban.com/j/search_subjects';

async function getClassList(args) {
    var backData = new RepVideoClassList()
    try {
        // 定义分类
        let classes = [
            { type_name: '豆瓣热映', type_id: 'hot_gaia' },
            { type_name: '豆瓣高分', type_id: 'recommend' },
            { type_name: '即将上映', type_id: 'soon' }
        ];
        backData.class = classes;
    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

async function getVideoList(args) {
    var backData = new RepVideoList()
    try {
        let page = args.page || 1;
        let limit = 20; // 每页数量
        let start = (page - 1) * limit;
        let tag = args.classId || 'hot_gaia';

        // 构建请求 URL
        let url = `${DOUBAN_API}?type=movie&tag=${tag === 'hot_gaia' ? '热门' : tag === 'recommend' ? '经典' : '即将上映'}&sort=recommend&page_limit=${limit}&page_start=${start}`;

        // 发起请求
        let res = await req(url, {
            headers: {
                'Cookie': MY_COOKIE,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Referer': 'https://movie.douban.com/'
            }
        });

        if (res.code === 200) {
            let data = JSON.parse(res.body);
            if (data.subjects && data.subjects.length > 0) {
                data.subjects.forEach(item => {
                    let video = new VideoDetail();
                    video.vod_id = item.id; // 使用豆瓣ID作为唯一标识
                    video.vod_name = item.title;
                    video.vod_pic = item.cover;
                    video.vod_remarks = item.rate || '暂无评分';
                    // UZ 的列表项通常只需要这几个字段
                    backData.list.push(video);
                });
            }
        }
    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

async function getVideoDetail(args) {
    var backData = new RepVideoDetail()
    try {
        // 这里我们直接构造播放地址，因为豆瓣本身不提供播放源，我们需要跳转到搜索或者第三方
        // 为了演示，这里我们将播放地址设为豆瓣条目页，UZ可能会尝试打开它，或者你可以改为搜索逻辑
        let movieId = args.id;
        let detailUrl = `https://movie.douban.com/subject/${movieId}/`;

        let video = new VideoDetail();
        video.vod_id = movieId;
        video.vod_name = "点击查看详情或搜索资源";
        video.vod_content = "豆瓣不提供直接播放，请点击下方链接查看简介或跳转搜索。";
        video.vod_pic = ""; // 图片在列表页已经加载，这里可以不填
        video.vod_remarks = "";

        // 构造一个假的播放列表，指向豆瓣详情页
        let playlist = [];
        playlist.push("查看豆瓣详情$" + detailUrl);
        video.vod_play_url = playlist.join('#');
        video.vod_play_from = "豆瓣链接";

        backData.detail = video;
    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

async function getVideoPlayUrl(args) {
    var backData = new RepVideoPlayUrl()
    try {
        // 直接返回传入的URL，UZ会尝试用内置浏览器打开或调用外部浏览器
        backData.url = args.url;
    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

async function searchVideo(args) {
    var backData = new RepVideoList()
    try {
        let keyword = args.searchWord;
        // 豆瓣搜索接口通常也需要Cookie
        let url = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`;

        let res = await req(url, {
            headers: {
                'Cookie': MY_COOKIE,
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
                'Referer': 'https://movie.douban.com/'
            }
        });

        if (res.code === 200) {
            let data = JSON.parse(res.body);
            if (data && data.length > 0) {
                data.forEach(item => {
                    // 过滤只保留电影
                    if (item.type === 'movie') {
                        let video = new VideoDetail();
                        video.vod_id = item.id.replace('https://movie.douban.com/subject/', '').replace('/', '');
                        video.vod_name = item.title;
                        video.vod_pic = item.img;
                        video.vod_remarks = item.sub || item.abbr;
                        backData.list.push(video);
                    }
                });
            }
        }
    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

// 必须导出的函数对象
const extension = {
    getClassList: getClassList,
    getVideoList: getVideoList,
    getVideoDetail: getVideoDetail,
    getVideoPlayUrl: getVideoPlayUrl,
    searchVideo: searchVideo,
    // 下面的函数如果不需要可以留空或返回空列表
    getSubclassList: async (args) => JSON.stringify(new RepVideoSubclassList()),
    getSubclassVideoList: async (args) => JSON.stringify(new RepVideoList()),
}

module.exports = extension;
