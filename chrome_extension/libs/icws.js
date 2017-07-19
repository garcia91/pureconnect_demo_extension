/*
    ICWS Lib


    Laurent Millan - Interactive Intelligence
    laurent.millan@inin.com
 */
(function (window, $) {
    'use strict';

    var INFO = false;
    var DEBUG = false;

    function define_ICWS() {
        var ICWS = {
            applicationName: "ICWS Example Application",
            URI_SCHEME: 'http://',
            URI_SERVER: 'localhost', // IC Server IP
            URI_PORT: '8018',
            URI_PATH: '/icws',
            PULL_MESSAGES_TIMEOUT: 2000,
            baseURI: function () {
                return this.URI_SCHEME + this.URI_SERVER + ':' + this.URI_PORT;
            },
            REQUEST_TIMEOUT_MS: 60000,
            MEDIA_TYPE: 'application/vnd.inin.icws+JSON',
            MEDIA_CHARSET: 'charset=utf-8',
            LANGUAGE: 'en-us',
            floorMap: {
                imageSizeFactor: 1.5 // How much you want to scale the layout
            },
            i3Directory: {
                users: 'http://cic-demo-1/i3_directory/users/', // User pictures should have the name : "agentId".png
                locations: 'http://cic-demo-1/i3_directory/locations/' // Not used
            }
        }

        /***** ICWS start
        *   Initialize ICWS lib.
        *   Possible options:
        *       - applicationName : the name of the application
        *       - URI_SERVER : Hostname or IP Address of the main IC Server
        *       - URI_PORT : Port for ICWS on IC Server
        *       - i3DirectoryUsers : Base URL where User pictures are located. Pictures will be retreive @ agentId.png
        *       - login : {username: "icadmin", password: "pwd", success: callback} Ask for an auto login
        *********************************************/
        ICWS.start = function (options) {
            if (options.applicationName)
                ICWS.applicationName = options.applicationName;

            if (options.icServerHostname)
                ICWS.URI_SERVER = options.icServerHostname;

            if (options.icServerPort)
                ICWS.URI_PORT = options.icServerPort;

            if (options.i3DirectoryUsers)
                ICWS.i3Directory.users = options.i3DirectoryUsers;

            if (options.username && options.password) {
                if(options.loginSuccess)
                    ICWS.login(options.username, options.password, options.loginSuccess);
                else
                    ICWS.login(options.username, options.password, function(){});
            }
        }

        ICWS.query = function (method, requestPath, options, resultCallback) {
            var xmlHttp, uri;
            var payload = options.payload;

            if (options.connected === undefined)
                options.connected = true;

            // Use an XHR to make the web service request.
            xmlHttp = new XMLHttpRequest();

            // Once it's available, process the request response.
            xmlHttp.onreadystatechange = function () {
                if (xmlHttp.readyState === 4) {
                    if (!ICWS.sessionId || !options.connected) {
                        var responseText = JSON.parse(xmlHttp.responseText);
                        ICWS.sessionId = responseText.sessionId;
                        ICWS.csrfToken = responseText.csrfToken;
                    }
                    ICWS.sendRequestCompleted(xmlHttp, resultCallback);
                }
            };

            // Create the base URI, using the ICWS port, with the specified server and session ID.
            uri = ICWS.URI_SCHEME + ICWS.URI_SERVER + ':' + ICWS.URI_PORT + ICWS.URI_PATH;
            // Once a session has been established, subsequent requests for that session require its session ID.
            // (This is not provided when establishing the initial connection.)
            if (options.connected)
                uri += '/' + ICWS.sessionId;

            // Add the specific ICWS request to the URI being built.
            if (requestPath.substring(0, 1) !== '/') {
                uri += '/';
            }
            uri += requestPath;

            // Adding custom template string
            if (options.template) {
                for (var i = 0; i < options.template.length; i++) {
                    var templateItem = options.template[i];
                    uri += '/' + templateItem;
                }
            }

            // Adding custom query strings
            if (options.query) {
                var queryItem = options.query[0];
                uri += '?' + Object.keys(queryItem)[0] + '=' + queryItem[Object.keys(queryItem)[0]]; // Object.keys(queryItem)[0]  => name of the property
                for (var i = 1; i < options.query.length; i++) {
                    var queryItem = options.query[i];
                    uri += '&' + Object.keys(queryItem)[0] + '=' + queryItem[Object.keys(queryItem)[0]];
                }
            }

            // Open the HTTP connection.
            xmlHttp.open(method, uri, true);

            // Specify that credentials should be used for the request, in order to work correctly with CORS.
            xmlHttp.withCredentials = true;

            xmlHttp.timeout = ICWS.REQUEST_TIMEOUT_MS;

            // If the ICWS request is for an existing session, then the session's CSRF token must be set as
            // a header parameter.
            // (This is not provided when establishing the initial connection.)
            if (options.connected)
                xmlHttp.setRequestHeader('ININ-ICWS-CSRF-Token', ICWS.csrfToken);

            // The ICWS content-type must be specified.
            xmlHttp.setRequestHeader('Content-type', ICWS.MEDIA_TYPE + ';' + ICWS.MEDIA_CHARSET);
            xmlHttp.setRequestHeader('Accept-Language', ICWS.LANGUAGE);

            // Adding custom header if needed
            if (options.header) {
                for (var i = 0; i < options.header.length; i++) {
                    var customHeader = options.header[i];
                    xmlHttp.setRequestHeader(customHeader.name, customHeader.value);
                }
            }


            // Allow JSON to be provided as an option, then convert it to a string.
            if (typeof payload !== 'string' && !(payload instanceof String)) {
                payload = JSON.stringify(payload);
            }

            // Send the request.
            xmlHttp.send(payload);
        }

        ICWS.sendRequestCompleted = function (xmlHttp, resultCallback) {
            var status, responseText, response;

            status = xmlHttp.status;

            // Handle 401 failures as server disconnects.
            if (status === 401) {
                /*connectionStateChanged({
                    newConnectionState: 'down',
                    reason: 'No connection to server.'
                });*/
            }

            // Process the response body.
            responseText = xmlHttp.responseText;
            if (responseText) {
                try {
                    response = JSON.parse(responseText);
                } catch (e) {
                    /* If the JSON cannot be parsed, use an empty object for response. */
                    response = {};
                }
            } else {
                response = {};
            }

            // Signal the request result to the caller's callback.
            resultCallback(status, response);
        }

        /******* Method to logon ICWS *******/
        ICWS.login = function (userID, password, callback) {
            var loginRequestOptions = {
                connected: false,
                payload: {
                    "__type": "urn:inin.com:connection:icAuthConnectionRequestSettings",
                    "applicationName": ICWS.applicationName,
                    "userID": userID,
                    "password": password
                }
            }

            ICWS.query('POST', '/connection', loginRequestOptions, function (status, response) {
                if (callback)
                    callback(response);
            });
        }

        ICWS.fetch = function (options) {
          var success = options.success;
          var error = options.error;
          ICWS.sync('read', options, options, success, error);
        }

        ICWS.update = function (options) {
          var success = options.success;
          var error = options.error;
          ICWS.sync('update', options, options, success, error);
        }

        ICWS.post = function (options) {
          var success = options.success;
          var error = options.error;
          ICWS.sync('create', options, options, success, error);
        }

        ICWS.delete = function (options) {
          var success = options.success;
          var error = options.error;
          ICWS.sync('delete', options, options, success, error);
        }

        /***** Sync for ICWS
        *   CRUD for ICWS objects.
        *********************************************/
        ICWS.sync = function (method, object, options, success, error) {
          var syncCallback = function (status, response) {
            if (status) {
              if(success && !response.errorId)
                success(response);
              else{
                if(error)
                  error(response);
              }
            }
            else {
              if(error)
                error(response);
            }
          };

          var requestOptions = { };

          if (options && options.icwsOptions){
            requestOptions = options.icwsOptions;
            requestOptions.connected = true;
          }
          else{
            requestOptions.query = [{ select: '*' }];
            requestOptions.connected = true;
          }

          switch (method) {
            case 'create':
              requestOptions.payload = object.representation;
              ICWS.query('POST', object.url, requestOptions, syncCallback);
              break;
            case 'read':
              if (object.id) // It's a single object \n=> we want the object id in the request template
                requestOptions.template = [object.id];
              ICWS.query('GET', object.url, requestOptions, syncCallback);
              break;
            case 'update':
              requestOptions.payload = object.representation;
              ICWS.query('PUT', object.url, requestOptions, syncCallback);
              break;
            case 'delete':
              requestOptions.payload = object.representation;
              ICWS.query('DELETE', object.url, requestOptions, syncCallback);
              break;
          }
        }

        /***** Inflate an object
        *   Inflate any object :
        *       - refObject: The referece to the object you want to inflate.
        *           It MUST contains "id" and "uri" properties
        *       - fetch: true if you want to fetch the object immediately
        *       - success: callback when object has been inflated
        *       - Returns: the inflated object.
        *********************************************/
        ICWS.inflate = function (refObject, fetch, success) {
            var url = refObject.url;
            var id = refObject.id;
            var collectionAnchor = refObject.collectionAnchor;

            // Inflate a new Model
            if (id) {
                // If "url" is not defined, parse "uri"
                if (!url) {
                    url = refObject.uri.substring(0, refObject.uri.length - id.length - 1)
                }

                return new ICWS.BaseObject({
                    id: id,
                    url: url,
                    fetch: fetch,
                    success: success
                });
            }
            else { // Inflate a new Collection
                return new ICWS.BaseCollection({
                    url: url,
                    fetch: fetch,
                    collectionAnchor: collectionAnchor,
                    success: success
                });
            }
        }

        /***** The ICWS Base Object
        *   The Model inflated by ICWS.inflate method.
        *********************************************/
        ICWS.BaseObject = function BaseObject(options){
          var self = this;

          this.sync = function(method, options, success, error){
            if(DEBUG) console.log("\n=> ICWS.BaseObject.sync: ", method, options);
            return ICWS.sync(method, this, options, success, error);
          }

          this.fetch = function(options){
            return ICWS.sync('read', this, options, options.success, options.error);
          }

          this.initialize = function(options){
            self.id = -1;
            if(options.id) // No id when creating a new object
              self.id = options.id;
            self.url = options.url;

            self.representation = {};
            if(options.representation)
              self.representation = options.representation;

            if (options.sync) {
              if(self.id != -1){ // fetch the object
                ICWS.sync('read', this, {icwsOptions: { query: [{ select: '*' }]}},
                  options.success, options.error);
              }
              else{ // Creates the object using attributes
                ICWS.sync('create', this, {}, options.success, options.error );
              }
            }
          }

          this.on = function(messageType, icwsOptions, fn){
            ICWS.MessageManager.on({
              messageType: messageType,
              url: self.url,
              icwsOptions: icwsOptions,
              representation: self,
              handleEvent: fn
            })
          }

          this.off = function(messageType, fn){
            ICWS.MessageManager.off(messageType, self, function(res){
              fn(res);
            })
          }

          this.initialize(options);
        }

        /***** The ICWS Base Collection
        *   The Collection inflated by ICWS.inflate method.
        *********************************************/
        ICWS.BaseCollection = function BaseCollection(options){
          var self = this;

          this.sync = function(method, options, success, error){
            if(DEBUG) console.log("\n=> ICWS.BaseCollection.sync: ", method, options);
            return ICWS.sync(method, this, options, success, error);
          }

          this.fetch = function(options){
            return ICWS.sync('read', this, options, options.success, options.error);
          }

          this.initialize = function(options){
            self.url = options.url;

            self.representation = {};
            if(options.representation)
              self.representation = options.representation;

            if (options.sync) {
                ICWS.sync('read', this, {icwsOptions: { query: [{ select: '*' }]}},
                  options.success, options.error);
            }
          }

          this.initialize(options);
        }

        ICWS.inflateInteraction = function (interaction) {
          var self = interaction;
          self.__type = "interaction";
          self.onHold = false;

          self.setAttribute = function(options) {
            console.log('Setting attribute', options.attributeName, 'to', options.attributeValue,'for interaction', self.interactionId);

            // The following workaround is due to a bug in javascript that does not support setting a key from a variable
            // http://stackoverflow.com/questions/2274242/using-a-variable-for-a-key-in-a-javascript-object-literal
            var representation = {};
            var attributes = {};
            attributes[options.attributeName] = options.attributeValue;
            representation.attributes = attributes;
            // end workaround

            ICWS.post({
                url: '/interactions/' + self.interactionId,
                icwsOptions: {},
                representation: representation,
                success: function(){
                  console.log('setAttribute[success]');
                },
                error: function(data){
                  console.error('setAttribute[error]:', data);
                }
              });
          }

          self.hasPoppedUp = function() {
            console.log('has popped?', self.attributes.SugarCRM_HasPoppedUp);
            return self.attributes.SugarCRM_HasPoppedUp && self.attributes.SugarCRM_HasPoppedUp == 'true';
          }

          self.parseCapabilities = function(){
            if(self.attributes && self.attributes.Eic_Capabilities)
              return ICWS.parseCapabilities(self.attributes.Eic_Capabilities);
            else
              return ICWS.parseCapabilities(0);
          }

          self.pickup = function(options){
            var error = function(data){console.log('Error in Pickup: ', data);}
            if(options && options.error)
              error = options.error;

            var success = function(data){console.log('Pickup successfull: ', data);}
            if(options && options.success)
              success = options.success;

            ICWS.post({
              url: '/interactions/'+ self.interactionId  +'/pickup',
              icwsOptions: {},
              success: success,
              error: error
            });
          }

          self.transfer = function(options) {
            console.log('Transferring', self.interactionId, 'to', options);

            var error = function(data) {
              console.log('Error in Transfer: ', data);
              // Need to set popped up to true to avoid popup loops
              self.setAttribute({attributeName: 'SugarCRM_HasPoppedUp', attributeValue: 'true'});
            }

            if (options && options.error) {
              error = options.error;
            }

            var success = function(data) {
              console.log('Transfer successful: ', data);
            }

            if (options && options.success) {
              success = options.success;
            }

            // If we don't set this, no popup will occur on the receiving SugarCRM user
            self.setAttribute({attributeName: 'SugarCRM_HasPoppedUp', attributeValue: 'false'});

            ICWS.post({
              url: '/interactions/'+ self.interactionId  +'/blind-transfer',
              icwsOptions: {},
              representation: {
                target: options.target
              },
              success: success,
              error: error
            });

          }

          self.disconnect = function(options){
            var error = function(data){console.log('Error in Disconnect: ', data);}
            if(options && options.error)
              error = options.error;

            var success = function(data){console.log('Disconnect successfull: ', data);}
            if(options && options.success)
              success = options.success;

            ICWS.post({
              url: '/interactions/'+ self.interactionId  +'/disconnect',
              icwsOptions: {},
              success: success,
              error: error
            });
          }

          self.hold = function(options){
            var onHold = !self.isOnHold();

            var error = function(data){console.log('Error in Hold: ', data);}
            if(options && options.error)
              error = options.error;

            var success = function(data){console.log('Hold successfull: ', data);}
            if(options && options.success)
              success = options.success;

            ICWS.post({
              url: '/interactions/'+ self.interactionId  +'/hold',
              icwsOptions: {},
              representation: {
                on: onHold
              },
              success: success,
              error: error
            });
          }

          self.isOnHold = function(){
            return self.attributes.Eic_State && self.attributes.Eic_State == 'H';
          }

          self.mute = function(options){
            var muted = !self.isMuted();

            var error = function(data){console.log('Error in Mute: ', data);}
            if(options && options.error)
              error = options.error;

            var success = function(data){console.log('Mute successfull: ', data);}
            if(options && options.success)
              success = options.success;

            ICWS.post({
              url: '/interactions/'+ self.interactionId  +'/mute',
              icwsOptions: {},
              representation: {
                on: muted
              },
              success: success,
              error: error
            });
          }

          self.isMuted = function(){
            return self.attributes.Eic_Muted && self.attributes.Eic_Muted == 1;
          }

          self.record = function(options){
            var toRecord = !self.isRecording();

            var error = function(data){console.log('Error in Recording: ', data);}
            if(options && options.error)
              error = options.error;

            var success = function(data){console.log('Recording successfull: ', data);}
            if(options && options.success)
              success = options.success;

            ICWS.post({
              url: '/interactions/'+ self.interactionId  +'/record',
              icwsOptions: {},
              representation: {
                on: toRecord,
                supervisor: false
              },
              success: success,
              error: error
            });
          }

          self.isRecording = function(){
            return ((self.attributes.Eic_Recorders != undefined) &&
                      (self.attributes.Eic_Recorders != ""));
          }

          self.getAttributes = function(attributes, callback){
            ICWS.fetch({
              url: '/interactions/' + self.interactionId,
              icwsOptions: { query: [{
                  select: attributes.toString(),
                }]
              },
              success: function(data) {
                callback(data.attributes);
              },
              error: function(){

              }
            })
          }

          return self;
        }

        ICWS.inflateChatInteraction = function(interaction){
          var self = ICWS.inflateInteraction(interaction);
          self.__type = "chatInteraction";
          self.chatHistory = [];
          self.participants = {};

          self.sendMessage = function(message){
            ICWS.post({
              url: '/interactions/' + self.interactionId + '/chat/messages',
              icwsOptions: {},
              representation: {
                text: message,
                clearTypingIndicator: true
              },
              success: function(){
                console.log('sendChatMessage');
              },
              error: function(data){
                console.error('sendChatMessage[error]:', data);
              }

            });
          }

          self.manageChatEvents = function(event){
            switch(event.__type){
              case "urn:inin.com:interactions.chat:chatContentsMessage":
                console.log("chat event: ", event);
                // If new messages received
                if(event.messagesAdded){
                  // For each new message received
                  for(var i=0; i<event.messagesAdded.length; i++){
                    var newMessage = event.messagesAdded[i];
                    // If last message has the same userId
                    var lastMessage = self.chatHistory[self.chatHistory.length-1];
                    interaction.chatHistory.push(newMessage);
                    if(lastMessage &&
                        lastMessage.chatMember.userId == newMessage.chatMember.userId){
                          self.trigger('addMessage', newMessage);
                    }
                    else
                      self.trigger('newMessage', newMessage);
                  }
                }
                break;
              case "urn:inin.com:interactions.chat:chatMembersMessage":
                console.log("chat event: ", event);
                // If members added message
                if(event.membersAdded.length > 0){

                }
                if(event.membersChanged.length > 0){
                  // For each member
                  for(var i=0; i<event.membersChanged.length; i++){
                    var changedMember = event.membersChanged[i];
                    var participant = self.participants[changedMember.userId];
                    // If participant does not exist
                    if(!participant){
                      // Add it to the participant list
                      participant = self.participants[changedMember.userId] = changedMember;
                      if(participant.isTyping){
                        self.trigger('isTyping', participant);
                      }
                    }
                    else{
                      // If participant is typing now
                      if(changedMember.isTyping && !participant.isTyping){
                        participant = self.participants[changedMember.userId] = changedMember;
                        self.trigger('isTyping', participant);
                      }
                    }
                  }
                }
                break;
              default:
                console.log("default chat event: ", event);
                break;
            }
          }

          self.listeners = [];
          self.trigger = function(event, args){
            for(var i=0; i<self.listeners.length; i++){
              if(self.listeners[i].event == event){
                self.listeners[i].callback(event, args);
              }
            }

            switch(event){
              case 'isTyping':
                break;
            }
          }

          self.on = function(event, callback){
            var listenerId = Math.ceil(Math.random()*1000000);
            self.listeners.push({
              id: listenerId,
              event: event,
              callback: callback
            });
          }

          self.bind = function(){
            ICWS.MessageManager.on({
                messageTypes: [
                  'urn:inin.com:interactions.chat:chatMembersMessage',
                  'urn:inin.com:interactions.chat:chatContentsMessage'
                ],
                url: '/messaging/subscriptions/interactions/'+self.interactionId+'/chat',
                icwsOptions: {},
                representation: {},
                handleEvent: self.manageChatEvents
            });
          }

          self.unbind = function(){
            self.listeners = [];

            ICWS.MessageManager.off({
              url: '/messaging/subscriptions/interactions/' + interaction.interactionId + '/chat',
              messageTypes: [
                'urn:inin.com:interactions.chat:chatMembersMessage',
                'urn:inin.com:interactions.chat:chatContentsMessage'
              ],
              handleEvent: self.manageChatEvents
            });
          }

          return self;
        }

        ICWS.URL = {
            UserActivations: '/activations/users', // https://developer.inin.com/documentation/Documents/ICWS/WebHelp/icws/(sessionId)/activations/users/(userId)/index.htm#resource
            ImageResources: '/configuration/image-resources', // https://developer.inin.com/documentation/Documents/ICWS/WebHelp/icws/(sessionId)/configuration/image-resources/index.htm#resource
            Layouts: '/configuration/layouts', // https://developer.inin.com/documentation/Documents/ICWS/WebHelp/icws/(sessionId)/configuration/layouts/index.htm#resource
            Positions: '/configuration/positions', // https://developer.inin.com/documentation/Documents/ICWS/WebHelp/icws/(sessionId)/configuration/positions/(id)/index.htm#resource
            Users: '/configuration/users', // https://developer.inin.com/documentation/Documents/ICWS/WebHelp/icws/(sessionId)/configuration/users/(id)/index.htm#resource
            StatusMessages: '/status/status-messages', // https://developer.inin.com/documentation/Documents/ICWS/WebHelp/icws/(sessionId)/configuration/status-messages/(id)/index.htm#resource
            UserStatuses: '/status/user-statuses', // https://developer.inin.com/documentation/Documents/ICWS/WebHelp/icws/(sessionId)/status/user-statuses/(userId)/index.htm#resource
            Interactions: '/interactions/', // https://developer.inin.com/documentation/Documents/ICWS/WebHelp/icws/(sessionId)/interactions/Interactions.htm#application
            StructuredParameters: '/configuration/structured-parameters', //https://developer.inin.com/documentation/Documents/ICWS/WebHelp/icws/(sessionId)/configuration/structured-parameters
            ServerParameters: '/configuration/server-parameters', //https:developer.inin.com/documentation/Documents/ICWS/WebHelp/icws/(sessionId)/configuration/server-parameters
            Messages: '/messaging/messages', //https://developer.inin.com/documentation/Documents/ICWS/WebHelp/icws/(sessionId)/messaging/messages
            Connection: '/connection', //https://developer.inin.com/documentation/Documents/ICWS/WebHelp/icws/(sessionId)/connection/index.htm#get
        }

        ICWS.MessageManager = new function(){
          var self = this;
          this.pullInterval;
          this.listeners = [];

          this.start = function(timeout){
            self.listeners = [];
            if(!timeout)
              timeout = ICWS.PULL_MESSAGES_TIMEOUT;
            self.pullInterval = setInterval(pullMessages, timeout);
          }

          this.stop = function(){
            self.listeners = [];
            clearInterval(self.pullInterval);
          }

          this.addListener = function(messageType, fn ){
            console.log("addListener", messageType);
            if(!self.listeners[messageType]){
              self.listeners[messageType] = [];
            }
            if(fn instanceof Function){
              self.listeners[messageType].push(fn);
            }
          }

          this.dispatchMessage = function(message){
            //console.log(message);
            var l = self.listeners[message.__type].length;
            for(var i = 0; i<l ; i++ ){
              self.listeners[message.__type][i].call(this, message);
            }
          }

          this.removeListener = function(messageType, fn){
            if(self.listeners[messageType]){
              var l = self.listeners[messageType].length;
              for(var i = 0; i<l ; i++ ){
                if(self.listeners[messageType][i] == fn){
                  self.listeners[messageType].splice(i, 1);
                  break;
                }
              }
            }
          }

          var pullMessages = function(){
            if(INFO) console.log("\n=>EventManager.pullMessages");
            var messages = new ICWS.BaseCollection({
              url: ICWS.URL.Messages,
              sync: true,
              representation: {},
              success: function(messages){
                if(INFO) console.log("EventManager.pullMessages", messages);
                var messageCount = messages.length;
                for (var i = 0; i < messageCount; i++) {
                  if(messages[i].isDelta)
                    self.dispatchMessage(messages[i]);
                }
              },
              error: function(error){}
            });
          }

          this.subscribe = this.on = function(options){
            var url = options.url;
            var messageType = options.messageType;
            var messageTypes = options.messageTypes;
            var representation = options.representation;
            var icwsOptions = options.icwsOptions;
            var fn = options.handleEvent;
            if(DEBUG) console.log("\n=> ICWS.on: ", url, messageType, messageTypes, representation, icwsOptions);

            ICWS.update({
                url: url,
                icwsOptions: icwsOptions,
                representation: representation,
                success: function(data){
                  console.log("\n=> subscribe/success ");
                  if(messageTypes){
                    for(var i=0; i<messageTypes.length; i++){
                      self.addListener(messageTypes[i], fn);
                    }
                  }
                  if(messageType)
                    self.addListener(messageType, fn);
                },
                error: function(data){
                  console.log("\n=> subscribe/error ", data);
                }
              });
          }

          this.unsubscribe = this.off = function(options){
            var url = options.url;
            var messageType = options.messageType;
            var messageTypes = options.messageTypes;
            var fn = options.handleEvent;
            ICWS.delete({
              url: url,
              icwsOptions: {},
              success: function(){
                if(messageTypes){
                  for(var i=0; i<messageTypes.length; i++){
                    self.removeListener(messageTypes[i], fn);
                  }
                }
                if(messageType)
                  self.removeListener(messageType, fn);
              }
            })
          }
        }

        ICWS.parseCapabilities = function(binaryCapabilities){
          /*var capabilities = {
            'Consult': binaryCapabilities & 1,
            'Disconnect': binaryCapabilities & 2,
            'Hold': binaryCapabilities & 4,
            'Listen': binaryCapabilities & 8,
            'Messaging': binaryCapabilities & 16,
            'Mute': binaryCapabilities & 32,
            'Park': binaryCapabilities & 64,
            'Pause': binaryCapabilities & 128,
            'Pickup': binaryCapabilities & 256,
            'Private': binaryCapabilities & 512,
            'Record': binaryCapabilities & 1024,
            'RequestHelp': binaryCapabilities & 2048,
            'Transfer': binaryCapabilities & 4096,
            'Join': binaryCapabilities & 8192,
            'ObjectWindow': binaryCapabilities & 16384,
            'Conference': binaryCapabilities & 32768,
            'Coach': binaryCapabilities & 65536,
            'Suspended': binaryCapabilities & 131072,
            'SecureRecordingPause': binaryCapabilities & 262144
          }
          */
          var capabilities = {
            'Consult': binaryCapabilities >> 0 & 1,
            'Disconnect': binaryCapabilities >> 1 & 1,
            'Hold': binaryCapabilities >> 2 & 1,
            'Listen': binaryCapabilities >> 3 & 1,
            'Messaging': binaryCapabilities >> 4 & 1,
            'Mute': binaryCapabilities >> 5 & 1,
            'Park': binaryCapabilities >> 6 & 1,
            'Pause': binaryCapabilities >> 7 & 1,
            'Pickup': binaryCapabilities >> 8 & 1,
            'Private': binaryCapabilities >> 9 & 1,
            'Record': binaryCapabilities >> 10 & 1,
            'RequestHelp': binaryCapabilities >> 11 & 1,
            'Transfer': binaryCapabilities >> 12 & 1,
            'Join': binaryCapabilities >> 13 & 1,
            'ObjectWindow': binaryCapabilities >> 14 & 1,
            'Conference': binaryCapabilities >> 15 & 1,
            'Coach': binaryCapabilities >> 16 & 1,
            'Suspended': binaryCapabilities >> 17 & 1,
            'SecureRecordingPause': binaryCapabilities >> 18 & 1
          }
          return capabilities;
        }

        return ICWS;
    }

    if (typeof (ICWS) === 'undefined') {
        window.ICWS = define_ICWS();
    }
    else {
        console.log("ICWS already defined.");
    }

})(window, jQuery);
