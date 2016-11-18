var connectedMembers = {};
var bcidUUID = null;

(function() {
    var uuid = bcidUUID = UUID.generate({version: 1});
    var bcidChannel = new BroadcastChannel('broadcast-memberid');
    var idList = ['cat', 'dog', 'fish', 'squirrel'];
    var myId = null;
    var isHost = false;

    function send(msg) {
        bcidChannel.postMessage(JSON.stringify(msg));
    }

    send({bcidcmd: 'join', remoteUUID: uuid});

    bcidChannel.addEventListener('message', function(evt) {
        var msg = JSON.parse(evt.data);
        if(!msg.bcidcmd) return;
        if('toUUID' in msg && msg.toUUID !== uuid) return;
        switch(msg.bcidcmd) {
            case 'join':
                var memberCount = Object.keys(connectedMembers).length;
                if(memberCount === 0) {
                    myId = myId || idList[0];
                    connectedMembers[myId] = uuid;
                    idList.some(id => {
                        if(id !== myId) {
                            connectedMembers[id] = msg.remoteUUID;
                            send({
                                bcidcmd: 'joinRes',
                                resId: id,
                                toUUID: msg.remoteUUID,
                                connectedMembers: connectedMembers
                            });
                            return true;
                        }
                        return false;
                    });
                    isHost = true;
                    dispMyId.textContent = myId;
                } else {
                    var find = idList.some(id => {
                        if(connectedMembers[id]) return false;
                        connectedMembers[id] = msg.remoteUUID;
                        if(isHost) {
                            send({
                                bcidcmd: 'joinRes',
                                resId: id, 
                                toUUID: msg.remoteUUID,
                                connectedMembers: connectedMembers
                            });
                        } 
                        return true;
                    });
                    if(!find) {
                        send({
                            bcidcmd: 'limit',
                            toUUID: msg.toUUID
                        });
                    }
                }
                break;
            case 'joinRes':
                myId = msg.resId;
                dispMyId.textContent = myId;
                connectedMembers = msg.connectedMembers;
                break;
            case 'leave':
                delete connectedMembers[msg.remoteId];
                if(msg.remoteIsHost) {
                    idList.some(id => {
                        if(connectedMembers[id]) {
                            if(myId === id) isHost = true;
                            return true;
                        }
                        return false;
                    });
                }
                break;
            case 'limit':
                dispMyId.text = '満員です';
                break;
        }
    });

    window.onbeforeunload = function() {
        if(!myId) return;
        send({
            bcidcmd: 'leave',
            remoteId: myId, 
            remoteIsHost: isHost
        });
    }
})();
