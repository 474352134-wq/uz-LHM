//@name:{LHM}豆瓣
//@version:10
//@webSite:https://movie.douban.com
//@remark:修复API失效问题，改为爬取移动端网页版，适配2026年数据
//@order:A01
//@codeID:
//@env:
//@isAV:0
//@deprecated:0

/* -------------------------------------------------
   辅助：生成年份下拉列表（已覆盖到 2026 年）
   ------------------------------------------------- */
function makeYearList(start, end) {
  const years = [{ name: '全部', id: '' }]
  for (let y = start; y >= end; y--) {
    years.push({ name: String(y), id: String(y) })
  }
  return years
}

/* -------------------------------------------------
   1️⃣ 主分类列表
   ------------------------------------------------- */
async function getClassList(args) {
  const backData = new RepVideoClassList()
  try {
    backData.data = [
      { type_id: '1', type_name: '电影', hasSubclass: true },
      { type_id: '2', type_name: '电视剧', hasSubclass: true },
      { type_id: '3', type_name: '综艺', hasSubclass: true },
      { type_id: '4', type_name: '动漫', hasSubclass: true },
      { type_id: '5', type_name: '纪录片', hasSubclass: true },
    ]
  } catch (e) {
    backData.error = e.toString()
  }
  return JSON.stringify(backData)
}

/* -------------------------------------------------
   2️⃣ 二级过滤器
   ------------------------------------------------- */
async function getSubclassList(args) {
  const backData = new RepVideoSubclassList()
  const id = String(args.url || '')

  const commonArea = [
    { name: '全部', id: '' },
    { name: '中国大陆', id: '中国大陆' },
    { name: '香港', id: '香港' },
    { name: '台湾', id: '台湾' },
    { name: '美国', id: '美国' },
    { name: '日本', id: '日本' },
    { name: '韩国', id: '韩国' },
    { name: '英国', id: '英国' },
    { name: '法国', id: '法国' },
    { name: '其他', id: '其他' },
  ]

  const commonSort = [
    { name: '时间排序', id: 'time' },
    { name: '人气排序', id: 'hits' },
    { name: '评分排序', id: 'score' },
  ]

  let filter = []

  switch (id) {
    case '1': // 电影
      filter = [
        {
          name: '剧情',
          list: [
            { name: '全部', id: '' },
            { name: '喜剧', id: '喜剧' },
            { name: '爱情', id: '爱情' },
            { name: '动作', id: '动作' },
            { name: '科幻', id: '科幻' },
            { name: '动画', id: '动画' },
            { name: '悬疑', id: '悬疑' },
            { name: '犯罪', id: '犯罪' },
          ],
        },
        { name: '地区', list: commonArea },
        { name: '年份', list: makeYearList(2026, 1990) },
        { name: '排序', list: commonSort },
      ]
      break

    case '2': // 电视剧
      filter = [
        {
          name: '剧情',
          list: [
            { name: '全部', id: '' },
            { name: '古装', id: '古装' },
            { name: '现代', id: '现代' },
            { name: '悬疑', id: '悬疑' },
            { name: '爱情', id: '爱情' },
          ],
        },
        { name: '地区', list: commonArea },
        { name: '年份', list: makeYearList(2026, 2000) },
        { name: '排序', list: commonSort },
      ]
      break

    case '3': // 综艺
      filter = [
        {
          name: '类别',
          list: [
            { name: '全部', id: '' },
            { name: '选秀', id: '选秀' },
            { name: '访谈', id: '访谈' },
            { name: '游戏互动', id: '游戏互动' },
          ],
        },
        { name: '地区', list: commonArea },
        { name: '年份', list: makeYearList(2026, 2010) },
        { name: '排序', list: commonSort },
      ]
      break

    case '4': // 动漫
      filter = [
        {
          name: '类型',
          list: [
            { name: '全部', id: '' },
            { name: '爱情', id: '爱情' },
            { name: '科幻', id: '科幻' },
            { name: '冒险', id: '冒险' },
          ],
        },
        { name: '地区', list: commonArea },
        { name: '年份', list: makeYearList(2026, 1999) },
        { name: '排序', list: commonSort },
      ]
      break

    case '5': // 纪录片
      filter = [
        {
          name: '主题',
          list: [
            { name: '全部', id: '' },
            { name: '自然', id: '自然' },
            { name: '历史', id: 'history' },
            { name: '科技', id: '科技' },
          ],
        },
        { name: '地区', list: commonArea },
        { name: '年份', list: makeYearList(2025, 1999) },
        { name: '排序', list: commonSort },
      ]
      break

    default:
      filter = []
  }

  backData.data = new VideoSubclass()
  backData.data.filter = filter
  return JSON.stringify(backData)
}

/* -------------------------------------------------
   3️⃣ 列表页面（改为爬取移动端网页版）
   ------------------------------------------------- */
