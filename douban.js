// @name 豆瓣推荐
// @version 16
// @author 你的ID
// @description 腾讯视频源，适配UZ
// @webSite https://v.qq.com
// @type 101
// @order 1

// 核心函数：获取首页数据
function getHomeContent() {
    // 1. 定义请求头，伪装成浏览器
    var headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Referer": "https://v.qq.com/"
    };

    // 2. 发起 GET 请求
    // 注意：这里直接用 http.get，这是 UZ 最原生的写法
    var url = "https://v.qq.com/channel/cartoon?listpage=1&channel=cartoon&sort=18&filter_title=";
    var html = http.get(url, headers);

    // 3. 解析数据 (这里只是示例，你需要根据实际网页结构调整正则)
    // 如果你的网页结构变了，这里需要重新写正则表达式
    var videos = [];

    // 示例：提取视频标题和链接 (你需要根据实际网页结构调整)
    var regex = /<a.*?href="(.*?)".*?title="(.*?)"/g;
    var match;
    while ((match = regex.exec(html)) !== null) {
        // 防止匹配到无关链接
        if (match[1].includes("play")) {
            videos.push({
                "vod_name": match[2], // 视频名
                "vod_url": match[1],  // 播放链接
                "vod_pic": "",        // 图片链接 (可选)
                "vod_remarks": "腾讯源" // 备注 (可选)
            });
        }
    }

    // 4. 返回 JSON 字符串
    // 这是最关键的一步，必须返回字符串，不能返回对象
    return JSON.stringify(videos);
}
