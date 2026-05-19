// @name 腾讯视频
// @version 17
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
    var response = http.get(url, headers);

    // 3. 解析数据
    var videos = [];
    var regex = /<a.*?href="(.*?)".*?title="(.*?)".*?data-float="(.*?)".*?data-cover="(.*?)".*?/g;
    var match;

    while ((match = regex.exec(response)) !== null) {
        if (match[1].startsWith("http")) {
            videos.push({
                "vod_name": match[2],
                "vod_pic": match[4],
                "vod_remarks": match[3],
                "vod_url": match[1]
            });
        }
    }

    // 4. 返回 JSON 字符串
    return JSON.stringify({
        "code": 1,
        "msg": "成功",
        "data": videos
    });
}
