// ignore
//@name:豆瓣影视
//@webSite:https://movie.douban.com
//@version:24
//@remark:豆瓣电影剧集搜索 高分推荐
//@isAV:0
//@deprecated:0
// ignore

const UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";

// 首页分类/推荐
async function home() {
    let list = [];
    // 豆瓣高分电影
    let res = await fetch(`https://movie.douban.com/j/search_subject?type=movie&tag=豆瓣高分&page_limit=20`, {
        headers: {
            "User-Agent": UA,
            "Referer": "https://movie.douban.com/"
        }
    });
    let json = await res.json();
    json.subjects.forEach(item => {
        list.push({
            vod_id: item.id,
            vod_name: item.title,
            vod_pic: item.cover.url,
            vod_year: item.year,
            vod_score: item.rating.value
        });
    });
    return { list: list };
}

// 搜索
async function search(kw, page) {
    let list = [];
    let res = await fetch(`https://movie.douban.com/j/search_subject?q=${encodeURIComponent(kw)}&type=all&page_limit=20&page_start=${(page-1)*20}`, {
        headers: {
            "User-Agent": UA,
            "Referer": "https://movie.douban.com/"
        }
    });
    let json = await res.json();
    json.subjects.forEach(item => {
        list.push({
            vod_id: item.id,
            vod_name: item.title,
            vod_pic: item.cover?.url || "",
            vod_year: item.year || "",
            vod_score: item.rating?.value || ""
        });
    });
    return { list: list };
}

// 详情页
async function detail(id) {
    // 豆瓣无官方播放源，只返回信息，可后续对接解析
    return {
        vod_id: id,
        vod_name: "豆瓣影片",
        vod_play_from: ["豆瓣聚合"],
        vod_play_url: ["暂无播放源$"]
    };
}

// 播放解析（预留，可对接第三方解析接口）
async function play(url) {
    return { url: "" };
}
