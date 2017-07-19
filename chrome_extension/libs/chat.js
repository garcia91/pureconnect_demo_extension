var Chat = {
    targetWorkgroup: 'Service Client',
    _chatSessionInfo: '',
    _participants: { customer: { name: 'unknown', state: 'disconnected', telephone: '0' }, system: {}, agent: {} },
    _lastMessageBox: {},
    icServer: 'cic',
    baseUrl: function(){
      return 'http://' + this.icServer + ':8114'
    },

    initialize: function () {
        /*$('#btnSend').click(function () {
            Chat.sendMessage();
        });
        */
        console.log("keyup");
        $('#cx-chat-textmessage').keyup(function (event) {
            console.log("keyup");
            if (event.keyCode == 13 && !event.shiftKey) {
                Chat.sendMessage();
            }
        });
    },

    sendMessage: function () {
        var $message = $('#cx-chat-textmessage');
        Chat.sendChatMessage($message.val());
        $message.val('');
    },

    sendChatMessage: function (message) {
        var data = {
            "message": message,
            "contentType": "text/plain",
        };

        $.ajax({
            type: "POST",
            url: this.baseUrl() + "/websvcs/chat/sendMessage/" + Chat._chatSessionInfo.chat.participantID,
            data: JSON.stringify(data),
            success: function (res) {
                console.log('sendMessage', res);
            }
        });
    },

    start: function (options) {
        var data = {
            "supportedContentTypes": "text/plain",
            "participant":
            {
                "name": options.name,
                "credentials": "",
            },
            "target": Chat.targetWorkgroup,
            "targetType": "Workgroup",
            "language": "fr",
            "customInfo": options.subject,
            "attributes": options.attributes
        };
        console.log('data: ', data);

        $.ajax({
            type: "POST",
            url: this.baseUrl() + "/websvcs/chat/start",
            data: JSON.stringify(data),
            success: Chat.startManageChat
        });
    },

    startManageChat: function (chatSessionInfo) {
        console.log('Start manage chat', chatSessionInfo);

        Chat._chatSessionInfo = chatSessionInfo;
        Chat._participants.customer.id = Chat._chatSessionInfo.chat.participantID;

        setTimeout(Chat.pollNewChatEvents, chatSessionInfo.chat.pollWaitSuggestion);
    },

    pollNewChatEvents: function () {
        $.ajax({
            type: "GET",
            url: Chat.baseUrl() + "/websvcs/chat/poll/" + Chat._chatSessionInfo.chat.participantID,
            success: Chat.manageChatEvents
        });
    },

    manageChatEvents: function (chatEvents) {
        for (var i = 0; i < chatEvents.chat.events.length; i++) {
            var event = chatEvents.chat.events[i];
            switch (event.type) {
                case 'participantStateChanged':
                    switch (event.state) {
                        case 'active':
                            Chat.newAgentInConversation(event);
                            break;
                        case 'disconnected':
                            Chat.agentLeftConversation(event);
                            break;
                        default:
                            break;
                    }
                    console.log('participant state changed : [' + event.participantName + '] (' + event.participantID + '): ' + event.state);
                    break;
                case 'text':
                    Chat.displayNewMessage({ type: event.participantType, seq: event.conversationSequenceNumber, text: event.value });
                    console.log('text : [' + event.displayName + ']: ' + event.value);
                    break;
                case 'file':
                    Chat.displayNewFileMessage({ type: 'Agent', seq: event.conversationSequenceNumber, text: event.value });
                    break;
                case 'typingIndicator':
                    console.log('typingIndicator : ' + event.value);
                    Chat.displayTypingIndicator(event.value);
                    break;
                default:
                    break;
            }
        }

        setTimeout(Chat.pollNewChatEvents, chatEvents.chat.pollWaitSuggestion);
    },

    getChatHeight: function () {
      //return 0;
        return $('#cx-chat-conversation').height();
//        return $('#cx-chat-conversation').height() - $(".iScrollVerticalScrollbar.iScrollLoneScrollbar").height();
    },

    startAlerting: function(){

    },

    stopAlerting: function () {

    },

    displayNewFileMessage: function (message) {
        Chat.startAlerting();
        var filename = message.text.replace(/^.*[\\\/]/, '');
        message.text = "<a href=" + this.baseUrl() + message.text + "' target='_blank'>" + filename + "</a>";
        this.displayNewMessage(message);
    },

    displayNewMessage: function (message) {
        Chat.startAlerting();
        var htmlToAdd = "<p>" + message.text + "</p>";
        var $chat = $('#cx-chat-conversation');
        var $transcriptwrapper = $('.transcript-wrapper');
        console.log(Chat._lastMessageBox, Chat._participants.system.$lastMessageDiv, Chat._lastMessageBox !== Chat._participants.system.$lastMessageDiv);
        switch (message.type) {
            case 'System':
                if (message.seq == 0 && Chat._lastMessageBox !== Chat._participants.system.$lastMessageDiv) {
                  htmlToAdd = $("#cx-chat-system-message").html();
                  htmlToAdd = htmlToAdd.replace(/{{message}}/g, message.text);
                  htmlToAdd = htmlToAdd.replace(/{{time}}/g, moment().format("HH:mm"));
                  Chat._participants.system.$lastMessageDiv = $(htmlToAdd).appendTo($chat);
//                    htmlToAdd = '<img src="img/users/inin.png" alt="Photo" class="img-circle" style="width:46px;height:46px;position:relative;left:50%;margin-left:-23px">' + htmlToAdd;
//                    Chat._participants.system.$lastMessageDiv = $("<div class=\"well well-sm col-xs-offset-1 col-xs-10\">" + htmlToAdd + "</div>").appendTo($chat);
                }
                else{
                  Chat._participants.system.$lastMessageDiv.find(".message-text").append(htmlToAdd);
                }
                Chat._lastMessageBox = Chat._participants.system.$lastMessageDiv;
                $transcriptwrapper.animate({ scrollTop: Chat.getChatHeight() }, 1000);
                break;
            case 'WebUser':
                if (message.seq == 0 && Chat._lastMessageBox !== Chat._participants.customer.$lastMessageDiv) {
                    // Case new message
                    htmlToAdd = $("#cx-chat-webuser-message").html();
                    htmlToAdd = htmlToAdd.replace(/{{username}}/g, Chat._participants.customer.name);
                    htmlToAdd = htmlToAdd.replace(/{{message}}/g, message.text);
                    htmlToAdd = htmlToAdd.replace(/{{time}}/g, moment().format("HH:mm"));
                    Chat._participants.customer.$lastMessageDiv = $(htmlToAdd).appendTo($chat);
//                    htmlToAdd = '<img src="img/users/unknown_user.png" alt="Photo" class="img-circle" style="width:46px;height:46px;float: left;margin-right: 8px;">' + htmlToAdd;
//                    Chat._participants.customer.$lastMessageDiv = $("<div class=\"well well-sm col-xs-10 customerChatText\"><span><strong>" + Chat._participants.customer.name + "</strong></span>" + htmlToAdd + "</div>").appendTo($chat);
                }
                else // Case additionnal message
                    Chat._participants.customer.$lastMessageDiv.find(".message-text").append(htmlToAdd);

                Chat._lastMessageBox = Chat._participants.customer.$lastMessageDiv;
                $transcriptwrapper.animate({ scrollTop: Chat.getChatHeight() }, 1000);
                break;
            case 'Agent':
                if (message.seq == 0 && Chat._lastMessageBox !== Chat._participants.agent.$lastMessageDiv) {
                    htmlToAdd = $("#cx-chat-agent-message").html();
                    htmlToAdd = htmlToAdd.replace(/{{username}}/g, Chat._participants.agent.name);
                    htmlToAdd = htmlToAdd.replace(/{{message}}/g, message.text);
                    htmlToAdd = htmlToAdd.replace(/{{time}}/g, moment().format("HH:mm"));
                    Chat._participants.agent.$lastMessageDiv = $(htmlToAdd).appendTo($chat);

                    //htmlToAdd = '<img src="img/users/' + Chat._participants.agent.name + '.png" alt="Photo" class="img-circle" style="width:46px;height:46px;float: right;">' + htmlToAdd;
                    //Chat._participants.agent.$lastMessageDiv = $("<div class=\"well well-sm col-xs-offset-2 col-xs-10 agentChatText\"><span><strong>" + Chat._participants.agent.name + "</strong></span>" + htmlToAdd + "</div>").appendTo($chat);
                }
                else
                    Chat._participants.agent.$lastMessageDiv.find(".message-text").append(htmlToAdd);
                    //Chat._participants.agent.$lastMessageDiv.append(htmlToAdd);

                Chat._lastMessageBox = Chat._participants.agent.$lastMessageDiv;
                $transcriptwrapper.animate({ scrollTop: Chat.getChatHeight() }, 1000);
                break;
        }
    },

    displayTypingIndicator: function (typing) {
        /*var $lastAgentDiv = Chat._participants.agent.$lastMessageDiv;

        if ($lastAgentDiv !== undefined) {
            if (typing)
                $lastAgentDiv.append('<img id="typing" src="img/typing.gif" style="width:24px;">');
            else
                $('#typing').remove();
        }*/
    },

    newAgentInConversation: function (event) {
        switch (event.participantType) {
            case 'WebUser':
            case 'webUser':
                Chat._participants.customer.id = event.participantID;
                Chat._participants.customer.name = event.participantName;
                Chat._participants.customer.state = event.state;
                $('#cx-chat-textmessage').prop('disabled', false);
                break;
            case 'System':
                Chat._participants.system.id = event.participantID;
                Chat._participants.system.name = event.participantName;
                Chat._participants.system.state = event.state;
                break;
            case 'Agent':
                Chat._participants.agent.id = event.participantID;
                Chat._participants.agent.name = event.participantName;
                Chat._participants.agent.state = event.state;
                break;
        }
    },

    agentLeftConversation: function (event) {
        switch (event.participantType) {
            case 'WebUser':
            case 'webUser':
                Chat._participants.customer.state = event.state;
                $('#cx-chat-textmessage').prop('disabled', true);
                break;
            case 'System':
                Chat._participants.system.id = event.participantID;
                Chat._participants.system.name = event.participantName;
                Chat._participants.system.state = event.state;
                break;
            case 'Agent':
                Chat._participants.agent.id = event.participantID;
                Chat._participants.agent.name = event.participantName;
                Chat._participants.agent.state = event.state;
                break;
        }
    }

}

Chat.initialize();
