//@name:豆瓣推荐 (腾讯源)
//@version:14
//@webSite:https://v.qq.com
//@remark:适配UZ影视规范，抓取腾讯视频数据
//@order:A01
//@codeID:
//@env:
//@isAV:0
//@deprecated:0

// --- 核心配置 ---
const appConfig = {
    _webSite: 'https://v.qq.com',
    get webSite() {
        return this._webSite;
    },
    set webSite(value) {
        this._webSite = value;
    },
    headers(referer) {
        return {
            "Referer": referer || this._webSite + '/',
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        };
    },
    _uzTag: '',
    get uzTag() {
        return this._uzTag;
    },
    set uzTag(value) {
        this._uzTag = value;
    },
};

// --- 辅助函数：模拟 PPnix 的 HTML 解析逻辑 ---
async function parseListHtml(html, backData) {
    const $ = cheerio.load(html);
    
    // 尝试匹配腾讯视频常见的列表结构 (CardList 或 list_item)
    // 注意：腾讯视频结构复杂，这里使用通用的选择器
    $('.list_item, .figure, .list-pic').each((_, elem) => {
        const video = new VideoDetail();
        const $elem = $(elem);
        
        // 尝试获取链接
        const $link = $elem.find('a').first();
        const href = $link.attr('href');
        if (!href) return;

        // 基础信息
        video.vod_id = href; // 完整链接作为 ID
        video.vod_name = $link.attr('title') || $elem.find('img').attr('alt') || $link.text().trim();
        
        // 图片
        const imgSrc = $elem.find('img').attr('data-src') || $elem.find('img').attr('src');
        video.vod_pic = imgSrc ? (imgSrc.startsWith('//') ? 'https:' + imgSrc : imgSrc) : '';

        // 备注 (地区/年份/更新集数)
        video.vod_remarks = $elem.find('.tag_area, .figure_caption, .list-info-desc').text().trim();

        backData.data.push(video);
    });
    
    return backData;
}

// --- 1. 分类列表 (getClassList) ---
// 对应 PPnix 中的 getClassList
async function getClassList(args) {
    var backData = new RepVideoClassList();
    try {
        backData.data = [
            { type_id: 'movie', type_name: '电影', hasSubclass: false },
            { type_id: 'tv', type_name: '电视剧', hasSubclass: false },
            { type_id: 'variety', type_name: '综艺', hasSubclass: false },
            { type_id: 'anime', type_name: '动漫', hasSubclass: false },
        ];
    } catch (error) {
        backData.error = error.toString();
    }
    return JSON.stringify(backData);
}

// --- 2. 获取视频列表 (getVideoList) ---
// 对应 PPnix 中的 getVideoList
async function getVideoList(args) {
    var backData = new RepVideoList();
    try {
        const { type_id, page = 1 } = args;
        
        // 构造腾讯视频分类 URL
        // 电影: https://v.qq.com/list/1.html
        // 电视剧: https://v.qq.com/list/2.html
        const typeIdMap = { 'movie': 1, 'tv': 2, 'variety': 3, 'anime': 4 };
        const tid = typeIdMap[type_id] || 1;
        const url = `${appConfig.webSite}/list/${tid}.html?page=${page}`;

        const response = await req(url, { headers: appConfig.headers() });
        
        // 使用统一的解析函数
        backData = await parseListHtml(response.data, backData);
        
    } catch (error) {
        backData.error = error.toString();
    }
    return JSON.stringify(backData);
}

// --- 3. 搜索视频 (searchVideo) ---
// 对应 PPnix 中的 searchVideo
async function searchVideo(args) {
    var backData = new RepVideoList();
    try {
        const { searchWord, page = 1 } = args;
        const encoded = encodeURIComponent(searchWord);
        const url = `${appConfig.webSite}/search.html?query=${encoded}&page=${page}`;

        const response = await req(url, { headers: appConfig.headers() });
        backData = await parseListHtml(response.data, backData);
        
    } catch (error) {
        backData.error = error.toString();
    }
    return JSON.stringify(backData);
}

// --- 4. 视频详情 (getVideoDetail) ---
// 对应 PPnix 中的 getVideoDetail
// 注意：腾讯视频详情页逻辑非常复杂，这里仅做基础信息填充，播放源需依赖嗅探
async function getVideoDetail(args) {
    var backData = new RepVideoDetail();
    try {
        const url = args.url.startsWith('http') ? args.url : appConfig.webSite + args.url;
        const response = await req(url, { headers: appConfig.headers(url) });
        const $ = cheerio.load(response.data);

        const video = new VideoDetail();
        video.vod_id = args.url;
        
        // 基础信息
        video.vod_name = $('h1').text().trim() || $('.video-title').text().trim();
        video.vod_pic = $('img').attr('src'); // 简单获取第一张图
        
        // 演员/导演 (腾讯结构复杂，这里使用通用选择器)
        video.vod_actor = $('.actor-list').text().trim() || $('.mod-actor').text().trim();
        video.vod_director = $('.director-list').text().trim() || $('.mod-director').text().trim();
        video.vod_content = $('.desc').text().trim() || $('.video-desc').text().trim();

        // 腾讯视频通常需要嗅探，这里不尝试解析具体的播放列表
        // 设置播放来源为 "腾讯视频"
        video.vod_play_from = "腾讯视频";
        // 这里只传 ID，播放时直接打开网页
        video.vod_play_url = `第1集$${encodeURIComponent(url)}`;

        backData.data = video;
    } catch (error) {
        backData.error = error.toString();
    }
    return JSON.stringify(backData);
}

// --- 5. 获取播放地址 (getVideoPlayUrl) ---
// 对应 PPnix 中的 getVideoPlayUrl
// 对于腾讯视频，我们直接返回网页链接，让 APP 去嗅探 M3U8 或 HLS
async function getVideoPlayUrl(args) {
    var backData = new RepVideoPlayUrl();
    try {
        // args.url 在 getVideoDetail 里被设置为了网页链接
        const targetUrl = decodeURIComponent(args.url);
        
        backData.url = targetUrl; // 直接返回网页地址
        backData.headers = appConfig.headers(targetUrl);
        backData.parse = 0; // 0 表示直接请求，让 APP 嗅探视频流
        backData.isVideo = true; // 标记为视频链接
    } catch (error) {
        backData.error = error.toString();
    }
    return JSON.stringify(backData);
}

// --- 6. 空函数实现 (保持接口完整) ---
// PPnix 脚本规范要求这些函数存在
async function getSubclassList(args) { return JSON.stringify(new RepVideoSubclassList()); }
async function getSubclassVideoList(args) { return JSON.stringify(new RepVideoList()); }
async function getFyVideoList(args) { return JSON.stringify(new RepVideoList()); }
