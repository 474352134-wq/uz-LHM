//@name:豆瓣推荐 (腾讯源)
//@version:15
//@webSite:https://v.qq.com
//@remark:严格遵循PPNix规范，返回JSON字符串
//@order:A01

// --- 核心逻辑 ---
async function getHomeContent() {
    // 1. 获取腾讯视频推荐页数据
    const url = 'https://v.qq.com/channel/cartoon?listpage=1&channel=cartoon&sort=18&filter_title=';
    const headers = {
        "Referer": "https://v.qq.com/",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36"
    };

    try {
        // 2. 发起网络请求
        const response = await fetch(url, { headers });
        const html = await response.text();

        // 3. 解析HTML，提取视频信息 (示例：提取前10个视频)
        const videos = [];
        const regex = /<a.*?href="(.*?)".*?title="(.*?)".*?data-float="(.*?)".*?data-cover="(.*?)".*?data-playnum="(.*?)".*?data-score="(.*?)".*?/g;
        let match;
        let count = 0;

        while ((match = regex.exec(html)) !== null && count < 10) {
            const videoUrl = match[1];
            const title = match[2];
            const playNum = match[5];
            const score = match[6];
            const coverUrl = match[4];

            // 4. 构建符合UZ规范的视频对象
            videos.push({
                title: title,
                url: videoUrl,
                cover: coverUrl,
                desc: `播放量: ${playNum} | 评分: ${score}`,
                type: 'video' // 明确指定类型
            });
            count++;
        }

        // 5. 返回JSON字符串 (PPNix规则：必须返回字符串)
        return JSON.stringify({
            code: 0, // 0表示成功
            msg: 'success',
            data: videos
        });

    } catch (error) {
        // 6. 错误处理：返回错误信息
        return JSON.stringify({
            code: -1,
            msg: '请求失败: ' + error.message,
            data: []
        });
    }
}

// --- 入口函数 ---
// UZ脚本规范：必须导出一个函数，该函数返回JSON字符串
module.exports = async function () {
    return await getHomeContent();
};
