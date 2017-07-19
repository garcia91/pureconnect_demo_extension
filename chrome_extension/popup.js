$().ready( function(){
  console.log("POPUP loaded!");

  var _icServer = "";
  var _username = "";
  var _password = "";
  var _queueList = [];

  var _tab;
  var _configuration = {};

  /* Get config from current chrome tab localStorage */
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    $("#callback_site_name").html(tabs[0].url.match(/https?:\/\/[^\/]*/gi, "")[0]);
    $("#callback_site_logo").attr("src", tabs[0].favIconUrl);

    _tab = chrome.tabs.connect(tabs[0].id, {name: "pureconnect_demo"});
    setTimeout(function(){
      $("#gif_loader_message").css("opacity", "1");
    }, 3000);
    _tab.onMessage.addListener(function(msg) {
      switch(msg.type){
        case "configRes":
          _configuration = msg.body;
          if(!_configuration){
            // Default configuration object
            _configuration = {
              callback: {},
              chat: {},
              global: {}
            }
          }
          setConfigurationInHTML();
          break;
        case "webpagePicturesRes":
          webpagePicturesLoaded(msg.body);
          break;
      }
      console.log("Message: ", msg);
    });
  })

  console.log("listener added");


  /****************************************
  *   PureConnect Login to ICWS
  */
  var pureConnectLogin = function(){

    chrome.storage.local.get('pureconnect_config', function (result) {
      var config = result.pureconnect_config;
      if(config){
        _icServer = config.icServer;
        _username =  config.username;
        _password = config.password;
      }

      ICWS.start({
        applicationName: "PureConnect Demo Extension",
        username: _username,
        password: _password,
        icServerHostname: _icServer,
        loginSuccess: function(logonInfo){
          // Login successfull
          console.log("Check logon: ", logonInfo);

          if(logonInfo.errorId){
            displayAgentNotConnected();
          }
          else{
            // Keep track of ICWS session in localStorage to avoid login when refreshing the page
            localStorage.setItem("pureconnect_demo.sessionId", ICWS.sessionId);
            localStorage.setItem("pureconnect_demo.csrfToken", ICWS.csrfToken);
            localStorage.setItem("pureconnect_demo.username", logonInfo.userID);
            localStorage.setItem("pureconnect_demo.icServer", logonInfo.icServer);

            console.log("[PureConnect] Login successful.", logonInfo);

            init();
          }
        }
      });

    });
  }


  pureConnectLogin();


  /**********************************
  *   Init lists
  */
  var init = function(){
    console.group("init");

    // Get the list of queues
    ICWS.fetch({
      url: '/configuration/workgroups',
      icwsOptions: {},
      success: function(data){
        _queueList = data.items;
        console.log("Queues: ", data.items);

        // When loaded ended
        prepareWebPageWithPureConnectObjects();
      },
      error: function(data){
      }
    });
  }

  var prepareWebPageWithPureConnectObjects = function(){

    var $callback_queueList = $("#callback_queueList");
    var $chat_queueList = $("#chat_queueList");
    _queueList.forEach(function(queue){
      $callback_queueList.append('<option value="'+queue.configurationId.id+'">'+queue.configurationId.displayName+'</option>');
      $chat_queueList.append('<option value="'+queue.configurationId.id+'">'+queue.configurationId.displayName+'</option>');
    });

    // Request configuration from current tab localStorage
    if(_tab){
      _tab.postMessage({type: "configReq"});
      _tab.postMessage({type: "webpagePicturesReq"});
    }
  }

  var setConfigurationInHTML = function(){
    setGlobalConfigurationInHTML();
    setCallbackConfigurationInHTML();
    setChatConfigurationInHTML();

    $("#gif_loader").remove();
  }

  var setCallbackConfigurationInHTML = function(){
    var config = _configuration.callback;

    if(config && config.queue)
      $("#callback_queueName").val(config.queue.id);
    $("#callback_queueName").change(function(){
      var queueId = $(this).val();
      var queue = _queueList.find(function(queue){
        return queue.configurationId.id == queueId;
      });
      if(queue)
        config.queue = queue.configurationId;
      console.log(_configuration);
    })
    if(config && config.getCRMAccountInfo){
      $("#callback_getCRMAccountInfo")[0].checked = true;
      $("#callback_accountName").prop('disabled', false);
      $("#callback_accountName").val(config.accountName)
    }else{
      $("#callback_accountName").prop('disabled', true);
      $("#callback_accountName").val("");
      $("#callback_nonCRMAccountDetails").css("display", "block");
    }
    $("#callback_getCRMAccountInfo").change(function(){
      config.getCRMAccountInfo = $(this)[0].checked;
      if(!config.getCRMAccountInfo){
        $("#callback_nonCRMAccountDetails").fadeIn(300);
        $("#callback_accountName").prop('disabled', true);
        $("#callback_accountName").val("");
      }else{
        $("#callback_nonCRMAccountDetails").fadeOut(300);
        $("#callback_accountName").prop('disabled', false);
        $("#callback_accountName").val(config.accountName);
      }
    })
    if(config && config.accountName)
      $("#callback_accountName").val(config.accountName)
    $("#callback_accountName").change(function(){
      config.accountName = $(this).val();
      console.log(_configuration);
    })
    if(config && config.accountPriority)
      $("#callback_accountPriority").val(config.accountPriority)
    $("#callback_accountPriority").change(function(){
      config.accountPriority = $(this).val();
    })

    if(config && config.customAttributes)
      displayCallbackCustomAttributes();
    $("#callback_searchForWebpageElement").click(function(){
      if(_tab)
        _tab.postMessage({type: "elementSelectorReq"});
    });
    $("#callback_addCustomAttribute").click(function(){
      var attributeName = $("#callback_propertyToAdd_name").val();
      var attributeElementSource = $("#callback_propertyToAdd_pageElement").val();
      if(attributeName && attributeName!="" ){
        if(!config.customAttributes)
          config.customAttributes = [];

        config.customAttributes.push({
          name: attributeName,
          element:attributeElementSource
        });
        displayCallbackCustomAttributes();
      }
    });

    if(config && config.message)
      $("#callback_message").val(config.message)
    $("#callback_message").change(function(){
      _configuration.callback.message = $(this).val();
    })

    $("#callback_save").click(function(){
      if(_tab)
        _tab.postMessage({type: "configSaveReq", body: _configuration});
    });
  }

  var setGlobalConfigurationInHTML = function(){
    if(!_configuration.global)
      _configuration.global = {};

    var config = _configuration.global;
    if(config && config.color){
      var color = "";
      if(config.color.startsWith("#")){
        color = config.color.split("#")[1];
        $("#global_color").css("background-color", "#" + color);
      }
      $("#global_color").val(color);
    }
    $("#global_color").change(function(){
      if(!$(this).val().startsWith("#"))
        config.color = "#" + $(this).val();
      else
        config.color = $(this).val();
    })

    $("#global_save").click(function(){
      if(_tab)
        _tab.postMessage({type: "configSaveReq", body: _configuration});
    });

  }

  var setChatConfigurationInHTML = function(){
    var config = _configuration.chat;

    if(config && config.queue)
      $("#chat_queueName").val(config.queue.id);
    $("#chat_queueName").change(function(){
      var queueId = $(this).val();
      var queue = _queueList.find(function(queue){
        return queue.configurationId.id == queueId;
      });
      if(queue)
        config.queue = queue.configurationId;
      console.log(_configuration);
    })

    if(config && config.getCRMAccountInfo){
      $("#chat_getCRMAccountInfo")[0].checked = true;
      $("#chat_accountName").prop('disabled', false);
      $("#chat_accountName").val(config.accountName)
    }else{
      $("#chat_accountName").prop('disabled', true);
      $("#chat_accountName").val("");
      $("#chat_nonCRMAccountDetails").css("display", "block");
    }
    $("#chat_getCRMAccountInfo").change(function(){
      config.getCRMAccountInfo = $(this)[0].checked;
      if(!config.getCRMAccountInfo){
        $("#chat_nonCRMAccountDetails").fadeIn(300);
        $("#chat_accountName").prop('disabled', true);
        $("#chat_accountName").val("");
      }else{
        $("#chat_nonCRMAccountDetails").fadeOut(300);
        $("#chat_accountName").prop('disabled', false);
        $("#chat_accountName").val(config.accountName);
      }
    })
    if(config && config.accountName)
      $("#chat_accountName").val(config.accountName)
    $("#chat_accountName").change(function(){
      config.accountName = $(this).val();
      console.log(_configuration);
    })
    if(config && config.accountPriority)
      $("#chat_accountPriority").val(config.accountPriority)
    $("#chat_accountPriority").change(function(){
      config.accountPriority = $(this).val();
    })

    if(config && config.bigLogo)
      $("#chat_bigLogo").val(config.bigLogo);
    if(config && config.smallLogo)
      $("#chat_smallLogo").val(config.smallLogo);

    if(config && config.message)
      $("#chat_welcomeMessage").val(config.message)
    $("#chat_welcomeMessage").change(function(){
      config.message = $(this).val();
    })

    $("#chat_save").click(function(){
      if(_tab)
        _tab.postMessage({type: "configSaveReq", body: _configuration});
    });

  }

  var displayCallbackCustomAttributes = function(){
    var $customAttributes = $("#callback_customAttributes");
    $customAttributes.html("");
    _configuration.callback.customAttributes.forEach(function(ca){
      var $customAttributesItem = $("#callback_customAttributesItem").clone();
      var $customAttribute_name = $customAttributesItem.find("#callback_customAttribute_name");
      var $customAttribute_el = $customAttributesItem.find("#callback_customAttribute_el");
      var $customAttribute_remove = $customAttributesItem.find("#callback_customAttribute_remove");

      // Change ids for the copied element
      $customAttributesItem.attr("data-id", ca.name);
      $customAttributesItem.attr("id", "cai_" + ca.name);
      $customAttribute_name.attr("id", "cai_"+ca.name+"_name");
      $customAttribute_el.attr("id", "cai_"+ca.name+"_el");
      $customAttribute_remove.attr("id", "cai_"+ca.name+"_remove");

      // Change text to display
      $customAttribute_name.html(ca.name);
      $customAttribute_el.html(ca.element);
      // Change onclick function
      $customAttribute_remove.click(function(){
        _configuration.callback.customAttributes = _configuration.callback.customAttributes.filter(function(ca){
          var customAttributeName = $customAttributesItem.attr("data-id");
          return customAttributeName != ca.name;
        });
        displayCallbackCustomAttributes();
      });

      // Add the item in the list
      $customAttributes.append($customAttributesItem);
      $customAttributesItem.css("display", "block");
    });
  }

  var webpagePicturesLoaded = function(urls){
    // Big logo preparation
    urls.forEach(function(url){
      $('#chat_bigLogoDropdown_list').append('<li><a><img src="'+url+'" style="width:46px;max-height:46px;display:block; margin: auto auto;"></a></li>');
    });
    $('#chat_bigLogoDropdown_list li a').click(function () {
      var bigLogoUrl = $(this).find("img")[0].src;
      $("#chat_bigLogo").val(bigLogoUrl);
      _configuration.chat.bigLogo = bigLogoUrl;
    });
    $("#chat_bigLogo").change(function(){
      _configuration.chat.bigLogo = $("#chat_bigLogo").val();
    })

    // Small logo preparation
    urls.forEach(function(url){
      $('#chat_smallLogoDropdown_list').append('<li><a><img src="'+url+'" style="width:46px;max-height:46px;display:block; margin: auto auto;"></a></li>');
    });
    $('#chat_smallLogoDropdown_list li a').click(function () {
      var smallLogoUrl = $(this).find("img")[0].src;
      $("#chat_smallLogo").val(smallLogoUrl);
      _configuration.chat.smallLogo = smallLogoUrl;
    });
    $("#chat_smallLogo").change(function(){
      _configuration.chat.smallLogo = $("#chat_smallLogo").val();
    })

    $('.dropdown-toggle').dropdown();
  }
})
