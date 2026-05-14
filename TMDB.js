//@name:{LHM}TMDB安全版
//@version:7
//@webSite:https://www.themoviedb.org/
//@remark:最终安全尝试
//@order:A01
//@codeID:
//@env:
//@isAV:0
//@deprecated:0

// ignore
import {
    VideoDetail,
    RepVideoClassList,
    RepVideoSubclassList,
    RepVideoList,
    RepVideoDetail,
    RepVideoPlayUrl,
    VideoSubclass,
} from '../core/uzVideo.js'

import {
    req,
    toast,
} from '../core/uzUtils.js'
// ignore

var TMDB_API_KEY = '0c9ff73a2d99c4ece5f0134e2586c375';
var TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
var TMDB_API_BASE = 'https://api.tmdb.org/3';

function s(obj) {
    try {
        if (typeof obj === 'string') return obj;
        if (obj === null || obj === undefined) return '';
        return JSON.stringify(obj);
    } catch (e) {
        return String(obj);
    }
}

function makeYearList(start, end) {
    var years = [{ name: '全部', id: '' }];
    for (var y = start; y >= end; y--) {
        years.push({ name: String(y), id: String(y) });
    }
    return years;
}

async function getClassList(args) {
    var backData = new RepVideoClassList();
    try {
        backData.data = [
            { type_id: 'movie', type_name: '电影', hasSubclass: true }
        ];
    } catch (e) {
        backData.error = s(e);
    }
    return JSON.stringify(backData);
}

async function getSubclassList(args) {
    var backData = new RepVideoSubclassList();
    try {
        var sorts = [
            { name: '人气降序', id: 'popularity.desc' },
            { name: '评分降序', id: 'vote_average.desc' }
        ];
        backData.data = new VideoSubclass();
        backData.data.filter = [
            { name: '年份', list: makeYearList(2026, 2020) },
            { name: '排序', list: sorts }
        ];
    } catch (e) {
        backData.error = s(e);
    }
    return JSON.stringify(backData);
}

async function getVideoList(args) {
    var backData = new RepVideoList();
    try {
        var page = Number(args.page || 1);
        var url = TMDB_API_BASE + '/movie/popular?api_key=' + TMDB_API_KEY + '&language=zh-CN&page=' + page;
        var resp = await req(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });
        var json = JSON.parse(resp.data || '{}');
        var results = json.results || [];
        var list = [];
        for (var i = 0; i < results.length; i++) {
            var item = results[i];
            var vd = new VideoDetail();
            vd.vod_id = 'movie_' + item.id;
            vd.vod_name = item.title || '';
            vd.vod_pic = item.poster_path ? (TMDB_IMAGE_BASE + item.poster_path) : '';
            vd.vod_remarks = '评分 ' + (item.vote_average || '?');
            list.push(vd);
        }
        backData.data = list;
    } catch (e) {
        backData.error = s(e);
    }
    return JSON.stringify(backData);
}

async function getSubclassVideoList(args) {
    return await getVideoList(args);
}

async function getVideoDetail(args) {
    var backData = new RepVideoDetail();
    try {
        var vodId = String(args.vod_id || '');
        if (!vodId) throw new Error('no id');
        var parts = vodId.split('_');
        var id = parts[1];
        var url = TMDB_API_BASE + '/movie/' + id + '?api_key=' + TMDB_API_KEY + '&language=zh-CN';
        var resp = await req(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });
        var info = JSON.parse(resp.data || '{}');
        var d = new VideoDetail();
        d.vod_id = vodId;
        d.vod_name = info.title || '';
        d.vod_pic = info.poster_path ? (TMDB_IMAGE_BASE + info.poster_path) : '';
        d.vod_remarks = '评分 ' + (info.vote_average || '?');
        d.vod_content = info.overview || '';
        if (info.release_date) d.vod_year = info.release_date.substring(0, 4);
        backData.data = d;
    } catch (e) {
        backData.error = s(e);
    }
    return JSON.stringify(backData);
}

async function getVideoPlayUrl(args) {
    var backData = new RepVideoPlayUrl();
    backData.data.play_url = '';
    return JSON.stringify(backData);
}

async function searchVideo(args) {
    var backData = new RepVideoList();
    try {
        var kw = String(args.keywords || '');
        if (!kw) throw new Error('no keyword');
        var url = TMDB_API_BASE + '/search/movie?api_key=' + TMDB_API_KEY + '&language=zh-CN&query=' + encodeURIComponent(kw) + '&page=1';
        var resp = await req(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            }
        });
        var json = JSON.parse(resp.data || '{}');
        var results = json.results || [];
        var list = [];
        for (var i = 0; i < results.length; i++) {
            var item = results[i];
            var vd = new VideoDetail();
            vd.vod_id = 'movie_' + item.id;
            vd.vod_name = item.title || '';
            vd.vod_pic = item.poster_path ? (TMDB_IMAGE_BASE + item.poster_path) : '';
            vd.vod_remarks = '评分 ' + (item.vote_average || '?');
            list.push(vd);
        }
        backData.data = list;
    } catch (e) {
        backData.error = s(e);
    }
    return JSON.stringify(backData);
}
