var connectedMembers = {};
var bcidUUID = null;

function BroadcastChannelIEx(options) {
    var def = {
        channel: 'BroadcastChannelEx',
        idList: ['cat', 'dog', 'fish', 'squirrel']
    };
    for(var key in def) {
        options[key] = options[key] || def[key];
    }
    var uuid = bcidUUID = UUID.generate({version: 1});
    var bc = new BroadcastChannel(options.channel);
    var idList = options.idList;
    var myId = null;
    var isHost = false;
    var connectedMembers = null;
    var eventHandlers = {};

    function bcSend(msg) {
        bc.postMessage(JSON.stringify(msg));
    }

    this.emit = function(eventName, msg, to) {
        to = to || connectedMembers;
        if(to) {
            if(typeof to === 'string') to = [to];
            for(var id in connectedMembers) {
                bcSend({
                    eventName: eventName,
                    msg: msg,
                    toUUID: connectedMembers[id]
                });
            }
        } else {
            bcSend({
                eventName: eventName,
                msg: msg
            });
        }
    };

    this.on = function(eventName, eventHandler) {
        eventHandlers[eventName] = eventHandlers[eventName] || [];
        eventHandlers[eventName].push(eventHandler);
    }

    this.off = function(eventName, eventHandler) {
        if(!eventHandlers[eventName]) return;
        if(eventHandler) {
            var idx = eventHandlers[eventName].indexOf(eventHandler);
            if(idx === -1) return;
            eventHandlers[eventName].splice(idx, 1);
        } else {
            delete eventHandlers[eventName];
        }
    }

    bc.onmessage = function(evt) {
        var msg = JSON.parse(evt.data);
        if('toUUID' in msg && msg.toUUID !== uuid) return;

        if(msg.eventName) {
            if(!eventHandlers[eventName]) return;
            eventHandlers[eventName].forEach(eventHandler => eventHandler(msg));
            return;
        }

        if(msg.cmd) {
            switch(msg.cmd) {
                case 'join':
                    if(!connectedMembers) {
                        connectedMembers = {};
                        
                        if(!myId){
                            myId = idList[0];
                            if(options.onMyId) {
                                options.onUserId(myId);
                            }
                        }

                        connectedMembers[myId] = uuid;
                        idList.some(id => {
                            if(id !== myId) {
                                connectedMembers[id] = msg.remoteUUID;
                                send({
                                    cmd: 'joinRes',
                                    resId: id,
                                    toUUID: msg.remoteUUID,
                                    connectedMembers: connectedMembers
                                });
                                return true;
                            }
                            return false;
                        });
                        isHost = true;
                        if(options.onHost) {
                            options.onHost();
                        }
                    } else {
                        var find = idList.some(id => {
                            if(connectedMembers[id]) return false;
                            connectedMembers[id] = msg.remoteUUID;
                            if(isHost) {
                                send({
                                    cmd: 'joinRes',
                                    resId: id, 
                                    toUUID: msg.remoteUUID,
                                    connectedMembers: connectedMembers
                                });
                            } 
                            return true;
                        });
                        if(!find) {
                            send({
                                cmd: 'full',
                                toUUID: msg.remoteUUID,
                                connectedMembers: connectedMembers
                            });
                        }
                    }
                    break;
                case 'joinRes':
                    myId = msg.resId;
                    if(options.onMyId) {
                        options.onMyId(myId);
                    }
                    connectedMembers = msg.connectedMembers;
                    break;
                case 'leave':
                    delete connectedMembers[msg.remoteId];
                    if(msg.remoteIsHost) {
                        idList.some(id => {
                            if(connectedMembers[id]) {
                                if(myId === id) {
                                    isHost = true;
                                    if(options.onHost) {
                                        options.onHost();
                                    }
                                }
                                return true;
                            }
                            return false;
                        });
                    }
                    break;
                case 'full':
                    if(this.options.onFull) {
                        this.options.onFull();
                    }
                    connectedMembers = msg.connectedMembers;
                    break;
            }
        }
    };

    window.addEventListener('beforeunload', _ => {
        if(!myId) return;
        bcSend({
            cmd: 'leave',
            remoteId: myId, 
            remoteIsHost: isHost
        })
    });

    bcSend({
        cmd: 'join',
        remoteUUID: uuid
    })
}