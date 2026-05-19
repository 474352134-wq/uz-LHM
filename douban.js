//@name:腾讯视频 (豆瓣推荐源)
//@version:14
//@webSite:https://v.qq.com
//@remark:修复JS渲染问题，改用频道页API
//@order:A01
//@codeID:
//@env:
//@isAV:0
//@deprecated:0

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

/**
 * 通用列表解析函数
 * 注意：腾讯视频的 /channel/* 页面结构相对固定
 */
async function parseListHtml(html, backData) {
    const $ = cheerio.load(html);
    
    // 腾讯视频频道页的主要列表容器
    // 经过分析，视频项通常包裹在 .list_page 或 .mod_content 下
    $('.mod_content li, .list_item').each((_, elem) => {
        const video = new VideoDetail();
        const $elem = $(elem);
        
        const $link = $elem.find('a').first();
        const href = $link.attr('href');
        if (!href) return;

        // 确保链接是完整的
        const videoUrl = href.startsWith('http') ? href : appConfig.webSite + href;
        
        video.vod_id = videoUrl; // 使用完整URL作为ID
        video.vod_name = $link.attr('title') || $elem.find('img').attr('alt') || $link.text().trim();
        
        // 处理图片懒加载 (data-src) 和相对协议 (//)
        const imgSrc = $elem.find('img').attr('data-src') || $elem.find('img').attr('src');
        if (imgSrc) {
            video.vod_pic = imgSrc.startsWith('//') ? 'https:' + imgSrc : imgSrc;
        }

        // 提取备注信息 (如更新至xx集, 评分等)
        video.vod_remarks = $elem.find('.tag_txt, .figure_caption, .score').text().trim();
        
        backData.data.push(video);
    });
    
    return backData;
}

/**
 * 分类列表
 * 修复：映射到腾讯视频实际的频道路径
 */
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

/**
 * 获取视频列表
 * 修复：不再使用 /list/1.html (JS渲染页)，改用 /channel/* (静态HTML页)
 */
async function getVideoList(args) {
    var backData = new RepVideoList();
    try {
        const { type_id, page = 1 } = args;
        
        // 腾讯视频频道页映射
        // 电影: /channel/movie/list
        // 电视剧: /channel/tv/list  
        // 综艺: /channel/variety/list
        // 动漫: /channel/anime/list
        const pathMap = { 
            'movie': '/channel/movie/list',
            'tv': '/channel/tv/list',
            'variety': '/channel/variety/list',
            'anime': '/channel/anime/list' 
        };
        
        const path = pathMap[type_id] || pathMap['movie'];
        // 注意：腾讯频道页的分页参数通常是 ?page=2
        const url = `${appConfig.webSite}${path}?page=${page}`;

        const response = await req(url, { headers: appConfig.headers() });
        
        // 检查是否获取到有效HTML
        if (response.data.includes('请启用JavaScript')) {
            backData.error = "获取数据失败：腾讯视频页面需要JS渲染，当前源可能已失效";
            return JSON.stringify(backData);
        }

        backData = await parseListHtml(response.data, backData);
        
    } catch (error) {
        backData.error = error.toString();
    }
    return JSON.stringify(backData);
}

/**
 * 搜索视频
 * 修复：使用腾讯搜索的静态结果页
 */
async function searchVideo(args) {
    var backData = new RepVideoList();
    try {
        const { searchWord, page = 1 } = args;
        const encoded = encodeURIComponent(searchWord);
        // 腾讯搜索页结构
        const url = `${appConfig.webSite}/search.html?query=${encoded}&page=${page}`;

        const response = await req(url, { headers: appConfig.headers() });
        backData = await parseListHtml(response.data, backData);
        
    } catch (error) {
        backData.error = error.toString();
    }
    return JSON.stringify(backData);
}

/**
 * 获取视频详情
 * 优化：增强选择器的容错性
 */
async function getVideoDetail(args) {
    var backData = new RepVideoDetail();
    try {
        const url = args.url.startsWith('http') ? args.url : appConfig.webSite + args.url;
        const response = await req(url, { headers: appConfig.headers(url) });
        const $ = cheerio.load(response.data);

        const video = new VideoDetail();
        video.vod_id = args.url;
        
        // 尝试多种选择器获取标题
        video.vod_name = $('h1').text().trim() || $('.video-title').text().trim() || $('.mod-title em').text().trim();
        
        // 尝试获取首张图片作为海报
        const firstImg = $('img').first().attr('src');
        if (firstImg && !firstImg.includes('placeholder')) {
            video.vod_pic = firstImg.startsWith('//') ? 'https:' + firstImg : firstImg;
        }

        // 提取简介
        video.vod_content = $('.desc').text().trim() || $('.video-desc').text().trim() || $('.mod-intro').text().trim();

        // 演员/导演 (腾讯结构复杂，这里使用通用选择器)
        // 通常在 .mod-basic-info 或 .actor-list 下
        video.vod_actor = $('.actor-list').text().trim() || $('.mod-basic-info .actor').text().trim();
        video.vod_director = $('.director-list').text().trim() || $('.mod-basic-info .director').text().trim();

        // 设置播放来源
        video.vod_play_from = "腾讯视频";
        // 直接使用网页链接，让APP嗅探
        video.vod_play_url = `正片$${encodeURIComponent(url)}`;

        backData.data = video;
    } catch (error) {
        backData.error = error.toString();
    }
    return JSON.stringify(backData);
}

/**
 * 获取播放地址
 * 逻辑：直接返回网页链接，由APP进行视频嗅探
 */
async function getVideoPlayUrl(args) {
    var backData = new RepVideoPlayUrl();
    try {
        const targetUrl = decodeURIComponent(args.url);
        
        backData.url = targetUrl;
        backData.headers = appConfig.headers(targetUrl);
        backData.parse = 0; // 0表示直接请求，不进行JSON解析，让APP嗅探视频流
        backData.isVideo = true;
        
    } catch (error) {
        backData.error = error.toString();
    }
    return JSON.stringify(backData);
}

// --- 保持接口完整 ---
async function getSubclassList(args) { return JSON.stringify(new RepVideoSubclassList()); }
async function getSubclassVideoList(args) { return JSON.stringify(new RepVideoList()); }
async function getFyVideoList(args) { return JSON.stringify(new RepVideoList()); }
