var Callback = {

    targetWorkgroup: 'Service Client',
    icServer: 'cic',
    baseUrl: function(){
      return 'http://' + this.icServer + ':8114/websvcs'
    },

    initialize: function(){

    },

    /* Start the callback*/
    start: function (options) {
        var that = this;
        var data = {
            "target": this.targetWorkgroup,
            "targetType": "Workgroup",
            "subject": options.subject,
            "participant":
            {
                "name": options.name,
                "credentials": "",
                "telephone": options.phone
            },
            "language": "fr",
            //"customInfo": options.notes,
            "attributes": options.attributes
        };
        console.log('data: ', data);

        console.log(this.baseUrl() + "/callback/create");
        $.post({
            url: this.baseUrl() + "/callback/create",
            data: JSON.stringify(data)
          })
          .done(function(res) {
            console.log(res);
            if (res.callback.callbackID != undefined) {
                // Callback success
                console.log('Callback success!');
                Callback.startManageSession(res);
            }
            if(options.success){
              options.success(res);
            }
          })
          .fail(function(err) {
            alert( "error" );
          })
    },

    /* Start Manage callback session (recurrent poll request) */
    startManageSession: function (sessionInfo) {
        Callback._sessionInfo = sessionInfo;
        setTimeout(Callback.pollNewEvents, sessionInfo.callback.pollWaitSuggestion);
    },

    /* Poll new events related to the callback */
    pollNewEvents: function(){
        $.ajax({
            type: "GET",
            url: Callback.baseUrl() + "/callback/status/" + Callback._sessionInfo.callback.participantID,
            success: Callback.manageEvent
        });
    },

    /* Manage callback event update */
    manageEvent: function (event) {
        /* Div where to put callback info */
        var $callbackBox = $('#callbackBox');

        var callback = event.callback;

        var html = "<p>" + callback.acdStatus.interactionState + "</p>";
        /* If the estimated callback time is working, add the info */
        if (callback.acdStatus.estimatedCallbackTime > -1) {
            html += "<p><img src='img/wait_time.png' style='width:32px;height:32px;'/> " + callback.acdStatus.estimatedCallbackTime + " sec</p>";
        }
        $callbackBox.html(html);

        setTimeout(Callback.pollNewEvents, 2000);
    },
};

/* Initialize callback object */
Callback.initialize();
