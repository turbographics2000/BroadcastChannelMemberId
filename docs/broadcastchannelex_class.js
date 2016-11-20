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
            onLeaveMember: _ => {},
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
            this[bcSend]({
                cmd: 'leave',
                remoteId: this.myId,
                remoteIsHost: this.isHost
            })
        })

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
                    if(this.connectedMembers) {
                        let resId = idList.filter(id => !!this.connectedMembers[id])[0]
                        if(resId) {
                            this.connectedMembers[resId] = msg.remoteUUID
                            if(!this.isHost) return
                            this[bcSend]({
                                cmd: 'joinRes',
                                resId: resId,
                                toUUID: msg.remoteUUID,
                                connectedMembers: this.connectedMembers
                            })
                        } else {
                            this[bcSend]({
                                cmd: 'full',
                                toUUID: msg.remoteUUID,
                                connectedMembers: this.connectedMembers
                            })
                        }
                    } else {
                        this.connectedMembers = {}
                        this.myId = this.myId || idList[0]
                        this.options.onMyId(this.myId)
                        connectedMembers[this.myId] = this.uuid
                        let resId = idList.filter(id => id !== this.myId)[0]
                        connectedMembers[resId] = msg.remoteUUID
                        this[bcSend]({
                            cmd: 'joinRes',
                            resId: resId,
                            toUUID: msg.remoteUUID,
                            connectedMembers: this.connectedMembers
                        })
                        this.isHost = true
                        this.options.onHost()
                    }
                    break

                case 'joinRes':
                    this.myId = msg.resId
                    this.options.onMyId(myId)
                    this.connectedMembers = msg.connectedMembers
                    break
                
                case 'leave':
                    if(!this.connectedMembers) return
                    delete this.connectedMembers[msg.remoteId]
                    if(!Object.keys(this.connectedMembers).length) this.connectedMembers = null
                    if(msg.remoteIsHost) {
                        idList.some(id => {
                            if(this.connectedMembers[id] && this.myId === id) {
                                this.isHost = true
                                this.options.onHost()
                                return true
                            }
                            return false
                        })
                    }
                    break
                
                case 'full':
                    this.options.onFull()
                    this.connectedMembers = msg.connectedMembers
                    break
            }
        }
    }

    join() {
        this[bcSend]({
            cmd: 'join',
            remoteUUID: this.uuid
        })
    }

    emit(eventName, msg, to) {
        to = to || this.connectedMembers
        if(to) {
            if(typeof to === 'string') to = [to]
            for(let toUUID of to) {
                bcSend({eventName, msg, toUUID})
            }
        } else {
            bcSend({eventName, msg})
        }
    }

    on(eventName, eventHandler) {
        this[eventHandlers][eventName] = this[eventHandlers][eventName] || []
        this[eventHandlers][eventName].push(eventHandler)
    }

    off(eventName, eventHandler) {
        if(!this[eventHandlers][eventName]) return
        if(eventHandler) {
            let idx = this[eventHandlers][eventName].indexOf(eventHandler)
            if(idx === -1) return
            this[eventHandlers][eventName].splice(idx, 1)
        } else {
            delete this[eventHandlers][eventName]
        }
    }
}
