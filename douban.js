// @name: 豆瓣推荐（PPnix 模仿）
// @version: 20
// @description: UZ 影视专用，采用 PPnix 风格的实现，使用腾讯视频接口作为内容源

const appConfig = {
  webSite: 'https://www.ppnix.com',
  headers(referer) {
    return {
      'Referer': referer || this.webSite + '/cn/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    };
  },
};

/**
 * 获取分类列表
 */
async function getClassList(args) {
  const backData = new RepVideoClassList();
  backData.data = [
    { type_id: 'movie', type_name: '电影' },
    { type_id: 'tv', type_name: '电视剧' },
    { type_id: 'show', type_name: '综艺' },
  ];
  return JSON.stringify(backData);
}

/**
 * 获取分类视频列表
 * @param {Object} args
 *   args.url – 类别 id（movie/tv/show）
 *   args.page – 页码（1 为第一页）
 */
async function getVideoList(args) {
  const backData = new RepVideoList();
  try {
    const page = args.page > 1 ? args.page - 1 : '';
    const url = `${appConfig.webSite}/cn/${args.url}/---${page}-newstime.html`;
    const response = await req(url, { headers: appConfig.headers() });
    const $ = cheerio.load(response.data);
    backData.data = [];
    $('.lists-content ul li').each((_, li) => {
      const video = new RepVideoItem();
      const $a = $(li).find('a').first();
      video.vod_id = $a.attr('href');
      video.vod_name = $a.find('img').attr('alt') || $a.attr('title');
      video.vod_pic = $a.find('img').attr('src') || '';
      video.vod_remarks = $(li).find('.orange, footer').first().text().trim();
      backData.data.push(video);
    });
  } catch (error) {
    backData.error = error.toString();
  }
  return JSON.stringify(backData);
}

/**
 * 获取视频详情
 */
async function getVideoDetail(args) {
  const backData = new RepVideoDetail();
  try {
    const url = appConfig.webSite + args.url;
    const response = await req(url, { headers: appConfig.headers() });
    const $ = cheerio.load(response.data);
    const video = new RepVideoDetail();
    video.vod_id = args.url;
    const titleRaw = $('h1.product-title').text().trim();
    video.vod_name = titleRaw.replace(/\s*\([^)]*\)\s*$/, '');
    video.vod_pic = $('.product-header img').attr('src');

    // 演员/导演/年份
    video.vod_year = (titleRaw.match(/\((\d{4})\)/) || [])[1] || '';
    video.vod_director = $('.product-excerpt:contains("导演：") span').text().trim();
    video.vod_actor = $('.product-excerpt:contains("主演：") span').text().trim().replace(/\s*\/\s*/g, ',');
    video.vod_content = $('.product-excerpt:contains("简介：")').text().replace('简介：', '').trim();

    // m3u8 解析
    const html = response.data;
    const infoId = (html.match(/infoid\s*=\s*(\d+)/) || [])[1] || (args.url.match(/(\d+)\.html/) || [])[1];
    const m3u8Match = html.match(/m3u8\s*=\s*\[(.*?)\]/s);
    const episodes = [];
    if (m3u8Match) {
      const re = /'([^']*)'|"([^\"]*)"/g;
      let mm;
      while ((mm = re.exec(m3u8Match[1])) !== null) {
        const epName = mm[1] || mm[2];
        if (epName) {
          episodes.push(`${epName}$${infoId}|${encodeURIComponent(epName)}|${encodeURIComponent(url)}`);
        }
      }
    }
    if (episodes.length) {
      video.vod_play_from = 'PPnix';
      video.vod_play_url = episodes.join('#');
    }
    backData.data = video;
  } catch (error) {
    backData.error = error.toString();
  }
  return JSON.stringify(backData);
}

/**
 * 获取播放地址
 */
async function getVideoPlayUrl(args) {
  const backData = new RepVideoPlayUrl();
  try {
    const parts = args.url.split('|');
    const infoId = parts[0];
    const param = decodeURIComponent(parts[1]);
    const referer = decodeURIComponent(parts[2]);
    const sourceUrl = `${appConfig.webSite}/info/m3u8/${infoId}/${encodeURIComponent(param)}.m3u8`;
    backData.url = sourceUrl;
    backData.headers = appConfig.headers(referer);
    backData.parse = 0;
  } catch (error) {
    backData.error = error.toString();
  }
  return JSON.stringify(backData);
}

/**
 * 搜索视频
 */
async function searchVideo(args) {
  const backData = new RepVideoList();
  try {
    const encoded = encodeURIComponent(args.searchWord);
    const pagePart = args.page > 1 ? `-page-${args.page}` : '';
    const url = `${appConfig.webSite}/cn/search/${encoded}--${pagePart}.html`;
    const response = await req(url, { headers: appConfig.headers() });
    const $ = cheerio.load(response.data);
    backData.data = [];
    $('.lists-content ul li').each((_, li) => {
      const video = new RepVideoItem();
      const $a = $(li).find('a').first();
      video.vod_id = $a.attr('href');
      video.vod_name = $a.find('img').attr('alt') || $a.attr('title');
      video.vod_pic = $a.find('img').attr('src') || '';
      video.vod_remarks = $(li).find('.orange, footer').first().text().trim();
      backData.data.push(video);
    });
  } catch (error) {
    backData.error = error.toString();
  }
  return JSON.stringify(backData);
}

module.exports = {
  getClassList,
  getVideoList,
  getVideoDetail,
  getVideoPlayUrl,
  searchVideo,
};