var connectedMembers = {};

(function() {
    var uuid = UUID.generate({version: 1});
    var bcidChannel = new BroadcastChannel('broadcast-memberid');
    var idList = ['cat', 'dog', 'fish', 'squirrel'];
    var myId = null;
    var isHost = false;

    function send(msg) {
        bcidChannel.postMessage(JSON.stringify(msg));
    }

    send({bcidcmd: 'join'});

    bcidChannel.addEventListener('message', function(evt) {
        var msg = JSON.parse(evt.data);
        if(!msg.bcidcmd) return;
        if('toUUID' in msg && msg.toUUID !== uuid) return;
        switch(msg.bcidcmd) {
            case 'join':
                var memberCount = Object.keys(connectedMembers).length;
                if(memberCount === 0) {
                    myId = myId || idList[0];
                    idList.some(id => {
                        if(id !== myId) {
                            send({
                                bcidcmd: 'joinRes',
                                resId: id,
                                remoteUUID: uuid, 
                                toUUID: msg.remoteUUID
                            });
                            return true;
                        }
                        return false;
                    });

                    isHost = true;
                    dispMyId.textContent = myId;
                } else {
                    idList.some(id => {
                        if(connectedMembers[id]) return;
                        connectedMembers[id] = msg.remoteUUID;
                        if(isHost) {
                            send({
                                bcidcmd: 'joinRes',
                                resId: id, 
                                remoteUUID: uuid, 
                                toUUID: msg.remoteUUID
                            });
                        } 
                    });
                }
                break;
            case 'joinRes':
                myId = msg.resId;
                dispMyId.textContent = myId;
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
        }
    });

    window.onbeforeunload = function() {
        send({
            bcidcmd: 'leave',
            remoteId: myId, 
            remoteIsHost: isHost
        });
    }
})();
