// ignore

//@name:豆瓣电影修复版(带Cookie)
//@webSite:https://movie.douban.com
//@version:4
//@remark:必须填入Cookie才能显示数据
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
    // 👇 把截图里的 Cookie 内容粘贴在这里，替换掉原来的空字符串
    _cookie: 'll="118297"; bid=boJYIZel7VY; _vwo_uuid_v2=D9DB9358E8164A07A59578831654B7800|4b559143faa8f5a04a9dab4dc74cda1e; dbcl2="295088353:j8wOlKpy4Kw"; push_noty_num=0; push_doumail_num=0; ck=jx66; ap_v=0,6.0; frodotk_db="a9ffbd125fb0de6bfdff37371f129b41"; __utmc=30149280; __utmz=30149280.1779154707.6.4.utmcsr=cn.bing.com|utmccn=(referral)|utmcmd=referral|utmcct=/; __utmv=30149280.29508; __utma=30149280.827381539.1772196852.1779154707.1779157261.7; __utmb=30149280.0.10.1779157261',
}

async function getClassList(args: UZArgs): Promise<RepVideoClassList> {
    return {
        classList: [
            { type_id: "1", type_name: "🔥 豆瓣热映" },
            { type_id: "2", type_name: "🎬 即将上映" },
            { type_id: "3", type_name: "🏆 豆瓣Top250" },
        ]
    }
}

async function getVideoList(args: UZSubclassVideoListArgs): Promise<RepVideoList> {
    const { type_id, page } = args;
    let url = '';

    if (type_id === "1") {
        url = `https://movie.douban.com/j/search_subjects?type=movie&tag=%E7%83%AD%E6%98%A0&sort=rank&page_limit=20&page_start=${(page - 1) * 20}`;
    } else if (type_id === "2") {
        url = `https://movie.douban.com/j/search_subjects?type=movie&tag=%E5%8D%B3%E5%B0%86%E4%B8%8A%E6%98%A0&sort=rank&page_limit=20&page_start=${(page - 1) * 20}`;
    } else if (type_id === "3") {
        url = `https://movie.douban.com/j/search_subjects?type=movie&tag=%E8%B1%86%E7%93%A3%E9%AB%98%E5%88%86&sort=rank&page_limit=20&page_start=${(page - 1) * 20}`;
    }

    try {
        const response = await req({
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://movie.douban.com/',
                'Origin': 'https://movie.douban.com',
                'Cookie': appConfig._cookie, // 使用我们填入的 Cookie
                'Accept': 'application/json, text/javascript, */*; q=0.01',
            },
            responseType: ReqResponseType.JSON
        });

        const data = response.json;
        if (!data || !data.subjects) {
            toast(`分类 ${type_id} 数据为空`);
            return { videoList: [] };
        }

        const list = data.subjects.map(item => ({
            vod_id: item.url,
            vod_name: item.title,
            vod_pic: item.cover,
            vod_remarks: `评分: ${item.rate}`,
            vod_content: item.title,
        }));

        return { videoList: list };

    } catch (error) {
        toast(`获取列表失败: ${error.message}`);
        return { videoList: [] };
    }
}

async function getVideoDetail(args: UZArgs): Promise<RepVideoDetail> {
    const url = args.video.vod_id;
    if (!url) {
        toast("无效的电影链接");
        return {};
    }

    try {
        const response = await req({
            url: url,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://movie.douban.com/',
                'Cookie': appConfig._cookie,
            }
        });

        const html = response.text;
        const $ = cheerio.load(html);

        const title = $('span[property="v:itemreviewed"]').text().trim();
        const cover = $('a.nbgnbg img').attr('src') || '';
        const desc = $('span[property="v:summary"]').text().trim().replace(/\s+/g, ' ');

        // 触发全局搜索
        const searchResult = await searchVideo({ keyWord: title });

        return {
            vod_name: title,
            vod_pic: cover,
            vod_content: desc,
            vod_play_from: '豆瓣搜索',
            vod_play_url: searchResult.videoList.map(item => `${item.vod_name}$${item.vod_id}`).join('#')
        };

    } catch (error) {
        toast(`获取详情失败: ${error.message}`);
        return {};
    }
}

async function searchVideo(args: UZArgs): Promise<RepVideoList> {
    const keyword = args.keyWord;
    if (!keyword) return { videoList: [] };

    try {
        const response = await req({
            url: `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://movie.douban.com/',
                'Cookie': appConfig._cookie,
            },
            responseType: ReqResponseType.JSON
        });

        const data = response.json;
        if (!data) return { videoList: [] };

        const list = data.map(item => ({
            vod_id: item.url,
            vod_name: item.label,
            vod_pic: item.img || '',
            vod_remarks: item.type,
        }));

        return { videoList: list };

    } catch (error) {
        toast(`搜索失败: ${error.message}`);
        return { videoList: [] };
    }
}

export default {
    getClassList,
    getVideoList,
    getVideoDetail,
    searchVideo,
}
