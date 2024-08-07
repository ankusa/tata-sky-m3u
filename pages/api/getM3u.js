import fetch, { Headers } from "cross-fetch";

// Define the base URL
const baseUrl = "https://tm.tapi.videoready.tv";

// Fetch all channels
const getAllChans = async () => {
    let err = null;
    let res = null;

    try {
        const response = await fetch("https://ts-api.videoready.tv/content-detail/pub/api/v1/channels?limit=599");
        res = await response.json();
    } catch (error) {
        console.log('Error fetching channels:', error);
        err = error;
    }

    return { err, list: res?.data?.list || [] };
}

// Get JWT token for authorization
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

    const raw = JSON.stringify(params);
    const requestOptions = {
        method: 'POST',
        headers: myHeaders,
        body: raw,
        redirect: 'follow'
    };

    let err = null;
    let result = null;

    try {
        const response = await fetch(baseUrl + "/auth-service/v1/oauth/token-service/token", requestOptions);
        result = await response.json();
        if (result?.message.toLowerCase().includes("API Rate Limit Exceeded".toLowerCase())) {
            return { retry: true };
        }
    } catch (error) {
        console.log('Error getting JWT:', error);
        err = error;
    }

    return { err, token: result?.data?.token };
}

// Fetch user channel details
const getUserChanDetails = async (userChannels) => {
    const myHeaders = new Headers({
        "authority": "tm.tapi.videoready.tv",
        "accept": "*/*",
        "accept-language": "en-GB,en;q=0.9",
        "content-type": "application/json",
        "device_details": JSON.stringify({
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
        "locale": "ENG",
        "origin": "https://watch.tataplay.com",
        "referer": "https://watch.tataplay.com/",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "cross-site",
        "sec-gpc": "1",
        "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36"
    });

    let err = null;
    let result = [];

    let chanIds = userChannels.map(x => x.id);
    let chanIdsStr = '';

    while (chanIds.length > 0) {
        chanIdsStr = chanIds.splice(0, 99).join(',');
        try {
            const response = await fetch(`https://tm.tapi.videoready.tv/content-detail/pub/api/v1/live-tv-genre/channels?genre=&language=&channelIds=${chanIdsStr}`, { method: 'GET', headers: myHeaders });
            const cData = await response.json();
            result.push(...cData.data.liveChannels);
        } catch (error) {
            console.log('Error fetching user channel details:', error);
            err = error;
        }
    }

    return { err, list: result };
}

// Generate the M3U playlist
const generateM3u = async (ud) => {
    const ent = ud.ent;
    let userChans = [];
    const allChans = await getAllChans();

    if (allChans.err === null) {
        userChans = allChans.list.filter(x => x.entitlements.some(y => ent.includes(y)));
    } else {
        return "Error fetching channels.";
    }

    let m3uStr = '';
    if (userChans.length > 0) {
        const userChanDetails = await getUserChanDetails(userChans);

        if (userChanDetails.err === null) {
            const chansList = userChanDetails.list;
            let jwtTokens = [];

            if (chansList.length > 0) {
                m3uStr = '#EXTM3U    x-tvg-url="https://www.tsepg.cf/epg.xml.gz"\n\n';
                const myEnts = [...ent];
                
                while (myEnts.length > 0) {
                    const myEnt = myEnts.shift();
                    let paramsForJwt = { action: "stream", epids: [{ epid: "Subscription", bid: myEnt }] };
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
                        const jwt = jwtTokens.find(j => j.ent === chanEnts[0])?.token || '';
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
        } else {
            m3uStr = userChanDetails.err.toString();
        }
    } else {
        m3uStr = "No channels available.";
    }

    return m3uStr;
}

// API route handler
export default async function handler(req, res) {
    let uData = {
        uAgent: req.headers['user-agent'],
        sid: req.query.sid.split('_')[0],
        id: req.query.id,
        sName: req.query.sname,
        token: req.query.tkn,
        ent: req.query.ent.split('_'),
        tsActive: req.query.sid.split('_')[1] !== "D"
    };

    try {
        let m3uString = await generateM3u(uData);