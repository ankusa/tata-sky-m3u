// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import fetch, { Headers } from "cross-fetch";

const baseUrl = "https://tm.tapi.videoready.tv";

const getAllChans = async () => {
    const requestOptions = { method: 'GET' };
    let err = null;
    let res = null;

    try {
        const response = await fetch("https://ts-api.videoready.tv/content-detail/pub/api/v1/channels?limit=599", requestOptions);
        res = await response.json();
    } catch (error) {
        console.log('error', error);
        err = error;
    }

    return { err, list: err ? null : res.data.list };
}

const getJWT = async (params, uDetails) => {
    const myHeaders = new Headers({
        'authority': 'tm.tapi.videoready.tv',
        'accept': '*/*',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'authorization': 'bearer ' + uDetails.token,
        'content-type': 'application/json',
        'device_details': JSON.stringify({
            pl: "web",
            os: "WINDOWS",
            lo: "en-us",
            app: "1.36.35",
            dn: "PC",
            bv: 103,
            bn: "CHROME",
            device_id: "YVJNVFZWVlZ7S01UZmRZTWNNQ3lHe0RvS0VYS0NHSwA",
            device_type: "WEB",
            device_platform: "PC",
            device_category: "open",
            manufacturer: "WINDOWS_CHROME_103",
            model: "PC",
            sname: uDetails.sName
        }),
        'kp': 'false',
        'locale': 'ENG',
        'origin': 'https://watch.tataplay.com',
        'platform': 'web',
        'profileid': uDetails.id,
        'referer': 'https://watch.tataplay.com/',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'sec-gpc': '1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.5060.66 Safari/537.36',
        'x-device-id': 'YVJNVFZWVlZ7S01UZmRZTWNNQ3lHe0RvS0VYS0NHSwA',
        'x-device-platform': 'PC',
        'x-device-type': 'WEB',
        'x-subscriber-id': uDetails.sid,
        'x-subscriber-name': uDetails.sName
    });

    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify(params),
        redirect: 'follow'
    };

    try {
        const response = await fetch(`${baseUrl}/auth-service/v1/oauth/token-service/token`, requestOptions);
        const result = await response.json();
        if (result?.message.toLowerCase().includes("api rate limit exceeded")) {
            return { retry: true };
        }
        return { token: result.data?.token };
    } catch (error) {
        console.log('error:', error);
        return { err: error };
    }
}

const getUserChanDetails = async (userChannels) => {
    const myHeaders = new Headers({
        'authority': 'tm.tapi.videoready.tv',
        'accept': '*/*',
        'accept-language': 'en-GB,en;q=0.9',
        'content-type': 'application/json',
        'device_details': JSON.stringify({
            pl: "web",
            os: "Linux",
            lo: "en-us",
            app: "1.36.35",
            dn: "PC",
            bv: 101,
            bn: "CHROME",
            device_id: "b70f9d50a3ea9cc7b77d4f1e04c41706",
            device_type: "WEB",
            device_platform: "PC",
            device_category: "open",
            manufacturer: "Linux_CHROME_101",
            model: "PC",
            sname: ""
        }),
        'locale': 'ENG',
        'origin': 'https://watch.tataplay.com',
        'referer': 'https://watch.tataplay.com/',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'cross-site',
        'sec-gpc': '1',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36'
    });

    const requestOptions = { method: 'GET', headers: myHeaders };
    let err = null;
    let result = [];
    let chanIds = userChannels.map(x => x.id);

    while (chanIds.length > 0) {
        const chanIdsStr = chanIds.splice(0, 99).join(',');
        try {
            const response = await fetch(`https://tm.tapi.videoready.tv/content-detail/pub/api/v1/live-tv-genre/channels?genre=&language=&channelIds=${chanIdsStr}`, requestOptions);
            const cData = await response.json();
            result.push(...cData.data.liveChannels);
        } catch (error) {
            console.log('error:', error);
            err = error;
        }
    }

    return { list: err ? null : result, err };
}

const generateM3u = async (ud) => {
    let errs = [];
    const ent = ud.ent;
    let userChans = [];
    const allChans = await getAllChans();

    if (allChans.err === null) {
        userChans = allChans.list.filter(x => x.entitlements.some(y => ent.includes(y)));
    } else {
        errs.push(allChans.err);
    }

    if (errs.length === 0) {
        const userChanDetails = await getUserChanDetails(userChans);
        let m3uStr = '';

        if (userChanDetails.err === null) {
            const chansList = userChanDetails.list;
            const jwtTokens = [];

            if (chansList.length > 0) {
                m3uStr = '#EXTM3U    x-tvg-url="https://www.tsepg.cf/epg.xml.gz"\n\n';
                const myEnts = [...ent];

                while (myEnts.length > 0) {
                    const myEnt = myEnts.shift();
                    const paramsForJwt = { action: "stream", epids: [{ epid: "Subscription", bid: myEnt }] };
                    let chanJwt = null;

                    try {
                        chanJwt = await getJWT(paramsForJwt, ud);
                        jwtTokens.push({ ent: myEnt, token: chanJwt.token });
                    } catch (err) {
                        myEnts.push(myEnt);
                    }
                }

                for (const chan of chansList) {
                    const chanEnts = chan.detail.entitlements.filter(val => ent.includes(val));
                    if (chanEnts.length > 0) {
                        const jwt = jwtTokens.find(j => j.ent === chanEnts[0])?.token;

                        m3uStr += `#EXTINF:-1  tvg-id="${chan.channelMeta.id}"  `;
                        m3uStr += `tvg-logo="${chan.channelMeta.logo}"   `;
                        m3uStr += `group-title="${chan.channelMeta.genre[0] !== "HD" ? chan.channelMeta.genre[0] : chan.channelMeta.genre[1]}", ${chan.channelMeta.channelName}\n`;
                        m3uStr += `#KODIPROP:inputstream.adaptive.license_type=com.widevine.alpha\n`;
                        m3uStr += `#KODIPROP:inputstream.adaptive.license_key=${chan.detail.dashWidewineLicenseUrl}&ls_session=${jwt}\n`;
                        m3uStr += `${chan.detail.dashWidewinePlayUrl}\n\n`;
                    }
                }
            } else {
                m3uStr = "Could not get channels. Try again later.";
            }
            return m3uStr;
        } else {
            return userChanDetails.err.toString();
        }
    } else {
        return errs.map(err => err.toString()).join('\n');
    }
}

export default async function handler(req, res) {
    try {
        const uData = {
            uAgent: req.headers['user-agent'],
            sid: req.query.sid.split('_')[0],
            id: req.query.id,
            sName: req.query.sname,
            token: req.query.tkn,
            ent: req.query.ent.split('_'),
            tsActive: req.query.sid.split('_')[1] !== "D"
        };

        if (uData.tsActive || process.env.NODE_ENV === 'development') {
            const m3uString = await generateM3u(uData);
            res.status(200).send(m3uString);
        } else {
            res.status(409).json({ error: "Tata Sky Deactivated" });
        }
    } catch (error) {console.error('Unhandled error:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
}