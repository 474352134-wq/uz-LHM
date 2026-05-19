// ignore

//@name:豆瓣
// 网站主页，只有视频源扩展需要
//@webSite:https://movie.douban.com
// 版本号纯数字
//@version:1
// 备注，没有的话就不填
//@remark:用于提取豆瓣电影名并触发搜索
// 加密 id，没有的话就不填
//@codeID:
// 使用的环境变量，没有的话就不填
//@env:
// 是否是AV 1是  0否
//@isAV:0
//是否弃用 1是  0否
//@deprecated:0

// ignore

// ... (中间的 import 部分保持不变) ...

/**
 * 获取视频详情
 * @param {UZArgs} args
 * @returns {@Promise<JSON.stringify(new RepVideoDetail())>}
 */
async function getVideoDetail(args) {
    var backData = new RepVideoDetail()
    try {
        // 1. 获取网页内容
        // args.url 是 UZ 传进来的当前豆瓣页面的 URL
        const response = await req({
            url: args.url,
            method: 'GET',
            responseType: ReqResponseType.TEXT, // 注意：这里必须是 TEXT，因为我们要解析 HTML 字符串
        });

        // 2. 使用 cheerio 解析 HTML
        const $ = cheerio.load(response.data);

        // 3. 提取电影标题
        // 根据之前的分析，豆瓣电影标题通常在 span[property="v:itemreviewed"] 里
        let movieName = $('span[property="v:itemreviewed"]').text().trim();
        
        // 防空处理：如果没取到名字，尝试用网页标题或者返回错误
        if (!movieName) {
            movieName = $('title').text().trim();
            // 如果还是空，直接返回错误
            if (!movieName) {
                backData.error = "无法提取电影名称";
                return JSON.stringify(backData);
            }
        }

        // 4. 构造返回数据
        // 我们不需要真正的视频线路，只需要告诉 UZ 这是一个搜索指令
        // UZ 的规则是：如果播放地址是 "search:关键词"，它就会自动触发搜索
        
        // 创建一个线路对象
        const line = {
            name: "豆瓣搜索",
            // 关键点：url 必须是 search: 开头，后面跟上电影名
            url: `search:${movieName}`,
            // 其他字段可以留空或填默认值
            eps: [],
            isVip: false,
        };

        // 将线路添加到 backData.lines 数组中
        backData.lines.push(line);

        // 设置视频标题（可选，用于显示）
        backData.title = movieName;

    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

/**
 * 获取视频的播放地址
 * @param {UZArgs} args
 * @returns {@Promise<JSON.stringify(new RepVideoPlayUrl())>}
 */
async function getVideoPlayUrl(args) {
    var backData = new RepVideoPlayUrl()
    try {
        // 对于这种跳转源，这个函数通常用不到
        // 因为我们在 getVideoDetail 里返回的是 search:xxx，UZ 会直接去搜索，不会调用这个函数来获取播放地址
        // 所以这里保持默认空实现即可
    } catch (error) {
        backData.error = error.toString()
    }
    return JSON.stringify(backData)
}

// 其他不需要的函数（如 getClassList, getVideoList 等）保持默认空实现即可
// 因为我们只关心“详情页”的跳转逻辑
