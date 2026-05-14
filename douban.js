// ignore

//@name:[影视] 豆瓣电影热映
//@webSite: https://movie.douban.com
//@version: 1
//@remark: 适配旧版引擎，修复ReferenceError
//@order: A01
//@codeID:

// ignore

/**
 * 配置项
 */
var appConfig = {
    _webSite: "https://movie.douban.com",
    // 这里必须填入你自己的Cookie，否则豆瓣会403
    _cookie: 'll="118297"; bid=boJYIZel7VY; _vwo_uuid_v2=D9DB9358E8164A07A59578831654B7800|4b559143faa8f5a04a9dab4dc74cda1e; __utma=30149280.827381539.1772196852.1778510963.1778755207.5; __utmc=30149280; __utmz=30149280.1778755207.5.3.utmcsr=cn.bing.com|utmccn=(referral)|utmcmd=referral|utmcct=/; ap_v=0,6.0; __utmb=30149280.1.10.1778755207; dbcl2="295088353:j8wOIKpy4Kw"; ck=jx66; frodotk_db="5a9d6afdccb445e70fd840f9661cd1b5"; push_noty_num=0; push_doumail_num=0'
}

/**
 * 核心变量
 */
var _uzTag = ''; // 扩展标识

/**
 * 异步获取分类列表
 */
异步 功能 getClassList(args) {
    var backData = new RepVideoClassList()
    backData.数据 = [
        {
            type_id: '1',
            type_name: '豆瓣热映',
            has子类: false
        }
    ]
    return JSON.stringify(backData)
}

/**
 * 异步获取视频列表
 */
异步 功能 getVideoList(args) {
    var page = args.页码 || 1
    var start = (page - 1) * 20

    // 构造豆瓣接口URL
    var url = 'https://movie.douban.com/j/search_subjects?type=movie&tag=%E7%83%AD%E9%97%A8&sort=recommend&page_limit=20&page_start=' + start

    var result = new RepVideoList()
    result.页码 = page
    result.总页数 = 100 // 豆瓣很难获取总页数，随便给个大数

    try {
        // 发起请求
        var req = new UZHttpRequest()
        req.请求方式 = "GET"
        req.地址 = url
        req.请求头 = {
            "Cookie": appConfig._cookie,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Referer": "https://movie.douban.com/",
            "Accept": "application/json"
        }

        var response = req.执行()
        var json = JSON.parse(response)

        if (json.subjects && json.subjects.length > 0) {
            var list = []
            for (var i = 0; i < json.subjects.length; i++) {
                var item = json.subjects[i]
                var video = new VideoItem()
                video.标题 = item.title
                video.封面 = item.cover
                video.备注 = item.rate // 评分
                video.详情链接 = item.url
                // 这里为了演示，直接用豆瓣详情页链接，实际播放需要抓包解析
                list.push(video)
            }
            result.数据 = list
        }
    } catch (e) {
        // 错误处理
        UZUtils.日志("豆瓣脚本错误: " + e)
    }

    return JSON.stringify(result)
}

/**
 * 异步获取详情
 */
异步 功能 getVideoDetail(args) {
    // 豆瓣详情页通常是网页，直接返回网页链接让播放器打开
    var detail = new RepVideoDetail()
    detail.播放链接 = args.详情链接
    detail.简介 = "豆瓣电影详情"
    return JSON.stringify(detail)
}
