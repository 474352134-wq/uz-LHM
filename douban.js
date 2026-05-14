// ignore

//@name:豆瓣电影热映
//@webSite:https://movie.douban.com
//@version:1.1
//@remark:修复接口返回空数据问题，更换为公开榜单接口
//@codeID:

// ignore

/**
 * 核心配置
 */
// 使用豆瓣榜单公开接口，不需要 Cookie 也能访问
var BASE_URL = 'https://m.douban.com/rexxar/api/v2/subject_collection/movie_real_time_hotest/items?start=';

/**
 * 入口函数
 */
function getVideoList(args) {
    var page = args.page || 1;
    var count = 20;
    var start = (page - 1) * count;

    var url = BASE_URL + start + '&count=' + count;

    try {
        // 构造请求头，伪装成手机浏览器，防止被拦截
        var headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
            "Referer": "https://m.douban.com/"
        };

        // 发起请求
        var response = http.get(url, headers);
        var json = JSON.parse(response);

        // 检查数据是否存在
        if (json.subject_collection_items && json.subject_collection_items.length > 0) {
            var list = [];
            for (var i = 0; i < json.subject_collection_items.length; i++) {
                var item = json.subject_collection_items[i];
                // 组装数据
                list.push({
                    title: item.title,
                    // 这里的 url 是详情页，UZ 会自动去解析
                    url: item.url,
                    // 封面图
                    img: item.pic?.link || item.cover?.url,
                    // 评分
                    score: item.rating ? item.rating.value : "暂无评分",
                    // 简介
                    desc: item.info
                });
            }
            return {
                code: 0, // 0 表示成功
                data: list,
                page: page,
                total: json.total // 总数
            };
        } else {
            // 如果还是空，打印日志（虽然 UZ 可能看不到，但有助于排查）
            console.log("接口返回空数据，可能是网络问题或接口变动");
            return { code: 1, msg: "暂无数据" };
        }
    } catch (e) {
        // 捕获错误，防止崩溃
        console.log("请求失败: " + e);
        return { code: 1, msg: "请求失败: " + e };
    }
}
