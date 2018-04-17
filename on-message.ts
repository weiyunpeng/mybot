import {
    createWriteStream,
    statSync
    // writeFileSync,
} from 'fs';

import { PassThrough, Readable } from 'stream';
import request = require('request');
import Ffmpeg = require('fluent-ffmpeg');
import querystring = require('querystring');

import { Message, Room, Contact, MediaMessage, MsgType } from 'wechaty';

import { homeName, robotName } from './global';

const AI = require('./utils/ai');

const Tuling123 = require('./utils/tuling');
const TULING123_API_KEY = '65fa7780b0744102848043705e17940b';
const tuling = new Tuling123(TULING123_API_KEY);

let warnNum: number = 3;
let path = 'images/';

export async function onMessage(message: Message) {
    try {
        if (message.self() || /开启了朋友验证/.test(message.content())) {
            return;
        }
        // if (/早餐/.test(message.from().name() + message.from().alias())) {
        //     return;
        // }

        /********************************************
         *
         * 从下面开始修改vvvvvvvvvvvv
         *
         */

        await addToGroups(message); // 加入群聊
        await talkToRobot(message); // 与小助手聊天

        /**
         *
         * 到这里结束修改^^^^^^^^^^^^
         *
         */
        /*********************************************/
    } catch (e) {
        console.error(e);
    }
}

let addToGroups = async function(message: Message): Promise<Boolean> {
    const sender = message.from();
    const fromRoom = message.room();
    const content = message.content();
    let myRoom;

    if (fromRoom !== null) {
        // 说明是来自群消息
        return false;
    }

    if (/沁阳|怀庆府/.test(content)) {
        myRoom = await Room.find({ topic: homeName[0] });
    }

    if (!myRoom) return false;
    if (myRoom.has(sender)) {
        await sender.say('您已经加入群啦!');
        return false;
    }

    await sender.say('马上拉您入群');
    setTimeout(async _ => {
        await myRoom.add(sender);
        await myRoom.say('大家欢迎： ' + sender.name());
    }, 3000);
    return false;
};

let talkToRobot = async function(message: Message): Promise<Boolean> {
    const fromRoom = message.room();
    if (!fromRoom || fromRoom === null) return false;
    const topic = fromRoom.topic();

    const msgContent = message.content();
    const myRoom = await Room.find({ topic: topic });
    if (!myRoom) return false;

    if (/^@/.test(msgContent)) {
        let mentionName = message
            .content()
            .slice(1) /*ignoring@*/
            .replace(' ' /*Space Char in Chinese*/, ' ')
            .split(' ')[0];
        let userMsg = message
            .content()
            .slice(1) /*ignoring@*/
            .replace(' ' /*Space Char in Chinese*/, ' ')
            .split(' ')[1];
        if (mentionName == robotName) {
            // 说明是＠小助手
            if (topic === homeName[0]) {
                if (/问/.test(userMsg) && /答/.test(userMsg)) {
                    let idx1 = msgContent.indexOf('问');
                    let idx2 = msgContent.indexOf('答');
                    let q = msgContent.slice(idx1 + 1, idx2).trim();
                    let a = msgContent.slice(idx2 + 1).trim();
                    AI.addQA(q, a, async () => {
                        await myRoom.say('好哒，我学会啦');
                        return false;
                    });
                } else {
                    AI.answer(userMsg).then(async qryRes => {
                        let l = qryRes.length;
                        if (l === 0) {
                            let replyMsg = await tulingMsg(message,'');
                            if(!replyMsg) return false
                            setTimeout(async () => {
                                myRoom.say(replyMsg);
                            }, 100);
                            return false;
                        } else {
                            let qa = qryRes[Math.floor(Math.random() * l)];
                            myRoom.say(qa['a']);
                        }
                        return false;
                    });
                    if (message instanceof MediaMessage) {
                        // myRoom.say(message);
                        let textMsg = await voiceMsg(message);
                        myRoom.say(`你说的是: ${textMsg}`);
                        let replyMsg = await tulingMsg(message,textMsg);
                        if(!replyMsg) return false
                        setTimeout(async () => {
                            myRoom.say(replyMsg);
                            return false;
                        }, 100);
                    }
                }
            }
        } else {
            await delPeson(message, myRoom, mentionName);
        }
    }
    return false;
};

