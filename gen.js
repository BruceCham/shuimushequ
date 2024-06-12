const fs = require('fs');
const path = require('path');
const template = require('art-template');
const { parse } = require('node-html-parser');
const axios = require('axios');

const views = path.join(__dirname, './shuimu.art');

const HOST = 'https://www.newsmth.net';
const api = '/nForum/board/HouseRent';
async function getHtml(page) {
	const res = await axios(`${HOST + api}?ajax&p=${page}`, {
		responseType: "arraybuffer",
		responseEncoding: "utf8",
	});
	let { data } = res
	let utf8decoder = new TextDecoder("GBK");
	let html = utf8decoder.decode(data);
	const root = parse(html);
	const content = root.querySelector('.board-list.tiz > tbody');

	const result = []
	content.childNodes.forEach(node => {
		const info = {
			title: node.childNodes[1].childNodes[0].innerText,
			href: HOST + node.childNodes[1].childNodes[0].getAttribute('href'),
			time: node.childNodes[2].innerText.replaceAll('&emsp;', ''),
			timeRe: node.childNodes[7].childNodes[0].innerText.replaceAll('&emsp;', ''),
		}
		// 过滤部分无用数据
		if (info.title.includes('求') || info.title.includes('版面积分变更记录') || info.title.includes('Re')) {
			return;
		}
		result.push(info)
	});
	return result;
}

const getShuiMuPage = async (count = 1) => {
	const all = await Promise.all(new Array(count).fill(1).map((_, index) => getHtml(index + 1)));
	const list = all.flat().sort((a, b) => {
		let at = parseInt(a.time.replaceAll(/\D/g, ''));
		let atRe = parseInt(a.timeRe.replaceAll(/\D/g, ''));
		let bt = parseInt(b.time.replaceAll(/\D/g, ''));
		let btRe = parseInt(b.timeRe.replaceAll(/\D/g, ''));
		if (at < 1000000) at = 1000000000 + at;
		if (atRe < 1000000) atRe = 1000000000 + atRe;
		if (bt < 1000000) bt = 1000000000 + bt;
		if (btRe < 1000000) btRe = 1000000000 + btRe;
		// 发贴时间和回复时间综合对比
		return bt + btRe - at - atRe;
	});
	const html = template(views, {
		list
	})
	fs.writeFileSync('水木社区.html', html)
}

getShuiMuPage(40);