async function getVideoList(args) {
  const backData = new RepVideoList()
  try {
    // 豆瓣移动端榜单 URL (数据结构最清晰，适合爬虫)
    const url = 'https://m.douban.com/rexxar/api/v2/subject_collection/movie_real_time_hotest/items?start=' + ((args.page - 1) * 20) + '&count=20'

    const resp = await req(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://m.douban.com/',
        'Host': 'm.douban.com'
      }
    })

    // 尝试解析 JSON (移动端 API 返回的是 JSON)
    const json = JSONbig.parse(resp.data || '{}')
    const items = json.items || []

    if (items.length === 0) {
        // 如果 API 再次失效，这里可以备选一个 HTML 爬虫逻辑，但目前这个 API 比较稳
        throw new Error("API 返回空数据，可能被反爬")
    }

    const list = items.map((s) => {
      const vd = new VideoDetail()
      vd.vod_id = s.url // 保存详情页链接
      vd.vod_name = s.title
      vd.vod_pic = s.pic?.link || s.cover // 适配不同字段
      vd.vod_remarks = `评分: ${s.rating?.value || '暂无'}`
      return vd
    })
    backData.data = list

  } catch (e) {
    backData.error = e.toString()
    console.error('列表错误:', e)
  }
  return JSON.stringify(backData)
}

/* -------------------------------------------------
   4️⃣ 详情页（爬取 PC 端网页）
   ------------------------------------------------- */
async function getVideoDetail(args) {
  const backData = new RepVideoDetail()
  try {
    const detailUrl = String(args.vod_id || '')
    if (!detailUrl) throw new Error('缺少 vod_id')

    // 必须加上 Referer 和 Cookie，否则豆瓣会返回 403 或验证码
    const resp = await req(detailUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.douban.com/',
        // 简单的 Cookie 模拟，防止被重定向到登录页
        'Cookie': 'bid=abcdefg12345; ll="118281";'
      }
    })

    // 检查是否被重定向到验证码页面
    if (resp.data.includes('sec.douban.com') || resp.data.includes('验证')) {
        throw new Error('触发豆瓣反爬验证，请稍后再试')
    }

    const $ = cheerio.load(resp.data || '')

    const detail = new VideoDetail()
    detail.vod_id = detailUrl

    // 标题
    detail.vod_name = $('h1 span[property="v:itemreviewed"]').text().trim() || $('h1').first().text().trim()

    // 封面
    detail.vod_pic = $('#mainpic img').attr('src') || ''

    // 评分
    detail.vod_remarks = $('strong.ll.rating_num').text().trim()

    // 简介
    detail.vod_content = $('span[property="v:summary"]').text().replace(/\s+/g, '\n').trim()

    // 年份 (从标题或发布日中提取)
    const yearMatch = detailUrl.match(/\/(\d{4})\//)
    detail.vod_year = yearMatch ? yearMatch[1] : $('.year').text().replace(/[()]/g, '').trim()

    // 导演/演员 (简单的文本提取)
    const director = $('span[rel="v:directedBy"] a').text()
    const casts = $('span[rel="v:starring"] a').toArray().map(a => $(a).text()).join('/')
    detail.vod_actor = casts
    detail.vod_director = director

    backData.data = detail

  } catch (e) {
    backData.error = e.toString()
    console.error('详情错误:', e)
  }
  return JSON.stringify(backData)
}

/* -------------------------------------------------
   5️⃣ 播放地址（豆瓣无资源）
   ------------------------------------------------- */
async function getVideoPlayUrl(args) {
  const backData = new RepVideoPlayUrl()
  backData.data.play_url = ''
  return JSON.stringify(backData)
}

/* -------------------------------------------------
   6️⃣ 搜索（使用移动端搜索接口）
   ------------------------------------------------- */
async function searchVideo(args) {
  const backData = new RepVideoList()
  try {
    const kw = String(args.keywords || '')
    if (!kw) throw new Error('缺少搜索关键字')

    // 使用移动端搜索接口，返回 JSON
    const url = `https://m.douban.com/j/search?cat=1002&q=${encodeURIComponent(kw)}&start=0&count=20`

    const resp = await req(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
        'Referer': 'https://m.douban.com/',
        'X-Requested-With': 'XMLHttpRequest' // 模拟 AJAX 请求
      }
    })

    const json = JSONbig.parse(resp.data || '{}')
    // 移动端搜索返回结构较深，需要解析
    const subjects = json.items || []

    const list = subjects.map((s) => {
      // 移动端搜索返回的 item 结构可能包含 type: 'movie'
      if(s.type !== 'movie') return null

      const vd = new VideoDetail()
      vd.vod_id = s.url
      vd.vod_name = s.title
      // 图片可能在 data 对象里
      vd.vod_pic = s.data?.pic || s.cover
      vd.vod_remarks = `评分: ${s.data?.rating?.value || '暂无'}`
      return vd
    }).filter(item => item !== null) // 过滤掉非电影结果

    backData.data = list

  } catch (e) {
    backData.error = e.toString()
    console.error('搜索错误:', e)
  }
  return JSON.stringify(backData)
}
