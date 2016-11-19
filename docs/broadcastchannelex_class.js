const eventHandlers = Symbol('eventHandlers')
const bcSend = Symbol('bcSend')
const onmessage = Symbol('onmessage')

export default class bcex {
    constructor(options) {
        this.options = Object.assign({
            channel: 'BroadcastChannelEx',
            idList: ['cat', 'dog', 'fish', 'squirrel'],
            onMyId: _ => {},
            onHost: _ => {},
            onJoinMember: _ => {},
            onFull: _ => {}
        }, options)
        this.connectedMembers = {}
        this.uuid = UUID.generate({version: 1})
        this.bc = new BroadcastChannel(this.options.channel)
        this.myId = null
        this.isHost = false
        this[eventHandlers] = null
        this[bcSend] = msg => {
            this.bc.postMessage(JSON.stringify(msg))
        }

        window.addEventListener('beforeunload', _ => {
            if(!this.myId) return
            bcSend({
                cmd: 'leave',
                remoteId: this.myId, 
                remoteIsHost: this.isHost
            })
        });

        // bcSend({
        //     cmd: 'join',
        //     remoteUUID: uuid
        // })

        this.bc.onmessage = evt => {
            let msg = Object.assign({cmd: '-'}, JSON.parse(evt.data))
            if('toUUID' in msg && msg.toUUID !== uuid) return

            if(msg.eventName) {
                if(!this[eventHandlers][eventName]) return
                this[eventHandlers][eventName].forEach(eventHandler => eventHandler(msg))
                return
            }

            switch(msg.cmd) {
                case 'join':
                    if(!this.connectedMembers) {
                        this.connectedMembers = {}
                        this.myId = this.myId || idList[0]
                        this.options.onMyId(myId)
                        connectedMembers[myId] = this.uuid
                        let resId = idList.filter(id => id !== this.myId)[0]
                        connectedMembers[resId] = msg.remoteUUID
                        bcSend({
                            cmd: 'joinRes',
                            resId: resId,
                            toUUID: msg.remoteUUID,
                            connectedMembers: connectedMembers
                        })
                        this.isHost = true
                        this.options.onHost()
                    } else {
                        let resId = idList.filter(id => !!connectedMembers[id])[0]
                        if(resId) {
                            connectedMembers[resId] = msg.remoteUUID
                            if(this.isHost) {
                                bcSend({
                                    cmd: 'joinRes',
                                    resId: resId, 
                                    toUUID: msg.remoteUUID,
                                    connectedMembers: connectedMembers
                                })
                            }
                        } else {
                            bcSend({
                                cmd: 'full',
                                toUUID: msg.remoteUUID,
                                connectedMembers: connectedMembers
                            });
                        }
                    }
                    break;

                case 'joinRes':
                    this.myId = msg.resId
                    this.options.onMyId(myId)
                    connectedMembers = msg.connectedMembers
                    break;
                
                case 'leave':
                    if(!connectedMembers) return
                    delete connectedMembers[msg.remoteId]
                    if(msg.remoteIsHost) {
                        idList.some(id => {
                            if(connectedMembers[id] && myId === id) {
                                isHost = true;
                                this.options.onHost();
                                return true;
                            }
                            return false;
                        });
                    }
                    break;
                
                case 'full':
                    this.options.onFull();
                    connectedMembers = msg.connectedMembers;
                    break;
            }
        }
    }

    emit(eventName, msg, to) {
        to = to || this.connectedMembers
        if(to) {
            if(typeof to === 'string') to = [to]
            for(let id in to) {
                bcSend({
                    eventName: eventName,
                    msg: msg,
                    toUUID: to[id]
                });
            }
        } else {
            bcSend({eventName, msg})
        }
    }

    on(eventName, eventHandler) {
        eventHandlers[eventName] = eventHandlers[eventName] || []
        eventHandlers[eventName].push(eventHandler)
    }

    off(eventName, eventHandler) {
        if(!eventHandlers[eventName]) return
        if(eventHandler) {
            let idx = eventHandlers[eventName].indexOf(eventHandler)
            if(idx === -1) return
            eventHandlers[eventName].splice(idx, 1)
        } else {
            delete eventHandlers[eventName]
        }
    }
}
