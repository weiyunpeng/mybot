import { Contact, Room, Sayable } from 'wechaty';

import {homeName} from './global'

export async function onRoomJoin(
    this: Sayable,
    room: Room,
    inviteeList: Contact[],
    inviter: Contact
): Promise<void> {
    try {
        const inviteeName = inviteeList.map(c => c.name()).join(', ');
        /********************************************
         *
         * 从这里开始修改 vvvvvvvvvvvv
         *
         */

        if (room.topic() !== homeName[1] || room.topic() !== homeName[2] || room.topic() !== homeName[3]) {
            await this.say(
                '群 ' +
                    room.topic() +
                    ' 增加了一个新成员 ' +
                    inviteeName +
                    ' 邀请人为： ' +
                    inviter.name()
            );
            return;
        }

        const inviterIsMyself = inviter.self();

        if (inviterIsMyself) {
            await room.say('欢迎加入群聊: ' + inviteeName);
            return;
        }

        await room.say('请勿私自拉人。需要拉人请加我', inviter);
        await room.say(
            '请先加我好友，然后我来拉你入群。先把你移出啦。',
            inviteeList
        );

        inviteeList.forEach(c => {
            room.del(c);
        });

        /**
         *
         * 到这里结束修改^^^^^^^^^^^^
         *
         */
        /*********************************************/
    } catch (e) {
        console.log(e);
    }

    return;
}
