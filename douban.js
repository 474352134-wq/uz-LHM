// ignore
//@name:豆瓣推荐
//@version:1
//@webSite:https://v.qq.com
//@remark:基于OmniBox豆瓣推荐脚本逻辑移植，首页抓取腾讯Banner
//@isAV:0
//@deprecated:0

const appConfig = {
    ver: 1,
    title: '豆瓣推荐',
    site: 'v.qq.com',
};

// 首页：保留原脚本的硬编码分类和筛选器
async function home() {
    const classes = [
        { type_id: "movie", type_name: "选电影" },
        { type_id: "tv", type_name: "选剧集" },
        { type_id: "show", type_name: "选综艺" },
        { type_id: "movie_filter", type_name: "电影筛选" },
        { type_id: "tv_filter", type_name: "电视剧筛选" },
        { type_id: "show_filter", type_name: "综艺筛选" },
    ];

    const filters = {
        movie: [
            { key: "category", name: "类型", init: "热门", value: [{ name: "热门", value: "热门" }, { name: "最新", value: "最新" }, { name: "豆瓣高分", value: "豆瓣高分" }, { name: "冷门佳片", value: "冷门佳片" }] },
            { key: "type", name: "地区", init: "全部", value: [{ name: "全部", value: "全部" }, { name: "华语", value: "华语" }, { name: "欧美", value: "欧美" }, { name: "韩国", value: "韩国" }, { name: "日本", value: "日本" }] },
        ],
        tv: [
            { key: "type", name: "类型", init: "tv", value: [{ name: "综合", value: "tv" }, { name: "国产剧", value: "tv_domestic" }, { name: "欧美剧", value: "tv_american" }, { name: "日剧", value: "tv_japanese" }, { name: "韩剧", value: "tv_korean" }, { name: "动漫", value: "tv_animation" }, { name: "纪录片", value: "tv_documentary" }] },
        ],
        show: [
            { key: "type", name: "类型", init: "show", value: [{ name: "综合", value: "show" }, { name: "国内", value: "show_domestic" }, { name: "国外", value: "show_foreign" }] },
        ],
        movie_filter: [
            { key: "genre", name: "类型", init: "", value: [{ name: "全部", value: "" }, { name: "喜剧", value: "喜剧" }, { name: "爱情", value: "爱情" }, { name: "动作", value: "动作" }, { name: "科幻", value: "科幻" }, { name: "动画", value: "动画" }, { name: "悬疑", value: "悬疑" }, { name: "犯罪", value: "犯罪" }] },
            { key: "region", name: "地区", init: "", value: [{ name: "全部", value: "" }, { name: "华语", value: "华语" }, { name: "欧美", value: "欧美" }, { name: "韩国", value: "韩国" }, { name: "日本", value: "日本" }] },
            { key: "year", name: "年代", init: "", value: [{ name: "全部", value: "" }, { name: "2026", value: "2026" }, { name: "2025", value: "2025" }, { name: "2024", value: "2024" }, { name: "2023", value: "2023" }] },
        ]
    };

    return JSON.stringify({ class: classes, filters: filters });
}

// 分类：保留原脚本的核心逻辑，去抓取腾讯视频的Banner轮播图
async function category(tid, pg, filter, extend) {
    const page = parseInt(pg) || 1;
    const videos = [];

    // 只有首页（第一页）才去抓取腾讯的Banner数据，完全复刻原脚本逻辑
    if (page === 1) {
        try {
            const tencentBannerUrl = "https://pbaccess.video.qq.com/trpc.vector_layout.page_view.PageService/getPage?video_appid=3000010&vversion_platform=2";
            
            const requestData = {
                page_params: {
                    page_type: "channel",
                    page_id: "100113",
                    scene: "channel",
                    new_mark_label_enabled: "1",
                    vl_to_mvl: "",
                    free_watch_trans_info: "{\"ad_frequency_control_time_list\":{}}",
                    ad_exp_ids: "100000",
                    ams_cookies: "lv_play_index=26; o_minduid=CpGFdExDeM8uP-XHCyma_0PzurMADpcf; appuser=83C1297D3AE9DEFF",
                    ad_trans_data: "{\"game_sessions\":[]}",
                    skip_privacy_types: "0",
                    support_click_scan: "1",
                },
                page_bypass_params: {
                    params: {
                        platform_id: "2",
                        caller_id: "3000010",
                        data_mode: "default",
                        user_mode: "default",
                        specified_strategy: "",
                        page_type: "channel",
                        page_id: "100113",
                        scene: "channel",
                        new_mark_label_enabled: "1",
                    },
                    scene: "channel",
                    app_version: "",
                    abtest_bypass_id: "aa836e91e1411155",
                },
                page_context: null,
            };

            const res = await req(tencentBannerUrl, {
                method: "POST",
                body: JSON.stringify(requestData),
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Referer': 'https://v.qq.com/'
                }
            });

            if (res.data && res.data.data && res.data.data.CardList) {
                for (const cardList of res.data.data.CardList) {
                    if (cardList.type === "pc_carousel" && cardList.children_list && cardList.children_list.list && cardList.children_list.list.cards) {
                        const cards = cardList.children_list.list.cards;
                        for (const card of cards) {
                            if (card.params && card.params.pic_ori_2880x900) {
                                let backgroundImage = card.params.pic_ori_2880x900 || card.params.image_url || "";
                                // UZ影视通常能直接处理https图片，这里保留原逻辑的意图
                                
                                let actors = "";
                                if (card.params.topic_label) {
                                    const parts = card.params.topic_label.split(" / ");
                                    actors = parts.length > 1 ? parts.slice(1).join(" / ") : card.params.topic_label;
                                }

                                videos.push({
                                    vod_id: card.params.cid || card.params.play_id || Math.random().toString(36).substring(7),
                                    vod_name: card.params.title || card.params.title_pc || "",
                                    vod_pic: backgroundImage,
                                    vod_remarks: card.params.stitle_pc || card.params.material_video_subtitle || "",
                                    vod_tag: 'banner', // 标记为Banner，方便前端展示
                                });

                                if (videos.length >= 5) break;
                            }
                        }
                        if (videos.length >= 5) break;
                    }
                }
            }
        } catch (e) {
            console.log("获取Banner数据失败:", e);
        }
    }

    // 如果不是第一页，或者Banner没抓到，返回空列表或常规搜索（这里为了演示保持原脚本的“首页推荐”特性）
    return JSON.stringify({ list: videos, page: page, pagecount: 1, limit: 5, total: 5 });
}

// 详情与播放：适配UZ的标准格式
async function detail(id) {
    // 这里简单返回一个播放链接，实际可以根据id去腾讯视频抓取真实播放地址
    const video = {
        vod_id: id,
        vod_name: "推荐视频",
        vod_play_from: "推荐源",
        vod_play_url: `立即播放$https://v.qq.com/x/cover/${id}.html`
    };
    return JSON.stringify({ list: [video] });
}

async function play(flag, id, flags) {
    return JSON.stringify({ parse: 1, url: id });
}

export default {
    appConfig,
    home,
    category,
    detail,
    play
};
