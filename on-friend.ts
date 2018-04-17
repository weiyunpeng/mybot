import { Contact, FriendRequest, Room } from 'wechaty';
import { homeName, greetingsMsg } from './global';

export async function onFriend(
    contact: Contact,
    request?: FriendRequest
): Promise<void> {
    try {
        if (!request) {
            console.log('新的朋友' + contact.name() + '需要确认!');
            return;
        }
        /********************************************
         *
         * 从这里开始修改 vvvvvvvvvvvv
         *
         */
        await request.accept();

        setTimeout(async _ => {
            await contact.say(greetingsMsg);
        }, 3000);

        if (/沁阳|怀庆府/.test(request.hello)) {
            const myRoom = await Room.find({ topic: homeName[0] });
            if (!myRoom) return;
            setTimeout(async _ => {
                await myRoom.add(contact);
                await myRoom.say(
                    '大家欢迎： ' + contact.name() + '有什么问题可以@我哦!'
                );
            }, 3000);
        }

        /**
         *
         * 到这里结束修改 ^^^^^^^^^^^^
         *
         */
        /*******************************************/
    } catch (e) {
        console.log(e);
    }
}