let delPeson = async function(message, room, mentionName): Promise<Boolean> {
    const content = message.content();
    if (/踢/.test(content)) {
        warnNum--;

        if (warnNum === 1 || warnNum === 0 || warnNum < 0) {
            const contact = await Contact.find({ name: mentionName });
            if (!contact) return false;
            await room.del(contact);
            await room.say(`已将 ${mentionName} 踢出群聊`);
            warnNum = 3;
            return false;
        }

        await room.say(
            `本群禁止发链接，投票，打广告。如不遵从大家可以＠他并说“踢”字，没见红包直接送机票。`
        );
        await room.say(
            `@${mentionName} :再有　${warnNum}　个人说踢你直接送机票`
        );
        return false;
    }
    return false;
};

// let tulingMsg = async function(message: Message, text): Promise<string> {
//     const reply = await tuling.ask((text = text ? text : message.content()), {
//         userid: message.from()
//     });
//     return reply;
// };

let voiceMsg = async function(message: Message): Promise<string> {
    if (message.type() !== MsgType.VOICE) {
        return ''; // skip no-VOICE message
    }

    const mp3Stream = await (message as MediaMessage).readyStream();

    const file = createWriteStream(path + message.filename());
    mp3Stream.pipe(file);

    const text = await speechToText(mp3Stream);
    console.log('VOICE TO TEXT: ' + text);
    return text;
};

async function saveMediaFile(stream) {
    const filename = path + new Date().getTime() + '.wav';
    console.log('IMAGE local filename: ' + filename);

    const fileStream = createWriteStream(filename);
    // const fileStream = createWriteStream(dir + '/' + filename);

    console.log('start to readyStream()');
    try {
        const netStream = stream;
        netStream.pipe(fileStream).on('close', _ => {
            const stat = statSync(filename);
            console.log(
                'finish readyStream() for ',
                filename,
                ' size: ',
                stat.size
            );
        });
    } catch (e) {
        console.error('stream error:', e);
    }
}

async function speechToText(mp3Stream: Readable): Promise<string> {
    const wavStream = mp3ToWav(mp3Stream);

    await saveMediaFile(wavStream);

    try {
        const text = await wavToText(wavStream);
        return text;
    } catch (e) {
        console.log(e);
        return '';
    }
}

function mp3ToWav(mp3Stream: Readable): NodeJS.ReadableStream {
    const wavStream = new PassThrough();

    Ffmpeg(mp3Stream)
        .fromFormat('mp3')
        .toFormat('wav')
        .pipe(wavStream as any)

        // .on('start', function(commandLine) {
        //   console.log('Spawned Ffmpeg with command: ' + commandLine);
        // })
        // .on('codecData', function(data) {
        //   console.log('Input is ' + data.audio + ' audio ' +
        //     'with ' + data.video + ' video');
        // })
        // .on('progress', progress => {
        //   console.log('Processing: ' + progress.percent + '% done');
        // })
        // .on('end', function() {
        //   console.log('Finished processing');
        // })
        .on('error', function(err, stdout, stderr) {
            console.log('Cannot process video: ' + err.message);
        });

    return wavStream;
}

/**
 * Baidu:
 * export BAIDU_SPEECH_API_KEY=FK58sUlteAuAIXZl5dWzAHCT
 * export BAIDU_SPEECH_SECRET_KEY=feaf24adcc5b8f02b147e7f7b1953030
 * curl "https://openapi.baidu.com/oauth/2.0/token?grant_type=client_credentials&client_id=${BAIDU_SPEECH_API_KEY}&client_secret=${BAIDU_SPEECH_SECRET_KEY}"
 *
 * OAuth: http://developer.baidu.com/wiki/index.php?title=docs/oauth/overview
 * ASR: http://yuyin.baidu.com/docs/asr/57
 */

async function wavToText(wavStream: NodeJS.ReadableStream): Promise<string> {
    const params = {
        cuid: 'wechaty',
        lan: 'zh',
        token:
            '24.67346345466cecf6c105093081662d56.2592000.1526463932.282335-10898764'
    };

    const apiUrl =
        'http://vop.baidu.com/server_api?' + querystring.stringify(params);

    const options = {
        headers: {
            'Content-Type': 'audio/wav; rate=8000'
        }
    };

    return new Promise<string>((resolve, reject) => {
        wavStream.pipe(
            request.post(apiUrl, options, (err, httpResponse, body) => {
                // "err_msg":"success.","err_no":0,"result":["这是一个测试测试语音转文字，"]
                if (err) {
                    return reject(err);
                }
                try {
                    const obj = JSON.parse(body);
                    if (obj.err_no !== 0) {
                        throw new Error(obj.err_msg);
                    }

                    return resolve(obj.result[0]);
                } catch (err) {
                    return reject(err);
                }
            })
        );
    });
}

let tulingMsg = async function(message: Message,text): Promise<string> {
    const reply = await tuling.ask(text?text:message.content(), {
        userid: message.from()
    });
    return reply;
};