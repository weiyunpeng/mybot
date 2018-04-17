import { config, Wechaty, log } from 'wechaty';

import { onMessage } from './on-message';
import { onFriend } from './on-friend';
import { onRoomJoin } from './on-room-join';

const welcome = `请稍等，小助手正在启动...`;
console.log(welcome);

Wechaty.instance({ profile: config.default.DEFAULT_PROFILE })
    .on('scan', (url, code) => {
        if (!/201|200/.test(String(code))) {
            const loginUrl = url.replace(/\/qrcode\//, '/l/');
            require('qrcode-terminal').generate(loginUrl);
        }
        console.log(`${url}\n[${code}] Scan QR Code in above url to login: `);
    })

    .on('login', function(this, user) {
        log.info('Bot', `${user.name()} logined`);
        this.say(`wechaty logined`);
    })

    .on('logout', user => log.info('Bot', `${user.name()} logouted`))

    .on('error', error => log.info('Bot', 'error: %s', error))

    .on('message', onMessage)
    .on('friend', onFriend)
    .on('room-join', onRoomJoin)

    .start()
    .catch(e => console.error(e));
